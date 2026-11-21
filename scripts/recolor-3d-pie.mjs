// Usage: node scripts/recolor-3d-pie.mjs <profile-3d svg>
// github-profile-3d-contrib paints its language pie and legend with GitHub's
// per-language colours. Repaint both, by rank, with the profile's blue
// palette (the same order as assets/github-languages.svg).
import { readFileSync, writeFileSync } from "node:fs";

const PALETTE = ["#4ea8ff", "#2f81f7", "#9fd0ff", "#1d5fc2", "#62d2ff", "#5b7fd6", "#c9e4ff", "#3a6596"];
const OTHER = { from: "#444444", to: "#3a6596" };

const path = process.argv[2];
if (!path) throw new Error("usage: recolor-3d-pie.mjs <svg>");
const src = readFileSync(path, "utf8");
const pick = (hex, i) => (hex.toLowerCase() === OTHER.from ? OTHER.to : PALETTE[i % PALETTE.length]);

let legend = 0;
let slices = 0;
const out = src
  // legend swatches: square rects with an explicit fill attribute
  .replace(/(<rect [^>]*width="([\d.]+)" height="\2" )fill="(#[0-9a-fA-F]{3,8})"/g, (_, head, _w, hex) => `${head}fill="${pick(hex, legend++)}"`)
  // pie slices: paths with an inline fill style
  .replace(/(<path [^>]*)style="fill: (#[0-9a-fA-F]{3,8});"/g, (_, head, hex) => `${head}style="fill: ${pick(hex, slices++)};"`);

if (legend !== slices) throw new Error(`legend (${legend}) and pie (${slices}) counts differ; markup changed upstream`);
writeFileSync(path, out);
console.log(`recolored ${slices} language slices in ${path}`);
