import { useState, createContext, useContext, useRef, useEffect } from "react"

// callAI — stubs to null in preview; deploy the Supabase Edge Function to activate.
// The callers (handleFind, handlePlan, send) already fall back to mock when null.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function callAI<T = Record<string, unknown>>(_a: string, _p: Record<string, unknown>): Promise<T | null> { return null }
import {
  BarChart2, Compass, Calendar, MapPin, Navigation,
  BookOpen, Users, Building2, Wallet, ShieldCheck,
  Wifi, Car, Coffee, Star, Sparkles, Clock,
  Fuel, Hospital, CheckCircle2, ChevronRight,
  ArrowRight, Route, Bed, Mountain, Sun, Moon,
  PanelLeftClose, PanelLeftOpen, Bot, Send, MapPinned,
  Landmark, TreePine, Scroll, Camera, Loader2
} from "lucide-react"

// ─── Theme ────────────────────────────────────────────────────────────────────

interface Theme {
  blue: string; blueLight: string; blueMid: string
  green: string; greenLight: string
  orange: string; orangeLight: string
  amber: string; amberLight: string
  pageBg: string; sideBg: string; surface: string
  border: string; subtle: string
  text: string; textMid: string; textSub: string; textFaint: string
  red: string; redLight: string
}

const light: Theme = {
  blue: "#185FA5", blueLight: "#EBF2FB", blueMid: "#2E7DD1",
  green: "#3B6D11", greenLight: "#EAF2E0",
  orange: "#D85A30", orangeLight: "#FBEEE8",
  amber: "#BA7517", amberLight: "#FBF3E2",
  pageBg: "#F2F5F9", sideBg: "#ffffff", surface: "#ffffff",
  border: "rgba(0,0,0,0.08)", subtle: "#EEF1F6",
  text: "#111827", textMid: "#374151", textSub: "#6B7280", textFaint: "#9CA3AF",
  red: "#B91C1C", redLight: "#FEE2E2",
}

const dark: Theme = {
  blue: "#4A9AE0", blueLight: "#162640", blueMid: "#3B8FD8",
  green: "#56A01E", greenLight: "#152510",
  orange: "#E07050", orangeLight: "#3A1A10",
  amber: "#D09420", amberLight: "#352208",
  pageBg: "#0E1018", sideBg: "#141624", surface: "#1C1F2E",
  border: "rgba(255,255,255,0.07)", subtle: "#1E2235",
  text: "#E8EDF5", textMid: "#B0BAD0", textSub: "#7E8BAA", textFaint: "#525E78",
  red: "#EF4444", redLight: "#3A1010",
}

interface Ctx { t: Theme; isDark: boolean; toggleDark: () => void }
const ThemeCtx = createContext<Ctx>({ t: light, isDark: false, toggleDark: () => {} })
const useT = () => useContext(ThemeCtx)

// ─── Types ────────────────────────────────────────────────────────────────────

type Page = "dashboard" | "pathfinder" | "smart-planner" | "nearby" | "live-tracking" | "book"
type Season = "All" | "Spring" | "Summer" | "Autumn" | "Winter"

// ─── Reusable primitives ──────────────────────────────────────────────────────

function Card({ children, className = "", style = {} }: {
  children: React.ReactNode; className?: string; style?: React.CSSProperties
}) {
  const { t } = useT()
  return (
    <div className={className} style={{
      background: t.surface, border: `0.5px solid ${t.border}`,
      borderRadius: 12, padding: 20,
      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      ...style,
    }}>
      {children}
    </div>
  )
}

function CardTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  const { t } = useT()
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: t.textMid, letterSpacing: "-0.01em" }}>
        {children}
      </span>
      {right}
    </div>
  )
}

function Badge({ children, color, bg }: { children: React.ReactNode; color: string; bg: string }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 500, color, background: bg,
      borderRadius: 6, padding: "2px 8px", letterSpacing: "0.01em",
    }}>
      {children}
    </span>
  )
}

function MetricCard({ label, value, icon, iconColor, iconBg, sub }: {
  label: string; value: string; icon: React.ReactNode;
  iconColor: string; iconBg: string; sub?: string
}) {
  const { t } = useT()
  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: t.textFaint, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            {label}
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: t.text, lineHeight: 1.1 }}>{value}</div>
          {sub && <div style={{ fontSize: 11, color: t.textSub, marginTop: 4 }}>{sub}</div>}
        </div>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: iconBg, color: iconColor,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {icon}
        </div>
      </div>
    </Card>
  )
}

// ─── SVG Maps ─────────────────────────────────────────────────────────────────

function BagmatiMap() {
  const { isDark, t } = useT()
  const terrain = isDark ? "#1A2A22" : "#DDE8D4"
  const terrainBorder = isDark ? "#243528" : "#B8CBAB"
  const terrainDot = isDark ? "#2A3830" : "#C8DBE0"
  const mapBg = isDark ? "#141C18" : "#EBF3F5"
  const river = isDark ? "#1E3A4A" : "#A8C8D8"
  const labelColor = t.textMid
  const subColor = t.textSub
  const highlightFill = isDark ? "#1E3020" : "#C8D8B8"
  const divider = isDark ? "#243028" : "#B0C4A8"

  const pins = [
    { x: 168, y: 138, color: t.blue, label: "Pashupatinath", sub: "Kathmandu" },
    { x: 188, y: 118, color: t.orange, label: "Boudhanath", sub: "Kathmandu" },
    { x: 232, y: 162, color: t.green, label: "Namobuddha", sub: "Kavrepalanchok" },
    { x: 215, y: 130, color: t.amber, label: "Changu Narayan", sub: "Bhaktapur" },
  ]

  return (
    <svg viewBox="0 0 380 260" style={{ width: "100%", height: "100%" }}>
      <rect width="380" height="260" fill={mapBg} rx="8" />
      {[[80,55],[100,70],[65,85],[290,60],[310,80],[325,55],[130,50],[160,42],[240,48],[270,65],[90,175],[105,190]].map(([cx,cy],i) => (
        <circle key={i} cx={cx} cy={cy} r={2.5} fill={terrainDot} opacity={0.7} />
      ))}
      <polygon points="55,55 90,35 130,28 175,30 220,32 265,38 305,50 330,70 335,100 325,140 305,175 270,200 230,215 185,218 145,210 110,195 75,165 52,130 45,95" fill={terrain} stroke={terrainBorder} strokeWidth="1" opacity={0.9} />
      <polyline points="55,55 78,48 105,42 130,35 162,30 200,28 235,30 265,38" fill="none" stroke={isDark ? "#2A4038" : "#A8C0B8"} strokeWidth="1.5" opacity={0.5} />
      <path d="M 130,50 Q 155,90 165,130 Q 170,150 175,180" fill="none" stroke={river} strokeWidth="1.5" opacity={0.6} />
      <path d="M 200,80 Q 210,110 215,140 Q 225,165 240,185" fill="none" stroke={river} strokeWidth="1" opacity={0.5} />
      <line x1="180" y1="60" x2="175" y2="200" stroke={divider} strokeWidth="0.5" strokeDasharray="4,4" opacity={0.5} />
      <line x1="100" y1="90" x2="300" y2="110" stroke={divider} strokeWidth="0.5" strokeDasharray="4,4" opacity={0.5} />
      <ellipse cx={185} cy={140} rx={48} ry={32} fill={highlightFill} opacity={0.4} />
      {pins.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y + 1} r={7} fill="rgba(0,0,0,0.12)" />
          <circle cx={p.x} cy={p.y} r={9} fill={p.color} opacity={0.18} />
          <circle cx={p.x} cy={p.y} r={6} fill={p.color} />
          <circle cx={p.x} cy={p.y} r={2.5} fill="white" />
          <text x={p.x + 12} y={p.y - 4} fontSize={9} fontWeight="600" fill={labelColor} fontFamily="Inter, sans-serif">{p.label}</text>
          <text x={p.x + 12} y={p.y + 6} fontSize={8} fill={subColor} fontFamily="Inter, sans-serif">{p.sub}</text>
        </g>
      ))}
      <line x1="295" y1="225" x2="345" y2="225" stroke={t.textFaint} strokeWidth="1" />
      <line x1="295" y1="221" x2="295" y2="229" stroke={t.textFaint} strokeWidth="1" />
      <line x1="345" y1="221" x2="345" y2="229" stroke={t.textFaint} strokeWidth="1" />
      <text x="310" y="219" fontSize={8} fill={subColor} fontFamily="Inter, sans-serif">20 km</text>
      <text x="340" y="50" fontSize={9} fill={subColor} fontFamily="Inter, sans-serif" fontWeight="600">N</text>
      <line x1="345" y1="53" x2="345" y2="63" stroke={t.textFaint} strokeWidth="1.5" />
      <polygon points="345,53 342,60 348,60" fill={t.blue} opacity={0.8} />
    </svg>
  )
}

