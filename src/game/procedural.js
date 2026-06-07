import { GROUND_Y, TOP_DOWN_WORLD_SIZE } from "./constants.js";

function rand(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

export function generatePlatformerStructures(worldWidth, seed = 707) {
  const next = rand(seed);
  const structures = [];
  const types = ["watchtower", "brokenArch", "marketStall", "stoneNest", "roadSign"];
  for (let x = 620; x < worldWidth - 700; x += 760 + Math.floor(next() * 430)) {
    const type = types[Math.floor(next() * types.length)];
    const y = type === "watchtower" ? GROUND_Y - 104 : GROUND_Y;
    structures.push({
      id: `p-${structures.length}`,
      type,
      x: x + Math.floor(next() * 180),
      y,
      w: type === "brokenArch" ? 150 : 112,
      h: type === "watchtower" ? 112 : 76,
      color: next() > 0.5 ? "#c6a16b" : "#8e9c84",
    });
  }
  return structures;
}

export const TOP_DOWN_CHUNK_SIZE = 1200;
export const TOP_DOWN_URBAN = {
  x: TOP_DOWN_WORLD_SIZE / 2 - 930,
  y: TOP_DOWN_WORLD_SIZE / 2 - 720,
  w: 1860,
  h: 1440,
};

function overlaps(a, b, margin = 0) {
  return (
    a.x < b.x + b.w + margin &&
    a.x + a.w > b.x - margin &&
    a.y < b.y + b.h + margin &&
    a.y + a.h > b.y - margin
  );
}

function clampToWorld(value, size) {
  return Math.max(48, Math.min(TOP_DOWN_WORLD_SIZE - size - 48, value));
}

function rectsTouch(a, b, margin = 0) {
  return (
    a.x < b.x + b.w + margin &&
    a.x + a.w + margin > b.x &&
    a.y < b.y + b.h + margin &&
    a.y + a.h + margin > b.y
  );
}

function chooseWallMaterial(next) {
  const roll = next();
  if (roll > 0.88) return "crystal";
  if (roll > 0.58) return "stone";
  return "clay";
}

function mergeRects(rects, margin = 18) {
  const merged = rects.map((rect) => ({ ...rect }));
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < merged.length; i += 1) {
      for (let j = i + 1; j < merged.length; j += 1) {
        if (!rectsTouch(merged[i], merged[j], margin)) continue;
        const minX = Math.min(merged[i].x, merged[j].x);
        const minY = Math.min(merged[i].y, merged[j].y);
        const maxX = Math.max(merged[i].x + merged[i].w, merged[j].x + merged[j].w);
        const maxY = Math.max(merged[i].y + merged[i].h, merged[j].y + merged[j].h);
        merged[i] = {
          ...merged[i],
          id: `${merged[i].id}+${merged[j].id}`,
          x: minX,
          y: minY,
          w: maxX - minX,
          h: maxY - minY,
        };
        merged.splice(j, 1);
        changed = true;
        break;
      }
      if (changed) break;
    }
  }
  return merged;
}

