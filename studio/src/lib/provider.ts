import "server-only";
import { fal, ApiError, ValidationError } from "@fal-ai/client";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { GenParams } from "./models";

export type Output = { type: "image" | "video"; url: string; width?: number; height?: number };

export type CheckResult =
  | { state: "queued" | "running" }
  | { state: "completed"; outputs: Output[] }
  | { state: "failed"; error: string };

export type Provider = {
  name: "fal" | "mock";
  submit(endpoint: string, input: Record<string, unknown>): Promise<string>;
  check(endpoint: string, requestId: string, params: GenParams): Promise<CheckResult>;
  upload(file: File): Promise<string>;
};

export const isMock = () => !process.env.FAL_KEY;

// ---------------------------------------------------------------- fal.ai

let configured = false;
function client() {
  if (!configured) {
    fal.config({ credentials: process.env.FAL_KEY });
    configured = true;
  }
  return fal;
}

function errorMessage(err: unknown): string {
  if (err instanceof ValidationError) {
    const first = err.fieldErrors?.[0];
    if (first) return `Invalid input (${first.loc?.slice(1).join(".") || "request"}): ${first.msg}`;
  }
  if (err instanceof ApiError) {
    const body = err.body as { detail?: unknown } | undefined;
    if (typeof body?.detail === "string") return body.detail;
    if (Array.isArray(body?.detail) && body.detail[0]?.msg) return String(body.detail[0].msg);
    return err.message || `Provider error (HTTP ${err.status})`;
  }
  return err instanceof Error ? err.message : "Unknown provider error";
}

export function extractOutputs(data: unknown): Output[] {
  const d = (data ?? {}) as {
    video?: { url?: string };
    image?: { url?: string; width?: number; height?: number };
    images?: { url?: string; width?: number; height?: number }[];
  };
  if (d.video?.url) return [{ type: "video", url: d.video.url }];
  if (Array.isArray(d.images)) {
    return d.images
      .filter((i) => typeof i?.url === "string")
      .map((i) => ({ type: "image", url: i.url!, width: i.width, height: i.height }));
  }
  if (d.image?.url) return [{ type: "image", url: d.image.url, width: d.image.width, height: d.image.height }];
  return [];
}

const falProvider: Provider = {
  name: "fal",
  async submit(endpoint, input) {
    try {
      const { request_id } = await client().queue.submit(endpoint, { input });
      return request_id;
    } catch (err) {
      throw new Error(errorMessage(err));
    }
  },
  async check(endpoint, requestId) {
    let status;
    try {
      status = await client().queue.status(endpoint, { requestId });
    } catch (err) {
      // A 4xx here means the request is unknown to fal; anything else is
      // treated as transient and retried on the next poll.
      if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
        return { state: "failed", error: errorMessage(err) };
      }
      return { state: "running" };
    }
    if (status.status === "IN_QUEUE") return { state: "queued" };
    if (status.status === "IN_PROGRESS") return { state: "running" };
    try {
      const result = await client().queue.result(endpoint, { requestId });
      const outputs = extractOutputs(result.data);
      if (outputs.length === 0) return { state: "failed", error: "The model returned no media." };
      return { state: "completed", outputs };
    } catch (err) {
      if (err instanceof ApiError) return { state: "failed", error: errorMessage(err) };
      return { state: "running" };
    }
  },
  async upload(file) {
    try {
      return await client().storage.upload(file);
    } catch (err) {
      throw new Error(errorMessage(err));
    }
  },
};

// ---------------------------------------------------------------- mock

const MOCK_SECONDS = 5;
export const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");

const VIDEO_ASPECTS: Record<string, string> = { "16:9": "16x9", "9:16": "9x16", "1:1": "1x1" };

const mockProvider: Provider = {
  name: "mock",
  async submit() {
    return `mock_${Date.now()}_${randomUUID().slice(0, 8)}`;
  },
  async check(endpoint, requestId, params) {
    const started = Number(requestId.split("_")[1]);
    const elapsed = (Date.now() - started) / 1000;
    if (elapsed < 1.5) return { state: "queued" };
    if (elapsed < MOCK_SECONDS) return { state: "running" };
    if (/fail/i.test(params.prompt)) {
      return { state: "failed", error: "Mock failure (your prompt contained the word “fail”)." };
    }
    const seed = requestId.split("_")[2];
    if (endpoint.includes("video") || endpoint.includes("veo") || endpoint.includes("hailuo")) {
      const a = VIDEO_ASPECTS[params.aspect ?? ""] ?? "16x9";
      return { state: "completed", outputs: [{ type: "video", url: `/mock/video-${a}.mp4` }] };
    }
    if (endpoint.includes("upscale")) {
      return { state: "completed", outputs: [{ type: "image", url: params.image ?? "" }] };
    }
    const n = Math.min(Math.max(params.count ?? 1, 1), 4);
    const aspect = params.aspect && params.aspect !== "auto" ? params.aspect : "1:1";
    return {
      state: "completed",
      outputs: Array.from({ length: n }, (_, i) => ({
        type: "image" as const,
        url: `/api/mock/image?seed=${seed}${i}&aspect=${encodeURIComponent(aspect)}&label=${encodeURIComponent(params.prompt.slice(0, 60))}`,
      })),
    };
  },
  async upload(file) {
    const ext = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" }[file.type] ?? "bin";
    const name = `${randomUUID()}.${ext}`;
    await mkdir(UPLOAD_DIR, { recursive: true });
    await writeFile(path.join(UPLOAD_DIR, name), Buffer.from(await file.arrayBuffer()));
    return `/api/uploads/${name}`;
  },
};

export function provider(): Provider {
  return isMock() ? mockProvider : falProvider;
}
