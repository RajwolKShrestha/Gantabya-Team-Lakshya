"""
ML recommendation engine for Gantabya.

Pipeline:
  1. Load all destinations from MongoDB
  2. Build TF-IDF feature matrix from categories + highlights text
  3. For each user query, compute:
       - purpose_score  : cosine similarity of user interests vs destination tags
       - budget_score   : how well the destination fits the daily budget
       - season_score   : peak season match
       - popularity_score: normalised visitor count from MongoDB
       - rating_score   : destination rating
  4. Return weighted sum, ranked descending

The `generate_itinerary` method uses MongoDB activity templates and
destination data to produce a day-by-day plan.
"""

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import MinMaxScaler
from db.connection import col
import re

SEASON_MONTHS = {
    "spring": [3, 4, 5],
    "summer": [6, 7, 8],
    "autumn": [9, 10, 11],
    "winter": [12, 1, 2],
}

ACTIVITY_LIBRARY = {
    "cultural": [
        {"time": "07:30", "title": "Morning temple / palace visit",  "icon": "🏛", "cost": 600},
        {"time": "09:30", "title": "Guided heritage walk",            "icon": "🎒", "cost": 800},
        {"time": "12:30", "title": "Traditional Newari lunch",        "icon": "🍽", "cost": 500},
        {"time": "14:30", "title": "Architecture & photography walk", "icon": "📸", "cost": 0},
        {"time": "16:30", "title": "Local craft & souvenir market",   "icon": "🛍", "cost": 400},
        {"time": "18:30", "title": "Evening ceremony / aarti",        "icon": "🪔", "cost": 150},
    ],
    "spiritual": [
        {"time": "06:30", "title": "Sunrise prayer ceremony",         "icon": "🙏", "cost": 100},
        {"time": "09:00", "title": "Kora circumambulation circuit",   "icon": "⭕", "cost": 0},
        {"time": "11:00", "title": "Guided meditation session",       "icon": "🧘", "cost": 300},
        {"time": "13:00", "title": "Vegetarian monastery meal",       "icon": "🌱", "cost": 200},
        {"time": "15:00", "title": "Thangka painting workshop",       "icon": "🎨", "cost": 800},
        {"time": "17:30", "title": "Evening prayers (puja)",          "icon": "🕯", "cost": 0},
    ],
    "wildlife": [
        {"time": "06:00", "title": "Dawn wildlife safari",            "icon": "🐘", "cost": 1500},
        {"time": "09:00", "title": "Guided nature trail",             "icon": "🌿", "cost": 600},
        {"time": "12:00", "title": "Camp lunch at forest lodge",      "icon": "🍱", "cost": 350},
        {"time": "14:00", "title": "Bird watching session",           "icon": "🦅", "cost": 400},
        {"time": "16:30", "title": "Jeep safari — open grasslands",   "icon": "🚙", "cost": 1200},
        {"time": "19:00", "title": "Campfire & cultural evening",     "icon": "🔥", "cost": 0},
    ],
    "adventure": [
        {"time": "07:00", "title": "Mountain biking / trail run",     "icon": "🚵", "cost": 600},
        {"time": "09:30", "title": "Rock scramble ascent",            "icon": "⛰", "cost": 700},
        {"time": "12:30", "title": "Summit picnic lunch",             "icon": "🥾", "cost": 200},
        {"time": "14:00", "title": "Rappelling / zip-line session",   "icon": "🪂", "cost": 900},
        {"time": "17:00", "title": "Recovery hot meal",               "icon": "🍜", "cost": 350},
    ],
    "nature": [
        {"time": "07:00", "title": "Sunrise ridge hike",              "icon": "🌄", "cost": 200},
        {"time": "09:30", "title": "Botanical garden trail",          "icon": "🌸", "cost": 150},
        {"time": "12:00", "title": "Viewpoint picnic lunch",          "icon": "🧺", "cost": 300},
        {"time": "14:00", "title": "Butterfly & bird spotting",       "icon": "🦋", "cost": 0},
        {"time": "16:00", "title": "Forest bathing walk",             "icon": "🌲", "cost": 250},
    ],
    "history": [
        {"time": "08:30", "title": "Historian-led site tour",         "icon": "🏯", "cost": 700},
        {"time": "10:30", "title": "Museum & archive visit",          "icon": "🔍", "cost": 300},
        {"time": "13:00", "title": "Heritage lunch spot",             "icon": "🍽", "cost": 500},
        {"time": "15:00", "title": "Ancient carving trail",           "icon": "🗿", "cost": 0},
        {"time": "17:00", "title": "Sunset viewpoint",                "icon": "🌅", "cost": 0},
    ],
}


