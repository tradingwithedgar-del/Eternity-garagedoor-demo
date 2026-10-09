"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useCredits } from "./Credits";
import { Logo } from "./Logo";

const NAV = [
  { href: "/create/video", label: "Video", icon: "M4 6h11a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zm12 4 5-3v10l-5-3" },
  { href: "/create/image", label: "Image", icon: "M4 4h16v16H4zM4 16l5-5 4 4 3-3 4 4M9 9.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0" },
  { href: "/create/edit", label: "Edit", icon: "M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4" },
  { href: "/create/upscale", label: "Upscale", icon: "M4 14v6h6M20 10V4h-6M4 20l7-7M20 4l-7 7" },
  { href: "/library", label: "Library", icon: "M4 5h6v6H4zM14 5h6v6h-6zM4 15h6v4H4zM14 15h6v4h-6z" },
  { href: "/presets", label: "Moves", icon: "M12 3v4M12 17v4M3 12h4M17 12h4M12 12m-3 0a3 3 0 1 0 6 0 3 3 0 1 0-6 0" },
];

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

export function AppShell({ name, email, mock, children }: { name: string; email: string; mock: boolean; children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { credits } = useCredits();
  const [menu, setMenu] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      {/* Sidebar (desktop) / bottom bar (mobile) */}
      <aside className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 backdrop-blur md:static md:w-56 md:shrink-0 md:border-r md:border-t-0">
        <div className="hidden h-16 items-center px-5 md:flex">
          <Logo href="/create/video" />
        </div>
        <nav className="flex justify-around px-1 py-1.5 md:flex-col md:gap-1 md:px-3 md:py-2">
          {NAV.map((n) => {
            const active = path === n.href || path.startsWith(`${n.href}/`);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`flex flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[11px] transition md:flex-row md:gap-3 md:px-3 md:py-2.5 md:text-sm ${
                  active ? "bg-surface-2 text-fg" : "text-muted hover:bg-surface hover:text-fg"
                }`}
              >
                <span className={active ? "text-accent" : ""}><Icon d={n.icon} /></span>
                {n.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col pb-16 md:pb-0">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-line bg-bg/85 px-4 backdrop-blur md:h-16 md:px-6">
          <div className="md:hidden"><Logo href="/create/video" /></div>
          <div className="hidden md:block" />
          <div className="flex items-center gap-2">
            {mock && (
              <span
                title="No FAL_KEY is configured, so generations return placeholder media and cost nothing real."
                className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 text-xs font-medium text-amber-300"
              >
                Mock mode
              </span>
            )}
            <Link href="/pricing" className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-sm" title="Credits">
              <span className="size-2 rounded-full bg-accent" />
              <span className="font-semibold tabular-nums" data-testid="credits">{credits}</span>
              <span className="text-muted">credits</span>
            </Link>
            <div className="relative">
              <button
                onClick={() => setMenu((v) => !v)}
                aria-expanded={menu}
                aria-label="Account menu"
                className="flex size-9 items-center justify-center rounded-full bg-surface-2 text-sm font-semibold uppercase"
              >
                {name.slice(0, 1)}
              </button>
              {menu && (
                <>
                  <button className="fixed inset-0 z-40 cursor-default" aria-hidden tabIndex={-1} onClick={() => setMenu(false)} />
                  <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-line bg-surface p-2 shadow-2xl">
                    <div className="px-2 py-1.5">
                      <div className="truncate text-sm font-medium">{name}</div>
                      <div className="truncate text-xs text-muted">{email}</div>
                    </div>
                    <div className="my-1 border-t border-line" />
                    <Link href="/" className="block rounded-lg px-2 py-1.5 text-sm text-muted hover:bg-surface-2 hover:text-fg">Home</Link>
                    <Link href="/pricing" className="block rounded-lg px-2 py-1.5 text-sm text-muted hover:bg-surface-2 hover:text-fg">Pricing</Link>
                    <button onClick={logout} className="block w-full rounded-lg px-2 py-1.5 text-left text-sm text-muted hover:bg-surface-2 hover:text-fg">
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
