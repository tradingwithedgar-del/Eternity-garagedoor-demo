import "server-only";
import { redirect } from "next/navigation";
import { getUser, type User } from "./auth";

export async function requireUser(next: string): Promise<User> {
  const user = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}
