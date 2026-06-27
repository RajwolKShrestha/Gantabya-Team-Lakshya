"""
Run once to populate MongoDB with Nepal tourism data.
    cd backend && python scripts/seed_db.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from db.connection import col
from datetime import datetime
import random

# ── Destinations ──────────────────────────────────────────────────────────────

DESTINATIONS = [
    {
        "name": "Pashupatinath Temple",
        "district": "Kathmandu", "province": "Bagmati",
        "categories": ["cultural", "spiritual", "heritage", "history"],
        "cost_per_day": 800, "rating": 4.9,
        "emoji": "🛕", "coordinates": {"lat": 27.7109, "lng": 85.3488},
        "highlights": ["UNESCO listed", "Hindu heritage", "Bagmati ghats", "Evening aarti ceremony"],
        "best_seasons": ["spring", "autumn"],
        "seasonal_visitors": {"spring": 18400, "summer": 8200, "autumn": 22100, "winter": 12600},
        "avg_stay_days": 1.0, "difficulty": "easy",
    },
    {
        "name": "Boudhanath Stupa",
        "district": "Kathmandu", "province": "Bagmati",
        "categories": ["cultural", "spiritual", "buddhist"],
        "cost_per_day": 600, "rating": 4.8,
        "emoji": "🏛", "coordinates": {"lat": 27.7215, "lng": 85.3620},
        "highlights": ["World's largest stupa", "Tibetan Buddhism hub", "Kora circuit", "Thangka galleries"],
        "best_seasons": ["spring", "autumn"],
        "seasonal_visitors": {"spring": 16200, "summer": 7100, "autumn": 18400, "winter": 10800},
        "avg_stay_days": 0.5, "difficulty": "easy",
    },
    {
        "name": "Changu Narayan Temple",
        "district": "Bhaktapur", "province": "Bagmati",
        "categories": ["history", "cultural", "heritage"],
        "cost_per_day": 700, "rating": 4.7,
        "emoji": "🏯", "coordinates": {"lat": 27.7138, "lng": 85.4174},
        "highlights": ["Oldest temple in Nepal", "Stone carvings", "Panoramic valley views", "UNESCO site"],
        "best_seasons": ["spring", "autumn"],
        "seasonal_visitors": {"spring": 9400, "summer": 3800, "autumn": 11000, "winter": 6200},
        "avg_stay_days": 0.5, "difficulty": "easy",
    },
    {
        "name": "Namobuddha Monastery",
        "district": "Kavrepalanchok", "province": "Bagmati",
        "categories": ["spiritual", "buddhist", "nature"],
        "cost_per_day": 900, "rating": 4.6,
        "emoji": "🌄", "coordinates": {"lat": 27.5769, "lng": 85.5050},
        "highlights": ["Sacred Buddhist site", "Himalayan views", "Tiger legend site", "Peaceful forest trails"],
        "best_seasons": ["spring", "autumn"],
        "seasonal_visitors": {"spring": 11800, "summer": 4600, "autumn": 13200, "winter": 7400},
        "avg_stay_days": 1.5, "difficulty": "easy",
    },
    {
        "name": "Patan Durbar Square",
        "district": "Lalitpur", "province": "Bagmati",
        "categories": ["history", "cultural", "art", "heritage"],
        "cost_per_day": 650, "rating": 4.8,
        "emoji": "🏛", "coordinates": {"lat": 27.6727, "lng": 85.3246},
        "highlights": ["Malla dynasty palace", "Newari architecture", "Bronze casting heritage", "Patan Museum"],
        "best_seasons": ["spring", "autumn", "winter"],
        "seasonal_visitors": {"spring": 14200, "summer": 5800, "autumn": 16400, "winter": 10200},
        "avg_stay_days": 1.0, "difficulty": "easy",
    },
    {
        "name": "Bhaktapur Durbar Square",
        "district": "Bhaktapur", "province": "Bagmati",
        "categories": ["history", "cultural", "art"],
        "cost_per_day": 750, "rating": 4.8,
        "emoji": "🏰", "coordinates": {"lat": 27.6710, "lng": 85.4298},
        "highlights": ["55-Window Palace", "Pottery square", "Peacock windows", "Juju Dhau curd"],
        "best_seasons": ["spring", "autumn"],
        "seasonal_visitors": {"spring": 12800, "summer": 4600, "autumn": 14600, "winter": 8800},
        "avg_stay_days": 1.0, "difficulty": "easy",
    },
    {
        "name": "Shivapuri Nagarjun Park",
        "district": "Kathmandu", "province": "Bagmati",
        "categories": ["wildlife", "nature", "adventure"],
        "cost_per_day": 500, "rating": 4.4,
        "emoji": "🌿", "coordinates": {"lat": 27.8025, "lng": 85.3681},
        "highlights": ["Leopards & langurs", "Bird watching", "City-edge wilderness", "Day hikes"],
        "best_seasons": ["spring", "autumn", "winter"],
        "seasonal_visitors": {"spring": 8400, "summer": 3200, "autumn": 9800, "winter": 7200},
        "avg_stay_days": 0.5, "difficulty": "moderate",
    },
    {
        "name": "Phulchowki Hill",
        "district": "Lalitpur", "province": "Bagmati",
        "categories": ["wildlife", "nature"],
        "cost_per_day": 400, "rating": 4.3,
        "emoji": "🦅", "coordinates": {"lat": 27.5935, "lng": 85.3845},
        "highlights": ["250+ bird species", "Rhododendron forests", "Highest peak in valley", "Himalaya views"],
        "best_seasons": ["spring"],
        "seasonal_visitors": {"spring": 6200, "summer": 1800, "autumn": 5400, "winter": 3800},
        "avg_stay_days": 0.5, "difficulty": "moderate",
    },
    {
        "name": "Godavari Botanical Garden",
        "district": "Lalitpur", "province": "Bagmati",
        "categories": ["nature", "wildlife"],
        "cost_per_day": 350, "rating": 4.2,
        "emoji": "🌸", "coordinates": {"lat": 27.5976, "lng": 85.3701},
        "highlights": ["900+ plant species", "Orchid house", "Butterfly park", "Picnic grounds"],
        "best_seasons": ["spring", "summer"],
        "seasonal_visitors": {"spring": 7200, "summer": 4800, "autumn": 5600, "winter": 3200},
        "avg_stay_days": 0.5, "difficulty": "easy",
    },
    {
        "name": "Dakshinkali Temple",
        "district": "Kathmandu", "province": "Bagmati",
        "categories": ["cultural", "spiritual"],
        "cost_per_day": 500, "rating": 4.3,
        "emoji": "🔱", "coordinates": {"lat": 27.5917, "lng": 85.2404},
        "highlights": ["Tantric goddess shrine", "Forested gorge", "Saturday markets", "Forest hike nearby"],
        "best_seasons": ["autumn", "spring"],
        "seasonal_visitors": {"spring": 8800, "summer": 3200, "autumn": 10400, "winter": 6800},
        "avg_stay_days": 0.5, "difficulty": "easy",
    },
    {
        "name": "Nagarjun Forest Reserve",
        "district": "Kathmandu", "province": "Bagmati",
        "categories": ["wildlife", "nature", "adventure"],
        "cost_per_day": 450, "rating": 4.2,
        "emoji": "🌲", "coordinates": {"lat": 27.7487, "lng": 85.2648},
        "highlights": ["Dense oak & pine", "Himalayan wildlife", "Stupa at summit", "Half-day trek"],
        "best_seasons": ["spring", "autumn", "winter"],
        "seasonal_visitors": {"spring": 6400, "summer": 2200, "autumn": 7800, "winter": 5200},
        "avg_stay_days": 0.5, "difficulty": "easy",
    },
    {
        "name": "Kanchenjunga Base Camp",
        "district": "Taplejung", "province": "Koshi",
        "categories": ["adventure", "nature"],
        "cost_per_day": 3200, "rating": 4.9,
        "emoji": "⛰", "coordinates": {"lat": 27.7025, "lng": 88.1472},
        "highlights": ["Third highest peak", "Remote wilderness", "Himalayan flora", "15+ day trek"],
        "best_seasons": ["spring", "autumn"],
        "seasonal_visitors": {"spring": 12300, "summer": 2800, "autumn": 15200, "winter": 3100},
        "avg_stay_days": 16.0, "difficulty": "hard",
    },
    {
        "name": "Annapurna Base Camp",
        "district": "Kaski", "province": "Gandaki",
        "categories": ["adventure", "nature"],
        "cost_per_day": 2800, "rating": 4.9,
        "emoji": "🏔", "coordinates": {"lat": 28.5319, "lng": 83.8774},
        "highlights": ["360° Himalayan panorama", "Annapurna massif", "Rhododendron forests", "Hot springs"],
        "best_seasons": ["spring", "autumn"],
        "seasonal_visitors": {"spring": 28400, "summer": 4200, "autumn": 32100, "winter": 8400},
        "avg_stay_days": 9.0, "difficulty": "hard",
    },
    {
        "name": "Phewa Lake Pokhara",
        "district": "Kaski", "province": "Gandaki",
        "categories": ["nature", "cultural"],
        "cost_per_day": 1200, "rating": 4.7,
        "emoji": "🌊", "coordinates": {"lat": 28.2096, "lng": 83.9556},
        "highlights": ["Boating on Phewa", "Fish Tail reflection", "Lakeside promenade", "Paragliding"],
        "best_seasons": ["spring", "autumn", "winter"],
        "seasonal_visitors": {"spring": 54200, "summer": 22400, "autumn": 58600, "winter": 36400},
        "avg_stay_days": 3.0, "difficulty": "easy",
    },
    {
        "name": "Lumbini Sacred Garden",
        "district": "Rupandehi", "province": "Lumbini",
        "categories": ["spiritual", "history", "cultural"],
        "cost_per_day": 600, "rating": 4.8,
        "emoji": "☮", "coordinates": {"lat": 27.4833, "lng": 83.2756},
        "highlights": ["Buddha's birthplace", "UNESCO World Heritage", "Maya Devi Temple", "Eternal flame"],
        "best_seasons": ["spring", "winter", "autumn"],
        "seasonal_visitors": {"spring": 38200, "summer": 14200, "autumn": 34600, "winter": 24800},
        "avg_stay_days": 1.5, "difficulty": "easy",
    },
    {
        "name": "Chitwan National Park",
        "district": "Chitwan", "province": "Lumbini",
        "categories": ["wildlife", "nature"],
        "cost_per_day": 2200, "rating": 4.9,
        "emoji": "🐘", "coordinates": {"lat": 27.5141, "lng": 84.3543},
        "highlights": ["One-horned rhinos", "Bengal tigers", "Jungle safari", "Elephant conservation"],
        "best_seasons": ["autumn", "winter", "spring"],
        "seasonal_visitors": {"spring": 52400, "summer": 18600, "autumn": 58200, "winter": 48400},
        "avg_stay_days": 3.0, "difficulty": "easy",
    },
    {
        "name": "Rara National Park",
        "district": "Mugu", "province": "Karnali",
        "categories": ["nature", "wildlife", "adventure"],
        "cost_per_day": 3800, "rating": 4.8,
        "emoji": "🏞", "coordinates": {"lat": 29.5247, "lng": 82.0856},
        "highlights": ["Nepal's largest lake", "Remote wilderness", "Crystal clear water", "Snow-capped surroundings"],
        "best_seasons": ["autumn", "spring"],
        "seasonal_visitors": {"spring": 6800, "summer": 1400, "autumn": 8400, "winter": 2200},
        "avg_stay_days": 4.0, "difficulty": "hard",
    },
]

# ── Reviews ────────────────────────────────────────────────────────────────────

REVIEW_TEMPLATES = [
    ("Amazing spiritual experience, deeply moving", 5, ["spiritual", "peaceful", "historic"]),
    ("Beautiful architecture, must visit", 5, ["historic", "beautiful", "cultural"]),
    ("Great natural scenery, worth the trek", 4, ["scenic", "nature", "adventurous"]),
    ("Very crowded in peak season, still worth it", 4, ["popular", "cultural"]),
    ("Best sunrise views in Nepal", 5, ["scenic", "peaceful", "photography"]),
    ("Good facilities, guides were helpful", 4, ["organized", "helpful"]),
    ("Unique cultural experience", 5, ["cultural", "educational", "historic"]),
    ("Wildlife sighting was incredible", 5, ["wildlife", "exciting", "nature"]),
    ("Could be better maintained but great history", 3, ["historic", "cultural"]),
    ("Perfect for a day trip from Kathmandu", 4, ["accessible", "cultural"]),
]

def seed():
    db_destinations = col("destinations")
    db_visitor_logs = col("visitor_logs")
    db_reviews      = col("reviews")
    db_trip_plans   = col("trip_plans")

    # Clear existing
    db_destinations.drop()
    db_visitor_logs.drop()
    db_reviews.drop()
    db_trip_plans.drop()

    print("Seeding destinations...")
    dest_ids = {}
    for d in DESTINATIONS:
        result = db_destinations.insert_one(d)
        dest_ids[d["name"]] = result.inserted_id
        print(f"  ✓ {d['name']}")

    print("\nSeeding visitor logs (monthly, 2022–2024)...")
    MONTHS = {1:0.7, 2:0.8, 3:1.2, 4:1.3, 5:0.9, 6:0.6, 7:0.5, 8:0.5, 9:1.4, 10:1.5, 11:1.1, 12:0.9}
    for dest in DESTINATIONS:
        dest_id = dest_ids[dest["name"]]
        base = max(dest["seasonal_visitors"].values()) / 12
        for year in [2022, 2023, 2024]:
            for month, mult in MONTHS.items():
                count = int(base * mult * random.uniform(0.85, 1.15))
                db_visitor_logs.insert_one({
                    "destination_id": dest_id,
                    "destination_name": dest["name"],
                    "province": dest["province"],
                    "month": month, "year": year,
                    "visitor_count": count,
                    "avg_stay_days": dest["avg_stay_days"] * random.uniform(0.9, 1.1),
                    "avg_spend_per_day": dest["cost_per_day"] * random.uniform(0.85, 1.2),
                    "nationality_breakdown": {
                        "Nepal": int(count * 0.35),
                        "India": int(count * 0.22),
                        "China": int(count * 0.12),
                        "USA": int(count * 0.08),
                        "UK": int(count * 0.06),
                        "Other": int(count * 0.17),
                    },
                })

    print("\nSeeding reviews...")
    for dest in DESTINATIONS:
        dest_id = dest_ids[dest["name"]]
        num_reviews = random.randint(8, 20)
        for _ in range(num_reviews):
            text, rating, tags = random.choice(REVIEW_TEMPLATES)
            # Adjust rating slightly based on destination rating
            adj = random.gauss(dest["rating"] - 4, 0.5)
            rating = max(1, min(5, round(4 + adj)))
            sentiment = (rating - 1) / 4.0 + random.uniform(-0.1, 0.1)
            db_reviews.insert_one({
                "destination_id": dest_id,
                "destination_name": dest["name"],
                "province": dest["province"],
                "rating": rating,
                "text": text,
                "sentiment": round(max(0, min(1, sentiment)), 3),
                "tags": tags,
                "created_at": datetime(
                    random.randint(2022, 2024),
                    random.randint(1, 12),
                    random.randint(1, 28),
                ),
            })

    print("\nCreating indexes...")
    db_destinations.create_index("name")
    db_destinations.create_index("province")
    db_destinations.create_index([("categories", 1)])
    db_visitor_logs.create_index([("destination_id", 1), ("year", 1), ("month", 1)])
    db_visitor_logs.create_index("province")
    db_reviews.create_index("destination_id")

    total_reviews = db_reviews.count_documents({})
    total_logs = db_visitor_logs.count_documents({})
    print(f"\n✅ Done! Seeded {len(DESTINATIONS)} destinations, {total_logs} visitor logs, {total_reviews} reviews.")

if __name__ == "__main__":
    seed()
