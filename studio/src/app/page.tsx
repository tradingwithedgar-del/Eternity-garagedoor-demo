import Link from "next/link";
import { MotionTile } from "@/components/MotionTile";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { BRAND } from "@/lib/brand";
import { MODELS } from "@/lib/models";
import { MOTION_PRESETS } from "@/lib/presets";

const TOOLS = [
  {
    href: "/create/video",
    title: "Video",
    body: "Text or a single photo in, a moving shot out. Pick from 20 named camera moves or describe your own.",
    tag: "Text & image to video",
  },
  {
    href: "/create/image",
    title: "Image",
    body: "Four top image models behind one prompt box, with style presets and any aspect ratio.",
    tag: "Text to image",
  },
  {
    href: "/create/edit",
    title: "Edit",
    body: "Drop in up to four references and say what should change. Faces and products stay consistent.",
    tag: "Image to image",
  },
  {
    href: "/create/upscale",
    title: "Upscale",
    body: "Recover detail and take any still to 1080p, 1440p or full 4K for delivery.",
    tag: "Up to 4K",
  },
];

const STEPS = [
  { n: "01", title: "Start from anything", body: "A sentence, a product photo, a selfie or a frame you generated a minute ago." },
  { n: "02", title: "Direct the camera", body: "Choose a move like Crash Zoom or 360 Orbit. We translate it into language every model understands." },
  { n: "03", title: "Iterate and ship", body: "Animate, edit or upscale any result in one click, then download in full quality." },
];

export default function Home() {
  const vendors = [...new Set(MODELS.map((m) => m.vendor))];
  const showcase = MOTION_PRESETS.filter((p) => !p.static);
  return (
    <>
      <SiteHeader />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="aurora pointer-events-none absolute inset-0" />
          <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-20 sm:px-6 md:pt-28">
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 px-3 py-1 text-xs text-muted">
                <span className="size-1.5 rounded-full bg-accent" />
                {MODELS.length} models · {MOTION_PRESETS.length} camera moves
              </span>
              <h1 className="mt-6 font-display text-5xl font-semibold leading-[1.02] tracking-tight sm:text-7xl">
                Direct the shot.
                <br />
                <span className="text-accent">Skip the crew.</span>
              </h1>
              <p className="mx-auto mt-6 max-w-xl text-lg text-muted">{BRAND.description}</p>
              <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/create/video"
                  className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-ink transition hover:brightness-110"
                >
                  Make a video, free
                </Link>
                <Link
                  href="/presets"
                  className="rounded-full border border-line bg-surface/60 px-6 py-3 text-sm font-semibold transition hover:border-muted"
                >
                  Browse camera moves
                </Link>
              </div>
            </div>
          </div>

          {/* Camera-move marquee */}
          <div className="relative overflow-hidden pb-20 [mask-image:linear-gradient(90deg,transparent,#000_10%,#000_90%,transparent)]">
            <div className="marquee flex w-max gap-4">
              {[...showcase, ...showcase].map((p, i) => (
                <Link key={`${p.id}-${i}`} href={`/create/video?motion=${p.id}`} className="w-44 shrink-0 sm:w-52" tabIndex={i >= showcase.length ? -1 : 0}>
                  <MotionTile preset={p} />
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Tools */}
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">One studio, four tools.</h2>
            <p className="mt-3 text-muted">Every result can flow into the next tool, so a still becomes a shot becomes a deliverable.</p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TOOLS.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className="group flex flex-col justify-between rounded-2xl border border-line bg-surface p-6 transition hover:border-accent/60"
              >
                <div>
                  <span className="text-xs font-medium uppercase tracking-wider text-accent">{t.tag}</span>
                  <h3 className="mt-3 font-display text-2xl font-semibold">{t.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{t.body}</p>
                </div>
                <span className="mt-8 text-sm font-medium text-fg/80 group-hover:text-accent">Open {t.title.toLowerCase()} →</span>
              </Link>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="border-y border-line/60 bg-surface/40">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n}>
                <div className="font-display text-sm text-accent">{s.n}</div>
                <h3 className="mt-2 font-display text-xl font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Models */}
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">The best models, one balance.</h2>
              <p className="mt-3 text-muted">
                Models from {vendors.slice(0, -1).join(", ")} and {vendors.at(-1)}. Pick per shot, pay per generation.
              </p>
            </div>
            <Link href="/pricing" className="text-sm font-medium text-accent hover:underline">
              See credit costs →
            </Link>
          </div>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {MODELS.map((m) => (
              <div key={m.id} className="flex items-start justify-between gap-4 rounded-2xl border border-line bg-surface p-5">
                <div>
                  <div className="font-semibold">{m.label}</div>
                  <div className="text-xs text-muted">{m.vendor}</div>
                  <p className="mt-2 text-sm text-muted">{m.blurb}</p>
                </div>
                <span className="shrink-0 rounded-full border border-line px-2 py-0.5 text-[11px] uppercase tracking-wide text-muted">
                  {m.tool}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl border border-line bg-surface px-6 py-16 text-center">
            <div className="aurora pointer-events-none absolute inset-0 opacity-60" />
            <div className="relative">
              <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-5xl">Your first shots are on us.</h2>
              <p className="mx-auto mt-4 max-w-md text-muted">New accounts start with free credits. No card needed.</p>
              <Link
                href="/signup"
                className="mt-8 inline-block rounded-full bg-accent px-7 py-3 text-sm font-semibold text-accent-ink transition hover:brightness-110"
              >
                Create your account
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
