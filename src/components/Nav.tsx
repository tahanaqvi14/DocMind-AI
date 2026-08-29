import Link from "next/link";

export function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-ink-line/60 bg-ink/85 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-display text-lg font-medium sm:text-xl">
          <span className="highlight-mark">Doc</span>
          <span>Mind AI</span>
        </Link>
        <div className="hidden items-center gap-8 text-sm text-ink-muted md:flex">
          <Link href="/#how-it-works" className="hover:text-ink-text transition-colors">
            How it works
          </Link>
          <Link href="/pricing" className="hover:text-ink-text transition-colors">
            Pricing
          </Link>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className="text-sm text-ink-muted hover:text-ink-text transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-highlight px-3.5 py-2 text-sm font-medium text-paper-text transition-transform hover:scale-105 sm:px-4"
          >
            Try live demo
          </Link>
        </div>
      </nav>
    </header>
  );
}
