// Usage: node scripts/build-arm-svg.mjs
// Writes assets/robot-arm.svg: a two-link arm whose pen tip traces a
// lemniscate. Joint angles come from inverse kinematics at evenly spaced
// arc-length samples, so the SMIL rotation keyframes and the stroke reveal
// stay in sync.
import { writeFileSync } from "node:fs";

const W = 240, H = 240;
const BASE = { x: 120, y: 208 };
const L1 = 92, L2 = 80;
const CYCLE = 9; // seconds per loop
const DRAW = 0.78; // share of the cycle spent drawing
const N = 160;

const curve = (t) => ({ x: 120 + 64 * Math.sin(t), y: 88 + 56 * Math.sin(t) * Math.cos(t) });

const dense = Array.from({ length: 4001 }, (_, i) => curve((i / 4000) * 2 * Math.PI));
const acc = [0];
for (let i = 1; i < dense.length; i++)
  acc.push(acc[i - 1] + Math.hypot(dense[i].x - dense[i - 1].x, dense[i].y - dense[i - 1].y));
const total = acc.at(-1);
const pts = [];
for (let k = 0, j = 0; k <= N; k++) {
  const target = (k / N) * total;
  while (j < acc.length - 2 && acc[j + 1] < target) j++;
  const f = (target - acc[j]) / (acc[j + 1] - acc[j] || 1);
  pts.push({ x: dense[j].x + f * (dense[j + 1].x - dense[j].x), y: dense[j].y + f * (dense[j + 1].y - dense[j].y) });
}

const deg = (r) => (r * 180) / Math.PI;
const ik = ({ x, y }) => {
  const dx = x - BASE.x, dy = y - BASE.y;
  const c2 = (dx * dx + dy * dy - L1 * L1 - L2 * L2) / (2 * L1 * L2);
  const q2 = -Math.acos(Math.max(-1, Math.min(1, c2))); // elbow on the right, above the paper
  const q1 = Math.atan2(dy, dx) - Math.atan2(L2 * Math.sin(q2), L1 + L2 * Math.cos(q2));
  return [deg(q1), deg(q2)];
};
const unwrap = (xs) => xs.reduce((out, v) => {
  let a = v;
  if (out.length) while (a - out.at(-1) > 180) a -= 360;
  if (out.length) while (a - out.at(-1) < -180) a += 360;
  return [...out, a];
}, []);
const angles = pts.map(ik);
const q1 = unwrap(angles.map((a) => a[0]));
const q2 = unwrap(angles.map((a) => a[1]));

const r = (v) => Math.round(v * 100) / 100;
// keyTimes step is DRAW / N ≈ 0.005, so 2-decimal rounding would collapse neighbours.
const times = [...pts.map((_, k) => Math.round((k / N) * DRAW * 1e4) / 1e4), 1].join(";");
const rot = (qs, cx, cy) => [...qs, qs.at(-1)].map((q) => `${r(q)} ${cx} ${cy}`).join(";");
const path = `M${pts.map((p) => `${r(p.x)} ${r(p.y)}`).join(" L")}`;
const len = Math.ceil(total);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Two-link robot arm drawing an infinity curve">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0f2b52"/>
      <stop offset="1" stop-color="#0b1f3a"/>
    </linearGradient>
    <pattern id="grid" width="16" height="16" patternUnits="userSpaceOnUse">
      <path d="M16 0H0V16" fill="none" stroke="#4ea8ff" stroke-opacity="0.12"/>
    </pattern>
    <linearGradient id="link" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#a8d4ff"/>
      <stop offset="1" stop-color="#4ea8ff"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" rx="22" fill="url(#bg)"/>
  <rect x="14" y="14" width="${W - 28}" height="${H - 28}" rx="12" fill="url(#grid)"/>
  <rect x="0.75" y="0.75" width="${W - 1.5}" height="${H - 1.5}" rx="21.25" fill="none" stroke="#2f81f7" stroke-opacity="0.5" stroke-width="1.5"/>

  <path d="${path}" fill="none" stroke="#4ea8ff" stroke-opacity="0.12" stroke-width="2"/>
  <path d="${path}" fill="none" stroke="#7cc4ff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="${len} ${len}">
    <animate attributeName="stroke-dashoffset" values="${len};0;0" keyTimes="0;${DRAW};1" dur="${CYCLE}s" repeatCount="indefinite"/>
    <animate attributeName="opacity" values="1;1;0" keyTimes="0;0.9;1" dur="${CYCLE}s" repeatCount="indefinite"/>
  </path>

  <rect x="${BASE.x - 34}" y="${BASE.y + 6}" width="68" height="12" rx="4" fill="#17396a" stroke="#4ea8ff" stroke-opacity="0.6"/>
  <path d="M${BASE.x - 20} ${BASE.y + 6} L${BASE.x - 12} ${BASE.y - 8} H${BASE.x + 12} L${BASE.x + 20} ${BASE.y + 6} Z" fill="#17396a" stroke="#4ea8ff" stroke-opacity="0.6"/>
  <g>
    <animateTransform attributeName="transform" type="rotate" values="${rot(q1, BASE.x, BASE.y)}" keyTimes="${times}" dur="${CYCLE}s" repeatCount="indefinite"/>
    <rect x="${BASE.x - 7}" y="${BASE.y - 7}" width="${L1 + 14}" height="14" rx="7" fill="url(#link)"/>
    <g>
      <animateTransform attributeName="transform" type="rotate" values="${rot(q2, BASE.x + L1, BASE.y)}" keyTimes="${times}" dur="${CYCLE}s" repeatCount="indefinite"/>
      <rect x="${BASE.x + L1 - 5}" y="${BASE.y - 5}" width="${L2 + 5}" height="10" rx="5" fill="url(#link)"/>
      <circle cx="${BASE.x + L1}" cy="${BASE.y}" r="8" fill="#0b1f3a" stroke="#a8d4ff" stroke-width="3"/>
      <circle cx="${BASE.x + L1 + L2}" cy="${BASE.y}" r="6" fill="#e6f1ff"/>
      <circle cx="${BASE.x + L1 + L2}" cy="${BASE.y}" r="11" fill="#4ea8ff" fill-opacity="0.25"/>
    </g>
  </g>
  <circle cx="${BASE.x}" cy="${BASE.y}" r="10" fill="#0b1f3a" stroke="#a8d4ff" stroke-width="3"/>
</svg>
`;

writeFileSync(new URL("../assets/robot-arm.svg", import.meta.url), svg);
console.log(`wrote assets/robot-arm.svg (${N + 1} keyframes, path ${len}px)`);
