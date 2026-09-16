import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Service-role Supabase client — bypasses Row Level Security entirely.
 * ONLY use this from trusted server-only code that has already verified
 * the caller some other way (e.g. the automated sync job checking
 * CRON_SECRET). NEVER import this into anything that runs in the browser,
 * and never return its results to an unauthenticated caller unchecked.
 *
 * Needs the SUPABASE_SERVICE_ROLE_KEY environment variable (from Supabase
 * dashboard -> Project Settings -> API -> service_role secret) — this is
 * intentionally NOT prefixed with NEXT_PUBLIC_ so Next.js never bundles it
 * into client-side JavaScript.
 */
export function createServiceClient(): any {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !serviceKey) return null;
  return createSupabaseClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
