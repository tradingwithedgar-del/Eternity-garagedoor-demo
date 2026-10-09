import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Studio } from "@/components/Studio";
import type { Tool } from "@/lib/models";
import { requireUser } from "@/lib/session";

const TOOLS: Tool[] = ["video", "image", "edit", "upscale"];
const TITLES: Record<Tool, string> = { video: "Video", image: "Image", edit: "Edit", upscale: "Upscale" };

type Props = {
  params: Promise<{ tool: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tool } = await params;
  return { title: TITLES[tool as Tool] ?? "Create" };
}

const one = (v: string | string[] | undefined) => (typeof v === "string" ? v.slice(0, 2500) : undefined);

export default async function CreatePage({ params, searchParams }: Props) {
  const { tool } = await params;
  if (!TOOLS.includes(tool as Tool)) notFound();
  const sp = await searchParams;
  const qs = new URLSearchParams(Object.entries(sp).flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : []))).toString();
  await requireUser(`/create/${tool}${qs ? `?${qs}` : ""}`);
  const image = one(sp.image);
  return (
    <Studio
      key={tool}
      tool={tool as Tool}
      initial={{
        motion: one(sp.motion),
        style: one(sp.style),
        prompt: one(sp.prompt),
        model: one(sp.model),
        image: image && (image.startsWith("https://") || image.startsWith("/api/")) ? image : undefined,
      }}
    />
  );
}
