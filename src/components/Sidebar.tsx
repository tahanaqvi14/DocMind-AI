"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { navLinks } from "@/lib/nav-links";

export function Sidebar({ email, plan }: { email: string; plan: "free" | "pro" }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-ink-line/60 bg-ink-soft/40 p-6 md:flex">
      <Link href="/" className="mb-10 flex items-center gap-2 font-display text-lg font-medium">
        <span className="highlight-mark">Doc</span>
        <span>Mind AI</span>
      </Link>

      <nav className="flex-1 space-y-1">
        {navLinks.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150 ${
                active
                  ? "bg-highlight/15 text-highlight shadow-[inset_2px_0_0_0_var(--highlight)]"
                  : "text-ink-muted hover:bg-ink-line/40 hover:text-ink-text"
              }`}
            >
              <link.icon
                size={18}
                className={active ? "" : "transition-transform group-hover:scale-110"}
              />
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
    </aside>
  );
}
