import { getUser } from "@/lib/auth";
import { getJob } from "@/lib/jobs";

const EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "video/mp4": "mp4",
};

// Streams an output with Content-Disposition so cross-origin CDN files download
// instead of opening. Only URLs recorded on the caller's own job are fetched.
export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return new Response("Sign in", { status: 401 });
  const url = new URL(req.url);
  const job = await getJob(user.id, url.searchParams.get("job") ?? "");
  const out = job?.outputs[Number(url.searchParams.get("i") ?? 0)];
  if (!job || !out) return new Response("Not found", { status: 404 });

  const target = new URL(out.url, url.origin);
  const trusted =
    target.origin === url.origin ||
    (target.protocol === "https:" && /(^|\.)fal\.(media|run|ai)$/.test(target.hostname));
  if (!trusted) return Response.redirect(target, 302);
  const upstream = await fetch(target, {
    headers: target.origin === url.origin ? { cookie: req.headers.get("cookie") ?? "" } : {},
  });
  if (!upstream.ok || !upstream.body) return new Response("Could not fetch file", { status: 502 });
  const type = upstream.headers.get("content-type")?.split(";")[0] ?? "application/octet-stream";
  const name = `${job.tool}-${job.id.slice(0, 8)}-${Number(url.searchParams.get("i") ?? 0) + 1}.${EXT[type] ?? "bin"}`;
  return new Response(upstream.body, {
    headers: {
      "Content-Type": type,
      "Content-Disposition": `attachment; filename="${name}"`,
      ...(upstream.headers.get("content-length") ? { "Content-Length": upstream.headers.get("content-length")! } : {}),
    },
  });
}
