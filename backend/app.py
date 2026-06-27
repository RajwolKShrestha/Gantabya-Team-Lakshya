"""
Gantabya Backend — Flask API (CSV-driven ML + optional Claude AI)
Run:  cd backend && python app.py

To use your own CSV:
  1. Replace backend/data/destinations.csv with your CSV
     OR set the CSV_PATH env variable to any absolute path.
  2. Run `python app.py` — columns are auto-detected.

Endpoints:
  POST /recommend     — ML destination ranking from CSV
  POST /itinerary     — Day-by-day itinerary from CSV data
  GET  /insights      — Province-level analytics from CSV
  GET  /analysis      — Full stats for one destination
  POST /assistant     — Claude conversational assistant
  POST /csv/upload    — Hot-swap the CSV at runtime (multipart/form-data)
  GET  /health        — Liveness + status
"""

import os
import io
import traceback
from flask import Flask, request, jsonify
from flask_cors import CORS
from models.csv_recommender import CSVRecommender
from config import ANTHROPIC_API_KEY

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Use CSV_PATH env var or default to bundled dataset
csv_path = os.getenv("CSV_PATH", os.path.join(os.path.dirname(__file__), "data", "destinations.csv"))
rec = CSVRecommender(csv_path)

# ── Helpers ───────────────────────────────────────────────────────────────────

def ok(data: dict):
    return jsonify({"success": True, **data})

def err(msg: str, code: int = 400):
    return jsonify({"success": False, "error": msg}), code

# ── Health ────────────────────────────────────────────────────────────────────

@app.route("/health", methods=["GET"])
def health():
    try:
        rec._ensure_loaded()
        n = len(rec._df)
    except Exception as e:
        return err(f"CSV load failed: {e}", 500)
    return ok({
        "status":        "ok",
        "destinations":  n,
        "csv":           rec.csv_path,
        "claude":        bool(ANTHROPIC_API_KEY),
    })

# ── Recommend ─────────────────────────────────────────────────────────────────

@app.route("/recommend", methods=["POST"])
def recommend():
    """
    Body: { budget, purposes, days, season?, province? }
    Returns ML-ranked destinations from the CSV with score breakdown.
    """
    try:
        data     = request.json or {}
        budget   = int(data.get("budget",   5000))
        purposes = data.get("purposes",     [])
        days     = int(data.get("days",     3))
        season   = data.get("season",       "all").lower()
        province = data.get("province",     None)

        results = rec.recommend(budget, purposes, days, season, province)
        return ok({"destinations": results, "count": len(results), "source": "csv-ml"})
    except Exception as e:
        traceback.print_exc()
        return err(str(e))

# ── Itinerary ─────────────────────────────────────────────────────────────────

@app.route("/itinerary", methods=["POST"])
def itinerary():
    """
    Body: { destination, days, budget, from, purposes }
    Returns a day-by-day activity plan with Rs cost estimates.
    """
    try:
        data        = request.json or {}
        destination = data.get("destination", "")
        days        = int(data.get("days",   3))
        budget      = int(data.get("budget", 5000))
        from_loc    = data.get("from",       "Kathmandu")
        purposes    = data.get("purposes",   [])

        if not destination:
            return err("destination is required")

        plan = rec.generate_itinerary(destination, days, budget, from_loc, purposes)
        if not plan:
            return err(f"Destination '{destination}' not found in CSV", 404)

        return ok({"itinerary": plan, "days": len(plan), "source": "csv-ml"})
    except Exception as e:
        traceback.print_exc()
        return err(str(e))

# ── Insights ──────────────────────────────────────────────────────────────────

@app.route("/insights", methods=["GET"])
def insights():
    """
    Query: province (default Bagmati)
    Returns province-wide visitor analytics from the CSV.
    """
    try:
        province = request.args.get("province", "Bagmati")
        data     = rec.get_province_insights(province)
        return ok(data)
    except Exception as e:
        traceback.print_exc()
        return err(str(e))

# ── Destination analysis ──────────────────────────────────────────────────────

