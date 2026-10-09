import { getUser } from "@/lib/auth";
import { errorResponse, json } from "@/lib/http";
import { listJobs, publicJob } from "@/lib/jobs";
import type { Tool } from "@/lib/models";

const TOOLS = new Set(["image", "video", "edit", "upscale"]);

export async function GET(req: Request) {
  try {
    const user = await getUser();
    if (!user) return json({ error: "Not signed in." }, 401);
    const url = new URL(req.url);
    const tool = url.searchParams.get("tool");
    const before = Number(url.searchParams.get("before")) || undefined;
    const jobs = await listJobs(user.id, {
      tool: tool && TOOLS.has(tool) ? (tool as Tool) : undefined,
      before,
      limit: 30,
    });
    return json({ jobs: jobs.map(publicJob), credits: user.credits });
  } catch (err) {
    return errorResponse(err);
  }
}
