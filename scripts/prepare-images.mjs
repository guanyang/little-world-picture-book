import { mkdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { bookCategories } from "../src/content/bookData.js";

const root = path.resolve(import.meta.dirname, "..");
const sourceDir = path.join(root, "assets");
const cacheDir = path.join(root, ".cache");
const sheetDir = path.join(sourceDir, "sheets");
const optimizedDir = path.join(root, "public", "media", "optimized");

const sourceFormat = "jpg";
const optimizedFormat = "webp";

const getAssetSourcePath = (slug, type) => {
  if (type === "scene") {
    return path.join(sourceDir, `${slug}.${sourceFormat}`);
  }
  return path.join(cacheDir, `${slug}.${sourceFormat}`);
};

const exists = async (filePath) => {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
};

// Local asset processing only. No external downloads.

const optimize = async ({ slug, type }) => {
  const sourcePath = getAssetSourcePath(slug, type);
  const outputPath = path.join(optimizedDir, `${slug}.${optimizedFormat}`);
  const sourceStats = await stat(sourcePath);

  if (await exists(outputPath)) {
    const outputStats = await stat(outputPath);
    if (outputStats.mtimeMs >= sourceStats.mtimeMs) {
      return outputPath;
    }
  }

  const resizeOptions =
    type === "scene"
      ? { width: 1320, height: 920, fit: "cover", position: "center" }
      : { width: 720, height: 720, fit: "cover", position: "center" };

  await sharp(await readFile(sourcePath))
    .rotate()
    .resize(resizeOptions)
    .webp({ quality: 80, effort: 5, smartSubsample: true })
    .toFile(outputPath);

  return outputPath;
};

const cropSheetItems = async (category) => {
  const sheetPath = path.join(sheetDir, `${category.id}.png`);

  const sheetPaths = [];
  if (await exists(sheetPath)) {
    sheetPaths.push({ path: sheetPath, startIndex: 0, cols: 5, rows: 4 });
  }

  for (let sheetIndex = 0; sheetIndex < 4; sheetIndex += 1) {
    const segmentedSheetPath = path.join(sheetDir, `${category.id}-${sheetIndex}.png`);
    if (await exists(segmentedSheetPath)) {
      sheetPaths.push({
        path: segmentedSheetPath,
        startIndex: sheetIndex * 5,
        cols: 5,
        rows: 1,
      });
    }
  }

  if (sheetPaths.length === 0) {
    return;
  }

  for (const sheet of sheetPaths) {
    const metadata = await sharp(sheet.path).metadata();
    const cellWidth = Math.floor(metadata.width / sheet.cols);
    const cellHeight = Math.floor(metadata.height / sheet.rows);
    const cropSize = Math.min(cellWidth, cellHeight);
    const xOffset = Math.floor((cellWidth - cropSize) / 2);
    const yOffset = Math.floor((cellHeight - cropSize) / 2);

    await Promise.all(
      category.items
        .slice(sheet.startIndex, sheet.startIndex + sheet.cols * sheet.rows)
        .map(async (item, localIndex) => {
          const row = Math.floor(localIndex / sheet.cols);
          const col = localIndex % sheet.cols;
          const outputPath = path.join(cacheDir, `${item.slug}.${sourceFormat}`);
          const sheetStats = await stat(sheet.path);

          if (await exists(outputPath)) {
            const outputStats = await stat(outputPath);
            if (outputStats.mtimeMs >= sheetStats.mtimeMs) {
              return;
            }
          }

          await sharp(sheet.path)
            .extract({
              left: col * cellWidth + xOffset,
              top: row * cellHeight + yOffset,
              width: cropSize,
              height: cropSize,
            })
            .jpeg({ quality: 95 })
            .toFile(outputPath);
          sheetCrops += 1;
        }),
    );
  }
};

const assets = bookCategories.flatMap((category) => [
  {
    slug: category.sceneSlug,
    type: "scene",
  },
  ...category.items.map((item) => ({
    slug: item.slug,
    type: "item",
  })),
]);

await mkdir(sourceDir, { recursive: true });
await mkdir(cacheDir, { recursive: true });
await mkdir(sheetDir, { recursive: true });
await mkdir(optimizedDir, { recursive: true });

let optimized = 0;
let sheetCrops = 0;

const prepareAsset = async (asset) => {
  const sourcePath = getAssetSourcePath(asset.slug, asset.type);
  if (!(await exists(sourcePath))) {
    throw new Error(`Source asset not found: ${sourcePath}`);
  }

  const outputPath = path.join(optimizedDir, `${asset.slug}.${optimizedFormat}`);
  const hadOutput = await exists(outputPath);
  const outputStatsBefore = hadOutput ? await stat(outputPath) : null;
  await optimize(asset);
  const outputStatsAfter = await stat(outputPath);
  if (!hadOutput || outputStatsAfter.mtimeMs !== outputStatsBefore.mtimeMs) {
    optimized += 1;
  }
};

const runConcurrent = async (items, worker, concurrency = 4) => {
  let cursor = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (cursor < items.length) {
      const item = items[cursor];
      cursor += 1;
      await worker(item);
    }
  });

  await Promise.all(workers);
};

await Promise.all(bookCategories.map(cropSheetItems));
await runConcurrent(assets, prepareAsset);

console.log(
  `Prepared ${assets.length} image assets (${sheetCrops} sheet crops, ${optimized} optimized).`,
);
