import { createClient } from "@supabase/supabase-js"

const url  = (import.meta as any).env?.VITE_SUPABASE_URL  ?? ""
const key  = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ?? ""

export const supabase = createClient(url, key)

type Action = "recommend" | "itinerary" | "assistant"

export async function callAI(action: Action, payload: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("gantabya-ai", {
    body: { action, payload },
  })
  if (error) throw error
  return data
}
