// Camera-motion and style presets. Each one appends cinematography language
// to the user's prompt so every video model understands the move.

export type MotionPreset = {
  id: string;
  name: string;
  category: "Push & pull" | "Orbit & arc" | "Vertical" | "Dynamic" | "Stylized";
  description: string;
  prompt: string;
  /** CSS animation class used for the preview tile. */
  anim: string;
  static?: boolean;
};

export const MOTION_PRESETS: MotionPreset[] = [
  { id: "static", name: "Locked Off", category: "Stylized", description: "Tripod shot, no camera movement.", prompt: "static locked-off tripod shot, the camera does not move", anim: "anim-static", static: true },
  { id: "dolly-in", name: "Dolly In", category: "Push & pull", description: "Smooth push toward the subject.", prompt: "slow smooth dolly-in pushing toward the subject", anim: "anim-dolly-in" },
  { id: "dolly-out", name: "Dolly Out", category: "Push & pull", description: "Pull back to reveal the scene.", prompt: "smooth dolly-out pulling back to reveal the wider scene", anim: "anim-dolly-out" },
  { id: "crash-zoom", name: "Crash Zoom", category: "Push & pull", description: "Sudden, punchy zoom into the subject.", prompt: "sudden fast crash zoom into the subject", anim: "anim-crash-zoom" },
  { id: "vertigo", name: "Vertigo", category: "Push & pull", description: "Dolly zoom: background warps, subject holds.", prompt: "dolly zoom vertigo effect, the subject stays the same size while the background stretches", anim: "anim-vertigo" },
  { id: "orbit", name: "360 Orbit", category: "Orbit & arc", description: "Full circle around the subject.", prompt: "camera orbits 360 degrees around the subject", anim: "anim-orbit" },
  { id: "arc-left", name: "Arc Left", category: "Orbit & arc", description: "Half-circle sweep to the left.", prompt: "camera arcs to the left around the subject", anim: "anim-arc-left" },
  { id: "arc-right", name: "Arc Right", category: "Orbit & arc", description: "Half-circle sweep to the right.", prompt: "camera arcs to the right around the subject", anim: "anim-arc-right" },
  { id: "truck-left", name: "Truck Left", category: "Orbit & arc", description: "Slide sideways, parallel to the action.", prompt: "camera trucks left, sliding sideways parallel to the subject", anim: "anim-truck-left" },
  { id: "crane-up", name: "Crane Up", category: "Vertical", description: "Rise up and over the scene.", prompt: "crane shot rising upward over the scene", anim: "anim-crane-up" },
  { id: "crane-down", name: "Crane Down", category: "Vertical", description: "Descend into the scene.", prompt: "crane shot descending down into the scene", anim: "anim-crane-down" },
  { id: "tilt-up", name: "Tilt Up", category: "Vertical", description: "Pivot upward to reveal height.", prompt: "camera tilts up to reveal the full height", anim: "anim-tilt-up" },
  { id: "top-down", name: "Overhead", category: "Vertical", description: "Bird's-eye view looking straight down.", prompt: "overhead top-down bird's-eye view, slowly rotating", anim: "anim-top-down" },
  { id: "fpv", name: "FPV Drone", category: "Dynamic", description: "Fast, swooping drone flight.", prompt: "fast FPV drone shot swooping and diving through the scene", anim: "anim-fpv" },
  { id: "whip-pan", name: "Whip Pan", category: "Dynamic", description: "Blurred snap pan to the next subject.", prompt: "rapid whip pan with motion blur", anim: "anim-whip-pan" },
  { id: "handheld", name: "Handheld", category: "Dynamic", description: "Documentary-style natural shake.", prompt: "handheld camera with natural documentary shake", anim: "anim-handheld" },
  { id: "bullet-time", name: "Bullet Time", category: "Stylized", description: "Frozen moment while the camera circles.", prompt: "bullet time, time freezes while the camera sweeps around the subject", anim: "anim-orbit" },
  { id: "hyperlapse", name: "Hyperlapse", category: "Stylized", description: "Time-compressed forward travel.", prompt: "hyperlapse moving forward, time-compressed motion", anim: "anim-hyperlapse" },
  { id: "snorricam", name: "Body Mount", category: "Stylized", description: "Camera locked to the subject's body.", prompt: "body-mounted snorricam shot, the subject stays fixed in frame while the world moves around them", anim: "anim-handheld" },
  { id: "low-angle", name: "Hero Low Angle", category: "Stylized", description: "Low push-in that makes the subject loom.", prompt: "low-angle hero shot slowly pushing in", anim: "anim-dolly-in" },
];

export function applyMotion(prompt: string, motionId?: string): string {
  const m = MOTION_PRESETS.find((x) => x.id === motionId);
  return m ? `${prompt.trim()}. Camera: ${m.prompt}.` : prompt.trim();
}

export type StylePreset = { id: string; name: string; prompt: string; swatch: string };

export const STYLE_PRESETS: StylePreset[] = [
  { id: "cinematic", name: "Cinematic", prompt: "cinematic film still, anamorphic lens, dramatic lighting, shallow depth of field", swatch: "linear-gradient(135deg,#0f172a,#b45309)" },
  { id: "film-35mm", name: "35mm Film", prompt: "shot on 35mm film, natural grain, warm tones, candid", swatch: "linear-gradient(135deg,#7c2d12,#fbbf24)" },
  { id: "noir", name: "Noir", prompt: "black and white film noir, hard shadows, high contrast", swatch: "linear-gradient(135deg,#000,#9ca3af)" },
  { id: "product", name: "Product", prompt: "premium studio product photography, softbox lighting, clean seamless background", swatch: "linear-gradient(135deg,#e5e7eb,#ffffff)" },
  { id: "editorial", name: "Editorial", prompt: "high-fashion editorial photograph, magazine cover lighting", swatch: "linear-gradient(135deg,#831843,#f9a8d4)" },
  { id: "anime", name: "Anime", prompt: "anime key visual, clean cel shading, vibrant colors", swatch: "linear-gradient(135deg,#1d4ed8,#f472b6)" },
  { id: "3d", name: "3D Render", prompt: "stylized 3D render, soft global illumination, octane", swatch: "linear-gradient(135deg,#4c1d95,#22d3ee)" },
  { id: "neon", name: "Neon Night", prompt: "neon-lit city at night, rain reflections, cyberpunk color palette", swatch: "linear-gradient(135deg,#312e81,#ec4899)" },
  { id: "watercolor", name: "Watercolor", prompt: "loose watercolor painting, paper texture, soft bleeding edges", swatch: "linear-gradient(135deg,#bae6fd,#fde68a)" },
];

export function applyStyle(prompt: string, styleId?: string): string {
  const s = STYLE_PRESETS.find((x) => x.id === styleId);
  return s ? `${prompt.trim()}, ${s.prompt}` : prompt.trim();
}
