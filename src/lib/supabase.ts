import { createClient } from "@supabase/supabase-js"

const url = (import.meta as any).env?.VITE_SUPABASE_URL  ?? ""
const key = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ?? ""

// Use placeholder values so createClient never throws when env vars are absent.
// Actual API calls will fail with a network error (caught upstream) instead of
// crashing the module during import and taking the whole app down.
const _url = url || "https://placeholder-project.supabase.co"
const _key = key || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiJ9.placeholder"

export const supabase = createClient(_url, _key)

type Action = "recommend" | "itinerary" | "assistant"

export async function callAI(action: Action, payload: Record<string, unknown>) {
  if (!url || !key) return null   // not configured — skip immediately, no network call
  const { data, error } = await supabase.functions.invoke("gantabya-ai", {
    body: { action, payload },
  })
  if (error) throw error
  return data
}
