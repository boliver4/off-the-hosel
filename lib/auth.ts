import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

/**
 * Returns the signed-in user's profile row, or null if signed out / not
 * configured / the query fails. Safe to call from any server component —
 * never throws.
 */
export async function getCurrentProfile(): Promise<Profile | null> {
  if (!isSupabaseConfigured) return null;

  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    return data ?? null;
  } catch {
    return null;
  }
}
