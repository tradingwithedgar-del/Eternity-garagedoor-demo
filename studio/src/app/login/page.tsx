import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { Logo } from "@/components/Logo";
import { getUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Sign in" };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getUser()) redirect(next?.startsWith("/") && !next.startsWith("//") ? next : "/create/video");
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-16">
      <div className="aurora pointer-events-none absolute inset-0 opacity-70" />
      <div className="relative w-full max-w-sm space-y-8 rounded-3xl border border-line bg-bg/80 p-8 backdrop-blur-xl">
        <div className="space-y-4">
          <Logo />
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">Welcome back</h1>
            <p className="mt-1 text-sm text-muted">Sign in to keep creating.</p>
          </div>
        </div>
        <AuthForm mode="login" next={next} />
      </div>
    </main>
  );
}
