import Link from "next/link";
import { Nav } from "@/components/Nav";
import { HeroIllustration } from "@/components/HeroIllustration";
import { FileText, Search, MessageSquareText, ShieldCheck, Zap, Quote } from "lucide-react";

const steps = [
  {
    n: "01",
    title: "Upload your documents",
    body: "Drag in PDFs, Word docs, or plain text. DocMind splits them into passages and embeds each one.",
    icon: FileText,
  },
  {
    n: "02",
    title: "Ask a question",
    body: "Type anything about the content. DocMind finds the passages most relevant to your question — not the whole document.",
    icon: Search,
  },
  {
    n: "03",
    title: "Get a grounded, cited answer",
    body: "The model answers using only what it found. Every claim links back to the exact document and passage it came from.",
    icon: MessageSquareText,
  },
];

const features = [
  {
    icon: Quote,
    title: "Real citations, not vibes",
    body: "Every answer shows which document and passage it's grounded in, so you can verify it in one click.",
  },
  {
    icon: ShieldCheck,
    title: "Refuses to guess",
    body: "If your documents don't cover the question, DocMind says so instead of inventing an answer.",
  },
  {
    icon: Zap,
    title: "Fast, streamed answers",
    body: "Responses stream token by token from Groq's inference, so you're reading within a second.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-ink">
      <Nav />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 md:grid-cols-2 md:py-28">
          <div>
            <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-teal">
              Retrieval-augmented chat
            </p>
            <h1 className="font-display text-4xl leading-[1.1] font-medium md:text-5xl">
              Ask your documents anything.{" "}
              <span className="highlight-mark">Get answers you can verify.</span>
            </h1>
            <p className="mt-6 max-w-md text-lg text-ink-muted">
              Upload PDFs, Word docs, or notes. DocMind AI answers strictly from
              what you gave it — and shows you the exact passage behind every
              claim.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/signup"
                className="rounded-full bg-highlight px-6 py-3 font-medium text-paper-text transition-transform hover:scale-105"
              >
                Try live demo
              </Link>
              <Link
                href="/pricing"
                className="rounded-full border border-ink-line px-6 py-3 text-ink-text transition-colors hover:border-teal"
              >
                See pricing
              </Link>
            </div>
          </div>
          <div className="flex justify-center">
            <HeroIllustration />
          </div>
        </div>
      </section>

      {/* How it works — a real 3-step sequence, so numbering earns its place */}
      <section id="how-it-works" className="border-t border-ink-line/60 bg-ink-soft/40">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="font-display text-3xl font-medium">How it works</h2>
          <div className="mt-12 grid gap-10 md:grid-cols-3">
            {steps.map((step) => (
              <div key={step.n}>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm text-highlight">{step.n}</span>
                  <step.icon size={20} className="text-teal" />
                </div>
                <h3 className="mt-4 font-display text-xl font-medium">{step.title}</h3>
                <p className="mt-2 text-ink-muted">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="font-display text-3xl font-medium">
          Built so it can&apos;t make things up
        </h2>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-ink-line bg-ink-soft/50 p-6"
            >
              <f.icon size={22} className="text-highlight" />
              <h3 className="mt-4 font-display text-lg font-medium">{f.title}</h3>
              <p className="mt-2 text-sm text-ink-muted">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-ink-line/60">
        <div className="mx-auto max-w-6xl px-6 py-20 text-center">
          <h2 className="font-display text-3xl font-medium md:text-4xl">
            Your documents. Your answers. <span className="highlight-mark">No hallucinations.</span>
          </h2>
          <Link
            href="/signup"
            className="mt-8 inline-block rounded-full bg-highlight px-8 py-3 font-medium text-paper-text transition-transform hover:scale-105"
          >
            Try live demo — free
          </Link>
        </div>
      </section>

      <footer className="border-t border-ink-line/60 py-8 text-center text-sm text-ink-muted">
        DocMind AI — built as a portfolio project.{" "}
        <a
          href="https://github.com/tahanaqvi14/DocMind-AI"
          className="underline hover:text-ink-text"
          target="_blank"
          rel="noreferrer"
        >
          View source on GitHub
        </a>
      </footer>
    </div>
  );
}
