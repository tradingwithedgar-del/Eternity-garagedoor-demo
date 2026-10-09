"use client";

import { useRef, useState } from "react";

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-muted">{label}</span>
        {hint && <span className="text-xs text-muted/80">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  format = (v) => v,
  disabled,
}: {
  options: T[];
  value: T | undefined;
  onChange: (v: T) => void;
  format?: (v: T) => string;
  disabled?: boolean;
}) {
  return (
    <div className={`flex flex-wrap gap-1.5 ${disabled ? "pointer-events-none opacity-40" : ""}`} role="radiogroup">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={value === o}
          onClick={() => onChange(o)}
          className={`rounded-lg border px-3 py-1.5 text-sm transition ${
            value === o ? "border-accent bg-accent/10 text-fg" : "border-line text-muted hover:border-muted hover:text-fg"
          }`}
        >
          {format(o)}
        </button>
      ))}
    </div>
  );
}

function AspectIcon({ ratio }: { ratio: string }) {
  const [w, h] = ratio.split(":").map(Number);
  if (!w || !h) {
    return <span className="block size-3.5 rounded-[3px] border border-dashed border-current" />;
  }
  const s = 14 / Math.max(w, h);
  return <span className="block rounded-[2px] border border-current" style={{ width: w * s, height: h * s }} />;
}

export function AspectPicker({
  options,
  value,
  onChange,
  disabled,
}: {
  options: string[];
  value: string | undefined;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className={`flex flex-wrap gap-1.5 ${disabled ? "pointer-events-none opacity-40" : ""}`} role="radiogroup">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={value === o}
          onClick={() => onChange(o)}
          className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm transition ${
            value === o ? "border-accent bg-accent/10 text-fg" : "border-line text-muted hover:border-muted hover:text-fg"
          }`}
        >
          <span className="flex size-4 items-center justify-center"><AspectIcon ratio={o} /></span>
          {o === "auto" ? "Auto" : o}
        </button>
      ))}
    </div>
  );
}

const MAX_BYTES = 10 * 1024 * 1024;
const TYPES = ["image/png", "image/jpeg", "image/webp"];

export async function uploadImage(file: File): Promise<string> {
  if (!TYPES.includes(file.type)) throw new Error("Use a PNG, JPEG or WebP image.");
  if (file.size > MAX_BYTES) throw new Error("Images must be under 10 MB.");
  const body = new FormData();
  body.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Upload failed.");
  return data.url as string;
}

/** Click or drag-and-drop an image. */
export function ImageDrop({
  value,
  onChange,
  label = "Drop an image or click to upload",
  compact = false,
}: {
  value?: string;
  onChange: (url: string | undefined) => void;
  label?: string;
  compact?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState(false);

  async function handle(file: File | undefined | null) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      onChange(await uploadImage(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  if (value) {
    return (
      <div className={`group relative overflow-hidden rounded-xl border border-line bg-surface ${compact ? "aspect-square" : "aspect-video"}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={value} alt="Uploaded" className="size-full object-contain" />
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className="absolute right-2 top-2 rounded-full bg-black/70 px-2.5 py-1 text-xs font-medium backdrop-blur hover:bg-black"
        >
          Remove
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          handle(e.dataTransfer.files[0]);
        }}
        disabled={busy}
        className={`flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 text-center text-sm transition ${
          compact ? "aspect-square" : "py-8"
        } ${over ? "border-accent bg-accent/5" : "border-line text-muted hover:border-muted hover:text-fg"}`}
      >
        <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden>
          <path d="M12 16V4m0 0-4 4m4-4 4 4M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>{busy ? "Uploading…" : label}</span>
        {!compact && <span className="text-xs text-muted/70">PNG, JPEG or WebP · max 10 MB</span>}
      </button>
      <input
        ref={input}
        type="file"
        accept={TYPES.join(",")}
        className="hidden"
        onChange={(e) => {
          handle(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}
