import { GROUND_Y, TOP_DOWN_WORLD_SIZE } from "./constants.js";

function rand(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

// Simplified 2D noise for biome variation
function simpleNoise2D(x, y, seed) {
  const rng = rand(seed ^ Math.floor(x) ^ (Math.floor(y) * 73856093));
  const fractal = rng() * 0.5 + rng() * 0.25 + rng() * 0.25;
  return fractal;
}

export function generatePlatformerStructures(worldWidth, seed = 707) {
  const next = rand(seed);
  const structures = [];
  const types = ["watchtower", "brokenArch", "marketStall", "stoneNest", "roadSign"];
  const colors = ["#c6a16b", "#8e9c84", "#a67c6d", "#7a9b6b", "#b8955f"];
  const detailLevels = ["ornate", "weathered", "pristine"];
  
  for (let x = 620; x < worldWidth - 700; x += 620 + Math.floor(next() * 580)) {
    const type = types[Math.floor(next() * types.length)];
    const y = type === "watchtower" ? GROUND_Y - 104 : GROUND_Y;
    const color = colors[Math.floor(next() * colors.length)];
    const detail = detailLevels[Math.floor(next() * detailLevels.length)];
    
    structures.push({
      id: `p-${structures.length}`,
      type,
      x: x + Math.floor(next() * 140),
      y,
      w: type === "brokenArch" ? 150 : type === "marketStall" ? 102 : 112,
      h: type === "watchtower" ? 112 : type === "marketStall" ? 82 : 76,
      color,
      detail,
      rotation: type === "brokenArch" ? (next() > 0.5 ? -8 : 8) : 0,
      seed: Math.floor(next() * 1000000),
    });
  }
  return structures;
}

export const TOP_DOWN_CHUNK_SIZE = 1200;
export const TOP_DOWN_URBAN = {
  x: TOP_DOWN_WORLD_SIZE / 2 - 1620,
  y: TOP_DOWN_WORLD_SIZE / 2 - 720,
  w: 3240,
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

function chooseCityColor(next) {
  const colors = ["#667780", "#7b7870", "#5f7782", "#748189", "#697982", "#5e7175"];
  return colors[Math.floor(next() * colors.length)];
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

// Determine biome density for a chunk
function getBiomeDensity(chunkX, chunkY, seed) {
  const noise = simpleNoise2D(chunkX * 0.3, chunkY * 0.3, seed + 42);
  if (noise < 0.25) return "sparse";
  if (noise < 0.6) return "normal";
  return "dense";
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
      foliage: [],
    };
  }

  const next = rand(seed ^ (chunkX * 73856093) ^ (chunkY * 19349663));
  if (next() > 0.94) {
    return generateUrbanChunk(chunkX, chunkY, next);
  }

  const density = getBiomeDensity(chunkX, chunkY, seed);
  const walls = [];
  const water = [];
  const lilyPads = [];
  const structures = [];
  const pickups = [];
  const foliage = [];
  const baseX = chunkRect.x;
  const baseY = chunkRect.y;

  // Adaptive wall generation based on density
  const wallCountMap = { sparse: 0.5, normal: 1.2, dense: 1.8 };
  const wallCount = Math.max(0, Math.floor(wallCountMap[density] + next() * 2.5));
  
  for (let i = 0; i < wallCount; i += 1) {
    let wall = null;
    for (let attempt = 0; attempt < 6 && !wall; attempt += 1) {
      const horizontal = next() > 0.5;
      const minSize = density === "sparse" ? 400 : 300;
      const maxSize = density === "dense" ? 700 : 600;
      
      const w = horizontal 
        ? minSize + Math.floor(next() * (maxSize - minSize)) 
        : 100 + Math.floor(next() * 80);
      const h = horizontal 
        ? 100 + Math.floor(next() * 80) 
        : minSize + Math.floor(next() * (maxSize - minSize));
        
      const candidate = {
        id: `wall-${chunkX}-${chunkY}-${i}`,
        type: "wall",
        material: chooseWallMaterial(next),
        x: clampToWorld(baseX + 120 + Math.floor(next() * (TOP_DOWN_CHUNK_SIZE - w - 200)), w),
        y: clampToWorld(baseY + 120 + Math.floor(next() * (TOP_DOWN_CHUNK_SIZE - h - 200)), h),
        w,
        h,
        color: next() > 0.4 ? "#6f7b75" : "#8b8172",
        mineable: true,
        detail: next() > 0.6 ? "rough" : "smooth",
      };
      if (!walls.some((existing) => rectsTouch(existing, candidate, 100))) {
        wall = candidate;
      }
    }
    if (!wall) continue;
    walls.push(wall);

    // Water features adjacent to walls with increased frequency
    if (next() < (density === "dense" ? 0.7 : 0.6)) {
      const side = next() > 0.5 ? "horizontal" : "vertical";
      const waterRect = side === "horizontal"
        ? {
            id: `wall-water-${chunkX}-${chunkY}-${i}`,
            type: "water",
            x: clampToWorld(wall.x - 42, wall.w + 84),
            y: clampToWorld(wall.y + wall.h + 22, 120),
            w: wall.w + 84,
            h: 120,
          }
        : {
            id: `wall-water-${chunkX}-${chunkY}-${i}`,
            type: "water",
            x: clampToWorld(wall.x + wall.w + 22, 120),
            y: clampToWorld(wall.y - 36, wall.h + 72),
            w: 120,
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

  // Density-based standalone pool generation. Big water is core to top-down traversal.
  const waterCountMap = { sparse: 9, normal: 12, dense: 16 };
  const waterCount = Math.floor(waterCountMap[density] + next() * 5);
  
  for (let i = 0; i < waterCount; i += 1) {
    const minW = density === "sparse" ? 300 : 340;
    const maxW = density === "dense" ? 640 : 520;
    const w = minW + Math.floor(next() * (maxW - minW));
    const minH = density === "sparse" ? 220 : 250;
    const maxH = density === "dense" ? 500 : 420;
    const h = minH + Math.floor(next() * (maxH - minH));
    
    const pool = {
      id: `pool-${chunkX}-${chunkY}-${i}`,
      type: "water",
      x: clampToWorld(baseX + 70 + Math.floor(next() * (TOP_DOWN_CHUNK_SIZE - w - 120)), w),
      y: clampToWorld(baseY + 70 + Math.floor(next() * (TOP_DOWN_CHUNK_SIZE - h - 120)), h),
      w,
      h,
      murky: density === "dense" && next() > 0.5,
    };
    water.push(pool);
    
    if (next() > (density === "sparse" ? 0.4 : 0.25)) {
      lilyPads.push({
        id: `pool-pad-${chunkX}-${chunkY}-${i}`,
        x: pool.x + pool.w * (0.25 + next() * 0.5),
        y: pool.y + pool.h * (0.25 + next() * 0.5),
        phase: next() * Math.PI * 2,
      });
    }
  }

  // POI clustering for structures
  const structureCountMap = { sparse: 0.3, normal: 0.65, dense: 1.2 };
  const shouldCreateStructure = next() < structureCountMap[density];
  
  if (shouldCreateStructure) {
    const types = ["hut", "ruin", "garden", "cart", "parkourHouse", "shrine", "well"];
    const type = types[Math.floor(next() * types.length)];
    const w = type === "garden" ? 136 : type === "shrine" ? 92 : type === "well" ? 68 : 76 + Math.floor(next() * 58);
    const h = type === "garden" ? 106 : type === "shrine" ? 88 : type === "well" ? 84 : 64 + Math.floor(next() * 54);
    
    structures.push({
      id: `structure-${chunkX}-${chunkY}`,
      type,
      name: type === "parkourHouse" ? "Parkour House" : undefined,
      kind: type === "parkourHouse" ? "parkour" : undefined,
      x: clampToWorld(baseX + 150 + Math.floor(next() * (TOP_DOWN_CHUNK_SIZE - 300)), w),
      y: clampToWorld(baseY + 150 + Math.floor(next() * (TOP_DOWN_CHUNK_SIZE - 300)), h),
      w: type === "parkourHouse" ? Math.max(128, w) : w,
      h: type === "parkourHouse" ? Math.max(96, h) : h,
      color: next() > 0.45 ? "#b98d55" : "#789e6b",
      detail: next() > 0.6 ? "ornate" : "plain",
    });
  }

  // Density-based pickups
  const currencies = ["flies", "pearls", "amber"];
  const pickupCountMap = { sparse: 2.5, normal: 3.5, dense: 5.2 };
  const pickupCount = Math.floor(pickupCountMap[density] + next() * 2);
  
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

  // Add foliage for visual richness
  const foliageCountMap = { sparse: 4, normal: 8, dense: 16 };
  const foliageCount = foliageCountMap[density] + Math.floor(next() * 6);
  const foliageTypes = ["bush", "wildflower", "grass_clump", "tall_grass"];
  
  for (let i = 0; i < foliageCount; i += 1) {
    foliage.push({
      id: `foliage-${chunkX}-${chunkY}-${i}`,
      type: foliageTypes[Math.floor(next() * foliageTypes.length)],
      x: baseX + 50 + Math.floor(next() * (TOP_DOWN_CHUNK_SIZE - 100)),
      y: baseY + 50 + Math.floor(next() * (TOP_DOWN_CHUNK_SIZE - 100)),
      scale: 0.6 + next() * 0.8,
      tint: next() > 0.5 ? "dark" : "light",
    });
  }

  // Add trees (choppable with tongue)
  const treeCountMap = { sparse: 2, normal: 4, dense: 7 };
  const treeCount = treeCountMap[density] + Math.floor(next() * 3);
  
  for (let i = 0; i < treeCount; i += 1) {
    structures.push({
      id: `tree-${chunkX}-${chunkY}-${i}`,
      type: "tree",
      x: clampToWorld(baseX + 80 + Math.floor(next() * (TOP_DOWN_CHUNK_SIZE - 160)), 60),
      y: clampToWorld(baseY + 80 + Math.floor(next() * (TOP_DOWN_CHUNK_SIZE - 160)), 60),
      w: 60,
      h: 60,
      chopable: true,
      health: 3,
    });
  }

  ensureWaterCoverage(water, lilyPads, chunkRect, next, chunkX, chunkY);

  return {
    key: `${chunkX}:${chunkY}`,
    walls,
    water: mergeRects(water),
    lilyPads,
    structures,
    pickups,
    foliage,
    density,
  };
}

function ensureWaterCoverage(water, lilyPads, chunkRect, next, chunkX, chunkY) {
  const targetArea = TOP_DOWN_CHUNK_SIZE * TOP_DOWN_CHUNK_SIZE * 0.54;
  let area = estimatedWaterArea(water, chunkRect);
  let attempts = 0;
  while (area < targetArea && attempts < 16) {
    const w = 420 + Math.floor(next() * 520);
    const h = 320 + Math.floor(next() * 440);
    const pond = {
      id: `coverage-water-${chunkX}-${chunkY}-${attempts}`,
      type: "water",
      x: clampToWorld(chunkRect.x + 40 + Math.floor(next() * (TOP_DOWN_CHUNK_SIZE - w - 80)), w),
      y: clampToWorld(chunkRect.y + 40 + Math.floor(next() * (TOP_DOWN_CHUNK_SIZE - h - 80)), h),
      w,
      h,
      murky: next() > 0.55,
    };
    water.push(pond);
    lilyPads.push({
      id: `coverage-pad-${chunkX}-${chunkY}-${attempts}`,
      x: pond.x + pond.w * (0.25 + next() * 0.5),
      y: pond.y + pond.h * (0.25 + next() * 0.5),
      phase: next() * Math.PI * 2,
    });
    area += clippedArea(pond, chunkRect);
    attempts += 1;
  }
}

function estimatedWaterArea(water, chunkRect) {
  return water.reduce((total, item) => total + clippedArea(item, chunkRect), 0);
}

function clippedArea(rect, bounds) {
  const minX = Math.max(rect.x, bounds.x);
  const minY = Math.max(rect.y, bounds.y);
  const maxX = Math.min(rect.x + rect.w, bounds.x + bounds.w);
  const maxY = Math.min(rect.y + rect.h, bounds.y + bounds.h);
  return Math.max(0, maxX - minX) * Math.max(0, maxY - minY);
}

function generateUrbanChunk(chunkX, chunkY, next) {
  const baseX = chunkX * TOP_DOWN_CHUNK_SIZE;
  const baseY = chunkY * TOP_DOWN_CHUNK_SIZE;
  const districtX = baseX + 110 + Math.floor(next() * 120);
  const districtY = baseY + 110 + Math.floor(next() * 120);
  const districtW = 980 + Math.floor(next() * 170);
  const districtH = 930 + Math.floor(next() * 190);
  const cx = districtX + districtW / 2;
  const cy = districtY + districtH / 2;
  const park = {
    id: `urban-park-${chunkX}-${chunkY}`,
    x: districtX + 70 + Math.floor(next() * 90),
    y: districtY + districtH - 270,
    w: 250 + Math.floor(next() * 120),
    h: 150 + Math.floor(next() * 70),
  };
  const roads = [
    { id: `urban-road-h-${chunkX}-${chunkY}`, x: districtX - 160, y: cy - 52, w: districtW + 320, h: 104 },
    { id: `urban-road-v-${chunkX}-${chunkY}`, x: cx - 54, y: districtY - 150, w: 108, h: districtH + 300 },
  ];
  if (next() > 0.45) {
    roads.push({ id: `urban-road-side-${chunkX}-${chunkY}`, x: districtX + districtW - 230, y: districtY - 85, w: 94, h: districtH + 170 });
  }

  const structures = [
    { id: `urban-building-a-${chunkX}-${chunkY}`, type: "urbanBuilding", x: districtX + 150, y: districtY + 160, w: 142, h: 116, fixed: true, color: chooseCityColor(next) },
    { id: `urban-building-b-${chunkX}-${chunkY}`, type: "urbanBuilding", x: districtX + districtW - 160, y: districtY + 170, w: 150, h: 126, fixed: true, color: chooseCityColor(next) },
    { id: `urban-building-c-${chunkX}-${chunkY}`, type: "urbanBuilding", x: districtX + districtW - 170, y: districtY + districtH - 165, w: 154, h: 124, fixed: true, color: chooseCityColor(next) },
  ];
  if (next() > 0.55) {
    structures.push({
      id: `urban-parkour-${chunkX}-${chunkY}`,
      type: "parkourHouse",
      name: "City Parkour House",
      kind: "parkour",
      x: districtX + 150,
      y: districtY + districtH - 135,
      w: 150,
      h: 108,
      fixed: true,
      color: "#789e6b",
    });
  }

  const walls = structures
    .filter((item) => item.type === "urbanBuilding")
    .map((item) => ({
      id: `${item.id}-wall`,
      x: item.x - item.w / 2,
      y: item.y - item.h / 2,
      w: item.w,
      h: item.h,
      material: "concrete",
      color: item.color,
      mineable: false,
    }));
  const water = [
    { id: `urban-park-water-${chunkX}-${chunkY}`, type: "water", x: park.x - 36, y: park.y - 42, w: park.w + 72, h: 52, urban: true, round: 16 },
    { id: `urban-canal-${chunkX}-${chunkY}`, type: "water", x: districtX + 38, y: districtY + 60, w: 70, h: districtH - 120, urban: true, round: 14 },
  ];
  const lilyPads = [
    { id: `urban-pad-park-${chunkX}-${chunkY}`, x: park.x + park.w / 2, y: park.y - 17, phase: next() * Math.PI * 2 },
    { id: `urban-pad-canal-${chunkX}-${chunkY}`, x: districtX + 73, y: cy + 110, phase: next() * Math.PI * 2 },
  ];
  const pickups = [
    { id: `urban-flies-${chunkX}-${chunkY}`, currency: "flies", x: park.x + park.w * 0.52, y: park.y + park.h * 0.55, value: 3 },
    { id: `urban-pearl-${chunkX}-${chunkY}`, currency: "pearls", x: districtX + districtW - 245, y: districtY + districtH - 235, value: 1 },
  ];
  const cars = makeChunkTraffic(roads, chunkX, chunkY);

  // Urban foliage in parks
  const foliage = [];
  for (let i = 0; i < 6; i += 1) {
    foliage.push({
      id: `urban-foliage-${chunkX}-${chunkY}-${i}`,
      type: next() > 0.5 ? "tree_urban" : "shrub_urban",
      x: park.x + 30 + Math.floor(next() * (park.w - 60)),
      y: park.y - 80 + Math.floor(next() * 100),
      scale: 0.7 + next() * 0.6,
      tint: "dark",
    });
  }

  return {
    key: `${chunkX}:${chunkY}`,
    urban: true,
    walls,
    water,
    lilyPads,
    structures,
    pickups,
    roads,
    parks: [park],
    cars,
    foliage,
  };
}

function makeChunkTraffic(roads, chunkX, chunkY) {
  const colors = ["#e65b4f", "#4d8bd9", "#f0b93f", "#57a96b", "#9d6cc7"];
  const cars = [];
  for (const road of roads) {
    const horizontal = road.w >= road.h;
    for (let lane = 0; lane < 2; lane += 1) {
      const laneOffset = (lane + 0.5) / 2;
      cars.push({
        id: `chunk-car-${road.id}-${lane}`,
        name: "Road car",
        x: horizontal ? road.x + 18 : road.x + road.w * laneOffset - 17,
        y: horizontal ? road.y + road.h * laneOffset - 17 : road.y + 18,
        w: horizontal ? road.w - 36 : 34,
        h: horizontal ? 34 : road.h - 36,
        axis: horizontal ? "x" : "y",
        speed: 132 + lane * 42 + Math.abs(chunkX + chunkY) % 30,
        offset: (lane * 0.43 + Math.abs(chunkX * 0.17 + chunkY * 0.11)) % 1,
        direction: lane % 2 === 0 ? 1 : -1,
        color: colors[(Math.abs(chunkX) + Math.abs(chunkY) + lane) % colors.length],
      });
    }
  }
  return cars;
}
