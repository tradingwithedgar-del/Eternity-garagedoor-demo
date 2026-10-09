import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="font-display text-6xl font-semibold text-accent">404</div>
      <p className="text-muted">That page doesn&apos;t exist.</p>
      <Link href="/" className="rounded-full border border-line px-5 py-2.5 text-sm font-medium hover:border-muted">Go home</Link>
    </main>
  );
}
