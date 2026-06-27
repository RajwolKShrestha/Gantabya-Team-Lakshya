import { serve } from "https://deno.land/std@0.208.0/http/server.ts"

const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? ""
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

// ── Nepal destination knowledge base ─────────────────────────────────────────

const DESTINATIONS = [
  { name: "Pashupatinath Temple",  province: "Bagmati",  district: "Kathmandu",      categories: ["cultural","spiritual","heritage"], costPerDay: 800,  rating: 4.9, emoji: "🛕", highlights: ["UNESCO listed","Hindu heritage","Bagmati ghats","Evening aarti"] },
  { name: "Boudhanath Stupa",      province: "Bagmati",  district: "Kathmandu",      categories: ["cultural","spiritual","buddhist"], costPerDay: 600,  rating: 4.8, emoji: "🏛", highlights: ["World's largest stupa","Tibetan Buddhism hub","Kora circuit"] },
  { name: "Changu Narayan Temple", province: "Bagmati",  district: "Bhaktapur",      categories: ["history","cultural","heritage"],   costPerDay: 700,  rating: 4.7, emoji: "🏯", highlights: ["Oldest temple in Nepal","Stone carvings","UNESCO site"] },
  { name: "Namobuddha Monastery",  province: "Bagmati",  district: "Kavrepalanchok", categories: ["spiritual","buddhist","nature"],   costPerDay: 900,  rating: 4.6, emoji: "🌄", highlights: ["Sacred Buddhist site","Himalayan views","Forest trails"] },
  { name: "Patan Durbar Square",   province: "Bagmati",  district: "Lalitpur",       categories: ["history","cultural","art"],        costPerDay: 650,  rating: 4.8, emoji: "🏛", highlights: ["Malla dynasty palace","Newari architecture","Bronze casting"] },
  { name: "Bhaktapur Durbar Sq",   province: "Bagmati",  district: "Bhaktapur",      categories: ["history","cultural"],             costPerDay: 750,  rating: 4.8, emoji: "🏰", highlights: ["55-Window Palace","Pottery square","Peacock windows"] },
  { name: "Shivapuri Nagarjun",    province: "Bagmati",  district: "Kathmandu",      categories: ["wildlife","nature","adventure"],   costPerDay: 500,  rating: 4.4, emoji: "🌿", highlights: ["Leopards & langurs","Bird watching","Day hikes"] },
  { name: "Annapurna Base Camp",   province: "Gandaki",  district: "Kaski",           categories: ["adventure","nature"],             costPerDay: 2800, rating: 4.9, emoji: "🏔", highlights: ["360° Himalayan panorama","Annapurna massif","Rhododendrons"] },
  { name: "Phewa Lake Pokhara",    province: "Gandaki",  district: "Kaski",           categories: ["nature","cultural"],              costPerDay: 1200, rating: 4.7, emoji: "🌊", highlights: ["Boating on Phewa","Fish Tail reflection","Paragliding"] },
  { name: "Lumbini Sacred Garden", province: "Lumbini",  district: "Rupandehi",       categories: ["spiritual","history","cultural"], costPerDay: 600,  rating: 4.8, emoji: "☮", highlights: ["Buddha's birthplace","UNESCO site","Maya Devi Temple"] },
  { name: "Chitwan National Park", province: "Lumbini",  district: "Chitwan",         categories: ["wildlife","nature"],              costPerDay: 2200, rating: 4.9, emoji: "🐘", highlights: ["One-horned rhinos","Bengal tigers","Jungle safari"] },
  { name: "Rara National Park",    province: "Karnali",  district: "Mugu",            categories: ["nature","wildlife","adventure"],   costPerDay: 3800, rating: 4.8, emoji: "🏞", highlights: ["Nepal's largest lake","Remote wilderness","Crystal water"] },
  { name: "Kanchenjunga BC",       province: "Koshi",    district: "Taplejung",       categories: ["adventure","nature"],             costPerDay: 3200, rating: 4.9, emoji: "⛰", highlights: ["Third highest peak","Remote wilderness","16-day trek"] },
  { name: "Ilam Tea Garden",       province: "Koshi",    district: "Ilam",            categories: ["nature","cultural"],              costPerDay: 600,  rating: 4.5, emoji: "🍃", highlights: ["Rolling tea hills","Orthodox tea","Sunrise views"] },
]

