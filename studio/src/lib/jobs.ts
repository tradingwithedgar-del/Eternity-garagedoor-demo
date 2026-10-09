import "server-only";
import { randomUUID } from "node:crypto";
import { db } from "./db";
import { getModel, type GenParams, type Tool } from "./models";
import { isMock, provider, type Output } from "./provider";

export type JobStatus = "queued" | "running" | "completed" | "failed";

export type Job = {
  id: string;
  tool: Tool;
  model: string;
  prompt: string;
  params: GenParams;
  cost: number;
  status: JobStatus;
  outputs: Output[];
  error: string | null;
  createdAt: number;
  completedAt: number | null;
};

type Row = Record<string, unknown>;

/** Give up on provider requests that never finish. */
const STALE_MS = 60 * 60 * 1000;

function toJob(r: Row): Job & { endpoint: string; providerRequestId: string | null } {
  return {
    id: String(r.id),
    tool: String(r.tool) as Tool,
    model: String(r.model),
    endpoint: String(r.endpoint),
    prompt: String(r.prompt),
    params: JSON.parse(String(r.params)),
    cost: Number(r.cost),
    status: String(r.status) as JobStatus,
    providerRequestId: r.provider_request_id ? String(r.provider_request_id) : null,
    outputs: r.outputs ? JSON.parse(String(r.outputs)) : [],
    error: r.error ? String(r.error) : null,
    createdAt: Number(r.created_at),
    completedAt: r.completed_at == null ? null : Number(r.completed_at),
  };
}

export function publicJob(j: Job): Job {
  return {
    id: j.id,
    tool: j.tool,
    model: j.model,
    prompt: j.prompt,
    params: j.params,
    cost: j.cost,
    status: j.status,
    outputs: j.outputs,
    error: j.error,
    createdAt: j.createdAt,
    completedAt: j.completedAt,
  };
}

export class UserError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

function validate(tool: Tool, params: GenParams) {
  if (tool !== "upscale" && !params.prompt.trim()) throw new UserError("Write a prompt first.");
  if (tool === "edit" && !params.images?.length) throw new UserError("Add at least one reference image.");
  if (tool === "upscale" && !params.image) throw new UserError("Upload an image to upscale.");
  // Local URLs only exist in mock mode; a real provider can't fetch them.
  const local = [params.image, ...(params.images ?? [])].some((u) => u?.startsWith("/"));
  if (local && !isMock()) throw new UserError("That image is only available in mock mode. Upload it again.");
}

