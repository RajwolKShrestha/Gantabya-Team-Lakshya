"""
Insights Analyzer — reads MongoDB visitor_logs and reviews collections
to generate real-time statistics, trend data, and ML-derived demand signals.
"""

from db.connection import col
from datetime import datetime
import numpy as np


MONTH_LABELS = {
    1: "Jan", 2: "Feb", 3: "Mar", 4: "Apr",
    5: "May", 6: "Jun", 7: "Jul", 8: "Aug",
    9: "Sep", 10: "Oct", 11: "Nov", 12: "Dec",
}

SEASON_MONTHS = {"spring": [3,4,5], "summer": [6,7,8], "autumn": [9,10,11], "winter": [12,1,2]}


class InsightsAnalyzer:

    # ── Visitor trend helpers ─────────────────────────────────────────────────

    def _monthly_totals(self, match: dict, year: int = None) -> dict:
        """Return {month: total_visitors} for a given MongoDB match filter."""
        if year:
            match["year"] = year
        pipeline = [
            {"$match": match},
            {"$group": {"_id": "$month", "total": {"$sum": "$visitor_count"}}},
            {"$sort": {"_id": 1}},
        ]
        return {r["_id"]: r["total"] for r in col("visitor_logs").aggregate(pipeline)}

    def _trend_data(self, monthly: dict) -> list:
        """Convert monthly dict → bimonthly chart data for the frontend."""
        pairs = [
            ("Jan–Feb", [1, 2]),
            ("Mar–Apr", [3, 4]),
            ("May–Jun", [5, 6]),
            ("Jul–Aug", [7, 8]),
            ("Sep–Oct", [9, 10]),
            ("Nov–Dec", [11, 12]),
        ]
        result = []
        for label, months in pairs:
            total = sum(monthly.get(m, 0) for m in months)
            result.append({"period": label, "visitors": round(total / 1000, 1)})
        return result

    def _yoy_growth(self, dest_match: dict) -> float:
        """Year-over-year growth rate (2023 → 2024)."""
        def yearly_total(year):
            pipeline = [
                {"$match": {**dest_match, "year": year}},
                {"$group": {"_id": None, "total": {"$sum": "$visitor_count"}}},
            ]
            res = list(col("visitor_logs").aggregate(pipeline))
            return res[0]["total"] if res else 0

        t2023, t2024 = yearly_total(2023), yearly_total(2024)
        if t2023 == 0:
            return 0.0
        return round((t2024 - t2023) / t2023 * 100, 1)

    def _avg_sentiment(self, dest_match: dict) -> float:
        pipeline = [
            {"$match": dest_match},
            {"$group": {"_id": None, "avg": {"$avg": "$sentiment"}}},
        ]
        res = list(col("reviews").aggregate(pipeline))
        return round(res[0]["avg"] * 5, 2) if res else 4.0   # scale 0-1 → 0-5

    def _peak_months(self, monthly: dict) -> list:
        if not monthly:
            return ["Sep", "Oct"]
        avg = sum(monthly.values()) / len(monthly)
        peaks = [MONTH_LABELS[m] for m, v in sorted(monthly.items()) if v >= avg * 1.2]
        return peaks[:6] if peaks else ["Sep", "Oct"]

    def _demand_score(self, monthly: dict, season: str = "autumn") -> float:
        """
        Normalised demand index (0-1) for the chosen season.
        Simple: season visitors / max-month visitors.
        """
        if not monthly:
            return 0.5
        season_months = SEASON_MONTHS.get(season, [9, 10, 11])
        season_total  = sum(monthly.get(m, 0) for m in season_months)
        max_val       = max(monthly.values()) * len(season_months)
        return round(season_total / max_val, 3) if max_val else 0.5

    def _predict_visitors(self, dest_name: str) -> int:
        """
        Simple linear extrapolation: fit a line to monthly totals
        and predict next-month visitors.
        """
        pipeline = [
            {"$match": {"destination_name": dest_name}},
            {"$sort": {"year": 1, "month": 1}},
            {"$group": {"_id": {"year": "$year", "month": "$month"}, "v": {"$sum": "$visitor_count"}}},
        ]
        rows = list(col("visitor_logs").aggregate(pipeline))
        if len(rows) < 3:
            return 0
        counts = np.array([r["v"] for r in rows])
        x = np.arange(len(counts))
        coeffs = np.polyfit(x, counts, 1)
        prediction = int(coeffs[0] * len(counts) + coeffs[1])
        return max(0, prediction)

    # ── Public API ────────────────────────────────────────────────────────────

    def get_destination_analysis(self, destination_name: str) -> dict:
        """Full ML analysis for a single destination — used by the ML analysis panel."""
        match = {"destination_name": destination_name}

        monthly      = self._monthly_totals(match, year=2024)
        trend        = self._trend_data(monthly)
        sentiment    = self._avg_sentiment(match)
        demand_score = self._demand_score(monthly)
        peak_months  = self._peak_months(monthly)
        growth       = self._yoy_growth(match)
        predicted    = self._predict_visitors(destination_name)

        # Aggregate ratings from reviews
        pipeline = [
            {"$match": match},
            {"$group": {"_id": None, "avg_rating": {"$avg": "$rating"}, "count": {"$sum": 1}}},
        ]
        review_agg = list(col("reviews").aggregate(pipeline))
        avg_rating  = round(review_agg[0]["avg_rating"], 1) if review_agg else 4.5
        review_count = review_agg[0]["count"] if review_agg else 0

        # Top tags from reviews
        tag_pipeline = [
            {"$match": match},
            {"$unwind": "$tags"},
            {"$group": {"_id": "$tags", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 5},
        ]
        top_tags = [r["_id"] for r in col("reviews").aggregate(tag_pipeline)]

        # Cluster label heuristic
        dest = col("destinations").find_one({"name": destination_name}, {"categories": 1})
        cats = dest.get("categories", []) if dest else []
        cluster_map = {
            "spiritual": "Spiritual & wellness seekers",
            "wildlife":  "Wildlife & nature explorers",
            "adventure": "Adventure & trekking enthusiasts",
            "history":   "Cultural history tourists",
            "nature":    "Eco & nature travellers",
        }
        cluster_label = next((cluster_map[c] for c in cats if c in cluster_map), "General tourists")

        return {
            "destination": destination_name,
            "demandScore":       demand_score,
            "predictedVisitors": predicted,
            "sentimentScore":    sentiment,
            "avgRating":         avg_rating,
            "reviewCount":       review_count,
            "yoyGrowth":         growth,
            "peakMonths":        peak_months,
            "clusterLabel":      cluster_label,
            "topTags":           top_tags,
            "trendData":         trend,
        }

    def get_insights(self, destination_name: str = None, province: str = "Bagmati") -> dict:
        """
        Province-level or destination-level dashboard insights.
        Returns aggregate metrics + seasonal trends for the frontend dashboard.
        """
        match = {}
        if destination_name:
            match["destination_name"] = destination_name
        elif province:
            match["province"] = province

        monthly_2024 = self._monthly_totals(match, year=2024)
        trend        = self._trend_data(monthly_2024)
        total_2024   = sum(monthly_2024.values())
        growth       = self._yoy_growth(match)

        # Count active destinations in province
        dest_count = col("destinations").count_documents({"province": province} if province else {})

        # Average cost per day
        pipeline = [
            {"$match": {"province": province} if province else {}},
            {"$group": {"_id": None, "avg_cost": {"$avg": "$cost_per_day"}}},
        ]
        cost_res = list(col("destinations").aggregate(pipeline))
        avg_cost = int(cost_res[0]["avg_cost"]) if cost_res else 1000

        # Seasonal breakdown
        seasonal_totals = {
            season: sum(monthly_2024.get(m, 0) for m in months)
            for season, months in SEASON_MONTHS.items()
        }

        # Top destinations by visitor count
        top_pipeline = [
            {"$match": {**match, "year": 2024}},
            {"$group": {"_id": "$destination_name", "total": {"$sum": "$visitor_count"}}},
            {"$sort": {"total": -1}},
            {"$limit": 5},
        ]
        top_places = [{"name": r["_id"], "visitors": r["total"]}
                      for r in col("visitor_logs").aggregate(top_pipeline)]

        return {
            "province":          province,
            "totalVisitors2024": total_2024,
            "activePlaces":      dest_count,
            "avgCostPerDay":     avg_cost,
            "yoyGrowth":         growth,
            "trendData":         trend,
            "seasonal":          seasonal_totals,
            "topPlaces":         top_places,
            "peakMonths":        self._peak_months(monthly_2024),
        }
