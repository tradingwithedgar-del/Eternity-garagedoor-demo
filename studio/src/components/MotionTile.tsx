import type { MotionPreset } from "@/lib/presets";

/** Animated illustration of a camera move. Pure CSS, no media files. */
export function MotionScene({ anim }: { anim: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className={`scene ${anim}`}>
        <div className="scene-sky" />
        <div className="scene-sun" />
        <div className="scene-hill-back" />
        <div className="scene-hill-front" />
        <div className="scene-subject" />
      </div>
    </div>
  );
}

export function MotionTile({ preset, selected = false }: { preset: MotionPreset; selected?: boolean }) {
  return (
    <div
      className={`group relative aspect-[4/5] overflow-hidden rounded-xl border transition ${
        selected ? "border-accent ring-2 ring-accent/40" : "border-line hover:border-muted"
      }`}
    >
      <MotionScene anim={preset.anim} />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-3 pt-10">
        <div className="text-sm font-semibold">{preset.name}</div>
        <div className="line-clamp-2 text-xs text-white/70">{preset.description}</div>
      </div>
    </div>
  );
}
