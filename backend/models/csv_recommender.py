"""
CSV-driven ML recommendation engine for Gantabya.

Drop any Nepal tourism CSV into backend/data/destinations.csv and this
module will auto-detect columns and build the recommendation pipeline.

Expected columns (flexible — adapts to what's present):
  destination_name / name        → place name
  province                       → Nepal province
  district                       → district
  categories / category / tags   → comma-separated interests
  cost_per_day / daily_cost      → Rs per day
  rating / avg_rating            → 0–5 star rating
  total_visitors / visitors      → annual visitor count
  spring/summer/autumn/winter_visitors → seasonal breakdown
  best_seasons                   → comma-separated season names
  difficulty                     → easy / moderate / hard
  avg_stay_days                  → recommended nights
  emoji                          → display emoji
  highlights / description       → text features for TF-IDF

ML Pipeline:
  1. TF-IDF on (categories + highlights) → text similarity
  2. Budget score   → daily budget vs destination cost
  3. Season score   → user season vs best_seasons
  4. Popularity     → normalised visitor count
  5. Rating score   → normalised rating
  Weighted sum → ranked recommendations
"""

import os
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import MinMaxScaler

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")

SEASON_MONTHS = {
    "spring": [3, 4, 5],
    "summer": [6, 7, 8],
    "autumn": [9, 10, 11],
    "winter": [12, 1, 2],
}

WEIGHTS = {
    "text":       0.35,
    "budget":     0.25,
    "season":     0.20,
    "popularity": 0.12,
    "rating":     0.08,
}