function PathfinderMap() {
  const { isDark, t } = useT()
  const mapBg = isDark ? "#141C18" : "#EBF3F5"
  const terrain = isDark ? "#1A2A22" : "#DDE8D4"
  const terrainBorder = isDark ? "#243528" : "#B8CBAB"
  const roadBg = isDark ? "#1E2820" : "#C8CEB8"

  return (
    <svg viewBox="0 0 500 280" style={{ width: "100%", height: "100%" }}>
      <rect width="500" height="280" fill={mapBg} rx="8" />
      <polygon points="40,50 100,30 200,25 300,28 400,38 460,60 468,110 450,160 400,200 300,220 180,218 100,200 55,160 38,110" fill={terrain} stroke={terrainBorder} strokeWidth="1" opacity={0.85} />
      <path d="M 90,160 Q 180,140 270,145 Q 350,148 410,155" fill="none" stroke={roadBg} strokeWidth="3" opacity={0.6} />
      <path d="M 270,145 Q 265,100 260,65" fill="none" stroke={roadBg} strokeWidth="2" opacity={0.4} />
      <path d="M 100,170 Q 180,150 250,148 Q 330,145 390,145" fill="none" stroke={t.blue} strokeWidth="2.5" strokeDasharray="8,5" strokeLinecap="round" />
      <circle cx={250} cy={148} r={10} fill={t.green} opacity={0.18} />
      <circle cx={250} cy={148} r={7} fill={t.green} />
      <circle cx={250} cy={148} r={3} fill="white" />
      <text x={262} y={142} fontSize={9} fontWeight="600" fill={t.textMid} fontFamily="Inter, sans-serif">Dhulikhel</text>
      <circle cx={100} cy={170} r={11} fill={t.blue} opacity={0.18} />
      <circle cx={100} cy={170} r={8} fill={t.blue} />
      <circle cx={100} cy={170} r={3.5} fill="white" />
      <text x={115} y={164} fontSize={9} fontWeight="600" fill={t.textMid} fontFamily="Inter, sans-serif">Kathmandu</text>
      <text x={115} y={175} fontSize={8} fill={t.textSub} fontFamily="Inter, sans-serif">Start</text>
      <circle cx={390} cy={145} r={11} fill={t.orange} opacity={0.18} />
      <circle cx={390} cy={145} r={8} fill={t.orange} />
      <circle cx={390} cy={145} r={3.5} fill="white" />
      <text x={400} y={139} fontSize={9} fontWeight="600" fill={t.textMid} fontFamily="Inter, sans-serif">Namobuddha</text>
      <text x={400} y={150} fontSize={8} fill={t.textSub} fontFamily="Inter, sans-serif">Destination</text>
      <text x={230} y={136} fontSize={9} fontWeight="500" fill={t.blue} fontFamily="Inter, sans-serif">42 km</text>
      <line x1="30" y1="245" x2="55" y2="245" stroke={t.blue} strokeWidth="2" strokeDasharray="5,4" />
      <text x={60} y={249} fontSize={9} fill={t.textSub} fontFamily="Inter, sans-serif">Route</text>
      <circle cx={38} cy={260} r={5} fill={t.green} />
      <text x={48} y={264} fontSize={9} fill={t.textSub} fontFamily="Inter, sans-serif">Waypoint</text>
    </svg>
  )
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const seasonalData = [
  { period: "Jan–Feb", visitors: 22 },
  { period: "Mar–Apr", visitors: 58 },
  { period: "May–Jun", visitors: 31 },
  { period: "Jul–Aug", visitors: 18 },
  { period: "Sep–Oct", visitors: 72 },
  { period: "Nov–Dec", visitors: 25 },
]

const topPlaces = [
  { rank: 1, emoji: "🛕", name: "Pashupatinath Temple", category: "Heritage", district: "Kathmandu", visitors: "14,820", colorKey: "blue" as const },
  { rank: 2, emoji: "🏛", name: "Boudhanath Stupa", category: "Spiritual", district: "Kathmandu", visitors: "12,350", colorKey: "orange" as const },
  { rank: 3, emoji: "🌄", name: "Namobuddha", category: "Buddhist", district: "Kavrepalanchok", visitors: "9,140", colorKey: "green" as const },
  { rank: 4, emoji: "🏯", name: "Changu Narayan", category: "Heritage", district: "Bhaktapur", visitors: "7,680", colorKey: "amber" as const },
]

const hotels = [
  { image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=200&fit=crop&auto=format", name: "Dwarika's Hotel", stars: 5, price: "Rs 8,500", location: "Battisputali, Kathmandu", amenities: ["wifi","car","coffee"], tag: "Heritage property" },
  { image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400&h=200&fit=crop&auto=format", name: "Hyatt Regency Kathmandu", stars: 5, price: "Rs 12,000", location: "Boudha, Kathmandu", amenities: ["wifi","car","coffee"], tag: "Luxury resort" },
  { image: "https://images.unsplash.com/photo-1551882547-ff40c63fe2e2?w=400&h=200&fit=crop&auto=format", name: "Gokarna Forest Resort", stars: 4, price: "Rs 6,200", location: "Gokarna, Kathmandu", amenities: ["wifi","coffee"], tag: "Eco resort" },
  { image: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=400&h=200&fit=crop&auto=format", name: "Hotel Manaslu", stars: 4, price: "Rs 4,800", location: "Lazimpat, Kathmandu", amenities: ["wifi","car"], tag: "Business hotel" },
  { image: "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=400&h=200&fit=crop&auto=format", name: "Dhulikhel Lodge Resort", stars: 3, price: "Rs 3,200", location: "Dhulikhel, Kavrepalanchok", amenities: ["wifi","coffee"], tag: "Mountain view" },
  { image: "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=400&h=200&fit=crop&auto=format", name: "Namobuddha Resort", stars: 3, price: "Rs 2,800", location: "Namobuddha, Kavrepalanchok", amenities: ["wifi"], tag: "Peaceful retreat" },
]

// ─── Seasonal bar chart (custom SVG — avoids recharts key collision bug) ─────

function SeasonalChart({ data, t }: { data: { period: string; visitors: number }[]; t: Theme }) {
  const max = Math.max(...data.map((d) => d.visitors))
  const barH = 22
  const gap = 14
  const labelW = 58
  const valueW = 36
  const totalH = data.length * (barH + gap) - gap

  return (
    <svg viewBox={`0 0 520 ${totalH}`} style={{ width: "100%", height: totalH + 8, display: "block" }}>
      {data.map((entry, i) => {
        const trackW = 520 - labelW - valueW - 12
        const fillW = (entry.visitors / max) * trackW
        const y = i * (barH + gap)
        const fill = entry.visitors >= 55 ? t.blue : entry.visitors >= 30 ? t.blueMid : t.blueLight

        return (
          <g key={entry.period}>
            {/* Period label */}
            <text
              x={0} y={y + barH / 2 + 4}
              fontSize={11} fill={t.textSub} fontFamily="Inter, sans-serif"
            >
              {entry.period}
            </text>
            {/* Track background */}
            <rect x={labelW} y={y} width={trackW} height={barH} fill={t.subtle} rx={5} />
            {/* Filled bar */}
            <rect x={labelW} y={y} width={Math.max(fillW, 6)} height={barH} fill={fill} rx={5} />
            {/* Value label */}
            <text
              x={labelW + trackW + 8} y={y + barH / 2 + 4}
              fontSize={11} fontWeight="600" fill={t.textSub} fontFamily="Inter, sans-serif"
            >
              {entry.visitors}k
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ─── Province data ────────────────────────────────────────────────────────────

interface ProvincePlace {
  emoji: string; name: string; category: string; district: string
  visitors: Record<Season, string>; colorKey: "blue" | "orange" | "green" | "amber"
}

interface ProvinceSeason {
  visitors: string; activePlaces: number; avgCost: string; safeRoutes: string
  trendData: { period: string; visitors: number }[]
  highlight: string
}

interface NepalProvince {
  id: string; number: number; name: string; capital: string
  color: string; tagline: string
  places: ProvincePlace[]
  seasonal: Record<Season, ProvinceSeason>
}

const PROVINCES: NepalProvince[] = [
  {
    id: "koshi", number: 1, name: "Koshi", capital: "Biratnagar",
    color: "#1E6FA8", tagline: "Land of the Himalayas",
    places: [
      { emoji: "⛰", name: "Kanchenjunga Base Camp", category: "Adventure", district: "Taplejung", colorKey: "blue",   visitors: { All: "8,420",  Spring: "12,300", Summer: "2,800", Autumn: "15,200", Winter: "3,100" } },
      { emoji: "🍃", name: "Ilam Tea Garden",         category: "Nature",    district: "Ilam",      colorKey: "green",  visitors: { All: "9,180",  Spring: "11,400", Summer: "6,200", Autumn: "10,500", Winter: "5,400" } },
      { emoji: "🛕", name: "Pathibhara Temple",        category: "Spiritual", district: "Taplejung", colorKey: "orange", visitors: { All: "11,200", Spring: "13,500", Summer: "5,100", Autumn: "14,200", Winter: "4,800" } },
      { emoji: "🦏", name: "Koshi Tappu Reserve",      category: "Wildlife",  district: "Sunsari",   colorKey: "amber",  visitors: { All: "7,650",  Spring: "9,800",  Summer: "2,400", Autumn: "11,300", Winter: "6,200" } },
      { emoji: "🌊", name: "Saptakoshi River Camp",    category: "Adventure", district: "Sunsari",   colorKey: "blue",   visitors: { All: "5,200",  Spring: "7,400",  Summer: "1,800", Autumn: "8,600",  Winter: "3,800" } },
      { emoji: "🏡", name: "Bhedetar Hill Station",    category: "Nature",    district: "Dhankuta",  colorKey: "green",  visitors: { All: "6,400",  Spring: "8,200",  Summer: "4,600", Autumn: "7,400",  Winter: "4,200" } },
      { emoji: "🏺", name: "Tumlingtar Cultural Hub",  category: "History",   district: "Sankhuwasabha", colorKey: "orange", visitors: { All: "3,800", Spring: "5,200", Summer: "1,600", Autumn: "6,400",  Winter: "2,600" } },
      { emoji: "🌸", name: "Mai Pokhari Sacred Lake",  category: "Spiritual", district: "Ilam",      colorKey: "amber",  visitors: { All: "4,600",  Spring: "6,800",  Summer: "2,200", Autumn: "7,200",  Winter: "3,200" } },
    ],
    seasonal: {
      All:    { visitors: "38,420", activePlaces: 96,  avgCost: "Rs 5,200", safeRoutes: "94%", highlight: "Diverse terrain from Terai to Kanchenjunga", trendData: [{ period:"Jan–Feb",visitors:18 },{ period:"Mar–Apr",visitors:45 },{ period:"May–Jun",visitors:22 },{ period:"Jul–Aug",visitors:12 },{ period:"Sep–Oct",visitors:62 },{ period:"Nov–Dec",visitors:20 }] },
      Spring: { visitors: "45,200", activePlaces: 102, avgCost: "Rs 5,800", safeRoutes: "96%", highlight: "Peak trekking season to Kanchenjunga", trendData: [{ period:"Jan–Feb",visitors:12 },{ period:"Mar–Apr",visitors:68 },{ period:"May–Jun",visitors:35 },{ period:"Jul–Aug",visitors:8 },{ period:"Sep–Oct",visitors:48 },{ period:"Nov–Dec",visitors:14 }] },
      Summer: { visitors: "18,300", activePlaces: 72,  avgCost: "Rs 3,900", safeRoutes: "88%", highlight: "Monsoon season — lush but challenging treks", trendData: [{ period:"Jan–Feb",visitors:8 },{ period:"Mar–Apr",visitors:22 },{ period:"May–Jun",visitors:38 },{ period:"Jul–Aug",visitors:32 },{ period:"Sep–Oct",visitors:18 },{ period:"Nov–Dec",visitors:10 }] },
      Autumn: { visitors: "52,100", activePlaces: 108, avgCost: "Rs 6,100", safeRoutes: "97%", highlight: "Crystal-clear mountain views, ideal weather", trendData: [{ period:"Jan–Feb",visitors:10 },{ period:"Mar–Apr",visitors:38 },{ period:"May–Jun",visitors:18 },{ period:"Jul–Aug",visitors:8 },{ period:"Sep–Oct",visitors:82 },{ period:"Nov–Dec",visitors:28 }] },
      Winter: { visitors: "22,500", activePlaces: 84,  avgCost: "Rs 4,200", safeRoutes: "92%", highlight: "Snow-capped peaks, low-altitude cultural sites", trendData: [{ period:"Jan–Feb",visitors:28 },{ period:"Mar–Apr",visitors:18 },{ period:"May–Jun",visitors:12 },{ period:"Jul–Aug",visitors:6 },{ period:"Sep–Oct",visitors:22 },{ period:"Nov–Dec",visitors:38 }] },
    },
  },
  {
    id: "madhesh", number: 2, name: "Madhesh", capital: "Janakpur",
    color: "#C4500A", tagline: "Heart of the Terai",
    places: [
      { emoji: "🛕", name: "Janaki Temple",          category: "Spiritual", district: "Janakpur",   colorKey: "orange", visitors: { All: "22,400", Spring: "28,000", Summer: "12,000", Autumn: "26,500", Winter: "20,000" } },
      { emoji: "🐅", name: "Parsa National Park",    category: "Wildlife",  district: "Parsa",      colorKey: "green",  visitors: { All: "6,200",  Spring: "8,400",  Summer: "2,100",  Autumn: "9,800",  Winter: "7,200"  } },
      { emoji: "🏺", name: "Gadhimai Temple",        category: "Cultural",  district: "Bara",       colorKey: "amber",  visitors: { All: "15,800", Spring: "18,200", Summer: "8,400",  Autumn: "19,600", Winter: "14,200" } },
      { emoji: "🌾", name: "Lahan Cultural Museum",  category: "History",   district: "Siraha",     colorKey: "blue",   visitors: { All: "4,500",  Spring: "5,800",  Summer: "2,200",  Autumn: "6,100",  Winter: "4,200"  } },
      { emoji: "🎨", name: "Mithila Art Village",    category: "Art",       district: "Dhanusha",   colorKey: "orange", visitors: { All: "8,200",  Spring: "10,400", Summer: "4,600",  Autumn: "11,800", Winter: "7,400"  } },
      { emoji: "🕌", name: "Jaleshwar Temple",       category: "Spiritual", district: "Mahottari",  colorKey: "green",  visitors: { All: "9,600",  Spring: "12,200", Summer: "5,200",  Autumn: "13,400", Winter: "8,800"  } },
      { emoji: "🌿", name: "Chure Forest Reserve",   category: "Nature",    district: "Sarlahi",    colorKey: "amber",  visitors: { All: "3,800",  Spring: "5,200",  Summer: "1,600",  Autumn: "6,400",  Winter: "4,200"  } },
    ],
    seasonal: {
      All:    { visitors: "52,600", activePlaces: 88,  avgCost: "Rs 3,200", safeRoutes: "91%", highlight: "Rich Maithili culture and Terai wildlife", trendData: [{ period:"Jan–Feb",visitors:32 },{ period:"Mar–Apr",visitors:52 },{ period:"May–Jun",visitors:28 },{ period:"Jul–Aug",visitors:14 },{ period:"Sep–Oct",visitors:58 },{ period:"Nov–Dec",visitors:38 }] },
      Spring: { visitors: "68,400", activePlaces: 96,  avgCost: "Rs 3,800", safeRoutes: "93%", highlight: "Ram Navami festival draws massive crowds", trendData: [{ period:"Jan–Feb",visitors:22 },{ period:"Mar–Apr",visitors:82 },{ period:"May–Jun",visitors:42 },{ period:"Jul–Aug",visitors:10 },{ period:"Sep–Oct",visitors:44 },{ period:"Nov–Dec",visitors:28 }] },
      Summer: { visitors: "28,200", activePlaces: 68,  avgCost: "Rs 2,400", safeRoutes: "84%", highlight: "Monsoon — heat and flooding risk in Terai", trendData: [{ period:"Jan–Feb",visitors:14 },{ period:"Mar–Apr",visitors:28 },{ period:"May–Jun",visitors:48 },{ period:"Jul–Aug",visitors:42 },{ period:"Sep–Oct",visitors:22 },{ period:"Nov–Dec",visitors:18 }] },
      Autumn: { visitors: "72,100", activePlaces: 102, avgCost: "Rs 4,100", safeRoutes: "94%", highlight: "Chhath Puja — largest Terai celebration", trendData: [{ period:"Jan–Feb",visitors:18 },{ period:"Mar–Apr",visitors:42 },{ period:"May–Jun",visitors:22 },{ period:"Jul–Aug",visitors:10 },{ period:"Sep–Oct",visitors:88 },{ period:"Nov–Dec",visitors:36 }] },
      Winter: { visitors: "58,300", activePlaces: 92,  avgCost: "Rs 3,500", safeRoutes: "95%", highlight: "Best season for Terai wildlife & culture", trendData: [{ period:"Jan–Feb",visitors:52 },{ period:"Mar–Apr",visitors:28 },{ period:"May–Jun",visitors:14 },{ period:"Jul–Aug",visitors:8 },{ period:"Sep–Oct",visitors:34 },{ period:"Nov–Dec",visitors:48 }] },
    },
  },
  {
    id: "bagmati", number: 3, name: "Bagmati", capital: "Kathmandu",
    color: "#185FA5", tagline: "Cultural heartland of Nepal",
    places: [
      { emoji: "🛕", name: "Pashupatinath Temple",   category: "Heritage",  district: "Kathmandu",       colorKey: "blue",   visitors: { All: "14,820", Spring: "18,400", Summer: "8,200",  Autumn: "22,100", Winter: "12,600" } },
      { emoji: "🏛", name: "Boudhanath Stupa",        category: "Spiritual", district: "Kathmandu",       colorKey: "orange", visitors: { All: "12,350", Spring: "16,200", Summer: "7,100",  Autumn: "18,400", Winter: "10,800" } },
      { emoji: "🌄", name: "Namobuddha Monastery",    category: "Buddhist",  district: "Kavrepalanchok",  colorKey: "green",  visitors: { All: "9,140",  Spring: "11,800", Summer: "4,600",  Autumn: "13,200", Winter: "7,400"  } },
      { emoji: "🏯", name: "Changu Narayan Temple",   category: "Heritage",  district: "Bhaktapur",       colorKey: "amber",  visitors: { All: "7,680",  Spring: "9,400",  Summer: "3,800",  Autumn: "11,000", Winter: "6,200"  } },
      { emoji: "🐵", name: "Swayambhunath Stupa",     category: "Spiritual", district: "Kathmandu",       colorKey: "blue",   visitors: { All: "11,200", Spring: "14,800", Summer: "6,400",  Autumn: "16,200", Winter: "9,600"  } },
      { emoji: "🏰", name: "Patan Durbar Square",     category: "History",   district: "Lalitpur",        colorKey: "orange", visitors: { All: "10,400", Spring: "13,600", Summer: "5,200",  Autumn: "15,800", Winter: "8,800"  } },
      { emoji: "🏛", name: "Bhaktapur Durbar Sq",     category: "Cultural",  district: "Bhaktapur",       colorKey: "green",  visitors: { All: "9,800",  Spring: "12,400", Summer: "4,800",  Autumn: "14,600", Winter: "8,200"  } },
      { emoji: "🌿", name: "Shivapuri Nagarjun Park", category: "Wildlife",  district: "Kathmandu",       colorKey: "amber",  visitors: { All: "6,200",  Spring: "8,400",  Summer: "3,200",  Autumn: "9,800",  Winter: "5,600"  } },
    ],
    seasonal: {
      All:    { visitors: "48,210", activePlaces: 124, avgCost: "Rs 4,800", safeRoutes: "98%", highlight: "7 UNESCO World Heritage Sites in one valley", trendData: [{ period:"Jan–Feb",visitors:22 },{ period:"Mar–Apr",visitors:58 },{ period:"May–Jun",visitors:31 },{ period:"Jul–Aug",visitors:18 },{ period:"Sep–Oct",visitors:72 },{ period:"Nov–Dec",visitors:25 }] },
      Spring: { visitors: "62,400", activePlaces: 134, avgCost: "Rs 5,400", safeRoutes: "99%", highlight: "Holi & Bisket Jatra festivals, clear skies", trendData: [{ period:"Jan–Feb",visitors:16 },{ period:"Mar–Apr",visitors:82 },{ period:"May–Jun",visitors:44 },{ period:"Jul–Aug",visitors:12 },{ period:"Sep–Oct",visitors:58 },{ period:"Nov–Dec",visitors:18 }] },
      Summer: { visitors: "28,100", activePlaces: 102, avgCost: "Rs 3,600", safeRoutes: "95%", highlight: "Monsoon brings lush green valleys", trendData: [{ period:"Jan–Feb",visitors:12 },{ period:"Mar–Apr",visitors:28 },{ period:"May–Jun",visitors:52 },{ period:"Jul–Aug",visitors:48 },{ period:"Sep–Oct",visitors:28 },{ period:"Nov–Dec",visitors:14 }] },
      Autumn: { visitors: "74,800", activePlaces: 138, avgCost: "Rs 5,800", safeRoutes: "99%", highlight: "Dashain & Tihar — Nepal's greatest festivals", trendData: [{ period:"Jan–Feb",visitors:14 },{ period:"Mar–Apr",visitors:48 },{ period:"May–Jun",visitors:22 },{ period:"Jul–Aug",visitors:10 },{ period:"Sep–Oct",visitors:94 },{ period:"Nov–Dec",visitors:32 }] },
      Winter: { visitors: "32,600", activePlaces: 118, avgCost: "Rs 4,100", safeRoutes: "96%", highlight: "Fewer crowds, crisp mountain views", trendData: [{ period:"Jan–Feb",visitors:38 },{ period:"Mar–Apr",visitors:22 },{ period:"May–Jun",visitors:14 },{ period:"Jul–Aug",visitors:8 },{ period:"Sep–Oct",visitors:24 },{ period:"Nov–Dec",visitors:42 }] },
    },
  },
  {
    id: "gandaki", number: 4, name: "Gandaki", capital: "Pokhara",
    color: "#1A6B5A", tagline: "Trekking capital of the world",
    places: [
      { emoji: "🏔", name: "Annapurna Base Camp",  category: "Adventure", district: "Kaski",   colorKey: "blue",   visitors: { All: "18,600", Spring: "28,400", Summer: "4,200",  Autumn: "32,100", Winter: "8,400"  } },
      { emoji: "🌊", name: "Phewa Lake Pokhara",   category: "Nature",    district: "Kaski",   colorKey: "orange", visitors: { All: "42,800", Spring: "54,200", Summer: "22,400", Autumn: "58,600", Winter: "36,400" } },
      { emoji: "🏜", name: "Mustang Kingdom",       category: "Cultural",  district: "Mustang", colorKey: "amber",  visitors: { All: "8,200",  Spring: "12,400", Summer: "3,800",  Autumn: "14,200", Winter: "4,100"  } },
      { emoji: "⛺", name: "Manaslu Circuit Trek",  category: "Adventure", district: "Gorkha",  colorKey: "green",  visitors: { All: "9,800",  Spring: "14,600", Summer: "2,200",  Autumn: "18,400", Winter: "4,600"  } },
      { emoji: "⛅", name: "Poon Hill Sunrise",     category: "Nature",    district: "Myagdi",  colorKey: "blue",   visitors: { All: "22,400", Spring: "32,600", Summer: "6,800",  Autumn: "36,200", Winter: "12,400" } },
      { emoji: "🛶", name: "Begnas Lake",           category: "Nature",    district: "Kaski",   colorKey: "orange", visitors: { All: "14,200", Spring: "18,800", Summer: "8,400",  Autumn: "20,600", Winter: "11,200" } },
      { emoji: "🌅", name: "Sarangkot Viewpoint",   category: "Nature",    district: "Kaski",   colorKey: "amber",  visitors: { All: "18,600", Spring: "24,200", Summer: "9,600",  Autumn: "26,800", Winter: "14,400" } },
      { emoji: "🏘", name: "Ghandruk Village",      category: "Cultural",  district: "Kaski",   colorKey: "green",  visitors: { All: "11,400", Spring: "16,200", Summer: "3,800",  Autumn: "20,400", Winter: "7,200"  } },
    ],
    seasonal: {
      All:    { visitors: "82,400", activePlaces: 148, avgCost: "Rs 6,800", safeRoutes: "96%", highlight: "Annapurna & Dhaulagiri — world-class trekking", trendData: [{ period:"Jan–Feb",visitors:28 },{ period:"Mar–Apr",visitors:72 },{ period:"May–Jun",visitors:38 },{ period:"Jul–Aug",visitors:14 },{ period:"Sep–Oct",visitors:88 },{ period:"Nov–Dec",visitors:32 }] },
      Spring: { visitors: "112,400", activePlaces: 162, avgCost: "Rs 7,800", safeRoutes: "97%", highlight: "Rhododendron bloom on Poon Hill & trails", trendData: [{ period:"Jan–Feb",visitors:18 },{ period:"Mar–Apr",visitors:98 },{ period:"May–Jun",visitors:52 },{ period:"Jul–Aug",visitors:8 },{ period:"Sep–Oct",visitors:68 },{ period:"Nov–Dec",visitors:22 }] },
      Summer: { visitors: "38,200", activePlaces: 112, avgCost: "Rs 4,800", safeRoutes: "89%", highlight: "Upper Mustang stays open — rain shadow zone", trendData: [{ period:"Jan–Feb",visitors:12 },{ period:"Mar–Apr",visitors:32 },{ period:"May–Jun",visitors:58 },{ period:"Jul–Aug",visitors:52 },{ period:"Sep–Oct",visitors:32 },{ period:"Nov–Dec",visitors:16 }] },
      Autumn: { visitors: "138,600", activePlaces: 172, avgCost: "Rs 8,400", safeRoutes: "98%", highlight: "Best visibility — Himalayan panoramas are clearest", trendData: [{ period:"Jan–Feb",visitors:12 },{ period:"Mar–Apr",visitors:58 },{ period:"May–Jun",visitors:24 },{ period:"Jul–Aug",visitors:8 },{ period:"Sep–Oct",visitors:112 },{ period:"Nov–Dec",visitors:42 }] },
      Winter: { visitors: "48,200", activePlaces: 128, avgCost: "Rs 5,600", safeRoutes: "93%", highlight: "Pokhara lakeside — warm days, snow-capped peaks", trendData: [{ period:"Jan–Feb",visitors:44 },{ period:"Mar–Apr",visitors:28 },{ period:"May–Jun",visitors:16 },{ period:"Jul–Aug",visitors:6 },{ period:"Sep–Oct",visitors:32 },{ period:"Nov–Dec",visitors:52 }] },
    },
  },
  {
    id: "lumbini", number: 5, name: "Lumbini", capital: "Butwal",
    color: "#7A5200", tagline: "Birthplace of Buddha",
    places: [
      { emoji: "☮",  name: "Lumbini Sacred Garden",  category: "Spiritual", district: "Rupandehi", colorKey: "orange", visitors: { All: "28,400", Spring: "38,200", Summer: "14,200", Autumn: "34,600", Winter: "24,800" } },
      { emoji: "🐘", name: "Chitwan National Park",   category: "Wildlife",  district: "Chitwan",   colorKey: "green",  visitors: { All: "42,600", Spring: "52,400", Summer: "18,600", Autumn: "58,200", Winter: "48,400" } },
      { emoji: "🏘", name: "Bandipur Village",         category: "Cultural",  district: "Tanahun",   colorKey: "blue",   visitors: { All: "12,800", Spring: "16,400", Summer: "5,800",  Autumn: "18,200", Winter: "10,400" } },
      { emoji: "⛩",  name: "Palpa Tansen",             category: "History",   district: "Palpa",     colorKey: "amber",  visitors: { All: "8,400",  Spring: "10,800", Summer: "3,600",  Autumn: "12,200", Winter: "7,200"  } },
      { emoji: "🕌", name: "Devdaha Historical Site",  category: "History",   district: "Rupandehi", colorKey: "orange", visitors: { All: "6,800",  Spring: "9,200",  Summer: "3,400",  Autumn: "10,400", Winter: "6,200"  } },
      { emoji: "🌿", name: "Beeshazar Lake Wetland",   category: "Wildlife",  district: "Chitwan",   colorKey: "green",  visitors: { All: "9,200",  Spring: "12,400", Summer: "4,600",  Autumn: "14,200", Winter: "9,800"  } },
      { emoji: "🏯", name: "Rani Mahal Palpa",         category: "Heritage",  district: "Palpa",     colorKey: "blue",   visitors: { All: "5,600",  Spring: "7,400",  Summer: "2,400",  Autumn: "8,800",  Winter: "5,200"  } },
      { emoji: "🛕", name: "Manakamana Temple",        category: "Spiritual", district: "Gorkha",    colorKey: "amber",  visitors: { All: "16,200", Spring: "22,400", Summer: "8,600",  Autumn: "24,800", Winter: "14,400" } },
    ],
    seasonal: {
      All:    { visitors: "98,200", activePlaces: 132, avgCost: "Rs 4,400", safeRoutes: "95%", highlight: "UNESCO pilgrimage site + top wildlife park", trendData: [{ period:"Jan–Feb",visitors:38 },{ period:"Mar–Apr",visitors:62 },{ period:"May–Jun",visitors:28 },{ period:"Jul–Aug",visitors:14 },{ period:"Sep–Oct",visitors:72 },{ period:"Nov–Dec",visitors:44 }] },
      Spring: { visitors: "128,400", activePlaces: 142, avgCost: "Rs 5,200", safeRoutes: "96%", highlight: "Buddha Jayanti — millions visit Lumbini", trendData: [{ period:"Jan–Feb",visitors:24 },{ period:"Mar–Apr",visitors:88 },{ period:"May–Jun",visitors:48 },{ period:"Jul–Aug",visitors:10 },{ period:"Sep–Oct",visitors:58 },{ period:"Nov–Dec",visitors:32 }] },
      Summer: { visitors: "44,200", activePlaces: 98,  avgCost: "Rs 3,200", safeRoutes: "88%", highlight: "Monsoon — Chitwan stays open with lush canopy", trendData: [{ period:"Jan–Feb",visitors:14 },{ period:"Mar–Apr",visitors:28 },{ period:"May–Jun",visitors:52 },{ period:"Jul–Aug",visitors:48 },{ period:"Sep–Oct",visitors:28 },{ period:"Nov–Dec",visitors:18 }] },
      Autumn: { visitors: "148,600", activePlaces: 152, avgCost: "Rs 5,800", safeRoutes: "97%", highlight: "Perfect Chitwan safari weather, low humidity", trendData: [{ period:"Jan–Feb",visitors:18 },{ period:"Mar–Apr",visitors:52 },{ period:"May–Jun",visitors:22 },{ period:"Jul–Aug",visitors:8 },{ period:"Sep–Oct",visitors:98 },{ period:"Nov–Dec",visitors:48 }] },
      Winter: { visitors: "82,400", activePlaces: 124, avgCost: "Rs 4,800", safeRoutes: "96%", highlight: "Best rhino & tiger sighting season in Chitwan", trendData: [{ period:"Jan–Feb",visitors:58 },{ period:"Mar–Apr",visitors:32 },{ period:"May–Jun",visitors:14 },{ period:"Jul–Aug",visitors:6 },{ period:"Sep–Oct",visitors:38 },{ period:"Nov–Dec",visitors:62 }] },
    },
  },
  {
    id: "karnali", number: 6, name: "Karnali", capital: "Birendranagar",
    color: "#6B3FA0", tagline: "Nepal's last wilderness frontier",
    places: [
      { emoji: "🏞", name: "Rara National Park",        category: "Nature",    district: "Mugu",     colorKey: "blue",   visitors: { All: "4,200", Spring: "6,800", Summer: "1,400", Autumn: "8,400", Winter: "2,200" } },
      { emoji: "🏔", name: "Dolpo Region",               category: "Adventure", district: "Dolpa",    colorKey: "orange", visitors: { All: "3,800", Spring: "5,600", Summer: "800",   Autumn: "7,200", Winter: "1,600" } },
      { emoji: "🌿", name: "Khaptad National Park",      category: "Wildlife",  district: "Achham",   colorKey: "green",  visitors: { All: "2,600", Spring: "4,200", Summer: "1,200", Autumn: "5,800", Winter: "1,400" } },
      { emoji: "🍎", name: "Jumla Apple Orchards",       category: "Nature",    district: "Jumla",    colorKey: "amber",  visitors: { All: "3,400", Spring: "4,800", Summer: "2,800", Autumn: "6,400", Winter: "1,800" } },
      { emoji: "💎", name: "Shey Crystal Mountain",      category: "Spiritual", district: "Dolpa",    colorKey: "blue",   visitors: { All: "1,800", Spring: "3,200", Summer: "600",   Autumn: "4,200", Winter: "800"   } },
      { emoji: "🏛", name: "Sinja Valley Ruins",         category: "History",   district: "Jumla",    colorKey: "orange", visitors: { All: "2,200", Spring: "3,600", Summer: "900",   Autumn: "4,800", Winter: "1,200" } },
      { emoji: "🌊", name: "Phoksundo Lake",              category: "Nature",    district: "Dolpa",    colorKey: "green",  visitors: { All: "2,800", Spring: "4,400", Summer: "800",   Autumn: "5,600", Winter: "1,000" } },
    ],
    seasonal: {
      All:    { visitors: "14,800", activePlaces: 52,  avgCost: "Rs 8,400", safeRoutes: "88%", highlight: "Nepal's most remote — for serious explorers", trendData: [{ period:"Jan–Feb",visitors:8 },{ period:"Mar–Apr",visitors:28 },{ period:"May–Jun",visitors:16 },{ period:"Jul–Aug",visitors:6 },{ period:"Sep–Oct",visitors:38 },{ period:"Nov–Dec",visitors:12 }] },
      Spring: { visitors: "22,400", activePlaces: 62,  avgCost: "Rs 9,200", safeRoutes: "91%", highlight: "Rara Lake snow melt — pristine alpine scenery", trendData: [{ period:"Jan–Feb",visitors:4 },{ period:"Mar–Apr",visitors:42 },{ period:"May–Jun",visitors:28 },{ period:"Jul–Aug",visitors:4 },{ period:"Sep–Oct",visitors:28 },{ period:"Nov–Dec",visitors:8 }] },
      Summer: { visitors: "8,200", activePlaces: 38,  avgCost: "Rs 6,800", safeRoutes: "82%", highlight: "High altitude means lighter monsoon impact", trendData: [{ period:"Jan–Feb",visitors:4 },{ period:"Mar–Apr",visitors:12 },{ period:"May–Jun",visitors:22 },{ period:"Jul–Aug",visitors:18 },{ period:"Sep–Oct",visitors:14 },{ period:"Nov–Dec",visitors:6 }] },
      Autumn: { visitors: "28,600", activePlaces: 68,  avgCost: "Rs 9,800", safeRoutes: "92%", highlight: "Jumla apples, Rara shimmering blue — peak beauty", trendData: [{ period:"Jan–Feb",visitors:4 },{ period:"Mar–Apr",visitors:18 },{ period:"May–Jun",visitors:8 },{ period:"Jul–Aug",visitors:4 },{ period:"Sep–Oct",visitors:54 },{ period:"Nov–Dec",visitors:18 }] },
      Winter: { visitors: "6,400", activePlaces: 32,  avgCost: "Rs 7,200", safeRoutes: "78%", highlight: "Snow-covered, for expedition-level adventurers", trendData: [{ period:"Jan–Feb",visitors:12 },{ period:"Mar–Apr",visitors:8 },{ period:"May–Jun",visitors:4 },{ period:"Jul–Aug",visitors:2 },{ period:"Sep–Oct",visitors:8 },{ period:"Nov–Dec",visitors:14 }] },
    },
  },
  {
    id: "sudurpashchim", number: 7, name: "Sudurpashchim", capital: "Dhangadhi",
    color: "#1A6B44", tagline: "Far-west Nepal, hidden gems",
    places: [
      { emoji: "🌺", name: "Badimalika Temple",          category: "Spiritual", district: "Bajura",      colorKey: "orange", visitors: { All: "6,200",  Spring: "9,400",  Summer: "2,200", Autumn: "11,200", Winter: "4,400"  } },
      { emoji: "🐆", name: "Shuklaphanta National Park", category: "Wildlife",  district: "Kanchanpur",  colorKey: "green",  visitors: { All: "8,800",  Spring: "11,200", Summer: "3,800", Autumn: "14,600", Winter: "10,400" } },
      { emoji: "⛰",  name: "Api Base Camp",              category: "Adventure", district: "Darchula",    colorKey: "blue",   visitors: { All: "3,200",  Spring: "5,800",  Summer: "800",   Autumn: "7,200",  Winter: "1,600"  } },
      { emoji: "🏛",  name: "Dewal Cultural Zone",        category: "History",   district: "Bajhang",     colorKey: "amber",  visitors: { All: "4,600",  Spring: "6,200",  Summer: "2,400", Autumn: "7,800",  Winter: "3,800"  } },
      { emoji: "🛕",  name: "Chandannath Temple",         category: "Spiritual", district: "Jumla",       colorKey: "orange", visitors: { All: "5,400",  Spring: "7,800",  Summer: "2,600", Autumn: "9,200",  Winter: "4,200"  } },
      { emoji: "🌊",  name: "Kailash Sacred Circuit",     category: "Spiritual", district: "Darchula",    colorKey: "green",  visitors: { All: "2,800",  Spring: "4,600",  Summer: "600",   Autumn: "5,800",  Winter: "1,200"  } },
      { emoji: "🌿",  name: "Khaptad Plateau Trek",       category: "Nature",    district: "Achham",      colorKey: "blue",   visitors: { All: "4,200",  Spring: "6,600",  Summer: "1,800", Autumn: "8,400",  Winter: "2,200"  } },
    ],
    seasonal: {
      All:    { visitors: "24,800", activePlaces: 68,  avgCost: "Rs 5,800", safeRoutes: "90%", highlight: "Untouched Terai, Swet Ganga river & Api peak", trendData: [{ period:"Jan–Feb",visitors:18 },{ period:"Mar–Apr",visitors:42 },{ period:"May–Jun",visitors:22 },{ period:"Jul–Aug",visitors:10 },{ period:"Sep–Oct",visitors:52 },{ period:"Nov–Dec",visitors:24 }] },
      Spring: { visitors: "36,400", activePlaces: 78,  avgCost: "Rs 6,400", safeRoutes: "92%", highlight: "Wildflower season in Khaptad plateau", trendData: [{ period:"Jan–Feb",visitors:12 },{ period:"Mar–Apr",visitors:62 },{ period:"May–Jun",visitors:34 },{ period:"Jul–Aug",visitors:6 },{ period:"Sep–Oct",visitors:42 },{ period:"Nov–Dec",visitors:18 }] },
      Summer: { visitors: "14,200", activePlaces: 52,  avgCost: "Rs 4,200", safeRoutes: "84%", highlight: "Rain shadow areas like Api region stay accessible", trendData: [{ period:"Jan–Feb",visitors:8 },{ period:"Mar–Apr",visitors:18 },{ period:"May–Jun",visitors:38 },{ period:"Jul–Aug",visitors:32 },{ period:"Sep–Oct",visitors:18 },{ period:"Nov–Dec",visitors:10 }] },
      Autumn: { visitors: "44,600", activePlaces: 84,  avgCost: "Rs 6,800", safeRoutes: "94%", highlight: "Shuklaphanta swamp deer — largest herd in Asia", trendData: [{ period:"Jan–Feb",visitors:10 },{ period:"Mar–Apr",visitors:32 },{ period:"May–Jun",visitors:14 },{ period:"Jul–Aug",visitors:6 },{ period:"Sep–Oct",visitors:72 },{ period:"Nov–Dec",visitors:28 }] },
      Winter: { visitors: "18,600", activePlaces: 62,  avgCost: "Rs 5,200", safeRoutes: "88%", highlight: "Terai wildlife thrives — great for jungle safaris", trendData: [{ period:"Jan–Feb",visitors:32 },{ period:"Mar–Apr",visitors:18 },{ period:"May–Jun",visitors:8 },{ period:"Jul–Aug",visitors:4 },{ period:"Sep–Oct",visitors:24 },{ period:"Nov–Dec",visitors:36 }] },
    },
  },
]

// ─── Nepal schematic map ──────────────────────────────────────────────────────

// Accurate Nepal province polygon boundaries
// Coordinate system: viewBox 0 0 520 200
// Derived from real geographic coords: x=(lon-80)*63.4, y=(30.5-lat)*47.6
const PROVINCE_REGIONS = [
  // Province 7 — Sudurpashchim (far west, full height, includes terai)
  { id: "sudurpashchim", points: "6,45 70,15 127,8 127,170 8,155" },
  // Province 6 — Karnali (large northwestern mountain province)
  { id: "karnali",       points: "127,8 220,0 220,115 127,115" },
  // Province 5 — Lumbini (south of Karnali+Gandaki, includes Chitwan & Lumbini terai)
  { id: "lumbini",       points: "127,115 220,115 316,125 316,190 127,170" },
  // Province 4 — Gandaki (Pokhara & Annapurna region mountains)
  { id: "gandaki",       points: "220,0 316,30 316,125 220,115" },
  // Province 3 — Bagmati (Kathmandu Valley center)
  { id: "bagmati",       points: "316,30 411,38 411,125 316,125" },
  // Province 2 — Madhesh (south Terai strip, Janakpur region)
  { id: "madhesh",       points: "316,125 411,125 464,125 464,190 316,190" },
  // Province 1 — Koshi (easternmost, Biratnagar, includes own terai)
  { id: "koshi",         points: "411,38 480,48 520,70 520,175 464,190 464,125 411,125" },
]

const PROVINCE_LABEL_POSITIONS = [
  { id: "sudurpashchim", x: 54,  y: 100, num: "7", name: "Sudurpashchim" },
  { id: "karnali",       x: 172, y: 58,  num: "6", name: "Karnali" },
  { id: "lumbini",       x: 215, y: 158, num: "5", name: "Lumbini" },
  { id: "gandaki",       x: 263, y: 68,  num: "4", name: "Gandaki" },
  { id: "bagmati",       x: 362, y: 78,  num: "3", name: "Bagmati" },
  { id: "madhesh",       x: 390, y: 158, num: "2", name: "Madhesh" },
  { id: "koshi",         x: 462, y: 88,  num: "1", name: "Koshi" },
]

const PROVINCE_PIN_CENTERS: Record<string, [number,number]> = {
  sudurpashchim: [48,  98],
  karnali:       [168, 56],
  lumbini:       [212, 152],
  gandaki:       [258, 66],
  bagmati:       [358, 76],
  madhesh:       [385, 155],
  koshi:         [456, 85],
}

function NepalMap({ selectedId, onSelect, t }: {
  selectedId: string
  onSelect: (id: string) => void
  t: Theme
}) {
  const [hovered, setHovered] = useState<string | null>(null)
  const province = PROVINCES.find(p => p.id === selectedId)!
  const isDark = t.pageBg === "#0E1018"

  const terrainFill  = isDark ? "#1a2218" : "#e8edd8"
  const teraiFill    = isDark ? "#1a2510" : "#d4e8c0"
  const riverColor   = isDark ? "#1e3a4a" : "#a8ccd8"
  const snowColor    = isDark ? "#2a3848" : "#dce8f0"
  const borderColor  = isDark ? "#0e1018" : "#ffffff"

  return (
    <svg viewBox="0 0 520 200" style={{ width: "100%", height: "100%" }}>
      <defs>
        {/* Gradient for the Himalayan north */}
        <linearGradient id="himalaya-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={snowColor} />
          <stop offset="40%" stopColor={terrainFill} />
          <stop offset="100%" stopColor={teraiFill} />
        </linearGradient>
      </defs>

      {/* Background */}
      <rect width="520" height="200" fill={t.pageBg} rx="8" />

      {/* Nepal outer silhouette (filled with terrain gradient) */}
      <polygon
        points="6,45 70,15 127,8 220,0 316,30 411,38 480,48 520,70 520,175 464,190 316,190 127,170 8,155"
        fill={`url(#himalaya-grad)`}
        opacity={isDark ? 0.5 : 0.4}
      />

      {/* Province polygons */}
      {PROVINCE_REGIONS.map((region) => {
        const prov = PROVINCES.find(p => p.id === region.id)!
        const isSelected = region.id === selectedId
        const isHovered  = !isSelected && region.id === hovered
        return (
          <polygon
            key={region.id}
            points={region.points}
            fill={isSelected ? prov.color : isHovered ? prov.color + "44" : "transparent"}
            stroke={borderColor}
            strokeWidth={isSelected ? 1.5 : 1}
            strokeLinejoin="round"
            style={{ cursor: "pointer", transition: "fill 0.18s" }}
            onClick={() => onSelect(region.id)}
            onMouseEnter={() => setHovered(region.id)}
            onMouseLeave={() => setHovered(null)}
          />
        )
      })}

      {/* Internal province boundaries */}
      {[
        "127,8 127,170",             // P7 | P6,P5
        "127,115 220,115",           // P6 | P5 (south of Karnali)
        "220,0 220,115",             // P6 | P4
        "220,115 316,125",           // P4 | P5 (diagonal)
        "316,30 316,125",            // P4 | P3
        "316,125 316,190",           // P5 | P2
        "316,125 411,125",           // P3 | P2
        "411,38 411,125",            // P3 | P1
        "411,125 464,125",           // P2 | P1 (upper)
        "464,125 464,190",           // P2 | P1 (lower)
      ].map((pts, i) => (
        <line
          key={`border-${i}`}
          x1={+pts.split(" ")[0].split(",")[0]} y1={+pts.split(" ")[0].split(",")[1]}
          x2={+pts.split(" ")[1].split(",")[0]} y2={+pts.split(" ")[1].split(",")[1]}
          stroke={borderColor} strokeWidth="0.8" opacity={0.6}
        />
      ))}

      {/* Nepal outer border */}
      <polygon
        points="6,45 70,15 127,8 220,0 316,30 411,38 480,48 520,70 520,175 464,190 316,190 127,170 8,155"
        fill="none"
        stroke={isDark ? "#3a4a38" : "#8aaa6a"}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* Major rivers (Karnali, Narayani/Gandaki, Koshi) */}
      <path d="M 127,60 Q 128,100 125,140 Q 122,165 120,190" fill="none" stroke={riverColor} strokeWidth="1.2" opacity={0.6} />
      <path d="M 280,70 Q 278,110 275,145 Q 272,170 270,190" fill="none" stroke={riverColor} strokeWidth="1.2" opacity={0.6} />
      <path d="M 452,65 Q 450,105 448,140 Q 446,165 444,190" fill="none" stroke={riverColor} strokeWidth="1" opacity={0.5} />

      {/* Mountain peaks (Himalayan ridge) — small triangles */}
      {[
        [80, 14], [130, 7], [175, 4], [220, 0], [250, 8], [290, 22],
        [316, 29], [360, 30], [410, 36], [445, 38], [480, 46],
      ].map(([x, y], i) => (
        <polygon key={`peak-${i}`}
          points={`${x},${y} ${x-4},${y+8} ${x+4},${y+8}`}
          fill={isDark ? "#2a3848" : "#ccd8e0"}
          opacity={0.7}
        />
      ))}

      {/* Kathmandu valley marker */}
      <ellipse cx={358} cy={86} rx={18} ry={12} fill={isDark ? "#1a2510" : "#c8d8a8"} opacity={0.4} />

      {/* Province labels */}
      {PROVINCE_LABEL_POSITIONS.map((item) => {
        const prov = PROVINCES.find(p => p.id === item.id)!
        const isSelected = item.id === selectedId
        return (
          <g
            key={item.id}
            onClick={() => onSelect(item.id)}
            style={{ cursor: "pointer", userSelect: "none" }}
          >
            <text
              x={item.x} y={item.y - 4}
              textAnchor="middle"
              fontSize={isSelected ? 12 : 10}
              fontWeight={isSelected ? "700" : "600"}
              fill={isSelected ? "#ffffff" : isDark ? "#6a7a88" : "#6b7280"}
              fontFamily="Inter, sans-serif"
            >
              P{item.num}
            </text>
            <text
              x={item.x} y={item.y + 7}
              textAnchor="middle"
              fontSize={isSelected ? 7.5 : 6.5}
              fontWeight={isSelected ? "600" : "400"}
              fill={isSelected ? "rgba(255,255,255,0.8)" : isDark ? "#4a5a68" : "#9ca3af"}
              fontFamily="Inter, sans-serif"
            >
              {item.name}
            </text>
          </g>
        )
      })}

      {/* Site pins for selected province */}
      {province.places.slice(0, 4).map((place, i) => {
        const [cx, cy] = PROVINCE_PIN_CENTERS[selectedId] ?? [260, 90]
        const offsets: [number,number][] = [[-14,-12],[12,-8],[16,10],[-12,12]]
        const [ox, oy] = offsets[i]
        const px = cx + ox
        const py = cy + oy
        const pinColors = [t.blue, t.orange, t.green, t.amber]
        const pc = pinColors[i]
        return (
          <g key={`pin-${place.name}`}>
            <circle cx={px} cy={py} r={8}  fill={pc} opacity={0.15} />
            <circle cx={px} cy={py} r={5}  fill={pc} />
            <circle cx={px} cy={py} r={2}  fill="white" />
          </g>
        )
      })}

      {/* Compass rose */}
      <g transform="translate(498,18)">
        <circle cx={0} cy={0} r={9} fill={t.surface} opacity={0.8} />
        <polygon points="0,-8 -3,0 3,0" fill={t.blue} />
        <polygon points="0,8 -3,0 3,0" fill={t.textFaint} opacity={0.5} />
        <text x={0} y={-11} textAnchor="middle" fontSize={7} fontWeight="700" fill={t.blue} fontFamily="Inter, sans-serif">N</text>
      </g>

      {/* Scale bar */}
      <g transform="translate(12,187)">
        <line x1={0} y1={0} x2={63} y2={0} stroke={t.textFaint} strokeWidth="1" />
        <line x1={0} y1={-3} x2={0} y2={3} stroke={t.textFaint} strokeWidth="1" />
        <line x1={63} y1={-3} x2={63} y2={3} stroke={t.textFaint} strokeWidth="1" />
        <text x={31} y={-4} textAnchor="middle" fontSize={7} fill={t.textFaint} fontFamily="Inter, sans-serif">100 km</text>
      </g>
    </svg>
  )
}

// ─── Pages ────────────────────────────────────────────────────────────────────

function DashboardPage() {
  const { t } = useT()
  const [season, setSeason] = useState<Season>("Spring")
  const [provinceId, setProvinceId] = useState("bagmati")
  const [showAllPlaces, setShowAllPlaces] = useState(false)

  const province = PROVINCES.find(p => p.id === provinceId)!
  const sd = province.seasonal[season]
  const colorKeys = ["blue", "orange", "green", "amber"] as const
  const pinColors = [t.blue, t.orange, t.green, t.amber]

  // Reset "show all" whenever province changes
  const handleProvinceChange = (id: string) => { setProvinceId(id); setShowAllPlaces(false) }

  return (
    <div style={{ padding: "0 0 28px", maxWidth: 1140 }}>

      {/* ── Hero banner ── */}
      <div style={{ position: "relative", overflow: "hidden", marginBottom: 28, minHeight: 220 }}>
        {/* Mountain photograph background */}
        <img
          src="https://images.unsplash.com/photo-1776794693381-19b0dac1b34d?w=1400&h=420&fit=crop&auto=format&q=80"
          alt="Himalayan mountains, Nepal"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 40%" }}
        />

        {/* Layered dark overlays for legibility */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(8,28,52,0.88) 0%, rgba(8,28,52,0.65) 55%, rgba(8,28,52,0.25) 100%)" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(0deg, rgba(0,0,0,0.45) 0%, transparent 60%)" }} />

        {/* Content */}
        <div style={{ position: "relative", zIndex: 1, padding: "36px 32px 32px" }}>
          {/* Badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 20, padding: "4px 12px", marginBottom: 14, backdropFilter: "blur(4px)" }}>
            <span style={{ fontSize: 12 }}>🏔</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.9)", letterSpacing: "0.05em" }}>
              Ministry of Tourism · Bagmati Province · Nepal
            </span>
          </div>

          {/* Title */}
          <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 8 }}>
            <h1 style={{
              fontSize: 52, fontWeight: 800, color: "#ffffff", margin: 0, lineHeight: 1,
              letterSpacing: "-0.03em",
              textShadow: "0 2px 24px rgba(0,0,0,0.5)",
            }}>
              Gantabya
            </h1>
            <span style={{ fontSize: 20, fontWeight: 300, color: "rgba(255,255,255,0.5)", letterSpacing: "0.04em" }}>
              गन्तव्य
            </span>
          </div>

          {/* Subtitle */}
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.72)", margin: "0 0 22px", fontWeight: 400, maxWidth: 440, lineHeight: 1.6, textShadow: "0 1px 8px rgba(0,0,0,0.4)" }}>
            Official tourism intelligence platform for Nepal's seven provinces — discover, plan, and navigate your journey.
          </p>

          {/* Quick stats */}
          <div style={{ display: "flex", gap: 28 }}>
            {[
              { value: "7", label: "Provinces" },
              { value: "124+", label: "Destinations" },
              { value: "4.8M", label: "Annual visitors" },
              { value: "7", label: "UNESCO sites" },
            ].map((item, i) => (
              <div key={item.label} style={{ display: "flex", flexDirection: "column", gap: 2, paddingRight: 28, borderRight: i < 3 ? "1px solid rgba(255,255,255,0.15)" : "none" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#ffffff", lineHeight: 1, textShadow: "0 1px 8px rgba(0,0,0,0.4)" }}>{item.value}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: "0 32px" }}>

      {/* ── Province selector ── */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: t.textFaint, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
          Select province
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {PROVINCES.map((prov) => {
            const active = prov.id === provinceId
            return (
              <button
                key={prov.id}
                onClick={() => handleProvinceChange(prov.id)}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "flex-start",
                  padding: "8px 14px", borderRadius: 10, border: `${active ? "1.5px" : "0.5px"} solid ${active ? prov.color : t.border}`,
                  background: active ? prov.color : t.surface,
                  cursor: "pointer", transition: "all 0.15s", minWidth: 108,
                }}
                onMouseEnter={(e) => { if (!active) { e.currentTarget.style.borderColor = prov.color; e.currentTarget.style.background = prov.color + "10" } }}
                onMouseLeave={(e) => { if (!active) { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.background = t.surface } }}
              >
                <div style={{ fontSize: 10, fontWeight: 600, color: active ? "rgba(255,255,255,0.7)" : t.textFaint, marginBottom: 1 }}>
                  Province {prov.number}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: active ? "#ffffff" : t.text }}>
                  {prov.name}
                </div>
                <div style={{ fontSize: 10, color: active ? "rgba(255,255,255,0.65)" : t.textSub, marginTop: 1 }}>
                  {prov.capital}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: t.text, margin: 0 }}>
            Discover {province.name} Province
          </h1>
          <p style={{ fontSize: 13, color: t.textSub, margin: "4px 0 0" }}>
            {province.tagline} · Capital: {province.capital}
          </p>
          <div style={{ marginTop: 6, display: "inline-block", background: sd.highlight.length > 0 ? t.blueLight : "transparent", borderRadius: 6, padding: "3px 10px" }}>
            <span style={{ fontSize: 11, color: t.blue }}>✦ {sd.highlight}</span>
          </div>
        </div>
        {/* Season pills */}
        <div style={{ display: "flex", gap: 4, background: t.surface, border: `0.5px solid ${t.border}`, borderRadius: 10, padding: 4, flexShrink: 0 }}>
          {(["All", "Spring", "Summer", "Autumn", "Winter"] as Season[]).map((s) => (
            <button key={s} onClick={() => setSeason(s)} style={{
              padding: "5px 14px", borderRadius: 7, border: "none", fontSize: 12,
              fontWeight: 500, cursor: "pointer", transition: "all 0.15s",
              background: season === s ? t.blue : "transparent",
              color: season === s ? "#ffffff" : t.textSub,
            }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* ── Metrics ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 22 }}>
        <MetricCard label="Visitors this season" value={sd.visitors} sub={`${season === "All" ? "Annual" : season} season total`} icon={<Users size={18} />} iconColor={t.blue} iconBg={t.blueLight} />
        <MetricCard label="Active places" value={String(sd.activePlaces)} sub="Open to visitors" icon={<Building2 size={18} />} iconColor={t.orange} iconBg={t.orangeLight} />
        <MetricCard label="Avg trip cost" value={sd.avgCost} sub="Per person · 3 days" icon={<Wallet size={18} />} iconColor={t.amber} iconBg={t.amberLight} />
        <MetricCard label="Safe routes" value={sd.safeRoutes} sub="Real-time status" icon={<ShieldCheck size={18} />} iconColor={t.green} iconBg={t.greenLight} />
      </div>

      {/* ── Top places (full width, 5 shown / expand all) ── */}
      {(() => {
        const LIMIT = 5
        const visiblePlaces = showAllPlaces ? province.places : province.places.slice(0, LIMIT)
        const hasMore = province.places.length > LIMIT

        return (
          <div style={{ marginBottom: 16 }}>
            <Card style={{ padding: 0 }}>
              <div style={{ padding: "14px 20px 0" }}>
                <CardTitle right={
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 11, color: t.textFaint }}>{season} season</span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: t.blue, background: t.blueLight, borderRadius: 12, padding: "2px 8px" }}>
                      {province.places.length} sites
                    </span>
                  </div>
                }>
                  Top places this season
                </CardTitle>
              </div>

              {visiblePlaces.map((place, i) => {
                const color = t[colorKeys[i % colorKeys.length]]
                return (
                  <div key={place.name} style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "12px 20px",
                    borderBottom: i < visiblePlaces.length - 1 ? `0.5px solid ${t.border}` : "none",
                    cursor: "pointer", transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = t.subtle)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: color + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color }}>
                      {i + 1}
                    </div>
                    <div style={{ fontSize: 20 }}>{place.emoji}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{place.name}</div>
                      <div style={{ fontSize: 11, color: t.textSub, marginTop: 1 }}>{place.category} · {place.district}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{place.visitors[season]}</div>
                      <div style={{ fontSize: 10, color: t.textFaint }}>visitors</div>
                    </div>
                  </div>
                )
              })}

              {hasMore && (
                <div style={{ padding: "10px 20px 14px" }}>
                  <button
                    onClick={() => setShowAllPlaces(v => !v)}
                    style={{
                      width: "100%", padding: "9px 0", borderRadius: 8,
                      border: `0.5px solid ${showAllPlaces ? t.blue : t.border}`,
                      background: showAllPlaces ? t.blueLight : "transparent",
                      fontSize: 12, fontWeight: 600,
                      color: showAllPlaces ? t.blue : t.textSub,
                      cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                      transition: "all 0.15s",
                    }}
                  >
                    {showAllPlaces
                      ? <>Show top 5 only ↑</>
                      : <>View all {province.places.length} places in {province.name} <ChevronRight size={13} /></>
                    }
                  </button>
                </div>
              )}
            </Card>
          </div>
        )
      })()}

      {/* ── Seasonal trends ── */}
      <Card style={{ padding: 0 }}>
        <div style={{ padding: "14px 20px 0" }}>
          <CardTitle right={<span style={{ fontSize: 11, color: t.textFaint }}>{province.name} Province · in thousands</span>}>
            Seasonal visitor trends
          </CardTitle>
        </div>
        <div style={{ padding: "4px 20px 18px" }}>
          <SeasonalChart data={sd.trendData} t={t} />
        </div>
        {/* Season comparison mini-row */}
        <div style={{ padding: "0 20px 18px", display: "flex", gap: 8 }}>
          {(["Spring", "Summer", "Autumn", "Winter"] as Season[]).map((s) => {
            const sData = province.seasonal[s]
            const isActive = season === s
            return (
              <button
                key={s}
                onClick={() => setSeason(s)}
                style={{
                  flex: 1, padding: "10px 8px", borderRadius: 9,
                  border: `0.5px solid ${isActive ? t.blue : t.border}`,
                  background: isActive ? t.blueLight : t.pageBg,
                  cursor: "pointer", transition: "all 0.15s", textAlign: "left",
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 600, color: isActive ? t.blue : t.textMid, marginBottom: 2 }}>{s}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: isActive ? t.blue : t.text }}>{sData.visitors}</div>
                <div style={{ fontSize: 9, color: isActive ? t.blue : t.textFaint, opacity: 0.8, marginTop: 1 }}>visitors</div>
              </button>
            )
          })}
        </div>
      </Card>
      </div> {/* end inner padding div */}
    </div>
  )
}


// ─── Google Maps (div-based, no package — uses JS API script tag directly) ────
// Uses Maps JavaScript API + Directions API which are already enabled on the key.
// No Maps Embed API needed. No @react-google-maps/api package needed.

const GMAPS_KEY = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY
  ?? "AIzaSyBon9SXL1pdywRvUfotSBsVMUEoPveSg98"

// Load the Maps JS script once and call registered callbacks when ready
const _gmapsQueue: (() => void)[] = []

function loadGMaps(cb: () => void) {
  // Already loaded — call immediately
  if ((window as any).google?.maps) { cb(); return }

  // Queue for when it finishes loading
  _gmapsQueue.push(cb)

  // Script already injected — don't add a second one
  if (document.getElementById("gantabya-gmaps")) return

  ;(window as any).__gmaps_init = () => {
    _gmapsQueue.splice(0).forEach(fn => fn())
  }

  const s = document.createElement("script")
  s.id    = "gantabya-gmaps"
  s.async = true
  s.src   = `https://maps.googleapis.com/maps/api/js?key=${GMAPS_KEY}&libraries=places&callback=__gmaps_init&loading=async`
  s.onerror = () => console.error("[Gantabya] Google Maps script failed to load")
  document.head.appendChild(s)
}

const LIGHT_STYLES = [
  { elementType: "geometry",            stylers: [{ color: "#f2f5f9" }] },
  { featureType: "water",               elementType: "geometry", stylers: [{ color: "#cde0ed" }] },
  { featureType: "road",                elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.highway",        elementType: "geometry", stylers: [{ color: "#e2e8f0" }] },
  { featureType: "poi",                 stylers: [{ visibility: "simplified" }] },
  { featureType: "poi.park",            elementType: "geometry", stylers: [{ color: "#dde8d4" }] },
  { elementType: "labels.text.fill",   stylers: [{ color: "#6b7280" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f2f5f9" }] },
]

const DARK_STYLES = [
  { elementType: "geometry",            stylers: [{ color: "#1c1f2e" }] },
  { featureType: "water",               elementType: "geometry", stylers: [{ color: "#162640" }] },
  { featureType: "road",                elementType: "geometry", stylers: [{ color: "#2a2d42" }] },
  { featureType: "road.highway",        elementType: "geometry", stylers: [{ color: "#344060" }] },
  { featureType: "poi",                 stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill",   stylers: [{ color: "#7e8baa" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1c1f2e" }] },
]

function NoKeyPlaceholder({ t }: { t: Theme }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, background: t.subtle, borderRadius: 8 }}>
      <div style={{ fontSize: 28 }}>🗺</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: t.textMid }}>Google Maps API key missing</div>
      <div style={{ fontSize: 10, color: t.textSub, fontFamily: "monospace", background: t.surface, padding: "4px 12px", borderRadius: 6 }}>VITE_GOOGLE_MAPS_API_KEY=your_key</div>
    </div>
  )
}

// ── RouteMap — renders a live Google Map in a div (no library package) ────────

interface RouteInfo { distance: string; duration: string }
interface RouteAlternative { index: number; distance: string; duration: string; summary: string }

function RouteMap({ origin, waypoints, viaPoints = [], destination, travelMode, isDark, t, onInfo, onRoutes, selectedRouteIndex = 0 }: {
  origin: string; waypoints: string[]; viaPoints?: string[]; destination: string
  travelMode: string; isDark?: boolean; t: Theme
  onInfo?: (info: RouteInfo) => void
  onRoutes?: (routes: RouteAlternative[]) => void
  selectedRouteIndex?: number
}) {
  const divRef        = useRef<HTMLDivElement>(null)
  const mapObj        = useRef<any>(null)
  const renderersRef  = useRef<any[]>([])
  const [zeroResults, setZeroResults] = useState(false)

  const clearRenderers = () => {
    renderersRef.current.forEach(r => { try { r.setMap(null) } catch {} })
    renderersRef.current = []
  }

  // Update polyline styles instantly when user switches routes (no re-fetch)
  useEffect(() => {
    renderersRef.current.forEach((r, i) => {
      const sel = i === selectedRouteIndex
      try { r.setOptions({ polylineOptions: { strokeColor: sel ? "#185FA5" : "#94A3B8", strokeWeight: sel ? 4 : 2, strokeOpacity: sel ? 0.9 : 0.35 }, suppressMarkers: !sel }) } catch {}
    })
  }, [selectedRouteIndex])

  useEffect(() => {
    if (!GMAPS_KEY || !divRef.current) return
    let cancelled = false

    setZeroResults(false)
    loadGMaps(() => {
      if (cancelled || !divRef.current) return
      const g = (window as any).google.maps

      if (!mapObj.current) {
        mapObj.current = new g.Map(divRef.current, {
          zoom: 9, center: { lat: 27.7172, lng: 85.324 },
          styles: isDark ? DARK_STYLES : LIGHT_STYLES,
          disableDefaultUI: true, zoomControl: true, fullscreenControl: true,
        })
        g.event.trigger(mapObj.current, "resize")
      }

      const addNepal = (s: string) => s.toLowerCase().includes("nepal") ? s : `${s}, Nepal`
      const modeMap: Record<string, string> = { driving: "DRIVING", walking: "WALKING", transit: "TRANSIT" }

      new g.DirectionsService().route({
        origin:      addNepal(origin),
        destination: addNepal(destination),
        waypoints: [
          ...waypoints.filter(Boolean).map((w: string) => ({ location: addNepal(w), stopover: true })),
          ...viaPoints.filter(Boolean).map((w: string) => ({ location: addNepal(w), stopover: false })),
        ],
        travelMode:  g.TravelMode[modeMap[travelMode] ?? "DRIVING"],
        region:      "NP",
        provideRouteAlternatives: true,
        optimizeWaypoints: false,
      }, (result: any, status: string) => {
        if (cancelled) return
        if (status !== "OK") {
          if (status === "ZERO_RESULTS") setZeroResults(true)
          return
        }
        setZeroResults(false)

        clearRenderers()
        const routes: any[] = result.routes ?? []

        renderersRef.current = routes.map((_, i: number) => {
          const sel = i === selectedRouteIndex
          const r = new g.DirectionsRenderer({
            directions: result, routeIndex: i,
            polylineOptions: { strokeColor: sel ? "#185FA5" : "#94A3B8", strokeWeight: sel ? 4 : 2, strokeOpacity: sel ? 0.9 : 0.35 },
            suppressMarkers: !sel,
          })
          r.setMap(mapObj.current)
          return r
        })

        const alternatives: RouteAlternative[] = routes.map((route: any, i: number) => {
          const legs: any[] = route.legs ?? []
          const dist = legs.reduce((s: number, l: any) => s + (l.distance?.value ?? 0), 0)
          const dur  = legs.reduce((s: number, l: any) => s + (l.duration?.value ?? 0), 0)
          return { index: i, distance: `${(dist/1000).toFixed(1)} km`, duration: `${Math.floor(dur/3600)}h ${Math.floor((dur%3600)/60)}m`, summary: route.summary || `Route ${i+1}` }
        })
        onRoutes?.(alternatives)
        if (alternatives[selectedRouteIndex]) onInfo?.(alternatives[selectedRouteIndex])
      })
    })

    return () => { cancelled = true }
  }, [origin, destination, travelMode, waypoints.join(","), viaPoints.join(","), isDark])

  if (!GMAPS_KEY) return <NoKeyPlaceholder t={t} />
  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={divRef} style={{ width: "100%", height: "100%", borderRadius: 8 }} />
      {zeroResults && (
        <div style={{
          position: "absolute", inset: 0, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 10,
          background: "rgba(255,255,255,0.88)", backdropFilter: "blur(6px)", borderRadius: 8,
        }}>
          <div style={{ fontSize: 28 }}>📍</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Route not found</div>
          <div style={{ fontSize: 11, color: "#6B7280", textAlign: "center", maxWidth: 240, lineHeight: 1.5 }}>
            Google Maps couldn't calculate a road route to <strong>{destination.replace(", Nepal", "")}</strong>.
            This may be a remote trek or pedestrian-only destination.
          </div>
          <button
            onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=walking`, "_blank")}
            style={{ padding: "7px 16px", borderRadius: 8, border: "none", background: "#185FA5", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
          >
            Try on Google Maps →
          </button>
        </div>
      )}
    </div>
  )
}

// ── ItineraryMap — day activities rendered as a route on a live Google Map ────

function ItineraryMap({ dest, itinerary, activeDay, from, isDark, t }: {
  dest: Destination; itinerary: DayPlan[]; activeDay: number
  from: string; isDark?: boolean; t: Theme
}) {
  const day  = itinerary[activeDay]
  const acts = (day?.activities ?? []).filter(a => !["🚌","🏠","🏨","🍽","🍜","🍱"].includes(a.icon))
  const waypoints = acts.slice(0, 7).map(a => a.title)

  if (!GMAPS_KEY) return <NoKeyPlaceholder t={t} />
  return (
    <RouteMap
      origin={from}
      waypoints={waypoints}
      destination={`${dest.name}, ${dest.district}`}
      travelMode="driving"
      isDark={isDark}
      t={t}
    />
  )
}

function PathfinderPage() {
  const { t, isDark } = useT()

  const [origin,      setOrigin]      = useState("")
  const [destination, setDestination] = useState("")
  const [stops,       setStops]       = useState<string[]>([])
  const [travelMode,  setTravelMode]  = useState("driving")
  const [routeKey,    setRouteKey]    = useState(0)   // increment to trigger map refresh
  const [routeInfo,   setRouteInfo]   = useState<RouteInfo>({ distance: "—", duration: "—" })
  const [routeAlts,   setRouteAlts]   = useState<RouteAlternative[]>([])
  const [selectedRoute, setSelectedRoute] = useState(0)

  const addStop    = () => setStops(s => [...s, ""])
  const removeStop = (i: number) => setStops(s => s.filter((_, idx) => idx !== i))
  const updateStop = (i: number, v: string) => setStops(s => s.map((x, idx) => idx === i ? v : x))

  const canSearch = origin.trim().length > 0 && destination.trim().length > 0

  const mapsUrl = `https://www.google.com/maps/dir/?api=1` +
    `&origin=${encodeURIComponent(origin.trim() || "Kathmandu, Nepal")}` +
    `&destination=${encodeURIComponent(destination.trim() || "Nepal")}` +
    (stops.filter(Boolean).length ? `&waypoints=${stops.filter(Boolean).map(s => encodeURIComponent(s)).join("|")}` : "") +
    `&travelmode=${travelMode}`

  const inp: React.CSSProperties = {
    width: "100%", height: 36, border: `0.5px solid ${t.border}`, borderRadius: 8,
    padding: "0 10px 0 28px", fontSize: 13, color: t.text,
    background: t.subtle, outline: "none", boxSizing: "border-box",
  }

  return (
    <div style={{ display: "flex", height: "100%", minHeight: "100vh" }}>

      {/* ── Left panel: route builder ─────────────────────────────────────── */}
      <div style={{
        width: 340, minWidth: 340, background: t.surface,
        borderRight: `0.5px solid ${t.border}`,
        display: "flex", flexDirection: "column", overflowY: "auto",
      }}>
        {/* Header */}
        <div style={{ padding: "20px 18px 14px", borderBottom: `0.5px solid ${t.border}` }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: t.text, margin: "0 0 3px" }}>Pathfinder</h1>
          <p style={{ fontSize: 11, color: t.textSub, margin: 0 }}>Live Google Maps route with alternate paths</p>
        </div>

        {/* Route builder */}
        <div style={{ padding: "14px 18px", borderBottom: `0.5px solid ${t.border}`, display: "flex", flexDirection: "column", gap: 8 }}>
          {/* Origin */}
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", width: 10, height: 10, borderRadius: "50%", background: t.blue, border: `2px solid ${t.surface}`, boxShadow: `0 0 0 2px ${t.blue}`, zIndex: 1 }} />
            <input value={origin} onChange={e => setOrigin(e.target.value)} placeholder="Starting point" style={inp} />
          </div>

          {/* Connector line */}
          {(stops.length > 0 || true) && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 0 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 19, flexShrink: 0, paddingTop: 2 }}>
                <div style={{ width: 1, flex: 1, background: t.border, minHeight: stops.length * 46 + 8 }} />
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                {/* Dynamic stops */}
                {stops.map((stop, i) => (
                  <div key={`stop-${i}`} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: t.green, border: `1.5px solid ${t.surface}`, boxShadow: `0 0 0 1.5px ${t.green}`, flexShrink: 0 }} />
                    <div style={{ position: "relative", flex: 1 }}>
                      <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", fontSize: 9, fontWeight: 700, color: t.green }}>{i+1}</span>
                      <input value={stop} onChange={e => updateStop(i, e.target.value)} placeholder={`Stop ${i+1}`} style={{ ...inp, padding: "0 8px 0 22px", height: 32, fontSize: 12 }} />
                    </div>
                    <button onClick={() => removeStop(i)} style={{ width: 24, height: 24, borderRadius: 6, border: `0.5px solid ${t.border}`, background: t.surface, color: t.textFaint, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>×</button>
                  </div>
                ))}
                {/* Add stop */}
                <button onClick={addStop} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", borderRadius: 6, border: `0.5px dashed ${t.border}`, background: "transparent", color: t.textSub, fontSize: 10, fontWeight: 500, cursor: "pointer", alignSelf: "flex-start" }}>
                  <span>+</span> Add stop
                </button>
              </div>
            </div>
          )}

          {/* Destination */}
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", width: 10, height: 10, borderRadius: "50%", background: t.orange, border: `2px solid ${t.surface}`, boxShadow: `0 0 0 2px ${t.orange}`, zIndex: 1 }} />
            <input value={destination} onChange={e => setDestination(e.target.value)} placeholder="Destination" style={inp} />
          </div>
        </div>

        {/* Mode + Find */}
        <div style={{ padding: "12px 18px", borderBottom: `0.5px solid ${t.border}` }}>
          <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
            {[{ v: "driving", e: "🚗", l: "Drive" }, { v: "walking", e: "🚶", l: "Walk" }, { v: "transit", e: "🚌", l: "Transit" }].map(m => (
              <button key={m.v} onClick={() => setTravelMode(m.v)} style={{
                flex: 1, padding: "5px 0", borderRadius: 7, border: `0.5px solid ${travelMode === m.v ? t.blue : t.border}`,
                background: travelMode === m.v ? t.blueLight : t.surface, color: travelMode === m.v ? t.blue : t.textSub,
                fontSize: 11, fontWeight: travelMode === m.v ? 600 : 400, cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
              }}>
                <span style={{ fontSize: 16 }}>{m.e}</span>
                <span style={{ fontSize: 9 }}>{m.l}</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => { if (canSearch) { setRouteKey(k => k + 1); setRouteInfo({ distance: "—", duration: "—" }); setRouteAlts([]); setSelectedRoute(0) } }}
            disabled={!canSearch}
            style={{
              width: "100%", height: 38, borderRadius: 9, border: "none",
              background: canSearch ? t.blue : t.subtle, color: canSearch ? "#fff" : t.textFaint,
              fontSize: 13, fontWeight: 600, cursor: canSearch ? "pointer" : "default", transition: "all 0.15s",
            }}
          >
            Find routes
          </button>
        </div>

        {/* Route alternatives */}
        {routeAlts.length > 1 && (
          <div style={{ padding: "12px 18px", borderBottom: `0.5px solid ${t.border}` }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: t.textFaint, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
              {routeAlts.length} paths found
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {routeAlts.map((alt, i) => (
                <button key={`alt-${i}`} onClick={() => { setSelectedRoute(i); setRouteInfo(alt) }} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "8px 12px", borderRadius: 9, cursor: "pointer", transition: "all 0.12s",
                  border: `${selectedRoute === i ? "1.5px" : "0.5px"} solid ${selectedRoute === i ? t.blue : t.border}`,
                  background: selectedRoute === i ? t.blueLight : t.pageBg, textAlign: "left",
                }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: selectedRoute === i ? t.blue : t.textMid }}>
                      {i === 0 ? "⚡ Fastest" : i === 1 ? "↻ Alternate" : `Route ${i + 1}`}
                      {alt.summary ? ` · ${alt.summary}` : ""}
                    </div>
                    <div style={{ fontSize: 10, color: selectedRoute === i ? t.blue : t.textFaint, marginTop: 2 }}>
                      {alt.distance} · {alt.duration}
                    </div>
                  </div>
                  {selectedRoute === i && <div style={{ width: 6, height: 6, borderRadius: "50%", background: t.blue }} />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Route info */}
        <div style={{ padding: "12px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { icon: <Route size={15} />, label: "Distance", value: routeInfo.distance, color: t.blue },
            { icon: <Clock size={15} />, label: "Travel time", value: routeInfo.duration, color: t.amber },
            { icon: <ShieldCheck size={15} />, label: "Road condition", value: "Good", color: t.green },
          ].map((item) => (
            <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, background: t.pageBg, border: `0.5px solid ${t.border}` }}>
              <div style={{ color: item.color, flexShrink: 0 }}>{item.icon}</div>
              <div style={{ fontSize: 11, color: t.textSub }}>{item.label}</div>
              <div style={{ marginLeft: "auto", fontSize: 13, fontWeight: 700, color: item.color }}>{item.value}</div>
            </div>
          ))}
        </div>

        {/* Stops list */}
        {(origin || destination) && (
          <div style={{ padding: "0 18px 18px" }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: t.textFaint, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Route stops</div>
            {[
              { pin: t.blue, name: origin || "—", type: "Start" },
              ...stops.filter(Boolean).map((s, i) => ({ pin: t.green, name: s, type: `Stop ${i+1}` })),
              { pin: t.orange, name: destination || "—", type: "End" },
            ].map((wp, i, arr) => (
              <div key={`wp-${i}`} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: i < arr.length - 1 ? `0.5px solid ${t.border}` : "none" }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: wp.pin, flexShrink: 0 }} />
                <div style={{ flex: 1, fontSize: 12, color: t.text, fontWeight: 500 }}>{wp.name}</div>
                <span style={{ fontSize: 9, color: t.textFaint }}>{wp.type}</span>
                <button onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(wp.name + " Nepal")}`, "_blank")} style={{ fontSize: 9, color: t.blue, background: t.blueLight, border: "none", borderRadius: 4, padding: "2px 7px", cursor: "pointer" }}>↗</button>
              </div>
            ))}
          </div>
        )}

        {/* Open in Google Maps */}
        <div style={{ padding: "12px 18px", marginTop: "auto", borderTop: `0.5px solid ${t.border}` }}>
          <button onClick={() => window.open(mapsUrl, "_blank")} style={{
            width: "100%", padding: "9px 0", borderRadius: 9, border: `0.5px solid ${t.blue}`,
            background: t.blueLight, color: t.blue, fontSize: 12, fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}>
            🗺 Open full route in Google Maps
          </button>
        </div>
      </div>

      {/* ── Right panel: live Google Map (always visible) ─────────────────── */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {/* Map header bar */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 10, background: t.surface, borderBottom: `0.5px solid ${t.border}`, padding: "10px 16px", display: "flex", alignItems: "center", gap: 8 }}>
          <Badge color={t.green} bg={t.greenLight}>Google Maps · Live</Badge>
          {canSearch
            ? <span style={{ fontSize: 11, color: t.textSub }}>{origin} → {stops.filter(Boolean).join(" → ")}{stops.filter(Boolean).length ? " → " : ""}{destination}</span>
            : <span style={{ fontSize: 11, color: t.textFaint }}>Enter origin & destination then click Find routes</span>
          }
          {routeAlts.length > 1 && (
            <span style={{ marginLeft: "auto", fontSize: 10, color: t.blue, fontWeight: 600 }}>{routeAlts.length} routes found</span>
          )}
        </div>

        {/* The live map — fills full height */}
        <div style={{ position: "absolute", top: 41, left: 0, right: 0, bottom: 0 }}>
          <RouteMap
            key={routeKey}
            origin={canSearch ? origin : "Kathmandu, Nepal"}
            waypoints={stops.filter(Boolean)}
            destination={canSearch ? destination : ""}
            travelMode={travelMode}
            isDark={isDark}
            t={t}
            onInfo={(info) => { if (canSearch) setRouteInfo(info) }}
            onRoutes={(alts) => { if (canSearch) { setRouteAlts(alts); setSelectedRoute(0); if (alts[0]) setRouteInfo(alts[0]) } }}
            selectedRouteIndex={selectedRoute}
          />
        </div>
      </div>
    </div>
  )
}

function NearbyPage() {
  const { t } = useT()

  const facilities = [
    { icon: <Fuel size={18} />, iconColor: t.amber, iconBg: t.amberLight, name: "Himalayan Petroleum Station", type: "Petrol pump", typeColor: t.amber, typeBg: t.amberLight, distance: "0.4 km", detail: "Open 24/7" },
    { icon: <Bed size={18} />, iconColor: t.blue, iconBg: t.blueLight, name: "Kathmandu Grand Hotel", type: "Hotel", typeColor: t.blue, typeBg: t.blueLight, distance: "0.9 km", detail: "From Rs 3,200 / night" },
    { icon: <Hospital size={18} />, iconColor: t.red, iconBg: t.redLight, name: "Norvic International Hospital", type: "Hospital", typeColor: t.red, typeBg: t.redLight, distance: "1.2 km", detail: "24/7 Emergency" },
  ]

  return (
    <div style={{ padding: "28px 32px", maxWidth: 760 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: t.text, margin: 0 }}>Nearby facilities</h1>
        <p style={{ fontSize: 13, color: t.textSub, margin: "4px 0 0" }}>Services and amenities near your location</p>
      </div>

      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 20, background: t.surface, border: `0.5px solid ${t.border}`, borderRadius: 20, padding: "6px 14px", fontSize: 12, color: t.textMid }}>
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: t.green, boxShadow: `0 0 0 2px ${t.greenLight}` }} />
        Near Thamel, Kathmandu — GPS active
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {["All","Fuel","Hotels","Hospitals","ATMs","Restaurants"].map((tab, i) => (
          <button key={tab} style={{
            padding: "5px 14px", borderRadius: 7, border: `0.5px solid ${i === 0 ? t.blue : t.border}`,
            fontSize: 12, fontWeight: 500, cursor: "pointer",
            background: i === 0 ? t.blue : t.surface, color: i === 0 ? "#ffffff" : t.textSub,
          }}>
            {tab}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
        {facilities.map((f, i) => (
          <Card key={i} style={{ padding: "16px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: f.iconBg, color: f.iconColor, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {f.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 3 }}>{f.name}</div>
                <div style={{ fontSize: 12, color: t.textSub }}>{f.detail}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                <Badge color={f.typeColor} bg={f.typeBg}>{f.type}</Badge>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <MapPin size={10} color={t.textFaint} />
                  <span style={{ fontSize: 11, color: t.textFaint }}>{f.distance}</span>
                </div>
              </div>
              <button style={{ padding: "7px 14px", borderRadius: 7, marginLeft: 4, border: `0.5px solid ${t.border}`, background: t.surface, fontSize: 11, fontWeight: 500, color: t.blue, cursor: "pointer" }}>
                Navigate
              </button>
            </div>
          </Card>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 20 }}>
        {[
          { icon: "🏧", label: "ATMs nearby", count: 8, color: t.blue },
          { icon: "🍽", label: "Restaurants", count: 24, color: t.orange },
          { icon: "🏪", label: "Pharmacies", count: 6, color: t.green },
          { icon: "🚌", label: "Bus stops", count: 5, color: t.amber },
        ].map((item) => (
          <Card key={item.label} style={{ padding: 14, textAlign: "center", cursor: "pointer" }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>{item.icon}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: item.color }}>{item.count}</div>
            <div style={{ fontSize: 11, color: t.textSub, marginTop: 1 }}>{item.label}</div>
          </Card>
        ))}
      </div>

      <div style={{ background: t.greenLight, border: `0.5px solid ${t.green}30`, borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: t.green, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CheckCircle2 size={18} color="#ffffff" />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: t.green }}>Your location is safe — no alerts</div>
            <div style={{ fontSize: 11, color: t.green, opacity: 0.7, marginTop: 2 }}>Last checked: just now · Bagmati Province emergency services active</div>
          </div>
        </div>
        <button style={{ padding: "8px 18px", borderRadius: 8, border: `0.5px solid ${t.green}`, background: t.surface, color: t.green, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          <Navigation size={13} /> Live tracking
        </button>
      </div>
    </div>
  )
}

function LiveTrackingPage() {
  const { t } = useT()
  return (
    <div style={{ padding: "28px 32px", maxWidth: 900 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: t.text, margin: 0 }}>Live tracking</h1>
        <p style={{ fontSize: 13, color: t.textSub, margin: "4px 0 0" }}>Real-time visitor and safety monitoring</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}>
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px 12px" }}>
            <CardTitle right={
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: t.green }} />
                <span style={{ fontSize: 11, color: t.green }}>Live</span>
              </div>
            }>
              Live activity map
            </CardTitle>
          </div>
          <div style={{ height: 360, position: "relative" }}>
            <BagmatiMap />
            <div style={{ position: "absolute", top: "52%", left: "44%", width: 14, height: 14, borderRadius: "50%", background: t.blue, border: "2px solid white", boxShadow: `0 0 0 4px ${t.blueLight}, 0 2px 8px rgba(24,95,165,0.4)` }} />
          </div>
        </Card>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Card>
            <CardTitle>Active zones</CardTitle>
            {[
              { name: "Thamel", count: 1240, level: "High", color: t.orange },
              { name: "Boudha", count: 870, level: "Medium", color: t.amber },
              { name: "Patan", count: 560, level: "Medium", color: t.amber },
              { name: "Bhaktapur", count: 340, level: "Low", color: t.green },
            ].map((zone) => (
              <div key={zone.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: `0.5px solid ${t.border}` }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: t.text }}>{zone.name}</div>
                  <div style={{ fontSize: 11, color: t.textFaint }}>{zone.count.toLocaleString()} active</div>
                </div>
                <Badge color={zone.color} bg={zone.color + "18"}>{zone.level}</Badge>
              </div>
            ))}
          </Card>
          <Card>
            <CardTitle>Safety status</CardTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "Road alerts", value: "2 minor", color: t.amber },
                { label: "Weather warnings", value: "None", color: t.green },
                { label: "Tourist advisories", value: "None", color: t.green },
                { label: "Emergency calls", value: "0 active", color: t.green },
              ].map((item) => (
                <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: t.textSub }}>{item.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: item.color }}>{item.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function BookingPage() {
  const { t } = useT()
  return (
    <div style={{ padding: "28px 32px", maxWidth: 1100 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: t.text, margin: 0 }}>Book & reserve</h1>
          <p style={{ fontSize: 13, color: t.textSub, margin: "4px 0 0" }}>Verified hotels in Bagmati Province</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {["All districts", "Sort by price"].map((label) => (
            <select key={label} style={{ padding: "7px 14px", borderRadius: 8, border: `0.5px solid ${t.border}`, fontSize: 12, color: t.textMid, background: t.surface, cursor: "pointer", outline: "none" }}>
              <option>{label}</option>
            </select>
          ))}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
        {hotels.map((hotel, i) => (
          <Card key={i} style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ height: 160, background: t.subtle, position: "relative", overflow: "hidden" }}>
              <img src={hotel.image} alt={hotel.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <div style={{ position: "absolute", top: 10, left: 10, background: "rgba(0,0,0,0.45)", borderRadius: 6, padding: "3px 8px", fontSize: 10, fontWeight: 500, color: "#ffffff", backdropFilter: "blur(4px)" }}>
                {hotel.tag}
              </div>
            </div>
            <div style={{ padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: t.text, marginBottom: 2 }}>{hotel.name}</div>
                  <div style={{ fontSize: 11, color: t.textFaint, display: "flex", alignItems: "center", gap: 3 }}>
                    <MapPin size={9} /> {hotel.location}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: t.blue }}>{hotel.price}</div>
                  <div style={{ fontSize: 10, color: t.textFaint }}>per night</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 2, marginBottom: 10 }}>
                {Array.from({ length: 5 }).map((_, si) => (
                  <Star key={si} size={12} fill={si < hotel.stars ? t.amber : "none"} color={si < hotel.stars ? t.amber : t.border} />
                ))}
                <span style={{ fontSize: 10, color: t.textFaint, marginLeft: 4 }}>{hotel.stars}.0</span>
              </div>
              <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                {hotel.amenities.includes("wifi") && <div style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: t.textSub }}><Wifi size={11} color={t.textFaint} /> Wifi</div>}
                {hotel.amenities.includes("car") && <div style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: t.textSub }}><Car size={11} color={t.textFaint} /> Parking</div>}
                {hotel.amenities.includes("coffee") && <div style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: t.textSub }}><Coffee size={11} color={t.textFaint} /> Breakfast</div>}
              </div>
              <button style={{
                width: "100%", padding: "8px 0", borderRadius: 8,
                border: `1px solid ${t.blue}`, background: "transparent",
                fontSize: 12, fontWeight: 600, color: t.blue, cursor: "pointer",
                transition: "all 0.15s", display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = t.blue; e.currentTarget.style.color = "#ffffff" }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = t.blue }}
              >
                Reserve now <ArrowRight size={12} />
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ─── AI Planner ───────────────────────────────────────────────────────────────

// ── Destination pool (mirrors what your ML model returns) ──────────────────
// Shape: { name, category, district, costPerDay, score, highlights, emoji }
// When your Flask/FastAPI is ready, replace `mockMLRecommend` with a real fetch.

interface Destination {
  name: string
  category: string[]
  district: string
  costPerDay: number
  score: number   // 0–1, model confidence / relevance score
  highlights: string[]
  emoji: string
}

const destinationPool: Destination[] = [
  { name: "Pashupatinath Temple", category: ["cultural", "history", "spiritual"], district: "Kathmandu", costPerDay: 800, score: 0.97, highlights: ["UNESCO listed", "Hindu heritage", "Bagmati ghats", "Evening aarti ceremony"], emoji: "🛕" },
  { name: "Boudhanath Stupa", category: ["cultural", "spiritual", "history"], district: "Kathmandu", costPerDay: 600, score: 0.94, highlights: ["World's largest stupa", "Tibetan Buddhism hub", "Kora circuit", "Thangka galleries"], emoji: "🏛" },
  { name: "Changu Narayan Temple", category: ["history", "cultural"], district: "Bhaktapur", costPerDay: 700, score: 0.91, highlights: ["Oldest temple in Nepal", "Stone carvings", "Panoramic valley views", "UNESCO site"], emoji: "🏯" },
  { name: "Namobuddha Monastery", category: ["spiritual", "cultural", "wildlife"], district: "Kavrepalanchok", costPerDay: 900, score: 0.88, highlights: ["Sacred Buddhist site", "Himalayan views", "Tiger legend site", "Peaceful forest trails"], emoji: "🌄" },
  { name: "Chitwan National Park", category: ["wildlife", "nature"], district: "Chitwan", costPerDay: 2200, score: 0.96, highlights: ["One-horned rhinos", "Bengal tigers", "Jungle safari", "Elephant conservation"], emoji: "🐘" },
  { name: "Shivapuri Nagarjun Park", category: ["wildlife", "nature", "adventure"], district: "Kathmandu", costPerDay: 500, score: 0.82, highlights: ["Day hikes", "Leopards & langurs", "Bird watching", "City-edge wilderness"], emoji: "🌿" },
  { name: "Phulchowki Hill", category: ["wildlife", "nature"], district: "Lalitpur", costPerDay: 400, score: 0.78, highlights: ["Highest peak in valley", "250+ bird species", "Rhododendron forests", "Clear Himalaya views"], emoji: "🦅" },
  { name: "Patan Durbar Square", category: ["history", "cultural", "art"], district: "Lalitpur", costPerDay: 650, score: 0.93, highlights: ["Malla dynasty palace", "Newari architecture", "Bronze casting heritage", "Patan Museum"], emoji: "🏛" },
  { name: "Bhaktapur Durbar Square", category: ["history", "cultural", "art"], district: "Bhaktapur", costPerDay: 750, score: 0.92, highlights: ["55-Window Palace", "Pottery square", "Peacock windows", "Juju Dhau curd"], emoji: "🏰" },
  { name: "Godavari Botanical Garden", category: ["nature", "wildlife"], district: "Lalitpur", costPerDay: 350, score: 0.74, highlights: ["900+ plant species", "Orchid house", "Butterfly park", "Picnic grounds"], emoji: "🌸" },
  { name: "Dakshinkali Temple", category: ["cultural", "spiritual"], district: "Kathmandu", costPerDay: 500, score: 0.80, highlights: ["Tantric goddess shrine", "Forested gorge", "Saturday markets", "Forest hike nearby"], emoji: "🔱" },
  { name: "Nagarjun Forest Reserve", category: ["wildlife", "nature", "adventure"], district: "Kathmandu", costPerDay: 450, score: 0.76, highlights: ["Dense oak & pine", "Himalayan wildlife", "Stupa at summit", "Short half-day trek"], emoji: "🌲" },
]

// ── Mock ML recommend function ─────────────────────────────────────────────
// TODO: Replace this with your real endpoint when ready:
//
//   async function fetchMLRecommend(budget, purposes, days) {
//     const res = await fetch("http://localhost:5000/recommend", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ budget_per_day: budget / days, purposes, days }),
//     })
//     return res.json()  // expects: { destinations: Destination[] }
//   }

function mockMLRecommend(budget: number, purposes: string[], days: number): Destination[] {
  const budgetPerDay = budget / Math.max(days, 1)

  return destinationPool
    .filter((d) => {
      const purposeMatch = purposes.length === 0 || purposes.some((p) => d.category.includes(p))
      const affordable = d.costPerDay <= budgetPerDay * 1.3
      return purposeMatch && affordable
    })
    .map((d) => {
      // Boost score by budget fit and purpose overlap
      const overlapRatio = purposes.length === 0 ? 1 : purposes.filter((p) => d.category.includes(p)).length / purposes.length
      const budgetFit = Math.min(1, budgetPerDay / d.costPerDay)
      return { ...d, score: Math.min(0.99, d.score * (0.6 + 0.2 * overlapRatio + 0.2 * budgetFit)) }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
}



const PURPOSE_OPTIONS = [
  { id: "cultural", label: "Cultural sites", icon: <Landmark size={13} /> },
  { id: "wildlife", label: "Wildlife", icon: <TreePine size={13} /> },
  { id: "history", label: "History", icon: <Scroll size={13} /> },
  { id: "spiritual", label: "Spiritual", icon: <Star size={13} /> },
  { id: "nature", label: "Nature", icon: <Camera size={13} /> },
  { id: "adventure", label: "Adventure", icon: <MapPinned size={13} /> },
]

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ flex: 1, height: 4, borderRadius: 4, background: "rgba(0,0,0,0.08)", overflow: "hidden" }}>
        <div style={{ width: `${score * 100}%`, height: "100%", background: color, borderRadius: 4, transition: "width 0.6s ease" }} />
      </div>
      <span style={{ fontSize: 10, fontWeight: 600, color, minWidth: 32 }}>{Math.round(score * 100)}%</span>
    </div>
  )
}

// ─── Itinerary types & generator ─────────────────────────────────────────────

interface Activity { time: string; title: string; note: string; icon: string; cost: number }
interface DayPlan { day: number; theme: string; activities: Activity[]; totalCost: number }

const activityLib: Record<string, Activity[]> = {
  cultural: [
    { time: "07:30", title: "Morning temple visit", note: "Arrive early to avoid crowds", icon: "🛕", cost: 600 },
    { time: "09:30", title: "Guided heritage walk", note: "English guide available (Rs 800)", icon: "🎒", cost: 800 },
    { time: "12:30", title: "Traditional Newari lunch", note: "Budget Rs 400–600 per person", icon: "🍽", cost: 500 },
    { time: "14:30", title: "Architecture & photography walk", note: "Self-guided, free entry", icon: "📸", cost: 0 },
    { time: "16:30", title: "Local craft & souvenir market", note: "Thangka, pottery, pashmina", icon: "🛍", cost: 400 },
    { time: "18:30", title: "Evening aarti ceremony", note: "Check local schedule for timings", icon: "🪔", cost: 150 },
  ],
  wildlife: [
    { time: "06:00", title: "Dawn wildlife safari", note: "Best sighting time — bring binoculars", icon: "🐘", cost: 1500 },
    { time: "09:00", title: "Guided nature trail", note: "Trained naturalist escort", icon: "🌿", cost: 600 },
    { time: "12:00", title: "Camp lunch at forest lodge", note: "Included with most safari packages", icon: "🍱", cost: 350 },
    { time: "14:00", title: "Bird watching session", note: "200+ species documented in this zone", icon: "🦅", cost: 400 },
    { time: "16:30", title: "Jeep safari — open grasslands", note: "Rhino and deer sightings common", icon: "🚙", cost: 1200 },
    { time: "19:00", title: "Campfire & cultural evening", note: "Resort activity, no charge", icon: "🔥", cost: 0 },
  ],
  history: [
    { time: "08:30", title: "Historian-led site tour", note: "Inscriptions and stone carvings", icon: "🏯", cost: 700 },
    { time: "10:30", title: "Museum & archive visit", note: "Audio guide in English available", icon: "🔍", cost: 300 },
    { time: "13:00", title: "Heritage lunch spot", note: "Courtyard dining, traditional setting", icon: "🍽", cost: 500 },
    { time: "15:00", title: "Ancient carving trail", note: "UNESCO documentation on site", icon: "🗿", cost: 0 },
    { time: "17:00", title: "Sunset viewpoint", note: "Panoramic valley views, free", icon: "🌅", cost: 0 },
    { time: "19:00", title: "Documentary screening", note: "Lodge usually shows local history film", icon: "🎞", cost: 0 },
  ],
  spiritual: [
    { time: "06:30", title: "Sunrise prayer ceremony", note: "Respectful dress required", icon: "🙏", cost: 100 },
    { time: "09:00", title: "Kora (circumambulation) circuit", note: "3 km walking circuit around stupa", icon: "⭕", cost: 0 },
    { time: "11:00", title: "Guided meditation session", note: "Monastery offers 60-min sessions", icon: "🧘", cost: 300 },
    { time: "13:00", title: "Vegetarian monastery meal", note: "Simple, nourishing, and included", icon: "🌱", cost: 200 },
    { time: "15:00", title: "Thangka painting workshop", note: "2-hour beginner-friendly session", icon: "🎨", cost: 800 },
    { time: "17:30", title: "Evening prayers (puja)", note: "Open to respectful visitors", icon: "🕯", cost: 0 },
  ],
  nature: [
    { time: "07:00", title: "Sunrise ridge hike", note: "Bring layers and 1.5 L water", icon: "🌄", cost: 200 },
    { time: "09:30", title: "Botanical garden trail", note: "900+ plant species identified", icon: "🌸", cost: 150 },
    { time: "12:00", title: "Viewpoint picnic lunch", note: "Pack from nearest town market", icon: "🧺", cost: 300 },
    { time: "14:00", title: "Butterfly & bird spotting", note: "Best in spring and autumn", icon: "🦋", cost: 0 },
    { time: "16:00", title: "Forest bathing walk", note: "Guided mindful nature walk", icon: "🌲", cost: 250 },
    { time: "18:00", title: "Evening at lodge viewpoint", note: "Clear Himalaya views on cloudless days", icon: "🏔", cost: 0 },
  ],
  adventure: [
    { time: "07:00", title: "Mountain biking trail run", note: "Rental available at trailhead Rs 600", icon: "🚵", cost: 600 },
    { time: "09:30", title: "Rock scramble ascent", note: "Certified guide strongly recommended", icon: "⛰", cost: 700 },
    { time: "12:30", title: "Summit lunch", note: "Bring packed dal-bhat from valley", icon: "🥾", cost: 200 },
    { time: "14:00", title: "Rappelling / zip-line session", note: "Safety gear and briefing included", icon: "🪂", cost: 900 },
    { time: "17:00", title: "Recovery & hot meal", note: "Local restaurant, dal-bhat Rs 250", icon: "🍜", cost: 350 },
    { time: "19:00", title: "Gear debrief & planning day 2", note: "With your guide at camp", icon: "🗺", cost: 0 },
  ],
}

function mockGenerateItinerary(dest: Destination, days: number, from: string): DayPlan[] {
  const sameDistrict = dest.district.toLowerCase().includes("kathmandu") && from.toLowerCase().includes("kathmandu")
  const travelCost = sameDistrict ? 250 : 900
  const primary = dest.category[0] ?? "cultural"
  const secondary = dest.category[1]
  const lib = activityLib[primary] ?? activityLib.cultural
  const libB = secondary ? (activityLib[secondary] ?? []) : []
  const combined = [...lib, ...libB]
  const accCostPerNight = Math.round(Math.max(1200, Math.min(3500, dest.costPerDay * 0.7)))

  return Array.from({ length: days }, (_, d) => {
    const acts: Activity[] = []
    if (d === 0) acts.push({ time: "07:30", title: `Travel to ${dest.district}`, note: `From ${from} — ${sameDistrict ? "30 min taxi" : "1.5 hr bus or taxi"}`, icon: "🚌", cost: travelCost })
    const offset = d * 3
    acts.push(...combined.slice(offset % lib.length, offset % lib.length + (d === 0 ? 3 : 4)))
    if (d === days - 1) acts.push({ time: "17:30", title: `Return to ${from}`, note: "Depart early to beat traffic", icon: "🏠", cost: travelCost })
    if (d < days - 1) acts.push({ time: "20:00", title: "Check-in & dinner", note: `Lodge near site · Rs ${accCostPerNight.toLocaleString()}/night`, icon: "🏨", cost: accCostPerNight + 400 })
    const totalCost = acts.reduce((s, a) => s + a.cost, 0)
    const themes = [`Arrival & first impressions`, `${dest.name} — deep dive`, `Hidden corners & local life`, `Farewell morning & departure`]
    return { day: d + 1, theme: themes[Math.min(d, themes.length - 1)], activities: acts, totalCost }
  })
}

// ─── Google Maps URL builder ──────────────────────────────────────────────────

function buildGoogleMapsUrl(
  from: string,
  dest: Destination,
  itinerary: DayPlan[],
  mode = "driving",
  dayIndex?: number
): string {
  const enc = (s: string) => encodeURIComponent(`${s}, Nepal`)
  const activities = dayIndex !== undefined
    ? (itinerary[dayIndex]?.activities ?? [])
    : itinerary.flatMap(d => d.activities)

  const waypoints = activities
    .filter(a => !["🚌", "🏠", "🏨", "🍽", "🍜", "🍱", "🌱", "🧺"].includes(a.icon))
    .slice(0, 7)
    .map(a => enc(a.title))
    .join("|")

  const url = `https://www.google.com/maps/dir/?api=1&origin=${enc(from)}&destination=${enc(`${dest.name}, ${dest.district}`)}&travelmode=${mode}${waypoints ? `&waypoints=${waypoints}` : ""}`
  return url
}

// ─── Floating Trip Assistant ──────────────────────────────────────────────────

interface AssistantMsg { id: string; role: "bot" | "user"; text: string; chips?: string[] }

const QUICK_CHIPS = [
  "🗺 Open in Google Maps",
  "➕ Add 1 more day",
  "🚶 Switch to walking",
  "🚌 Switch to transit",
  "🍜 Food nearby",
  "🌤 Weather info",
  "🏨 Where to stay",
  "✨ What to see",
]

function parseAssistantCommand(text: string) {
  const t = text.toLowerCase()
  if (/open|navigate|maps|direction|route|go there/.test(t)) return { type: "open_maps" }
  const addDays = t.match(/add (\d+)|(\d+) more day|extend (\d+)|extra (\d+)/)
  if (addDays) return { type: "add_days", value: parseInt(addDays[1] || addDays[2] || addDays[3] || addDays[4]) }
  const setDays = t.match(/(\d+)\s*days?|make it (\d+)|change.*?(\d+)\s*day/)
  if (setDays && /day/.test(t)) { const n = parseInt(setDays[1] || setDays[2] || setDays[3]); if (n >= 1 && n <= 14) return { type: "set_days", value: n } }
  const budgetMatch = t.match(/(\d[\d,]{2,})|rs\.?\s*(\d[\d,]+)/)
  if (budgetMatch && /budget|rupee|rs|spend|cost/.test(t)) { const n = parseInt((budgetMatch[1] || budgetMatch[2]).replace(/,/g, "")); if (n >= 500) return { type: "set_budget", value: n } }
  if (/walk|foot|pedestrian/.test(t)) return { type: "set_mode", value: "walking" }
  if (/transit|bus|public transport/.test(t)) return { type: "set_mode", value: "transit" }
  if (/driv|car|taxi/.test(t)) return { type: "set_mode", value: "driving" }
  if (/food|eat|restaur|lunch|dinner|meal|cuisine/.test(t)) return { type: "food" }
  if (/hotel|stay|sleep|accommodation|lodge/.test(t)) return { type: "hotel" }
  if (/weather|rain|cold|hot|temperature|climate|season/.test(t)) return { type: "weather" }
  if (/see|visit|attract|sight|explore|do there/.test(t)) return { type: "attractions" }
  return { type: "general" }
}

function assistantReply(
  cmd: ReturnType<typeof parseAssistantCommand>,
  dest: Destination,
  days: number,
  budget: number,
  travelMode: string
): string {
  switch (cmd.type) {
    case "open_maps": return `Opening Google Maps with your full ${dest.name} itinerary! All stops have been pre-filled. 🗺`
    case "add_days": return `Adding ${(cmd as any).value} more day${(cmd as any).value > 1 ? "s" : ""} — replanning your itinerary now...`
    case "set_days": return `Changing trip to ${(cmd as any).value} days — replanning now...`
    case "set_budget": return `Budget updated to Rs ${(cmd as any).value.toLocaleString()} — finding destinations that fit, then regenerating itinerary...`
    case "set_mode": {
      const labels: Record<string, string> = { driving: "🚗 driving", walking: "🚶 walking", transit: "🚌 public transit" }
      return `Travel mode set to ${labels[(cmd as any).value]}. Your Google Maps link will use this when you open it.`
    }
    case "food": return `Great food near ${dest.name}:\n• Dal-bhat sets — Rs 200–400\n• Newari thali restaurants in ${dest.district}\n• Street momos — Rs 80–150\n• Budget Rs 400–700/meal per person`
    case "hotel": return `Places to stay near ${dest.district}:\n• Budget guesthouses — Rs 800–1,500/night\n• Mid-range hotels — Rs 2,500–4,500/night\n• Heritage / boutique — Rs 6,000+/night\nMost are bookable via the Book & Reserve tab.`
    case "weather": return `Seasonal weather for ${dest.district}:\n• Spring (Mar–May): 15–25°C ☀️ — ideal\n• Summer (Jun–Aug): 20–28°C 🌧 — monsoon\n• Autumn (Sep–Nov): 12–22°C 🍂 — peak season\n• Winter (Dec–Feb): 5–18°C ❄️ — dry, crisp`
    case "attractions": return `Must-see at ${dest.name}:\n${dest.highlights.map(h => `• ${h}`).join("\n")}`
    default: return `I can help update your ${dest.name} trip:\n• "Add 2 more days"\n• "Budget Rs 5000"\n• "Switch to walking"\n• "Open in Google Maps"\n• "What to eat there"\n• "Best time to visit"`
  }
}

// ── ML Analysis Panel ─────────────────────────────────────────────────────────

interface AnalysisData {
  demandScore: number; predictedVisitors: number; sentimentScore: number
  yoyGrowth: number; peakMonths: string[]; clusterLabel: string
  topTags: string[]; avgRating: number; reviewCount: number
}

function MLAnalysisPanel({ destName, t }: { destName: string; t: Theme }) {
  const [data, setData] = useState<AnalysisData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    setLoading(true); setError(false); setData(null)
    callAI<AnalysisData>("insights", { destination: destName })
      .then(json => {
        if (!json) throw new Error("no data")
        setData(json)
        setLoading(false)
      })
      .catch(() => { setError(true); setLoading(false) })
  }, [destName])

  const metrics = data ? [
    { icon: "📈", label: "Demand score",       value: `${Math.round((data.demandScore ?? 0) * 100)}%`, sub: "Seasonal visitor demand index" },
    { icon: "👥", label: "Predicted visitors", value: (data.predictedVisitors ?? 0).toLocaleString(),  sub: "Next month forecast" },
    { icon: "⭐", label: "Sentiment score",    value: `${(data.sentimentScore ?? 0).toFixed(1)} / 5`,  sub: `${data.reviewCount ?? 0} reviews analysed` },
    { icon: "📊", label: "YoY growth",         value: `${data.yoyGrowth > 0 ? "+" : ""}${data.yoyGrowth}%`, sub: "2023 → 2024 visitor change" },
    { icon: "🗓", label: "Peak months",        value: (data.peakMonths ?? []).slice(0, 3).join(", "), sub: "Best time to visit" },
    { icon: "🏷", label: "Visitor cluster",    value: data.clusterLabel ?? "—", sub: "Dominant visitor type" },
  ] : []

  return (
    <div style={{ border: `0.5px solid ${t.border}`, borderRadius: 12, overflow: "hidden", marginBottom: 8 }}>
      <div style={{ background: t.subtle, padding: "12px 16px", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: loading ? t.amber : error ? t.red : t.green }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: t.textMid }}>ML analysis — {destName}</span>
        <span style={{ marginLeft: "auto", fontSize: 10, borderRadius: 4, padding: "2px 8px", fontWeight: 600,
          background: loading ? t.amberLight : error ? t.redLight : t.greenLight,
          color: loading ? t.amber : error ? t.red : t.green,
        }}>
          {loading ? "Loading…" : error ? "Backend offline" : "Live from MongoDB"}
        </span>
      </div>
      <div style={{ padding: "16px", background: t.surface }}>
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: t.textSub, fontSize: 12, padding: "8px 0" }}>
            <Loader2 size={14} color={t.blue} style={{ animation: "spin 1s linear infinite" }} />
            Fetching insights from MongoDB…
          </div>
        )}
        {error && (
          <div style={{ background: t.amberLight, border: `0.5px solid ${t.amber}30`, borderRadius: 8, padding: "10px 14px", fontSize: 12, color: t.amber, lineHeight: 1.6 }}>
            <strong>AI insights unavailable.</strong> Make sure your Supabase project is connected and the Edge Function is deployed:<br />
            <code style={{ background: t.surface, padding: "2px 6px", borderRadius: 4, fontSize: 11, marginTop: 4, display: "inline-block" }}>
              supabase functions deploy gantabya-ai
            </code><br />
            Then add <strong>ANTHROPIC_API_KEY</strong> in your Supabase project → Settings → Edge Functions → Secrets.
          </div>
        )}
        {data && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 14 }}>
              {metrics.map(item => (
                <div key={item.label} style={{ background: t.pageBg, border: `0.5px solid ${t.border}`, borderRadius: 8, padding: "11px 13px" }}>
                  <div style={{ fontSize: 16, marginBottom: 4 }}>{item.icon}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: t.text, lineHeight: 1.2 }}>{item.value}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: t.textMid, marginTop: 3 }}>{item.label}</div>
                  <div style={{ fontSize: 10, color: t.textFaint }}>{item.sub}</div>
                </div>
              ))}
            </div>
            {data.topTags && data.topTags.length > 0 && (
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                <span style={{ fontSize: 10, color: t.textFaint, marginRight: 2 }}>Visitor tags:</span>
                {data.topTags.map(tag => (
                  <span key={tag} style={{ fontSize: 10, fontWeight: 500, color: t.blue, background: t.blueLight, borderRadius: 4, padding: "2px 7px" }}>{tag}</span>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function FloatingTripAssistant({ from, dest, itinerary, budget, days, travelMode, t, onSetDays, onSetBudget, onSetTravelMode, onReplan, onOpenMaps }: {
  from: string; dest: Destination; itinerary: DayPlan[]; budget: number; days: number; travelMode: string; t: Theme
  onSetDays: (n: number) => void; onSetBudget: (n: number) => void
  onSetTravelMode: (m: string) => void; onReplan: () => void; onOpenMaps: (mode?: string, day?: number) => void
}) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState("")
  const [msgs, setMsgs] = useState<AssistantMsg[]>([{
    id: "welcome", role: "bot",
    text: `Your ${days}-day trip to ${dest.name} is ready! I can help you adjust it or open it in Google Maps with all stops pre-filled.`,
    chips: ["🗺 Open in Google Maps", "➕ Add 1 more day", "🍜 Food nearby"],
  }])
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }) }, [msgs])

  async function send(text: string) {
    if (!text.trim()) return
    const userMsg: AssistantMsg = { id: Date.now().toString(), role: "user", text }
    setMsgs(prev => [...prev, userMsg, { id: Date.now() + "-thinking", role: "bot", text: "…", chips: [] }])
    setInput("")

    // Call assistant: Flask → Supabase Edge Function → local rule-based fallback
    let replyText = ""
    let cmd: ReturnType<typeof parseAssistantCommand> = { type: "general" }
    try {
      const data = await callAI("assistant", {
        message: text,
        context: { destination: dest.name, days, budget, travelMode, from },
      })
      replyText = (data as any)?.reply ?? ""
      const d = data as any
      cmd = { type: d?.type ?? "general", ...(d?.value != null ? { value: d.value } : {}) } as any
    } catch {
      cmd = parseAssistantCommand(text)
      replyText = assistantReply(cmd, dest, days, budget, travelMode)
    }

    // Execute side effects based on command type
    if (cmd.type === "open_maps") {
      onOpenMaps(travelMode)
    } else if (cmd.type === "add_days") {
      onSetDays(days + ((cmd as any).value ?? 1)); setTimeout(onReplan, 150)
    } else if (cmd.type === "set_days") {
      onSetDays((cmd as any).value); setTimeout(onReplan, 150)
    } else if (cmd.type === "set_budget") {
      onSetBudget((cmd as any).value); setTimeout(onReplan, 150)
    } else if (cmd.type === "set_mode") {
      onSetTravelMode((cmd as any).value)
    }

    const chips = cmd.type === "open_maps"
      ? ["Full trip", "Day 1 only", "Day 2 only"]
      : cmd.type === "general"
      ? ["🗺 Open in Google Maps", "➕ Add 1 more day", "🌤 Weather info"]
      : ["🗺 Open in Google Maps", "✨ What to see", "🏨 Where to stay"]

    // Replace the thinking bubble with the real response
    setMsgs(prev => [
      ...prev.filter(m => !m.id.includes("-thinking")),
      { id: Date.now().toString() + "-bot", role: "bot", text: replyText, chips },
    ])
  }

  return (
    <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 200 }}>
      {/* Collapsed bubble */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          style={{
            width: 52, height: 52, borderRadius: "50%", border: "none",
            background: t.blue, color: "#fff", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 18px rgba(24,95,165,0.45)",
            transition: "transform 0.15s",
            fontSize: 22,
          }}
          title="Trip assistant"
          onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.08)")}
          onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
        >
          🤖
        </button>
      )}

      {/* Expanded panel */}
      {open && (
        <div style={{
          width: 320, borderRadius: 14, overflow: "hidden",
          border: `0.5px solid ${t.border}`,
          boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
          display: "flex", flexDirection: "column",
          maxHeight: 480, background: t.surface,
        }}>
          {/* Header */}
          <div style={{ background: t.blue, padding: "11px 14px", display: "flex", alignItems: "center", gap: 9 }}>
            <span style={{ fontSize: 18 }}>🤖</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>Trip assistant</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.7)" }}>{dest.name} · {days} days</div>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.8)", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 2 }}>×</button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
            {msgs.map(msg => (
              <div key={msg.id}>
                {msg.role === "user" ? (
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <div style={{ background: t.blue, color: "#fff", borderRadius: "12px 12px 2px 12px", padding: "7px 11px", fontSize: 12, maxWidth: 220, lineHeight: 1.45 }}>
                      {msg.text}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ background: t.subtle, borderRadius: "2px 12px 12px 12px", padding: "8px 11px", fontSize: 12, color: t.text, lineHeight: 1.55, whiteSpace: "pre-line", maxWidth: 260 }}>
                      {msg.text}
                    </div>
                    {msg.chips && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                        {msg.chips.map(chip => (
                          <button key={chip} onClick={() => send(chip)} style={{
                            padding: "4px 9px", borderRadius: 20, border: `0.5px solid ${t.border}`,
                            background: t.surface, color: t.blue, fontSize: 10, fontWeight: 500,
                            cursor: "pointer", transition: "all 0.12s",
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = t.blueLight }}
                          onMouseLeave={e => { e.currentTarget.style.background = t.surface }}
                          >
                            {chip}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Quick chips */}
          <div style={{ padding: "6px 14px 4px", display: "flex", gap: 4, overflowX: "auto", flexShrink: 0 }}>
            {["🗺 Google Maps", "➕ Day", "💰 Budget", "🚗 Drive", "🚶 Walk"].map(chip => (
              <button key={chip} onClick={() => send(chip)} style={{
                padding: "3px 8px", borderRadius: 20, border: `0.5px solid ${t.border}`,
                background: t.pageBg, color: t.textSub, fontSize: 10, whiteSpace: "nowrap",
                cursor: "pointer", flexShrink: 0,
              }}>
                {chip}
              </button>
            ))}
          </div>

          {/* Input */}
          <div style={{ padding: "8px 14px 12px", display: "flex", gap: 8, borderTop: `0.5px solid ${t.border}` }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send(input)}
              placeholder="Ask me anything about your trip…"
              style={{
                flex: 1, height: 34, border: `0.5px solid ${t.border}`, borderRadius: 8,
                padding: "0 10px", fontSize: 12, color: t.text, background: t.subtle, outline: "none",
              }}
            />
            <button onClick={() => send(input)} style={{
              width: 34, height: 34, borderRadius: 8, border: "none",
              background: t.blue, color: "#fff", cursor: "pointer", fontSize: 15,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Send size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Smart Planner (unified AI destination finder + itinerary builder) ────────

// ─── Interactive map location picker ─────────────────────────────────────────

type PickMode = "origin" | "destination"

function LocationPickerMap({ onOrigin, onDestination, t, isDark }: {
  onOrigin: (name: string) => void
  onDestination: (name: string) => void
  t: Theme; isDark?: boolean
}) {
  const divRef      = useRef<HTMLDivElement>(null)
  const mapObj      = useRef<any>(null)
  const origMarker  = useRef<any>(null)
  const destMarker  = useRef<any>(null)
  const modeRef     = useRef<PickMode>("destination")
  const [mode, setModeState] = useState<PickMode>("destination")
  const [status, setStatus]  = useState("")

  const setMode = (m: PickMode) => { modeRef.current = m; setModeState(m) }

  useEffect(() => {
    if (!GMAPS_KEY || !divRef.current) return
    loadGMaps(() => {
      if (!divRef.current) return
      const g = (window as any).google.maps

      if (!mapObj.current) {
        mapObj.current = new g.Map(divRef.current, {
          zoom: 7,
          center: { lat: 28.3949, lng: 84.124 },
          styles: isDark ? DARK_STYLES : LIGHT_STYLES,
          disableDefaultUI: true,
          zoomControl: true,
          clickableIcons: false,
        })
        g.event.trigger(mapObj.current, "resize")

        mapObj.current.addListener("click", (e: any) => {
          const lat = e.latLng.lat()
          const lng = e.latLng.lng()
          const currentMode = modeRef.current

          setStatus("Getting location…")

          new g.Geocoder().geocode({ location: { lat, lng } }, (results: any[], st: string) => {
            if (st !== "OK" || !results[0]) { setStatus("Couldn't find that location"); return }

            // Use locality / district / country name for a clean label
            const name = results[0].address_components
              ?.slice(0, 3)
              .map((c: any) => c.long_name)
              .join(", ") || results[0].formatted_address

            if (currentMode === "origin") {
              if (origMarker.current) origMarker.current.setMap(null)
              origMarker.current = new g.Marker({
                position: { lat, lng }, map: mapObj.current,
                title: "Starting point",
                icon: { path: g.SymbolPath.CIRCLE, scale: 9, fillColor: "#185FA5", fillOpacity: 1, strokeColor: "#ffffff", strokeWeight: 2 },
              })
              onOrigin(name)
              setStatus(`✓ Start set: ${name}`)
            } else {
              if (destMarker.current) destMarker.current.setMap(null)
              destMarker.current = new g.Marker({
                position: { lat, lng }, map: mapObj.current,
                title: "Destination",
                icon: { path: g.SymbolPath.CIRCLE, scale: 9, fillColor: "#D85A30", fillOpacity: 1, strokeColor: "#ffffff", strokeWeight: 2 },
              })
              onDestination(name)
              setStatus(`✓ Destination set: ${name}`)
            }

            // Auto-switch mode after each pick
            const next: PickMode = currentMode === "destination" ? "origin" : "destination"
            modeRef.current = next; setModeState(next)
          })
        })
      }
    })
  }, [isDark])

  if (!GMAPS_KEY) return (
    <div style={{ height: 180, borderRadius: 10, background: t.subtle, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: t.textFaint, border: `0.5px solid ${t.border}` }}>
      Add VITE_GOOGLE_MAPS_API_KEY to enable map picker
    </div>
  )

  return (
    <div>
      {/* Mode selector */}
      <div style={{ display: "flex", gap: 5, marginBottom: 7 }}>
        {([
          { m: "origin" as PickMode, label: "🔵 Set start", ac: t.blue, abg: t.blueLight },
          { m: "destination" as PickMode, label: "🔴 Set destination", ac: t.orange, abg: t.orangeLight },
        ]).map(opt => (
          <button key={opt.m} onClick={() => setMode(opt.m)} style={{
            flex: 1, padding: "6px 0", borderRadius: 7, fontSize: 11, fontWeight: mode === opt.m ? 700 : 500, cursor: "pointer",
            border: `0.5px solid ${mode === opt.m ? opt.ac : t.border}`,
            background: mode === opt.m ? opt.abg : t.surface, color: mode === opt.m ? opt.ac : t.textSub,
            transition: "all 0.12s",
          }}>
            {opt.label}
          </button>
        ))}
      </div>

      {/* Map */}
      <div style={{ position: "relative" }}>
        <div ref={divRef} style={{ height: 200, borderRadius: 10, border: `0.5px solid ${t.border}`, overflow: "hidden" }} />
        {/* Cursor hint overlay */}
        <div style={{ position: "absolute", top: 7, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.6)", borderRadius: 12, padding: "3px 10px", fontSize: 10, color: "#fff", pointerEvents: "none", whiteSpace: "nowrap" }}>
          Tap to set {mode === "origin" ? "starting point" : "destination"}
        </div>
      </div>

      {/* Status */}
      {status && (
        <div style={{ fontSize: 10, color: status.startsWith("✓") ? t.green : t.textFaint, marginTop: 5, textAlign: "center" }}>
          {status}
        </div>
      )}
    </div>
  )
}

// ── Suggested trip cards shown before destination is chosen ──────────────────
const SUGGESTED_TRIPS = [
  { name: "Pokhara",                emoji: "🌊", tag: "Nature & lakes",       cost: "Rs 3,000–6,000/day", season: "Spring & Autumn", days: "2–4 days",   bg: "#EBF2FB" },
  { name: "Chitwan National Park",  emoji: "🐘", tag: "Wildlife safari",      cost: "Rs 2,000–4,000/day", season: "Winter & Spring", days: "2–3 days",   bg: "#EAF2E0" },
  { name: "Annapurna Base Camp",    emoji: "🏔", tag: "Trek & adventure",     cost: "Rs 2,500–5,000/day", season: "Spring & Autumn", days: "7–10 days",  bg: "#EBF2FB" },
  { name: "Lumbini",                emoji: "☮",  tag: "Spiritual & heritage", cost: "Rs 1,500–3,000/day", season: "All seasons",     days: "1–2 days",   bg: "#FBF3E2" },
  { name: "Kathmandu Valley",       emoji: "🛕", tag: "Culture & history",    cost: "Rs 2,000–5,000/day", season: "All seasons",     days: "2–4 days",   bg: "#FBEEE8" },
  { name: "Poon Hill",              emoji: "⛅", tag: "Trek & sunrise",       cost: "Rs 1,500–2,500/day", season: "Spring & Autumn", days: "3–4 days",   bg: "#EAF2E0" },
  { name: "Rara National Park",     emoji: "🏞", tag: "Remote wilderness",    cost: "Rs 4,000–8,000/day", season: "Spring & Autumn", days: "4–6 days",   bg: "#EBF2FB" },
  { name: "Mustang Kingdom",        emoji: "🏜", tag: "Desert & culture",     cost: "Rs 5,000–10,000/day",season: "Summer",          days: "5–8 days",   bg: "#FBF3E2" },
]

// Popular stops lookup — keyed by destination keyword
const POPULAR_STOPS_DB: Record<string, { name: string; emoji: string; note: string }[]> = {
  pokhara:      [{ name:"Bandipur Village",     emoji:"🏘", note:"Hill town" }, { name:"Gorkha Durbar",       emoji:"🏰", note:"Royal palace" }, { name:"Manakamana Temple",   emoji:"🛕", note:"Cable car temple" }, { name:"Mugling",             emoji:"🌊", note:"Riverside stop" }],
  chitwan:      [{ name:"Daman Viewpoint",       emoji:"🌄", note:"Himalaya panorama" }, { name:"Hetauda",              emoji:"🏙", note:"Midway city" }, { name:"Bharatpur",            emoji:"🌿", note:"Rapti river" }, { name:"Narayanghat",          emoji:"🌊", note:"Gandaki confluence" }],
  lumbini:      [{ name:"Palpa Tansen",           emoji:"⛩",  note:"Heritage town" }, { name:"Devdaha",              emoji:"☮",  note:"Sacred site" }, { name:"Butwal",               emoji:"🏙", note:"Gateway city" }, { name:"Kapilvastu",           emoji:"🏛",  note:"Buddha's kingdom" }],
  annapurna:    [{ name:"Pokhara Lakeside",       emoji:"🌊", note:"Start of treks" }, { name:"Nayapul",              emoji:"🌿", note:"Trailhead" }, { name:"Ghorepani",            emoji:"⛺", note:"Rhododendron forest" }, { name:"Poon Hill",            emoji:"⛅", note:"Sunrise viewpoint" }],
  everest:      [{ name:"Lukla Airport",          emoji:"✈",  note:"Trek gateway" }, { name:"Namche Bazaar",        emoji:"🏔", note:"Sherpa capital" }, { name:"Tengboche Monastery",  emoji:"🏯", note:"Scenic monastery" }, { name:"Dingboche",            emoji:"⛺", note:"High altitude stop" }],
  mustang:      [{ name:"Jomsom",                 emoji:"🏔", note:"Windy valley" }, { name:"Kagbeni",              emoji:"🏯", note:"Medieval village" }, { name:"Muktinath Temple",     emoji:"🛕", note:"Sacred pilgrimage" }, { name:"Lo Manthang",          emoji:"🏛",  note:"Ancient walled city" }],
  rara:         [{ name:"Jumla",                  emoji:"🍎", note:"Apple orchard town" }, { name:"Sinja Valley",         emoji:"🏛",  note:"Ancient ruins" }, { name:"Talcha Airport",       emoji:"✈",  note:"Remote airstrip" }],
  kathmandu:    [{ name:"Boudhanath Stupa",       emoji:"🏛",  note:"Buddhist hub" }, { name:"Patan Durbar Square",  emoji:"🏰", note:"Newari palace" }, { name:"Swayambhunath",        emoji:"🐵", note:"Monkey temple" }, { name:"Bhaktapur",            emoji:"🏯", note:"Medieval city" }],
  bhaktapur:    [{ name:"Changu Narayan Temple",  emoji:"🏯", note:"UNESCO site" }, { name:"Boudhanath Stupa",     emoji:"🏛",  note:"Buddhist stupa" }, { name:"Nagarkot",             emoji:"🌄", note:"Sunrise viewpoint" }],
  ilam:         [{ name:"Kanyam Tea Garden",      emoji:"🍃", note:"Tea estate" }, { name:"Sandakpur",            emoji:"⛰",  note:"Mountain views" }, { name:"Mai Pokhari",          emoji:"🌊", note:"Sacred lake" }],
  default:      [{ name:"Boudhanath Stupa",       emoji:"🏛",  note:"Buddhist heritage" }, { name:"Patan Durbar Square",  emoji:"🏰", note:"Newari art" }, { name:"Changu Narayan",       emoji:"🏯", note:"UNESCO temple" }, { name:"Namobuddha",           emoji:"🌄", note:"Monastery" }],
}

function getPopularStops(dest: string): { name: string; emoji: string; note: string }[] {
  const d = dest.toLowerCase()
  for (const [key, stops] of Object.entries(POPULAR_STOPS_DB)) {
    if (key !== "default" && d.includes(key)) return stops
  }
  return POPULAR_STOPS_DB.default
}

// ── Hotel data for Nepal stopovers ────────────────────────────────────────────

const NEPAL_ROUTE_HOTELS: Record<string, { name: string; phone: string; cost: string; stars: number; mapUrl: string }[]> = {
  pokhara:    [{ name: "Temple Tree Resort & Spa", phone: "+977-61-465555", cost: "Rs 6,000–15,000", stars: 4, mapUrl: "https://www.google.com/maps/search/Temple+Tree+Resort+Pokhara" }, { name: "Hotel Barahi", phone: "+977-61-465001", cost: "Rs 3,500–8,000", stars: 4, mapUrl: "https://www.google.com/maps/search/Hotel+Barahi+Pokhara" }, { name: "Fish Tail Lodge", phone: "+977-61-465071", cost: "Rs 5,000–12,000", stars: 4, mapUrl: "https://www.google.com/maps/search/Fishtail+Lodge+Pokhara" }],
  chitwan:    [{ name: "Kasara Resort", phone: "+977-56-580141", cost: "Rs 8,000–20,000", stars: 5, mapUrl: "https://www.google.com/maps/search/Kasara+Resort+Chitwan" }, { name: "Tiger Tops Jungle Lodge", phone: "+977-1-4361500", cost: "Rs 12,000+", stars: 5, mapUrl: "https://www.google.com/maps/search/Tiger+Tops+Chitwan" }, { name: "Hotel Narayani Safari", phone: "+977-56-520016", cost: "Rs 2,000–5,000", stars: 3, mapUrl: "https://www.google.com/maps/search/Hotel+Narayani+Chitwan" }],
  lumbini:    [{ name: "Hotel Lumbini Garden", phone: "+977-71-580236", cost: "Rs 3,000–8,000", stars: 4, mapUrl: "https://www.google.com/maps/search/Hotel+Lumbini+Garden" }, { name: "Buddha Maya Garden Hotel", phone: "+977-71-580100", cost: "Rs 2,000–5,000", stars: 3, mapUrl: "https://www.google.com/maps/search/Buddha+Maya+Garden+Hotel" }],
  kathmandu:  [{ name: "Dwarika's Hotel", phone: "+977-1-4479488", cost: "Rs 15,000+", stars: 5, mapUrl: "https://www.google.com/maps/search/Dwarika's+Hotel+Kathmandu" }, { name: "Hyatt Regency Kathmandu", phone: "+977-1-4491234", cost: "Rs 12,000+", stars: 5, mapUrl: "https://www.google.com/maps/search/Hyatt+Regency+Kathmandu" }, { name: "Hotel Yak & Yeti", phone: "+977-1-4248999", cost: "Rs 8,000–20,000", stars: 5, mapUrl: "https://www.google.com/maps/search/Yak+Yeti+Hotel+Kathmandu" }],
  nagarkot:   [{ name: "Club Himalaya Nagarkot", phone: "+977-11-661234", cost: "Rs 6,000–15,000", stars: 4, mapUrl: "https://www.google.com/maps/search/Club+Himalaya+Nagarkot" }, { name: "The Fort Resort", phone: "+977-11-661869", cost: "Rs 8,000–20,000", stars: 4, mapUrl: "https://www.google.com/maps/search/Fort+Resort+Nagarkot" }],
  dhulikhel:  [{ name: "Dhulikhel Lodge Resort", phone: "+977-11-561114", cost: "Rs 3,000–8,000", stars: 3, mapUrl: "https://www.google.com/maps/search/Dhulikhel+Lodge+Resort" }, { name: "Namobuddha Resort", phone: "+977-11-490114", cost: "Rs 2,500–6,000", stars: 3, mapUrl: "https://www.google.com/maps/search/Namobuddha+Resort+Nepal" }],
  mugling:    [{ name: "Hotel Mugling Paradise", phone: "+977-56-420045", cost: "Rs 800–2,000", stars: 2, mapUrl: "https://www.google.com/maps/search/hotel+Mugling+Tanahun+Nepal" }, { name: "Riverside Hotel Mugling", phone: "+977-56-420012", cost: "Rs 600–1,500", stars: 2, mapUrl: "https://www.google.com/maps/search/Riverside+Hotel+Mugling" }],
  butwal:     [{ name: "Hotel Siddhartha", phone: "+977-71-544111", cost: "Rs 2,000–5,000", stars: 3, mapUrl: "https://www.google.com/maps/search/Hotel+Siddhartha+Butwal" }, { name: "Green Park Hotel", phone: "+977-71-543678", cost: "Rs 1,500–3,500", stars: 3, mapUrl: "https://www.google.com/maps/search/Green+Park+Hotel+Butwal" }],
  bharatpur:  [{ name: "Hotel Narayani", phone: "+977-56-523536", cost: "Rs 2,500–6,000", stars: 3, mapUrl: "https://www.google.com/maps/search/Hotel+Narayani+Bharatpur" }],
  bandipur:   [{ name: "Old Inn Bandipur", phone: "+977-65-520136", cost: "Rs 2,000–5,000", stars: 3, mapUrl: "https://www.google.com/maps/search/Old+Inn+Bandipur+Nepal" }],
  janakpur:   [{ name: "Hotel Rama", phone: "+977-41-520059", cost: "Rs 1,500–3,500", stars: 3, mapUrl: "https://www.google.com/maps/search/Hotel+Rama+Janakpur" }],
  ilam:       [{ name: "Tea House Inn Ilam", phone: "+977-27-520234", cost: "Rs 800–2,000", stars: 2, mapUrl: "https://www.google.com/maps/search/hotel+Ilam+Nepal" }],
}

function getHotelsForStop(stopName: string) {
  const lc = stopName.toLowerCase()
  for (const [key, hotels] of Object.entries(NEPAL_ROUTE_HOTELS)) {
    if (lc.includes(key)) return hotels
  }
  return [{ name: `Hotels near ${stopName.split(",")[0]}`, phone: "See Google Maps", cost: "Various", stars: 0, mapUrl: `https://www.google.com/maps/search/hotel+${encodeURIComponent(stopName + " Nepal")}` }]
}

// ── Facilities along the route ────────────────────────────────────────────────

function FacilitiesOnRoute({ from, destination, routeInfo, t }: {
  from: string; destination: string; routeInfo: RouteInfo; t: Theme
}) {
  const distKm = parseFloat(routeInfo.distance) || 0
  const durMatch = routeInfo.duration.match(/(\d+)h\s*(\d+)?m?/)
  const durMin = durMatch ? parseInt(durMatch[1] || "0") * 60 + parseInt(durMatch[2] || "0") : 0

  type Fac = { icon: string; label: string; detail: string; note: string; atKm: number; mapUrl: string }
  const facilities: Fac[] = []

  const q = (s: string) => encodeURIComponent(s)
  const dest = destination.split(",")[0]

  // Restaurants — always shown
  facilities.push({
    icon: "🍽", label: "Restaurants & dhabas",
    detail: distKm > 60 ? "Plan a meal stop at the midpoint town" : "Roadside tea houses & daal-bhat available",
    note: "Rs 150–500 / meal",
    atKm: Math.round(distKm * 0.4) || 5,
    mapUrl: `https://www.google.com/maps/search/restaurants+${q("en route " + dest + " Nepal")}`,
  })

  // Petrol — if > 30 km
  if (distKm > 30) {
    facilities.push({
      icon: "⛽", label: "Petrol stations",
      detail: distKm > 120 ? "Plan 1–2 fuel stops — carry extra for remote stretches" : "Fill up before departure; one tank should suffice",
      note: "Rs 168–175 / litre",
      atKm: Math.round(distKm * 0.28) || 10,
      mapUrl: `https://www.google.com/maps/search/petrol+pump+${q(from + " to " + dest + " Nepal")}`,
    })
  }

  // Hotel / lodge — if > 60 km or > 2.5 h
  if (distKm > 60 || durMin > 150) {
    facilities.push({
      icon: "🏨", label: "Hotels & lodges",
      detail: durMin > 300 ? "Long journey — overnight stop recommended" : "Tea-house lodges available at major towns en route",
      note: "Rs 800–3,500 / night",
      atKm: Math.round(distKm * 0.5) || 20,
      mapUrl: `https://www.google.com/maps/search/hotel+lodge+${q(dest + " Nepal")}`,
    })
  }

  // Hospital / clinic — always
  facilities.push({
    icon: "🏥", label: "Hospitals & clinics",
    detail: "Note nearest medical facility before you depart",
    note: "Nepal emergency: 102",
    atKm: Math.round(distKm * 0.35) || 8,
    mapUrl: `https://www.google.com/maps/search/hospital+${q(dest + " Nepal")}`,
  })

  // ATM — if > 40 km
  if (distKm > 40) {
    facilities.push({
      icon: "🏧", label: "ATMs",
      detail: "Carry cash — ATMs are scarce beyond district headquarters",
      note: "Withdraw at your origin city",
      atKm: Math.round(distKm * 0.15) || 5,
      mapUrl: `https://www.google.com/maps/search/ATM+bank+${q(dest + " Nepal")}`,
    })
  }

  // Pharmacy — if > 80 km
  if (distKm > 80) {
    facilities.push({
      icon: "💊", label: "Pharmacies",
      detail: "Pack a travel health kit for remote areas",
      note: "Basic meds available at bazaars",
      atKm: Math.round(distKm * 0.6) || 30,
      mapUrl: `https://www.google.com/maps/search/pharmacy+medical+${q(dest + " Nepal")}`,
    })
  }

  const ETA_LABEL = durMin < 60 ? `${durMin}m drive` : durMin < 120 ? `${Math.floor(durMin / 60)}h ${durMin % 60}m drive` : `${(durMin / 60).toFixed(1)}h drive`

  return (
    <div style={{ padding: "12px 16px 4px", borderTop: `0.5px solid ${t.border}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 14 }}>🛣</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: t.textMid }}>Facilities on this route</span>
        <span style={{ fontSize: 9, color: t.textFaint, marginLeft: "auto" }}>
          {routeInfo.distance} · {ETA_LABEL}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
        {facilities.map(f => (
          <div key={f.label} style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", borderRadius: 9, border: `0.5px solid ${t.border}`, background: t.pageBg }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>{f.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: t.text }}>{f.label}</div>
              <div style={{ fontSize: 10, color: t.textSub, marginTop: 1, lineHeight: 1.4 }}>{f.detail}</div>
              <div style={{ fontSize: 9, color: t.textFaint, marginTop: 2 }}>
                ~{f.atKm} km from {from.split(",")[0] || "start"} · {f.note}
              </div>
            </div>
            <button
              onClick={() => window.open(f.mapUrl, "_blank")}
              style={{ flexShrink: 0, padding: "4px 9px", borderRadius: 6, border: `0.5px solid ${t.blue}`, background: t.blueLight, color: t.blue, fontSize: 10, fontWeight: 600, cursor: "pointer" }}
            >
              View
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function SmartPlannerPage() {
  const { t, isDark } = useT()

  // ── Input state ──────────────────────────────────────────────────────────
  const [destination,    setDestination]    = useState("")   // "where to?" — asked first
  const [debouncedDest,  setDebouncedDest]  = useState("")   // throttled version for map
  const [searchQuery,    setSearchQuery]    = useState("")   // free-text in Phase A (does NOT switch phase)
  const [from,           setFrom]           = useState("")   // starting point — empty by default
  const [budget,         setBudget]         = useState(8000)
  const [days,           setDays]           = useState(3)
  const [purposes,       setPurposes]       = useState<string[]>([])
  const [addedStops,     setAddedStops]     = useState<string[]>([])  // stops along the route
  const [departureDate,  setDepartureDate]  = useState("")            // YYYY-MM-DD
  const [departureTime,  setDepartureTime]  = useState("")            // HH:MM
  const [showMapPicker,  setShowMapPicker]  = useState(false)   // map picker toggle
  const [mapFullscreen,  setMapFullscreen]  = useState(false)   // fullscreen map overlay

  // ── Phase: input → finding → destinations → planning → itinerary ─────────
  type Phase = "input" | "finding" | "destinations" | "planning" | "itinerary"
  const [phase, setPhase] = useState<Phase>("input")
  const [recommendations, setRecommendations] = useState<Destination[]>([])
  const [selected, setSelected] = useState<Destination | null>(null)
  const [itinerary, setItinerary] = useState<DayPlan[]>([])
  const [activeDay, setActiveDay] = useState(0)
  const [travelMode, setTravelMode] = useState<"driving" | "walking" | "transit">("driving")
  const [mapView, setMapView] = useState(false)
  const itineraryRef = useRef<HTMLDivElement>(null)

  // Debounce destination for map — only fires after 900ms of no typing, min 5 chars
  useEffect(() => {
    if (destination.trim().length < 5) { setDebouncedDest(""); return }
    const id = setTimeout(() => setDebouncedDest(destination.trim()), 900)
    return () => clearTimeout(id)
  }, [destination])

  function togglePurpose(id: string) {
    setPurposes((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id])
  }

  function handleOpenMaps(mode = travelMode, dayIndex?: number) {
    if (!selected) return
    window.open(buildGoogleMapsUrl(from, selected, itinerary, mode, dayIndex), "_blank")
  }

  async function handleReplan() {
    if (!selected) return
    setPhase("planning")
    await new Promise(r => setTimeout(r, 600))
    let plan: DayPlan[]
    try {
      const data = await callAI<{ itinerary: DayPlan[] }>("itinerary", {
        destination: selected.name, days, budget, from, purposes,
      })
      plan = data?.itinerary ?? []
      if (plan.length === 0) throw new Error("empty")
    } catch {
      plan = mockGenerateItinerary(selected, days, from)
    }
    setItinerary(plan)
    setActiveDay(0)
    setPhase("itinerary")
  }

  async function handleFind() {
    setPhase("finding")
    await new Promise((r) => setTimeout(r, 1200))

    let destinations: Destination[]
    try {
      // 1. Flask CSV-ML backend
      const r = await fetch("http://localhost:5000/recommend", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ budget, purposes, days, season: "all", from: from || "Kathmandu", destination }),
        signal: AbortSignal.timeout(3000),
      })
      if (!r.ok) throw new Error("flask offline")
      const j = await r.json()
      destinations = j.destinations ?? []
      if (destinations.length === 0) throw new Error("empty")
    } catch {
      try {
        // 2. Supabase Edge Function (Claude AI)
        const data = await callAI("recommend", { budget, purposes, days, from: from || "Kathmandu", destination })
        destinations = (data as any)?.destinations ?? []
        if (destinations.length === 0) throw new Error("empty")
      } catch {
        // 3. Local TF-IDF mock
        destinations = mockMLRecommend(budget, purposes, days)
      }
    }

    setRecommendations(destinations)
    setPhase("destinations")
  }

  async function handlePlan(dest: Destination) {
    setSelected(dest)
    setPhase("planning")
    await new Promise((r) => setTimeout(r, 900))

    let plan: DayPlan[]
    try {
      // 1. Flask CSV-ML backend
      const r = await fetch("http://localhost:5000/itinerary", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination: dest.name, days, budget, from: from || "Kathmandu", purposes, stops: addedStops }),
        signal: AbortSignal.timeout(4000),
      })
      if (!r.ok) throw new Error("flask offline")
      const j = await r.json()
      plan = j.itinerary ?? []
      if (plan.length === 0) throw new Error("empty")
    } catch {
      try {
        // 2. Supabase Edge Function (Claude AI)
        const data = await callAI("itinerary", { destination: dest.name, days, budget, from: from || "Kathmandu", purposes, stops: addedStops })
        plan = (data as any)?.itinerary ?? []
        if (plan.length === 0) throw new Error("empty")
      } catch {
        // 3. Local TypeScript mock
        plan = mockGenerateItinerary(dest, days, from)
      }
    }

    setItinerary(plan)
    setActiveDay(0)
    setPhase("itinerary")
    setTimeout(() => itineraryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100)
  }

  function handleReset() {
    setPhase("input")
    setRecommendations([])
    setSelected(null)
    setItinerary([])
    setDestination("")
    setFrom("")
    setAddedStops([])
    setSearchQuery("")
    setDebouncedDest("")
    setDepartureDate("")
    setDepartureTime("")
  }

  const totalCost = itinerary.reduce((s, d) => s + d.totalCost, 0)
  const [routeInfo, setRouteInfo] = useState<RouteInfo>({ distance: "—", duration: "—" })

  // Determine what destination to show on the right-panel map
  const mapDest = (() => {
    // Use only the place name + Nepal — district names cause ZERO_RESULTS
    if ((phase === "itinerary" || phase === "planning") && selected) return `${selected.name}, Nepal`
    if (debouncedDest) {
      const clean = debouncedDest.replace(/,\s*Nepal$/i, "").trim()
      return clean + ", Nepal"
    }
    if (phase === "destinations" && recommendations[0]) return `${recommendations[0].name}, Nepal`
    return ""
  })()

  // Build the Google Maps URL for "Open in Google Maps"
  const openMapsUrl = phase === "itinerary" && selected
    ? buildGoogleMapsUrl(from || "Kathmandu", selected, itinerary, travelMode)
    : `https://www.google.com/maps/dir/?api=1` +
      `&origin=${encodeURIComponent((from || "Kathmandu") + ", Nepal")}` +
      `&destination=${encodeURIComponent(mapDest || "Nepal")}` +
      (addedStops.length ? `&waypoints=${addedStops.map(s => encodeURIComponent(s + ", Nepal")).join("|")}` : "") +
      `&travelmode=${travelMode}`
  const inS: React.CSSProperties = {
    height: 38, border: `0.5px solid ${t.border}`, borderRadius: 8,
    padding: "0 12px 0 30px", fontSize: 13, color: t.text,
    background: t.subtle, outline: "none", boxSizing: "border-box", width: "100%",
  }

  return (
    <div style={{ display: "flex", height: "100%", minHeight: "100vh" }}>

      {/* ── Left panel: inputs + recommendations ─────────────────────────── */}
      <div style={{
        width: 380, minWidth: 380, borderRight: `0.5px solid ${t.border}`,
        display: "flex", flexDirection: "column", overflowY: "auto",
        background: t.surface,
      }}>
        {/* Header */}
        <div style={{ padding: "20px 20px 16px", borderBottom: `0.5px solid ${t.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 4 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: t.blueLight, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Bot size={16} color={t.blue} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: t.text }}>Smart planner</div>
              <div style={{ fontSize: 11, color: t.textSub }}>AI destination finder + itinerary builder</div>
            </div>
          </div>
          {/* Step progress */}
          <div style={{ display: "flex", gap: 0, marginTop: 12 }}>
            {[
              { label: "Set preferences", done: phase !== "input" },
              { label: "Choose destination", done: phase === "planning" || phase === "itinerary" },
              { label: "Your itinerary", done: phase === "itinerary" },
            ].map((step, i) => (
              <div key={step.label} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: "50%", fontSize: 10, fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: step.done ? t.green : (i === ["input","finding","destinations","planning","itinerary"].indexOf(phase) || (i === 0 && (phase === "input" || phase === "finding"))) ? t.blue : t.subtle,
                    color: step.done || i <= ["input","finding","destinations","planning","itinerary"].indexOf(phase) ? "#fff" : t.textFaint,
                  }}>
                    {step.done ? "✓" : i + 1}
                  </div>
                  <div style={{ fontSize: 9, color: step.done ? t.green : t.textFaint, marginTop: 3, textAlign: "center", lineHeight: 1.2 }}>
                    {step.label}
                  </div>
                </div>
                {i < 2 && <div style={{ width: 20, height: 1, background: t.border, flexShrink: 0, marginBottom: 14 }} />}
              </div>
            ))}
          </div>
        </div>

        {/* ── Phase A: Suggest popular trips before any destination is entered ── */}
        {!destination && phase === "input" && (
          <div style={{ padding: "14px 16px 16px" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: t.textMid, marginBottom: 10 }}>
              Popular trips in Nepal 🇳🇵
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
              {SUGGESTED_TRIPS.map(trip => (
                <button
                  key={trip.name}
                  onClick={() => setDestination(trip.name)}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "flex-start",
                    padding: "10px 12px", borderRadius: 10, border: `0.5px solid ${t.border}`,
                    background: trip.bg, cursor: "pointer", textAlign: "left",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)" }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "" }}
                >
                  <span style={{ fontSize: 22, marginBottom: 4 }}>{trip.emoji}</span>
                  <div style={{ fontSize: 12, fontWeight: 700, color: t.text, lineHeight: 1.2, marginBottom: 2 }}>{trip.name}</div>
                  <div style={{ fontSize: 9, color: t.textSub, marginBottom: 4 }}>{trip.tag}</div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 8, color: t.textFaint, background: "rgba(255,255,255,0.7)", borderRadius: 4, padding: "1px 5px" }}>{trip.days}</span>
                    <span style={{ fontSize: 8, color: t.textFaint, background: "rgba(255,255,255,0.7)", borderRadius: 4, padding: "1px 5px" }}>{trip.season}</span>
                  </div>
                </button>
              ))}
            </div>
            <div style={{ marginTop: 12, borderTop: `0.5px solid ${t.border}`, paddingTop: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: t.textSub, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Or type any destination
              </label>
              <div style={{ display: "flex", gap: 6 }}>
                <div style={{ position: "relative", flex: 1 }}>
                  <MapPin size={13} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: t.orange }} />
                  <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && searchQuery.trim()) {
                        setDestination(searchQuery.trim())
                        setSearchQuery("")
                      }
                    }}
                    placeholder="e.g. Pokhara, Ilam, Bandipur…"
                    style={{ width: "100%", height: 36, border: `0.5px solid ${t.border}`, borderRadius: 8, padding: "0 10px 0 28px", fontSize: 13, color: t.text, background: t.subtle, outline: "none", boxSizing: "border-box" }}
                  />
                </div>
                <button
                  onClick={() => { if (searchQuery.trim()) { setDestination(searchQuery.trim()); setSearchQuery("") } }}
                  disabled={!searchQuery.trim()}
                  style={{
                    padding: "0 14px", height: 36, borderRadius: 8, border: "none",
                    background: searchQuery.trim() ? t.blue : t.subtle,
                    color: searchQuery.trim() ? "#fff" : t.textFaint,
                    fontSize: 12, fontWeight: 600, cursor: searchQuery.trim() ? "pointer" : "default",
                    flexShrink: 0, transition: "all 0.15s",
                  }}
                >
                  Go →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Phase B: After destination chosen — show route form ── */}
        {destination && (
        <div style={{ padding: "16px 20px", borderBottom: `0.5px solid ${t.border}` }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

            {/* Selected destination chip + change button */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 10, background: t.blueLight, border: `0.5px solid ${t.blue}30` }}>
              <span style={{ fontSize: 18 }}>
                {SUGGESTED_TRIPS.find(t => t.name === destination)?.emoji || "📍"}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: t.blue }}>{destination}</div>
                <div style={{ fontSize: 10, color: t.blue, opacity: 0.7 }}>
                  {SUGGESTED_TRIPS.find(tt => tt.name === destination)?.tag || "Custom destination"}
                </div>
              </div>
              <button
                onClick={() => { setDestination(""); setDebouncedDest(""); setAddedStops([]) }}
                style={{ fontSize: 10, color: t.blue, background: "rgba(24,95,165,0.12)", border: "none", borderRadius: 5, padding: "3px 9px", cursor: "pointer" }}
              >
                Change
              </button>
            </div>

            {/* ── Interactive map picker (kept for "Pick on map" in Starting from) ── */}
            {showMapPicker && (
              <LocationPickerMap
                onOrigin={(name) => setFrom(name)}
                onDestination={(name) => setDestination(name)}
                t={t}
                isDark={isDark}
              />
            )}

            {/* ── Mini route preview map (debounced: fires 900ms after typing stops, min 5 chars) ── */}
            {!showMapPicker && debouncedDest.length >= 5 && (
              <div style={{ borderRadius: 10, overflow: "hidden", border: `0.5px solid ${t.border}`, position: "relative" }}>
                <div style={{ height: 160 }}>
                  <RouteMap
                    origin={from.trim() || "Kathmandu, Nepal"}
                    waypoints={addedStops.filter(Boolean)}
                    destination={debouncedDest + ", Nepal"}
                    travelMode="driving"
                    isDark={isDark}
                    t={t}
                  />
                </div>
                {/* Map label */}
                <div style={{ position: "absolute", top: 6, left: 6, background: "rgba(0,0,0,0.55)", borderRadius: 5, padding: "2px 7px", fontSize: 9, color: "#fff", backdropFilter: "blur(2px)" }}>
                  {from.trim() || "Kathmandu"} → {debouncedDest}
                </div>
              </div>
            )}

            {/* ── Popular stops along the route ── */}
            {destination.trim().length > 2 && (() => {
              const suggestions = getPopularStops(destination).filter(s => !addedStops.includes(s.name))
              if (!suggestions.length) return null
              return (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: t.textFaint, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                    Popular stops on the way
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {suggestions.map(stop => (
                      <div key={stop.name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 8, border: `0.5px solid ${t.border}`, background: t.pageBg }}>
                        <span style={{ fontSize: 16 }}>{stop.emoji}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 500, color: t.text }}>{stop.name}</div>
                          <div style={{ fontSize: 10, color: t.textFaint }}>{stop.note}</div>
                        </div>
                        <button
                          onClick={() => setAddedStops(s => [...s, stop.name])}
                          style={{ padding: "3px 10px", borderRadius: 6, border: `0.5px solid ${t.blue}`, background: t.blueLight, color: t.blue, fontSize: 10, fontWeight: 600, cursor: "pointer" }}
                        >
                          + Add
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Added stops */}
                  {addedStops.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: t.green, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>
                        Added stops ({addedStops.length})
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {addedStops.map(stop => (
                          <div key={stop} style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 20, background: t.greenLight, border: `0.5px solid ${t.green}30` }}>
                            <span style={{ fontSize: 10, color: t.green, fontWeight: 500 }}>{stop}</span>
                            <button onClick={() => setAddedStops(s => s.filter(x => x !== stop))} style={{ background: "none", border: "none", color: t.green, cursor: "pointer", fontSize: 12, lineHeight: 1, padding: 0 }}>×</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}

            {/* ── Starting from (empty by default) ── */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: t.textSub, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>Starting from</label>
              <div style={{ position: "relative" }}>
                <MapPin size={13} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: t.blue }} />
                <input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="Your city or location" style={inS} />
              </div>
            </div>

            {/* ── Departure date + time ── */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: t.textSub, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                🕐 Departure date & time
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <input
                  type="date"
                  value={departureDate}
                  onChange={e => setDepartureDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  style={{ ...inS, padding: "0 10px", cursor: "pointer" }}
                />
                <input
                  type="time"
                  value={departureTime}
                  onChange={e => setDepartureTime(e.target.value)}
                  style={{ ...inS, padding: "0 10px", cursor: "pointer" }}
                />
              </div>
              {departureDate && departureTime && (
                <div style={{ fontSize: 10, color: t.textFaint, marginTop: 4 }}>
                  Departing {new Date(departureDate + "T" + departureTime).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })} at {departureTime}
                </div>
              )}
            </div>

            {/* ── Stops along the route with ETAs ── */}
            {addedStops.length > 0 && (() => {
              const durMatch = routeInfo.duration.match(/(\d+)h\s*(\d+)?m?/)
              const totalDurMin = durMatch ? parseInt(durMatch[1] || "0") * 60 + parseInt(durMatch[2] || "0") : 0
              const hasTime = !!(departureDate && departureTime && totalDurMin)
              const baseDate = hasTime ? new Date(departureDate + "T" + departureTime) : null

              // Hint when stops added but time not entered yet
              if (!hasTime && (!departureDate || !departureTime)) {
                return (
                  <div style={{ padding: "8px 10px", borderRadius: 8, background: t.amberLight, border: `0.5px solid ${t.amber}30`, fontSize: 11, color: t.amber, display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 14 }}>💡</span>
                    Enter departure date & time above to see estimated arrival at each stop and get hotel suggestions.
                  </div>
                )
              }

              return (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: t.textSub, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
                    Route stops ({addedStops.length})
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {addedStops.map((stop, i) => {
                      const fraction = (i + 1) / (addedStops.length + 1)
                      const eta = hasTime && baseDate ? new Date(baseDate.getTime() + fraction * totalDurMin * 60 * 1000) : null
                      const etaStr = eta ? eta.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : null
                      const needsHotel = eta ? (eta.getHours() >= 19 || eta.getHours() < 6) : false
                      const hotels = needsHotel ? getHotelsForStop(stop) : []

                      return (
                        <div key={`route-stop-${i}`}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 8, background: needsHotel ? "#FBF3E2" : t.pageBg, border: `0.5px solid ${needsHotel ? "#BA751730" : t.border}` }}>
                            <div style={{ width: 20, height: 20, borderRadius: "50%", background: t.green, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                              {i + 1}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 11, fontWeight: 600, color: t.text }}>{stop.split(",")[0]}</div>
                              {etaStr && (
                                <div style={{ fontSize: 10, color: needsHotel ? "#BA7517" : t.textSub, marginTop: 1 }}>
                                  {needsHotel ? "🌙 ETA " : "🕐 ETA "}{etaStr}
                                  {needsHotel && " — hotel stop recommended"}
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => setAddedStops(s => s.filter((_, idx) => idx !== i))}
                              style={{ width: 20, height: 20, borderRadius: "50%", border: `0.5px solid ${t.border}`, background: t.surface, color: t.textFaint, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                            >
                              ×
                            </button>
                          </div>

                          {/* Hotel suggestions when overnight stop needed */}
                          {needsHotel && hotels.length > 0 && (
                            <div style={{ margin: "4px 0 0 28px", padding: "8px 10px", background: "#FBF3E2", borderRadius: "0 0 8px 8px", border: `0.5px solid #BA751730`, borderTop: "none" }}>
                              <div style={{ fontSize: 9, fontWeight: 700, color: "#BA7517", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                                🏨 Hotels at {stop.split(",")[0]}
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                                {hotels.slice(0, 2).map(hotel => (
                                  <div key={hotel.name} style={{ background: "#ffffff", borderRadius: 7, padding: "7px 9px", border: "0.5px solid #BA751720" }}>
                                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6 }}>
                                      <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 11, fontWeight: 600, color: t.text }}>
                                          {hotel.stars > 0 && "★".repeat(hotel.stars) + " "}
                                          {hotel.name}
                                        </div>
                                        <div style={{ fontSize: 10, color: t.textSub, marginTop: 1 }}>{hotel.cost}</div>
                                        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3 }}>
                                          <span style={{ fontSize: 10 }}>📞</span>
                                          <span style={{ fontSize: 10, color: t.blue, fontWeight: 500 }}>{hotel.phone}</span>
                                        </div>
                                      </div>
                                      <button
                                        onClick={() => window.open(hotel.mapUrl, "_blank")}
                                        style={{ flexShrink: 0, padding: "4px 8px", borderRadius: 6, border: `0.5px solid ${t.blue}`, background: t.blueLight, color: t.blue, fontSize: 9, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
                                      >
                                        View on Maps
                                      </button>
                                    </div>
                                  </div>
                                ))}
                                <button
                                  onClick={() => window.open(`https://www.google.com/maps/search/hotels+${encodeURIComponent(stop + " Nepal")}`, "_blank")}
                                  style={{ fontSize: 9, color: t.blue, background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline", textAlign: "left", padding: 0 }}
                                >
                                  See all hotels near {stop.split(",")[0]} →
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })()}

            {/* ── Destination hotel suggestion (when ETA at final destination is late) ── */}
            {destination && departureDate && departureTime && routeInfo.duration !== "—" && (() => {
              const durMatch = routeInfo.duration.match(/(\d+)h\s*(\d+)?m?/)
              const totalDurMin = durMatch ? parseInt(durMatch[1] || "0") * 60 + parseInt(durMatch[2] || "0") : 0
              if (!totalDurMin) return null
              const destEta = new Date(new Date(departureDate + "T" + departureTime).getTime() + totalDurMin * 60 * 1000)
              const destHour = destEta.getHours()
              const needsHotel = destHour >= 18 || destHour < 6
              if (!needsHotel) return null
              const destHotels = getHotelsForStop(destination)
              const etaStr = destEta.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
              return (
                <div style={{ borderRadius: 10, background: "#EBF2FB", border: `0.5px solid ${t.blue}30`, padding: "10px 12px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: t.blue, marginBottom: 6 }}>
                    🏨 You'll arrive in {destination.split(",")[0]} around {etaStr} — book a hotel
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {destHotels.slice(0, 2).map(hotel => (
                      <div key={hotel.name} style={{ background: "#fff", borderRadius: 8, padding: "8px 10px", border: `0.5px solid ${t.blue}20`, display: "flex", alignItems: "flex-start", gap: 8 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: t.text }}>
                            {hotel.stars > 0 ? "★".repeat(hotel.stars) + " " : ""}{hotel.name}
                          </div>
                          <div style={{ fontSize: 10, color: t.textSub, marginTop: 1 }}>{hotel.cost}</div>
                          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3 }}>
                            <span style={{ fontSize: 11 }}>📞</span>
                            <span style={{ fontSize: 10, color: t.blue, fontWeight: 500 }}>{hotel.phone}</span>
                          </div>
                        </div>
                        <button onClick={() => window.open(hotel.mapUrl, "_blank")} style={{ flexShrink: 0, padding: "5px 10px", borderRadius: 6, border: "none", background: t.blue, color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                          View on Maps
                        </button>
                      </div>
                    ))}
                    <button onClick={() => window.open(`https://www.google.com/maps/search/hotels+${encodeURIComponent(destination + " Nepal")}`, "_blank")} style={{ fontSize: 10, color: t.blue, background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline", textAlign: "left", padding: 0 }}>
                      See all hotels in {destination.split(",")[0]} →
                    </button>
                  </div>
                </div>
              )
            })()}

            {/* Budget + Days */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: t.textSub, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>Budget (Rs)</label>
                <div style={{ position: "relative" }}>
                  <Wallet size={13} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: t.textFaint }} />
                  <input type="number" value={budget} min={500} step={500} onChange={(e) => setBudget(Number(e.target.value))} style={inS} />
                </div>
                <div style={{ display: "flex", gap: 3, marginTop: 4 }}>
                  {[3000, 5000, 10000].map((v) => (
                    <button key={v} onClick={() => setBudget(v)} style={{ padding: "2px 6px", borderRadius: 4, border: `0.5px solid ${budget === v ? t.blue : t.border}`, background: budget === v ? t.blueLight : "transparent", color: budget === v ? t.blue : t.textFaint, fontSize: 9, cursor: "pointer" }}>
                      Rs {v / 1000}k
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: t.textSub, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>Days</label>
                <div style={{ position: "relative" }}>
                  <Clock size={13} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: t.textFaint }} />
                  <input type="number" value={days} min={1} max={14} onChange={(e) => setDays(Math.max(1, Number(e.target.value)))} style={inS} />
                </div>
                <div style={{ display: "flex", gap: 3, marginTop: 4 }}>
                  {[1, 2, 3, 5].map((v) => (
                    <button key={v} onClick={() => setDays(v)} style={{ padding: "2px 6px", borderRadius: 4, border: `0.5px solid ${days === v ? t.blue : t.border}`, background: days === v ? t.blueLight : "transparent", color: days === v ? t.blue : t.textFaint, fontSize: 9, cursor: "pointer" }}>
                      {v}d
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Interests */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: t.textSub, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Travel interests</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {PURPOSE_OPTIONS.map((opt) => {
                  const active = purposes.includes(opt.id)
                  return (
                    <button key={opt.id} onClick={() => togglePurpose(opt.id)} style={{
                      display: "flex", alignItems: "center", gap: 4, padding: "5px 10px",
                      borderRadius: 20, border: `0.5px solid ${active ? t.blue : t.border}`,
                      background: active ? t.blueLight : t.pageBg,
                      color: active ? t.blue : t.textSub,
                      fontSize: 11, fontWeight: active ? 600 : 400, cursor: "pointer", transition: "all 0.12s",
                    }}>
                      {opt.icon} {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={phase === "input" || phase === "destinations" ? handleFind : handleReset}
              disabled={phase === "finding" || phase === "planning"}
              style={{
                width: "100%", height: 40, borderRadius: 9, border: "none",
                background: (phase === "finding" || phase === "planning") ? t.blueLight : t.blue,
                color: (phase === "finding" || phase === "planning") ? t.blue : "#fff",
                fontSize: 13, fontWeight: 600, cursor: (phase === "finding" || phase === "planning") ? "default" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                transition: "all 0.15s",
              }}
            >
              {phase === "finding"
                ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Finding destinations…</>
                : phase === "planning"
                ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Building itinerary…</>
                : phase === "itinerary"
                ? "← Start over"
                : <><Sparkles size={14} /> Find destinations</>
              }
            </button>
          </div>
        </div>
        )} {/* end destination && */}

        {/* Facilities on route — appears once Google Maps calculates distance/time */}
        {destination && routeInfo.distance !== "—" && (
          <FacilitiesOnRoute
            from={from || "Kathmandu"}
            destination={destination}
            routeInfo={routeInfo}
            t={t}
          />
        )}

        {/* Recommendation cards */}
        {(phase === "destinations" || phase === "planning" || phase === "itinerary") && (
          <div style={{ padding: "14px 20px 20px", flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: t.textSub, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {recommendations.length} destinations ranked by your model
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {recommendations.map((dest, i) => {
                const isActive = selected?.name === dest.name
                const rankColor = i === 0 ? t.amber : i === 1 ? t.textSub : t.textFaint
                return (
                  <div
                    key={dest.name}
                    onClick={() => handlePlan(dest)}
                    style={{
                      border: `${isActive ? "1.5px" : "0.5px"} solid ${isActive ? t.blue : t.border}`,
                      borderRadius: 10, padding: "11px 13px", cursor: "pointer",
                      background: isActive ? t.blueLight : t.pageBg,
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = t.subtle }}
                    onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = t.pageBg }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <span style={{ fontSize: 18 }}>{dest.emoji}</span>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{dest.name}</div>
                          <div style={{ fontSize: 10, color: t.textFaint }}>{dest.district}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: rankColor }}>#{i + 1}</div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: t.blue }}>Rs {dest.costPerDay.toLocaleString()}/day</div>
                      </div>
                    </div>
                    <ScoreBar score={dest.score} color={isActive ? t.blue : t.blueMid} />
                    <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
                      {dest.category.map((c) => (
                        <span key={c} style={{ fontSize: 9, color: t.textSub, background: t.surface, border: `0.5px solid ${t.border}`, borderRadius: 4, padding: "1px 5px", textTransform: "capitalize" }}>{c}</span>
                      ))}
                    </div>
                    {isActive && (
                      <div style={{ marginTop: 6, fontSize: 10, fontWeight: 600, color: t.blue }}>
                        ✦ Generating itinerary…
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Fullscreen map overlay ────────────────────────────────────────── */}
      {mapFullscreen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 500, display: "flex", flexDirection: "column", background: t.surface }}>
          {/* Header */}
          <div style={{ height: 48, display: "flex", alignItems: "center", gap: 10, padding: "0 18px", borderBottom: `0.5px solid ${t.border}`, flexShrink: 0 }}>
            <span style={{ fontSize: 16 }}>🗺</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>Nepal — Interactive Map</div>
              <div style={{ fontSize: 10, color: t.textSub }}>Tap to set starting point or destination · auto-switches mode after each pick</div>
            </div>
            <button
              onClick={() => setMapFullscreen(false)}
              style={{ marginLeft: "auto", padding: "5px 14px", borderRadius: 8, border: `0.5px solid ${t.border}`, background: t.subtle, color: t.textMid, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
            >
              ✕ Close
            </button>
          </div>
          {/* Full map */}
          <div style={{ flex: 1, overflow: "hidden" }}>
            <LocationPickerMap onOrigin={setFrom} onDestination={setDestination} t={t} isDark={isDark} />
          </div>
          {/* Bottom status strip */}
          {(from || destination) && (
            <div style={{ height: 44, display: "flex", alignItems: "center", gap: 16, padding: "0 18px", borderTop: `0.5px solid ${t.border}`, background: t.surface, flexShrink: 0 }}>
              {from && <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: t.blue }} /><span style={{ fontSize: 12, color: t.text }}>{from}</span></div>}
              {from && destination && <ArrowRight size={12} color={t.textFaint} />}
              {destination && <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: t.orange }} /><span style={{ fontSize: 12, color: t.text }}>{destination}</span></div>}
              <button onClick={() => setMapFullscreen(false)} style={{ marginLeft: "auto", padding: "5px 14px", borderRadius: 7, border: "none", background: t.blue, color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                Done →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Itinerary in left panel (shown below recommendations) ──────────── */}
      {phase === "itinerary" && selected && itinerary.length > 0 && (() => {
        const day = itinerary[activeDay]
        return (
          <div style={{ borderTop: `0.5px solid ${t.border}`, padding: "14px 16px", background: t.surface, overflowY: "auto", maxHeight: "55vh" }}>
            {/* Destination header */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 22 }}>{selected.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{selected.name}</div>
                <div style={{ fontSize: 10, color: t.textSub }}>{days} days · Rs {budget.toLocaleString()} · from {from || "Kathmandu"}</div>
              </div>
              <button onClick={handleReset} style={{ fontSize: 10, color: t.textSub, background: t.subtle, border: `0.5px solid ${t.border}`, borderRadius: 5, padding: "3px 8px", cursor: "pointer" }}>
                ← New trip
              </button>
            </div>

            {/* Day tabs */}
            <div style={{ display: "flex", gap: 4, marginBottom: 12, flexWrap: "wrap" }}>
              {itinerary.map((d, i) => (
                <button key={`lt-day-${d.day}`} onClick={() => setActiveDay(i)} style={{
                  padding: "4px 12px", borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: "pointer",
                  border: `0.5px solid ${activeDay === i ? t.blue : t.border}`,
                  background: activeDay === i ? t.blue : t.surface,
                  color: activeDay === i ? "#fff" : t.textSub,
                }}>
                  Day {d.day}
                </button>
              ))}
            </div>

            {/* Active day activities */}
            {day && (
              <div style={{ background: t.pageBg, borderRadius: 10, padding: "10px 12px", marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: t.textMid, marginBottom: 8 }}>{day.theme}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {day.activities.map((act, ai) => (
                    <div key={`la-${ai}`} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <span style={{ fontSize: 14 }}>{act.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                          <span style={{ fontSize: 9, color: t.textFaint, minWidth: 32 }}>{act.time}</span>
                          <span style={{ fontSize: 11, fontWeight: 500, color: t.text }}>{act.title}</span>
                        </div>
                        <div style={{ fontSize: 10, color: t.textSub, paddingLeft: 38 }}>{act.note}</div>
                      </div>
                      {act.cost > 0 && <span style={{ fontSize: 10, color: t.textSub, flexShrink: 0 }}>Rs {act.cost.toLocaleString()}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cost summary */}
            <div style={{ background: t.blueLight, borderRadius: 10, padding: "10px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 11, color: t.blue }}>
                {budget >= totalCost ? `✓ Within budget — Rs ${(budget - totalCost).toLocaleString()} remaining` : `⚠ Rs ${(totalCost - budget).toLocaleString()} over budget`}
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 9, color: t.blue, opacity: 0.7 }}>Total est.</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: t.blue }}>Rs {totalCost.toLocaleString()}</div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Right panel: always-visible large Google Map ──────────────────── */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>

        {/* ── Full-height Google Map (always visible) ── */}
        <div style={{ position: "absolute", inset: 0 }}>
          {phase === "itinerary" && selected ? (
            <ItineraryMap dest={selected} itinerary={itinerary} activeDay={activeDay} from={from || "Kathmandu"} isDark={isDark} t={t} />
          ) : mapDest ? (
            <RouteMap
              origin={(from || "Kathmandu") + (from.toLowerCase().includes("nepal") ? "" : ", Nepal")}
              waypoints={addedStops.filter(Boolean)}
              destination={mapDest}
              travelMode={travelMode}
              isDark={isDark} t={t}
              onInfo={setRouteInfo}
            />
          ) : (
            <div style={{ width: "100%", height: "100%", background: t.subtle, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
              <div style={{ fontSize: 52 }}>🗺</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: t.textMid }}>Enter a destination to preview the route</div>
              <div style={{ fontSize: 12, color: t.textFaint, maxWidth: 280, textAlign: "center", lineHeight: 1.6 }}>
                Type your destination on the left — the map will show the route and popular stops along the way
              </div>
            </div>
          )}
        </div>

        {/* ── Top overlay: route label + loading + day tabs + Open in Google Maps ── */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 10, padding: "10px 12px", display: "flex", alignItems: "center", gap: 8, pointerEvents: "none" }}>
          {/* Route summary */}
          {mapDest && (
            <div style={{ pointerEvents: "all", background: "rgba(255,255,255,0.92)", backdropFilter: "blur(8px)", borderRadius: 20, padding: "5px 12px", fontSize: 11, display: "flex", alignItems: "center", gap: 6, border: "0.5px solid rgba(255,255,255,0.5)", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#185FA5" }} />
              <span style={{ color: "#374151" }}>{from || "Kathmandu"}</span>
              <ArrowRight size={10} color="#9CA3AF" />
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#D85A30" }} />
              <span style={{ color: "#374151" }}>{destination || selected?.name || ""}</span>
              {addedStops.length > 0 && (
                <span style={{ background: "#EAF2E0", color: "#3B6D11", borderRadius: 10, padding: "1px 6px", fontSize: 9, fontWeight: 600 }}>
                  +{addedStops.length} stop{addedStops.length > 1 ? "s" : ""}
                </span>
              )}
            </div>
          )}
          {/* Loading pill */}
          {(phase === "finding" || phase === "planning") && (
            <div style={{ pointerEvents: "all", background: "rgba(24,95,165,0.9)", backdropFilter: "blur(4px)", borderRadius: 20, padding: "5px 12px", fontSize: 11, color: "#fff", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 2px 8px rgba(24,95,165,0.3)" }}>
              <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} />
              {phase === "finding" ? "Analysing destinations…" : `Building ${days}-day itinerary…`}
            </div>
          )}
          {/* Right side: day tabs + button */}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5, pointerEvents: "all" }}>
            {phase === "itinerary" && itinerary.length > 1 && itinerary.map((_, i) => (
              <button key={`rtab-${i}`} onClick={() => setActiveDay(i)} style={{
                padding: "5px 10px", borderRadius: 7, cursor: "pointer", fontSize: 11, fontWeight: 600,
                border: `0.5px solid ${activeDay === i ? "rgba(24,95,165,0.8)" : "rgba(255,255,255,0.7)"}`,
                background: activeDay === i ? "rgba(24,95,165,0.88)" : "rgba(255,255,255,0.88)",
                color: activeDay === i ? "#fff" : "#374151", backdropFilter: "blur(4px)",
              }}>Day {i + 1}</button>
            ))}
            {/* Travel mode (itinerary) */}
            {phase === "itinerary" && (
              <div style={{ background: "rgba(255,255,255,0.9)", backdropFilter: "blur(6px)", borderRadius: 8, padding: "4px", display: "flex", gap: 3, border: "0.5px solid rgba(255,255,255,0.6)" }}>
                {[{ v: "driving", e: "🚗" }, { v: "walking", e: "🚶" }, { v: "transit", e: "🚌" }].map(m => (
                  <button key={m.v} onClick={() => setTravelMode(m.v as any)} style={{
                    width: 28, height: 28, borderRadius: 6, cursor: "pointer", fontSize: 14,
                    border: `0.5px solid ${travelMode === m.v ? "#185FA5" : "transparent"}`,
                    background: travelMode === m.v ? "#EBF2FB" : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>{m.e}</button>
                ))}
              </div>
            )}
            {/* Open in Google Maps */}
            {mapDest && (
              <button onClick={() => window.open(openMapsUrl, "_blank")} style={{
                padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                background: "rgba(24,95,165,0.9)", color: "#fff", fontSize: 11, fontWeight: 700,
                display: "flex", alignItems: "center", gap: 5, backdropFilter: "blur(4px)",
                boxShadow: "0 2px 10px rgba(24,95,165,0.35)",
              }}>
                🗺 Open in Google Maps
              </button>
            )}
          </div>
        </div>

        {/* ── Bottom-left: route distance & time chips ── */}
        {routeInfo.distance !== "—" && (
          <div style={{ position: "absolute", bottom: debouncedDest && phase !== "itinerary" ? 88 : 12, left: 12, zIndex: 10, display: "flex", gap: 6 }}>
            {[{ label: "Distance", val: routeInfo.distance }, { label: "Est. time", val: routeInfo.duration }].map(item => (
              <div key={item.label} style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(8px)", borderRadius: 8, padding: "6px 12px", border: "0.5px solid rgba(255,255,255,0.6)", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
                <div style={{ fontSize: 9, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>{item.label}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{item.val}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Bottom: popular stops strip ── */}
        {debouncedDest && phase !== "itinerary" && (() => {
          const stops = getPopularStops(debouncedDest).slice(0, 5)
          if (!stops.length) return null
          return (
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 10, padding: "0 12px 12px" }}>
              <div style={{ background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)", borderRadius: 12, padding: "10px 12px", border: "0.5px solid rgba(255,255,255,0.8)", boxShadow: "0 -4px 20px rgba(0,0,0,0.08)" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#374151", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Popular stops on this route — click to add
                </div>
                <div style={{ display: "flex", gap: 6, overflowX: "auto" }}>
                  {stops.map(stop => {
                    const added = addedStops.includes(stop.name)
                    return (
                      <div
                        key={stop.name}
                        onClick={() => !added && setAddedStops(s => [...s, stop.name])}
                        style={{
                          flexShrink: 0, display: "flex", alignItems: "center", gap: 6,
                          padding: "6px 12px", borderRadius: 20, cursor: added ? "default" : "pointer",
                          border: `0.5px solid ${added ? "#3B6D1140" : "#E5E7EB"}`,
                          background: added ? "#EAF2E0" : "#F9FAFB",
                          transition: "all 0.15s",
                        }}
                        onMouseEnter={e => { if (!added) e.currentTarget.style.background = "#EBF2FB" }}
                        onMouseLeave={e => { if (!added) e.currentTarget.style.background = "#F9FAFB" }}
                      >
                        <span style={{ fontSize: 16 }}>{stop.emoji}</span>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 600, color: added ? "#3B6D11" : "#374151" }}>{stop.name}</div>
                          <div style={{ fontSize: 9, color: added ? "#3B6D11" : "#9CA3AF" }}>{stop.note}</div>
                        </div>
                        <span style={{ fontSize: added ? 13 : 16, color: added ? "#3B6D11" : "#9CA3AF", marginLeft: 2, lineHeight: 1 }}>
                          {added ? "✓" : "+"}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })()}
      </div>

      {/* Floating trip assistant — appears after itinerary is generated */}
      {phase === "itinerary" && selected && (
        <FloatingTripAssistant
          from={from}
          dest={selected}
          itinerary={itinerary}
          budget={budget}
          days={days}
          travelMode={travelMode}
          t={t}
          onSetDays={(n) => setDays(n)}
          onSetBudget={(n) => setBudget(n)}
          onSetTravelMode={(m) => setTravelMode(m as "driving" | "walking" | "transit")}
          onReplan={handleReplan}
          onOpenMaps={handleOpenMaps}
        />
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const navItems: { id: Page; label: string; icon: React.ElementType }[] = [
  { id: "dashboard", label: "Dashboard", icon: BarChart2 },
  { id: "pathfinder", label: "Pathfinder", icon: Compass },
  { id: "smart-planner", label: "Smart planner", icon: Bot },
  { id: "nearby", label: "Nearby", icon: MapPin },
  { id: "live-tracking", label: "Live tracking", icon: Navigation },
  { id: "book", label: "Book & reserve", icon: BookOpen },
]

function Sidebar({
  activePage, setActivePage, collapsed, setCollapsed,
}: {
  activePage: Page
  setActivePage: (p: Page) => void
  collapsed: boolean
  setCollapsed: (v: boolean) => void
}) {
  const { t, isDark, toggleDark } = useT()
  const W = collapsed ? 60 : 200

  return (
    <aside style={{
      width: W, minWidth: W, height: "100vh",
      background: t.sideBg,
      borderRight: `0.5px solid ${t.border}`,
      display: "flex", flexDirection: "column",
      position: "sticky", top: 0,
      transition: "width 0.22s cubic-bezier(0.4,0,0.2,1), min-width 0.22s cubic-bezier(0.4,0,0.2,1)",
      overflow: "hidden",
    }}>
      {/* Logo */}
      <div style={{
        padding: collapsed ? "20px 0" : "22px 18px 18px",
        display: "flex", alignItems: "center",
        justifyContent: collapsed ? "center" : "flex-start",
        gap: 9, transition: "padding 0.22s",
        overflow: "hidden", flexShrink: 0,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, background: t.blue,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <Mountain size={16} color="#ffffff" />
        </div>
        {!collapsed && (
          <div style={{ overflow: "hidden" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: t.text, letterSpacing: "-0.02em", whiteSpace: "nowrap" }}>
              Gantabya
            </div>
            <div style={{ fontSize: 9, color: t.textFaint, lineHeight: 1.35, whiteSpace: "nowrap" }}>
              Ministry of Tourism<br />Bagmati Province
            </div>
          </div>
        )}
      </div>

      <div style={{ height: "0.5px", background: t.border, margin: collapsed ? "0 10px" : "0 18px" }} />

      {/* Nav */}
      <nav style={{ flex: 1, padding: collapsed ? "12px 6px" : "12px 10px", overflowY: "auto", overflowX: "hidden" }}>
        {!collapsed && (
          <div style={{ fontSize: 9, fontWeight: 600, color: t.textFaint, textTransform: "uppercase", letterSpacing: "0.08em", padding: "4px 8px 8px", whiteSpace: "nowrap" }}>
            Navigation
          </div>
        )}
        {navItems.map((item) => {
          const Icon = item.icon
          const active = activePage === item.id
          return (
            <div key={item.id} style={{ position: "relative" }}>
              <button
                title={collapsed ? item.label : undefined}
                onClick={() => setActivePage(item.id)}
                style={{
                  width: "100%", display: "flex", alignItems: "center",
                  gap: collapsed ? 0 : 9,
                  justifyContent: collapsed ? "center" : "flex-start",
                  padding: collapsed ? "9px 0" : "8px 10px",
                  borderRadius: 8, border: "none",
                  background: active ? t.blueLight : "transparent",
                  color: active ? t.blue : t.textSub,
                  fontSize: 12, fontWeight: active ? 600 : 400,
                  cursor: "pointer", textAlign: "left", marginBottom: 2,
                  position: "relative", transition: "all 0.12s",
                  boxSizing: "border-box", whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = t.subtle }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent" }}
              >
                {active && (
                  <div style={{
                    position: "absolute", left: 0, top: "20%", bottom: "20%",
                    width: 3, borderRadius: "0 2px 2px 0", background: t.blue,
                  }} />
                )}
                <Icon size={15} strokeWidth={active ? 2 : 1.5} style={{ flexShrink: 0 }} />
                {!collapsed && item.label}
              </button>
            </div>
          )
        })}
      </nav>

      <div style={{ height: "0.5px", background: t.border, margin: collapsed ? "0 10px" : "0 18px" }} />

      {/* Footer controls */}
      <div style={{ padding: collapsed ? "12px 6px" : "12px 10px", display: "flex", flexDirection: "column", gap: 4 }}>
        {/* Dark mode toggle */}
        <button
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          onClick={toggleDark}
          style={{
            display: "flex", alignItems: "center",
            gap: collapsed ? 0 : 9,
            justifyContent: collapsed ? "center" : "flex-start",
            padding: collapsed ? "9px 0" : "8px 10px",
            borderRadius: 8, border: "none",
            background: "transparent", color: t.textSub,
            fontSize: 12, cursor: "pointer", width: "100%",
            transition: "background 0.12s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = t.subtle)}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          {isDark
            ? <Sun size={15} strokeWidth={1.5} style={{ flexShrink: 0 }} />
            : <Moon size={15} strokeWidth={1.5} style={{ flexShrink: 0 }} />}
          {!collapsed && <span>{isDark ? "Light mode" : "Dark mode"}</span>}
        </button>

        {/* Collapse toggle */}
        <button
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={() => setCollapsed(!collapsed)}
          style={{
            display: "flex", alignItems: "center",
            gap: collapsed ? 0 : 9,
            justifyContent: collapsed ? "center" : "flex-start",
            padding: collapsed ? "9px 0" : "8px 10px",
            borderRadius: 8, border: "none",
            background: "transparent", color: t.textSub,
            fontSize: 12, cursor: "pointer", width: "100%",
            transition: "background 0.12s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = t.subtle)}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          {collapsed
            ? <PanelLeftOpen size={15} strokeWidth={1.5} style={{ flexShrink: 0 }} />
            : <PanelLeftClose size={15} strokeWidth={1.5} style={{ flexShrink: 0 }} />}
          {!collapsed && <span>Collapse sidebar</span>}
        </button>
      </div>

      {/* User */}
      <div style={{ padding: collapsed ? "10px 6px 16px" : "10px 18px 16px", borderTop: `0.5px solid ${t.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: collapsed ? "center" : "flex-start" }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: t.subtle, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
            🏔
          </div>
          {!collapsed && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: t.textMid, whiteSpace: "nowrap" }}>Admin user</div>
              <div style={{ fontSize: 10, color: t.textFaint }}>Province officer</div>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [activePage, setActivePage] = useState<Page>("dashboard")
  const [collapsed, setCollapsed] = useState(false)
  const [isDark, setIsDark] = useState(false)

  const ctxValue: Ctx = {
    t: isDark ? dark : light,
    isDark,
    toggleDark: () => setIsDark((d) => !d),
  }

  const { t } = ctxValue

  return (
    <ThemeCtx.Provider value={ctxValue}>
      <div style={{ display: "flex", height: "100vh", fontFamily: "'Inter', system-ui, sans-serif", background: t.pageBg, transition: "background 0.3s" }}>
        <Sidebar
          activePage={activePage}
          setActivePage={setActivePage}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
        />
        <main style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
          {activePage === "dashboard" && <DashboardPage />}
          {activePage === "pathfinder" && <PathfinderPage />}
          {activePage === "trip-planner" && <TripPlannerPage />}
          {activePage === "nearby" && <NearbyPage />}
          {activePage === "live-tracking" && <LiveTrackingPage />}
          {activePage === "book" && <BookingPage />}
          {activePage === "smart-planner" && <SmartPlannerPage />}
        </main>

        <style>{`
          ::-webkit-scrollbar { width: 5px; height: 5px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: ${t.subtle}; border-radius: 10px; }
          ::-webkit-scrollbar-thumb:hover { background: ${t.textFaint}; }
          * { box-sizing: border-box; }
          input::placeholder { color: ${t.textFaint}; }
        `}</style>
      </div>
    </ThemeCtx.Provider>
  )
}
