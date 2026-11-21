// Usage: node scripts/build-tools-svg.mjs
// Writes assets/engineering-tools.svg: a navy card of skill icons grouped by
// category. Icons come from skillicons.dev (tandpfun/skill-icons, MIT); the
// default dark tile colour is swapped for the profile navy and every id is
// prefixed so the inlined icons cannot collide.
import { writeFileSync } from "node:fs";

const GROUPS = [
  ["Languages", ["c", "cpp", "py", "java", "kotlin", "js", "ts", "rust"]],
  ["Robotics & Systems", ["ros", "opencv", "linux", "ubuntu", "bash", "matlab"]],
  ["Web & App", ["react", "vue", "nextjs", "astro", "vite", "tauri", "nodejs", "supabase", "firebase"]],
  ["Tools & DevOps", ["git", "github", "githubactions", "docker", "figma"]],
];
const W = 854, PAD = 32, LABEL = 196, ICON = 52, GAP = 14, ROW = 76, TOP = 92;
const H = TOP + GROUPS.length * ROW + 10;
const TILE = "#242938", NAVY = "#17396a";

const font = "'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif";

async function icon(id) {
  const res = await fetch(`https://skillicons.dev/icons?i=${id}`);
  if (!res.ok) throw new Error(`${res.status} ${id}`);
  const src = await res.text();
  // The API wraps each icon in an outer 48px <svg>; keep the inner 256px one.
  const inner = src.match(/<g transform="translate\(0, 0\)">\s*(<svg[\s\S]*<\/svg>)\s*<\/g>/);
  if (!inner) throw new Error(`unexpected icon markup for ${id}`);
  return inner[1]
    .replaceAll(TILE, NAVY)
    .replace(/\bid="([^"]+)"/g, `id="${id}-$1"`)
    .replace(/url\(#([^)]+)\)/g, `url(#${id}-$1)`)
    .replace(/href="#([^"]+)"/g, `href="#${id}-$1"`);
}

let body = "";
for (const [g, [label, ids]] of GROUPS.entries()) {
  const y = TOP + g * ROW;
  body += `  <text x="${PAD}" y="${y + ICON / 2 + 6}" font-family="${font}" font-size="16" font-weight="600" fill="#a8d4ff">${label.replace("&", "&amp;")}</text>\n`;
  body += `  <rect x="${PAD}" y="${y + ICON / 2 + 16}" width="28" height="2" rx="1" fill="#4ea8ff"/>\n`;
  for (const [i, id] of ids.entries()) {
    const x = PAD + LABEL + i * (ICON + GAP);
    const svg = (await icon(id)).replace("<svg", `<svg x="${x}" y="${y}" width="${ICON}" height="${ICON}"`).replace(/ width="256" height="256"/, "");
    body += `  <g><title>${id}</title>${svg}</g>\n`;
  }
  if (g < GROUPS.length - 1)
    body += `  <path d="M${PAD} ${y + ROW - 12}H${W - PAD}" stroke="#4ea8ff" stroke-opacity="0.12"/>\n`;
}

const out = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none" role="img" aria-label="Engineering and coding tools">
  <defs>
    <linearGradient id="card-bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0b1f3a"/>
      <stop offset="1" stop-color="#102f59"/>
    </linearGradient>
    <linearGradient id="card-rule" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#4ea8ff"/>
      <stop offset="1" stop-color="#4ea8ff" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" rx="20" fill="url(#card-bg)"/>
  <rect x="0.75" y="0.75" width="${W - 1.5}" height="${H - 1.5}" rx="19.25" stroke="#2f81f7" stroke-opacity="0.45" stroke-width="1.5"/>
  <text x="${PAD}" y="50" font-family="${font}" font-size="24" font-weight="700" fill="#e6f1ff">Engineering &amp; Coding Tools</text>
  <rect x="${PAD}" y="62" width="260" height="3" rx="1.5" fill="url(#card-rule)"/>
${body}</svg>
`;
writeFileSync(new URL("../assets/engineering-tools.svg", import.meta.url), out);
console.log(`wrote assets/engineering-tools.svg (${GROUPS.flatMap((g) => g[1]).length} icons)`);
