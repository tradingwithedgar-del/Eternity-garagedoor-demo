import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { Logo } from "./Logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-line/60">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-12 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-xs space-y-3">
          <Logo />
          <p className="text-sm text-muted">{BRAND.description}</p>
        </div>
        <div className="grid grid-cols-2 gap-10 text-sm sm:grid-cols-3">
          <div className="space-y-2">
            <div className="font-semibold">Create</div>
            <Link href="/create/video" className="block text-muted hover:text-fg">Video</Link>
            <Link href="/create/image" className="block text-muted hover:text-fg">Image</Link>
            <Link href="/create/edit" className="block text-muted hover:text-fg">Edit</Link>
            <Link href="/create/upscale" className="block text-muted hover:text-fg">Upscale</Link>
          </div>
          <div className="space-y-2">
            <div className="font-semibold">Explore</div>
            <Link href="/presets" className="block text-muted hover:text-fg">Camera moves</Link>
            <Link href="/pricing" className="block text-muted hover:text-fg">Pricing</Link>
          </div>
          <div className="space-y-2">
            <div className="font-semibold">Account</div>
            <Link href="/login" className="block text-muted hover:text-fg">Sign in</Link>
            <Link href="/signup" className="block text-muted hover:text-fg">Create account</Link>
          </div>
        </div>
      </div>
      <div className="border-t border-line/60 py-6 text-center text-xs text-muted">
        © {new Date().getFullYear()} {BRAND.name}. Generated media is subject to each model provider&apos;s terms.
      </div>
    </footer>
  );
}
