import { NextResponse, type NextRequest } from "next/server";

// Every protected page (one-done, major-challenge, my-picks, more) already
// does its own server-side auth check via getCurrentProfile() + redirect(),
// so this middleware doesn't need to duplicate that. An earlier version ran
// the Supabase auth check here too, but @supabase/ssr's createServerClient
// crashed under Vercel's Edge Runtime for reasons that weren't worth
// chasing down given the per-page checks already cover it — this file is
// now a deliberate no-op, kept only so future middleware needs have a home.
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images/).*)"],
};