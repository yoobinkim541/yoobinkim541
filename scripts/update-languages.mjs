// Usage: node scripts/update-languages.mjs [output path]
// Sums GitHub's language bytes over the user's own (non-fork) repositories and
// writes a navy donut card to assets/github-languages.svg.
// GITHUB_TOKEN reads public repositories. Set PROFILE_LANGUAGES_TOKEN (a token
// that can read the owner's private repositories) to include those too.
import { readFileSync, writeFileSync } from "node:fs";

const USER = process.env.GITHUB_USER ?? "yoobinkim541";
const OUT = process.argv[2] ?? new URL("../assets/github-languages.svg", import.meta.url);
const TOP = 8;
const PALETTE = ["#4ea8ff", "#2f81f7", "#9fd0ff", "#1d5fc2", "#62d2ff", "#5b7fd6", "#c9e4ff", "#3a6596"];

const privateToken = process.env.PROFILE_LANGUAGES_TOKEN;
const token = privateToken || process.env.GITHUB_TOKEN;
const api = async (url) => {
  const headers = { Accept: "application/vnd.github+json", "User-Agent": "profile-languages-card" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
};

const repos = [];
for (let page = 1; ; page++) {
  const batch = await api(
    privateToken
      ? `https://api.github.com/user/repos?affiliation=owner&per_page=100&page=${page}`
      : `https://api.github.com/users/${USER}/repos?type=owner&per_page=100&page=${page}`,
  );
  repos.push(...batch);
  if (batch.length < 100) break;
}
const own = repos.filter((r) => !r.fork && r.owner.login.toLowerCase() === USER.toLowerCase());
const totals = new Map();
for (const r of own)
  for (const [lang, bytes] of Object.entries(await api(r.languages_url)))
    totals.set(lang, (totals.get(lang) ?? 0) + bytes);
const sum = [...totals.values()].reduce((a, b) => a + b, 0);
if (!sum) throw new Error("no language data; keeping the existing card");

const ranked = [...totals].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
const shown = ranked.length > TOP ? [...ranked.slice(0, TOP - 1), ["Other", ranked.slice(TOP - 1).reduce((a, [, b]) => a + b, 0)]] : ranked;

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const pct = (b) => (b / sum) * 100;
const font = "'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif";
const W = 860, H = 340, CX = 180, CY = 170, R = 108, SW = 34;
const C = 2 * Math.PI * R;

let offset = 0;
let arcs = "";
for (const [i, [, bytes]] of shown.entries()) {
  const len = (bytes / sum) * C;
  const gap = shown.length > 1 ? Math.min(2, len / 3) : 0;
  arcs += `    <circle cx="${CX}" cy="${CY}" r="${R}" stroke="${PALETTE[i]}" stroke-width="${SW}" stroke-dasharray="${(len - gap).toFixed(2)} ${(C - len + gap).toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}"/>\n`;
  offset += len;
}

let legend = "";
for (const [i, [lang, bytes]] of shown.entries()) {
  const col = Math.floor(i / 4), row = i % 4;
  const x = 370 + col * 240, y = 136 + row * 46;
  const size = lang.length > 12 ? 15 : 18;
  legend += `  <circle cx="${x + 7}" cy="${y - 6}" r="7" fill="${PALETTE[i]}"/>\n`;
  legend += `  <text x="${x + 24}" y="${y}" font-size="${size}" fill="#e6f1ff">${esc(lang)}</text>\n`;
  legend += `  <text x="${x + 212}" y="${y}" font-size="17" fill="#a8d4ff" text-anchor="end">${pct(bytes).toFixed(1)}%</text>\n`;
}

const scope = privateToken ? "public + private" : "public";
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none" role="img" aria-label="Most used languages: ${esc(shown.map(([l, b]) => `${l} ${pct(b).toFixed(1)}%`).join(", "))}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0b1f3a"/>
      <stop offset="1" stop-color="#102f59"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#4ea8ff" stop-opacity="0.28"/>
      <stop offset="1" stop-color="#4ea8ff" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="rule" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#4ea8ff"/>
      <stop offset="1" stop-color="#4ea8ff" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" rx="20" fill="url(#bg)"/>
  <rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="19" stroke="#2f81f7" stroke-opacity="0.45" stroke-width="2"/>
  <circle cx="${CX}" cy="${CY}" r="150" fill="url(#glow)"/>
  <circle cx="${CX}" cy="${CY}" r="${R}" stroke="#17396a" stroke-width="${SW}"/>
  <g transform="rotate(-90 ${CX} ${CY})">
${arcs}  </g>
  <circle cx="${CX}" cy="${CY}" r="${R - SW / 2 - 8}" stroke="#4ea8ff" stroke-opacity="0.25" stroke-dasharray="2 6"/>
  <g font-family="${font}">
  <text x="${CX}" y="${CY - 4}" font-size="34" font-weight="700" fill="#e6f1ff" text-anchor="middle">${own.length}</text>
  <text x="${CX}" y="${CY + 22}" font-size="14" fill="#8fb3d9" text-anchor="middle" letter-spacing="1">REPOSITORIES</text>
  <text x="370" y="62" font-size="28" font-weight="700" fill="#e6f1ff">Most Used Languages</text>
  <rect x="370" y="78" width="440" height="4" rx="2" fill="url(#rule)"/>
${legend}  <text x="${W - 30}" y="${H - 22}" font-size="12" fill="#5f86b3" text-anchor="end">by bytes · ${scope} repositories · forks excluded</text>
  </g>
</svg>
`;

let prev = "";
try { prev = readFileSync(OUT, "utf8"); } catch {}
if (prev === svg) console.log("languages card unchanged");
else {
  writeFileSync(OUT, svg);
  console.log(`wrote languages card: ${shown.map(([l, b]) => `${l} ${pct(b).toFixed(1)}%`).join(", ")}`);
}
