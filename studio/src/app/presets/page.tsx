import type { Metadata } from "next";
import Link from "next/link";
import { MotionTile } from "@/components/MotionTile";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { MOTION_PRESETS, STYLE_PRESETS, type MotionPreset } from "@/lib/presets";

export const metadata: Metadata = { title: "Camera moves" };

export default function PresetsPage() {
  const groups = MOTION_PRESETS.reduce<Record<string, MotionPreset[]>>((acc, p) => {
    (acc[p.category] ??= []).push(p);
    return acc;
  }, {});
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-7xl space-y-16 px-4 py-16 sm:px-6">
        <div className="max-w-2xl">
          <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">Camera moves</h1>
          <p className="mt-4 text-lg text-muted">
            Pick a move and we write the cinematography for you. Works with every video model, from text or from a photo.
          </p>
        </div>

        {Object.entries(groups).map(([cat, list]) => (
          <section key={cat}>
            <h2 className="mb-4 text-xs font-medium uppercase tracking-wider text-muted">{cat}</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {list.map((p) => (
                <Link key={p.id} href={`/create/video?motion=${p.id}`} aria-label={`Use ${p.name}`}>
                  <MotionTile preset={p} />
                </Link>
              ))}
            </div>
          </section>
        ))}

        <section>
          <h2 className="font-display text-2xl font-semibold">Image styles</h2>
          <p className="mt-2 text-muted">A consistent look across every image model.</p>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {STYLE_PRESETS.map((s) => (
              <Link
                key={s.id}
                href={`/create/image?style=${s.id}`}
                className="group overflow-hidden rounded-xl border border-line transition hover:border-muted"
              >
                <div className="aspect-[4/3]" style={{ background: s.swatch }} />
                <div className="p-3">
                  <div className="text-sm font-semibold">{s.name}</div>
                  <div className="line-clamp-2 text-xs text-muted">{s.prompt}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