@app.route("/analysis", methods=["GET"])
def analysis():
    """
    Query: destination (required)
    Returns full ML stats for one destination.
    """
    try:
        destination = request.args.get("destination", "")
        if not destination:
            return err("destination is required")

        stats = rec.get_destination_stats(destination)
        if not stats:
            return err(f"Destination '{destination}' not found in CSV", 404)

        # Predict next-month visitors (simple trend: average of best two seasons)
        sv = stats.get("seasonalVisitors", {})
        top2 = sorted(sv.values(), reverse=True)[:2]
        predicted = int(sum(top2) / max(len(top2), 1) / 3)   # monthly estimate

        # Sentiment / cluster label from category mapping
        CLUSTER_LABELS = {
            "cultural":  "Cultural history tourists",
            "spiritual": "Spiritual & wellness seekers",
            "wildlife":  "Wildlife & nature explorers",
            "adventure": "Adventure & trekking enthusiasts",
            "nature":    "Eco & nature travellers",
            "history":   "Heritage site visitors",
        }
        cats  = stats.get("categories", [])
        label = next((CLUSTER_LABELS[c] for c in cats if c in CLUSTER_LABELS), "General tourists")

        return ok({
            **stats,
            "predictedVisitors": predicted,
            "clusterLabel":      label,
            "sentimentScore":    round(stats["rating"], 1),
            "reviewCount":       int(stats["totalVisitors"] / 100),
            "yoyGrowth":         round((stats["demandScore"] - 0.5) * 20, 1),
            "topTags":           cats[:5],
            "trendData": [
                {"period": "Jan–Feb", "visitors": round(sv.get("winter",0) / 2000, 1)},
                {"period": "Mar–Apr", "visitors": round(sv.get("spring",0) / 2000, 1)},
                {"period": "May–Jun", "visitors": round(sv.get("spring",0) / 4000, 1)},
                {"period": "Jul–Aug", "visitors": round(sv.get("summer",0) / 2000, 1)},
                {"period": "Sep–Oct", "visitors": round(sv.get("autumn",0) / 2000, 1)},
                {"period": "Nov–Dec", "visitors": round(sv.get("autumn",0) / 4000, 1)},
            ],
        })
    except Exception as e:
        traceback.print_exc()
        return err(str(e))

# ── Assistant ─────────────────────────────────────────────────────────────────

@app.route("/assistant", methods=["POST"])
def assistant():
    """
    Body: { message, context: { destination, days, budget, travelMode, from } }
    Uses Claude if ANTHROPIC_API_KEY is set, else rule-based fallback.
    """
    try:
        data    = request.json or {}
        message = str(data.get("message", "")).strip()
        context = data.get("context", {})

        if not message:
            return err("message is required")

        dest_name = str(context.get("destination", "your destination"))
        days      = int(context.get("days", 3))
        budget    = int(context.get("budget", 5000))
        mode      = str(context.get("travelMode", "driving"))
        from_loc  = str(context.get("from", "Kathmandu"))

        # Pull live CSV stats for context
        dest_stats = rec.get_destination_stats(dest_name)

        # ── Claude assistant ───────────────────────────────────────────────────
        if ANTHROPIC_API_KEY:
            try:
                import anthropic
                client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

                system = f"""You are a friendly Nepal tourism assistant for Gantabya (Ministry of Tourism, Bagmati Province).
You help travellers plan trips to Nepal. Be concise (2–4 sentences), specific, and practical.
Give all costs in Nepali Rupees (Rs). Reference real Nepal landmarks and culture.

Current trip:
- Destination: {dest_name}
- From: {from_loc} | Days: {days} | Budget: Rs {budget:,} | Mode: {mode}

Live CSV data for {dest_name}:
- Avg daily cost: Rs {dest_stats.get('costPerDay', '?')}
- Rating: {dest_stats.get('rating', '?')}/5
- Best seasons: {', '.join(dest_stats.get('bestSeasons', []))}
- Difficulty: {dest_stats.get('difficulty', '?')}
- Highlights: {', '.join(dest_stats.get('highlights', [])[:3])}
- Annual visitors: {dest_stats.get('totalVisitors', '?'):,}

If user wants to change days/budget, confirm and say the app will replan.
If they want Google Maps, say you will open it.
Respond in plain text, no markdown."""

                resp = client.messages.create(
                    model="claude-haiku-4-5-20251001",
                    max_tokens=300,
                    system=system,
                    messages=[{"role": "user", "content": message}],
                )
                reply = resp.content[0].text
                source = "claude"
            except Exception as ce:
                print(f"Claude error: {ce}")
                reply, source = _rule_reply(message, dest_name, days, budget, mode), "rule-based"
        else:
            reply, source = _rule_reply(message, dest_name, days, budget, mode), "rule-based"

        # Intent classification
        intent = _classify_intent(message)

        return ok({"reply": reply, "type": intent["type"], "value": intent.get("value"), "source": source})
    except Exception as e:
        traceback.print_exc()
        return err(str(e))

