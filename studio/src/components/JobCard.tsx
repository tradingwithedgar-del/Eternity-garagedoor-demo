"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getModel, type GenParams, type Tool } from "@/lib/models";
import { MOTION_PRESETS, STYLE_PRESETS } from "@/lib/presets";

export type Output = { type: "image" | "video"; url: string; width?: number; height?: number };

export type Job = {
  id: string;
  tool: Tool;
  model: string;
  prompt: string;
  params: GenParams;
  cost: number;
  status: "queued" | "running" | "completed" | "failed";
  outputs: Output[];
  error: string | null;
  createdAt: number;
  completedAt: number | null;
};

export const isPending = (j: Job) => j.status === "queued" || j.status === "running";

function knownAspect(job: Job): string | undefined {
  const [w, h] = (job.params.aspect ?? "").split(":").map(Number);
  return w && h ? `${w} / ${h}` : undefined;
}

function aspectStyle(job: Job): React.CSSProperties {
  return { aspectRatio: knownAspect(job) ?? (job.tool === "video" ? "16 / 9" : "1 / 1") };
}

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);
  return now;
}

function Media({ out, className, controls = false }: { out: Output; className?: string; controls?: boolean }) {
  if (out.type === "video") {
    return <video src={out.url} className={className} autoPlay muted={!controls} loop playsInline controls={controls} />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={out.url} alt="" className={className} loading="lazy" />;
}

export function Lightbox({ job, index, onClose }: { job: Job; index: number; onClose: () => void }) {
  const [i, setI] = useState(index);
  const out = job.outputs[i];
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setI((v) => Math.min(v + 1, job.outputs.length - 1));
      if (e.key === "ArrowLeft") setI((v) => Math.max(v - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [job.outputs.length, onClose]);
  if (!out) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur" role="dialog" aria-modal="true">
      <div className="flex items-center justify-between gap-4 p-4">
        <p className="line-clamp-2 max-w-3xl text-sm text-white/80">{job.prompt}</p>
        <div className="flex shrink-0 items-center gap-2">
          <a href={`/api/download?job=${job.id}&i=${i}`} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black">
            Download
          </a>
          <button onClick={onClose} className="rounded-full border border-white/20 px-4 py-2 text-sm" aria-label="Close">
            Close
          </button>
        </div>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center p-4 pt-0" onClick={onClose}>
        <div onClick={(e) => e.stopPropagation()} className="flex max-h-full max-w-full">
          <Media out={out} controls className="max-h-[calc(100dvh-7rem)] max-w-full rounded-lg object-contain" />
        </div>
        {job.outputs.length > 1 && (
          <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2" onClick={(e) => e.stopPropagation()}>
            {job.outputs.map((_, k) => (
              <button
                key={k}
                onClick={() => setI(k)}
                aria-label={`Show result ${k + 1}`}
                className={`size-2.5 rounded-full ${k === i ? "bg-white" : "bg-white/30"}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function JobCard({
  job,
  onDelete,
  onReuse,
}: {
  job: Job;
  onDelete?: (id: string) => void;
  onReuse?: (job: Job) => void;
}) {
  const pending = isPending(job);
  const now = useNow(pending);
  const [open, setOpen] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const model = getModel(job.model);
  const motion = MOTION_PRESETS.find((m) => m.id === job.params.motion);
  const style = STYLE_PRESETS.find((s) => s.id === job.params.style);
  const elapsed = Math.max(0, Math.round((now - job.createdAt) / 1000));
  const cols = job.outputs.length > 1 ? "grid-cols-2" : "grid-cols-1";

  async function remove() {
    if (!confirm("Delete this generation? This can't be undone.")) return;
    setDeleting(true);
    const res = await fetch(`/api/jobs/${job.id}`, { method: "DELETE" });
    if (res.ok) onDelete?.(job.id);
    else setDeleting(false);
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-line bg-surface" data-testid="job" data-status={job.status}>
      {pending ? (
        <div className="shimmer relative flex w-full items-center justify-center" style={aspectStyle(job)}>
          <div className="text-center">
            <div className="mx-auto size-8 animate-spin rounded-full border-2 border-white/20 border-t-accent" />
            <div className="mt-3 text-sm font-medium">{job.status === "queued" ? "In queue" : "Generating"}</div>
            <div className="text-xs tabular-nums text-muted">{elapsed}s</div>
          </div>
        </div>
      ) : job.status === "failed" ? (
        <div className="flex w-full items-center justify-center bg-danger/5 p-6 text-center" style={aspectStyle(job)}>
          <div>
            <div className="text-sm font-medium text-danger">Generation failed</div>
            <p className="mt-1 max-w-xs text-xs text-muted">{job.error}</p>
            <p className="mt-2 text-xs text-muted">{job.cost} credits refunded.</p>
          </div>
        </div>
      ) : (
        <div className={`grid gap-0.5 ${cols}`}>
          {job.outputs.map((o, i) => (
            <div key={i} className="group relative bg-black">
              {/* Reserve the box up front so cards don't jump while media loads. */}
              <button
                className="block w-full"
                style={knownAspect(job) || o.type === "video" ? aspectStyle(job) : undefined}
                onClick={() => setOpen(i)}
                aria-label="Open full size"
              >
                <Media
                  out={o}
                  className={`block w-full ${knownAspect(job) ? "h-full object-cover" : o.type === "video" ? "h-full object-contain" : ""}`}
                />
              </button>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap gap-1 bg-gradient-to-t from-black/80 to-transparent p-2 pt-8 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                <a
                  href={`/api/download?job=${job.id}&i=${i}`}
                  className="pointer-events-auto rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-black hover:bg-white"
                >
                  Download
                </a>
                {o.type === "image" && (
                  <>
                    <Link href={`/create/video?image=${encodeURIComponent(o.url)}`} className="pointer-events-auto rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-accent-ink">
                      Animate
                    </Link>
                    <Link href={`/create/edit?image=${encodeURIComponent(o.url)}`} className="pointer-events-auto rounded-full bg-black/70 px-2.5 py-1 text-xs font-semibold backdrop-blur">
                      Edit
                    </Link>
                    {job.tool !== "upscale" && (
                      <Link href={`/create/upscale?image=${encodeURIComponent(o.url)}`} className="pointer-events-auto rounded-full bg-black/70 px-2.5 py-1 text-xs font-semibold backdrop-blur">
                        Upscale
                      </Link>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2 p-3">
        <p className="line-clamp-2 text-sm" title={job.prompt}>{job.prompt}</p>
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
          <span className="rounded-full border border-line px-2 py-0.5">{model?.label ?? job.model}</span>
          {motion && <span className="rounded-full border border-line px-2 py-0.5">{motion.name}</span>}
          {style && <span className="rounded-full border border-line px-2 py-0.5">{style.name}</span>}
          {job.params.duration && <span className="rounded-full border border-line px-2 py-0.5">{parseInt(job.params.duration, 10)}s</span>}
          {job.params.aspect && <span className="rounded-full border border-line px-2 py-0.5">{job.params.aspect}</span>}
          <span className="ml-auto tabular-nums">{job.cost} cr</span>
        </div>
        {(onReuse || onDelete) && !pending && (
          <div className="flex gap-3 pt-1 text-xs">
            {onReuse && (
              <button onClick={() => onReuse(job)} className="text-muted hover:text-fg">
                Reuse settings
              </button>
            )}
            {onDelete && (
              <button onClick={remove} disabled={deleting} className="ml-auto text-muted hover:text-danger">
                {deleting ? "Deleting…" : "Delete"}
              </button>
            )}
          </div>
        )}
      </div>
      {open !== null && <Lightbox job={job} index={open} onClose={() => setOpen(null)} />}
    </article>
  );
}