export async function createJob(userId: string, tool: Tool, modelId: string, params: GenParams): Promise<Job> {
  const model = getModel(modelId);
  if (!model || model.tool !== tool) throw new UserError("Unknown model.");
  if (tool === "image" || tool === "edit") delete params.image;
  if (tool !== "edit") delete params.images;
  if (tool === "upscale") params.prompt = params.prompt.trim() || "Upscale";
  validate(tool, params);

  // Prefer a start frame's own framing over the requested aspect.
  if (tool === "video" && params.image) params.aspect = undefined;

  const cost = model.cost(params);
  const endpoint = model.endpoint(params);
  const input = model.input(params);
  const c = await db();
  const id = randomUUID();
  const now = Date.now();

  const tx = await c.transaction("write");
  try {
    const debit = await tx.execute({
      sql: "UPDATE users SET credits = credits - ? WHERE id = ? AND credits >= ?",
      args: [cost, userId, cost],
    });
    if (debit.rowsAffected !== 1) {
      throw new UserError(`Not enough credits. This generation costs ${cost}.`, 402);
    }
    await tx.execute({
      sql: `INSERT INTO jobs (id, user_id, tool, model, endpoint, prompt, params, cost, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'queued', ?)`,
      args: [id, userId, tool, model.id, endpoint, params.prompt, JSON.stringify(params), cost, now],
    });
    await tx.commit();
  } catch (err) {
    await tx.rollback().catch(() => {});
    throw err;
  } finally {
    tx.close();
  }

  try {
    const requestId = await provider().submit(endpoint, input);
    await c.execute({
      sql: "UPDATE jobs SET provider_request_id = ? WHERE id = ?",
      args: [requestId, id],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not start generation.";
    await failAndRefund(id, message);
    throw new UserError(`${message} Your credits were refunded.`, 502);
  }

  const job = await getJob(userId, id);
  if (!job) throw new Error("Job vanished after creation");
  return job;
}

/** Marks a non-terminal job failed and refunds it exactly once. */
async function failAndRefund(jobId: string, error: string) {
  const c = await db();
  const tx = await c.transaction("write");
  try {
    const r = await tx.execute({
      sql: `UPDATE jobs SET status = 'failed', error = ?, completed_at = ?
            WHERE id = ? AND status IN ('queued', 'running')`,
      args: [error, Date.now(), jobId],
    });
    if (r.rowsAffected === 1) {
      await tx.execute({
        sql: "UPDATE users SET credits = credits + (SELECT cost FROM jobs WHERE id = ?) WHERE id = (SELECT user_id FROM jobs WHERE id = ?)",
        args: [jobId, jobId],
      });
    }
    await tx.commit();
  } catch (err) {
    await tx.rollback().catch(() => {});
    throw err;
  } finally {
    tx.close();
  }
}

async function refresh(job: ReturnType<typeof toJob>): Promise<void> {
  if (job.status === "completed" || job.status === "failed") return;
  if (!job.providerRequestId) {
    // Submission never recorded a request id; only stale ones are given up on.
    if (Date.now() - job.createdAt > 5 * 60 * 1000) {
      await failAndRefund(job.id, "Generation never started.");
    }
    return;
  }
  if (Date.now() - job.createdAt > STALE_MS) {
    await failAndRefund(job.id, "Generation timed out.");
    return;
  }
  const result = await provider().check(job.endpoint, job.providerRequestId, job.params);
  const c = await db();
  if (result.state === "completed") {
    await c.execute({
      sql: `UPDATE jobs SET status = 'completed', outputs = ?, completed_at = ?
            WHERE id = ? AND status IN ('queued', 'running')`,
      args: [JSON.stringify(result.outputs), Date.now(), job.id],
    });
  } else if (result.state === "failed") {
    await failAndRefund(job.id, result.error);
  } else if (result.state !== job.status) {
    await c.execute({
      sql: "UPDATE jobs SET status = ? WHERE id = ? AND status IN ('queued', 'running')",
      args: [result.state, job.id],
    });
  }
}

export async function getJob(userId: string, id: string, { sync = false } = {}): Promise<Job | null> {
  const c = await db();
  const load = async () => {
    const r = await c.execute({ sql: "SELECT * FROM jobs WHERE id = ? AND user_id = ?", args: [id, userId] });
    return r.rows[0] ? toJob(r.rows[0]) : null;
  };
  const job = await load();
  if (!job || !sync || job.status === "completed" || job.status === "failed") return job;
  await refresh(job);
  return load();
}

export async function listJobs(
  userId: string,
  opts: { tool?: Tool; before?: number; limit?: number } = {},
): Promise<Job[]> {
  const c = await db();
  const limit = Math.min(opts.limit ?? 30, 100);
  const where = ["user_id = ?"];
  const args: (string | number)[] = [userId];
  if (opts.tool) {
    where.push("tool = ?");
    args.push(opts.tool);
  }
  if (opts.before) {
    where.push("created_at < ?");
    args.push(opts.before);
  }
  const r = await c.execute({
    sql: `SELECT * FROM jobs WHERE ${where.join(" AND ")} ORDER BY created_at DESC LIMIT ?`,
    args: [...args, limit],
  });
  return r.rows.map(toJob);
}

export async function deleteJob(userId: string, id: string): Promise<boolean> {
  const c = await db();
  const r = await c.execute({
    sql: "DELETE FROM jobs WHERE id = ? AND user_id = ? AND status IN ('completed', 'failed')",
    args: [id, userId],
  });
  return r.rowsAffected === 1;
}
