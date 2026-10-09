import { getUser } from "@/lib/auth";
import { json } from "@/lib/http";
import { isMock } from "@/lib/provider";

export async function GET() {
  const user = await getUser();
  if (!user) return json({ error: "Not signed in." }, 401);
  return json({ user, mock: isMock() });
}