export function generateTopDownChunk(chunkX, chunkY, seed = 911) {
  const chunkRect = {
    x: chunkX * TOP_DOWN_CHUNK_SIZE,
    y: chunkY * TOP_DOWN_CHUNK_SIZE,
    w: TOP_DOWN_CHUNK_SIZE,
    h: TOP_DOWN_CHUNK_SIZE,
  };

  if (overlaps(chunkRect, TOP_DOWN_URBAN, 180)) {
    return {
      key: `${chunkX}:${chunkY}`,
      walls: [],
      water: [],
      lilyPads: [],
      structures: [],
      pickups: [],
    };
  }

  const next = rand(seed ^ (chunkX * 73856093) ^ (chunkY * 19349663));
  const walls = [];
  const water = [];
  const lilyPads = [];
  const structures = [];
  const pickups = [];
  const baseX = chunkRect.x;
  const baseY = chunkRect.y;

  const wallCount = 1 + Math.floor(next() * 3);
  for (let i = 0; i < wallCount; i += 1) {
    let wall = null;
    for (let attempt = 0; attempt < 5 && !wall; attempt += 1) {
      const horizontal = next() > 0.5;
      const w = horizontal ? 500 + Math.floor(next() * 260) : 126 + Math.floor(next() * 62);
      const h = horizontal ? 126 + Math.floor(next() * 62) : 500 + Math.floor(next() * 260);
      const candidate = {
        id: `wall-${chunkX}-${chunkY}-${i}`,
        type: "wall",
        material: chooseWallMaterial(next),
        x: clampToWorld(baseX + 120 + Math.floor(next() * (TOP_DOWN_CHUNK_SIZE - w - 200)), w),
        y: clampToWorld(baseY + 120 + Math.floor(next() * (TOP_DOWN_CHUNK_SIZE - h - 200)), h),
        w,
        h,
        color: next() > 0.45 ? "#6f7b75" : "#8b8172",
        mineable: true,
      };
      if (!walls.some((existing) => rectsTouch(existing, candidate, 90))) {
        wall = candidate;
      }
    }
    if (!wall) continue;
    walls.push(wall);

    if (next() < 0.6) {
      const side = next() > 0.5 ? "horizontal" : "vertical";
      const waterRect = side === "horizontal"
        ? {
            id: `wall-water-${chunkX}-${chunkY}-${i}`,
            type: "water",
            x: clampToWorld(wall.x - 42, wall.w + 84),
            y: clampToWorld(wall.y + wall.h + 22, 112),
            w: wall.w + 84,
            h: 112,
          }
        : {
            id: `wall-water-${chunkX}-${chunkY}-${i}`,
            type: "water",
            x: clampToWorld(wall.x + wall.w + 22, 118),
            y: clampToWorld(wall.y - 36, wall.h + 72),
            w: 118,
            h: wall.h + 72,
          };
      water.push(waterRect);
      lilyPads.push({
        id: `wall-pad-${chunkX}-${chunkY}-${i}`,
        x: waterRect.x + waterRect.w * (0.35 + next() * 0.3),
        y: waterRect.y + waterRect.h * (0.35 + next() * 0.3),
        phase: next() * Math.PI * 2,
      });
    }
  }

  const waterCount = 2 + Math.floor(next() * 3);
  for (let i = 0; i < waterCount; i += 1) {
    const w = 180 + Math.floor(next() * 280);
    const h = 120 + Math.floor(next() * 210);
    const pool = {
      id: `pool-${chunkX}-${chunkY}-${i}`,
      type: "water",
      x: clampToWorld(baseX + 70 + Math.floor(next() * (TOP_DOWN_CHUNK_SIZE - w - 120)), w),
      y: clampToWorld(baseY + 70 + Math.floor(next() * (TOP_DOWN_CHUNK_SIZE - h - 120)), h),
      w,
      h,
    };
    water.push(pool);
    if (next() > 0.25) {
      lilyPads.push({
        id: `pool-pad-${chunkX}-${chunkY}-${i}`,
        x: pool.x + pool.w * (0.25 + next() * 0.5),
        y: pool.y + pool.h * (0.25 + next() * 0.5),
        phase: next() * Math.PI * 2,
      });
    }
  }

  if (next() > 0.35) {
    const type = ["hut", "ruin", "garden", "cart"][Math.floor(next() * 4)];
    const w = type === "garden" ? 136 : 76 + Math.floor(next() * 58);
    const h = type === "garden" ? 106 : 64 + Math.floor(next() * 54);
    structures.push({
      id: `structure-${chunkX}-${chunkY}`,
      type,
      x: clampToWorld(baseX + 150 + Math.floor(next() * (TOP_DOWN_CHUNK_SIZE - 300)), w),
      y: clampToWorld(baseY + 150 + Math.floor(next() * (TOP_DOWN_CHUNK_SIZE - 300)), h),
      w,
      h,
      color: next() > 0.45 ? "#b98d55" : "#789e6b",
    });
  }

  const currencies = ["flies", "pearls", "amber"];
  const pickupCount = 3 + Math.floor(next() * 4);
  for (let i = 0; i < pickupCount; i += 1) {
    const currency = currencies[Math.floor(next() * currencies.length)];
    pickups.push({
      id: `pickup-${chunkX}-${chunkY}-${i}`,
      currency,
      x: clampToWorld(baseX + 60 + Math.floor(next() * (TOP_DOWN_CHUNK_SIZE - 120)), 18),
      y: clampToWorld(baseY + 60 + Math.floor(next() * (TOP_DOWN_CHUNK_SIZE - 120)), 18),
      value: currency === "flies" ? 2 : 1,
    });
  }

  return {
    key: `${chunkX}:${chunkY}`,
    walls,
    water: mergeRects(water),
    lilyPads,
    structures,
    pickups,
  };
}
