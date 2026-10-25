"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, ResponsiveContainer, Tooltip } from "recharts";
import { FileText, MessageSquareText } from "lucide-react";

interface Usage {
  documentCount: number;
  questionCount: number;
  dailyQuestions: { label: string; count: number }[];
}

/** Buckets questions into the last 7 days of the VIEWER's calendar. Done
 *  here rather than on the server, which runs in UTC: there, a question
 *  asked at 2am in Pakistan landed on the previous day. */
function lastSevenDays(times: string[]): { label: string; count: number }[] {
  const days: { label: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toDateString();
    days.push({
      label: d.toLocaleDateString(undefined, { weekday: "short" }),
      count: times.filter((t) => new Date(t).toDateString() === key).length,
    });
  }
  return days;
}

export function UsagePanel() {
  const [usage, setUsage] = useState<Usage | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/usage")
      .then(async (r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        setUsage({
          documentCount: data.documentCount ?? 0,
          questionCount: data.questionCount ?? 0,
          dailyQuestions: lastSevenDays(data.recentQuestionTimes ?? []),
        });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (failed) {
    return (
      <div className="rounded-2xl border border-ink-line bg-ink-soft/50 p-6 text-sm text-ink-muted shadow-sm">
        Couldn&apos;t load your usage right now. Refresh the page to try again.
      </div>
    );
  }

  return (
    <div className="grid gap-5 md:grid-cols-3">
      <StatCard icon={FileText} label="Documents ready" value={usage?.documentCount} />
      <StatCard icon={MessageSquareText} label="Questions asked" value={usage?.questionCount} />

      <div className="rounded-2xl border border-ink-line bg-ink-soft/50 p-6 shadow-sm">
        <p className="text-sm text-ink-muted">Questions, last 7 days</p>
        <div className="mt-4 h-24">
          {usage ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={usage.dailyQuestions}>
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#9195b8", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "rgba(255,200,87,0.08)" }}
                  contentStyle={{
                    background: "#1b1d3d",
                    border: "1px solid #2b2e57",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "#f5f3ec" }}
                />
                <Bar dataKey="count" fill="#ffc857" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full animate-pulse items-end gap-2">
              {[40, 65, 30, 80, 50, 20, 70].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t bg-ink-line/40"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof FileText;
  label: string;
  value: number | undefined;
}) {
  return (
    <div className="group rounded-2xl border border-ink-line bg-ink-soft/50 p-6 shadow-sm transition-all duration-200 hover:border-highlight/40 hover:shadow-md">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-highlight/15 text-highlight transition-transform duration-200 group-hover:scale-105">
        <Icon size={20} />
      </div>
      {value === undefined ? (
        <div className="mt-4 h-9 w-16 animate-pulse rounded bg-ink-line/40" />
      ) : (
        <p className="mt-4 font-display text-3xl font-medium tabular-nums">{value}</p>
      )}
      <p className="mt-1 text-sm text-ink-muted">{label}</p>
    </div>
  );
}
