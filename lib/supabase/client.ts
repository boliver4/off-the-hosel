"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";

/**
 * Browser-side Supabase client for use in client components.
 *
 * Guarded so that missing env vars (e.g. during a build/static export
 * where NEXT_PUBLIC_SUPABASE_URL isn't set) don't crash module evaluation.
 * Calls made against the stub client will simply fail at request time,
 * which pages already handle via try/catch + empty-state rendering.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

  return createBrowserClient<Database>(url, anonKey) as any;
}

export const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
