import { VIEW_WIDTH } from "./constants.js";
import { meadow } from "./maps/meadow.js";
import { mushroomCave } from "./maps/mushroomCave.js";
import { canopyRuins } from "./maps/canopyRuins.js";
import { deepCave } from "./maps/deepCave.js";

const CHUNKS = [meadow, mushroomCave, canopyRuins, deepCave];
const BUCKET_SIZE = 520;

function flatten(key) {
  return CHUNKS.flatMap((chunk) => chunk[key] ?? []);
}

function itemBounds(item) {
  const x = item.x ?? 0;
  const w = item.w ?? 0;
  return { min: x, max: x + w };
}

function buildBuckets(items) {
  const buckets = new Map();
  for (const item of items) {
    const { min, max } = itemBounds(item);
    const start = Math.floor(min / BUCKET_SIZE);
    const end = Math.floor(max / BUCKET_SIZE);
    for (let bucket = start; bucket <= end; bucket += 1) {
      if (!buckets.has(bucket)) {
        buckets.set(bucket, []);
      }
      buckets.get(bucket).push(item);
    }
  }
  return buckets;
}

export const WORLD = {
  name: "Froggy Wilds",
  worldWidth: 9900,
  spawn: { x: 86, y: 498 },
  goal: { x: 9825, y: 332 },
  regions: CHUNKS.map(({ name, startX, endX }) => ({ name, startX, endX })),
  platforms: flatten("platforms"),
  waterZones: flatten("waterZones"),
  lilypads: flatten("lilypads"),
  npcs: flatten("npcs"),
  flySpawnPoints: flatten("flySpawnPoints"),
  relics: flatten("relics"),
  messages: flatten("messages"),
  checkpoints: flatten("checkpoints"),
  caveZones: flatten("caveZones"),
  decorations: flatten("decorations"),
};

WORLD.spatial = {
  platforms: buildBuckets(WORLD.platforms),
  waterZones: buildBuckets(WORLD.waterZones),
  lilypads: buildBuckets(WORLD.lilypads),
  npcs: buildBuckets(WORLD.npcs),
  flySpawnPoints: buildBuckets(WORLD.flySpawnPoints),
  relics: buildBuckets(WORLD.relics),
  messages: buildBuckets(WORLD.messages),
  checkpoints: buildBuckets(WORLD.checkpoints),
  caveZones: buildBuckets(WORLD.caveZones),
  decorations: buildBuckets(WORLD.decorations),
};

export function cameraMax() {
  return Math.max(0, WORLD.worldWidth - VIEW_WIDTH);
}

export function getRegionName(x) {
  return WORLD.regions.find((region) => x >= region.startX && x < region.endX)?.name ?? WORLD.name;
}

export function getItemsInRange(bucketMap, minX, maxX) {
  const seen = new Set();
  const items = [];
  const start = Math.floor(minX / BUCKET_SIZE);
  const end = Math.floor(maxX / BUCKET_SIZE);
  for (let bucket = start; bucket <= end; bucket += 1) {
    const bucketItems = bucketMap.get(bucket);
    if (!bucketItems) {
      continue;
    }
    for (const item of bucketItems) {
      if (!seen.has(item)) {
        seen.add(item);
        items.push(item);
      }
    }
  }
  return items;
}
