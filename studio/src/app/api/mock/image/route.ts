// Placeholder artwork for MOCK mode (no FAL_KEY). Deterministic per seed.
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const seed = url.searchParams.get("seed") ?? "0";
  const label = (url.searchParams.get("label") ?? "").slice(0, 60);
  const [aw, ah] = (url.searchParams.get("aspect") ?? "1:1").split(":").map(Number);
  const ratio = aw > 0 && ah > 0 ? aw / ah : 1;
  const w = ratio >= 1 ? 1024 : Math.round(1024 * ratio);
  const h = ratio >= 1 ? Math.round(1024 / ratio) : 1024;
  const n = hash(seed);
  const h1 = n % 360;
  const h2 = (h1 + 60 + (n >> 8) % 120) % 360;
  const cx = 20 + ((n >> 4) % 60);
  const cy = 20 + ((n >> 12) % 60);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="hsl(${h1} 70% 18%)"/><stop offset="1" stop-color="hsl(${h2} 80% 45%)"/>
    </linearGradient>
    <radialGradient id="r" cx="${cx}%" cy="${cy}%" r="60%">
      <stop offset="0" stop-color="hsl(${h2} 100% 75%)" stop-opacity=".7"/><stop offset="1" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/><rect width="100%" height="100%" fill="url(#r)"/>
  <text x="50%" y="${h - 48}" fill="#fff" fill-opacity=".85" font-family="system-ui,sans-serif" font-size="28" text-anchor="middle">${esc(label)}</text>
  <text x="32" y="56" fill="#fff" fill-opacity=".6" font-family="system-ui,sans-serif" font-size="22" font-weight="700" letter-spacing="4">MOCK PREVIEW</text>
</svg>`;
  return new Response(svg, {
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
