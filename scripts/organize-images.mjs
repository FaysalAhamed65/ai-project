import fs from "node:fs";
import path from "node:path";

const IMAGES_DIR = path.join(process.cwd(), "public", "images");
const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".jfif"]);

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");

function pad2(n) {
  return String(n).padStart(2, "0");
}

function isAllowedImage(filename) {
  const ext = path.extname(filename).toLowerCase();
  return ALLOWED_EXT.has(ext);
}

function isPeopleFolder(name) {
  return /^celeb\d{2}$/i.test(name);
}

function listTopLevelImages() {
  const entries = fs.readdirSync(IMAGES_DIR, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .filter((n) => n !== ".keep")
    .filter(isAllowedImage);
}

function main() {
  if (!fs.existsSync(IMAGES_DIR)) {
    throw new Error(`Missing folder: ${IMAGES_DIR}`);
  }

  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

  // Only reorganize images that are directly inside public/images.
  // If you already have public/images/celebXX/* this script leaves those folders alone.
  const topLevelImages = listTopLevelImages().sort(collator.compare);

  if (topLevelImages.length === 0) {
    console.log("No top-level images found in public/images/.");
    console.log("Put your 250 files directly into public/images/ then rerun.");
    process.exit(0);
  }

  if (topLevelImages.length % 5 !== 0) {
    console.log(`Found ${topLevelImages.length} top-level images in public/images/.`);
    console.log("This script expects a multiple of 5 images (5 photos per celeb).");
    process.exit(1);
  }

  const totalImages = topLevelImages.length;

  /** @type {{from:string,to:string}[]} */
  const moves = [];

  for (let idx = 0; idx < totalImages; idx++) {
    const file = topLevelImages[idx];
    const ext = path.extname(file).toLowerCase();
    const personIndex = Math.floor(idx / 5) + 1; 
    const photoIndex = (idx % 5) + 1; // 1..5

    const celebId = `celeb${pad2(personIndex)}`;
    const destDir = path.join(IMAGES_DIR, celebId);
    const destFile = `${pad2(photoIndex)}${ext === ".jpeg" ? ".jpg" : ext}`;
    const from = path.join(IMAGES_DIR, file);
    const to = path.join(destDir, destFile);

    moves.push({ from, to });
  }

  // Preflight: ensure we don't overwrite anything.
  for (const { to } of moves) {
    const dir = path.dirname(to);
    if (!fs.existsSync(dir)) continue;
    if (fs.existsSync(to)) {
      throw new Error(`Target already exists: ${to}`);
    }
  }

  for (const d of fs.readdirSync(IMAGES_DIR, { withFileTypes: true })) {
    if (d.isDirectory() && isPeopleFolder(d.name)) {
      // ok
    }
  }

  console.log(dryRun ? "DRY RUN (no files will be moved):" : "Organizing images:");
  for (const { from, to } of moves) {
    console.log(`- ${path.relative(process.cwd(), from)} -> ${path.relative(process.cwd(), to)}`);
  }

  if (dryRun) return;

  for (const { from, to } of moves) {
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.renameSync(from, to);
  }

  console.log(`Done. Images are now under public/images/celeb01..celeb${pad2(totalImages/5)}/01.jpg..05.jpg`);
}

main();

