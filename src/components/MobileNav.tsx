"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { navLinks } from "@/lib/nav-links";

export function MobileNav({ email, plan }: { email: string; plan: "free" | "pro" }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="md:hidden">
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-ink-line/60 bg-ink/90 px-4 py-3 backdrop-blur">
        <Link href="/" className="flex items-center gap-2 font-display text-base font-medium">
          <span className="highlight-mark">Doc</span>
          <span>Mind AI</span>
        </Link>
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="rounded-lg p-2 text-ink-text transition-colors hover:bg-ink-line/40"
        >
          <Menu size={22} />
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-ink/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-0 flex h-full w-72 flex-col border-l border-ink-line bg-ink-soft p-6 shadow-2xl">
            <div className="mb-8 flex items-center justify-between">
              <span className="font-display text-lg font-medium">Menu</span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-ink-line/40 hover:text-ink-text"
              >
                <X size={20} />
              </button>
            </div>

            <nav className="flex-1 space-y-1">
              {navLinks.map((link) => {
                const active = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors ${
                      active
                        ? "bg-highlight/15 text-highlight"
                        : "text-ink-muted hover:bg-ink-line/40 hover:text-ink-text"
                    }`}
                  >
                    <link.icon size={18} />
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-ink-line/60 pt-4">
              <p className="truncate text-xs text-ink-muted">{email}</p>
              <span
                className={`mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  plan === "pro" ? "bg-teal/20 text-teal" : "bg-ink-line/50 text-ink-muted"
                }`}
              >
                {plan === "pro" ? "Pro" : "Free plan"}
              </span>
              <button
                onClick={handleSignOut}
                className="mt-4 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-muted transition-colors hover:bg-ink-line/40 hover:text-danger"
              >
                <LogOut size={16} />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
