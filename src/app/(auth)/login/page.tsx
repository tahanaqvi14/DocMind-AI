"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AuthCard } from "@/components/AuthCard";

/** /auth/callback sends people here with ?error=auth_failed when a
 *  confirmation link has expired or was already used. Without this they
 *  just saw a login form and no idea why. */
function LinkError() {
  const error = useSearchParams().get("error");
  if (error !== "auth_failed") return null;
  return (
    <p className="mb-4 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
      That sign-in link didn&apos;t work. It may have expired or already been used. Log in
      below, or sign up again to get a new link.
    </p>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  // Re-enable together with the Google button below.
  // async function handleGoogleLogin() {
  //   await supabase.auth.signInWithOAuth({
  //     provider: "google",
  //     options: { redirectTo: `${window.location.origin}/auth/callback` },
  //   });
  // }

  return (
    <AuthCard title="Welcome back" subtitle="Log in to keep chatting with your documents.">
      <Suspense fallback={null}>
        <LinkError />
      </Suspense>

      {/* <button
        onClick={handleGoogleLogin}
        className="w-full rounded-lg border border-ink-line bg-ink-soft py-3 text-sm font-medium transition-colors hover:border-teal"
      >
        Continue with Google
      </button>

      <div className="my-6 flex items-center gap-3 text-xs text-ink-muted">
        <div className="h-px flex-1 bg-ink-line" />
        or
        <div className="h-px flex-1 bg-ink-line" />
      </div> */}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-ink-muted">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-ink-line bg-ink px-4 py-3 text-sm outline-none focus:border-teal"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-ink-muted">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-ink-line bg-ink px-4 py-3 text-sm outline-none focus:border-teal"
            placeholder="••••••••"
          />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-highlight py-3 text-sm font-medium text-paper-text transition-transform hover:scale-[1.02] disabled:opacity-60"
        >
          {loading ? "Logging in…" : "Log in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-muted">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-teal hover:underline">
          Sign up
        </Link>
      </p>
    </AuthCard>
  );
}
