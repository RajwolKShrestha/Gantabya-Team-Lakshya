import { useState, createContext, useContext, useRef, useEffect, Component } from "react"

// ── Error boundary — prevents map errors from blanking the whole page ─────────
class MapBoundary extends Component<{ children: React.ReactNode }, { err: boolean }> {
  state = { err: false }
  static getDerivedStateFromError() { return { err: true } }
  componentDidCatch(e: Error) { console.error("[MapBoundary]", e.message) }
  render() {
    if (this.state.err) return (
      <div style={{ width:"100%", height:"100%", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:10, background:"#F2F5F9" }}>
        <div style={{ fontSize:32 }}>🗺</div>
        <div style={{ fontSize:13, color:"#374151", fontWeight:600 }}>Map failed to load</div>
        <button onClick={() => this.setState({ err:false })} style={{ padding:"6px 16px", borderRadius:8, border:"0.5px solid #185FA5", background:"#EBF2FB", color:"#185FA5", fontSize:12, fontWeight:600, cursor:"pointer" }}>
          Retry
        </button>
      </div>
    )
    return this.props.children
  }
}
import { callAI } from "../lib/supabase"

// Suppress Google Maps deprecation warnings for DirectionsService / DirectionsRenderer.
// These APIs still work and won't be discontinued for ≥12 months (as of Feb 2026 notice).
// Remove this block when migrating to google.maps.routes.computeRoutes.
;(() => {
  const _w = console.warn.bind(console)
  console.warn = (...a: unknown[]) => {
    const m = String(a[0] ?? "")
    if (
    m.includes("DirectionsService is deprecated") ||
    m.includes("DirectionsRenderer is deprecated") ||
    m.includes("google.maps.Marker is deprecated") ||
    m.includes("PlacesService is not available to new customers")
  ) return
    _w(...a)
  }
})()
import {
  BarChart2, Compass, Calendar, MapPin,
  BookOpen, Users, Building2, Wallet, ShieldCheck,
  Wifi, Car, Coffee, Star, Sparkles, Clock,
  Fuel, Hospital, CheckCircle2, ChevronRight,
  ArrowRight, Route, Bed, Mountain, Sun, Moon,
  PanelLeftClose, PanelLeftOpen, Bot, Send, MapPinned,
  Landmark, TreePine, Scroll, Camera, Loader2, Utensils
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

interface NavRequest { origin: string; dest: string }
interface Ctx {
  t: Theme; isDark: boolean; isMobile: boolean; toggleDark: () => void
  navigateTo: (page: Page, nav?: NavRequest) => void
  pendingNav: NavRequest | null
  clearNav: () => void
}
const ThemeCtx = createContext<Ctx>({
  t: light, isDark: false, isMobile: false, toggleDark: () => {},
  navigateTo: () => {}, pendingNav: null, clearNav: () => {},
})
const useT = () => useContext(ThemeCtx)

// Detect mobile viewport with resize listener
function useIsMobile(breakpoint = 768): boolean {
  const [mobile, setMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < breakpoint)
  useEffect(() => {
    const handler = () => setMobile(window.innerWidth < breakpoint)
    window.addEventListener("resize", handler)
    return () => window.removeEventListener("resize", handler)
  }, [breakpoint])
  return mobile
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Page = "dashboard" | "pathfinder" | "smart-planner" | "nearby" | "book"
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
  const { t, isMobile } = useT()
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
    <div style={{ padding: "0 0 28px", maxWidth: isMobile ? "100%" : 1140, width: "100%", margin: "0 auto" }}>

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
          <div style={{ display: "flex", alignItems: "baseline", gap: isMobile ? 8 : 14, marginBottom: 6, flexWrap: "wrap" }}>
            <h1 style={{
              fontSize: isMobile ? 34 : 52, fontWeight: 800, color: "#ffffff", margin: 0, lineHeight: 1,
              letterSpacing: "-0.03em", textShadow: "0 2px 24px rgba(0,0,0,0.5)",
            }}>
              Gantabya
            </h1>
            <span style={{ fontSize: isMobile ? 14 : 20, fontWeight: 300, color: "rgba(255,255,255,0.5)", letterSpacing: "0.04em" }}>
              गन्तव्य
            </span>
          </div>

          {/* Subtitle */}
          <p style={{ fontSize: isMobile ? 12 : 14, color: "rgba(255,255,255,0.72)", margin: "0 0 16px", fontWeight: 400, maxWidth: 440, lineHeight: 1.5, textShadow: "0 1px 8px rgba(0,0,0,0.4)" }}>
            Official tourism platform for Nepal's seven provinces — discover, plan, and navigate.
          </p>

          {/* Quick stats */}
          <div style={{ display: "flex", gap: isMobile ? 16 : 28, flexWrap: "wrap" }}>
            {[
              { value: "7",    label: "Provinces" },
              { value: "124+", label: "Destinations" },
              { value: "4.8M", label: "Visitors" },
              { value: "7",    label: "UNESCO" },
            ].map((item, i) => (
              <div key={item.label} style={{ display: "flex", flexDirection: "column", gap: 2, paddingRight: isMobile ? 16 : 28, borderRight: i < 3 ? "1px solid rgba(255,255,255,0.15)" : "none" }}>
                <div style={{ fontSize: isMobile ? 16 : 22, fontWeight: 800, color: "#ffffff", lineHeight: 1 }}>{item.value}</div>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: isMobile ? "0 12px" : "0 32px" }}>

      {/* ── Province selector ── */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: t.textFaint, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
          Select province
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: isMobile ? "nowrap" : "wrap", overflowX: isMobile ? "auto" : "visible", paddingBottom: isMobile ? 4 : 0 }}>
          {PROVINCES.map((prov) => {
            const active = prov.id === provinceId
            return (
              <button
                key={prov.id}
                onClick={() => handleProvinceChange(prov.id)}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "flex-start",
                  padding: isMobile ? "6px 10px" : "8px 14px", borderRadius: 10,
                  border: `${active ? "1.5px" : "0.5px"} solid ${active ? prov.color : t.border}`,
                  background: active ? prov.color : t.surface,
                  cursor: "pointer", transition: "all 0.15s",
                  minWidth: isMobile ? 80 : 108, flexShrink: 0,
                }}
                onMouseEnter={(e) => { if (!active) { e.currentTarget.style.borderColor = prov.color; e.currentTarget.style.background = prov.color + "10" } }}
                onMouseLeave={(e) => { if (!active) { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.background = t.surface } }}
              >
                {!isMobile && <div style={{ fontSize: 10, fontWeight: 600, color: active ? "rgba(255,255,255,0.7)" : t.textFaint, marginBottom: 1 }}>
                  P{prov.number}
                </div>}
                <div style={{ fontSize: isMobile ? 11 : 13, fontWeight: 700, color: active ? "#ffffff" : t.text }}>
                  {prov.name}
                </div>
                {!isMobile && <div style={{ fontSize: 10, color: active ? "rgba(255,255,255,0.65)" : t.textSub, marginTop: 1 }}>
                  {prov.capital}
                </div>}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Header ── */}
      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16, gap: isMobile ? 10 : 0 }}>
        <div>
          <h1 style={{ fontSize: isMobile ? 18 : 22, fontWeight: 700, color: t.text, margin: 0 }}>
            Discover {province.name} Province
          </h1>
          <p style={{ fontSize: 12, color: t.textSub, margin: "4px 0 0" }}>
            {province.tagline}
          </p>
        </div>
        {/* Season pills */}
        <div style={{ display: "flex", gap: 4, background: t.surface, border: `0.5px solid ${t.border}`, borderRadius: 10, padding: 4, flexShrink: 0, overflowX: "auto" }}>
          {(["All", "Spring", "Summer", "Autumn", "Winter"] as Season[]).map((s) => (
            <button key={s} onClick={() => setSeason(s)} style={{
              padding: isMobile ? "4px 10px" : "5px 14px", borderRadius: 7, border: "none",
              fontSize: isMobile ? 11 : 12,
              fontWeight: 500, cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap",
              background: season === s ? t.blue : "transparent",
              color: season === s ? "#ffffff" : t.textSub,
            }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* ── Metrics ── */}
      <div className="rsp-grid-4" style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: isMobile ? 10 : 16, marginBottom: 22 }}>
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

function RouteMap({ origin, waypoints, viaPoints = [], destination, travelMode, isDark, t, onInfo, onRoutes, selectedRouteIndex = 0, pinLocations = [], siteMarkers = [] }: {
  origin: string; waypoints: string[]; viaPoints?: string[]; destination: string
  travelMode: string; isDark?: boolean; t: Theme
  onInfo?: (info: RouteInfo) => void
  onRoutes?: (routes: RouteAlternative[]) => void
  selectedRouteIndex?: number
  pinLocations?: string[]
  /** Pre-geocoded interest-based sites — shown as colored pins without API call */
  siteMarkers?: { name: string; lat: number; lng: number; emoji: string; category: string; colorKey: string }[]
}) {
  const divRef        = useRef<HTMLDivElement>(null)
  const mapObj        = useRef<any>(null)
  const renderersRef    = useRef<any[]>([])
  const pinMarkersRef   = useRef<any[]>([])
  const siteMarkersRef  = useRef<any[]>([])
  const siteInfoWinRef  = useRef<any>(null)
  const [zeroResults, setZeroResults] = useState(false)

  const clearRenderers = () => {
    renderersRef.current.forEach(r => { try { r.setMap(null) } catch {} })
    renderersRef.current = []
  }

  const clearPinMarkers = () => {
    pinMarkersRef.current.forEach(m => { try { m.setMap(null) } catch {} })
    pinMarkersRef.current = []
  }

  // ── Geocode and pin extra locations (Places API, works even for trekking spots) ──
  useEffect(() => {
    if (!pinLocations.length) { clearPinMarkers(); return }
    if (!(window as any).google?.maps?.places) return
    const g = (window as any).google.maps

    clearPinMarkers()

    const svc = new g.places.PlacesService(mapObj.current || document.createElement("div"))
    const infoWin = new g.InfoWindow()

    pinLocations.filter(Boolean).forEach(loc => {
      svc.findPlaceFromQuery(
        { query: loc.toLowerCase().includes("nepal") ? loc : `${loc}, Nepal`, fields: ["geometry", "name"] },
        (results: any[], status: string) => {
          if (status !== "OK" || !results[0]?.geometry?.location) return
          const pos = results[0].geometry.location
          const shortName = loc.split(",")[0].trim()
          const marker = new g.Marker({
            position: pos,
            map: mapObj.current,
            title: shortName,
            zIndex: 60,
            icon: {
              path: "M 0,-12 C -6,-12 -10,-8 -10,-3 C -10,4 0,12 0,12 C 0,12 10,4 10,-3 C 10,-8 6,-12 0,-12 Z",
              fillColor: "#3B6D11",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 2,
              scale: 1,
              anchor: new g.Point(0, 12),
            },
          })
          marker.addListener("click", () => {
            infoWin.setContent(
              `<div style="font-family:Inter,sans-serif;padding:4px 6px">
                <div style="font-size:12px;font-weight:700;color:#111827">📍 ${shortName}</div>
                <div style="font-size:10px;color:#6B7280;margin-top:2px">Added stop</div>
              </div>`
            )
            infoWin.open(mapObj.current, marker)
          })
          pinMarkersRef.current.push(marker)
        }
      )
    })
  }, [pinLocations.join("|")])

  // ── Interest-based site markers (lat/lng known — no geocoding needed) ────────
  useEffect(() => {
    siteMarkersRef.current.forEach(m => { try { m.setMap(null) } catch {} })
    siteMarkersRef.current = []
    if (!siteMarkers.length || !GMAPS_KEY) return

    // Use loadGMaps to ensure the API is ready, then add markers once map is initialised
    loadGMaps(() => {
      if (!mapObj.current) return
      addSiteMarkers()
    })
    return

    function addSiteMarkers() {
    if (!siteMarkers.length || !(window as any).google?.maps || !mapObj.current) return

    const g = (window as any).google.maps
    if (!siteInfoWinRef.current) siteInfoWinRef.current = new g.InfoWindow()

    const COLORS: Record<string, string> = {
      blue: "#185FA5", orange: "#D85A30", green: "#3B6D11",
      amber: "#BA7517", teal: "#1A6B5A", purple: "#6B3FA0", red: "#B91C1C",
    }

    siteMarkers.forEach(site => {
      const col = COLORS[site.colorKey] || "#185FA5"
      const marker = new g.Marker({
        position: { lat: site.lat, lng: site.lng },
        map: mapObj.current,
        title: site.name,
        zIndex: 45,
        icon: {
          // Teardrop shape
          path: "M 0,-16 C -7,-16 -12,-10 -12,-4 C -12,5 0,16 0,16 C 0,16 12,5 12,-4 C 12,-10 7,-16 0,-16 Z",
          fillColor: col, fillOpacity: 0.92,
          strokeColor: "#ffffff", strokeWeight: 2,
          scale: 0.85, anchor: new g.Point(0, 16),
          labelOrigin: new g.Point(0, -3),
        },
        label: { text: site.emoji, fontSize: "13px" },
      })
      marker.addListener("click", () => {
        siteInfoWinRef.current.setContent(
          `<div style="font-family:Inter,sans-serif;padding:6px 8px 4px;min-width:140px">
            <div style="font-size:13px;font-weight:700;color:#111827">${site.emoji} ${site.name}</div>
            <div style="font-size:11px;color:#6B7280;margin-top:3px;text-transform:capitalize">${site.category}</div>
          </div>`
        )
        siteInfoWinRef.current.open(mapObj.current, marker)
      })
      siteMarkersRef.current.push(marker)
    })
    } // end addSiteMarkers
  }, [siteMarkers.map(s => s.name).join("|")])

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

      const hasRoute = origin.trim().length > 0 && destination.trim().length > 0

      if (!mapObj.current) {
        mapObj.current = new g.Map(divRef.current, {
          // Nepal overview when no route; route area when destination known
          zoom: hasRoute ? 9 : 7,
          center: hasRoute ? { lat: 27.7172, lng: 85.324 } : { lat: 28.1, lng: 84.1 },
          styles: isDark ? DARK_STYLES : LIGHT_STYLES,
          disableDefaultUI: true, zoomControl: true, fullscreenControl: true,
        })
        g.event.trigger(mapObj.current, "resize")
      }

      // GPS coordinates (e.g. "27.712,85.324") must NOT have ", Nepal" appended
      const addNepal = (s: string) => {
        const t = s.trim()
        if (/^-?\d+\.?\d*,\s*-?\d+\.?\d*$/.test(t)) return t
        return t.toLowerCase().includes("nepal") ? t : `${t}, Nepal`
      }
      const modeMap: Record<string, string> = { driving: "DRIVING", walking: "WALKING", transit: "TRANSIT" }

      // Route helper — retries without waypoints if they cause ZERO_RESULTS
      const svc = new g.DirectionsService()
      const buildWaypoints = (wps: string[]) =>
        wps.filter(Boolean).map((w: string) => ({ location: addNepal(w), stopover: true }))

      const doRoute = (wps: string[], retriedWithout = false) => {
        svc.route({
          origin:      addNepal(origin),
          destination: addNepal(destination),
          waypoints: [
            ...buildWaypoints(wps),
            ...viaPoints.filter(Boolean).map((w: string) => ({ location: addNepal(w), stopover: false })),
          ],
          travelMode:  g.TravelMode[modeMap[travelMode] ?? "DRIVING"],
          region:      "NP",
          provideRouteAlternatives: !retriedWithout,
          optimizeWaypoints: false,
        }, (result: any, status: string) => {
          if (cancelled) return
          if (status !== "OK") {
            if (!retriedWithout && wps.length > 0) {
              // Waypoints may be unresolvable — retry without them
              doRoute([], true)
            } else {
              if (status === "ZERO_RESULTS") setZeroResults(true)
            }
            return
          }
          setZeroResults(false)
          routeHandler(result)
        })
      }

      const routeHandler = (result: any) => {
        if (cancelled) return
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
      }  // end routeHandler

      // Only request directions when both ends are known
      if (hasRoute) doRoute(waypoints.filter(Boolean))
    })

    return () => { cancelled = true; clearPinMarkers() }
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
  const { t, isDark, isMobile, pendingNav, clearNav } = useT()

  const [origin,      setOrigin]      = useState("")
  const [destination, setDestination] = useState("")
  const [stops,       setStops]       = useState<string[]>([])
  const [travelMode,  setTravelMode]  = useState("driving")
  const [routeKey,    setRouteKey]    = useState(0)
  const [routeInfo,   setRouteInfo]   = useState<RouteInfo>({ distance: "—", duration: "—" })
  const [routeAlts,   setRouteAlts]   = useState<RouteAlternative[]>([])
  const [selectedRoute, setSelectedRoute] = useState(0)

  // ── Apply navigation request from NearbyPage ──────────────────────────────
  useEffect(() => {
    if (!pendingNav) return
    setOrigin(pendingNav.origin)
    setDestination(pendingNav.dest)
    setStops([])
    setRouteKey(k => k + 1)
    setRouteInfo({ distance: "—", duration: "—" })
    setRouteAlts([])
    setSelectedRoute(0)
    setSearched(true)
    clearNav()
  }, [pendingNav])

  const addStop    = () => setStops(s => [...s, ""])
  const removeStop = (i: number) => setStops(s => s.filter((_, idx) => idx !== i))
  const updateStop = (i: number, v: string) => setStops(s => s.map((x, idx) => idx === i ? v : x))

  const canSearch = origin.trim().length > 0 && destination.trim().length > 0
  const [searched,   setSearched]   = useState(false)
  const [locLoading, setLocLoading] = useState(false)

  function fillMyLocation(setter: (v: string) => void) {
    if (!navigator.geolocation) { alert("GPS not available on this device"); return }
    setLocLoading(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setter(`${pos.coords.latitude.toFixed(6)},${pos.coords.longitude.toFixed(6)}`)
        setLocLoading(false)
      },
      () => { alert("Could not get GPS location. Please allow location access."); setLocLoading(false) },
      { enableHighAccuracy: true, timeout: 9000 }
    )
  }

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
    <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", height: isMobile ? "auto" : "100%", minHeight: "100vh" }}>

      {/* ── Left panel: route builder ─────────────────────────────────────── */}
      <div style={{
        width: isMobile ? "100%" : 340,
        minWidth: isMobile ? 0 : 340,
        background: t.surface,
        borderRight: isMobile ? "none" : `0.5px solid ${t.border}`,
        borderBottom: isMobile ? `0.5px solid ${t.border}` : "none",
        display: "flex", flexDirection: "column", overflowY: "auto",
      }}>
        {/* Header */}
        <div style={{ padding: "20px 18px 14px", borderBottom: `0.5px solid ${t.border}` }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: t.text, margin: "0 0 3px" }}>Pathfinder</h1>
          <p style={{ fontSize: 11, color: t.textSub, margin: 0 }}>Live Google Maps route with alternate paths</p>
        </div>

        {/* Route builder */}
        <div style={{ padding: "14px 18px", borderBottom: `0.5px solid ${t.border}`, display: "flex", flexDirection: "column", gap: 8 }}>
          {/* Origin + GPS button */}
          <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
            <div style={{ position: "relative", flex: 1 }}>
              <div style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", width: 10, height: 10, borderRadius: "50%", background: t.blue, border: `2px solid ${t.surface}`, boxShadow: `0 0 0 2px ${t.blue}`, zIndex: 1 }} />
              <input value={origin} onChange={e => setOrigin(e.target.value)} placeholder="Starting point" style={inp} />
            </div>
            <button
              onClick={() => fillMyLocation(setOrigin)}
              disabled={locLoading}
              title="Use my current GPS location as starting point"
              style={{
                height: 36, padding: "0 11px", borderRadius: 8, border: `0.5px solid ${t.blue}`,
                background: t.blueLight, color: locLoading ? t.textFaint : t.blue,
                fontSize: 11, fontWeight: 600, cursor: locLoading ? "default" : "pointer",
                display: "flex", alignItems: "center", gap: 5, flexShrink: 0, whiteSpace: "nowrap",
              }}
            >
              {locLoading
                ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
                : <span style={{ fontSize: 14 }}>📍</span>}
              {locLoading ? "Detecting…" : "My location"}
            </button>
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
            onClick={() => { if (canSearch) { setRouteKey(k => k + 1); setRouteInfo({ distance: "—", duration: "—" }); setRouteAlts([]); setSelectedRoute(0); setSearched(true) } }}
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
      <div style={{ flex: 1, position: "relative", overflow: "hidden", minHeight: isMobile ? 350 : undefined }}>
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

      {/* ── Facilities on this route ── */}
      {canSearch && searched && (() => {
        const distKm = parseFloat(routeInfo.distance) || 100
        const orig = origin.split(",")[0].trim()
        const dest = destination.split(",")[0].trim()
        const addNepalSuffix = (s: string) => {
          const t = s.trim()
          if (/^-?\d+\.?\d*,\s*-?\d+\.?\d*$/.test(t)) return t
          return t.toLowerCase().includes("nepal") ? t : `${t}, Nepal`
        }

        // Build Google Maps URL: original route + facility as waypoint search
        function facilityRouteUrl(facilitySearch: string) {
          // Uses Google Maps path-format: /dir/start/facility_search/end
          // This shows the actual route WITH the facility pinned on it
          return (
            `https://www.google.com/maps/dir/` +
            `${encodeURIComponent(addNepalSuffix(origin))}/` +
            `${encodeURIComponent(facilitySearch + " near route, Nepal")}/` +
            `${encodeURIComponent(addNepalSuffix(destination))}` +
            `?travelmode=${travelMode}`
          )
        }

        const FACILITIES = [
          {
            icon: "🍽", name: "Restaurants & dhabas",
            tip: "Plan a meal stop at the midpoint town",
            dist: `~${Math.round(distKm * 0.4)} km from ${orig}`,
            info: "Rs 150–500 / meal",
            search: "restaurant dhaba",
          },
          {
            icon: "⛽", name: "Petrol stations",
            tip: distKm > 80 ? "Plan 1–2 fuel stops — carry extra for remote stretches" : "Top up before departure",
            dist: `~${Math.round(distKm * 0.28)} km from ${orig}`,
            info: "Rs 168–175 / litre",
            search: "petrol station fuel pump",
          },
          {
            icon: "🏨", name: "Hotels & lodges",
            tip: distKm > 150 ? "Long journey — overnight stop recommended" : "Rest stop along the way",
            dist: `~${Math.round(distKm * 0.5)} km from ${orig}`,
            info: "Rs 800–3,500 / night",
            search: "hotel lodge guesthouse",
          },
          {
            icon: "🏥", name: "Hospitals & clinics",
            tip: "Note nearest medical facility before you depart",
            dist: `~${Math.round(distKm * 0.35)} km from ${orig}`,
            info: "Nepal emergency: 102",
            search: "hospital clinic emergency",
          },
          {
            icon: "🏧", name: "ATMs",
            tip: "Carry cash — ATMs are scarce beyond district headquarters",
            dist: `~${Math.round(distKm * 0.15)} km from ${orig}`,
            info: "Withdraw at your origin city",
            search: "ATM bank cash",
          },
          {
            icon: "💊", name: "Pharmacies",
            tip: "Pack a travel health kit for remote areas",
            dist: `~${Math.round(distKm * 0.6)} km from ${orig}`,
            info: "Basic meds available at bazaars",
            search: "pharmacy chemist medicine",
          },
        ]

        return (
          <Card style={{ padding: 0, overflow: "hidden" }}>
            {/* Header */}
            <div style={{ padding: "12px 18px", borderBottom: `0.5px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16 }}>🗺</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>Facilities on this route</div>
                  <div style={{ fontSize: 11, color: t.textSub }}>{orig} → {dest}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {routeInfo.distance !== "—" && (
                  <span style={{ fontSize: 11, color: t.textFaint }}>{routeInfo.distance} · {routeInfo.duration} drive</span>
                )}
              </div>
            </div>

            {/* Facility rows */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              {FACILITIES.map((f, i) => (
                <div
                  key={f.name}
                  style={{
                    display: "flex", alignItems: "center", gap: 14,
                    padding: "13px 18px",
                    borderBottom: i < FACILITIES.length - 1 ? `0.5px solid ${t.border}` : "none",
                    background: t.surface,
                  }}
                >
                  {/* Icon */}
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: t.subtle, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                    {f.icon}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 2 }}>{f.name}</div>
                    <div style={{ fontSize: 11, color: t.textSub, marginBottom: 3 }}>{f.tip}</div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 10, color: t.textFaint }}>📍 {f.dist}</span>
                      <span style={{ fontSize: 10, color: t.textFaint }}>· {f.info}</span>
                    </div>
                  </div>

                  {/* View button — opens Google Maps with route + facility pinned */}
                  <button
                    onClick={() => window.open(facilityRouteUrl(f.search), "_blank")}
                    style={{
                      padding: "7px 16px", borderRadius: 8, flexShrink: 0,
                      border: `0.5px solid ${t.blue}`, background: t.blueLight,
                      color: t.blue, fontSize: 11, fontWeight: 600, cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 5,
                      transition: "all 0.12s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = t.blue; e.currentTarget.style.color = "#fff" }}
                    onMouseLeave={e => { e.currentTarget.style.background = t.blueLight; e.currentTarget.style.color = t.blue }}
                  >
                    View
                  </button>
                </div>
              ))}
            </div>
          </Card>
        )
      })()}
    </div>
  )
}

// ── Nepal places with real GPS coordinates (used for 5km radius detection) ──────

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371, toRad = (x: number) => x * Math.PI / 180
  const dL = toRad(lat2 - lat1), dG = toRad(lon2 - lon1)
  const a = Math.sin(dL/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dG/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

function detectNepalZone(lat: number, lng: number): { district: string; province: string; area: string } {
  if (lat > 27.4 && lat < 28.1 && lng > 84.9 && lng < 86.2)
    return { district: "Kathmandu", province: "Bagmati Province", area: "Kathmandu Valley" }
  if (lat > 27.6 && lat < 27.8 && lng > 85.35 && lng < 85.55)
    return { district: "Bhaktapur", province: "Bagmati Province", area: "Bhaktapur" }
  if (lat > 27.6 && lat < 27.75 && lng > 85.25 && lng < 85.38)
    return { district: "Lalitpur", province: "Bagmati Province", area: "Patan" }
  if (lat > 28.1 && lat < 28.4 && lng > 83.8 && lng < 84.2)
    return { district: "Kaski", province: "Gandaki Province", area: "Pokhara" }
  if (lat > 27.4 && lat < 27.7 && lng > 84.2 && lng < 84.7)
    return { district: "Chitwan", province: "Bagmati Province", area: "Chitwan" }
  if (lat > 27.3 && lat < 27.6 && lng > 83.1 && lng < 83.5)
    return { district: "Rupandehi", province: "Lumbini Province", area: "Lumbini" }
  if (lat > 27.8 && lat < 28.1 && lng > 83.4 && lng < 83.7)
    return { district: "Palpa", province: "Lumbini Province", area: "Tansen" }
  if (lat > 26.6 && lat < 27.0 && lng > 85.7 && lng < 86.2)
    return { district: "Dhanusha", province: "Madhesh Province", area: "Janakpur" }
  if (lat > 26.9 && lat < 27.3 && lng > 87.8 && lng < 88.2)
    return { district: "Ilam", province: "Koshi Province", area: "Ilam" }
  if (lat > 26.4 && lat < 26.8 && lng > 87.2 && lng < 87.5)
    return { district: "Sunsari", province: "Koshi Province", area: "Biratnagar" }
  if (lat > 29.3 && lat < 29.7 && lng > 81.9 && lng < 82.3)
    return { district: "Mugu", province: "Karnali Province", area: "Rara" }
  if (lat > 28.6 && lat < 29.0 && lng > 80.4 && lng < 80.8)
    return { district: "Kanchanpur", province: "Sudurpashchim Province", area: "Dhangadhi" }
  return { district: "Nepal", province: "Nepal", area: "Your location" }
}

interface NepalSite {
  id: string; name: string; emoji: string; category: string
  region: string; province: string; lat: number; lng: number
  colorKey: string; type: string
  driveTime?: string; walkTime?: string; road?: string
}

const ALL_NEPAL_SITES: NepalSite[] = [
  // Kathmandu Valley
  { id:"pashupatinath", name:"Pashupatinath Temple", emoji:"🛕",  category:"Spiritual", region:"Kathmandu",    province:"Bagmati",    lat:27.7109, lng:85.3488, colorKey:"orange", type:"temple"    },
  { id:"boudhanath",    name:"Boudhanath Stupa",     emoji:"☸️",  category:"Spiritual", region:"Kathmandu",    province:"Bagmati",    lat:27.7215, lng:85.3620, colorKey:"blue",   type:"stupa"     },
  { id:"swayambhu",     name:"Swayambhunath",        emoji:"🐵",  category:"Spiritual", region:"Kathmandu",    province:"Bagmati",    lat:27.7149, lng:85.2904, colorKey:"blue",   type:"stupa"     },
  { id:"patan-durbar",  name:"Patan Durbar Square",  emoji:"🏰",  category:"Heritage",  region:"Lalitpur",     province:"Bagmati",    lat:27.6727, lng:85.3246, colorKey:"teal",   type:"heritage"  },
  { id:"bhaktapur",     name:"Bhaktapur Durbar Sq",  emoji:"🏯",  category:"Heritage",  region:"Bhaktapur",    province:"Bagmati",    lat:27.6710, lng:85.4298, colorKey:"teal",   type:"heritage"  },
  { id:"changu",        name:"Changu Narayan Temple", emoji:"🛕",  category:"Heritage",  region:"Bhaktapur",    province:"Bagmati",    lat:27.7138, lng:85.4174, colorKey:"amber",  type:"temple"    },
  { id:"namobuddha",    name:"Namobuddha Monastery", emoji:"🌄",  category:"Buddhist",  region:"Kavrepalanchok",province:"Bagmati",   lat:27.5771, lng:85.5049, colorKey:"green",  type:"monastery" },
  { id:"shivapuri",     name:"Shivapuri Nat. Park",  emoji:"🌿",  category:"Nature",    region:"Kathmandu",    province:"Bagmati",    lat:27.8025, lng:85.3681, colorKey:"green",  type:"nature"    },
  { id:"dakshinkali",   name:"Dakshinkali Temple",   emoji:"🔱",  category:"Spiritual", region:"Kathmandu",    province:"Bagmati",    lat:27.5917, lng:85.2404, colorKey:"orange", type:"temple"    },
  { id:"kopan",         name:"Kopan Monastery",      emoji:"🕌",  category:"Buddhist",  region:"Kathmandu",    province:"Bagmati",    lat:27.7333, lng:85.3654, colorKey:"purple", type:"monastery" },
  { id:"godavari",      name:"Godavari Garden",      emoji:"🌸",  category:"Nature",    region:"Lalitpur",     province:"Bagmati",    lat:27.5976, lng:85.3701, colorKey:"green",  type:"nature"    },
  { id:"phulchowki",    name:"Phulchowki Hill",      emoji:"🦅",  category:"Nature",    region:"Lalitpur",     province:"Bagmati",    lat:27.5935, lng:85.3845, colorKey:"green",  type:"viewpoint" },
  // Pokhara / Gandaki
  { id:"phewa",         name:"Phewa Lake",            emoji:"🌊",  category:"Nature",    region:"Kaski",        province:"Gandaki",    lat:28.2096, lng:83.9556, colorKey:"blue",   type:"nature"    },
  { id:"sarangkot",     name:"Sarangkot Viewpoint",  emoji:"🗻",  category:"Viewpoint", region:"Kaski",        province:"Gandaki",    lat:28.2456, lng:83.9568, colorKey:"purple", type:"viewpoint" },
  { id:"peace-stupa",   name:"World Peace Stupa",    emoji:"☮️",  category:"Spiritual", region:"Kaski",        province:"Gandaki",    lat:28.1905, lng:83.9523, colorKey:"blue",   type:"stupa"     },
  { id:"davis-falls",   name:"Davis Falls",           emoji:"💧",  category:"Nature",    region:"Kaski",        province:"Gandaki",    lat:28.1930, lng:83.9486, colorKey:"blue",   type:"nature"    },
  { id:"gupteshwor",    name:"Gupteshwor Cave",      emoji:"🪨",  category:"Heritage",  region:"Kaski",        province:"Gandaki",    lat:28.1935, lng:83.9491, colorKey:"teal",   type:"heritage"  },
  { id:"begnas",        name:"Begnas Lake",           emoji:"🏞",  category:"Nature",    region:"Kaski",        province:"Gandaki",    lat:28.2029, lng:84.1215, colorKey:"blue",   type:"nature"    },
  { id:"manakamana",    name:"Manakamana Temple",    emoji:"🛕",  category:"Religious", region:"Gorkha",       province:"Gandaki",    lat:27.9327, lng:84.6053, colorKey:"orange", type:"temple"    },
  { id:"gorkha-durbar", name:"Gorkha Durbar",         emoji:"🏯",  category:"Heritage",  region:"Gorkha",       province:"Gandaki",    lat:28.0000, lng:84.6333, colorKey:"teal",   type:"heritage"  },
  { id:"bandipur",      name:"Bandipur Village",      emoji:"🏘",  category:"Heritage",  region:"Tanahun",      province:"Gandaki",    lat:27.9438, lng:84.4166, colorKey:"teal",   type:"heritage"  },
  { id:"poon-hill",     name:"Poon Hill",             emoji:"⛅",  category:"Trekking",  region:"Myagdi",       province:"Gandaki",    lat:28.3971, lng:83.6966, colorKey:"green",  type:"viewpoint" },
  // Lumbini
  { id:"lumbini",       name:"Lumbini Sacred Garden",emoji:"☮",  category:"Spiritual", region:"Rupandehi",    province:"Lumbini",    lat:27.4833, lng:83.2756, colorKey:"blue",   type:"heritage"  },
  { id:"tansen",        name:"Tansen Durbar",         emoji:"⛩️", category:"Heritage",  region:"Palpa",        province:"Lumbini",    lat:27.8622, lng:83.5430, colorKey:"teal",   type:"heritage"  },
  { id:"chitwan",       name:"Chitwan National Park", emoji:"🐘",  category:"Wildlife",  region:"Chitwan",      province:"Lumbini",    lat:27.5141, lng:84.3543, colorKey:"green",  type:"nature"    },
  // Koshi
  { id:"pathibhara",    name:"Pathibhara Temple",    emoji:"🛕",  category:"Spiritual", region:"Taplejung",    province:"Koshi",      lat:27.7028, lng:87.8967, colorKey:"orange", type:"temple"    },
  { id:"ilam-tea",      name:"Ilam Tea Garden",      emoji:"🍃",  category:"Nature",    region:"Ilam",         province:"Koshi",      lat:26.9109, lng:87.9277, colorKey:"green",  type:"nature"    },
  { id:"koshi-tappu",   name:"Koshi Tappu Reserve",  emoji:"🦏",  category:"Wildlife",  region:"Sunsari",      province:"Koshi",      lat:26.6600, lng:87.0900, colorKey:"green",  type:"nature"    },
  // Madhesh
  { id:"janaki",        name:"Janaki Mandir",         emoji:"🏛️", category:"Religious", region:"Janakpur",     province:"Madhesh",    lat:26.7286, lng:85.9243, colorKey:"amber",  type:"temple"    },
  { id:"gadhimai",      name:"Gadhimai Temple",       emoji:"🔱",  category:"Religious", region:"Bara",         province:"Madhesh",    lat:27.0500, lng:85.0830, colorKey:"orange", type:"temple"    },
  // Karnali
  { id:"rara-lake",     name:"Rara National Park",   emoji:"🏞",  category:"Nature",    region:"Mugu",         province:"Karnali",    lat:29.5247, lng:82.0856, colorKey:"blue",   type:"nature"    },
  { id:"dolpo",         name:"Dolpo Region",          emoji:"🏔",  category:"Trekking",  region:"Dolpa",        province:"Karnali",    lat:29.1667, lng:82.8333, colorKey:"purple", type:"viewpoint" },
  // Sudurpashchim
  { id:"shuklaphanta",  name:"Shuklaphanta Nat. Park",emoji:"🐆",  category:"Wildlife",  region:"Kanchanpur",   province:"Sudurpashchim",lat:28.8778, lng:80.1733, colorKey:"green", type:"nature"   },
  { id:"badimalika",    name:"Badimalika Temple",     emoji:"🌺",  category:"Spiritual", region:"Bajura",       province:"Sudurpashchim",lat:29.3500, lng:81.5167, colorKey:"orange",type:"temple"   },
]

const NEARBY_CATS   = ["All", "Spiritual", "Heritage", "Nature", "Trekking", "Wildlife", "Buddhist", "Religious", "Viewpoint"]
const NEARBY_COLORS: Record<string, string> = {
  blue:"#185FA5", orange:"#D85A30", green:"#3B6D11",
  amber:"#BA7517", teal:"#1A6B5A",  purple:"#6B3FA0",
}

function NearbyPage() {
  const { t, isDark, isMobile, navigateTo } = useT()

  // GPS state
  const [gpsStatus,    setGpsStatus]    = useState<"requesting"|"granted"|"denied">("requesting")
  const [userCoords,   setUserCoords]   = useState<{lat:number;lng:number}|null>(null)
  const [userLoc,      setUserLoc]      = useState({ district:"—", province:"—", area:"Detecting location…" })
  const [radius,       setRadius]       = useState<5|10|25|50>(5)
  const [nearbyPlaces, setNearbyPlaces] = useState<(NepalSite & { dist: number })[]>([])
  const [selectedId,   setSelectedId]   = useState<string|null>(null)
  const [activeCat,    setActiveCat]    = useState("All")

  // Map refs
  const mapDivRef  = useRef<HTMLDivElement>(null)
  const mapObj     = useRef<any>(null)
  const circleRef  = useRef<any>(null)
  const userMarker = useRef<any>(null)
  const siteMarkers = useRef<any[]>([])
  const infoWin    = useRef<any>(null)

  // ── 1. Get GPS location ───────────────────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) {
      const fallback = { lat: 27.7172, lng: 85.3240 }  // Kathmandu
      setUserCoords(fallback)
      setGpsStatus("denied")
      setUserLoc(detectNepalZone(fallback.lat, fallback.lng))
      return
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setUserCoords(c)
        setGpsStatus("granted")
        setUserLoc(detectNepalZone(c.lat, c.lng))
      },
      () => {
        const fallback = { lat: 27.7172, lng: 85.3240 }
        setUserCoords(fallback)
        setGpsStatus("denied")
        setUserLoc(detectNepalZone(fallback.lat, fallback.lng))
      },
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 0 }
    )
  }, [])

  // ── 2. Build map & markers when coords ready or radius changes ────────────
  useEffect(() => {
    if (!userCoords || !mapDivRef.current) return
    loadGMaps(initMap)
  }, [userCoords, radius, isDark])

  function initMap() {
    const g = (window as any).google.maps
    const center = userCoords!

    // Create or reuse map
    if (!mapObj.current) {
      mapObj.current = new g.Map(mapDivRef.current, {
        center, zoom: 14,
        styles: isDark ? DARK_STYLES : LIGHT_STYLES,
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: "greedy",
      })
      g.event.trigger(mapObj.current, "resize")
      infoWin.current = new g.InfoWindow()
    } else {
      mapObj.current.setCenter(center)
    }

    // User location pulsing marker (outer glow circle + inner pin)
    if (userMarker.current) { userMarker.current.outerCircle?.setMap(null); userMarker.current.pin?.setMap(null) }
    const outerCircle = new g.Circle({
      map: mapObj.current, center, radius: 18,
      fillColor: "#185FA5", fillOpacity: 0.2,
      strokeColor: "#185FA5", strokeWeight: 1, strokeOpacity: 0.5,
    })
    const pin = new g.Marker({
      position: center, map: mapObj.current,
      icon: { path: g.SymbolPath.CIRCLE, scale: 9, fillColor: "#185FA5", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 3 },
      title: "You are here", zIndex: 999,
    })
    userMarker.current = { outerCircle, pin }

    // Radius circle
    if (circleRef.current) circleRef.current.setMap(null)
    circleRef.current = new g.Circle({
      map: mapObj.current, center, radius: radius * 1000,
      fillColor: "#185FA5", fillOpacity: 0.05,
      strokeColor: "#185FA5", strokeWeight: 1.5, strokeOpacity: 0.7,
    })

    // Calculate nearby places
    const nearby = ALL_NEPAL_SITES
      .map(s => ({ ...s, dist: Math.round(haversineKm(center.lat, center.lng, s.lat, s.lng) * 10) / 10 }))
      .filter(s => s.dist <= radius)
      .sort((a, b) => a.dist - b.dist)
    setNearbyPlaces(nearby)
    if (nearby.length > 0 && !selectedId) setSelectedId(nearby[0].id)

    // Clear old site markers
    siteMarkers.current.forEach(m => m.setMap(null))
    siteMarkers.current = []

    // Add site markers
    nearby.forEach(site => {
      const col = NEARBY_COLORS[site.colorKey] || "#185FA5"
      const isSelected = site.id === selectedId
      const marker = new g.Marker({
        position: { lat: site.lat, lng: site.lng },
        map: mapObj.current,
        title: site.name,
        icon: {
          path: g.SymbolPath.CIRCLE,
          scale: isSelected ? 10 : 7,
          fillColor: col, fillOpacity: isSelected ? 1 : 0.85,
          strokeColor: "#fff", strokeWeight: isSelected ? 3 : 2,
        },
        zIndex: isSelected ? 100 : 10,
      })
      marker.addListener("click", () => {
        setSelectedId(site.id)
        infoWin.current.setContent(
          `<div style="font-family:Inter,sans-serif;padding:6px 8px 4px">
            <div style="font-size:13px;font-weight:700;color:#111827">${site.emoji} ${site.name}</div>
            <div style="font-size:11px;color:#6B7280;margin-top:2px">${site.category} · ${site.region}</div>
            <div style="font-size:11px;color:#185FA5;margin-top:4px;font-weight:600">📍 ${site.dist} km away</div>
          </div>`
        )
        infoWin.current.open(mapObj.current, marker)
      })
      siteMarkers.current.push(marker)
    })

    // Adjust zoom to fit circle
    mapObj.current.fitBounds(circleRef.current.getBounds())
  }

  const filtered = nearbyPlaces.filter(p =>
    activeCat === "All" || p.category.toLowerCase().includes(activeCat.toLowerCase().slice(0,6))
  )
  const selected = nearbyPlaces.find(p => p.id === selectedId)

  function openRoute(site: NepalSite & { dist: number }) {
    if (!userCoords) return
    const origin = `${userCoords.lat},${userCoords.lng}`
    const dest   = `${site.lat},${site.lng}`
    window.open(`https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&travelmode=driving`, "_blank")
  }

  return (
    <div style={{ display:"flex", flexDirection: isMobile ? "column-reverse" : "row", height: isMobile ? "auto" : "100vh", minHeight:"100vh", overflow: isMobile ? "auto" : "hidden" }}>

      {/* ═══ LEFT: Live Google Map (65%) ═══════════════════════════════════ */}
      <div style={{ flex: isMobile ? "none" : "0 0 65%", height: isMobile ? 340 : undefined, position:"relative", background: t.subtle, overflow:"hidden" }}>

        {/* Map container */}
        <div ref={mapDivRef} style={{ position:"absolute", inset:0 }} />

        {/* GPS location card — top left */}
        <div style={{ position:"absolute", top:14, left:14, zIndex:10,
          background:"white", borderRadius:8, padding:"8px 12px",
          border:"0.5px solid #E5E7EB", boxShadow:"0 1px 6px rgba(0,0,0,0.08)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <div style={{
              width:7, height:7, borderRadius:"50%",
              background: gpsStatus === "granted" ? "#22C55E" : gpsStatus === "denied" ? "#EF4444" : "#F59E0B",
              flexShrink:0, boxShadow:`0 0 0 3px ${gpsStatus === "granted" ? "rgba(34,197,94,0.2)" : gpsStatus === "denied" ? "rgba(239,68,68,0.2)" : "rgba(245,158,11,0.2)"}`,
            }} />
            <span style={{ fontSize:11, fontWeight:600, color:"#111827" }}>
              {gpsStatus === "requesting" ? "Detecting your GPS…" :
               gpsStatus === "denied"    ? `Location unavailable · Kathmandu (approx.)` :
               `Live GPS · ${userLoc.district}`}
            </span>
          </div>
          {gpsStatus !== "requesting" && (
            <div style={{ fontSize:9, color:"#9CA3AF", marginTop:2, paddingLeft:13 }}>{userLoc.province}</div>
          )}
        </div>

        {/* Radius pills — bottom left */}
        <div style={{ position:"absolute", bottom:16, left:14, zIndex:10, display:"flex", gap:5 }}>
          {([5,10,25,50] as const).map(r => (
            <button key={r} onClick={() => setRadius(r)} style={{
              padding:"5px 12px", borderRadius:20, fontSize:11, fontWeight:600, cursor:"pointer",
              border:`0.5px solid ${radius===r ? "#185FA5" : "#D1D5DB"}`,
              background: radius===r ? "#185FA5" : "rgba(255,255,255,0.9)",
              color: radius===r ? "white" : "#6B7280",
              backdropFilter:"blur(4px)", transition:"all 0.12s",
            }}>
              {r} km
            </button>
          ))}
        </div>

        {/* Place count badge — bottom right */}
        <div style={{ position:"absolute", bottom:16, right:14, zIndex:10,
          background:"rgba(255,255,255,0.92)", backdropFilter:"blur(6px)",
          borderRadius:8, padding:"6px 12px", border:"0.5px solid #E5E7EB",
          fontSize:11, color:"#374151", fontWeight:600 }}>
          {nearbyPlaces.length > 0
            ? `${nearbyPlaces.length} place${nearbyPlaces.length!==1?"s":""} within ${radius} km`
            : gpsStatus === "requesting" ? "Searching…" : "No places in this radius"}
        </div>

        {/* No-key placeholder */}
        {!GMAPS_KEY && (
          <div style={{ position:"absolute", inset:0, zIndex:20, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:10, background:"#F0FFF4" }}>
            <div style={{ fontSize:40 }}>🗺</div>
            <div style={{ fontSize:13, fontWeight:600, color:"#374151" }}>Add VITE_GOOGLE_MAPS_API_KEY to show live map</div>
          </div>
        )}
      </div>

      {/* ═══ RIGHT: Nearby Panel (35%) ══════════════════════════════════════ */}
      <div style={{ flex: isMobile ? "none" : "0 0 35%", display:"flex", flexDirection:"column", background:"white", borderLeft: isMobile ? "none" : "0.5px solid #E5E7EB", borderBottom: isMobile ? "0.5px solid #E5E7EB" : "none", overflow: isMobile ? "visible" : "hidden" }}>

        {/* Header */}
        <div style={{ padding:"14px 16px 10px", borderBottom:"0.5px solid #E5E7EB", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:8 }}>
            <div>
              <div style={{ fontSize:15, fontWeight:700, color:"#111827" }}>Nearby in Nepal</div>
              <div style={{ fontSize:11, color:"#6B7280", marginTop:2 }}>
                {nearbyPlaces.length} place{nearbyPlaces.length!==1?"s":""} within {radius} km radius
              </div>
            </div>
            <button onClick={() => { if (userCoords && mapObj.current) mapObj.current.setCenter(userCoords) }}
              style={{ padding:"5px 9px", borderRadius:7, border:"0.5px solid #E5E7EB", background:"#F9FAFB", cursor:"pointer", fontSize:11, color:"#185FA5", fontWeight:600 }}>
              📍 Re-center
            </button>
          </div>

          {/* Breadcrumb */}
          <div style={{ display:"flex", alignItems:"center", gap:4, fontSize:11, color:"#6B7280", marginBottom:10, flexWrap:"wrap" }}>
            <span>🇳🇵</span>
            <span>{userLoc.province.replace(" Province","") || "Nepal"}</span>
            <ChevronRight size={10} color="#9CA3AF" />
            <span style={{ color:"#374151", fontWeight:600 }}>{userLoc.district}</span>
            <ChevronRight size={10} color="#9CA3AF" />
            <span>{userLoc.area.split(",")[0]}</span>
          </div>

          {/* Category chips */}
          <div style={{ display:"flex", gap:5, overflowX:"auto", paddingBottom:2 }}>
            {NEARBY_CATS.map(cat => (
              <button key={cat} onClick={() => setActiveCat(cat)} style={{
                padding:"4px 11px", borderRadius:20, fontSize:11, fontWeight:500,
                whiteSpace:"nowrap", cursor:"pointer", flexShrink:0, transition:"all 0.12s",
                border:`0.5px solid ${activeCat===cat ? "#185FA5" : "#E5E7EB"}`,
                background: activeCat===cat ? "#185FA5" : "transparent",
                color: activeCat===cat ? "white" : "#6B7280",
              }}>{cat}</button>
            ))}
          </div>
        </div>

        {/* Place cards */}
        <div style={{ flex:1, overflowY:"auto", padding:"10px 14px" }}>
          {gpsStatus === "requesting" ? (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:14, paddingTop:60 }}>
              <div style={{ fontSize:44 }}>📍</div>
              <div style={{ fontSize:14, fontWeight:600, color:"#374151", textAlign:"center" }}>Finding places near you…</div>
              <div style={{ width:160, height:3, background:"#E5E7EB", borderRadius:2, overflow:"hidden" }}>
                <div style={{ width:"55%", height:"100%", background:"#185FA5", borderRadius:2, animation:"nearbySlide 1.4s ease-in-out infinite" }} />
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign:"center", padding:"40px 20px" }}>
              <div style={{ fontSize:32, marginBottom:8 }}>🔍</div>
              <div style={{ fontSize:13, fontWeight:600, color:"#374151", marginBottom:6 }}>
                No {activeCat === "All" ? "places" : activeCat.toLowerCase()} within {radius} km
              </div>
              <div style={{ fontSize:11, color:"#9CA3AF", marginBottom:14 }}>Try a larger radius</div>
              <button onClick={() => setRadius(r => (r===5?10:r===10?25:r===25?50:50) as 5|10|25|50)}
                style={{ padding:"7px 16px", borderRadius:8, border:"0.5px solid #185FA5", background:"transparent", color:"#185FA5", fontSize:12, fontWeight:600, cursor:"pointer" }}>
                Expand to {radius===5?10:radius===10?25:50} km
              </button>
            </div>
          ) : (
            filtered.map(place => {
              const isSelected = place.id === selectedId
              const col = NEARBY_COLORS[place.colorKey] || "#185FA5"
              return (
                <div key={place.id}
                  onClick={() => {
                    setSelectedId(place.id)
                    if (mapObj.current) mapObj.current.panTo({ lat: place.lat, lng: place.lng })
                  }}
                  style={{
                    display:"flex", alignItems:"center", gap:10,
                    padding:"10px 10px", borderRadius:8, marginBottom:6, cursor:"pointer",
                    border:`${isSelected?"1.5px":"0.5px"} solid ${isSelected?"#185FA5":"#E5E7EB"}`,
                    background: isSelected?"#EBF2FB":"white",
                    borderLeft: isSelected?"3px solid #185FA5":"0.5px solid #E5E7EB",
                    transition:"all 0.12s",
                  }}
                  onMouseEnter={e=>{ if(!isSelected) e.currentTarget.style.background="#F9FAFB" }}
                  onMouseLeave={e=>{ if(!isSelected) e.currentTarget.style.background="white" }}
                >
                  <div style={{ width:36, height:36, borderRadius:8, flexShrink:0, background:col+"18", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>
                    {place.emoji}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:"#111827", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {place.name}
                    </div>
                    <div style={{ fontSize:11, color:"#6B7280", marginTop:1 }}>
                      {place.category} · {place.region}
                    </div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:5, flexShrink:0 }}>
                    <span style={{ fontSize:10, fontWeight:600, padding:"2px 7px", borderRadius:10, background:col+"18", color:col }}>
                      {place.dist} km
                    </span>
                    <ChevronRight size={13} color="#9CA3AF" />
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Route preview footer */}
        {selected && gpsStatus !== "requesting" && (
          <div style={{ padding:"12px 14px", borderTop:"0.5px solid #E5E7EB", flexShrink:0, background:"#FAFAFA" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
              <div style={{ width:32, height:32, borderRadius:8, flexShrink:0, background:(NEARBY_COLORS[selected.colorKey]||"#185FA5")+"18", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>
                {selected.emoji}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, fontWeight:700, color:"#111827" }}>{selected.name}</div>
                <div style={{ display:"flex", gap:8, marginTop:3, flexWrap:"wrap" }}>
                  <span style={{ fontSize:10, color:"#6B7280" }}>📍 {selected.dist} km</span>
                  <span style={{ fontSize:10, color:"#6B7280" }}>🚗 ~{Math.ceil(selected.dist/0.4)} min</span>
                  <span style={{ fontSize:10, color:"#6B7280" }}>🚶 ~{Math.ceil(selected.dist/0.08)} min</span>
                  <span style={{ fontSize:10, color:"#3B6D11" }}>● {selected.province}</span>
                </div>
              </div>
            </div>
            <div style={{ display:"flex", gap:7 }}>
              <button
                onClick={() => {
                  const origin = userCoords
                    ? `${userCoords.lat.toFixed(6)},${userCoords.lng.toFixed(6)}`
                    : userLoc.area + ", Nepal"
                  navigateTo("pathfinder", {
                    origin,
                    dest: `${selected.name}, ${selected.region}, Nepal`,
                  })
                }}
                style={{ flex:1, padding:"8px 0", borderRadius:8, border:"none", background:"#185FA5", color:"white", fontSize:11, fontWeight:700, cursor:"pointer" }}
              >
                🗺 Navigate in Pathfinder
              </button>
              <button onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selected.name + " " + selected.region + " Nepal")}`, "_blank")}
                style={{ flex:1, padding:"8px 0", borderRadius:8, border:"0.5px solid #185FA5", background:"transparent", color:"#185FA5", fontSize:11, fontWeight:600, cursor:"pointer" }}>
                View details
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes nearbySlide { 0%{transform:translateX(-180px)} 100%{transform:translateX(180px)} }
      `}</style>
    </div>
  )
}



function BookingPage() {
  const { t, isDark, isMobile, navigateTo } = useT()

  // ── GPS detection ─────────────────────────────────────────────────────────
  const [gpsStatus,   setGpsStatus]   = useState<"requesting"|"granted"|"denied">("requesting")
  const [userCoords,  setUserCoords]  = useState<{lat:number;lng:number}|null>(null)
  const [userLoc,     setUserLoc]     = useState({ area:"Detecting…", district:"—", province:"—" })

  // ── UI state ──────────────────────────────────────────────────────────────
  const [activeTab,   setActiveTab]   = useState<"all"|"hotels"|"restaurants">("all")
  const [loading,     setLoading]     = useState(true)
  const [places,      setPlaces]      = useState<any[]>([])
  const [selectedId,  setSelectedId]  = useState<string|null>(null)

  // Refs for maps
  const hiddenRef  = useRef<HTMLDivElement>(null)   // invisible div for PlacesService
  const mapRef     = useRef<HTMLDivElement>(null)   // visible right-side map
  const mapObj     = useRef<any>(null)
  const markersRef = useRef<any[]>([])

  // ── 1. Get GPS ────────────────────────────────────────────────────────────
  useEffect(() => {
    const fallback = { lat: 27.7172, lng: 85.3240 }
    if (!navigator.geolocation) {
      setUserCoords(fallback); setGpsStatus("denied")
      setUserLoc(detectNepalZone(fallback.lat, fallback.lng)); return
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setUserCoords(c); setGpsStatus("granted")
        setUserLoc(detectNepalZone(c.lat, c.lng))
      },
      () => {
        setUserCoords(fallback); setGpsStatus("denied")
        setUserLoc(detectNepalZone(fallback.lat, fallback.lng))
      },
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 0 }
    )
  }, [])

  // ── 2. Search Places API when coords ready or tab changes ─────────────────
  useEffect(() => {
    if (!userCoords || !hiddenRef.current) return
    loadGMaps(() => searchNearby(userCoords))
  }, [userCoords, activeTab])

  function searchNearby(coords: {lat:number;lng:number}) {
    const g = (window as any).google.maps
    setLoading(true)

    // PlacesService requires a Map element — use a hidden 1px div
    const tempMap = new g.Map(hiddenRef.current, { center: coords, zoom: 14 })
    const svc = new g.places.PlacesService(tempMap)

    const types = activeTab === "hotels"      ? ["lodging"] :
                  activeTab === "restaurants" ? ["restaurant"] :
                  ["lodging", "restaurant"]

    const search = (type: string): Promise<any[]> =>
      new Promise(resolve =>
        svc.nearbySearch(
          { location: coords, radius: 3000, type },
          (results: any[], status: string) => resolve(status === "OK" ? results : [])
        )
      )

    Promise.all(types.map(search)).then(all => {
      const merged = all.flat()
      // Deduplicate
      const unique = Array.from(new Map(merged.map(p => [p.place_id, p])).values())
      // Add real distance
      const withDist = unique
        .map(p => ({
          ...p,
          dist: Math.round(haversineKm(coords.lat, coords.lng,
                  p.geometry.location.lat(), p.geometry.location.lng()) * 10) / 10,
        }))
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 18)

      setPlaces(withDist)
      setLoading(false)

      // Init/update right-side map
      initRightMap(coords, withDist)
    })
  }

  function initRightMap(coords: {lat:number;lng:number}, nearby: any[]) {
    if (!mapRef.current) return
    const g = (window as any).google.maps

    if (!mapObj.current) {
      mapObj.current = new g.Map(mapRef.current, {
        center: coords, zoom: 14,
        styles: isDark ? DARK_STYLES : LIGHT_STYLES,
        disableDefaultUI: true, zoomControl: true,
      })
      g.event.trigger(mapObj.current, "resize")
      // User pin
      new g.Marker({
        position: coords, map: mapObj.current, zIndex: 999,
        icon: { path: g.SymbolPath.CIRCLE, scale: 9,
          fillColor: "#185FA5", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 3 },
      })
    }

    // Clear old markers
    markersRef.current.forEach(m => m.setMap(null))
    markersRef.current = []

    // Add place markers
    nearby.forEach(place => {
      const isHotel = place.types?.includes("lodging")
      const col = isHotel ? "#185FA5" : "#D85A30"
      const m = new g.Marker({
        position: place.geometry.location,
        map: mapObj.current, title: place.name,
        icon: { path: g.SymbolPath.CIRCLE, scale: 7,
          fillColor: col, fillOpacity: 0.9, strokeColor: "#fff", strokeWeight: 2 },
      })
      m.addListener("click", () => setSelectedId(place.place_id))
      markersRef.current.push(m)
    })
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function getPhoto(place: any): string | null {
    try { return place.photos?.[0]?.getUrl({ maxWidth: 500, maxHeight: 220 }) ?? null }
    catch { return null }
  }

  function priceLabel(lvl: number | undefined): string {
    if (lvl === undefined || lvl === null) return ""
    const labels = ["Free","Budget","Mid-range","Upscale","Luxury"]
    return labels[Math.min(lvl, 4)] || ""
  }

  function ratingStars(r: number | undefined): string {
    const n = Math.round(r || 0)
    return "★".repeat(n) + "☆".repeat(5 - n)
  }

  function openInMaps(place: any) {
    window.open(`https://www.google.com/maps/place/?q=place_id:${place.place_id}`, "_blank")
  }

  function getDirections(place: any) {
    if (!userCoords) return
    navigateTo("pathfinder", {
      origin: `${userCoords.lat.toFixed(6)},${userCoords.lng.toFixed(6)}`,
      dest:   `${place.name}, ${place.vicinity || "Nepal"}`,
    })
  }

  const isHotelPlace = (p: any) => p.types?.includes("lodging")
  const isRestPlace  = (p: any) => p.types?.some((t: string) => ["restaurant","food","cafe","bakery","bar"].includes(t))
  const selected = places.find(p => p.place_id === selectedId)

  return (
    <div style={{ display:"flex", flexDirection: isMobile ? "column" : "row", height: isMobile ? "auto" : "100vh", minHeight:"100vh", overflow: isMobile ? "auto" : "hidden" }}>

      {/* Invisible div for PlacesService */}
      <div ref={hiddenRef} style={{ position:"fixed", width:1, height:1, opacity:0, pointerEvents:"none", left:-9999 }} />

      {/* ── LEFT: Cards (65%) ──────────────────────────────────────────────── */}
      <div style={{ flex: isMobile ? "none" : "0 0 65%", display:"flex", flexDirection:"column", overflow: isMobile ? "visible" : "hidden", borderRight: isMobile ? "none" : `0.5px solid ${t.border}` }}>

        {/* Header */}
        <div style={{ padding:"18px 20px 14px", borderBottom:`0.5px solid ${t.border}`, background:t.surface, flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
            <div>
              <h1 style={{ fontSize:18, fontWeight:700, color:t.text, margin:0 }}>Book & Reserve</h1>
              <div style={{ fontSize:11, color:t.textSub, marginTop:3, display:"flex", alignItems:"center", gap:6 }}>
                <div style={{ width:6, height:6, borderRadius:"50%",
                  background: gpsStatus==="granted" ? "#22C55E" : gpsStatus==="denied" ? "#EF4444" : "#F59E0B",
                  flexShrink:0 }} />
                {gpsStatus==="requesting" ? "Detecting your location…" :
                 gpsStatus==="denied"     ? `Location unavailable · Showing Kathmandu` :
                 `Near ${userLoc.area}, ${userLoc.district}`}
              </div>
            </div>
            <div style={{ fontSize:12, color:t.textFaint }}>
              {loading ? "Searching…" : `${places.length} places found`}
            </div>
          </div>

          {/* Tab filter */}
          <div style={{ display:"flex", gap:6 }}>
            {(["all","hotels","restaurants"] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{
                padding:"6px 16px", borderRadius:20, fontSize:12, fontWeight:500,
                cursor:"pointer", transition:"all 0.12s",
                border:`0.5px solid ${activeTab===tab ? t.blue : t.border}`,
                background: activeTab===tab ? t.blue : t.surface,
                color: activeTab===tab ? "#fff" : t.textSub,
              }}>
                {tab==="all"?"🏨🍽 All":tab==="hotels"?"🏨 Hotels":"🍽 Restaurants"}
              </button>
            ))}
          </div>
        </div>

        {/* Cards */}
        <div style={{ flex:1, overflowY:"auto", padding:16 }}>

          {loading ? (
            <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,1fr)", gap:12 }}>
              {Array.from({length:6}).map((_,i) => (
                <div key={i} style={{ borderRadius:12, border:`0.5px solid ${t.border}`, overflow:"hidden", background:t.surface }}>
                  <div style={{ height:160, background:t.subtle, animation:"shimmer 1.5s ease-in-out infinite" }} />
                  <div style={{ padding:14 }}>
                    <div style={{ height:13, background:t.subtle, borderRadius:4, marginBottom:8, width:"70%" }} />
                    <div style={{ height:10, background:t.subtle, borderRadius:4, width:"50%" }} />
                  </div>
                </div>
              ))}
            </div>
          ) : places.length === 0 ? (
            <div style={{ textAlign:"center", padding:"60px 20px" }}>
              <div style={{ fontSize:40, marginBottom:12 }}>🔍</div>
              <div style={{ fontSize:14, fontWeight:600, color:t.textMid, marginBottom:6 }}>No places found nearby</div>
              <div style={{ fontSize:12, color:t.textSub }}>Try switching to a different category or check your location</div>
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,1fr)", gap:12 }}>
              {places.map(place => {
                const photo      = getPhoto(place)
                const isSelected = place.place_id === selectedId
                const isHotel    = isHotelPlace(place)
                const accentCol  = isHotel ? t.blue : t.orange
                const accentBg   = isHotel ? t.blueLight : t.orangeLight

                return (
                  <div key={place.place_id}
                    onClick={() => { setSelectedId(place.place_id); if (mapObj.current) mapObj.current.panTo(place.geometry.location) }}
                    style={{
                      borderRadius:12, overflow:"hidden", cursor:"pointer",
                      border:`${isSelected?"1.5px":"0.5px"} solid ${isSelected ? t.blue : t.border}`,
                      background:t.surface, transition:"all 0.15s",
                      boxShadow: isSelected ? `0 0 0 2px ${t.blueLight}` : "none",
                    }}
                  >
                    {/* Photo or placeholder */}
                    <div style={{ height:150, background:t.subtle, position:"relative", overflow:"hidden" }}>
                      {photo ? (
                        <img src={photo} alt={place.name}
                          style={{ width:"100%", height:"100%", objectFit:"cover" }}
                          onError={e => { (e.target as HTMLImageElement).style.display="none" }}
                        />
                      ) : (
                        <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:42 }}>
                          {isHotel ? "🏨" : "🍽"}
                        </div>
                      )}
                      {/* Type + distance badge */}
                      <div style={{ position:"absolute", top:8, left:8, display:"flex", gap:4 }}>
                        <span style={{ background:accentCol, color:"#fff", borderRadius:6, padding:"2px 8px", fontSize:9, fontWeight:700 }}>
                          {isHotel ? "Hotel" : "Restaurant"}
                        </span>
                      </div>
                      <div style={{ position:"absolute", top:8, right:8 }}>
                        <span style={{ background:"rgba(0,0,0,0.6)", color:"#fff", borderRadius:6, padding:"2px 8px", fontSize:9, fontWeight:600 }}>
                          📍 {place.dist} km
                        </span>
                      </div>
                      {/* Open/closed status omitted — open_now field is deprecated */}
                    </div>

                    {/* Info */}
                    <div style={{ padding:"12px 14px" }}>
                      <div style={{ fontSize:13, fontWeight:700, color:t.text, marginBottom:4,
                        overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {place.name}
                      </div>

                      {/* Rating + price */}
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5 }}>
                        {place.rating && (
                          <div style={{ display:"flex", alignItems:"center", gap:3 }}>
                            <span style={{ color:"#F59E0B", fontSize:11 }}>{ratingStars(place.rating)}</span>
                            <span style={{ fontSize:10, color:t.textSub, fontWeight:600 }}>{place.rating.toFixed(1)}</span>
                            {place.user_ratings_total && (
                              <span style={{ fontSize:9, color:t.textFaint }}>({place.user_ratings_total})</span>
                            )}
                          </div>
                        )}
                        {place.price_level !== undefined && (
                          <span style={{ fontSize:10, color:accentCol, fontWeight:600,
                            background:accentBg, borderRadius:4, padding:"1px 6px" }}>
                            {priceLabel(place.price_level)}
                          </span>
                        )}
                      </div>

                      {/* Address */}
                      {place.vicinity && (
                        <div style={{ fontSize:10, color:t.textSub, marginBottom:10,
                          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                          📍 {place.vicinity}
                        </div>
                      )}

                      {/* Buttons */}
                      <div style={{ display:"flex", gap:6 }}>
                        <button
                          onClick={e => { e.stopPropagation(); getDirections(place) }}
                          style={{ flex:1, padding:"7px 0", borderRadius:7, border:"none",
                            background:t.blue, color:"#fff", fontSize:10, fontWeight:700, cursor:"pointer" }}>
                          🗺 Directions
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); openInMaps(place) }}
                          style={{ flex:1, padding:"7px 0", borderRadius:7,
                            border:`0.5px solid ${t.border}`, background:t.surface,
                            color:t.textMid, fontSize:10, fontWeight:600, cursor:"pointer" }}>
                          View details
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: Live Map (35%) ────────────────────────────────────────────── */}
      <div style={{ flex: isMobile ? "none" : "0 0 35%", height: isMobile ? 300 : undefined, display:"flex", flexDirection:"column", overflow:"hidden" }}>

        {/* Map */}
        <div ref={mapRef} style={{ flex:1 }} />

        {/* Selected place detail card */}
        {selected && !loading && (
          <div style={{ padding:"12px 14px", borderTop:`0.5px solid ${t.border}`, background:t.surface, flexShrink:0 }}>
            <div style={{ display:"flex", gap:10, marginBottom:10 }}>
              <div style={{ width:38, height:38, borderRadius:8, flexShrink:0, fontSize:22,
                display:"flex", alignItems:"center", justifyContent:"center",
                background: isHotelPlace(selected) ? t.blueLight : t.orangeLight }}>
                {isHotelPlace(selected) ? "🏨" : "🍽"}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:700, color:t.text,
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {selected.name}
                </div>
                <div style={{ fontSize:11, color:t.textSub, marginTop:2 }}>
                  {selected.rating && <span style={{ color:"#F59E0B" }}>★ {selected.rating.toFixed(1)} · </span>}
                  📍 {selected.dist} km · {priceLabel(selected.price_level) || "—"}
                </div>
              </div>
            </div>
            <div style={{ display:"flex", gap:7 }}>
              <button onClick={() => getDirections(selected)}
                style={{ flex:1, padding:"8px 0", borderRadius:8, border:"none",
                  background:t.blue, color:"#fff", fontSize:11, fontWeight:700, cursor:"pointer" }}>
                🗺 Navigate in Pathfinder
              </button>
              <button onClick={() => openInMaps(selected)}
                style={{ flex:1, padding:"8px 0", borderRadius:8,
                  border:`0.5px solid ${t.blue}`, background:"transparent",
                  color:t.blue, fontSize:11, fontWeight:600, cursor:"pointer" }}>
                Open in Maps
              </button>
            </div>
          </div>
        )}

        {/* No-key placeholder */}
        {!GMAPS_KEY && (
          <div style={{ position:"absolute", inset:0, zIndex:20, display:"flex", flexDirection:"column",
            alignItems:"center", justifyContent:"center", gap:10, background:t.subtle }}>
            <div style={{ fontSize:36 }}>🗺</div>
            <div style={{ fontSize:12, color:t.textMid, textAlign:"center", maxWidth:200 }}>
              Add VITE_GOOGLE_MAPS_API_KEY to show the live map
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes shimmer {
          0%,100% { opacity:1 } 50% { opacity:0.5 }
        }
      `}</style>
    </div>
  )
}


// ── Local mock fallbacks (used when both Flask backend and Supabase are offline) ─

// Detect which Nepal province the destination belongs to
function detectDestinationProvince(dest: string): string | null {
  const d = dest.toLowerCase()
  if (/kathmandu|patan|lalitpur|bhaktapur|bagmati|namobuddha|dhulikhel|nagarkot|boudha|swayambhu|pashupatinath|changu/.test(d)) return "Bagmati"
  if (/pokhara|kaski|gandaki|annapurna|mustang|gorkha|bandipur|sarangkot|begnas|manaslu|poon hill|beni|baglung/.test(d)) return "Gandaki"
  if (/chitwan|lumbini|butwal|palpa|tansen|narayanghat|bharatpur|janakpur|palpa|kapilvastu|bhairahawa|rupandehi/.test(d)) return "Lumbini"
  if (/biratnagar|dharan|ilam|taplejung|koshi|sunsari|morang|sankhuwasabha|hile/.test(d)) return "Koshi"
  if (/janakpur|madhesh|dhanusha|siraha|sarlahi|mahottari|bara|parsa|rautahat/.test(d)) return "Madhesh"
  if (/rara|jumla|karnali|surkhet|birendranagar|dolpo|mugu|dailekh/.test(d)) return "Karnali"
  if (/dhangadhi|kanchanpur|sudurpashchim|darchula|bajura|bajhang|dadeldhura/.test(d)) return "Sudurpashchim"
  return null
}

function mockMLRecommend(budget: number, purposes: string[], days: number, destination = ""): Destination[] {
  const pool: Destination[] = [
    // ── Bagmati Province ──────────────────────────────────────────────────────
    { name:"Pashupatinath Temple",  district:"Kathmandu",       province:"Bagmati",       categories:["cultural","spiritual"], costPerDay:800,  score:0.95, emoji:"🛕", highlights:["UNESCO listed","Hindu heritage","Evening aarti","Sacred ghats"] },
    { name:"Boudhanath Stupa",      district:"Kathmandu",       province:"Bagmati",       categories:["cultural","spiritual"], costPerDay:600,  score:0.92, emoji:"🏛", highlights:["World's largest stupa","Tibetan hub","Kora circuit"] },
    { name:"Patan Durbar Square",   district:"Lalitpur",        province:"Bagmati",       categories:["history","cultural"],   costPerDay:650,  score:0.90, emoji:"🏰", highlights:["Malla palace","Newari architecture","Patan Museum"] },
    { name:"Bhaktapur Durbar Sq",   district:"Bhaktapur",       province:"Bagmati",       categories:["history","cultural"],   costPerDay:750,  score:0.89, emoji:"🏯", highlights:["55-Window Palace","Pottery square","Medieval city"] },
    { name:"Changu Narayan",        district:"Bhaktapur",       province:"Bagmati",       categories:["history","spiritual"],  costPerDay:700,  score:0.86, emoji:"🛕", highlights:["Oldest temple in Nepal","Stone carvings","UNESCO site"] },
    { name:"Namobuddha Monastery",  district:"Kavrepalanchok",  province:"Bagmati",       categories:["spiritual","nature"],   costPerDay:900,  score:0.84, emoji:"🌄", highlights:["Sacred Buddhist site","Himalayan views","Forest trails"] },
    { name:"Swayambhunath Stupa",   district:"Kathmandu",       province:"Bagmati",       categories:["spiritual","cultural"], costPerDay:550,  score:0.88, emoji:"🐵", highlights:["Monkey temple","Kathmandu panorama","Ancient stupa"] },
    { name:"Shivapuri Nat. Park",   district:"Kathmandu",       province:"Bagmati",       categories:["wildlife","nature"],    costPerDay:500,  score:0.80, emoji:"🌿", highlights:["Day hikes","Leopards & langurs","Bird watching"] },
    { name:"Nagarkot",              district:"Bhaktapur",       province:"Bagmati",       categories:["nature","cultural"],    costPerDay:1200, score:0.83, emoji:"🌄", highlights:["Himalayan sunrise","Mountain panorama","Hill resort"] },
    { name:"Dhulikhel",             district:"Kavrepalanchok",  province:"Bagmati",       categories:["nature","cultural"],    costPerDay:1000, score:0.82, emoji:"🏔", highlights:["Himalaya views","Cycling trails","Heritage town"] },
    // ── Gandaki Province ─────────────────────────────────────────────────────
    { name:"Phewa Lake Pokhara",    district:"Kaski",           province:"Gandaki",       categories:["nature","cultural"],    costPerDay:1200, score:0.92, emoji:"🌊", highlights:["Boating on Phewa","Fish Tail reflection","Paragliding"] },
    { name:"Sarangkot Viewpoint",   district:"Kaski",           province:"Gandaki",       categories:["nature","adventure"],   costPerDay:800,  score:0.87, emoji:"🌅", highlights:["Famous sunrise","Dhaulagiri views","Paragliding launch"] },
    { name:"Peace Pagoda Pokhara",  district:"Kaski",           province:"Gandaki",       categories:["spiritual","nature"],   costPerDay:600,  score:0.84, emoji:"☮",  highlights:["Japanese peace stupa","Lakeside views","Peaceful retreat"] },
    { name:"Bandipur Village",      district:"Tanahun",         province:"Gandaki",       categories:["heritage","cultural"],  costPerDay:800,  score:0.85, emoji:"🏘", highlights:["Medieval Newari town","Himalama panorama","Car-free streets"] },
    { name:"Manakamana Temple",     district:"Gorkha",          province:"Gandaki",       categories:["spiritual","cultural"], costPerDay:700,  score:0.86, emoji:"🛕", highlights:["Cable car ride","Goddess temple","Valley views"] },
    { name:"Begnas Lake",           district:"Kaski",           province:"Gandaki",       categories:["nature","cultural"],    costPerDay:700,  score:0.80, emoji:"🏞", highlights:["Serene lake","Boating","Rural Nepal experience"] },
    { name:"Gorkha Durbar",         district:"Gorkha",          province:"Gandaki",       categories:["history","cultural"],   costPerDay:600,  score:0.81, emoji:"🏰", highlights:["Palace of kings","Birthplace of Prithvi","Valley views"] },
    // ── Lumbini Province ─────────────────────────────────────────────────────
    { name:"Lumbini Sacred Garden", district:"Rupandehi",       province:"Lumbini",       categories:["spiritual","history"],  costPerDay:600,  score:0.91, emoji:"☮",  highlights:["Buddha birthplace","UNESCO site","Maya Devi Temple"] },
    { name:"Chitwan National Park", district:"Chitwan",         province:"Lumbini",       categories:["wildlife","nature"],    costPerDay:2200, score:0.93, emoji:"🐘", highlights:["One-horned rhinos","Bengal tigers","Jungle safari"] },
    { name:"Tansen Palpa",          district:"Palpa",           province:"Lumbini",       categories:["heritage","cultural"],  costPerDay:700,  score:0.82, emoji:"⛩",  highlights:["Heritage hill town","Dhaka weaving","Rani Mahal"] },
    { name:"Beeshazar Lake",        district:"Chitwan",         province:"Lumbini",       categories:["wildlife","nature"],    costPerDay:800,  score:0.79, emoji:"🦏", highlights:["Wetland wildlife","Bird watching","Rhino sightings"] },
    // ── Koshi Province ───────────────────────────────────────────────────────
    { name:"Pathibhara Temple",     district:"Taplejung",       province:"Koshi",         categories:["spiritual","nature"],   costPerDay:400,  score:0.84, emoji:"🛕", highlights:["High altitude temple","Pilgrimage site","Mountain panorama"] },
    { name:"Ilam Tea Gardens",      district:"Ilam",            province:"Koshi",         categories:["nature","cultural"],    costPerDay:600,  score:0.81, emoji:"🍃", highlights:["Rolling tea hills","Orthodox tea","Sunrise views"] },
    { name:"Koshi Tappu Reserve",   district:"Sunsari",         province:"Koshi",         categories:["wildlife","nature"],    costPerDay:600,  score:0.78, emoji:"🦏", highlights:["Wild water buffalo","Migratory birds","River ecosystem"] },
    // ── Madhesh Province ─────────────────────────────────────────────────────
    { name:"Janaki Temple",         district:"Dhanusha",        province:"Madhesh",       categories:["spiritual","history"],  costPerDay:400,  score:0.85, emoji:"🏛", highlights:["Ram-Sita birthplace","Maithili art","Ornate architecture"] },
    { name:"Parsa National Park",   district:"Parsa",           province:"Madhesh",       categories:["wildlife","nature"],    costPerDay:800,  score:0.76, emoji:"🐅", highlights:["Royal Bengal tiger","Gaur bison","Dense Sal forest"] },
    // ── Karnali Province ─────────────────────────────────────────────────────
    { name:"Rara National Park",    district:"Mugu",            province:"Karnali",       categories:["nature","wildlife"],    costPerDay:3800, score:0.88, emoji:"🏞", highlights:["Nepal's largest lake","Remote wilderness","Crystal water"] },
    { name:"Khaptad National Park", district:"Achham",          province:"Karnali",       categories:["nature","spiritual"],   costPerDay:800,  score:0.79, emoji:"🌿", highlights:["Plateau grasslands","Hindu pilgrimage","Rare plants"] },
    // ── Sudurpashchim Province ────────────────────────────────────────────────
    { name:"Shuklaphanta Nat. Park",district:"Kanchanpur",      province:"Sudurpashchim", categories:["wildlife","nature"],    costPerDay:600,  score:0.82, emoji:"🐆", highlights:["Largest swamp deer herd","Royal Bengal tiger","Grasslands"] },
    { name:"Badimalika Temple",     district:"Bajura",          province:"Sudurpashchim", categories:["spiritual","nature"],   costPerDay:400,  score:0.74, emoji:"🌺", highlights:["High altitude pilgrimage","Sacred goddess","Alpine meadows"] },
  ]

  const daily       = budget / Math.max(days, 1)
  const targetProv  = detectDestinationProvince(destination)

  const scored = pool
    .map(d => {
      const affordable   = d.costPerDay <= daily * 1.4
      const purposeMatch = purposes.length === 0 || purposes.some(p => (d.categories ?? []).includes(p))
      if (!affordable || !purposeMatch) return null

      // Boost score if province matches the typed destination
      const provinceMult = targetProv && d.province === targetProv ? 1.18 : targetProv ? 0.72 : 1.0
      return { ...d, score: Math.min(0.99, d.score * provinceMult) }
    })
    .filter(Boolean) as Destination[]

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
}

function mockGenerateItinerary(dest: Destination, days: number, from: string): DayPlan[] {
  const templates: Record<string, Activity[]> = {
    cultural:  [
      { time:"08:00", title:`Visit ${dest.name}`, note:"Arrive early to avoid crowds", icon:"🏛", cost:600 },
      { time:"10:30", title:"Guided heritage walk", note:"Local guide available (Rs 800)", icon:"🎒", cost:800 },
      { time:"13:00", title:"Traditional Newari lunch", note:"Budget Rs 400–600", icon:"🍽", cost:500 },
      { time:"15:00", title:"Photography walk", note:"Golden hour at 16:30", icon:"📸", cost:0 },
      { time:"18:30", title:"Evening ceremony", note:"Check local schedule", icon:"🪔", cost:150 },
    ],
    spiritual: [
      { time:"06:30", title:"Sunrise prayer", note:"Respectful dress required", icon:"🙏", cost:100 },
      { time:"09:00", title:"Kora circuit", note:"3 km walking circuit", icon:"⭕", cost:0 },
      { time:"13:00", title:"Monastery meal", note:"Simple vegetarian", icon:"🌱", cost:200 },
      { time:"15:00", title:"Meditation session", note:"Guided, 60 min", icon:"🧘", cost:300 },
    ],
    nature:    [
      { time:"07:00", title:"Morning hike", note:"Bring water and layers", icon:"🌄", cost:200 },
      { time:"12:00", title:"Picnic lunch", note:"Pack from market", icon:"🧺", cost:300 },
      { time:"14:00", title:"Wildlife spotting", note:"Best with a guide", icon:"🦋", cost:400 },
    ],
    adventure: [
      { time:"07:00", title:"Trek start", note:"Pack warm layers", icon:"🥾", cost:200 },
      { time:"13:00", title:"Summit lunch", note:"Bring packed food", icon:"🍜", cost:250 },
      { time:"17:00", title:"Camp setup", note:"With guide", icon:"⛺", cost:900 },
    ],
    wildlife:  [
      { time:"06:00", title:"Dawn safari", note:"Best sighting time", icon:"🐘", cost:1500 },
      { time:"12:00", title:"Camp lunch", note:"Included with safari", icon:"🍱", cost:350 },
      { time:"16:30", title:"Jeep safari", note:"Open grasslands", icon:"🚙", cost:1200 },
    ],
  }
  const primary = dest.categories?.[0] ?? "cultural"
  const acts = templates[primary] ?? templates.cultural
  const sameCity = from.toLowerCase().includes(dest.district.toLowerCase())
  const travelCost = sameCity ? 250 : 900
  const accCost = Math.max(1200, Math.min(3500, dest.costPerDay * 0.7))

  return Array.from({ length: days }, (_, d) => {
    const dayActs: Activity[] = []
    if (d === 0) dayActs.push({ time:"07:30", title:`Travel to ${dest.district}`, note:`From ${from}`, icon:"🚌", cost:travelCost })
    dayActs.push(...acts.slice((d * 2) % acts.length, (d * 2) % acts.length + 3))
    if (d < days - 1) dayActs.push({ time:"20:00", title:"Check-in & dinner", note:`Rs ${Math.round(accCost).toLocaleString()}/night`, icon:"🏨", cost:accCost + 400 })
    else dayActs.push({ time:"17:00", title:`Return to ${from}`, note:"Depart early", icon:"🏠", cost:travelCost })
    return { day: d + 1, theme: d === 0 ? `Arrival & first impressions` : `${dest.name} — day ${d + 1}`, activities: dayActs, totalCost: dayActs.reduce((s, a) => s + a.cost, 0) }
  })
}

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ flex: 1, height: 4, borderRadius: 4, background: "rgba(0,0,0,0.08)", overflow: "hidden" }}>
        <div style={{ width: `${Math.round(score * 100)}%`, height: "100%", background: color, borderRadius: 4, transition: "width 0.5s ease" }} />
      </div>
      <span style={{ fontSize: 10, fontWeight: 600, color, minWidth: 30 }}>{Math.round(score * 100)}%</span>
    </div>
  )
}

const PURPOSE_OPTIONS = [
  { id: "cultural",   label: "Cultural sites", icon: <Landmark size={13} /> },
  { id: "wildlife",   label: "Wildlife",       icon: <TreePine  size={13} /> },
  { id: "history",    label: "History",        icon: <Scroll    size={13} /> },
  { id: "spiritual",  label: "Spiritual",      icon: <Star      size={13} /> },
  { id: "nature",     label: "Nature",         icon: <Camera    size={13} /> },
  { id: "adventure",  label: "Adventure",      icon: <MapPinned size={13} /> },
]

// Timeout wrapper — ensures promises never hang the UI indefinitely
function withTimeout<T>(p: Promise<T | null>, ms: number): Promise<T | null> {
  return Promise.race([p, new Promise<null>(res => setTimeout(() => res(null), ms))])
}

// ── Floating trip assistant bubble (🤖) shown after itinerary is generated ────

interface AssistantMsg { id: string; role: "bot" | "user"; text: string; chips?: string[] }

function FloatingTripAssistant({ from, dest, itinerary, budget, days, travelMode, t, onSetDays, onSetBudget, onSetTravelMode, onReplan, onOpenMaps }: {
  from: string; dest: Destination; itinerary: DayPlan[]; budget: number; days: number
  travelMode: string; t: Theme
  onSetDays: (n: number) => void; onSetBudget: (n: number) => void
  onSetTravelMode: (m: string) => void; onReplan: () => void
  onOpenMaps: (mode?: string, day?: number) => void
}) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState("")
  const [msgs, setMsgs] = useState<AssistantMsg[]>([{
    id: "welcome", role: "bot",
    text: `Your ${days}-day trip to ${dest.name} is ready! I can help you adjust it or open it in Google Maps.`,
    chips: ["🗺 Open in Google Maps", "➕ Add 1 more day", "🍜 Food nearby"],
  }])
  const bottomRef = useRef<HTMLDivElement>(null)
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }) }, [msgs])

  async function send(text: string) {
    if (!text.trim()) return
    setMsgs(prev => [...prev, { id: Date.now().toString(), role: "user", text }])
    setInput("")
    const t2 = text.toLowerCase()
    let reply = `I can help! Try: "Add 2 days", "Budget Rs 5000", "Open in Google Maps", or "What to eat there".`
    let chips = ["🗺 Open in Google Maps", "➕ Add 1 day", "🌤 Weather info"]
    if (/open|map|navigate/.test(t2)) { onOpenMaps(travelMode); reply = "Opening Google Maps with your full itinerary! 🗺" }
    else if (/add (\d+)|(\d+) more day/.test(t2)) { const m = t2.match(/(\d+)/); const n=m?parseInt(m[1]):1; onSetDays(days+n); setTimeout(onReplan,100); reply=`Adding ${n} day${n>1?"s":""}—replanning now…` }
    else if (/budget|rs|rupee/.test(t2)) { const m = t2.match(/(\d[\d,]+)/); if(m){const n=parseInt(m[1].replace(/,/g,""));onSetBudget(n);setTimeout(onReplan,100);reply=`Budget updated to Rs ${n.toLocaleString()}—replanning…`} }
    else if (/walk|foot/.test(t2)) { onSetTravelMode("walking"); reply="Travel mode set to 🚶 walking." }
    else if (/transit|bus/.test(t2)) { onSetTravelMode("transit"); reply="Travel mode set to 🚌 transit." }
    else if (/drive|car|taxi/.test(t2)) { onSetTravelMode("driving"); reply="Travel mode set to 🚗 driving." }
    else if (/food|eat|restaur|lunch|dinner/.test(t2)) { reply=`Great food near ${dest.name}:\n• Dal-bhat Rs 200–400\n• Newari thali Rs 300–600\n• Street momos Rs 80–150` }
    else if (/hotel|stay|sleep/.test(t2)) { reply=`Accommodation near ${dest.district}:\n• Budget Rs 800–1,500/night\n• Mid-range Rs 2,500–4,500/night\n• Heritage Rs 6,000+/night` }
    else if (/weather|rain|cold|season/.test(t2)) { reply="Spring (Mar–May): 15–25°C ☀️ ideal\nAutumn (Sep–Nov): 12–22°C 🍂 peak season\nSummer: monsoon 🌧\nWinter: dry & crisp ❄️" }
    setTimeout(() => setMsgs(prev => [...prev, { id: Date.now()+"-bot", role: "bot", text: reply, chips }]), 300)
  }

  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 200 }}>
      {!open ? (
        <button onClick={() => setOpen(true)} style={{ width: 52, height: 52, borderRadius: "50%", border: "none", background: t.blue, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 18px rgba(24,95,165,0.45)", fontSize: 22 }} title="Trip assistant">🤖</button>
      ) : (
        <div style={{ width: 320, borderRadius: 14, overflow: "hidden", border: `0.5px solid ${t.border}`, boxShadow: "0 8px 32px rgba(0,0,0,0.18)", display: "flex", flexDirection: "column", maxHeight: 480, background: t.surface }}>
          <div style={{ background: t.blue, padding: "11px 14px", display: "flex", alignItems: "center", gap: 9 }}>
            <span style={{ fontSize: 18 }}>🤖</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>Trip assistant</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.7)" }}>{dest.name} · {days} days</div>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.8)", cursor: "pointer", fontSize: 16, padding: 2 }}>×</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
            {msgs.map(msg => (
              <div key={msg.id}>
                {msg.role === "user" ? (
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <div style={{ background: t.blue, color: "#fff", borderRadius: "12px 12px 2px 12px", padding: "7px 11px", fontSize: 12, maxWidth: 220 }}>{msg.text}</div>
                  </div>
                ) : (
                  <div>
                    <div style={{ background: t.subtle, borderRadius: "2px 12px 12px 12px", padding: "8px 11px", fontSize: 12, color: t.text, lineHeight: 1.55, whiteSpace: "pre-line", maxWidth: 260 }}>{msg.text}</div>
                    {msg.chips && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                        {msg.chips.map(chip => (
                          <button key={chip} onClick={() => send(chip)} style={{ padding: "4px 9px", borderRadius: 20, border: `0.5px solid ${t.border}`, background: t.surface, color: t.blue, fontSize: 10, fontWeight: 500, cursor: "pointer" }}>{chip}</button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
          <div style={{ padding: "8px 14px 12px", borderTop: `0.5px solid ${t.border}`, display: "flex", gap: 8 }}>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send(input)} placeholder="Ask me anything…" style={{ flex: 1, height: 34, border: `0.5px solid ${t.border}`, borderRadius: 8, padding: "0 10px", fontSize: 12, color: t.text, background: t.subtle, outline: "none" }} />
            <button onClick={() => send(input)} style={{ width: 34, height: 34, borderRadius: 8, border: "none", background: t.blue, color: "#fff", cursor: "pointer", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Send size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Build a Google Maps Directions URL from itinerary stops
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
    .filter(a => !["🚌", "🏠", "🏨", "🍽", "🍜", "🍱", "🌱"].includes(a.icon))
    .slice(0, 7)
    .map(a => enc(a.title))
    .join("|")

  return (
    `https://www.google.com/maps/dir/?api=1` +
    `&origin=${enc(from)}` +
    `&destination=${enc(`${dest.name}, ${dest.district || "Nepal"}`)}` +
    (waypoints ? `&waypoints=${waypoints}` : "") +
    `&travelmode=${mode}`
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

// ── Suggested trip cards with minimum budget & days ──────────────────────────
const SUGGESTED_TRIPS = [
  { name: "Pokhara",               emoji: "🌊", tag: "Nature & lakes",       cost: "Rs 3,000–6,000/day",  season: "Spring & Autumn", days: "2–4 days", bg: "#EBF2FB", minDays: 2, minBudget: 6000  },
  { name: "Chitwan National Park", emoji: "🐘", tag: "Wildlife safari",      cost: "Rs 2,000–4,000/day",  season: "Winter & Spring", days: "2–3 days", bg: "#EAF2E0", minDays: 2, minBudget: 8000  },
  { name: "Nagarkot",              emoji: "🌄", tag: "Sunrise viewpoint",     cost: "Rs 1,500–3,000/day",  season: "All seasons",     days: "1–2 days", bg: "#EBF2FB", minDays: 1, minBudget: 3000  },
  { name: "Lumbini",               emoji: "☮",  tag: "Spiritual & heritage", cost: "Rs 1,500–3,000/day",  season: "All seasons",     days: "1–2 days", bg: "#FBF3E2", minDays: 1, minBudget: 3000  },
  { name: "Kathmandu Valley",      emoji: "🛕", tag: "Culture & history",    cost: "Rs 2,000–5,000/day",  season: "All seasons",     days: "2–4 days", bg: "#FBEEE8", minDays: 2, minBudget: 5000  },
  { name: "Bandipur",              emoji: "🏘", tag: "Heritage hill town",   cost: "Rs 2,000–3,500/day",  season: "Spring & Autumn", days: "1–2 days", bg: "#EAF2E0", minDays: 1, minBudget: 4000  },
  { name: "Janakpur",              emoji: "🏛", tag: "Religious & culture",  cost: "Rs 1,200–2,500/day",  season: "All seasons",     days: "1–2 days", bg: "#EBF2FB", minDays: 1, minBudget: 2500  },
  { name: "Dharan",                emoji: "🏙", tag: "Mountain gateway",     cost: "Rs 1,500–3,000/day",  season: "All seasons",     days: "1–2 days", bg: "#EAF2E0", minDays: 1, minBudget: 3000  },
]

// ── Entry time restrictions for major Nepal tourist sites ─────────────────────
const ENTRY_RESTRICTIONS: Record<string, { site: string; open: number; close: number; note: string }[]> = {
  "patan":          [{ site: "Patan Durbar Square",   open: 9,  close: 17, note: "Entry Rs 1,000 foreign · closes 5 PM sharp" }],
  "bhaktapur":      [{ site: "Bhaktapur Durbar Sq",   open: 7,  close: 17, note: "Entry Rs 1,500 foreign · closes 5 PM sharp" }],
  "pashupatinath":  [{ site: "Pashupatinath Temple",  open: 4,  close: 21, note: "Foreign visitors: Western Ghats · Rs 1,000" }],
  "boudhanath":     [{ site: "Boudhanath Stupa",      open: 5,  close: 21, note: "Kora open 5 AM – 9 PM daily" }],
  "swayambhunath":  [{ site: "Swayambhunath Stupa",   open: 4,  close: 20, note: "Entry till 8 PM · free for locals" }],
  "changu narayan": [{ site: "Changu Narayan Temple",  open: 6,  close: 17, note: "UNESCO site · closes 5 PM" }],
  "chitwan":        [{ site: "Chitwan National Park",  open: 6,  close: 18, note: "Safari entry closes 6 PM" }, { site: "Elephant Breeding Center", open: 7, close: 17, note: "Closes 5 PM daily" }],
  "lumbini":        [{ site: "Maya Devi Temple",       open: 6,  close: 21, note: "Sacred Garden open 6 AM – 9 PM" }],
  "chandragiri":    [{ site: "Chandragiri Cable Car",  open: 8,  close: 18, note: "Last cable car at 6 PM" }],
  "nagarkot":       [{ site: "Nagarkot Viewpoint",     open: 0,  close: 24, note: "Best at sunrise 5–7 AM · viewpoint open 24h" }],
  "annapurna":      [{ site: "ACAP Permit Check",      open: 6,  close: 18, note: "ACAP & TIMS permit required · check post open 6 AM" }],
  "everest":        [{ site: "Sagarmatha NP Entry",    open: 6,  close: 18, note: "National park entry fee · permit required" }],
}

function getEntryWarnings(destination: string, etaHour: number) {
  const lc = destination.toLowerCase()
  for (const [key, restrictions] of Object.entries(ENTRY_RESTRICTIONS)) {
    if (lc.includes(key)) {
      return restrictions.filter(r => etaHour < r.open || etaHour >= r.close)
    }
  }
  return []
}

// ── Meal suggestions based on journey time ────────────────────────────────────
function getMealStops(departureTimeStr: string, totalDurMin: number) {
  if (!departureTimeStr || !totalDurMin) return []
  const [h, m] = departureTimeStr.split(":").map(Number)
  const dMin = h * 60 + m
  const meals: { icon: string; label: string; time: string; items: string; fraction: number }[] = []

  const add = (mealMin: number, icon: string, label: string, items: string) => {
    if (mealMin > dMin && mealMin < dMin + totalDurMin) {
      meals.push({ icon, label, time: `${Math.floor(mealMin/60)}:${String(mealMin%60).padStart(2,"0")}`, items, fraction: (mealMin - dMin) / totalDurMin })
    }
  }

  // Early breakfast (7 AM) if departing before 7 AM
  if (dMin < 420) add(420,  "🍳", "Breakfast stop",   "Sel roti, tea, eggs · Rs 80–200")
  // Brunch (10 AM) if departing 7–10 AM
  if (dMin >= 420 && dMin < 600) add(600, "☕", "Brunch stop", "Tea, snacks, bread · Rs 100–250")
  // Lunch (12:30 PM)
  add(750,  "🍱", "Lunch stop",       "Dal bhat, rice & curry · Rs 150–400")
  // Afternoon snack (3:30 PM)
  add(930,  "🫖", "Afternoon break",  "Tea, momo, samosa · Rs 80–200")
  // Dinner (7:30 PM)
  add(1170, "🍛", "Dinner stop",      "Dal bhat, thukpa, tandoori · Rs 200–500")

  return meals
}

// Popular stops lookup — keyed by destination keyword
// All stops are road-accessible and verified on Google Maps.
// Remote trek-only locations removed — they caused ZERO_RESULTS in Directions API.
const POPULAR_STOPS_DB: Record<string, { name: string; emoji: string; note: string }[]> = {
  pokhara:   [
    { name:"Manakamana Temple, Gorkha, Nepal",      emoji:"🛕", note:"Cable car temple"   },
    { name:"Bandipur, Tanahun, Nepal",              emoji:"🏘", note:"Hill heritage town"  },
    { name:"Mugling, Chitwan, Nepal",               emoji:"🌊", note:"Riverside stop"      },
    { name:"Gorkha, Gorkha, Nepal",                 emoji:"🏰", note:"Royal palace town"   },
  ],
  chitwan:   [
    { name:"Hetauda, Makwanpur, Nepal",             emoji:"🏙", note:"Midway city"          },
    { name:"Narayanghat, Chitwan, Nepal",           emoji:"🌊", note:"Gandaki confluence"   },
    { name:"Daman, Makwanpur, Nepal",               emoji:"🌄", note:"Himalaya viewpoint"   },
    { name:"Bharatpur, Chitwan, Nepal",             emoji:"🌿", note:"Rapti riverside"      },
  ],
  lumbini:   [
    { name:"Butwal, Rupandehi, Nepal",              emoji:"🏙", note:"Gateway city"         },
    { name:"Tansen, Palpa, Nepal",                  emoji:"⛩",  note:"Heritage hill town"   },
    { name:"Bhairahawa, Rupandehi, Nepal",          emoji:"✈",  note:"Airport & border"     },
    { name:"Sunauli, Rupandehi, Nepal",             emoji:"🌐", note:"India border town"    },
  ],
  annapurna: [
    { name:"Nayapul, Kaski, Nepal",                 emoji:"🌿", note:"Trek trailhead"       },
    { name:"Beni, Myagdi, Nepal",                   emoji:"🌊", note:"River junction"       },
    { name:"Kushma, Parbat, Nepal",                 emoji:"🌉", note:"Bungee bridge town"   },
    { name:"Baglung, Baglung, Nepal",               emoji:"🏙", note:"District hub"         },
  ],
  everest:   [
    { name:"Biratnagar, Morang, Nepal",             emoji:"🏭", note:"Second largest city"  },
    { name:"Dharan, Sunsari, Nepal",                emoji:"🏙", note:"Mountain gateway"     },
    { name:"Hile, Dhankuta, Nepal",                 emoji:"🌄", note:"Scenic mountain town" },
    { name:"Ilam, Ilam, Nepal",                     emoji:"🍃", note:"Tea garden town"      },
  ],
  mustang:   [
    { name:"Beni, Myagdi, Nepal",                   emoji:"🌊", note:"Mustang road gateway" },
    { name:"Baglung, Baglung, Nepal",               emoji:"🏙", note:"District hub"         },
    { name:"Kushma, Parbat, Nepal",                 emoji:"🌉", note:"Swing capital"        },
    { name:"Dhorpatan, Baglung, Nepal",             emoji:"🏕", note:"Hunting reserve"      },
  ],
  rara:      [
    { name:"Nepalgunj, Banke, Nepal",               emoji:"✈",  note:"Flight gateway"       },
    { name:"Surkhet, Surkhet, Nepal",               emoji:"🏙", note:"Karnali capital"      },
    { name:"Birendranagar, Surkhet, Nepal",         emoji:"🌿", note:"Provincial hub"       },
    { name:"Dailekh, Dailekh, Nepal",               emoji:"🏔", note:"Mountain district"    },
  ],
  kathmandu: [
    { name:"Boudhanath, Kathmandu, Nepal",          emoji:"🏛", note:"Buddhist hub"         },
    { name:"Patan Durbar Square, Lalitpur, Nepal",  emoji:"🏰", note:"Newari palace"        },
    { name:"Swayambhunath, Kathmandu, Nepal",       emoji:"🐵", note:"Monkey temple"        },
    { name:"Bhaktapur Durbar Square, Nepal",        emoji:"🏯", note:"Medieval walled city" },
  ],
  bhaktapur: [
    { name:"Changu Narayan, Bhaktapur, Nepal",      emoji:"🏯", note:"UNESCO temple"        },
    { name:"Nagarkot, Bhaktapur, Nepal",            emoji:"🌄", note:"Sunrise viewpoint"    },
    { name:"Dhulikhel, Kavrepalanchok, Nepal",      emoji:"🏔", note:"Himalaya panorama"    },
    { name:"Namo Buddha, Kavrepalanchok, Nepal",    emoji:"🌄", note:"Buddhist monastery"   },
  ],
  ilam:      [
    { name:"Kanyam, Ilam, Nepal",                   emoji:"🍃", note:"Tea estate"           },
    { name:"Birtamod, Jhapa, Nepal",                emoji:"🌾", note:"Jhapa district"       },
    { name:"Phidim, Panchthar, Nepal",              emoji:"🏙", note:"District town"        },
    { name:"Damak, Jhapa, Nepal",                   emoji:"🏙", note:"Eastern hub"          },
  ],
  default:   [
    { name:"Boudhanath Stupa, Kathmandu, Nepal",    emoji:"🏛", note:"Buddhist heritage"    },
    { name:"Patan Durbar Square, Lalitpur, Nepal",  emoji:"🏰", note:"Newari art & culture" },
    { name:"Changu Narayan, Bhaktapur, Nepal",      emoji:"🏯", note:"UNESCO temple"        },
    { name:"Dhulikhel, Kavrepalanchok, Nepal",      emoji:"🏔", note:"Himalaya views"       },
  ],
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
  const { t, isDark, isMobile } = useT()

  // ── Input state ──────────────────────────────────────────────────────────
  const [destination,    setDestination]    = useState("")   // "where to?" — asked first
  const [debouncedDest,  setDebouncedDest]  = useState("")   // throttled version for map
  const [searchQuery,    setSearchQuery]    = useState("")   // free-text in Phase A (does NOT switch phase)
  const [from,           setFrom]           = useState("")   // starting point — empty by default
  const [spLocLoading,   setSpLocLoading]   = useState(false)

  function fillMyLocationSP() {
    if (!navigator.geolocation) { alert("GPS not available on this device"); return }
    setSpLocLoading(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setFrom(`${pos.coords.latitude.toFixed(6)},${pos.coords.longitude.toFixed(6)}`)
        setSpLocLoading(false)
      },
      () => { alert("Could not get GPS location. Please allow location access."); setSpLocLoading(false) },
      { enableHighAccuracy: true, timeout: 9000 }
    )
  }
  const [budget,         setBudget]         = useState(0)
  const [days,           setDays]           = useState(0)
  const [purposes,       setPurposes]       = useState<string[]>([])
  const [addedStops,     setAddedStops]     = useState<string[]>([])  // stops along the route
  const [stopDraft,      setStopDraft]      = useState("")             // typing buffer for a new stop
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

  // Safety valve — if stuck in a loading phase for > 15 s, auto-reset to avoid frozen UI
  useEffect(() => {
    if (phase !== "finding" && phase !== "planning") return
    const id = setTimeout(() => {
      console.warn("[SmartPlanner] phase stuck, resetting to input")
      setPhase("input")
      setRecommendations([])
    }, 15000)
    return () => clearTimeout(id)
  }, [phase])

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
      const data = await withTimeout(
        callAI<{ itinerary: DayPlan[] }>("itinerary", { destination: selected.name, days, budget, from, purposes }),
        8000   // 8 s — fall back to mock if edge fn doesn't respond
      )
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
        const data = await withTimeout(
          callAI("recommend", { budget, purposes, days, from: from || "Kathmandu", destination }),
          7000   // 7 s timeout
        )
        destinations = (data as any)?.destinations ?? []
        if (destinations.length === 0) throw new Error("empty")
      } catch {
        // 3. Local TF-IDF mock
        destinations = mockMLRecommend(budget, purposes, days, destination)
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
        const data = await withTimeout(
          callAI("itinerary", { destination: dest.name, days, budget, from: from || "Kathmandu", purposes, stops: addedStops }),
          8000   // 8 s timeout
        )
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
    setStopDraft("")
    setSearchQuery("")
    setDebouncedDest("")
    setDepartureDate("")
    setDepartureTime("")
  }

  const totalCost = itinerary.reduce((s, d) => s + d.totalCost, 0)
  const [routeInfo, setRouteInfo] = useState<RouteInfo>({ distance: "—", duration: "—" })

  // Determine what destination to show on the right-panel map
  const mapDest = (() => {
    if ((phase === "itinerary" || phase === "planning") && selected) return `${selected.name}, Nepal`
    if (debouncedDest) {
      const clean = debouncedDest.replace(/,\s*Nepal$/i, "").trim()
      return clean + ", Nepal"
    }
    if (phase === "destinations" && recommendations[0]) return `${recommendations[0].name}, Nepal`
    return ""
  })()

  // ── Interest-category → site category mapping ─────────────────────────────
  const INTEREST_CATS: Record<string, string[]> = {
    cultural:  ["cultural", "heritage", "art"],
    wildlife:  ["wildlife"],
    history:   ["history", "heritage"],
    spiritual: ["spiritual", "buddhist"],
    nature:    ["nature"],
    adventure: ["adventure", "trekking"],
  }

  // Filter ALL_NEPAL_SITES by selected purposes → shown as pins on the map
  const interestSites = purposes.length === 0 ? [] :
    ALL_NEPAL_SITES.filter(site =>
      purposes.some(p =>
        (INTEREST_CATS[p] ?? [p]).some(c => (site.categories ?? []).includes(c))
      )
    ).map(site => ({
      name:     site.name,
      lat:      site.lat,
      lng:      site.lng,
      emoji:    site.emoji,
      category: site.categories[0] ?? "",
      colorKey: site.colorKey,
    }))

  // Build the Google Maps URL for "Open in Google Maps"
  const openMapsUrl = phase === "itinerary" && selected
    ? buildGoogleMapsUrl(from || "Kathmandu", selected, itinerary, travelMode)
    : `https://www.google.com/maps/dir/?api=1` +
      `&origin=${encodeURIComponent((() => { const o=(from||"Kathmandu").trim(); return /^-?\d+\.?\d*,\s*-?\d+\.?\d*$/.test(o)?o:`${o}, Nepal` })())}` +
      `&destination=${encodeURIComponent(mapDest || "Nepal")}` +
      (addedStops.length ? `&waypoints=${addedStops.map(s => encodeURIComponent(s + ", Nepal")).join("|")}` : "") +
      `&travelmode=${travelMode}`
  const inS: React.CSSProperties = {
    height: 38, border: `0.5px solid ${t.border}`, borderRadius: 8,
    padding: "0 12px 0 30px", fontSize: 13, color: t.text,
    background: t.subtle, outline: "none", boxSizing: "border-box", width: "100%",
  }

  return (
    <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", height: isMobile ? "auto" : "100%", minHeight: "100vh" }}>

      {/* ── Left panel: inputs + recommendations ─────────────────────────── */}
      <div style={{
        width: isMobile ? "100%" : 380,
        minWidth: isMobile ? 0 : 380,
        borderRight: isMobile ? "none" : `0.5px solid ${t.border}`,
        borderBottom: isMobile ? `0.5px solid ${t.border}` : "none",
        display: "flex", flexDirection: "column", overflowY: "auto",
        background: t.surface,
        maxHeight: isMobile ? "60vh" : undefined,
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
              {SUGGESTED_TRIPS.map(trip => {
                // In dark mode use the theme surface + a colored left border accent instead of pastel backgrounds
                const cardBg   = isDark ? t.subtle : trip.bg
                const pillBg   = isDark ? t.surface : "rgba(255,255,255,0.75)"
                const pillColor = isDark ? t.textSub : t.textFaint
                // Pick an accent color from the card bg for the left border
                const accentMap: Record<string, string> = {
                  "#EBF2FB": t.blue, "#EAF2E0": t.green,
                  "#FBF3E2": t.amber, "#FBEEE8": t.orange,
                }
                const accent = accentMap[trip.bg] ?? t.blue
                return (
                  <button
                    key={trip.name}
                    onClick={() => {
                      setDestination(trip.name)
                      if (budget === 0) setBudget(trip.minBudget)
                      if (days === 0) setDays(trip.minDays)
                    }}
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "flex-start",
                      padding: "10px 12px", borderRadius: 10, cursor: "pointer", textAlign: "left",
                      transition: "all 0.15s", background: cardBg,
                      border: `0.5px solid ${isDark ? t.border : "transparent"}`,
                      borderLeft: `3px solid ${accent}`,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = isDark ? "0 4px 12px rgba(0,0,0,0.35)" : "0 4px 12px rgba(0,0,0,0.1)" }}
                    onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "" }}
                  >
                    <span style={{ fontSize: 22, marginBottom: 4 }}>{trip.emoji}</span>
                    <div style={{ fontSize: 12, fontWeight: 700, color: t.text, lineHeight: 1.2, marginBottom: 2 }}>{trip.name}</div>
                    <div style={{ fontSize: 9, color: t.textSub, marginBottom: 5 }}>{trip.tag}</div>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 8, color: pillColor, background: pillBg, borderRadius: 4, padding: "1px 5px", border: isDark ? `0.5px solid ${t.border}` : "none" }}>{trip.days}</span>
                      <span style={{ fontSize: 8, color: pillColor, background: pillBg, borderRadius: 4, padding: "1px 5px", border: isDark ? `0.5px solid ${t.border}` : "none" }}>{trip.season}</span>
                    </div>
                  </button>
                )
              })}
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
                onClick={handleReset}
                style={{ fontSize: 10, color: t.blue, background: "rgba(24,95,165,0.12)", border: "none", borderRadius: 5, padding: "3px 9px", cursor: "pointer" }}
              >
                ← Change
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

            {/* Mini map removed — route is shown in the always-visible right-panel map.
                Having two simultaneous Google Maps instances caused production freezes. */}
            {debouncedDest.length >= 5 && (
              <div style={{ padding: "6px 10px", borderRadius: 8, background: t.blueLight, border: `0.5px solid ${t.blue}20`, display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: t.blue, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: t.blue }}>
                  Route preview: <strong>{from.trim() || "Your location"}</strong> → <strong>{debouncedDest}</strong>
                </span>
                <span style={{ fontSize: 10, color: t.textFaint, marginLeft: "auto" }}>See map →</span>
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
              <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                <div style={{ position: "relative", flex: 1 }}>
                  <MapPin size={13} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: t.blue }} />
                  <input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="Your city or location" style={inS} />
                </div>
                <button
                  onClick={fillMyLocationSP}
                  disabled={spLocLoading}
                  title="Use my current GPS location"
                  style={{
                    height: 38, padding: "0 11px", borderRadius: 8, border: `0.5px solid ${t.blue}`,
                    background: t.blueLight, color: spLocLoading ? t.textFaint : t.blue,
                    fontSize: 11, fontWeight: 600, cursor: spLocLoading ? "default" : "pointer",
                    display: "flex", alignItems: "center", gap: 5, flexShrink: 0, whiteSpace: "nowrap",
                  }}
                >
                  {spLocLoading
                    ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
                    : <span style={{ fontSize: 14 }}>📍</span>}
                  {spLocLoading ? "Detecting…" : "My location"}
                </button>
              </div>
            </div>

            {/* ── Stops along the way ── */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: t.textSub, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Stops along the way
                {addedStops.length > 0 && (
                  <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, color: t.blue, background: t.blueLight, borderRadius: 8, padding: "1px 6px" }}>
                    {addedStops.length}
                  </span>
                )}
              </label>

              {/* Type & add a stop */}
              <div style={{ display: "flex", gap: 6 }}>
                <div style={{ position: "relative", flex: 1 }}>
                  <MapPin size={12} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: t.green }} />
                  <input
                    value={stopDraft}
                    onChange={e => setStopDraft(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && stopDraft.trim()) {
                        setAddedStops(s => [...s, stopDraft.trim()])
                        setStopDraft("")
                      }
                    }}
                    placeholder="e.g. Bhaktapur, Dhulikhel…"
                    style={{ ...inS, paddingLeft: 28 }}
                  />
                </div>
                <button
                  onClick={() => {
                    if (!stopDraft.trim()) return
                    setAddedStops(s => [...s, stopDraft.trim()])
                    setStopDraft("")
                  }}
                  style={{ height: 38, padding: "0 13px", borderRadius: 8, border: "none", background: t.green, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}
                >
                  + Add
                </button>
              </div>

              {/* Added stops list */}
              {addedStops.length > 0 && (
                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 5 }}>
                  {addedStops.map((stop, i) => (
                    <div key={`sp-stop-${i}`} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 8, background: t.greenLight, border: `0.5px solid ${t.green}30` }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: t.green, flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 12, color: t.text, fontWeight: 500 }}>{stop}</span>
                      <button
                        onClick={() => setAddedStops(s => s.filter((_, idx) => idx !== i))}
                        style={{ background: "none", border: "none", color: t.textFaint, cursor: "pointer", fontSize: 16, lineHeight: 1, padding: "0 2px" }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => setAddedStops([])}
                    style={{ fontSize: 10, color: t.textFaint, background: "transparent", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}
                  >
                    Clear all stops
                  </button>
                </div>
              )}
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

            {/* ── Entry time warnings + meal timeline ── */}
            {destination && departureDate && departureTime && routeInfo.duration !== "—" && (() => {
              const durMatch = routeInfo.duration.match(/(\d+)h\s*(\d+)?m?/)
              const totalDurMin = durMatch ? parseInt(durMatch[1] || "0") * 60 + parseInt(durMatch[2] || "0") : 0
              if (!totalDurMin) return null

              const destEta = new Date(new Date(departureDate + "T" + departureTime).getTime() + totalDurMin * 60 * 1000)
              const entryWarnings = getEntryWarnings(destination, destEta.getHours())
              const meals = getMealStops(departureTime, totalDurMin)
              if (!entryWarnings.length && !meals.length) return null

              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>

                  {/* Entry time warnings */}
                  {entryWarnings.map((w, i) => (
                    <div key={i} style={{ padding: "9px 12px", borderRadius: 9, background: "#FBEEE8", border: `0.5px solid ${t.orange}30`, display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: t.orange }}>Entry time warning — {w.site}</div>
                        <div style={{ fontSize: 10, color: t.orange, opacity: 0.8, marginTop: 2 }}>
                          Open {w.open}:00 – {w.close}:00 · You arrive at {destEta.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} which is {destEta.getHours() >= w.close ? "after closing" : "before opening"} time.
                        </div>
                        <div style={{ fontSize: 10, color: t.textSub, marginTop: 2 }}>{w.note}</div>
                      </div>
                    </div>
                  ))}

                  {/* Meal timeline */}
                  {meals.length > 0 && (
                    <div style={{ padding: "10px 12px", borderRadius: 9, background: t.greenLight, border: `0.5px solid ${t.green}30` }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: t.green, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                        🍴 Meal stops on this journey
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {meals.map((meal, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 16, flexShrink: 0 }}>{meal.icon}</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 11, fontWeight: 600, color: t.green }}>{meal.label} <span style={{ fontWeight: 400, color: t.textSub }}>· {meal.time}</span></div>
                              <div style={{ fontSize: 10, color: t.textSub }}>{meal.items}</div>
                            </div>
                            <button
                              onClick={() => window.open(`https://www.google.com/maps/search/restaurant+food+${encodeURIComponent("Nepal en route " + destination)}`, "_blank")}
                              style={{ flexShrink: 0, padding: "3px 8px", borderRadius: 5, border: `0.5px solid ${t.green}40`, background: "white", color: t.green, fontSize: 9, fontWeight: 600, cursor: "pointer" }}
                            >
                              Find
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
                <label style={{ fontSize: 11, fontWeight: 600, color: t.textSub, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>Total budget (Rs)</label>
                <div style={{ position: "relative" }}>
                  <Wallet size={13} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: t.textFaint }} />
                  <input type="number" value={budget || ""} min={0} step={500} placeholder="e.g. 6000" onChange={(e) => setBudget(Number(e.target.value))} style={inS} />
                </div>
                <div style={{ display: "flex", gap: 3, marginTop: 4 }}>
                  {[3000, 6000, 10000, 20000].map((v) => (
                    <button key={v} onClick={() => setBudget(v)} style={{ padding: "2px 6px", borderRadius: 4, border: `0.5px solid ${budget === v ? t.blue : t.border}`, background: budget === v ? t.blueLight : "transparent", color: budget === v ? t.blue : t.textFaint, fontSize: 9, cursor: "pointer" }}>
                      Rs {v >= 1000 ? v / 1000 + "k" : v}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: t.textSub, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>Days of travel</label>
                <div style={{ position: "relative" }}>
                  <Clock size={13} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: t.textFaint }} />
                  <input type="number" value={days || ""} min={0} max={30} placeholder="e.g. 2" onChange={(e) => setDays(Math.max(0, Number(e.target.value)))} style={inS} />
                </div>
                <div style={{ display: "flex", gap: 3, marginTop: 4 }}>
                  {[1, 2, 3, 5, 7].map((v) => (
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
            {/* Back to destination selection */}
            <button
              onClick={handleReset}
              style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 12, background: "none", border: "none", cursor: "pointer", color: t.textSub, fontSize: 11, padding: 0 }}
            >
              <span style={{ fontSize: 14 }}>←</span> Back to destination selection
            </button>
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
                    <ScoreBar score={dest.score ?? 0.5} color={isActive ? t.blue : t.blueMid} />
                    <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
                      {(dest.category ?? dest.categories ?? []).map((c: string) => (
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
      <div style={{ flex: 1, position: "relative", overflow: "hidden", minHeight: isMobile ? 320 : undefined }}>

        {/* ── Full-height Google Map (always visible) ── */}
        <div style={{ position: "absolute", inset: 0 }}>
          <MapBoundary>
          {phase === "itinerary" && selected ? (
            <ItineraryMap dest={selected} itinerary={itinerary} activeDay={activeDay} from={from || "Kathmandu"} isDark={isDark} t={t} />
          ) : (mapDest || interestSites.length > 0) ? (
            /* Show map whenever a destination is typed OR interests are selected.
               When only interests selected (no destination), map shows Nepal overview
               with interest-category pins — RouteMap skips the directions call automatically. */
            <RouteMap
              origin={(() => {
                if (!mapDest) return ""   // no destination → Nepal overview, no route
                const o = (from || "Kathmandu").trim()
                if (/^-?\d+\.?\d*,\s*-?\d+\.?\d*$/.test(o)) return o
                return o.toLowerCase().includes("nepal") ? o : `${o}, Nepal`
              })()}
              waypoints={addedStops.filter(Boolean)}
              pinLocations={addedStops.filter(Boolean)}
              siteMarkers={interestSites}
              destination={mapDest}
              travelMode={travelMode}
              isDark={isDark} t={t}
              onInfo={setRouteInfo}
            />
          ) : (
            <div style={{ width: "100%", height: "100%", background: t.subtle, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
              <div style={{ fontSize: 52 }}>🗺</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: t.textMid }}>Explore Nepal</div>
              <div style={{ fontSize: 12, color: t.textFaint, maxWidth: 300, textAlign: "center", lineHeight: 1.6 }}>
                Select travel interests above to see matching sites across Nepal, or type a destination to preview your route
              </div>
            </div>
          )}
          </MapBoundary>
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
        /* ── Global mobile overrides ── */
        @media (max-width: 768px) {
          .rsp-grid-4  { grid-template-columns: 1fr 1fr !important; }
          .rsp-grid-2  { grid-template-columns: 1fr !important; }
          .rsp-stack   { flex-direction: column !important; }
          .rsp-full    { max-width: 100% !important; padding: 16px !important; }
          .rsp-hide    { display: none !important; }
          .rsp-scroll  { overflow-x: auto !important; flex-wrap: nowrap !important; }
          .rsp-h-auto  { height: auto !important; min-height: 0 !important; }
          .rsp-w-full  { width: 100% !important; flex: 0 0 100% !important; min-width: 0 !important; }
          .rsp-p-sm    { padding: 12px 14px !important; }
          .rsp-text-sm { font-size: 11px !important; }
        }
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
  const { t, isDark, toggleDark, navigateTo } = useT()
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
                onClick={() => navigateTo(item.id)}
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
  const [activePage,    setActivePage]   = useState<Page>("dashboard")
  const [mountedPages,  setMountedPages]  = useState<Set<Page>>(new Set<Page>(["dashboard"]))
  const [collapsed,     setCollapsed]    = useState(false)
  const [isDark,        setIsDark]       = useState(false)
  const [pendingNav,    setPendingNav]   = useState<NavRequest | null>(null)
  const [drawerOpen,    setDrawerOpen]   = useState(false)
  const isMobile = useIsMobile()

  const ctxValue: Ctx = {
    t: isDark ? dark : light,
    isDark, isMobile,
    toggleDark: () => setIsDark((d) => !d),
    pendingNav,
    clearNav:   () => setPendingNav(null),
    navigateTo: (page, nav) => {
      if (nav) setPendingNav(nav)
      setActivePage(page)
      setMountedPages(prev => new Set([...prev, page]))
      if (isMobile) setDrawerOpen(false)   // close nav drawer on mobile after navigation
    },
  }

  const { t } = ctxValue

  return (
    <ThemeCtx.Provider value={ctxValue}>
      <div style={{ display: "flex", height: "100vh", fontFamily: "'Inter', system-ui, sans-serif", background: t.pageBg, transition: "background 0.3s", position: "relative", overflow: "hidden" }}>

        {/* Mobile overlay backdrop */}
        {isMobile && drawerOpen && (
          <div
            onClick={() => setDrawerOpen(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 299, backdropFilter: "blur(2px)" }}
          />
        )}

        {/* Sidebar — fixed drawer on mobile, normal on desktop */}
        <div style={{
          position: isMobile ? "fixed" : "relative",
          left: isMobile ? (drawerOpen ? 0 : -220) : 0,
          top: 0, bottom: 0, zIndex: 300,
          transition: isMobile ? "left 0.25s cubic-bezier(0.4,0,0.2,1)" : undefined,
          flexShrink: 0,
        }}>
          <Sidebar
            activePage={activePage}
            setActivePage={setActivePage}
            collapsed={isMobile ? false : collapsed}
            setCollapsed={setCollapsed}
          />
        </div>

        {/* Main content */}
        <main style={{
          flex: 1, overflowY: "auto", overflowX: "hidden",
          display: "flex", flexDirection: "column", alignItems: "center",
          paddingTop: isMobile ? 52 : 0,   // room for mobile top bar
        }}>

          {/* Mobile top bar */}
          {isMobile && (
            <div style={{
              position: "fixed", top: 0, left: 0, right: 0, zIndex: 298, height: 52,
              background: t.surface, borderBottom: `0.5px solid ${t.border}`,
              display: "flex", alignItems: "center", padding: "0 16px", gap: 12,
            }}>
              <button
                onClick={() => setDrawerOpen(v => !v)}
                style={{ width: 36, height: 36, borderRadius: 8, border: `0.5px solid ${t.border}`, background: t.subtle, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}
              >
                ☰
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 26, height: 26, borderRadius: 6, background: t.blue, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Mountain size={14} color="#fff" />
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: t.text }}>Gantabya</span>
              </div>
              <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
                <button onClick={() => setIsDark(d => !d)} style={{ width: 32, height: 32, borderRadius: 8, border: `0.5px solid ${t.border}`, background: t.subtle, cursor: "pointer", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {isDark ? "☀️" : "🌙"}
                </button>
              </div>
            </div>
          )}

          {/* Page content — keep-alive pattern */}
          {(["dashboard", "pathfinder", "smart-planner", "nearby", "book"] as Page[]).map(page => (
            mountedPages.has(page) ? (
              <div
                key={page}
                style={{
                  width: "100%", flex: activePage === page ? 1 : undefined,
                  display: activePage === page ? "flex" : "none",
                  flexDirection: "column",
                  height: (["smart-planner", "nearby", "book"] as Page[]).includes(page) && activePage === page ? "100%" : undefined,
                }}
              >
                {page === "dashboard"     && <DashboardPage />}
                {page === "pathfinder"    && <PathfinderPage />}
                {page === "smart-planner" && <SmartPlannerPage />}
                {page === "nearby"        && <NearbyPage />}
                {page === "book"          && <BookingPage />}
              </div>
            ) : null
          ))}
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
