"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AuthCard } from "@/components/AuthCard";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  async function handleGoogleSignup() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  if (sent) {
    return (
      <AuthCard title="Check your inbox" subtitle="">
        <p className="text-sm text-ink-muted">
          We sent a confirmation link to <span className="text-ink-text">{email}</span>.
          Click it to activate your account, then come back and log in.
        </p>
        <Link
          href="/login"
          className="mt-6 block w-full rounded-lg bg-highlight py-3 text-center text-sm font-medium text-paper-text"
        >
          Back to log in
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Create your account"
      subtitle="3 documents free — no credit card needed."
    >
      {/* <button
        onClick={handleGoogleSignup}
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
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-ink-line bg-ink px-4 py-3 text-sm outline-none focus:border-teal"
            placeholder="At least 6 characters"
          />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-highlight py-3 text-sm font-medium text-paper-text transition-transform hover:scale-[1.02] disabled:opacity-60"
        >
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-teal hover:underline">
          Log in
        </Link>
      </p>
    </AuthCard>
  );
}
