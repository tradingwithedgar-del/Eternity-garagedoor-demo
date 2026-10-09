"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { modelsFor, type GenParams, type ModelDef, type Tool } from "@/lib/models";
import { MOTION_PRESETS, STYLE_PRESETS, type MotionPreset } from "@/lib/presets";
import { AspectPicker, Field, ImageDrop, Segmented } from "./controls";
import { useCredits } from "./Credits";
import { isPending, JobCard, type Job } from "./JobCard";
import { MotionScene, MotionTile } from "./MotionTile";

const TITLES: Record<Tool, { title: string; sub: string; placeholder: string }> = {
  video: {
    title: "Video",
    sub: "Describe a shot, or start from a photo, then pick how the camera moves.",
    placeholder: "A lone surfer paddling out at dawn, mist over the water, golden backlight…",
  },
  image: {
    title: "Image",
    sub: "Describe what you want to see. Add a style for a consistent look.",
    placeholder: "Editorial portrait of a ceramic artist in her studio, morning window light…",
  },
  edit: {
    title: "Edit",
    sub: "Add reference images and describe the change.",
    placeholder: "Put the sneaker from image 1 on a wet city street at night with neon reflections…",
  },
  upscale: {
    title: "Upscale",
    sub: "Sharpen and enlarge an image up to 4K.",
    placeholder: "",
  },
};

export type StudioInitial = { motion?: string; image?: string; style?: string; prompt?: string; model?: string };

/** Keep a value only if the model supports it. */
const keep = (v: string | undefined, allowed: string[] | undefined, fallback?: string) =>
  allowed && allowed.length ? (v && allowed.includes(v) ? v : fallback ?? allowed[0]) : undefined;

