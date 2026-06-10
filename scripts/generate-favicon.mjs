/**
 * One-off generator: produce a circular favicon from public/icon.jpg.
 * Run with `node scripts/generate-favicon.mjs` after replacing icon.jpg.
 *
 * Output: src/app/icon.png — Next.js convention picks this up
 * automatically and serves it as the site favicon. The 192px square
 * with a circular alpha mask gives both browser tabs (which downscale)
 * and home-screen icons (which prefer ~192) a crisp, round source.
 */
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const SRC = path.join(root, "public/icon.jpg");
const OUT = path.join(root, "src/app/icon.png");
const SIZE = 192;

const r = SIZE / 2;
const mask = Buffer.from(
  `<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg"><circle cx="${r}" cy="${r}" r="${r}" fill="#fff"/></svg>`,
);

await sharp(SRC)
  .resize(SIZE, SIZE, { fit: "cover" })
  .composite([{ input: mask, blend: "dest-in" }])
  .png()
  .toFile(OUT);

console.log(`✔ wrote ${OUT}`);
