import Link from "next/link";
import { BRAND } from "@/lib/brand";

export function LogoMark({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <rect width="64" height="64" rx="16" fill="#c8f53b" />
      <path
        d="M22 18h14a10 10 0 0 1 2.6 19.66L46 46h-8.2l-6.6-8H30v8h-8V18zm8 7v7h5.5a3.5 3.5 0 0 0 0-7H30z"
        fill="#141a00"
      />
    </svg>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
      <LogoMark />
      {BRAND.name}
    </Link>
  );
}
