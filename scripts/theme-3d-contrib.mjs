// Usage: node scripts/theme-3d-contrib.mjs <profile-3d svg>
// Post-processes the github-profile-3d-contrib output to match the profile cards:
// - its language pie and legend use GitHub's per-language colours; repaint both,
//   by rank, with the blue palette (same order as assets/github-languages.svg);
// - round the background and add the card border used by the other assets.
import { readFileSync, writeFileSync } from "node:fs";

const PALETTE = ["#4ea8ff", "#2f81f7", "#9fd0ff", "#1d5fc2", "#62d2ff", "#5b7fd6", "#c9e4ff", "#3a6596"];
const OTHER = { from: "#444444", to: "#3a6596" };
const BG = /<rect x="0" y="0" width="(\d+)" height="(\d+)"( rx="\d+")? class="fill-bg">/;
const RADIUS = 30;
const BORDER = 'data-profile-border="1"';

const path = process.argv[2];
if (!path) throw new Error("usage: theme-3d-contrib.mjs <svg>");
const src = readFileSync(path, "utf8");
const pick = (hex, i) => (hex.toLowerCase() === OTHER.from ? OTHER.to : PALETTE[i % PALETTE.length]);

const bg = src.match(BG);
if (!bg) throw new Error("background rect not found; markup changed upstream");
const w = Number(bg[1]), h = Number(bg[2]);

let legend = 0;
let slices = 0;
let out = src
  // legend swatches: square rects with an explicit fill attribute
  .replace(/(<rect [^>]*width="([\d.]+)" height="\2" )fill="(#[0-9a-fA-F]{3,8})"/g, (_, head, _w, hex) => `${head}fill="${pick(hex, legend++)}"`)
  // pie slices: paths with an inline fill style
  .replace(/(<path [^>]*)style="fill: (#[0-9a-fA-F]{3,8});"/g, (_, head, hex) => `${head}style="fill: ${pick(hex, slices++)};"`)
  .replace(BG, `<rect x="0" y="0" width="${w}" height="${h}" rx="${RADIUS}" class="fill-bg">`);
if (!out.includes(BORDER))
  out = out.replace(/<\/svg>\s*$/, `<rect ${BORDER} x="1.5" y="1.5" width="${w - 3}" height="${h - 3}" rx="${RADIUS - 1.5}" fill="none" stroke="#2f81f7" stroke-opacity="0.45" stroke-width="2.4"/></svg>`);

if (legend !== slices) throw new Error(`legend (${legend}) and pie (${slices}) counts differ; markup changed upstream`);
writeFileSync(path, out);
console.log(`themed ${path}: ${slices} language slices recolored, rounded ${w}x${h} card`);
