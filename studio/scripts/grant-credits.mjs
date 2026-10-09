// Usage: npm run grant-credits -- someone@example.com 500
// Reads DATABASE_URL / DATABASE_AUTH_TOKEN from the environment (or .env.local via --env-file).
import { createClient } from "@libsql/client";

const [email, amountArg] = process.argv.slice(2);
const amount = parseInt(amountArg, 10);
if (!email || !Number.isInteger(amount) || amount === 0) {
  console.error("Usage: npm run grant-credits -- <email> <amount>   (negative amount removes credits)");
  process.exit(1);
}
const c = createClient({
  url: process.env.DATABASE_URL || "file:./data/app.db",
  authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
});
const r = await c.execute({
  sql: "UPDATE users SET credits = MAX(0, credits + ?) WHERE email = ? RETURNING credits",
  args: [amount, email.trim().toLowerCase()],
});
if (!r.rows[0]) {
  console.error(`No account with email ${email}`);
  process.exit(1);
}
console.log(`${email} now has ${r.rows[0].credits} credits`);
