import Link from "next/link";
import { getUser } from "@/lib/auth";
import { Logo } from "./Logo";

export async function SiteHeader() {
  const user = await getUser();
  return (
    <header className="sticky top-0 z-40 border-b border-line/60 bg-bg/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden items-center gap-6 text-sm text-muted md:flex">
            <Link href="/create/video" className="hover:text-fg">Video</Link>
            <Link href="/create/image" className="hover:text-fg">Image</Link>
            <Link href="/presets" className="hover:text-fg">Camera moves</Link>
            <Link href="/pricing" className="hover:text-fg">Pricing</Link>
          </nav>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {user ? (
            <Link href="/create/video" className="rounded-full bg-accent px-4 py-2 font-semibold text-accent-ink hover:brightness-110">
              Open studio
            </Link>
          ) : (
            <>
              <Link href="/login" className="rounded-full px-4 py-2 text-muted hover:text-fg">Sign in</Link>
              <Link href="/signup" className="rounded-full bg-accent px-4 py-2 font-semibold text-accent-ink hover:brightness-110">
                Start free
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