class DestinationRecommender:

    def __init__(self):
        self._destinations = []
        self._vectorizer = TfidfVectorizer(ngram_range=(1, 2))
        self._feature_matrix = None
        self._scaler = MinMaxScaler()
        self._loaded = False

    # ── Internal helpers ─────────────────────────────────────────────────────

    def _load(self):
        """Fetch destinations from MongoDB and build TF-IDF matrix."""
        self._destinations = list(col("destinations").find({}, {"_id": 0}))
        if not self._destinations:
            raise RuntimeError("No destinations in MongoDB. Run scripts/seed_db.py first.")

        corpus = [
            " ".join(d.get("categories", [])) + " " +
            " ".join(d.get("highlights", [])).lower()
            for d in self._destinations
        ]
        self._feature_matrix = self._vectorizer.fit_transform(corpus)
        self._loaded = True

    def _ensure_loaded(self):
        if not self._loaded:
            self._load()

    def _purpose_score(self, purposes: list[str], idx: int) -> float:
        if not purposes:
            return 0.5
        query = " ".join(purposes)
        qvec = self._vectorizer.transform([query])
        return float(cosine_similarity(qvec, self._feature_matrix[idx])[0][0])

    def _budget_score(self, budget: float, days: int, cost_per_day: float) -> float:
        daily = budget / max(days, 1)
        if cost_per_day == 0:
            return 0.5
        ratio = daily / cost_per_day
        if ratio >= 1.5:
            return 1.0
        elif ratio >= 1.0:
            return 0.8
        elif ratio >= 0.7:
            return 0.5
        else:
            return 0.0

    def _season_score(self, season: str, dest: dict) -> float:
        if season == "all":
            return 0.7
        return 1.0 if season in dest.get("best_seasons", []) else 0.3

    def _popularity_score(self, dest: dict, season: str) -> float:
        sv = dest.get("seasonal_visitors", {})
        if not sv:
            return 0.5
        total = sum(sv.values())
        if total == 0:
            return 0.5
        season_count = sv.get(season, total / 4)
        all_counts = list(sv.values())
        max_count = max(all_counts)
        return season_count / max_count if max_count > 0 else 0.5

    # ── Public API ────────────────────────────────────────────────────────────

    def recommend(self, budget: int, purposes: list, days: int, season: str = "all") -> list:
        self._ensure_loaded()

        WEIGHTS = {
            "purpose":    0.35,
            "budget":     0.25,
            "season":     0.20,
            "popularity": 0.12,
            "rating":     0.08,
        }

        scored = []
        for i, dest in enumerate(self._destinations):
            ps  = self._purpose_score(purposes, i)
            bs  = self._budget_score(budget, days, dest.get("cost_per_day", 1000))
            ss  = self._season_score(season, dest)
            pop = self._popularity_score(dest, season)
            rs  = (dest.get("rating", 4.0) - 1) / 4.0

            if bs == 0.0:   # strictly unaffordable
                continue

            composite = (
                ps  * WEIGHTS["purpose"] +
                bs  * WEIGHTS["budget"] +
                ss  * WEIGHTS["season"] +
                pop * WEIGHTS["popularity"] +
                rs  * WEIGHTS["rating"]
            )

            scored.append({
                **dest,
                "score":      round(min(composite, 0.99), 3),
                "score_breakdown": {
                    "purpose_match":  round(ps,  3),
                    "budget_fit":     round(bs,  3),
                    "season_match":   round(ss,  3),
                    "popularity":     round(pop, 3),
                    "rating_score":   round(rs,  3),
                },
            })

        scored.sort(key=lambda x: x["score"], reverse=True)
        return scored[:6]

    def generate_itinerary(
        self, destination_name: str, days: int,
        budget: int, from_loc: str, purposes: list
    ) -> list:
        self._ensure_loaded()

        dest = next((d for d in self._destinations if d["name"] == destination_name), None)
        if dest is None:
            return []

        same_district = from_loc.lower() in dest["district"].lower() or \
                        dest["district"].lower() in from_loc.lower()
        travel_cost = 250 if same_district else 900
        acc_cost    = max(1200, min(3500, int(dest["cost_per_day"] * 0.7)))

        primary_cat  = (dest.get("categories") or ["cultural"])[0]
        secondary_cat = (dest.get("categories") or [None, None])[1] if len(dest.get("categories", [])) > 1 else None

        lib_a = ACTIVITY_LIBRARY.get(primary_cat,   ACTIVITY_LIBRARY["cultural"])
        lib_b = ACTIVITY_LIBRARY.get(secondary_cat, []) if secondary_cat else []
        combined = lib_a + lib_b
        combined = combined[:8]

        themes = [
            f"Arrival & first impressions of {dest['district']}",
            f"{dest['name']} — deep dive",
            "Hidden corners & local life",
            f"Final morning & departure from {dest['district']}",
        ]

        plan = []
        for d in range(days):
            acts = []

            if d == 0:
                acts.append({"time": "07:30", "title": f"Travel to {dest['district']}",
                              "note": f"From {from_loc} — {'~30 min taxi' if same_district else '~1.5 hr bus or taxi'}",
                              "icon": "🚌", "cost": travel_cost})

            offset = d * 3
            picks  = combined[offset % len(lib_a): offset % len(lib_a) + (3 if d == 0 else 4)]
            for act in picks:
                acts.append({**act, "note": dest["highlights"][len(acts) % len(dest["highlights"])] if dest.get("highlights") else ""})

            if d < days - 1:
                acts.append({"time": "20:00", "title": "Check-in & dinner",
                              "note": f"Lodge near site · Rs {acc_cost:,}/night",
                              "icon": "🏨", "cost": acc_cost + 400})
            else:
                acts.append({"time": "17:00", "title": f"Return to {from_loc}",
                              "note": "Depart early to beat traffic", "icon": "🏠", "cost": travel_cost})

            total = sum(a["cost"] for a in acts)
            plan.append({
                "day":        d + 1,
                "theme":      themes[min(d, len(themes) - 1)],
                "activities": acts,
                "totalCost":  total,
            })

        return plan

    def process_assistant_query(self, message: str, context: dict) -> dict:
        """
        Rule-based fallback assistant.  If ANTHROPIC_API_KEY is set, app.py
        calls Claude before this and only falls back here on error.
        """
        msg = message.lower()
        dest_name  = context.get("destination", "your destination")
        cur_days   = context.get("days", 3)
        cur_budget = context.get("budget", 5000)
        mode       = context.get("travelMode", "driving")

        # Intent matching
        if re.search(r"open|navigate|maps|direction|route|go there", msg):
            return {"type": "open_maps", "reply": f"Opening Google Maps for your {dest_name} trip! 🗺 All stops are pre-filled."}

        m = re.search(r"add (\d+)\s*days?|(\d+)\s*more\s*days?|extend.*?(\d+)", msg)
        if m:
            n = int(next(x for x in m.groups() if x))
            return {"type": "add_days", "value": n,
                    "reply": f"Adding {n} day{'s' if n > 1 else ''} — replanning your itinerary now…"}

        m = re.search(r"(\d+)\s*days?|make it (\d+)|change.*?(\d+)\s*day", msg)
        if m and "day" in msg:
            n = int(next(x for x in m.groups() if x))
            if 1 <= n <= 14:
                return {"type": "set_days", "value": n, "reply": f"Changing trip to {n} days — replanning now…"}

        m = re.search(r"rs\.?\s*(\d[\d,]+)|budget.*?(\d[\d,]+)|(\d[\d,]+).*?rs", msg)
        if m and re.search(r"budget|rupee|rs|spend|cost", msg):
            raw = next(x for x in m.groups() if x).replace(",", "")
            n = int(raw)
            if n >= 500:
                return {"type": "set_budget", "value": n, "reply": f"Budget updated to Rs {n:,} — replanning to match…"}

        if re.search(r"walk|foot|pedestrian", msg):
            return {"type": "set_mode", "value": "walking", "reply": "Travel mode set to 🚶 walking. Maps links updated."}
        if re.search(r"transit|bus|public", msg):
            return {"type": "set_mode", "value": "transit", "reply": "Travel mode set to 🚌 transit. Maps links updated."}
        if re.search(r"driv|car|taxi", msg):
            return {"type": "set_mode", "value": "driving", "reply": "Travel mode set to 🚗 driving. Maps links updated."}

        if re.search(r"food|eat|restaur|lunch|dinner|meal|cuisine", msg):
            return {"type": "info", "reply": f"Great food options near {dest_name}:\n• Dal-bhat set — Rs 200–400\n• Newari thali — Rs 300–600\n• Street momos — Rs 80–150\n• Budget Rs 400–700/meal per person"}

        if re.search(r"hotel|stay|sleep|accommodation|lodge|resort", msg):
            return {"type": "info", "reply": f"Accommodation near {dest_name}:\n• Budget guesthouses — Rs 800–1,500/night\n• Mid-range hotels — Rs 2,500–4,500/night\n• Boutique / heritage — Rs 6,000+/night"}

        if re.search(r"weather|rain|cold|hot|temperature|climate|season", msg):
            return {"type": "info", "reply": f"Seasonal weather guide:\n• Spring (Mar–May): 15–25°C ☀️ — ideal for most trips\n• Summer (Jun–Aug): 20–30°C 🌧 — monsoon, expect rain\n• Autumn (Sep–Nov): 12–22°C 🍂 — peak season, clear skies\n• Winter (Dec–Feb): 5–18°C ❄️ — dry and crisp"}

        if re.search(r"see|visit|attract|sight|explore|things to do", msg):
            self._ensure_loaded()
            dest = next((d for d in self._destinations if d["name"] == dest_name), None)
            if dest:
                h = "\n".join(f"• {h}" for h in dest.get("highlights", []))
                return {"type": "info", "reply": f"Top things at {dest_name}:\n{h}"}

        return {
            "type": "general",
            "reply": (
                f"I can help you update your {dest_name} trip! Try:\n"
                "• \"Add 2 more days\"\n"
                "• \"Budget Rs 5000\"\n"
                "• \"Switch to walking\"\n"
                "• \"Open in Google Maps\"\n"
                "• \"What to eat there\"\n"
                "• \"Best time to visit\""
            ),
        }
