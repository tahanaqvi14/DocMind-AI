"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Sparkles, ArrowUpRight, Loader2, PartyPopper } from "lucide-react";
import { PLAN_LIMITS, type Plan } from "@/types";

const PRO_FEATURES = [
  "Unlimited documents",
  "Unlimited questions",
  "Citations on every answer",
  "Priority processing",
  "Email support",
];

const FREE_FEATURES = ["3 documents", "Unlimited questions", "Citations on every answer"];

export function BillingPanel({
  plan,
  documentCount,
}: {
  plan: Plan;
  documentCount: number;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const justUpgraded = searchParams.get("upgraded") === "1";

  const limit = PLAN_LIMITS[plan].maxDocuments;
  const usagePct = plan === "pro" ? 0 : Math.min(100, (documentCount / limit) * 100);

  async function handleUpgrade() {
    setLoading(true);
    setError(null);
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

  async function handleManageBilling() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't open billing portal.");
      setLoading(false);
    }
  }

  return (
    <div>
      {justUpgraded && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-teal/40 bg-teal/10 px-4 py-3 text-sm text-teal">
          <PartyPopper size={18} />
          You&apos;re on Pro now — unlimited documents unlocked.
        </div>
      )}

      {/* Current plan card */}
      <div className="rounded-2xl border border-ink-line bg-ink-soft/50 p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                plan === "pro" ? "bg-teal/15 text-teal" : "bg-ink-line/50 text-ink-muted"
              }`}
            >
              <Sparkles size={20} />
            </div>
            <div>
              <p className="font-display text-lg font-medium">
                {plan === "pro" ? "Pro plan" : "Free plan"}
              </p>
              <p className="text-sm text-ink-muted">
                {plan === "pro" ? "$12/month · billed via Stripe" : "$0 forever"}
              </p>
            </div>
          </div>

          {plan === "pro" ? (
            <button
              onClick={handleManageBilling}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-full border border-ink-line px-5 py-2.5 text-sm font-medium transition-colors hover:border-teal disabled:opacity-60"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : null}
              Manage billing
            </button>
          ) : (
            <button
              onClick={handleUpgrade}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-full bg-highlight px-5 py-2.5 text-sm font-medium text-paper-text transition-transform hover:scale-105 disabled:opacity-60 disabled:hover:scale-100"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <ArrowUpRight size={15} />}
              Upgrade to Pro
            </button>
          )}
        </div>

        {plan === "free" && (
          <div className="mt-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-muted">Documents used</span>
              <span className="font-mono text-ink-text">
                {documentCount} / {limit}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink-line/50">
              <div
                className={`h-full rounded-full transition-all ${
                  usagePct >= 100 ? "bg-danger" : "bg-highlight"
                }`}
                style={{ width: `${usagePct}%` }}
              />
            </div>
            {usagePct >= 100 && (
              <p className="mt-2 text-xs text-danger">
                You&apos;ve hit the Free plan limit. Upgrade to keep uploading.
              </p>
            )}
          </div>
        )}

        {error && <p className="mt-4 text-sm text-danger">{error}</p>}
      </div>

      {/* Plan comparison — only really useful to show when still on Free */}
      {plan === "free" && (
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          <PlanCard
            name="Free"
            price="$0"
            cadence="forever"
            features={FREE_FEATURES}
            current
          />
          <PlanCard
            name="Pro"
            price="$12"
            cadence="/ month"
            features={PRO_FEATURES}
            highlighted
            onSelect={handleUpgrade}
            loading={loading}
          />
        </div>
      )}

      <p className="mt-8 text-xs text-ink-muted">
        Stripe test mode — use card{" "}
        <span className="font-mono text-ink-text">4242 4242 4242 4242</span>, any future expiry,
        any CVC.
      </p>
    </div>
  );
}

function PlanCard({
  name,
  price,
  cadence,
  features,
  current,
  highlighted,
  onSelect,
  loading,
}: {
  name: string;
  price: string;
  cadence: string;
  features: string[];
  current?: boolean;
  highlighted?: boolean;
  onSelect?: () => void;
  loading?: boolean;
}) {
  return (
    <div
      className={`relative rounded-2xl border p-6 transition-all duration-200 ${
        highlighted
          ? "border-highlight bg-highlight/5 hover:-translate-y-1"
          : "border-ink-line bg-ink-soft/30"
      }`}
    >
      {current && (
        <span className="absolute -top-3 left-6 rounded-full bg-ink-line px-3 py-1 text-xs font-medium text-ink-text">
          Current plan
        </span>
      )}
      <p className="font-display text-lg font-medium">{name}</p>
      <p className="mt-1">
        <span className="font-display text-3xl font-medium">{price}</span>
        <span className="text-sm text-ink-muted"> {cadence}</span>
      </p>
      <ul className="mt-4 space-y-2 text-sm">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-ink-muted">
            <Check size={14} className="text-teal" />
            {f}
          </li>
        ))}
      </ul>
      {onSelect && !current && (
        <button
          onClick={onSelect}
          disabled={loading}
          className="mt-5 w-full rounded-full bg-highlight py-2.5 text-sm font-medium text-paper-text transition-transform hover:scale-[1.02] disabled:opacity-60"
        >
          {loading ? "Redirecting…" : "Upgrade"}
        </button>
      )}
    </div>
  );
}
