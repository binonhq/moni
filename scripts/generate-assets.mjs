import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const dir = new URL("../public/icons/", import.meta.url);
await mkdir(dir, { recursive: true });
// Combined artwork bounds were (128,90)..(406,377), off-center in a 512px canvas.
// Center the complete mark, including the dot, before scaling each asset.
const mark = '<g transform="translate(-11 22.5)"><path d="M155 350V200a55 55 0 0 1 110 0v112-112a55 55 0 0 1 110 0v150" stroke="#e2f3e6" stroke-width="54" stroke-linecap="round" fill="none"/><circle cx="381" cy="115" r="25" fill="#a4d9b5"/></g>';
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" fill="#254e3a"/>${mark}</svg>`;
await writeFile(new URL("icon.svg", dir), svg);
for (const [name, size] of [["icon-192.png",192],["icon-512.png",512],["apple-touch-icon.png",180],["apple-touch-icon-v2.png",180]]) await sharp(Buffer.from(svg)).resize(size, size).png().toFile(fileURLToPath(new URL(name, dir)));
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="512" height="512" fill="#254e3a"/><g transform="translate(51.2 51.2) scale(.8)">${mark}</g></svg>`;
await sharp(Buffer.from(maskable)).png().toFile(fileURLToPath(new URL("maskable-512.png", dir)));
for (const [w,h] of [[1179,2556],[1290,2796],[1320,2868]]) {
  const splash = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="#f7f8fa"/><svg x="${(w-210)/2}" y="${(h-210)/2}" width="210" height="210" viewBox="0 0 512 512"><rect width="512" height="512" rx="130" fill="#254e3a"/>${mark}</svg></svg>`;
  await sharp(Buffer.from(splash)).png().toFile(fileURLToPath(new URL(`startup-${w}x${h}.png`,dir)));
}
console.log("Generated app icons, maskable icon, and three iPhone startup images.");
