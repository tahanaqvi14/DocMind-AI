"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Nav } from "@/components/Nav";
import { createClient } from "@/lib/supabase/client";

const tiers = [
  {
    name: "Free",
    price: "$0",
    cadence: "forever",
    features: ["3 documents", "Unlimited questions", "Citations on every answer", "Community support"],
    cta: "Get started",
  },
  {
    name: "Pro",
    price: "$12",
    cadence: "/ month",
    features: [
      "Unlimited documents",
      "Unlimited questions",
      "Citations on every answer",
      "Priority processing",
      "Email support",
    ],
    cta: "Upgrade to Pro",
    highlighted: true,
  },
];

export default function PricingPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  async function handleUpgrade() {
    setLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/signup");
      return;
    }

    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start checkout.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-ink">
      <Nav />
      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        <h1 className="font-display text-4xl font-medium">Simple, honest pricing</h1>
        <p className="mt-3 text-ink-muted">
          Start free. Upgrade when you outgrow 3 documents. Test mode — no real card required.
        </p>

        {error && <p className="mt-4 text-sm text-danger">{error}</p>}

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative rounded-2xl border p-8 text-left transition-all duration-200 hover:-translate-y-1 ${
                tier.highlighted
                  ? "border-highlight bg-highlight/5 shadow-lg shadow-highlight/5"
                  : "border-ink-line bg-ink-soft/40 hover:border-teal/40"
              }`}
            >
              {tier.highlighted && (
                <span className="absolute -top-3 left-8 rounded-full bg-highlight px-3 py-1 text-xs font-medium text-paper-text">
                  Most popular
                </span>
              )}
              <h2 className="font-display text-xl font-medium">{tier.name}</h2>
              <p className="mt-2">
                <span className="font-display text-4xl font-medium">{tier.price}</span>
                <span className="text-ink-muted"> {tier.cadence}</span>
              </p>
              <ul className="mt-6 space-y-3 text-sm">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-ink-muted">
                    <Check size={16} className="text-teal" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={tier.name === "Pro" ? handleUpgrade : () => router.push("/signup")}
                disabled={loading}
                className={`mt-8 w-full rounded-full py-3 text-sm font-medium transition-transform hover:scale-[1.02] disabled:opacity-60 ${
                  tier.highlighted
                    ? "bg-highlight text-paper-text"
                    : "border border-ink-line text-ink-text"
                }`}
              >
                {loading && tier.name === "Pro" ? "Redirecting…" : tier.cta}
              </button>
            </div>
          ))}
        </div>

        <p className="mt-8 text-xs text-ink-muted">
          Stripe test mode — use card{" "}
          <span className="font-mono text-ink-text">4242 4242 4242 4242</span>, any future
          expiry, any CVC.
        </p>
      </section>
    </div>
  );
}
