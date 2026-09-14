"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isSupabaseConfigured) {
      setError("Supabase isn't configured yet. Add your project URL and anon key to .env.local.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      if (mode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName || email.split("@")[0] } },
        });
        if (signUpError) throw signUpError;
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      }
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="screen active" style={{ maxWidth: 420, margin: "0 auto" }}>
      <div className="pagehead">
        <h1>{mode === "login" ? "Log In" : "Create Account"}</h1>
      </div>

      <div className="card" style={{ padding: 16 }}>
        <div className="tabs">
          <button className={"tab" + (mode === "login" ? " active" : "")} type="button" onClick={() => setMode("login")}>
            Log In
          </button>
          <button className={"tab" + (mode === "signup" ? " active" : "")} type="button" onClick={() => setMode("signup")}>
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 6 }}>
          {mode === "signup" && (
            <label style={{ display: "block" }}>
              <small style={{ display: "block", color: "var(--muted)", marginBottom: 4 }}>Display name</small>
              <input
                className="loginfield"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Braxton O."
                required
              />
            </label>
          )}
          <label style={{ display: "block" }}>
            <small style={{ display: "block", color: "var(--muted)", marginBottom: 4 }}>Email</small>
            <input
              className="loginfield"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </label>
          <label style={{ display: "block" }}>
            <small style={{ display: "block", color: "var(--muted)", marginBottom: 4 }}>Password</small>
            <input
              className="loginfield"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              minLength={6}
              required
            />
          </label>

          {error && (
            <p style={{ color: "var(--red)", fontSize: 12, margin: 0 }}>{error}</p>
          )}

          <button className="submit" type="submit" disabled={loading}>
            {loading ? "Please wait…" : mode === "login" ? "Log In" : "Create Account"}
          </button>
        </form>
      </div>
    </section>
  );
}
