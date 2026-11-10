import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ACCENT = "#ab274a";
const CREAM = "#fff8f2";
const INK = "#241e1a";
const BG = "#faf7f2";

function giftMark(size, strokePx = 2, color = CREAM) {
  const scale = size / 24;
  return `<g transform="scale(${scale})" fill="none" stroke="${color}" stroke-width="${strokePx / scale}" stroke-linecap="round" stroke-linejoin="round">
    <path d="M20 12v9H4v-9M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 1 1 0-5C11 2 12 7 12 7ZM12 7h4.5a2.5 2.5 0 1 0 0-5C13 2 12 7 12 7Z" />
  </g>`;
}

function squareIcon({ size, maskable }) {
  const radius = maskable ? 0 : size * 0.22;
  const markSize = maskable ? size * 0.44 : size * 0.5;
  const offset = (size - markSize) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" rx="${radius}" fill="${ACCENT}"/>
    <g transform="translate(${offset} ${offset})">${giftMark(markSize, Math.max(1, markSize * 0.075))}</g>
  </svg>`;
}

const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${BG}"/>
  <rect x="96" y="215" width="200" height="200" rx="52" fill="${ACCENT}"/>
  <g transform="translate(146 265)">${giftMark(100, 9)}</g>
  <text x="352" y="342" font-family="Georgia, 'Times New Roman', serif" font-size="118" fill="${INK}" letter-spacing="-3">wishlist</text>
</svg>`;

async function main() {
  const iconsDir = path.join(process.cwd(), "public", "icons");
  await fs.mkdir(iconsDir, { recursive: true });

  const outputs = [
    [path.join(iconsDir, "icon-192.png"), squareIcon({ size: 192, maskable: false }), 192],
    [path.join(iconsDir, "icon-512.png"), squareIcon({ size: 512, maskable: false }), 512],
    [path.join(iconsDir, "icon-maskable-512.png"), squareIcon({ size: 512, maskable: true }), 512],
    [path.join(iconsDir, "icon-32.png"), squareIcon({ size: 32, maskable: false }), 32],
    [path.join(iconsDir, "apple-touch-icon.png"), squareIcon({ size: 180, maskable: true }), 180],
    [path.join(process.cwd(), "src", "app", "icon.png"), squareIcon({ size: 64, maskable: false }), 64],
    [path.join(process.cwd(), "public", "og-default.png"), ogSvg, 1200],
  ];

  for (const [file, svg, width] of outputs) {
    await sharp(Buffer.from(svg)).resize({ width }).png().toFile(file);
  }

  console.log(`Wrote ${outputs.length} assets.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
