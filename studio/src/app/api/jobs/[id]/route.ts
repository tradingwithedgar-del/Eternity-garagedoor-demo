import { getUser } from "@/lib/auth";
import { errorResponse, json } from "@/lib/http";
import { deleteJob, getJob, publicJob } from "@/lib/jobs";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUser();
    if (!user) return json({ error: "Not signed in." }, 401);
    const { id } = await ctx.params;
    const job = await getJob(user.id, id, { sync: true });
    if (!job) return json({ error: "Not found." }, 404);
    // Re-read credits: a failed job may have just been refunded.
    const fresh = await getUser();
    return json({ job: publicJob(job), credits: fresh?.credits ?? user.credits });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUser();
    if (!user) return json({ error: "Not signed in." }, 401);
    const { id } = await ctx.params;
    const ok = await deleteJob(user.id, id);
    if (!ok) return json({ error: "Only finished generations can be deleted." }, 400);
    return json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