export function Studio({ tool, initial }: { tool: Tool; initial: StudioInitial }) {
  const models = useMemo(() => modelsFor(tool), [tool]);
  const { credits, setCredits } = useCredits();
  const [model, setModel] = useState<ModelDef>(() => models.find((m) => m.id === initial.model) ?? models[0]);
  const [prompt, setPrompt] = useState(initial.prompt ?? "");
  const [aspect, setAspect] = useState<string | undefined>(() => keep(undefined, model.aspects, tool === "image" ? "1:1" : undefined));
  const [count, setCount] = useState(tool === "image" ? 2 : 1);
  const [duration, setDuration] = useState<string | undefined>(() => keep(undefined, model.durations));
  const [resolution, setResolution] = useState<string | undefined>(() =>
    keep(undefined, model.resolutions, tool === "upscale" ? "2160p" : model.resolutions?.includes("1080p") ? "1080p" : undefined),
  );
  const [audio, setAudio] = useState(true);
  const [motion, setMotion] = useState<string | undefined>(() =>
    MOTION_PRESETS.some((m) => m.id === initial.motion) ? initial.motion : undefined,
  );
  const [style, setStyle] = useState<string | undefined>(() =>
    STYLE_PRESETS.some((s) => s.id === initial.style) ? initial.style : undefined,
  );
  const [image, setImage] = useState<string | undefined>(tool === "video" || tool === "upscale" ? initial.image : undefined);
  const [images, setImages] = useState<string[]>(tool === "edit" && initial.image ? [initial.image] : []);
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [picker, setPicker] = useState(false);
  const promptRef = useRef<HTMLTextAreaElement>(null);

  function selectModel(m: ModelDef) {
    setModel(m);
    setAspect((a) => keep(a, m.aspects));
    setDuration((d) => keep(d, m.durations));
    setResolution((r) => keep(r, m.resolutions, tool === "upscale" ? "2160p" : m.resolutions?.includes("1080p") ? "1080p" : undefined));
    setCount((c) => Math.min(c, m.maxCount ?? 1));
  }

  const params: GenParams = {
    prompt,
    aspect: tool === "video" && image ? undefined : aspect,
    count: model.maxCount ? count : undefined,
    duration,
    resolution,
    audio: model.audio ? audio : undefined,
    motion: tool === "video" ? motion : undefined,
    style: tool === "image" ? style : undefined,
    image: tool === "video" || tool === "upscale" ? image : undefined,
    images: tool === "edit" ? images : undefined,
  };
  const cost = model.cost(params);
  const ready =
    tool === "upscale" ? !!image : tool === "edit" ? !!prompt.trim() && images.length > 0 : !!prompt.trim();
  const affordable = credits >= cost;

  // Initial feed.
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/jobs?tool=${tool}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setJobs(d.jobs ?? []);
        if (typeof d.credits === "number") setCredits(d.credits);
      })
      .catch(() => !cancelled && setJobs([]));
    return () => {
      cancelled = true;
    };
  }, [tool, setCredits]);

  // Poll unfinished jobs.
  const pendingIds = (jobs ?? []).filter(isPending).map((j) => j.id).join(",");
  useEffect(() => {
    if (!pendingIds) return;
    const ids = pendingIds.split(",");
    const t = setInterval(async () => {
      const results = await Promise.all(
        ids.map((id) => fetch(`/api/jobs/${id}`).then((r) => (r.ok ? r.json() : null)).catch(() => null)),
      );
      let latestCredits: number | undefined;
      const updated = new Map<string, Job>();
      for (const r of results) {
        if (r?.job) updated.set(r.job.id, r.job);
        if (typeof r?.credits === "number") latestCredits = r.credits;
      }
      setJobs((prev) => prev?.map((j) => updated.get(j.id) ?? j) ?? prev);
      if (latestCredits !== undefined) setCredits(latestCredits);
    }, 2500);
    return () => clearInterval(t);
  }, [pendingIds, setCredits]);

  async function submit() {
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool, model: model.id, params }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not start the generation.");
        // A refund may have happened server-side; resync the balance.
        fetch("/api/me").then((r) => r.json()).then((d) => d.user && setCredits(d.user.credits)).catch(() => {});
        return;
      }
      setJobs((prev) => [data.job, ...(prev ?? [])]);
      setCredits(credits - data.job.cost);
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  function reuse(job: Job) {
    const m = models.find((x) => x.id === job.model);
    if (m) selectModel(m);
    setPrompt(job.tool === "upscale" ? "" : job.prompt);
    if (job.params.aspect) setAspect(job.params.aspect);
    if (job.params.duration) setDuration(job.params.duration);
    if (job.params.resolution) setResolution(job.params.resolution);
    if (job.params.count) setCount(job.params.count);
    setMotion(job.params.motion);
    setStyle(job.params.style);
    if (job.params.audio !== undefined) setAudio(job.params.audio);
    if (tool === "video" || tool === "upscale") setImage(job.params.image);
    if (tool === "edit") setImages(job.params.images ?? []);
    window.scrollTo({ top: 0, behavior: "smooth" });
    promptRef.current?.focus();
  }

  const selectedMotion = MOTION_PRESETS.find((m) => m.id === motion);
  const t = TITLES[tool];

  return (
    <div className="grid gap-6 p-4 md:p-6 lg:grid-cols-[380px_minmax(0,1fr)]">
      {/* Controls */}
      <section className="space-y-5 lg:sticky lg:top-22 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto lg:pr-1 scrollbar-thin">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">{t.title}</h1>
          <p className="mt-1 text-sm text-muted">{t.sub}</p>
        </div>

        <Field label="Model">
          <div className="grid gap-1.5">
            {models.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => selectModel(m)}
                aria-pressed={model.id === m.id}
                className={`flex items-start justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                  model.id === m.id ? "border-accent bg-accent/5" : "border-line hover:border-muted"
                }`}
              >
                <span>
                  <span className="block text-sm font-medium">{m.label}</span>
                  <span className="block text-xs text-muted">{m.blurb}</span>
                </span>
                {m.badge && (
                  <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted">
                    {m.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </Field>

        {(tool === "video" || tool === "upscale") && (
          <Field label={tool === "video" ? "Start frame" : "Image"} hint={tool === "video" ? "Optional" : undefined}>
            <ImageDrop
              value={image}
              onChange={setImage}
              label={tool === "video" ? "Add a photo to animate (optional)" : "Drop an image or click to upload"}
            />
          </Field>
        )}

        {tool === "edit" && (
          <Field label="References" hint={`${images.length}/4`}>
            <div className="grid grid-cols-4 gap-2">
              {images.map((u, i) => (
                <ImageDrop key={u + i} compact value={u} onChange={() => setImages(images.filter((_, k) => k !== i))} />
              ))}
              {images.length < 4 && (
                <ImageDrop compact label="Add" onChange={(u) => u && setImages((prev) => [...prev, u].slice(0, 4))} />
              )}
            </div>
          </Field>
        )}

        {tool !== "upscale" && (
          <Field label="Prompt" hint={`${prompt.length}/2500`}>
            <textarea
              ref={promptRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value.slice(0, 2500))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
              }}
              rows={5}
              placeholder={t.placeholder}
              className="w-full resize-y rounded-xl border border-line bg-surface px-3.5 py-3 text-sm leading-relaxed outline-none placeholder:text-muted/60 focus:border-accent"
            />
          </Field>
        )}

        {tool === "video" && (
          <Field label="Camera move">
            <button
              type="button"
              onClick={() => setPicker(true)}
              className="flex w-full items-center gap-3 rounded-xl border border-line p-2 text-left transition hover:border-muted"
            >
              <span className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                {selectedMotion ? <MotionScene anim={selectedMotion.anim} /> : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{selectedMotion?.name ?? "Model decides"}</span>
                <span className="block truncate text-xs text-muted">
                  {selectedMotion?.description ?? "Pick a named move for precise control"}
                </span>
              </span>
              <span className="pr-2 text-xs text-accent">Change</span>
            </button>
          </Field>
        )}

        {tool === "image" && (
          <Field label="Style">
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setStyle(undefined)}
                className={`rounded-lg border px-3 py-1.5 text-sm ${!style ? "border-accent bg-accent/10" : "border-line text-muted hover:text-fg"}`}
              >
                None
              </button>
              {STYLE_PRESETS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStyle(s.id)}
                  className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm ${
                    style === s.id ? "border-accent bg-accent/10" : "border-line text-muted hover:text-fg"
                  }`}
                >
                  <span className="size-3.5 rounded-full" style={{ background: s.swatch }} />
                  {s.name}
                </button>
              ))}
            </div>
          </Field>
        )}

        {model.aspects.length > 0 && (
          <Field label="Aspect ratio" hint={tool === "video" && image ? "Matches start frame" : undefined}>
            <AspectPicker options={model.aspects} value={aspect} onChange={setAspect} disabled={tool === "video" && !!image} />
          </Field>
        )}

        {model.durations && (
          <Field label="Duration">
            <Segmented options={model.durations} value={duration} onChange={setDuration} format={(d) => `${parseInt(d, 10)}s`} />
          </Field>
        )}

        {model.resolutions && (
          <Field label={tool === "upscale" ? "Target size" : "Resolution"}>
            <Segmented
              options={model.resolutions}
              value={resolution}
              onChange={setResolution}
              format={(r) => (r === "2160p" ? "4K" : r === "1440p" ? "2K" : r)}
            />
          </Field>
        )}

        {model.maxCount && model.maxCount > 1 && (
          <Field label="Images">
            <Segmented
              options={Array.from({ length: model.maxCount }, (_, i) => String(i + 1))}
              value={String(count)}
              onChange={(v) => setCount(Number(v))}
            />
          </Field>
        )}

        {model.audio && (
          <label className="flex cursor-pointer items-center justify-between rounded-xl border border-line px-3 py-2.5">
            <span>
              <span className="block text-sm font-medium">Generate sound</span>
              <span className="block text-xs text-muted">Dialogue, ambience and effects</span>
            </span>
            <input type="checkbox" checked={audio} onChange={(e) => setAudio(e.target.checked)} className="size-4 accent-[#c8f53b]" />
          </label>
        )}

        {error && (
          <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <div className="sticky bottom-16 z-10 -mx-1 bg-bg/90 px-1 pb-1 pt-2 backdrop-blur md:bottom-0">
          <button
            type="button"
            onClick={submit}
            disabled={!ready || busy || !affordable}
            data-testid="generate"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3.5 text-sm font-semibold text-accent-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Starting…" : "Generate"}
            <span className="rounded-md bg-accent-ink/10 px-1.5 py-0.5 text-xs tabular-nums">{cost} cr</span>
          </button>
          {!affordable && (
            <p className="mt-2 text-center text-xs text-muted">
              You need {cost - credits} more credits for this.
            </p>
          )}
        </div>
      </section>

      {/* Feed */}
      <section className="min-w-0">
        {jobs === null ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="shimmer aspect-video rounded-2xl" />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-2xl border border-dashed border-line p-8 text-center">
            <div className="font-display text-xl font-semibold">Nothing here yet</div>
            <p className="mt-2 max-w-sm text-sm text-muted">Your {t.title.toLowerCase()} generations will appear here as they finish.</p>
          </div>
        ) : (
          <div className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {jobs.map((j) => (
              <JobCard key={j.id} job={j} onReuse={reuse} onDelete={(id) => setJobs((p) => p?.filter((x) => x.id !== id) ?? p)} />
            ))}
          </div>
        )}
      </section>

      {picker && (
        <MotionPicker
          value={motion}
          onClose={() => setPicker(false)}
          onSelect={(id) => {
            setMotion(id);
            setPicker(false);
          }}
        />
      )}
    </div>
  );
}

function MotionPicker({
  value,
  onSelect,
  onClose,
}: {
  value?: string;
  onSelect: (id: string | undefined) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const groups = MOTION_PRESETS.reduce<Record<string, MotionPreset[]>>((acc, p) => {
    (acc[p.category] ??= []).push(p);
    return acc;
  }, {});
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose} role="dialog" aria-modal="true" aria-label="Camera moves">
      <div
        className="flex max-h-[90dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl border border-line bg-bg sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-display text-lg font-semibold">Camera moves</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => onSelect(undefined)} className="rounded-full border border-line px-3 py-1.5 text-sm text-muted hover:text-fg">
              Let the model decide
            </button>
            <button onClick={onClose} className="rounded-full border border-line px-3 py-1.5 text-sm" aria-label="Close">
              Close
            </button>
          </div>
        </div>
        <div className="space-y-6 overflow-y-auto p-5 scrollbar-thin">
          {Object.entries(groups).map(([cat, list]) => (
            <div key={cat}>
              <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted">{cat}</h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
                {list.map((p) => (
                  <button key={p.id} onClick={() => onSelect(p.id)} className="text-left" aria-pressed={value === p.id}>
                    <MotionTile preset={p} selected={value === p.id} />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