// ── Claude API helper ─────────────────────────────────────────────────────────

async function callClaude(systemPrompt: string, userMessage: string, maxTokens = 600): Promise<string> {
  if (!ANTHROPIC_KEY) return "⚠ ANTHROPIC_API_KEY not set in Supabase secrets."

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    }),
  })

  const json = await res.json()
  return json?.content?.[0]?.text ?? "No response from Claude."
}

// ── Action handlers ───────────────────────────────────────────────────────────

async function handleRecommend(payload: Record<string, unknown>) {
  const budget   = Number(payload.budget ?? 5000)
  const purposes = (payload.purposes as string[]) ?? []
  const days     = Number(payload.days ?? 3)
  const season   = String(payload.season ?? "all")
  const from     = String(payload.from ?? "Kathmandu")

  // Pre-filter by budget
  const affordable = DESTINATIONS.filter(d => d.costPerDay <= (budget / days) * 1.4)

  const system = `You are a Nepal tourism AI for the Gantabya Ministry of Tourism platform.
Given the user's preferences, rank the most suitable destinations from the list and return a JSON array.
Each item must have: name, score (0.0-1.0), reason (one sentence why it matches), scoreBreakdown.
Return ONLY valid JSON — no markdown, no extra text.`

  const user = `User preferences:
- Budget: Rs ${budget} total, Rs ${Math.round(budget/days)}/day
- Duration: ${days} days
- Interests: ${purposes.length ? purposes.join(", ") : "open to everything"}
- Season: ${season}
- Starting from: ${from}

Available destinations (name | categories | costPerDay | rating):
${affordable.map(d => `${d.name} | ${d.categories.join(",")} | Rs ${d.costPerDay}/day | ★${d.rating}`).join("\n")}

Return JSON array of up to 6 best matches, ordered by suitability score descending:
[{"name":"...","score":0.95,"reason":"...","scoreBreakdown":{"purposeMatch":0.9,"budgetFit":1.0,"seasonMatch":0.8}}]`

  try {
    const text = await callClaude(system, user, 800)
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    const ranked: Record<string, unknown>[] = jsonMatch ? JSON.parse(jsonMatch[0]) : []

    // Merge Claude ranking with full destination data
    const results = ranked.map((r) => {
      const dest = DESTINATIONS.find(d => d.name === r.name)
      if (!dest) return null
      return { ...dest, score: r.score, reason: r.reason, scoreBreakdown: r.scoreBreakdown }
    }).filter(Boolean)

    return { destinations: results }
  } catch {
    // Fallback: score locally
    const scored = affordable
      .map(d => {
        const purposeMatch = purposes.length
          ? purposes.filter(p => d.categories.includes(p)).length / purposes.length
          : 0.6
        const budgetFit = Math.min(1, (budget / days) / d.costPerDay)
        const score = purposeMatch * 0.5 + budgetFit * 0.3 + (d.rating - 4) * 0.2
        return { ...d, score: Math.round(Math.min(score, 0.99) * 100) / 100, reason: `Matches your ${purposes[0] ?? "travel"} interests` }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
    return { destinations: scored }
  }
}

async function handleItinerary(payload: Record<string, unknown>) {
  const destName = String(payload.destination ?? "")
  const days     = Number(payload.days ?? 3)
  const budget   = Number(payload.budget ?? 5000)
  const from     = String(payload.from ?? "Kathmandu")
  const purposes = (payload.purposes as string[]) ?? []

  const dest = DESTINATIONS.find(d => d.name === destName)
  if (!dest) return { itinerary: [] }

  const system = `You are a Nepal travel planner. Generate a detailed day-by-day itinerary as JSON.
Each day must have: day (number), theme (string), totalCost (number), activities (array).
Each activity: time ("HH:MM"), title, note, icon (single emoji), cost (number).
Be specific about Nepal locations, realistic costs in Rs, and practical timing.
Return ONLY valid JSON array — no markdown, no extra text.`

  const user = `Create a ${days}-day itinerary for ${destName} (${dest.district}, ${dest.province}).
- Traveller starts from: ${from}
- Total budget: Rs ${budget}
- Daily budget: Rs ${Math.round(budget / days)}
- Interests: ${purposes.join(", ") || "general sightseeing"}
- Key highlights at destination: ${dest.highlights.join(", ")}

Include transport from ${from} on Day 1, accommodation on all nights except last, return travel on last day.
JSON format:
[{"day":1,"theme":"...","totalCost":2800,"activities":[{"time":"07:30","title":"...","note":"...","icon":"🚌","cost":500}]}]`

  try {
    const text = await callClaude(system, user, 1200)
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    const itinerary = jsonMatch ? JSON.parse(jsonMatch[0]) : []
    return { itinerary }
  } catch {
    return { itinerary: [] }
  }
}

async function handleAssistant(payload: Record<string, unknown>) {
  const message  = String(payload.message ?? "")
  const context  = (payload.context ?? {}) as Record<string, unknown>
  const destName = String(context.destination ?? "your destination")
  const days     = Number(context.days ?? 3)
  const budget   = Number(context.budget ?? 5000)
  const mode     = String(context.travelMode ?? "driving")
  const from     = String(context.from ?? "Kathmandu")

  const dest = DESTINATIONS.find(d => d.name === destName)

  const system = `You are a friendly Nepal tourism assistant for the Gantabya platform (Ministry of Tourism, Nepal).
You help travellers plan and adjust their trips to Nepal. Be concise (2-4 sentences), specific, and practical.
Always give costs in Nepali Rupees (Rs). Reference real Nepal landmarks, food, transport, and culture.
If the user wants to change days/budget/mode, acknowledge it and say the app will update automatically.
If they want Google Maps, say you will open it for them.

Current trip:
- Destination: ${destName} (${dest?.district ?? ""}, ${dest?.province ?? ""})
- From: ${from} | Days: ${days} | Budget: Rs ${budget.toLocaleString()} | Mode: ${mode}
- Highlights: ${dest?.highlights?.join(", ") ?? ""}
- Categories: ${dest?.categories?.join(", ") ?? ""}`

  const reply = await callClaude(system, message, 300)

  // Detect intent for side-effects
  const lower = message.toLowerCase()
  let type = "general", value: unknown = undefined
  if (/open|navigate|maps|direction/.test(lower))  { type = "open_maps" }
  else if (/add (\d+) day|(\d+) more day/.test(lower)) { const m = lower.match(/(\d+)/); type = "add_days";  value = m ? parseInt(m[1]) : 1 }
  else if (/(\d+)\s*days/.test(lower))              { const m = lower.match(/(\d+)/); type = "set_days";  value = m ? parseInt(m[1]) : days }
  else if (/rs\.?\s*(\d[\d,]+)|budget.*(\d+)/.test(lower)) { const m = lower.match(/(\d[\d,]+)/); type = "set_budget"; value = m ? parseInt(m[1].replace(/,/g,"")) : budget }
  else if (/walk|foot/.test(lower))   { type = "set_mode"; value = "walking" }
  else if (/transit|bus/.test(lower)) { type = "set_mode"; value = "transit" }
  else if (/driv|taxi/.test(lower))   { type = "set_mode"; value = "driving" }

  return { reply, type, value, source: ANTHROPIC_KEY ? "claude" : "fallback" }
}

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS })
  }

  try {
    const { action, payload } = await req.json()
    let result: unknown

    if      (action === "recommend")  result = await handleRecommend(payload)
    else if (action === "itinerary")  result = await handleItinerary(payload)
    else if (action === "assistant")  result = await handleAssistant(payload)
    else return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } })

    return new Response(JSON.stringify(result), {
      headers: { ...CORS, "Content-Type": "application/json" },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    })
  }
})
