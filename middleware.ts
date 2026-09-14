import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Pages that require a signed-in user. Leaderboard/standings/tournament-info
// stay publicly readable (per product decision — spectators can watch without
// an account); pick-related and account pages require auth.
const PROTECTED_PREFIXES = ["/one-done", "/major-challenge", "/my-picks", "/more"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase isn't configured yet (e.g. local dev before env vars are
  // set), don't block navigation — just let pages render their own
  // "not configured" empty states.
  if (!url || !anonKey) {
    return response;
  }

  // Everything below can fail for reasons outside our control (a bad env
  // var value, a transient network error talking to Supabase, etc.) — never
  // let that take down every page on the site. Worst case: an unauthed user
  // briefly reaches a protected page and its own server-side check catches it.
  try {
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const path = request.nextUrl.pathname;
    const needsAuth = PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(p + "/"));

    if (needsAuth && !user) {
      const redirectUrl = new URL("/login", request.url);
      redirectUrl.searchParams.set("next", path);
      return NextResponse.redirect(redirectUrl);
    }
  } catch {
    // Supabase unreachable or misconfigured — don't crash the site.
    return response;
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images/).*)"],
};