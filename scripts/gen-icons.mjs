import sharp from "sharp";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const svg = readFileSync(resolve(root, "src/app/sift-logo.svg"));

const outputs = [
  { dir: "src/app", name: "icon.png",       size: 512 },
  { dir: "src/app", name: "apple-icon.png",  size: 180 },
  { dir: "public",  name: "icon-192.png",    size: 192 },
  { dir: "public",  name: "icon-512.png",    size: 512 },
];

for (const { dir, name, size } of outputs) {
  await sharp(svg, { density: 300 })
    .resize(size, size)
    .png()
    .toFile(resolve(root, dir, name));
  console.log(`wrote ${dir}/${name} (${size}x${size})`);
}

// Maskable: content in the inner 80% so Android adaptive icons don't clip.
const padding = Math.round(512 * 0.1);
await sharp(svg, { density: 300 })
  .resize(512 - padding * 2, 512 - padding * 2)
  .extend({ top: padding, bottom: padding, left: padding, right: padding, background: "#111111" })
  .png()
  .toFile(resolve(root, "public/icon-maskable-512.png"));
console.log("wrote public/icon-maskable-512.png (512x512 maskable)");

console.log("done");
