import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { UserError } from "./jobs";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function errorResponse(err: unknown) {
  if (err instanceof UserError) return json({ error: err.message }, err.status);
  if (err instanceof ZodError) return json({ error: err.issues[0]?.message ?? "Invalid request." }, 400);
  console.error(err);
  return json({ error: "Something went wrong. Please try again." }, 500);
}