# ── CSV hot-swap ──────────────────────────────────────────────────────────────

@app.route("/csv/upload", methods=["POST"])
def csv_upload():
    """
    Upload a new CSV to replace the current dataset at runtime.
    multipart/form-data with field 'file'.
    """
    try:
        if "file" not in request.files:
            return err("No file uploaded — send multipart/form-data with field 'file'")

        f = request.files["file"]
        save_path = os.path.join(os.path.dirname(__file__), "data", "destinations.csv")
        f.save(save_path)

        # Reload the recommender with the new CSV
        rec.use_csv(save_path)
        n = len(rec._df)

        return ok({"message": f"CSV loaded successfully with {n} destinations", "destinations": n})
    except Exception as e:
        traceback.print_exc()
        return err(str(e))

# ── Intent & rule-based helpers ───────────────────────────────────────────────

import re

def _classify_intent(text: str) -> dict:
    t = text.lower()
    if re.search(r"open|navigate|maps|direction|route", t):
        return {"type": "open_maps"}
    m = re.search(r"add (\d+) days?|(\d+) more days?|extend (\d+)", t)
    if m:
        n = int(next(x for x in m.groups() if x))
        return {"type": "add_days", "value": n}
    m = re.search(r"(\d+)\s*days?|make it (\d+)", t)
    if m and "day" in t:
        n = int(next(x for x in m.groups() if x))
        if 1 <= n <= 14:
            return {"type": "set_days", "value": n}
    m = re.search(r"rs\.?\s*(\d[\d,]+)|budget.*?(\d[\d,]+)", t)
    if m and re.search(r"budget|rs|rupee|spend|cost", t):
        raw = next(x for x in m.groups() if x).replace(",", "")
        n = int(raw)
        if n >= 500:
            return {"type": "set_budget", "value": n}
    if re.search(r"walk|foot", t):    return {"type": "set_mode", "value": "walking"}
    if re.search(r"transit|bus",  t): return {"type": "set_mode", "value": "transit"}
    if re.search(r"driv|taxi|car", t): return {"type": "set_mode", "value": "driving"}
    return {"type": "general"}

def _rule_reply(msg: str, dest: str, days: int, budget: int, mode: str) -> str:
    t = msg.lower()
    if re.search(r"food|eat|restaur|lunch|dinner", t):
        return f"Great food options near {dest}: local dal-bhat Rs 200–400, Newari thali Rs 300–600, street momos Rs 80–150. Budget Rs 500–800/meal per person."
    if re.search(r"hotel|stay|sleep|accommodation", t):
        return f"Accommodation near {dest}: budget guesthouses Rs 800–1,500/night, mid-range Rs 2,500–4,500/night, boutique/heritage Rs 6,000+/night."
    if re.search(r"weather|rain|cold|hot|season|temperature", t):
        return "Nepal's best seasons are Spring (Mar–May, 15–25°C) and Autumn (Sep–Nov, 12–22°C). Summer is monsoon with heavy rain. Winter is dry and crisp but cold in mountains."
    if re.search(r"open|maps|navigate|direction", t):
        return f"Opening Google Maps with your {dest} route now — all stops pre-filled. 🗺"
    if re.search(r"add.*day|more day|extend", t):
        return f"Adding more days to your trip — replanning your itinerary now."
    if re.search(r"budget|cost|cheap|expensive|price", t):
        return f"Updating your budget — finding destinations and activities that fit within your new budget."
    return (
        f"I can help update your {dest} trip. Try: "
        '"Add 2 more days", "Budget Rs 5000", "Switch to walking", '
        '"Open in Google Maps", "What to eat there", or "Best time to visit".'
    )

# ── Dev server ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print(f"\n{'='*55}")
    print("  Gantabya Backend — CSV-driven ML Recommendation API")
    print(f"{'='*55}")
    print(f"  CSV:    {csv_path}")
    print(f"  Claude: {'enabled ✓' if ANTHROPIC_API_KEY else 'disabled — add ANTHROPIC_API_KEY to .env'}")
    print(f"  URL:    http://localhost:5000")
    print(f"{'='*55}\n")
    app.run(port=5000, debug=True)
