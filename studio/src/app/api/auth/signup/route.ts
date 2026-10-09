import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { createSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, json } from "@/lib/http";
import { clientIp, rateLimit } from "@/lib/ratelimit";

const Body = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  password: z.string().min(8, "Password must be at least 8 characters.").max(200),
});

export async function POST(req: Request) {
  try {
    if (!rateLimit(`signup:${clientIp(req)}`, 10, 60 * 60 * 1000)) {
      return json({ error: "Too many sign-ups from this network. Try again later." }, 429);
    }
    const { name, email, password } = Body.parse(await req.json());
    const c = await db();
    const id = randomUUID();
    const credits = Math.max(0, parseInt(process.env.SIGNUP_CREDITS ?? "100", 10) || 0);
    const hash = await bcrypt.hash(password, 10);
    const r = await c.execute({
      sql: `INSERT INTO users (id, email, name, password_hash, credits, created_at)
            VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(email) DO NOTHING`,
      args: [id, email, name, hash, credits, Date.now()],
    });
    if (r.rowsAffected !== 1) return json({ error: "An account with that email already exists." }, 409);
    await createSession(id);
    return json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