class CSVRecommender:

    def __init__(self, csv_path: str | None = None):
        self.csv_path = csv_path or os.path.join(DATA_DIR, "destinations.csv")
        self._df: pd.DataFrame | None = None
        self._vectorizer = TfidfVectorizer(ngram_range=(1, 2), max_features=500)
        self._tfidf_matrix = None
        self._scaler = MinMaxScaler()

    # ── CSV loading & normalisation ──────────────────────────────────────────

    def _col(self, *candidates) -> str | None:
        """Return the first column name from candidates that exists in the df."""
        for c in candidates:
            if c in self._df.columns:
                return c
        return None

    def _load(self):
        """Load the CSV and normalise column names."""
        df = pd.read_csv(self.csv_path)
        df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]

        # ── Normalise key columns to canonical names ─────────────────────────
        renames = {}
        for canon, alts in {
            "destination_name": ["name", "place", "site", "title", "destination"],
            "categories":       ["category", "type", "tags", "interest", "interests"],
            "cost_per_day":     ["daily_cost", "cost", "price_per_day", "avg_cost"],
            "rating":           ["avg_rating", "score", "star_rating", "stars"],
            "total_visitors":   ["visitors", "visitor_count", "annual_visitors", "footfall"],
            "highlights":       ["description", "about", "features", "details", "notes"],
            "best_seasons":     ["peak_season", "season", "recommended_season"],
            "emoji":            ["icon", "symbol"],
        }.items():
            for alt in alts:
                if alt in df.columns and canon not in df.columns:
                    renames[alt] = canon
                    break
        df = df.rename(columns=renames)

        # ── Defaults for missing columns ─────────────────────────────────────
        if "destination_name" not in df.columns:
            raise ValueError(
                "CSV must have a destination name column "
                "(name / place / destination / destination_name)"
            )
        if "categories" not in df.columns:
            df["categories"] = "cultural"
        if "cost_per_day" not in df.columns:
            df["cost_per_day"] = 1000
        if "rating" not in df.columns:
            df["rating"] = 4.0
        if "total_visitors" not in df.columns:
            df["total_visitors"] = 10000
        if "best_seasons" not in df.columns:
            df["best_seasons"] = "spring,autumn"
        if "highlights" not in df.columns:
            df["highlights"] = df["destination_name"]
        if "province" not in df.columns:
            df["province"] = "Bagmati"
        if "district" not in df.columns:
            df["district"] = "Kathmandu"
        if "emoji" not in df.columns:
            df["emoji"] = "📍"
        if "avg_stay_days" not in df.columns:
            df["avg_stay_days"] = 1.0
        if "difficulty" not in df.columns:
            df["difficulty"] = "easy"

        # Build per-season visitor columns if not present
        for season in ["spring", "summer", "autumn", "winter"]:
            col = f"{season}_visitors"
            if col not in df.columns:
                df[col] = df["total_visitors"] / 4

        # ── Normalise numeric types ───────────────────────────────────────────
        for c in ["cost_per_day", "rating", "total_visitors",
                  "spring_visitors", "summer_visitors",
                  "autumn_visitors", "winter_visitors", "avg_stay_days"]:
            df[c] = pd.to_numeric(df[c], errors="coerce").fillna(0)

        # ── Build TF-IDF corpus ───────────────────────────────────────────────
        df["_corpus"] = (
            df["categories"].fillna("").astype(str) + " " +
            df["highlights"].fillna("").astype(str) + " " +
            df["province"].fillna("").astype(str) + " " +
            df["district"].fillna("").astype(str)
        ).str.lower()

        self._tfidf_matrix = self._vectorizer.fit_transform(df["_corpus"])

        # Normalise popularity
        pop = df["total_visitors"].values.reshape(-1, 1)
        df["_pop_norm"] = self._scaler.fit_transform(pop).flatten()

        self._df = df.reset_index(drop=True)

    def _ensure_loaded(self):
        if self._df is None:
            self._load()

    # ── Scoring helpers ──────────────────────────────────────────────────────

    def _text_score(self, purposes: list[str], idx: int) -> float:
        if not purposes:
            return 0.5
        query = " ".join(purposes)
        qvec = self._vectorizer.transform([query])
        return float(cosine_similarity(qvec, self._tfidf_matrix[idx])[0][0])

    def _budget_score(self, budget: float, days: int, row: pd.Series) -> float:
        daily = budget / max(days, 1)
        cost  = row["cost_per_day"]
        if cost == 0:
            return 0.5
        ratio = daily / cost
        if ratio >= 1.5: return 1.0
        if ratio >= 1.0: return 0.85
        if ratio >= 0.7: return 0.5
        return 0.0          # strictly unaffordable → skip

    def _season_score(self, season: str, row: pd.Series) -> float:
        if season == "all":
            return 0.7
        best = str(row.get("best_seasons", "")).lower()
        # Seasonal visitor proportion
        vcol = f"{season}_visitors"
        sv   = row.get(vcol, 0)
        tv   = row.get("total_visitors", 1) or 1
        ratio = sv / tv
        match = season in best
        return (0.6 if match else 0.3) + min(ratio * 0.4, 0.4)

    def _rating_score(self, row: pd.Series) -> float:
        r = row.get("rating", 4.0)
        return max(0.0, min(1.0, (float(r) - 1.0) / 4.0))

    # ── Public API ────────────────────────────────────────────────────────────

    def recommend(
        self,
        budget: int,
        purposes: list[str],
        days: int,
        season: str = "all",
        province: str | None = None,
        limit: int = 6,
    ) -> list[dict]:
        self._ensure_loaded()
        results = []

        df = self._df
        if province:
            mask = df["province"].str.lower() == province.lower()
            df = df[mask] if mask.any() else self._df   # fallback to all

        for idx in df.index:
            row = df.loc[idx]
            bs = self._budget_score(budget, days, row)
            if bs == 0.0:
                continue

            ts  = self._text_score(purposes, idx)
            ss  = self._season_score(season, row)
            pop = float(row["_pop_norm"])
            rs  = self._rating_score(row)

            score = (
                ts  * WEIGHTS["text"] +
                bs  * WEIGHTS["budget"] +
                ss  * WEIGHTS["season"] +
                pop * WEIGHTS["popularity"] +
                rs  * WEIGHTS["rating"]
            )

            # Parse highlights
            highlights = [
                h.strip()
                for h in str(row.get("highlights", "")).split(",")
                if h.strip()
            ][:5]

            results.append({
                "name":         row["destination_name"],
                "district":     row["district"],
                "province":     row["province"],
                "categories":   [c.strip() for c in str(row["categories"]).split(",") if c.strip()],
                "costPerDay":   int(row["cost_per_day"]),
                "rating":       round(float(row["rating"]), 1),
                "score":        round(min(score, 0.99), 3),
                "emoji":        str(row.get("emoji", "📍")),
                "highlights":   highlights,
                "difficulty":   str(row.get("difficulty", "easy")),
                "avgStayDays":  float(row.get("avg_stay_days", 1.0)),
                "bestSeasons":  [s.strip() for s in str(row.get("best_seasons", "")).split(",") if s.strip()],
                "scoreBreakdown": {
                    "textMatch":   round(ts,  3),
                    "budgetFit":   round(bs,  3),
                    "seasonMatch": round(ss,  3),
                    "popularity":  round(pop, 3),
                    "rating":      round(rs,  3),
                },
            })

        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:limit]

    def generate_itinerary(
        self,
        destination_name: str,
        days: int,
        budget: int,
        from_loc: str,
        purposes: list[str],
    ) -> list[dict]:
        self._ensure_loaded()
        row = self._df[
            self._df["destination_name"].str.lower() == destination_name.lower()
        ]
        if row.empty:
            # Fuzzy match
            mask = self._df["destination_name"].str.contains(
                destination_name.split()[0], case=False, na=False
            )
            row = self._df[mask]

        if row.empty:
            return []

        row = row.iloc[0]
        cats = [c.strip() for c in str(row["categories"]).split(",")]
        highlights = [h.strip() for h in str(row.get("highlights", "")).split(",") if h.strip()]

        same_city = from_loc.lower().split(",")[0] in row["district"].lower()
        travel_cost = 250 if same_city else 900
        acc_cost    = max(1200, min(4000, int(row["cost_per_day"] * 0.75)))
        day_budget  = budget / max(days, 1)

        ACTIVITY_TEMPLATES = {
            "cultural": [
                {"time": "07:30", "title": f"Morning visit to {row['destination_name']}", "note": highlights[0] if highlights else "Explore the site", "icon": "🏛", "cost": 600},
                {"time": "09:30", "title": "Guided heritage walk", "note": "Local guide (Rs 800)", "icon": "🎒", "cost": 800},
                {"time": "12:30", "title": "Traditional Newari lunch", "note": "Budget Rs 400–600", "icon": "🍽", "cost": 500},
                {"time": "14:30", "title": "Architecture & photography", "note": highlights[1] if len(highlights) > 1 else "Self-guided", "icon": "📸", "cost": 0},
                {"time": "16:30", "title": "Local craft market", "note": "Thangka, pottery, pashmina", "icon": "🛍", "cost": 400},
                {"time": "18:30", "title": "Evening ceremony", "note": highlights[2] if len(highlights) > 2 else "Check local schedule", "icon": "🪔", "cost": 150},
            ],
            "spiritual": [
                {"time": "06:30", "title": "Sunrise prayer ceremony", "note": "Respectful dress required", "icon": "🙏", "cost": 100},
                {"time": "09:00", "title": "Kora circumambulation", "note": "Walking circuit around shrine", "icon": "⭕", "cost": 0},
                {"time": "11:00", "title": "Meditation session", "note": "Monastery offers guided sessions", "icon": "🧘", "cost": 300},
                {"time": "13:00", "title": "Vegetarian monastery meal", "note": "Simple and nourishing", "icon": "🌱", "cost": 200},
                {"time": "15:00", "title": "Thangka painting workshop", "note": "2-hour beginner session", "icon": "🎨", "cost": 800},
                {"time": "17:30", "title": "Evening prayers (puja)", "note": "Open to respectful visitors", "icon": "🕯", "cost": 0},
            ],
            "wildlife": [
                {"time": "06:00", "title": "Dawn wildlife safari", "note": "Best sighting time", "icon": "🐘", "cost": 1500},
                {"time": "09:00", "title": "Guided nature trail", "note": "Trained naturalist escort", "icon": "🌿", "cost": 600},
                {"time": "12:00", "title": "Camp lunch at forest lodge", "note": "Included with safari", "icon": "🍱", "cost": 350},
                {"time": "14:00", "title": "Bird watching session", "note": "200+ species in this zone", "icon": "🦅", "cost": 400},
                {"time": "16:30", "title": "Jeep safari — open grasslands", "note": "Rhino and deer sightings", "icon": "🚙", "cost": 1200},
                {"time": "19:00", "title": "Campfire & cultural evening", "note": "Resort activity", "icon": "🔥", "cost": 0},
            ],
            "adventure": [
                {"time": "07:00", "title": "Mountain trail hike", "note": "Pack warm layers and water", "icon": "🥾", "cost": 200},
                {"time": "09:30", "title": "Summit ascent", "note": "Guide strongly recommended", "icon": "⛰", "cost": 700},
                {"time": "12:30", "title": "Summit lunch", "note": "Bring packed food from valley", "icon": "🍜", "cost": 250},
                {"time": "14:00", "title": "Adventure activity", "note": "Safety gear provided", "icon": "🪂", "cost": 900},
                {"time": "17:00", "title": "Recovery meal", "note": "Dal-bhat at local restaurant", "icon": "🍲", "cost": 350},
            ],
            "nature": [
                {"time": "07:00", "title": "Sunrise ridge hike", "note": "Bring layers and water", "icon": "🌄", "cost": 200},
                {"time": "09:30", "title": "Nature trail exploration", "note": highlights[0] if highlights else "Self-guided", "icon": "🌸", "cost": 150},
                {"time": "12:00", "title": "Viewpoint picnic lunch", "note": "Pack from nearest market", "icon": "🧺", "cost": 300},
                {"time": "14:00", "title": "Bird & butterfly spotting", "note": "Best in spring and autumn", "icon": "🦋", "cost": 0},
                {"time": "16:00", "title": "Forest walk", "note": "Guided mindful nature walk", "icon": "🌲", "cost": 250},
            ],
            "history": [
                {"time": "08:30", "title": "Historian-led site tour", "note": highlights[0] if highlights else "Ancient history", "icon": "🏯", "cost": 700},
                {"time": "10:30", "title": "Museum & archive visit", "note": "Audio guide available", "icon": "🔍", "cost": 300},
                {"time": "13:00", "title": "Heritage lunch", "note": "Traditional setting", "icon": "🍽", "cost": 500},
                {"time": "15:00", "title": "Ancient carving trail", "note": "UNESCO documentation on site", "icon": "🗿", "cost": 0},
                {"time": "17:00", "title": "Sunset viewpoint", "note": "Panoramic views", "icon": "🌅", "cost": 0},
            ],
        }

        primary = next((c for c in cats if c in ACTIVITY_TEMPLATES), "cultural")
        lib = ACTIVITY_TEMPLATES[primary]

        plan = []
        themes = [
            f"Arrival & first impressions — {row['district']}",
            f"{row['destination_name']} — deep dive",
            "Hidden corners & local life",
            f"Final morning & farewell",
        ]

        for d in range(days):
            acts = []
            if d == 0:
                acts.append({
                    "time": "07:30",
                    "title": f"Travel to {row['district']}",
                    "note": f"From {from_loc} — {'30 min taxi' if same_city else '1–2 hr by bus or taxi'}",
                    "icon": "🚌",
                    "cost": travel_cost,
                })

            offset = (d * 3) % len(lib)
            picks  = (lib + lib)[offset: offset + (3 if d == 0 else 4)]
            acts.extend(picks)

            if d < days - 1:
                acts.append({
                    "time": "20:00",
                    "title": "Check-in & dinner",
                    "note": f"Lodge near site · Rs {acc_cost:,}/night",
                    "icon": "🏨",
                    "cost": acc_cost + 400,
                })
            else:
                acts.append({
                    "time": "17:00",
                    "title": f"Return to {from_loc}",
                    "note": "Depart early to beat traffic",
                    "icon": "🏠",
                    "cost": travel_cost,
                })

            total = sum(a["cost"] for a in acts)
            plan.append({
                "day":        d + 1,
                "theme":      themes[min(d, len(themes) - 1)],
                "activities": acts,
                "totalCost":  total,
            })

        return plan

    def get_destination_stats(self, destination_name: str) -> dict:
        """Pull raw stats for the ML analysis panel."""
        self._ensure_loaded()
        row = self._df[
            self._df["destination_name"].str.lower() == destination_name.lower()
        ]
        if row.empty:
            return {}
        row = row.iloc[0]

        sv = {s: float(row.get(f"{s}_visitors", 0)) for s in ["spring","summer","autumn","winter"]}
        best = max(sv, key=lambda k: sv[k])
        tv   = float(row.get("total_visitors", 1)) or 1
        demand = sv[best] / tv if tv else 0.5

        return {
            "totalVisitors":     int(row.get("total_visitors", 0)),
            "seasonalVisitors":  {k: int(v) for k, v in sv.items()},
            "demandScore":       round(demand, 3),
            "rating":            float(row.get("rating", 4.0)),
            "costPerDay":        int(row.get("cost_per_day", 1000)),
            "difficulty":        str(row.get("difficulty", "easy")),
            "avgStayDays":       float(row.get("avg_stay_days", 1.0)),
            "bestSeasons":       [s.strip() for s in str(row.get("best_seasons","")).split(",") if s.strip()],
            "categories":        [c.strip() for c in str(row.get("categories","")).split(",") if c.strip()],
            "highlights":        [h.strip() for h in str(row.get("highlights","")).split(",") if h.strip()],
        }

    def get_province_insights(self, province: str = "Bagmati") -> dict:
        """Aggregate analytics for an entire province."""
        self._ensure_loaded()
        df = self._df[self._df["province"].str.lower() == province.lower()]
        if df.empty:
            df = self._df

        total = int(df["total_visitors"].sum())
        seasonal = {
            s: int(df[f"{s}_visitors"].sum())
            for s in ["spring","summer","autumn","winter"]
        }
        top = df.nlargest(5, "total_visitors")[["destination_name","total_visitors"]].to_dict("records")

        return {
            "province":      province,
            "totalVisitors": total,
            "activePlaces":  len(df),
            "avgCostPerDay": int(df["cost_per_day"].mean()),
            "avgRating":     round(float(df["rating"].mean()), 2),
            "seasonal":      seasonal,
            "topPlaces":     [{"name": r["destination_name"], "visitors": int(r["total_visitors"])} for r in top],
        }

    def use_csv(self, path: str):
        """Hot-swap to a different CSV at runtime."""
        self.csv_path = path
        self._df = None
        self._tfidf_matrix = None
        self._ensure_loaded()
