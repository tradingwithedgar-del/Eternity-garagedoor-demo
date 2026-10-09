import { z } from "zod";
import { getUser } from "@/lib/auth";
import { errorResponse, json } from "@/lib/http";
import { createJob, publicJob } from "@/lib/jobs";
import { clientIp, rateLimit } from "@/lib/ratelimit";

const mediaUrl = z
  .string()
  .max(2048)
  .refine(
    (u) => u.startsWith("https://") || u.startsWith("/api/uploads/") || u.startsWith("/api/mock/"),
    "Invalid image URL.",
  );

const Body = z.object({
  tool: z.enum(["image", "video", "edit", "upscale"]),
  model: z.string().max(64),
  params: z.object({
    prompt: z.string().max(2500, "Prompt is too long (2500 characters max).").default(""),
    aspect: z.string().max(10).optional(),
    count: z.number().int().min(1).max(4).optional(),
    duration: z.string().max(10).optional(),
    resolution: z.string().max(10).optional(),
    audio: z.boolean().optional(),
    motion: z.string().max(40).optional(),
    style: z.string().max(40).optional(),
    image: mediaUrl.optional(),
    images: z.array(mediaUrl).max(4).optional(),
  }),
});

export async function POST(req: Request) {
  try {
    const user = await getUser();
    if (!user) return json({ error: "Sign in to generate." }, 401);
    if (!rateLimit(`gen:${user.id}:${clientIp(req)}`, 30, 60 * 1000)) {
      return json({ error: "You're generating very fast. Give it a minute." }, 429);
    }
    const body = Body.parse(await req.json());
    const job = await createJob(user.id, body.tool, body.model, body.params);
    return json({ job: publicJob(job) }, 201);
  } catch (err) {
    return errorResponse(err);
  }
}
