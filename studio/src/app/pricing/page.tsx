import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { MODELS, type GenParams, type ModelDef } from "@/lib/models";

export const metadata: Metadata = { title: "Pricing" };

const TOOL_LABEL = { image: "Image", video: "Video", edit: "Edit", upscale: "Upscale" } as const;

/** Representative cost lines for each model, computed from the live registry. */
function costLines(m: ModelDef): { label: string; cost: number }[] {
  const base: GenParams = { prompt: "x", count: 1 };
  if (m.tool === "video") {
    const res = m.resolutions?.includes("1080p") ? "1080p" : m.resolutions?.[0];
    return (m.durations ?? []).map((d) => ({
      label: `${parseInt(d, 10)}s${res ? ` · ${res}` : ""}${m.audio ? " · with audio" : ""}`,
      cost: m.cost({ ...base, duration: d, resolution: res, audio: m.audio ? true : undefined }),
    }));
  }
  if (m.tool === "upscale") return [{ label: "per image", cost: m.cost(base) }];
  const lines = [{ label: "per image", cost: m.cost(base) }];
  if (m.resolutions?.includes("4K")) lines.push({ label: "per image · 4K", cost: m.cost({ ...base, resolution: "4K" }) });
  return lines;
}

export default function Pricing() {
  const free = Math.max(0, parseInt(process.env.SIGNUP_CREDITS ?? "100", 10) || 0);
  const contact = process.env.CONTACT_EMAIL;
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
        <div className="max-w-2xl">
          <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">Pay for what you make.</h1>
          <p className="mt-4 text-lg text-muted">
            Every generation costs a fixed number of credits, shown on the button before you press it. Failed
            generations are refunded automatically.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-accent/50 bg-surface p-8">
            <div className="text-sm font-medium text-accent">Starter</div>
            <div className="mt-2 font-display text-4xl font-semibold">{free} credits</div>
            <p className="mt-2 text-sm text-muted">Free with every new account. Enough for dozens of images or a few videos.</p>
            <Link href="/signup" className="mt-6 inline-block rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-ink hover:brightness-110">
              Create account
            </Link>
          </div>
          <div className="rounded-3xl border border-line bg-surface p-8">
            <div className="text-sm font-medium text-muted">Studios &amp; teams</div>
            <div className="mt-2 font-display text-4xl font-semibold">Top up anytime</div>
            <p className="mt-2 text-sm text-muted">Need more credits for a campaign or a team? Get in touch and we&apos;ll set you up.</p>
            {contact ? (
              <a href={`mailto:${contact}?subject=Credits`} className="mt-6 inline-block rounded-full border border-line px-6 py-3 text-sm font-semibold hover:border-muted">
                Contact us
              </a>
            ) : null}
          </div>
        </div>

        <h2 className="mt-20 font-display text-2xl font-semibold">Credit costs by model</h2>
        <div className="mt-6 overflow-hidden rounded-2xl border border-line">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Model</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Tool</th>
                <th className="px-4 py-3 font-medium">Option</th>
                <th className="px-4 py-3 text-right font-medium">Credits</th>
              </tr>
            </thead>
            <tbody>
              {MODELS.flatMap((m) =>
                costLines(m).map((l, i) => (
                  <tr key={`${m.id}-${i}`} className="border-t border-line/60">
                    <td className="px-4 py-3">{i === 0 ? <span className="font-medium">{m.label}</span> : null}</td>
                    <td className="hidden px-4 py-3 text-muted sm:table-cell">{i === 0 ? TOOL_LABEL[m.tool] : null}</td>
                    <td className="px-4 py-3 text-muted">{l.label}</td>
                    <td className="px-4 py-3 text-right font-mono">{l.cost}</td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
