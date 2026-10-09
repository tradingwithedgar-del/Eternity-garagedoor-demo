// Model registry. Endpoint IDs and input fields match the fal.ai schemas
// shipped in @fal-ai/client (src/types/endpoints.d.ts). Credit costs are
// yours to set — 1 credit ≈ $0.01 of provider cost before margin.

import { applyMotion, applyStyle, MOTION_PRESETS } from "./presets";

export type Tool = "image" | "video" | "edit" | "upscale";

export type GenParams = {
  prompt: string;
  aspect?: string;
  count?: number;
  duration?: string;
  resolution?: string;
  audio?: boolean;
  motion?: string;
  style?: string;
  /** Start frame for video, or source image for upscale. */
  image?: string;
  /** Reference images for edit. */
  images?: string[];
};

export type ModelDef = {
  id: string;
  tool: Tool;
  label: string;
  vendor: string;
  blurb: string;
  badge?: string;
  aspects: string[];
  durations?: string[];
  resolutions?: string[];
  maxCount?: number;
  audio?: boolean;
  /** Video models: "optional" start frame. */
  startImage?: "optional";
  endpoint(p: GenParams): string;
  input(p: GenParams): Record<string, unknown>;
  cost(p: GenParams): number;
};

const SIZE_ENUM: Record<string, string> = {
  "1:1": "square_hd",
  "16:9": "landscape_16_9",
  "9:16": "portrait_16_9",
  "4:3": "landscape_4_3",
  "3:4": "portrait_4_3",
};

const count = (p: GenParams, max = 4) => Math.min(Math.max(p.count ?? 1, 1), max);
const pick = <T extends string>(v: string | undefined, allowed: T[], fallback: T): T =>
  allowed.includes(v as T) ? (v as T) : fallback;

