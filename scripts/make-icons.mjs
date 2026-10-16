// Renders the Sprout mark (the same two-leaf sprout as the Android launcher icon) into every
// icon the web app needs. Run `npm run icons` after changing the artwork; the outputs are
// committed, so a normal build never needs sharp.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const BG = "#EDE8FB"; // launcher background from the Android app
const root = path.resolve(import.meta.dirname, "..");

// The mark's own 24x24 design: purple stem, green leaf, peach leaf.
const mark = `
  <path d="M12 21 L12 10" stroke="#8B78D6" stroke-width="2" stroke-linecap="round" fill="none"/>
  <path d="M12 13 C12 9 15 7 19 7 C19 11 16 13 12 13 Z" fill="#5FBE93"/>
  <path d="M12 16 C12 12 9 10 5 10 C5 14 8 16 12 16 Z" fill="#F5A97A"/>`;

/** `fill` is how much of the canvas the 24x24 mark occupies; `radius` rounds the background. */
function svg(size, fill, radius = 0) {
  const scale = (size * fill) / 24;
  const offset = (size - 24 * scale) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" fill="${BG}"/>
  <g transform="translate(${offset} ${offset}) scale(${scale})">${mark}</g>
</svg>`;
}

const png = (name, size, fill) =>
  sharp(Buffer.from(svg(size, fill))).png().toFile(path.join(root, name));

await mkdir(path.join(root, "public/icons"), { recursive: true });

// Browser tab icon: scalable, softly rounded.
await writeFile(path.join(root, "src/app/icon.svg"), svg(64, 0.9, 14));

// Home-screen icons. Full-bleed squares: Android and iOS apply their own mask/rounding.
await png("public/icons/icon-192.png", 192, 0.85);
await png("public/icons/icon-512.png", 512, 0.85);
// Maskable: the mark stays inside the central 60% so any mask shape (circle, squircle) keeps it whole.
await png("public/icons/icon-maskable-512.png", 512, 0.7);
// iOS "Add to Home Screen" icon (must be opaque, which these are).
await png("src/app/apple-icon.png", 180, 0.85);

// /favicon.ico for browsers and crawlers that ask for it by name: an ICO wrapping a 48px PNG.
const ico48 = await sharp(Buffer.from(svg(48, 0.9, 10))).png().toBuffer();
const header = Buffer.alloc(22);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(1, 4); // one image
header.writeUInt8(48, 6); // width
header.writeUInt8(48, 7); // height
header.writeUInt16LE(1, 10); // colour planes
header.writeUInt16LE(32, 12); // bits per pixel
header.writeUInt32LE(ico48.length, 14); // image size
header.writeUInt32LE(22, 18); // image offset
await writeFile(path.join(root, "src/app/favicon.ico"), Buffer.concat([header, ico48]));

console.log("icons written");
