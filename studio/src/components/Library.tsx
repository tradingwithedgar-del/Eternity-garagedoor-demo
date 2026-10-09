"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCredits } from "./Credits";
import { isPending, JobCard, type Job } from "./JobCard";

const FILTERS = [
  { id: "", label: "All" },
  { id: "video", label: "Video" },
  { id: "image", label: "Image" },
  { id: "edit", label: "Edit" },
  { id: "upscale", label: "Upscale" },
];

const PAGE = 30;

async function fetchPage(tool: string, before?: number): Promise<{ jobs: Job[]; credits?: number }> {
  const qs = new URLSearchParams();
  if (tool) qs.set("tool", tool);
  if (before) qs.set("before", String(before));
  const res = await fetch(`/api/jobs?${qs}`);
  if (!res.ok) throw new Error("Failed to load");
  const d = await res.json();
  return { jobs: d.jobs ?? [], credits: typeof d.credits === "number" ? d.credits : undefined };
}

export function Library() {
  const { setCredits } = useCredits();
  const [filter, setFilter] = useState("");
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(false);

  // Initial page for the current filter; stale responses are ignored.
  useEffect(() => {
    let cancelled = false;
    fetchPage(filter)
      .then((d) => {
        if (cancelled) return;
        setJobs(d.jobs);
        setMore(d.jobs.length === PAGE);
        if (d.credits !== undefined) setCredits(d.credits);
      })
      .catch(() => !cancelled && setJobs([]));
    return () => {
      cancelled = true;
    };
  }, [filter, setCredits]);

  async function loadMore() {
    if (!jobs?.length) return;
    setLoading(true);
    try {
      const d = await fetchPage(filter, jobs.at(-1)!.createdAt);
      setJobs((prev) => [...(prev ?? []), ...d.jobs]);
      setMore(d.jobs.length === PAGE);
    } catch {
      // Keep what we have; the button stays available to retry.
    } finally {
      setLoading(false);
    }
  }

  // Keep unfinished items fresh.
  const pendingIds = (jobs ?? []).filter(isPending).map((j) => j.id).join(",");
  useEffect(() => {
    if (!pendingIds) return;
    const t = setInterval(async () => {
      const results = await Promise.all(
        pendingIds.split(",").map((id) => fetch(`/api/jobs/${id}`).then((r) => (r.ok ? r.json() : null)).catch(() => null)),
      );
      const map = new Map<string, Job>(results.filter((r) => r?.job).map((r) => [r.job.id, r.job]));
      setJobs((prev) => prev?.map((j) => map.get(j.id) ?? j) ?? prev);
      const c = results.findLast((r) => typeof r?.credits === "number")?.credits;
      if (c !== undefined) setCredits(c);
    }, 3000);
    return () => clearInterval(t);
  }, [pendingIds, setCredits]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Library</h1>
          <p className="mt-1 text-sm text-muted">Everything you&apos;ve generated, newest first.</p>
        </div>
        <div className="flex gap-1.5 rounded-xl border border-line p-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => {
                if (f.id === filter) return;
                setJobs(null);
                setFilter(f.id);
              }}
              className={`rounded-lg px-3 py-1.5 text-sm ${filter === f.id ? "bg-surface-2 text-fg" : "text-muted hover:text-fg"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {jobs === null ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="shimmer aspect-square rounded-2xl" />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-2xl border border-dashed border-line p-8 text-center">
          <div className="font-display text-xl font-semibold">Your library is empty</div>
          <p className="mt-2 text-sm text-muted">Start with a video or an image.</p>
          <div className="mt-6 flex gap-2">
            <Link href="/create/video" className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink">Make a video</Link>
            <Link href="/create/image" className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold">Make an image</Link>
          </div>
        </div>
      ) : (
        <>
          <div className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {jobs.map((j) => (
              <JobCard key={j.id} job={j} onDelete={(id) => setJobs((p) => p?.filter((x) => x.id !== id) ?? p)} />
            ))}
          </div>
          {more && (
            <div className="flex justify-center">
              <button
                onClick={loadMore}
                disabled={loading}
                className="rounded-full border border-line px-5 py-2.5 text-sm font-medium hover:border-muted disabled:opacity-50"
              >
                {loading ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
