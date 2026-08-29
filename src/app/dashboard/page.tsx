import Link from "next/link";
import { ArrowUpRight, Upload, Clock3, MessagesSquare } from "lucide-react";
import { UsagePanel } from "@/components/UsagePanel";

const steps = [
  {
    icon: Upload,
    text: (
      <>
        <Link href="/dashboard/documents" className="text-teal hover:underline">
          Upload a document
        </Link>{" "}
        — PDF, DOCX, or TXT.
      </>
    ),
  },
  {
    icon: Clock3,
    text: "Wait a few seconds while it's chunked and embedded.",
  },
  {
    icon: MessagesSquare,
    text: (
      <>
        <Link href="/dashboard/chat" className="text-teal hover:underline">
          Open the chat
        </Link>{" "}
        and ask it anything about the content.
      </>
    ),
  },
];

export default function DashboardPage() {
  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-medium">Overview</h1>
          <p className="mt-1 text-ink-muted">Your workspace at a glance.</p>
        </div>
        <Link
          href="/dashboard/chat"
          className="inline-flex w-fit items-center gap-1.5 rounded-full bg-highlight px-5 py-2.5 text-sm font-medium text-paper-text transition-transform hover:scale-105"
        >
          Start a chat
          <ArrowUpRight size={15} />
        </Link>
      </div>

      <div className="mt-8">
        <UsagePanel />
      </div>

      <div className="mt-10 rounded-2xl border border-ink-line bg-ink-soft/30 p-6">
        <h2 className="font-display text-lg font-medium">Get started</h2>
        <ol className="mt-4 space-y-4">
          {steps.map((step, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-ink-muted">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink-line/50 font-mono text-xs text-ink-text">
                {i + 1}
              </span>
              <span className="pt-0.5">{step.text}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