export const MODELS: ModelDef[] = [
  // ---------- Image ----------
  {
    id: "flux-schnell",
    tool: "image",
    label: "Flux Schnell",
    vendor: "Black Forest Labs",
    blurb: "Drafts in about a second. Best for exploring ideas.",
    badge: "Fast",
    aspects: Object.keys(SIZE_ENUM),
    maxCount: 4,
    endpoint: () => "fal-ai/flux/schnell",
    input: (p) => ({
      prompt: applyStyle(p.prompt, p.style),
      image_size: SIZE_ENUM[pick(p.aspect, Object.keys(SIZE_ENUM), "1:1")],
      num_images: count(p),
      enable_safety_checker: true,
    }),
    cost: (p) => 1 * count(p),
  },
  {
    id: "seedream-4",
    tool: "image",
    label: "Seedream 4",
    vendor: "ByteDance",
    blurb: "Sharp, photoreal stills with strong prompt adherence.",
    aspects: Object.keys(SIZE_ENUM),
    maxCount: 4,
    endpoint: () => "fal-ai/bytedance/seedream/v4/text-to-image",
    input: (p) => ({
      prompt: applyStyle(p.prompt, p.style),
      image_size: SIZE_ENUM[pick(p.aspect, Object.keys(SIZE_ENUM), "1:1")],
      num_images: count(p),
      enable_safety_checker: true,
    }),
    cost: (p) => 4 * count(p),
  },
  {
    id: "flux-ultra",
    tool: "image",
    label: "Flux 1.1 Pro Ultra",
    vendor: "Black Forest Labs",
    blurb: "Up to 4MP output. Great for hero shots and print.",
    aspects: ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3", "21:9"],
    maxCount: 4,
    endpoint: () => "fal-ai/flux-pro/v1.1-ultra",
    input: (p) => ({
      prompt: applyStyle(p.prompt, p.style),
      aspect_ratio: pick(p.aspect, ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3", "21:9"], "1:1"),
      num_images: count(p),
      output_format: "jpeg",
      safety_tolerance: "2",
    }),
    cost: (p) => 7 * count(p),
  },
  {
    id: "nano-banana-pro",
    tool: "image",
    label: "Nano Banana Pro",
    vendor: "Google",
    blurb: "Best-in-class text rendering and scene reasoning.",
    badge: "Top quality",
    aspects: ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3", "21:9", "4:5", "5:4"],
    resolutions: ["1K", "2K", "4K"],
    maxCount: 4,
    endpoint: () => "fal-ai/nano-banana-pro",
    input: (p) => ({
      prompt: applyStyle(p.prompt, p.style),
      aspect_ratio: pick(p.aspect, ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3", "21:9", "4:5", "5:4"], "1:1"),
      resolution: pick(p.resolution, ["1K", "2K", "4K"], "1K"),
      num_images: count(p),
      output_format: "png",
    }),
    cost: (p) => (p.resolution === "4K" ? 30 : 15) * count(p),
  },

  // ---------- Video ----------
  {
    id: "kling-2.5-turbo",
    tool: "video",
    label: "Kling 2.5 Turbo Pro",
    vendor: "Kuaishou",
    blurb: "Fluid, physical motion. Our default for camera moves.",
    badge: "Recommended",
    aspects: ["16:9", "9:16", "1:1"],
    durations: ["5", "10"],
    startImage: "optional",
    endpoint: (p) =>
      p.image
        ? "fal-ai/kling-video/v2.5-turbo/pro/image-to-video"
        : "fal-ai/kling-video/v2.5-turbo/pro/text-to-video",
    input: (p) => {
      const base = {
        prompt: applyMotion(p.prompt, p.motion),
        duration: pick(p.duration, ["5", "10"], "5"),
        negative_prompt: "blur, distort, and low quality",
        cfg_scale: 0.5,
      };
      return p.image
        ? { ...base, image_url: p.image }
        : { ...base, aspect_ratio: pick(p.aspect, ["16:9", "9:16", "1:1"], "16:9") };
    },
    cost: (p) => (p.duration === "10" ? 70 : 35),
  },
  {
    id: "veo-3.1-fast",
    tool: "video",
    label: "Veo 3.1 Fast",
    vendor: "Google",
    blurb: "Native sound: dialogue, ambience and effects.",
    badge: "Audio",
    aspects: ["16:9", "9:16"],
    durations: ["4s", "6s", "8s"],
    resolutions: ["720p", "1080p"],
    audio: true,
    startImage: "optional",
    endpoint: (p) => (p.image ? "fal-ai/veo3.1/fast/image-to-video" : "fal-ai/veo3.1/fast"),
    input: (p) => {
      const base = {
        prompt: applyMotion(p.prompt, p.motion),
        duration: pick(p.duration, ["4s", "6s", "8s"], "8s"),
        resolution: pick(p.resolution, ["720p", "1080p"], "720p"),
        generate_audio: p.audio !== false,
      };
      return p.image
        ? { ...base, image_url: p.image, aspect_ratio: "auto" }
        : { ...base, aspect_ratio: pick(p.aspect, ["16:9", "9:16"], "16:9") };
    },
    cost: (p) => parseInt(pick(p.duration, ["4s", "6s", "8s"], "8s"), 10) * (p.audio !== false ? 15 : 10),
  },
  {
    id: "seedance-pro",
    tool: "video",
    label: "Seedance 1 Pro",
    vendor: "ByteDance",
    blurb: "Multi-shot storytelling, any aspect ratio, up to 12s.",
    aspects: ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"],
    durations: ["3", "5", "8", "10", "12"],
    resolutions: ["480p", "720p", "1080p"],
    startImage: "optional",
    endpoint: (p) =>
      p.image
        ? "fal-ai/bytedance/seedance/v1/pro/image-to-video"
        : "fal-ai/bytedance/seedance/v1/pro/text-to-video",
    input: (p) => ({
      prompt: applyMotion(p.prompt, p.motion),
      duration: pick(p.duration, ["3", "5", "8", "10", "12"], "5"),
      resolution: pick(p.resolution, ["480p", "720p", "1080p"], "1080p"),
      camera_fixed: MOTION_PRESETS.find((m) => m.id === p.motion)?.static === true,
      enable_safety_checker: true,
      ...(p.image
        ? { image_url: p.image, aspect_ratio: "auto" }
        : { aspect_ratio: pick(p.aspect, ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"], "16:9") }),
    }),
    cost: (p) => {
      const perSec = { "480p": 3, "720p": 6, "1080p": 13 }[pick(p.resolution, ["480p", "720p", "1080p"], "1080p")];
      return perSec * parseInt(pick(p.duration, ["3", "5", "8", "10", "12"], "5"), 10);
    },
  },
  {
    id: "hailuo-02",
    tool: "video",
    label: "Hailuo 02",
    vendor: "MiniMax",
    blurb: "Strong physics and action at a budget price.",
    badge: "Value",
    aspects: ["16:9"],
    durations: ["6", "10"],
    startImage: "optional",
    endpoint: (p) =>
      p.image
        ? "fal-ai/minimax/hailuo-02/standard/image-to-video"
        : "fal-ai/minimax/hailuo-02/standard/text-to-video",
    input: (p) => ({
      prompt: applyMotion(p.prompt, p.motion),
      duration: pick(p.duration, ["6", "10"], "6"),
      prompt_optimizer: true,
      ...(p.image ? { image_url: p.image, resolution: "768P" } : {}),
    }),
    cost: (p) => (p.duration === "10" ? 45 : 27),
  },

  // ---------- Edit ----------
  {
    id: "nano-banana-edit",
    tool: "edit",
    label: "Nano Banana Edit",
    vendor: "Google",
    blurb: "Describe the change. Keeps faces and products consistent.",
    badge: "Fast",
    aspects: ["auto", "1:1", "16:9", "9:16", "4:3", "3:4"],
    maxCount: 4,
    endpoint: () => "fal-ai/nano-banana/edit",
    input: (p) => ({
      prompt: p.prompt,
      image_urls: p.images ?? [],
      aspect_ratio: pick(p.aspect, ["auto", "1:1", "16:9", "9:16", "4:3", "3:4"], "auto"),
      num_images: count(p),
      output_format: "png",
    }),
    cost: (p) => 4 * count(p),
  },
  {
    id: "nano-banana-pro-edit",
    tool: "edit",
    label: "Nano Banana Pro Edit",
    vendor: "Google",
    blurb: "Highest fidelity edits, up to 4K, multi-image compositing.",
    badge: "Top quality",
    aspects: ["auto", "1:1", "16:9", "9:16", "4:3", "3:4"],
    resolutions: ["1K", "2K", "4K"],
    maxCount: 4,
    endpoint: () => "fal-ai/nano-banana-pro/edit",
    input: (p) => ({
      prompt: p.prompt,
      image_urls: p.images ?? [],
      aspect_ratio: pick(p.aspect, ["auto", "1:1", "16:9", "9:16", "4:3", "3:4"], "auto"),
      resolution: pick(p.resolution, ["1K", "2K", "4K"], "1K"),
      num_images: count(p),
      output_format: "png",
    }),
    cost: (p) => (p.resolution === "4K" ? 30 : 15) * count(p),
  },

  // ---------- Upscale ----------
  {
    id: "seedvr-upscale",
    tool: "upscale",
    label: "SeedVR2 Upscale",
    vendor: "ByteDance",
    blurb: "Restores detail and sharpens up to 4K.",
    aspects: [],
    resolutions: ["1080p", "1440p", "2160p"],
    endpoint: () => "fal-ai/seedvr/upscale/image",
    input: (p) => ({
      image_url: p.image,
      upscale_mode: "target",
      target_resolution: pick(p.resolution, ["1080p", "1440p", "2160p"], "2160p"),
      output_format: "png",
    }),
    cost: () => 5,
  },
];

export function getModel(id: string): ModelDef | undefined {
  return MODELS.find((m) => m.id === id);
}

export function modelsFor(tool: Tool): ModelDef[] {
  return MODELS.filter((m) => m.tool === tool);
}
