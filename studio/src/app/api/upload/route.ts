import { getUser } from "@/lib/auth";
import { errorResponse, json } from "@/lib/http";
import { provider } from "@/lib/provider";
import { clientIp, rateLimit } from "@/lib/ratelimit";

const MAX_BYTES = 10 * 1024 * 1024;
const TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export async function POST(req: Request) {
  try {
    const user = await getUser();
    if (!user) return json({ error: "Sign in to upload." }, 401);
    if (!rateLimit(`upload:${user.id}:${clientIp(req)}`, 40, 60 * 1000)) {
      return json({ error: "Too many uploads. Wait a minute." }, 429);
    }
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return json({ error: "No file received." }, 400);
    if (!TYPES.has(file.type)) return json({ error: "Use a PNG, JPEG or WebP image." }, 400);
    if (file.size > MAX_BYTES) return json({ error: "Images must be under 10 MB." }, 400);
    const url = await provider().upload(file);
    return json({ url });
  } catch (err) {
    return errorResponse(err);
  }
}
