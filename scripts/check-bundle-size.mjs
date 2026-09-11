/**
 * Budget check for the payload an anonymous visitor downloads.
 *
 * The application used to build as one 1.2 MB chunk, so someone opening a single
 * job advert on a metered 2G/3G connection also downloaded the admin dashboard
 * and the charting library. Routes are code-split now, but a single stray
 * top-level import can quietly undo that -- import Recharts from a shared
 * component and it lands back in the entry graph with no visible symptom on a
 * developer's laptop.
 *
 * This measures only what index.html actually references (the entry chunk, its
 * static vendor chunks and the stylesheet), which is exactly the first-load
 * cost, and fails the build if it regresses past the budget.
 *
 * Run after `npm run build`.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";

/** Gzipped bytes. Headroom over the current figure, well under the old 350 kB. */
const GZIP_BUDGET = 210 * 1024;

const DIST = "dist";
const ASSETS = join(DIST, "assets");

if (!statSync(DIST, { throwIfNoEntry: false })) {
  console.error("dist/ not found -- run `npm run build` first.");
  process.exit(1);
}

const html = readFileSync(join(DIST, "index.html"), "utf8");
const referenced = [...html.matchAll(/(?:src|href)="\/assets\/([^"]+)"/g)].map((m) => m[1]);

if (referenced.length === 0) {
  console.error("No assets referenced from index.html -- the build looks wrong.");
  process.exit(1);
}

let raw = 0;
let gzip = 0;
const rows = [];

for (const name of referenced) {
  const bytes = readFileSync(join(ASSETS, name));
  const gz = gzipSync(bytes).length;
  raw += bytes.length;
  gzip += gz;
  rows.push([name, bytes.length, gz]);
}

rows.sort((a, b) => b[2] - a[2]);

console.log("First-load payload (referenced by index.html):");
for (const [name, b, gz] of rows) {
  console.log(`  ${name.padEnd(34)} ${String(b).padStart(8)}  ${String(gz).padStart(7)} gz`);
}
console.log(`  ${"TOTAL".padEnd(34)} ${String(raw).padStart(8)}  ${String(gzip).padStart(7)} gz`);

// Recharts must stay out of the initial graph: it is only needed by the three
// dashboards, all of which are lazily routed.
const chartChunk = readdirSync(ASSETS).find((f) => {
  if (!f.endsWith(".js")) return false;
  return readFileSync(join(ASSETS, f), "utf8").includes("recharts");
});
if (chartChunk && referenced.includes(chartChunk)) {
  console.error(`\nFAIL: the charting library (${chartChunk}) is on the first-load path.`);
  process.exit(1);
}

if (gzip > GZIP_BUDGET) {
  console.error(
    `\nFAIL: first-load payload is ${gzip} gzipped bytes, over the ${GZIP_BUDGET} budget.`,
  );
  console.error("Something heavy has been pulled into the entry graph by a top-level import.");
  process.exit(1);
}

console.log(`\nOK: ${gzip} gzipped bytes, within the ${GZIP_BUDGET} budget.`);
