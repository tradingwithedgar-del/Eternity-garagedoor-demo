import bcrypt from "bcryptjs";
import { z } from "zod";
import { createSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, json } from "@/lib/http";
import { clientIp, rateLimit } from "@/lib/ratelimit";

const Body = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  password: z.string().min(1, "Enter your password.").max(200),
});

// Compared against when the email is unknown, so timing doesn't reveal accounts.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

export async function POST(req: Request) {
  try {
    if (!rateLimit(`login:${clientIp(req)}`, 20, 15 * 60 * 1000)) {
      return json({ error: "Too many attempts. Wait a few minutes and try again." }, 429);
    }
    const { email, password } = Body.parse(await req.json());
    const c = await db();
    const r = await c.execute({ sql: "SELECT id, password_hash FROM users WHERE email = ?", args: [email] });
    const row = r.rows[0];
    const ok = await bcrypt.compare(password, row ? String(row.password_hash) : DUMMY_HASH);
    if (!row || !ok) return json({ error: "Wrong email or password." }, 401);
    await createSession(String(row.id));
    return json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
