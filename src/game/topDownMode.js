import { TOP_DOWN_WORLD_SIZE, VIEW_HEIGHT, VIEW_WIDTH } from "./constants.js";
import { beep } from "./audio.js";
import { TOP_DOWN_CHUNK_SIZE, TOP_DOWN_URBAN, generateTopDownChunk } from "./procedural.js";
import { clamp, lineCircleHit, rectsOverlap, roundRect } from "./utils.js";
import frogSpriteUrl from "../../frog.png";

const FROG_SIZE = 42;
const MOVE_SPEED = 270;
const SWIM_SPEED_MULTIPLIER = 0.72;
const LEAP_DURATION = 0.72;
const LEAP_SPEED_MULTIPLIER = 1.58;
const MAX_LEAP_UPGRADE = 10;
const ACTIVE_MARGIN = 220;
const CENTER = TOP_DOWN_WORLD_SIZE / 2;
const MINE_RANGE = 96;
const PLACE_RANGE = 74;
const TOP_DOWN_TONGUE_MAX = 245;
const TOP_DOWN_TONGUE_SPEED = 1780;
const TOP_DOWN_TONGUE_HOLD = 0.08;
const TOP_DOWN_TONGUE_COOLDOWN = 0.34;
const DAY_DURATION = 120;
const NIGHT_DURATION = 180;
const BIRD_INTERVAL = 20;
const BIRD_WARNING = 8;
const BIRD_SWOOP = 17;
const VEHICLE_HIT_COOLDOWN = 1.7;
export const CHECKPOINT_COST = { pearls: 6, amber: 2 };
export const HOUSE_COST = { flies: 8, pearls: 3, amber: 1 };
export const LILY_PAD_COST = { flies: 3 };
export const TOP_DOWN_ZOOM = 0.86;
const PLACEABLE_MATERIALS = ["wood", "clay", "stone", "crystal", "water"];
const DEFAULT_MATERIALS = { wood: 0, clay: 0, stone: 0, crystal: 0, water: 0 };
const FROG_SPRITE = makeImage(frogSpriteUrl);

export const FURNITURE_SHOP_ITEMS = [
  { part: "window", name: "Round Window", cost: { pearls: 4 } },
  { part: "rug", name: "Leaf Rug", cost: { flies: 6, pearls: 2 } },
  { part: "lantern", name: "Glow Lantern", cost: { amber: 2, pearls: 3 } },
  { part: "trophy", name: "Parkour Trophy", cost: { amber: 5, pearls: 8 } },
];

export const PICKAXES = [
  { tier: 0, id: "none", name: "None", material: "bare hands", costPearls: 0, maxWallTier: 0, hits: Infinity },
  { tier: 1, id: "reed", name: "Basic Pickaxe", material: "reed", costPearls: 12, maxWallTier: 1, hits: 5, minesWater: true },
  { tier: 2, id: "stone", name: "Stone Pickaxe", material: "stone", costPearls: 100, maxWallTier: 2, hits: 4 },
  { tier: 3, id: "amber", name: "Amber Pickaxe", material: "amber", costPearls: 180, costAmber: 12, maxWallTier: 2, hits: 2 },
  { tier: 4, id: "crystal", name: "Crystal Pickaxe", material: "crystal", costPearls: 300, costAmber: 25, maxWallTier: 3, hits: 2 },
];

const WALL_MATERIALS = {
  wood: { name: "Wood Wall", tier: 1, hp: 3, color: "#7a5531", shine: "#c28a4f" },
  clay: { name: "Clay Wall", tier: 1, hp: 4, color: "#8b8172", shine: "#b6a78d" },
  stone: { name: "Stone Wall", tier: 2, hp: 6, color: "#68746d", shine: "#aab4ae" },
  crystal: { name: "Crystal Wall", tier: 3, hp: 8, color: "#796c9d", shine: "#d9c8ff" },
  concrete: { name: "Concrete", tier: 99, hp: 999, color: "#76828a", shine: "#c7d0d4" },
};

const URBAN_FEATURES = makeUrbanFeatures();

export function createTopDownState(progress = {}) {
  const saved = progress.topDown ?? {};
  const frog = {
    x: saved.frogX ?? CENTER - 180,
    y: saved.frogY ?? CENTER + 420,
    facing: saved.facing ?? 1,
    jumpHeld: false,
  };
  const materials = normalizeMaterials(saved.materials);
  const state = {
    worldSize: TOP_DOWN_WORLD_SIZE,
    time: 0,
    zoom: TOP_DOWN_ZOOM,
    cameraX: 0,
    cameraY: 0,
    frog,
    score: saved.score ?? 8,
    pearls: saved.pearls ?? 3,
    amber: saved.amber ?? 3,
    materials,
    selectedPlaceable: PLACEABLE_MATERIALS.includes(saved.selectedPlaceable) ? saved.selectedPlaceable : firstAvailableMaterial(materials),
    placedMaterials: (saved.placedMaterials ?? []).map((item, index) => ({
      id: item.id ?? `placed-material-${index + 1}`,
      material: item.material ?? "wood",
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
      placed: true,
    })),
    pickaxeTier: saved.pickaxeTier ?? 0,
    leapUpgrade: saved.leapUpgrade ?? 0,
    speedUpgrade: saved.speedUpgrade ?? 0,
    spawnRateUpgrade: saved.spawnRateUpgrade ?? 0,
    leapTimer: 0,
    lilyBoostTimer: 0,
    discoveredStructures: new Set(),
    collectedPickups: new Set(),
    minedWalls: new Set(saved.minedWalls ?? []),
    choppedTrees: new Set(saved.choppedTrees ?? []),
    wallDamage: new Map(),
    checkpoints: (saved.checkpoints ?? []).map((checkpoint, index) => ({
      id: checkpoint.id ?? `checkpoint-${index + 1}`,
      x: checkpoint.x,
      y: checkpoint.y,
      label: checkpoint.label ?? `CP ${index + 1}`,
      createdAt: checkpoint.createdAt ?? 0,
    })),
    teleportMenuOpen: false,
    placedLilyPads: (saved.placedLilyPads ?? []).map((pad, index) => ({
      id: pad.id ?? `placed-pad-${index + 1}`,
      x: pad.x,
      y: pad.y,
      phase: pad.phase ?? 0,
      placed: true,
    })),
    furnitureShopIndex: saved.furnitureShopIndex ?? 0,
    playerHouse: progress.house ? makePlayerHouse(progress.house.x, progress.house.y, progress.house.level ?? saved.houseLevel ?? 1) : null,
    houseLevel: progress.house?.level ?? saved.houseLevel ?? 0,
    bird: null,
    birdCooldown: getSyncedBirdCooldown(),
    lastBirdSlot: getDayInfo().birdSlot,
    hurtCooldown: 0,
    pointer: { x: frog.x, y: frog.y },
    chunks: new Map(),
    active: emptyActive(),
    nearbyPlaceId: null,
    carSpawnTimer: 0,
    spawnedCars: [],
    parkourEntryPoint: null,
    tongueCooldown: 0,
    tongue: {
      active: false,
      returning: false,
      hold: 0,
      length: 0,
      targetLength: 0,
      angle: 0,
      caughtPickupId: null,
      hitTreeId: null,
      tipX: frog.x,
      tipY: frog.y,
    },
    notice: "Top-down is now a 300k x 300k world. The middle city has shops, trades, and a water-ringed park.",
    noticeTimer: 4.4,
  };
  updateCamera(state);
  state.active = getActiveTopDown(state);
  return state;
}

export function makeTopDownProgress(state) {
  return {
    frogX: state.frog.x,
    frogY: state.frog.y,
    facing: state.frog.facing,
    score: state.score,
    pearls: state.pearls,
    amber: state.amber,
    materials: { ...state.materials },
    selectedPlaceable: state.selectedPlaceable,
    placedMaterials: state.placedMaterials.map((item) => ({
      id: item.id,
      material: item.material,
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
    })),
    pickaxeTier: state.pickaxeTier,
    leapUpgrade: state.leapUpgrade,
    speedUpgrade: state.speedUpgrade,
    spawnRateUpgrade: state.spawnRateUpgrade,
    houseLevel: state.houseLevel,
    minedWalls: [...state.minedWalls],
    choppedTrees: [...state.choppedTrees],
    checkpoints: state.checkpoints.map((checkpoint) => ({
      id: checkpoint.id,
      x: checkpoint.x,
      y: checkpoint.y,
      label: checkpoint.label,
      createdAt: checkpoint.createdAt,
    })),
    placedLilyPads: state.placedLilyPads.map((pad) => ({
      id: pad.id,
      x: pad.x,
      y: pad.y,
      phase: pad.phase,
    })),
    furnitureShopIndex: state.furnitureShopIndex,
  };
}

export function updateTopDownGame(state, pressed, pointer, dt, soundOn) {
  state.time += dt;
  state.noticeTimer = Math.max(0, state.noticeTimer - dt);
  state.leapTimer = Math.max(0, state.leapTimer - dt);
  state.lilyBoostTimer = Math.max(0, state.lilyBoostTimer - dt);
  state.hurtCooldown = Math.max(0, state.hurtCooldown - dt);
  state.tongueCooldown = Math.max(0, state.tongueCooldown - dt);
  state.pointer = { x: pointer.x, y: pointer.y, down: pointer.down };
  state.active = getActiveTopDown(state);
  spawnOffroadCars(state);

  const onLilyPad = isOnLilyPad(state);
  if (onLilyPad) {
    state.lilyBoostTimer = Math.max(state.lilyBoostTimer, 0.55);
  }

  if (pressed.has("Space") && !state.frog.jumpHeld && (onLilyPad || state.lilyBoostTimer > 0)) {
    state.leapTimer = LEAP_DURATION + state.leapUpgrade * 0.22;
    state.lilyBoostTimer = 0;
    state.frog.jumpHeld = true;
    setNotice(state, "Lily leap! You can hop over walls for a moment.", 1.5);
    if (soundOn) beep(880, 0.05);
  }
  if (!pressed.has("Space")) {
    state.frog.jumpHeld = false;
  }

  moveTopDownFrog(state, pressed, dt);
  updateTopDownTongue(state, pointer, dt, soundOn);
  updateCamera(state);
  state.active = getActiveTopDown(state);
  collectTopDownPickups(state, soundOn);
  discoverStructures(state, soundOn);
  updateVehicleHazards(state, soundOn);
  updateBirdHazard(state, dt, soundOn);
  state.nearbyPlaceId = findNearbyTopDownPlace(state)?.id ?? null;

  if (state.noticeTimer <= 0) {
    const place = findNearbyTopDownPlace(state);
    if (place) {
      state.notice = `${place.name}: ${place.talk ?? "Press E to enter a short parkour challenge."}`;
    } else if (onLilyPad || state.lilyBoostTimer > 0) {
      state.notice = "Press Space from a lily pad to leap over walls.";
    } else if (getDayInfo(state).isDay) {
      state.notice = "Daytime birds can steal your flies. Water keeps you safe.";
    } else {
      state.notice = "Night is long and safe. Explore, place pads, build checkpoints, and find parkour houses.";
    }
  }
}

export function buildTopDownCheckpoint(state, soundOn) {
  if (state.pearls < CHECKPOINT_COST.pearls || state.amber < CHECKPOINT_COST.amber) {
    setNotice(state, `Checkpoint costs ${CHECKPOINT_COST.pearls} pearls and ${CHECKPOINT_COST.amber} amber.`);
    if (soundOn) beep(160, 0.04);
    return false;
  }

  state.pearls -= CHECKPOINT_COST.pearls;
  state.amber -= CHECKPOINT_COST.amber;
  const checkpoint = {
    id: `checkpoint-${Math.round(state.time * 1000)}-${state.checkpoints.length + 1}`,
    x: state.frog.x,
    y: state.frog.y,
    label: `CP ${state.checkpoints.length + 1}`,
    createdAt: state.time,
  };
  state.checkpoints.push(checkpoint);
  setNotice(state, `${checkpoint.label} built. Press T to open the checkpoint map.`, 3.2);
  if (soundOn) beep(1040, 0.07);
  return true;
}

export function toggleTopDownTeleportMap(state, soundOn) {
  if (!state.checkpoints.length) {
    setNotice(state, "Build a checkpoint first with B.");
    if (soundOn) beep(150, 0.04);
    return false;
  }
  state.teleportMenuOpen = !state.teleportMenuOpen;
  setNotice(state, state.teleportMenuOpen ? "Checkpoint map open. Pick a marker to teleport." : "Checkpoint map closed.", 2);
  if (soundOn) beep(state.teleportMenuOpen ? 720 : 420, 0.04);
  return true;
}

export function teleportToTopDownCheckpoint(state, checkpointId, soundOn) {
  const checkpoint = state.checkpoints.find((item) => item.id === checkpointId) ?? state.checkpoints[0];
  if (!checkpoint) {
    setNotice(state, "Build a checkpoint first with B.");
    if (soundOn) beep(150, 0.04);
    return false;
  }

  state.frog.x = clamp(checkpoint.x, 28, state.worldSize - 28);
  state.frog.y = clamp(checkpoint.y, 36, state.worldSize - 36);
  state.leapTimer = 0;
  state.lilyBoostTimer = 0;
  state.frog.jumpHeld = false;
  state.teleportMenuOpen = false;
  updateCamera(state);
  state.active = getActiveTopDown(state);
  setNotice(state, `Teleported to ${checkpoint.label}.`, 2.2);
  if (soundOn) beep(880, 0.06);
  return true;
}

export function placeTopDownLilyPad(state, soundOn) {
  if (state.score < LILY_PAD_COST.flies) {
    setNotice(state, `A lily pad costs ${LILY_PAD_COST.flies} flies.`);
    if (soundOn) beep(150, 0.04);
    return false;
  }

  const point = getPlacementPoint(state, 190);
  const water = findWaterAtPoint(state, point.x, point.y) ?? findWaterAtPoint(state, state.frog.x, state.frog.y);
  if (!water) {
    setNotice(state, "Aim at water or stand in water to place a lily pad.");
    if (soundOn) beep(150, 0.04);
    return false;
  }
  const placeX = clamp(point.x, water.x + 38, water.x + water.w - 38);
  const placeY = clamp(point.y, water.y + 27, water.y + water.h - 27);

  const newPad = {
    id: `placed-top-pad-${Math.round(state.time * 1000)}-${state.placedLilyPads.length + 1}`,
    x: placeX,
    y: placeY,
    phase: Math.random() * Math.PI * 2,
    placed: true,
  };
  const tooClose = state.active.lilyPads.some((pad) => (
    Math.hypot(pad.x - newPad.x, pad.y - newPad.y) < 68
  ));
  if (tooClose) {
    setNotice(state, "That spot is too close to another lily pad.");
    return false;
  }

  state.score -= LILY_PAD_COST.flies;
  state.placedLilyPads.push(newPad);
  state.active.lilyPads.push(newPad);
  setNotice(state, "Lily pad placed. Stand on it and press Space to leap.", 2.6);
  if (soundOn) beep(760, 0.05);
  return true;
}

function moveTopDownFrog(state, pressed, dt) {
  const frog = state.frog;
  const dx = (pressed.has("KeyD") || pressed.has("ArrowRight") ? 1 : 0) - (pressed.has("KeyA") || pressed.has("ArrowLeft") ? 1 : 0);
  const dy = (pressed.has("KeyS") || pressed.has("ArrowDown") ? 1 : 0) - (pressed.has("KeyW") || pressed.has("ArrowUp") ? 1 : 0);
  const length = Math.sqrt(dx * dx + dy * dy) || 1;
  const inWater = isInWater(state);
  const leaping = state.leapTimer > 0;
  const leapSpeed = LEAP_SPEED_MULTIPLIER + state.leapUpgrade * 0.08;
  const speedUpgrade = 1 + Math.min(12, state.speedUpgrade ?? 0) * 0.05;
  const speed = MOVE_SPEED * speedUpgrade * (inWater && !leaping ? SWIM_SPEED_MULTIPLIER : 1) * (leaping ? leapSpeed : 1);

  frog.x = clamp(frog.x + (dx / length) * speed * dt, 28, state.worldSize - 28);
  frog.y = clamp(frog.y + (dy / length) * speed * dt, 36, state.worldSize - 36);
  if (dx !== 0) frog.facing = dx < 0 ? -1 : 1;

  if (!leaping) {
    resolveWallCollisions(state);
  }
}

function updateCamera(state) {
  state.cameraX = clamp(state.frog.x - viewportWidth(state) / 2, 0, state.worldSize - viewportWidth(state));
  state.cameraY = clamp(state.frog.y - viewportHeight(state) / 2, 0, state.worldSize - viewportHeight(state));
}

function getActiveTopDown(state) {
  const minX = state.cameraX - ACTIVE_MARGIN;
  const maxX = state.cameraX + viewportWidth(state) + ACTIVE_MARGIN;
  const minY = state.cameraY - ACTIVE_MARGIN;
  const maxY = state.cameraY + viewportHeight(state) + ACTIVE_MARGIN;
  const startChunkX = Math.floor(minX / TOP_DOWN_CHUNK_SIZE);
  const endChunkX = Math.floor(maxX / TOP_DOWN_CHUNK_SIZE);
  const startChunkY = Math.floor(minY / TOP_DOWN_CHUNK_SIZE);
  const endChunkY = Math.floor(maxY / TOP_DOWN_CHUNK_SIZE);
  const active = emptyActive();

  for (let cy = startChunkY; cy <= endChunkY; cy += 1) {
    for (let cx = startChunkX; cx <= endChunkX; cx += 1) {
      if (cx < 0 || cy < 0) continue;
      const key = `${cx}:${cy}`;
      if (!state.chunks.has(key)) {
        state.chunks.set(key, generateTopDownChunk(cx, cy));
      }
      const chunk = state.chunks.get(key);
      active.walls.push(...chunk.walls.filter((wall) => !state.minedWalls.has(wall.id)));
      active.water.push(...chunk.water);
      active.lilyPads.push(...chunk.lilyPads);
      active.structures.push(...chunk.structures.filter((item) => item.type !== "tree" || !state.choppedTrees.has(item.id)));
      active.pickups.push(...chunk.pickups);
      active.roads.push(...(chunk.roads ?? []));
      active.parks.push(...(chunk.parks ?? []));
      active.cars.push(...(chunk.cars ?? []).filter((item) => isVisible(item, minX, minY, maxX, maxY)));
      active.foliage.push(...(chunk.foliage ?? []));
    }
  }

  for (const item of state.placedMaterials) {
    const rect = placedMaterialRect(item);
    if (!isVisible(rect, minX, minY, maxX, maxY)) continue;
    if (item.material === "water") {
      active.water.push({
        ...rect,
        id: item.id,
        type: "water",
        placed: true,
        round: 14,
      });
    } else {
      active.walls.push({
        ...rect,
        id: item.id,
        material: item.material,
        mineable: false,
        placed: true,
      });
    }
  }

  active.water = mergeWaterRects(active.water);

  active.roads.push(...URBAN_FEATURES.roads.filter((item) => isVisible(item, minX, minY, maxX, maxY)));
  active.parks.push(...URBAN_FEATURES.parks.filter((item) => isVisible(item, minX, minY, maxX, maxY)));
  active.cars.push(...URBAN_FEATURES.cars.filter((item) => isVisible(item, minX, minY, maxX, maxY)));
  active.lilyPads.push(...URBAN_FEATURES.lilyPads.filter((item) => isVisible({ x: item.x - 28, y: item.y - 18, w: 56, h: 36 }, minX, minY, maxX, maxY)));
  active.lilyPads.push(...state.placedLilyPads.filter((item) => isVisible({ x: item.x - 38, y: item.y - 26, w: 76, h: 52 }, minX, minY, maxX, maxY)));
  active.walls.push(...URBAN_FEATURES.walls.filter((item) => isVisible(item, minX, minY, maxX, maxY)));
  active.structures.push(...URBAN_FEATURES.structures.filter((item) => isVisible(item, minX, minY, maxX, maxY)));
  active.pickups.push(...URBAN_FEATURES.pickups.filter((item) => isVisible({ x: item.x - 16, y: item.y - 16, w: 32, h: 32 }, minX, minY, maxX, maxY)));
  if (state.playerHouse && isVisible(state.playerHouse, minX, minY, maxX, maxY)) {
    active.structures.push(state.playerHouse);
  }
  return active;
}

function emptyActive() {
  return {
    walls: [],
    water: [],
    lilyPads: [],
    structures: [],
    pickups: [],
    roads: [],
    parks: [],
    cars: [],
    foliage: [],
  };
}

function isVisible(item, minX, minY, maxX, maxY) {
  return item.x + item.w >= minX && item.x <= maxX && item.y + item.h >= minY && item.y <= maxY;
}

function viewportWidth(state) {
  return VIEW_WIDTH / state.zoom;
}

function viewportHeight(state) {
  return VIEW_HEIGHT / state.zoom;
}

function waterRectsTouch(a, b, margin = 16) {
  return (
    a.x < b.x + b.w + margin &&
    a.x + a.w + margin > b.x &&
    a.y < b.y + b.h + margin &&
    a.y + a.h + margin > b.y
  );
}

function mergeWaterRects(water) {
  const merged = water.map((item) => ({ ...item }));
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < merged.length; i += 1) {
      for (let j = i + 1; j < merged.length; j += 1) {
        if (!waterRectsTouch(merged[i], merged[j])) continue;
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

function frogRect(state, padding = 0) {
  return {
    x: state.frog.x - FROG_SIZE / 2 + padding,
    y: state.frog.y - FROG_SIZE / 2 + padding,
    w: FROG_SIZE - padding * 2,
    h: FROG_SIZE - padding * 2,
  };
}

function resolveWallCollisions(state) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const rect = frogRect(state, 7);
    const wall = state.active.walls.find((item) => rectsOverlap(rect, item));
    if (!wall) return false;

    const frogCenterX = rect.x + rect.w / 2;
    const frogCenterY = rect.y + rect.h / 2;
    const wallCenterX = wall.x + wall.w / 2;
    const wallCenterY = wall.y + wall.h / 2;
    const overlapRight = rect.x + rect.w - wall.x;
    const overlapLeft = wall.x + wall.w - rect.x;
    const overlapBottom = rect.y + rect.h - wall.y;
    const overlapTop = wall.y + wall.h - rect.y;
    const pushX = frogCenterX < wallCenterX ? -overlapRight : overlapLeft;
    const pushY = frogCenterY < wallCenterY ? -overlapBottom : overlapTop;

    if (Math.abs(pushX) < Math.abs(pushY)) {
      state.frog.x = clamp(state.frog.x + pushX + Math.sign(pushX || 1) * 0.75, 28, state.worldSize - 28);
    } else {
      state.frog.y = clamp(state.frog.y + pushY + Math.sign(pushY || 1) * 0.75, 36, state.worldSize - 36);
    }
  }
  return true;
}

function isInWater(state) {
  const rect = frogRect(state, 8);
  return state.active.water.some((water) => rectsOverlap(rect, water));
}

function isOnLilyPad(state) {
  const rect = frogRect(state, 6);
  return state.active.lilyPads.some((pad) => (
    rectsOverlap(rect, { x: pad.x - 34, y: pad.y - 22, w: 68, h: 44 })
  ));
}

export function getDayInfo() {
  const cycleLength = DAY_DURATION + NIGHT_DURATION;
  const cycleTime = getSyncedSeconds() % cycleLength;
  const isDay = cycleTime < DAY_DURATION;
  const remaining = isDay ? DAY_DURATION - cycleTime : cycleLength - cycleTime;
  const dayElapsed = isDay ? cycleTime : 0;
  return {
    isDay,
    phase: isDay ? "Day" : "Night",
    remaining,
    dayElapsed,
    birdSlot: isDay ? Math.floor(dayElapsed / BIRD_INTERVAL) : -1,
    label: `${isDay ? "Day" : "Night"} ${formatTime(remaining)}`,
  };
}

function getSyncedSeconds() {
  return Date.now() / 1000;
}

function getSyncedBirdCooldown() {
  const dayInfo = getDayInfo();
  if (!dayInfo.isDay) return BIRD_INTERVAL;
  const elapsedInSlot = dayInfo.dayElapsed % BIRD_INTERVAL;
  return Math.max(1, BIRD_INTERVAL - elapsedInSlot);
}

function updateBirdHazard(state, dt, soundOn) {
  const dayInfo = getDayInfo(state);
  if (!dayInfo.isDay) {
    state.bird = null;
    state.birdCooldown = BIRD_INTERVAL;
    state.lastBirdSlot = -1;
    return;
  }

  if (!state.bird) {
    state.birdCooldown = getSyncedBirdCooldown();
    if (dayInfo.birdSlot !== state.lastBirdSlot && dayInfo.dayElapsed > 3) {
      state.lastBirdSlot = dayInfo.birdSlot;
      state.bird = spawnBird(state);
      setNotice(state, "A bird is circling. Get into water before it dives.", BIRD_WARNING + 1);
      if (soundOn) beep(260, 0.08);
    }
    return;
  }

  const bird = state.bird;
  bird.age += dt;
  if (bird.age < BIRD_WARNING) {
    bird.targetX = state.frog.x;
    bird.targetY = state.frog.y;
    return;
  }

  const progress = clamp((bird.age - BIRD_WARNING) / BIRD_SWOOP, 0, 1);
  const eased = progress * progress * (3 - 2 * progress);
  bird.x = bird.startX + (bird.targetX - bird.startX) * eased;
  bird.y = bird.startY + (bird.targetY - bird.startY) * eased;
  const distance = Math.hypot(state.frog.x - bird.x, state.frog.y - bird.y);

  if (distance < 72 || progress >= 1) {
    if (isInWater(state)) {
      setNotice(state, "The bird missed. Water kept you safe.", 2.6);
      if (soundOn) beep(680, 0.05);
    } else {
      state.score = 0;
      setNotice(state, "A bird got you and stole all your flies. Water is the safe zone.", 3.4);
      if (soundOn) beep(120, 0.1);
    }
    state.bird = null;
    state.birdCooldown = getSyncedBirdCooldown();
  }
}

function updateVehicleHazards(state, soundOn) {
  if (state.hurtCooldown > 0 || state.leapTimer > 0) return;
  const rect = frogRect(state, 5);
  const car = state.active.cars.find((item) => rectsOverlap(rect, getTopDownVehicleRect(item, state.time)));
  if (!car) return;

  state.hurtCooldown = VEHICLE_HIT_COOLDOWN;
  state.score = Math.max(0, state.score - (car.stealsFlies ?? 5));
  const safeSpot = getVehicleRespawnSpot(state);
  state.frog.x = safeSpot.x;
  state.frog.y = safeSpot.y;
  updateCamera(state);
  state.active = getActiveTopDown(state);
  setNotice(state, `${car.name ?? "Traffic"} crashed into you and scattered some flies. Roads are city hazards.`, 3.4);
  if (soundOn) beep(115, 0.12);
}

function getVehicleRespawnSpot(state) {
  const nearbyWater = state.active.water.find((water) => {
    const dx = state.frog.x - (water.x + water.w / 2);
    const dy = state.frog.y - (water.y + water.h / 2);
    return dx * dx + dy * dy < 900 * 900;
  });
  if (nearbyWater) {
    return {
      x: clamp(nearbyWater.x + nearbyWater.w / 2, 28, state.worldSize - 28),
      y: clamp(nearbyWater.y + nearbyWater.h / 2, 36, state.worldSize - 36),
    };
  }
  const checkpoint = state.checkpoints[state.checkpoints.length - 1];
  if (checkpoint) return checkpoint;
  return { x: CENTER - 180, y: CENTER + 420 };
}

function spawnBird(state) {
  const fromLeft = Math.random() > 0.5;
  return {
    age: 0,
    startX: state.cameraX + (fromLeft ? -260 : viewportWidth(state) + 260),
    startY: state.cameraY - 190,
    targetX: state.frog.x,
    targetY: state.frog.y,
    x: state.frog.x,
    y: state.frog.y,
  };
}

function collectTopDownPickups(state, soundOn) {
  const rect = frogRect(state, 2);
  for (const pickup of state.active.pickups) {
    if (state.collectedPickups.has(pickup.id)) continue;
    if (pickup.currency === "flies") continue;
    const pickupRect = { x: pickup.x - 14, y: pickup.y - 14, w: 28, h: 28 };
    if (rectsOverlap(rect, pickupRect)) {
      state.collectedPickups.add(pickup.id);
      addCurrency(state, pickup.currency, pickup.value);
      setNotice(state, `Collected ${pickup.value} ${currencyLabel(pickup.currency)}.`);
      if (soundOn) beep(pickup.currency === "flies" ? 900 : 720, 0.04);
    }
  }
}

function discoverStructures(state, soundOn) {
  for (const item of state.active.structures) {
    if (item.fixed || state.discoveredStructures.has(item.id)) continue;
    if (item.type === "tree") continue;
    const dx = state.frog.x - item.x;
    const dy = state.frog.y - item.y;
    if (dx * dx + dy * dy < 95 * 95) {
      state.discoveredStructures.add(item.id);
      const bonus = item.type === "cart" ? "amber" : item.type === "garden" ? "pearls" : "flies";
      addCurrency(state, bonus, bonus === "flies" ? 2 : 1);
      setNotice(state, `Found a ${structureName(item.type)} with ${currencyLabel(bonus)} inside.`);
      if (soundOn) beep(980, 0.05);
      return;
    }
  }
}

export function findNearbyTopDownPlace(state) {
  return getTopDownPlaces(state).find((place) => {
    const dx = state.frog.x - place.x;
    const dy = state.frog.y - place.y;
    return dx * dx + dy * dy < 125 * 125;
  }) ?? null;
}

function getTopDownPlaces(state) {
  const activePlaces = state.active.structures.filter((item) => item.kind === "parkour" || item.kind === "playerHouse");
  const places = [...URBAN_FEATURES.places, ...activePlaces];
  if (state.playerHouse && !places.some((place) => place.id === state.playerHouse.id)) {
    places.push(state.playerHouse);
  }
  return places;
}

export function getCurrentPickaxe(state) {
  return PICKAXES.find((pickaxe) => pickaxe.tier === state.pickaxeTier) ?? PICKAXES[0];
}

export function findNearbyMineableWall(state) {
  if (state.pickaxeTier <= 0) return null;
  let nearest = null;
  let nearestDistance = Infinity;
  const frogCenter = { x: state.frog.x, y: state.frog.y };
  for (const wall of state.active.walls) {
    if (wall.mineable === false || state.minedWalls.has(wall.id)) continue;
    const closestX = clamp(frogCenter.x, wall.x, wall.x + wall.w);
    const closestY = clamp(frogCenter.y, wall.y, wall.y + wall.h);
    const dx = frogCenter.x - closestX;
    const dy = frogCenter.y - closestY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < MINE_RANGE && distance < nearestDistance) {
      nearest = wall;
      nearestDistance = distance;
    }
  }
  return nearest ?? findNearbyMineableWater(state);
}

function findNearbyMineableWater(state) {
  if (state.pickaxeTier <= 0) return null;
  let nearest = null;
  let nearestDistance = Infinity;
  const frogCenter = { x: state.frog.x, y: state.frog.y };
  for (const water of state.active.water) {
    const closestX = clamp(frogCenter.x, water.x, water.x + water.w);
    const closestY = clamp(frogCenter.y, water.y, water.y + water.h);
    const dx = frogCenter.x - closestX;
    const dy = frogCenter.y - closestY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < MINE_RANGE && distance < nearestDistance) {
      nearest = { ...water, resourceType: "water", material: "water" };
      nearestDistance = distance;
    }
  }
  return nearest;
}

export function returnFromParkourHouse(state, soundOn) {
  if (state.parkourEntryPoint) {
    state.frog.x = state.parkourEntryPoint.x;
    state.frog.y = state.parkourEntryPoint.y;
    state.parkourEntryPoint = null;
    updateCamera(state);
    state.active = getActiveTopDown(state);
    setNotice(state, "Returned from parkour house.", 1.5);
    if (soundOn) beep(640, 0.05);
  }
}

export function interactTopDownPlace(state, soundOn) {
  const place = findNearbyTopDownPlace(state);
  if (!place) {
    setNotice(state, "No top-down shop nearby.");
    return false;
  }

  if (place.kind === "parkour") {
    state.parkourEntryPoint = { x: state.frog.x, y: state.frog.y };
    setNotice(state, "Entering a short platformer parkour house. Clear it to earn a part.", 2);
    if (soundOn) beep(900, 0.06);
    return { mode: "platformer", entry: `parkour:${place.id}` };
  }

  if (place.kind === "playerHouse") {
    setNotice(state, "Entering your house interior. Spend platformer rewards to decorate.", 2);
    if (soundOn) beep(780, 0.06);
    return { mode: "platformer", entry: "houseInterior" };
  }

  if (place.kind === "market") {
    setNotice(state, "Entering Market Hall. Clear the short parkour inside to use shops.", 2);
    if (soundOn) beep(820, 0.06);
    return { mode: "platformer", entry: "shop" };
  }

  return false;
}

export function buildTopDownHouse(state, soundOn) {
  if (state.playerHouse) {
    setNotice(state, "Your house is already placed. Press E near it to edit the inside.");
    return null;
  }
  if (state.score < HOUSE_COST.flies || state.pearls < HOUSE_COST.pearls || state.amber < HOUSE_COST.amber) {
    setNotice(state, `House costs ${HOUSE_COST.flies} flies, ${HOUSE_COST.pearls} pearls, and ${HOUSE_COST.amber} amber.`);
    if (soundOn) beep(160, 0.04);
    return null;
  }

  state.score -= HOUSE_COST.flies;
  state.pearls -= HOUSE_COST.pearls;
  state.amber -= HOUSE_COST.amber;
  const house = makePlayerHouse(state.frog.x + 92, state.frog.y - 6, 1);
  state.playerHouse = house;
  state.houseLevel = 1;
  setNotice(state, "House placed. Press E near it to edit inside in platformer mode.", 3.2);
  if (soundOn) beep(1040, 0.07);
  return { x: house.x, y: house.y, level: 1 };
}

export function mineNearbyWall(state, soundOn) {
  const pickaxe = getCurrentPickaxe(state);
  if (pickaxe.tier <= 0) {
    setNotice(state, "You need to buy the basic pickaxe before mining walls or water.");
    if (soundOn) beep(150, 0.04);
    return false;
  }

  const resource = findNearbyMineableWall(state);
  if (!resource) {
    setNotice(state, "No mineable wall or water close enough. Stand beside one and press M.");
    return false;
  }

  if (resource.resourceType === "water") {
    addMaterial(state, "water", 1);
    setNotice(state, `${pickaxe.name} bottled a water block. Press V to place mined resources.`);
    if (soundOn) beep(760, 0.05);
    return true;
  }

  const wall = resource;
  const material = WALL_MATERIALS[wall.material ?? "clay"] ?? WALL_MATERIALS.clay;
  if (pickaxe.maxWallTier < material.tier) {
    setNotice(state, `${pickaxe.name} cannot mine ${material.name}. Upgrade your pickaxe material.`);
    if (soundOn) beep(150, 0.04);
    return false;
  }

  const damage = (state.wallDamage.get(wall.id) ?? 0) + 1;
  const requiredHits = Math.max(1, Math.min(material.hp, pickaxe.hits));
  if (damage >= requiredHits) {
    state.wallDamage.delete(wall.id);
    state.minedWalls.add(wall.id);
    state.active.walls = state.active.walls.filter((item) => item.id !== wall.id);
    addMaterial(state, wall.material ?? "clay", 1);
    setNotice(state, `${pickaxe.name} mined a ${material.name}. You gained ${material.name.toLowerCase()} material.`);
    if (soundOn) beep(1040, 0.06);
    return true;
  }

  state.wallDamage.set(wall.id, damage);
  setNotice(state, `${material.name} cracked ${damage}/${requiredHits}.`);
  if (soundOn) beep(520, 0.04);
  return true;
}

export function cycleTopDownPlaceable(state, soundOn) {
  const available = PLACEABLE_MATERIALS.filter((material) => (state.materials[material] ?? 0) > 0);
  if (!available.length) {
    setNotice(state, "Mine water, walls, or trees before placing resources.");
    if (soundOn) beep(150, 0.04);
    return false;
  }
  const currentIndex = available.indexOf(state.selectedPlaceable);
  state.selectedPlaceable = available[(currentIndex + 1 + available.length) % available.length];
  setNotice(state, `Selected ${state.selectedPlaceable}. Press V to place it.`, 1.8);
  if (soundOn) beep(560, 0.035);
  return true;
}

export function placeTopDownMaterial(state, soundOn) {
  const selected = resolveSelectedPlaceable(state);
  if (!selected) {
    setNotice(state, "Mine water, walls, or trees before placing resources.");
    if (soundOn) beep(150, 0.04);
    return false;
  }

  const material = selected;
  const isWater = material === "water";
  const w = isWater ? 104 : 68;
  const h = isWater ? 72 : 54;
  const point = getPlacementPoint(state, 180);
  const rect = findMaterialPlacementRect(state, point, w, h, isWater);
  if (!rect) {
    setNotice(state, isWater ? "Aim at a nearby open spot to pour water." : "Aim at an open nearby spot for that block.");
    if (soundOn) beep(150, 0.04);
    return false;
  }

  state.materials[material] -= 1;
  const placed = {
    id: `placed-${material}-${Math.round(state.time * 1000)}-${state.placedMaterials.length + 1}`,
    material,
    ...rect,
    placed: true,
  };
  state.placedMaterials.push(placed);
  state.active = getActiveTopDown(state);
  state.selectedPlaceable = firstAvailableMaterial(state.materials, state.selectedPlaceable);
  setNotice(state, `Placed ${material}. ${isWater ? "Lily pads can go on placed water." : "Solid blocks can shape paths."}`, 2.4);
  if (soundOn) beep(isWater ? 760 : 620, 0.05);
  return true;
}

export function chopNearbyTree(state, soundOn) {
  const frogRect = { x: state.frog.x - 38, y: state.frog.y - 38, w: 76, h: 76 };
  const tree = state.active.structures.find((item) => 
    !state.choppedTrees.has(item.id) &&
    item.type === "tree" && rectsOverlap(frogRect, {
      x: item.x - item.w / 2,
      y: item.y - item.h / 2,
      w: item.w,
      h: item.h,
    })
  );

  if (!tree) {
    setNotice(state, "No trees close enough. Use your tongue near a tree to chop it down.");
    return false;
  }

  return damageTopDownTree(state, tree, soundOn);
}

function damageTopDownTree(state, tree, soundOn) {
  const damage = (state.wallDamage.get(tree.id) ?? 0) + 1;
  const requiredHits = tree.health ?? 3;
  
  if (damage >= requiredHits) {
    state.wallDamage.delete(tree.id);
    state.choppedTrees.add(tree.id);
    state.active.structures = state.active.structures.filter((item) => item.id !== tree.id);
    addMaterial(state, "wood", 4);
    setNotice(state, "Tree chopped down. Gained 4 wood.");
    if (soundOn) beep(880, 0.07);
    return true;
  }

  state.wallDamage.set(tree.id, damage);
  setNotice(state, `Tree damaged ${damage}/${requiredHits}.`);
  if (soundOn) beep(660, 0.04);
  return true;
}

function updateTopDownTongue(state, pointer, dt, soundOn) {
  const tongue = state.tongue;
  if (!tongue.active) {
    if (pointer.down && state.tongueCooldown <= 0) {
      startTopDownTongue(state, pointer);
    }
    return;
  }

  const mouthX = state.frog.x + state.frog.facing * 20;
  const mouthY = state.frog.y - 8;
  const target = tongue.returning ? 0 : tongue.targetLength;
  const direction = tongue.returning ? -1 : 1;
  tongue.length += direction * TOP_DOWN_TONGUE_SPEED * dt;
  tongue.length = clamp(tongue.length, 0, tongue.targetLength);
  tongue.tipX = mouthX + Math.cos(tongue.angle) * tongue.length;
  tongue.tipY = mouthY + Math.sin(tongue.angle) * tongue.length;

  if (!tongue.returning) {
    const fly = state.active.pickups.find((pickup) => (
      pickup.currency === "flies" &&
      !state.collectedPickups.has(pickup.id) &&
      lineCircleHit(mouthX, mouthY, tongue.tipX, tongue.tipY, pickup.x, pickup.y, 18)
    ));
    if (fly) {
      tongue.caughtPickupId = fly.id;
      tongue.returning = true;
      state.collectedPickups.add(fly.id);
      addCurrency(state, "flies", fly.value ?? 1);
      setNotice(state, `Tongue caught ${fly.value ?? 1} flies.`);
      if (soundOn) beep(920, 0.035);
    }

    if (!tongue.returning) {
      const tree = state.active.structures.find((item) => (
        item.type === "tree" &&
        !state.choppedTrees.has(item.id) &&
        lineCircleHit(mouthX, mouthY, tongue.tipX, tongue.tipY, item.x, item.y - 16, 36)
      ));
      if (tree) {
        tongue.hitTreeId = tree.id;
        tongue.returning = true;
        damageTopDownTree(state, tree, soundOn);
      }
    }

    if (Math.abs(tongue.length - target) < 1) {
      tongue.hold += dt;
      if (tongue.hold > TOP_DOWN_TONGUE_HOLD) {
        tongue.returning = true;
      }
    }
  }

  if (tongue.returning && tongue.length <= 1) {
    tongue.active = false;
    tongue.caughtPickupId = null;
    tongue.hitTreeId = null;
    state.tongueCooldown = TOP_DOWN_TONGUE_COOLDOWN;
  }
}

function startTopDownTongue(state, pointer) {
  const mouthX = state.frog.x + state.frog.facing * 20;
  const mouthY = state.frog.y - 8;
  const dx = pointer.x - mouthX;
  const dy = pointer.y - mouthY;
  const distance = Math.sqrt(dx * dx + dy * dy) || 1;
  state.tongue = {
    active: true,
    returning: false,
    hold: 0,
    length: 0,
    targetLength: Math.min(distance, TOP_DOWN_TONGUE_MAX),
    angle: Math.atan2(dy, dx),
    caughtPickupId: null,
    hitTreeId: null,
    tipX: mouthX,
    tipY: mouthY,
  };
  state.frog.facing = dx < 0 ? -1 : 1;
  return true;
}

export function drawTopDownGame(ctx, state) {
  ctx.clearRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  drawGround(ctx, state);

  ctx.save();
  ctx.scale(state.zoom, state.zoom);
  ctx.translate(-state.cameraX, -state.cameraY);
  drawWater(ctx, state);
  drawParks(ctx, state);
  drawRoads(ctx, state);
  drawLilyPads(ctx, state);
  drawWalls(ctx, state);
  drawStructures(ctx, state);
  drawFoliage(ctx, state);
  drawVehicles(ctx, state);
  drawCheckpoints(ctx, state);
  drawTopDownPickups(ctx, state);
  drawBird(ctx, state);
  drawTopDownTongue(ctx, state);
  drawFrog(ctx, state);
  ctx.restore();
  drawDayNightOverlay(ctx, state);
}

function drawCheckpoints(ctx, state) {
  for (const checkpoint of state.checkpoints) {
    const visible = isVisible({ x: checkpoint.x - 60, y: checkpoint.y - 70, w: 120, h: 120 }, state.cameraX - ACTIVE_MARGIN, state.cameraY - ACTIVE_MARGIN, state.cameraX + viewportWidth(state) + ACTIVE_MARGIN, state.cameraY + viewportHeight(state) + ACTIVE_MARGIN);
    if (!visible) continue;
    const pulse = 1 + Math.sin(state.time * 4 + checkpoint.createdAt) * 0.08;
    ctx.save();
    ctx.translate(checkpoint.x, checkpoint.y);
    ctx.fillStyle = state.teleportMenuOpen ? "rgba(255, 223, 93, 0.42)" : "rgba(255, 223, 93, 0.26)";
    ctx.beginPath();
    ctx.arc(0, 0, 42 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffdf5d";
    roundRect(ctx, -16, -34, 32, 48, 7);
    ctx.fill();
    ctx.fillStyle = "#2f7d46";
    ctx.beginPath();
    ctx.moveTo(0, -52);
    ctx.lineTo(34, -35);
    ctx.lineTo(0, -18);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#173820";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, -34);
    ctx.lineTo(0, 24);
    ctx.stroke();
    if (state.teleportMenuOpen) {
      ctx.fillStyle = "#173820";
      ctx.font = "900 18px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(checkpoint.label, 0, -66);
    }
    ctx.restore();
  }
}

function drawGround(ctx, state) {
  ctx.fillStyle = "#b7df9c";
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  ctx.fillStyle = "rgba(244, 255, 218, 0.26)";
  const softStartX = -((state.cameraX * 0.35) % 140);
  const softStartY = -((state.cameraY * 0.35) % 110);
  for (let y = softStartY; y < VIEW_HEIGHT + 80; y += 110) {
    for (let x = softStartX; x < VIEW_WIDTH + 80; x += 140) {
      ctx.beginPath();
      ctx.ellipse(x, y, 38, 10, -0.15, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const startX = -((state.cameraX * 0.62) % 46);
  const startY = -((state.cameraY * 0.62) % 38);
  ctx.lineCap = "round";
  for (let y = startY; y < VIEW_HEIGHT + 44; y += 38) {
    for (let x = startX; x < VIEW_WIDTH + 46; x += 46) {
      const worldX = state.cameraX + x;
      const worldY = state.cameraY + y;
      const sway = Math.sin(worldX * 0.037 + worldY * 0.021) * 4;
      const height = 8 + Math.abs(Math.sin(worldX * 0.019 - worldY * 0.026)) * 7;
      ctx.strokeStyle = "rgba(59, 128, 58, 0.32)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y + 7);
      ctx.lineTo(x + sway, y + 7 - height);
      ctx.moveTo(x + 8, y + 7);
      ctx.lineTo(x + 8 + sway * 0.6, y + 1 - height * 0.72);
      ctx.stroke();
      if ((Math.floor(worldX + worldY) % 5) === 0) {
        ctx.strokeStyle = "rgba(232, 248, 166, 0.38)";
        ctx.beginPath();
        ctx.moveTo(x - 6, y + 6);
        ctx.lineTo(x - 2, y - 3);
        ctx.stroke();
      }
    }
  }
}

function drawBird(ctx, state) {
  if (!state.bird) return;
  const bird = state.bird;
  const warning = bird.age < BIRD_WARNING;
  const x = warning ? bird.targetX : bird.x;
  const y = warning ? bird.targetY : bird.y;
  ctx.save();
  if (warning) {
    const pulse = 1 + Math.sin(state.time * 7) * 0.08;
    ctx.strokeStyle = "rgba(180, 54, 47, 0.72)";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(x, y, 92 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(180, 54, 47, 0.12)";
    ctx.beginPath();
    ctx.arc(x, y, 92 * pulse, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.translate(x, y);
    ctx.rotate(Math.sin(state.time * 3) * 0.1);
    ctx.fillStyle = "#2f3532";
    ctx.beginPath();
    ctx.ellipse(0, 0, 34, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3f4944";
    ctx.beginPath();
    ctx.ellipse(-38, 0, 58, 14, -0.28, 0, Math.PI * 2);
    ctx.ellipse(38, 0, 58, 14, 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#c98631";
    ctx.beginPath();
    ctx.moveTo(31, -2);
    ctx.lineTo(52, 5);
    ctx.lineTo(31, 12);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawDayNightOverlay(ctx, state) {
  const dayInfo = getDayInfo(state);
  if (!dayInfo.isDay) {
    ctx.fillStyle = "rgba(19, 28, 62, 0.28)";
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    return;
  }
  if (state.bird) {
    ctx.fillStyle = "rgba(255, 210, 72, 0.08)";
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  }
}

function spawnOffroadCars(state) {
  const SPAWN_INTERVAL = 30;
  state.carSpawnTimer += 1 / 60;
  
  if (state.carSpawnTimer >= SPAWN_INTERVAL) {
    state.carSpawnTimer = 0;
    const carId = `offroad-car-${state.time.toString().replace(".", "-")}`;
    const colors = ["#e65b4f", "#f5a962", "#2d7ab8", "#c76b3a", "#7b4b8a", "#4a9d6f"];
    const spawnX = CENTER + (Math.random() - 0.5) * 2000;
    const spawnY = CENTER + (Math.random() - 0.5) * 2000;
    const isHorizontal = Math.random() > 0.5;
    const car = {
      id: carId,
      name: "Offroad car",
      x: spawnX,
      y: spawnY,
      w: isHorizontal ? 200 : 100,
      h: isHorizontal ? 100 : 200,
      carW: 82,
      carH: 30,
      speed: 120 + Math.random() * 80,
      offset: Math.random(),
      direction: Math.random() > 0.5 ? 1 : -1,
      axis: isHorizontal ? "x" : "y",
      color: colors[Math.floor(Math.random() * colors.length)],
      stealsFlies: 5,
      offroad: true,
    };
    state.spawnedCars.push(car);
  }
  
  // Remove cars that are far away
  state.spawnedCars = state.spawnedCars.filter((car) => {
    const distToCam = Math.hypot(
      (car.axis === "x" ? car.x : car.x + car.w / 2) - (state.cameraX + VIEW_WIDTH / 2),
      (car.axis === "y" ? car.y : car.y + car.h / 2) - (state.cameraY + VIEW_HEIGHT / 2)
    );
    return distToCam < 3000;
  });
}

function drawRoads(ctx, state) {
  for (const road of state.active.roads) {
    ctx.fillStyle = road.kind === "crosswalk" ? "#485052" : "#394143";
    roundRect(ctx, road.x, road.y, road.w, road.h, 8);
    ctx.fill();
    if (road.kind === "crosswalk") {
      ctx.fillStyle = "rgba(255, 255, 255, 0.74)";
      if (road.w > road.h) {
        for (let x = road.x + 22; x < road.x + road.w - 20; x += 38) {
          ctx.fillRect(x, road.y + 14, 18, road.h - 28);
        }
      } else {
        for (let y = road.y + 22; y < road.y + road.h - 20; y += 38) {
          ctx.fillRect(road.x + 16, y, road.w - 32, 18);
        }
      }
      continue;
    }
    ctx.strokeStyle = "rgba(255, 226, 122, 0.78)";
    ctx.lineWidth = 4;
    ctx.setLineDash([30, 26]);
    ctx.beginPath();
    if (road.w > road.h) {
      ctx.moveTo(road.x + 20, road.y + road.h / 2);
      ctx.lineTo(road.x + road.w - 20, road.y + road.h / 2);
    } else {
      ctx.moveTo(road.x + road.w / 2, road.y + 20);
      ctx.lineTo(road.x + road.w / 2, road.y + road.h - 20);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawVehicles(ctx, state) {
  for (const car of state.active.cars) {
    const rect = getTopDownVehicleRect(car, state.time);
    ctx.save();
    ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
    if (car.axis === "y") {
      ctx.rotate(Math.PI / 2);
    }
    if (car.direction === -1) {
      ctx.rotate(Math.PI);
    }
    ctx.fillStyle = "rgba(18, 26, 23, 0.25)";
    roundRect(ctx, -rect.w / 2 + 4, -rect.h / 2 + 8, rect.w - 8, rect.h, 9);
    ctx.fill();
    ctx.fillStyle = car.color ?? "#e65b4f";
    roundRect(ctx, -rect.w / 2, -rect.h / 2, rect.w, rect.h, 9);
    ctx.fill();
    ctx.fillStyle = "rgba(222, 246, 255, 0.78)";
    roundRect(ctx, -rect.w / 4, -rect.h / 2 + 5, rect.w / 2, 10, 4);
    ctx.fill();
    ctx.fillStyle = "#fff0a8";
    const headlightX = car.direction === -1 ? rect.w / 2 - 14 : -rect.w / 2 + 8;
    ctx.fillRect(headlightX, -rect.h / 2 + 5, 6, 8);
    ctx.fillRect(headlightX, rect.h / 2 - 13, 6, 8);
    ctx.restore();
  }
}

function getTopDownVehicleRect(car, time) {
  const vehicleW = car.carW ?? 82;
  const vehicleH = car.carH ?? Math.max(30, car.h - 18);
  const laneLength = Math.max(vehicleW, (car.axis === "y" ? car.h : car.w) - vehicleW);
  const cycle = laneLength / car.speed;
  const shiftedTime = (time + (car.offset ?? 0) * cycle) % cycle;
  const progress = shiftedTime / cycle;
  const travel = car.direction === -1 ? laneLength - progress * laneLength : progress * laneLength;
  if (car.axis === "y") {
    return {
      x: car.x + car.w / 2 - vehicleH / 2,
      y: car.y + travel,
      w: vehicleH,
      h: vehicleW,
    };
  }
  return {
    x: car.x + travel,
    y: car.y + car.h / 2 - vehicleH / 2,
    w: vehicleW,
    h: vehicleH,
  };
}

function drawWater(ctx, state) {
  for (const water of state.active.water) {
    ctx.fillStyle = water.urban ? "#229ab2" : "#2d9eb4";
    roundRect(ctx, water.x, water.y, water.w, water.h, water.round ?? 16);
    ctx.fill();
    ctx.strokeStyle = "rgba(225, 252, 255, 0.48)";
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}

function drawParks(ctx, state) {
  for (const park of state.active.parks) {
    ctx.fillStyle = "#59b85f";
    roundRect(ctx, park.x, park.y, park.w, park.h, 10);
    ctx.fill();
    ctx.fillStyle = "#82d46b";
    for (let x = park.x + 22; x < park.x + park.w - 10; x += 42) {
      for (let y = park.y + 22; y < park.y + park.h - 10; y += 36) {
        ctx.fillRect(x, y, 18, 5);
      }
    }
  }
}

function drawWalls(ctx, state) {
  for (const wall of state.active.walls) {
    const material = WALL_MATERIALS[wall.material ?? "clay"] ?? WALL_MATERIALS.clay;
    const damage = state.wallDamage.get(wall.id) ?? 0;
    ctx.fillStyle = material.color ?? wall.color ?? "#737c78";
    roundRect(ctx, wall.x, wall.y, wall.w, wall.h, 8);
    ctx.fill();
    ctx.fillStyle = material.shine ?? "rgba(255,255,255,0.18)";
    ctx.globalAlpha = 0.32;
    ctx.fillRect(wall.x + 10, wall.y + 9, Math.max(20, wall.w - 20), 10);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "rgba(35, 42, 38, 0.22)";
    ctx.lineWidth = 3;
    ctx.stroke();
    if (damage > 0) {
      ctx.strokeStyle = "#2d251f";
      ctx.lineWidth = 3;
      for (let i = 0; i < damage; i += 1) {
        const crackX = wall.x + 22 + ((i * 53) % Math.max(24, wall.w - 44));
        const crackY = wall.y + 18 + ((i * 37) % Math.max(20, wall.h - 36));
        ctx.beginPath();
        ctx.moveTo(crackX, crackY);
        ctx.lineTo(crackX + 18, crackY + 15);
        ctx.lineTo(crackX + 8, crackY + 30);
        ctx.stroke();
      }
    }
  }
}

function drawLilyPads(ctx, state) {
  for (const pad of state.active.lilyPads) {
    const bob = Math.sin(state.time * 3 + pad.phase) * 2;
    ctx.fillStyle = pad.placed ? "#8bdc4e" : "#73c957";
    ctx.beginPath();
    ctx.ellipse(pad.x, pad.y + bob, 32, 19, -0.15, 0.22, Math.PI * 2.05);
    ctx.lineTo(pad.x, pad.y + bob);
    ctx.fill();
    ctx.strokeStyle = pad.placed ? "#ffdf5d" : "#dff56d";
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}

function drawStructures(ctx, state) {
  for (const item of state.active.structures) {
    const found = item.fixed || state.discoveredStructures.has(item.id);
    ctx.save();
    ctx.translate(item.x, item.y);
    ctx.globalAlpha = found ? 1 : 0.72;
    if (item.type === "marketHall") {
      drawShop(ctx, item, "#9d6cc7", "MK");
    } else if (item.type === "parkourHouse") {
      drawHousePortal(ctx, item, "#5fcb55", "PK");
    } else if (item.type === "playerHouse") {
      drawHousePortal(ctx, item, "#ffdf5d", `L${item.level ?? 1}`);
    } else if (item.type === "urbanBuilding") {
      drawCityBuilding(ctx, item);
    } else if (item.type === "ruin") {
      ctx.fillStyle = "#77837d";
      roundRect(ctx, -item.w / 2, -item.h / 2, item.w, item.h, 7);
      ctx.fill();
      ctx.fillStyle = "#b7c0b9";
      ctx.fillRect(-item.w / 2 + 12, -item.h / 2 + 10, 18, item.h - 20);
      ctx.fillRect(item.w / 2 - 30, -item.h / 2 + 10, 18, item.h - 20);
    } else if (item.type === "garden") {
      ctx.fillStyle = "#5ba35f";
      roundRect(ctx, -item.w / 2, -item.h / 2, item.w, item.h, 8);
      ctx.fill();
      ctx.fillStyle = "#f5d269";
      for (let i = 0; i < 5; i += 1) {
        ctx.beginPath();
        ctx.arc(-item.w / 3 + i * 18, -4 + (i % 2) * 14, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (item.type === "cart") {
      ctx.fillStyle = "#a46f3a";
      roundRect(ctx, -item.w / 2, -item.h / 2, item.w, item.h * 0.62, 7);
      ctx.fill();
      ctx.fillStyle = "#2b3029";
      ctx.beginPath();
      ctx.arc(-item.w / 3, item.h / 2 - 12, 8, 0, Math.PI * 2);
      ctx.arc(item.w / 3, item.h / 2 - 12, 8, 0, Math.PI * 2);
      ctx.fill();
    } else if (item.type === "tree") {
      const damage = state.wallDamage.get(item.id) ?? 0;
      // Tree trunk
      ctx.fillStyle = "#6b4423";
      roundRect(ctx, -8, -12, 16, 26, 4);
      ctx.fill();
      // Tree canopy
      ctx.fillStyle = "#3a7b2d";
      ctx.beginPath();
      ctx.ellipse(0, -20, 28, 24, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#4a9c35";
      ctx.beginPath();
      ctx.ellipse(0, -18, 24, 20, 0, 0, Math.PI * 2);
      ctx.fill();
      if (damage > 0) {
        ctx.strokeStyle = "rgba(255, 100, 100, 0.72)";
        ctx.lineWidth = 3;
        for (let i = 0; i < damage; i += 1) {
          ctx.beginPath();
          ctx.moveTo(-18 + i * 12, -34);
          ctx.lineTo(-3 + i * 10, -9);
          ctx.stroke();
        }
      }
    } else {
      ctx.fillStyle = item.color;
      roundRect(ctx, -item.w / 2, -item.h / 2 + 10, item.w, item.h - 10, 8);
      ctx.fill();
      ctx.fillStyle = "#df6756";
      ctx.beginPath();
      ctx.moveTo(-item.w / 2 - 6, -item.h / 2 + 12);
      ctx.lineTo(0, -item.h / 2 - 24);
      ctx.lineTo(item.w / 2 + 6, -item.h / 2 + 12);
      ctx.closePath();
      ctx.fill();
    }
    if (!found) {
      ctx.fillStyle = "rgba(19, 36, 26, 0.5)";
      ctx.font = "900 18px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("?", 0, -item.h / 2 - 10);
    }
    if (state.nearbyPlaceId === item.id) {
      ctx.strokeStyle = "#ffdf5d";
      ctx.lineWidth = 5;
      roundRect(ctx, -item.w / 2 - 8, -item.h / 2 - 8, item.w + 16, item.h + 16, 10);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawStructureSprite(ctx, image, item) {
  const ratio = image.naturalWidth / image.naturalHeight || 1;
  const drawH = item.h + 42;
  const drawW = Math.min(item.w + 58, drawH * ratio);
  ctx.drawImage(image, -drawW / 2, -drawH / 2 - 16, drawW, drawH);
}

function drawHousePortal(ctx, item, roofColor, label) {
  ctx.fillStyle = "#f3c176";
  roundRect(ctx, -item.w / 2, -item.h / 2 + 12, item.w, item.h - 12, 8);
  ctx.fill();
  ctx.fillStyle = roofColor;
  ctx.beginPath();
  ctx.moveTo(-item.w / 2 - 12, -item.h / 2 + 18);
  ctx.lineTo(0, -item.h / 2 - 36);
  ctx.lineTo(item.w / 2 + 12, -item.h / 2 + 18);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#7a5938";
  roundRect(ctx, -16, 6, 32, 42, 5);
  ctx.fill();
  ctx.fillStyle = "#173820";
  ctx.font = "900 17px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(label, 0, -3);
}

function drawShop(ctx, item, color, label) {
  ctx.fillStyle = "#f2d095";
  roundRect(ctx, -item.w / 2, -item.h / 2, item.w, item.h, 8);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-item.w / 2 - 10, -item.h / 2 + 18);
  ctx.lineTo(0, -item.h / 2 - 34);
  ctx.lineTo(item.w / 2 + 10, -item.h / 2 + 18);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#173820";
  ctx.font = "900 18px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(label, 0, 8);
}

function drawCityBuilding(ctx, item) {
  ctx.fillStyle = item.color ?? "#748189";
  roundRect(ctx, -item.w / 2, -item.h / 2, item.w, item.h, 8);
  ctx.fill();
  ctx.fillStyle = "rgba(255, 240, 160, 0.72)";
  for (let x = -item.w / 2 + 18; x < item.w / 2 - 14; x += 28) {
    for (let y = -item.h / 2 + 18; y < item.h / 2 - 12; y += 26) {
      ctx.fillRect(x, y, 12, 10);
    }
  }
}

function drawFoliage(ctx, state) {
  for (const item of state.active.foliage) {
    const baseColor = item.tint === "dark" ? "#3d6b22" : "#5ba35f";
    const scale = item.scale || 1;

    if (item.type === "bush") {
      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.fillStyle = baseColor;
      ctx.beginPath();
      ctx.ellipse(0, 0, 24 * scale, 18 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
      ctx.beginPath();
      ctx.ellipse(8, 6, 14 * scale, 8 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (item.type === "wildflower") {
      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.fillStyle = baseColor;
      ctx.fillRect(-2 * scale, -12 * scale, 4 * scale, 12 * scale);
      ctx.fillStyle = "#ff8fa0";
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2;
        const x = Math.cos(angle) * 8 * scale;
        const y = -12 * scale + Math.sin(angle) * 6 * scale;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else if (item.type === "grass_clump") {
      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.fillStyle = baseColor;
      for (let i = 0; i < 4; i++) {
        const offset = i * 6 * scale;
        ctx.beginPath();
        ctx.moveTo(-8 * scale + offset, 0);
        ctx.quadraticCurveTo(-6 * scale + offset, -16 * scale, -4 * scale + offset, -20 * scale);
        ctx.lineWidth = 2 * scale;
        ctx.stroke();
      }
      ctx.restore();
    } else if (item.type === "tall_grass") {
      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.strokeStyle = baseColor;
      ctx.lineWidth = 3 * scale;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-6 * scale, -12 * scale, -4 * scale, -28 * scale);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(2 * scale, 2 * scale);
      ctx.quadraticCurveTo(8 * scale, -10 * scale, 6 * scale, -26 * scale);
      ctx.stroke();
      ctx.restore();
    } else if (item.type === "tree_urban") {
      ctx.save();
      ctx.translate(item.x, item.y);
      // Trunk
      ctx.fillStyle = "#5a4a3a";
      ctx.fillRect(-6 * scale, -8 * scale, 12 * scale, 16 * scale);
      // Canopy
      ctx.fillStyle = baseColor;
      ctx.beginPath();
      ctx.ellipse(0, -16 * scale, 20 * scale, 18 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (item.type === "shrub_urban") {
      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.fillStyle = baseColor;
      ctx.beginPath();
      ctx.ellipse(0, 0, 16 * scale, 14 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

function drawTopDownPickups(ctx, state) {
  for (const pickup of state.active.pickups) {
    if (state.collectedPickups.has(pickup.id)) continue;
    ctx.save();
    ctx.translate(pickup.x, pickup.y);
    const pulse = 1 + Math.sin(state.time * 4 + pickup.x * 0.01) * 0.12;
    if (pickup.currency === "flies") {
      ctx.rotate(Math.sin(state.time * 10 + pickup.x) * 0.12);
      ctx.fillStyle = "rgba(255,255,255,0.78)";
      ctx.beginPath();
      ctx.ellipse(-8, -5, 10 * pulse, 5, -0.55, 0, Math.PI * 2);
      ctx.ellipse(8, -5, 10 * pulse, 5, 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1c2520";
      ctx.beginPath();
      ctx.ellipse(0, 2, 8, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffe96f";
      ctx.beginPath();
      ctx.arc(4, -1, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      continue;
    }
    ctx.fillStyle = pickup.currency === "pearls" ? "#f6b7ff" : pickup.currency === "amber" ? "#ffbd5f" : "#ffe96f";
    ctx.beginPath();
    ctx.arc(0, 0, 10 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
}

function drawTopDownTongue(ctx, state) {
  const tongue = state.tongue;
  if (!tongue.active) return;
  const mouthX = state.frog.x + state.frog.facing * 20;
  const mouthY = state.frog.y - 8;
  ctx.lineCap = "round";
  ctx.strokeStyle = "#ff6f8e";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(mouthX, mouthY);
  ctx.lineTo(tongue.tipX, tongue.tipY);
  ctx.stroke();
  ctx.strokeStyle = "#ffc2cc";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(mouthX, mouthY);
  ctx.lineTo(tongue.tipX, tongue.tipY);
  ctx.stroke();
  ctx.fillStyle = "#ff4d79";
  ctx.beginPath();
  ctx.arc(tongue.tipX, tongue.tipY, 8, 0, Math.PI * 2);
  ctx.fill();
}

function drawFrog(ctx, state) {
  const frog = state.frog;
  const leaping = state.leapTimer > 0;
  ctx.save();
  ctx.translate(frog.x, frog.y - (leaping ? 16 : 0));
  ctx.scale(frog.facing, 1);
  ctx.fillStyle = leaping ? "rgba(19, 36, 26, 0.2)" : "rgba(19, 36, 26, 0.14)";
  ctx.beginPath();
  ctx.ellipse(0, leaping ? 48 : 31, leaping ? 34 : 29, leaping ? 8 : 9, 0, 0, Math.PI * 2);
  ctx.fill();
  if (imageReady(FROG_SPRITE)) {
    ctx.drawImage(FROG_SPRITE, -31, -35, 62, 72);
    ctx.restore();
    return;
  }
  ctx.fillStyle = leaping ? "#84e45e" : isInWater(state) ? "#5bc88f" : "#5fcb55";
  ctx.beginPath();
  ctx.ellipse(0, 4, 30, 23, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f6ffe8";
  ctx.beginPath();
  ctx.arc(-9, -16, 9, 0, Math.PI * 2);
  ctx.arc(13, -15, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#202820";
  ctx.beginPath();
  ctx.arc(-6, -15, 4, 0, Math.PI * 2);
  ctx.arc(16, -14, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function makeImage(src) {
  const image = new Image();
  image.src = src;
  return image;
}

function imageReady(image) {
  return image.complete && image.naturalWidth > 0;
}

function normalizeMaterials(materials = {}) {
  return {
    ...DEFAULT_MATERIALS,
    ...Object.fromEntries(
      Object.entries(materials).map(([key, value]) => [key, Math.max(0, Number(value) || 0)]),
    ),
  };
}

function firstAvailableMaterial(materials, preferred = null) {
  if (preferred && (materials[preferred] ?? 0) > 0) return preferred;
  return PLACEABLE_MATERIALS.find((material) => (materials[material] ?? 0) > 0) ?? "wood";
}

function resolveSelectedPlaceable(state) {
  const selected = firstAvailableMaterial(state.materials, state.selectedPlaceable);
  if ((state.materials[selected] ?? 0) <= 0) return null;
  state.selectedPlaceable = selected;
  return selected;
}

function getPlacementPoint(state, maxDistance = PLACE_RANGE) {
  const pointer = state.pointer ?? {};
  const hasPointer = Number.isFinite(pointer.x) && Number.isFinite(pointer.y);
  if (hasPointer) {
    const dx = pointer.x - state.frog.x;
    const dy = pointer.y - state.frog.y;
    if (dx * dx + dy * dy <= maxDistance * maxDistance) {
      return {
        x: clamp(pointer.x, 20, state.worldSize - 20),
        y: clamp(pointer.y, 20, state.worldSize - 20),
      };
    }
  }
  return {
    x: clamp(state.frog.x + state.frog.facing * PLACE_RANGE, 20, state.worldSize - 20),
    y: clamp(state.frog.y, 20, state.worldSize - 20),
  };
}

function findWaterAtPoint(state, x, y) {
  return state.active.water.find((water) => (
    x >= water.x &&
    x <= water.x + water.w &&
    y >= water.y &&
    y <= water.y + water.h
  )) ?? null;
}

function findMaterialPlacementRect(state, point, w, h, isWater) {
  const offsets = [
    [0, 0],
    [state.frog.facing * (w + 12), 0],
    [0, -(h + 12)],
    [0, h + 12],
    [-state.frog.facing * (w + 12), 0],
  ];
  for (const [dx, dy] of offsets) {
    const rect = {
      x: clamp(point.x + dx - w / 2, 20, state.worldSize - w - 20),
      y: clamp(point.y + dy - h / 2, 20, state.worldSize - h - 20),
      w,
      h,
    };
    if (!isWater && rectsOverlap(frogRect(state, 4), rect)) continue;
    if (state.active.walls.some((wall) => rectsOverlap(rect, wall))) continue;
    return rect;
  }
  return null;
}

function addMaterial(state, material, amount) {
  if (!PLACEABLE_MATERIALS.includes(material)) return;
  state.materials[material] = (state.materials[material] ?? 0) + amount;
  if (!state.selectedPlaceable || (state.materials[state.selectedPlaceable] ?? 0) <= 0) {
    state.selectedPlaceable = material;
  }
}

function placedMaterialRect(item) {
  return {
    x: item.x,
    y: item.y,
    w: item.w,
    h: item.h,
  };
}

function makeUrbanFeatures() {
  const x = TOP_DOWN_URBAN.x;
  const y = TOP_DOWN_URBAN.y;
  const cx = x + TOP_DOWN_URBAN.w / 2;
  const cy = y + TOP_DOWN_URBAN.h / 2;
  const park = { id: "urban-park", x: cx - 240, y: cy + 145, w: 480, h: 270 };
  const pocketParks = [
    { id: "north-pocket-park", x: cx - 765, y: cy - 470, w: 260, h: 180 },
    { id: "east-pocket-park", x: cx + 500, y: cy + 315, w: 285, h: 190 },
    { id: "south-plaza-park", x: cx - 80, y: cy + 520, w: 345, h: 170 },
  ];
  const water = [
    { id: "park-water-top", x: park.x - 72, y: park.y - 72, w: park.w + 144, h: 74, urban: true, round: 18 },
    { id: "park-water-bottom", x: park.x - 72, y: park.y + park.h - 2, w: park.w + 144, h: 76, urban: true, round: 18 },
    { id: "park-water-left", x: park.x - 72, y: park.y, w: 74, h: park.h, urban: true, round: 18 },
    { id: "park-water-right", x: park.x + park.w - 2, y: park.y, w: 74, h: park.h, urban: true, round: 18 },
    { id: "city-canal-west", x: x + 130, y: y + 120, w: 92, h: TOP_DOWN_URBAN.h - 220, urban: true, round: 14 },
    { id: "city-canal-east", x: x + TOP_DOWN_URBAN.w - 230, y: y + 150, w: 104, h: TOP_DOWN_URBAN.h - 280, urban: true, round: 14 },
    { id: "north-park-water", x: pocketParks[0].x - 38, y: pocketParks[0].y + pocketParks[0].h - 10, w: pocketParks[0].w + 76, h: 62, urban: true, round: 18 },
    { id: "east-park-water", x: pocketParks[1].x - 44, y: pocketParks[1].y - 48, w: pocketParks[1].w + 88, h: 58, urban: true, round: 18 },
    { id: "south-plaza-water", x: pocketParks[2].x + 34, y: pocketParks[2].y - 54, w: pocketParks[2].w - 68, h: 58, urban: true, round: 18 },
  ];
  const roads = [
    { id: "city-main-east-west", x: x - 260, y: cy - 76, w: TOP_DOWN_URBAN.w + 520, h: 152 },
    { id: "city-main-north-south", x: cx - 76, y: y - 240, w: 152, h: TOP_DOWN_URBAN.h + 480 },
    { id: "city-north-long-road", x: x - 180, y: y + 252, w: TOP_DOWN_URBAN.w + 360, h: 104 },
    { id: "city-south-long-road", x: x - 180, y: y + TOP_DOWN_URBAN.h - 360, w: TOP_DOWN_URBAN.w + 360, h: 104 },
    { id: "city-west-long-road", x: x + 335, y: y - 150, w: 104, h: TOP_DOWN_URBAN.h + 300 },
    { id: "city-east-long-road", x: x + TOP_DOWN_URBAN.w - 435, y: y - 150, w: 104, h: TOP_DOWN_URBAN.h + 300 },
    { id: "city-crosswalk-park-east", kind: "crosswalk", x: park.x + park.w + 78, y: cy - 62, w: 72, h: 124 },
    { id: "city-crosswalk-market", kind: "crosswalk", x: cx + 275, y: cy - 76, w: 84, h: 152 },
    { id: "city-crosswalk-west", kind: "crosswalk", x: cx - 76, y: cy + 260, w: 152, h: 72 },
  ];
  const cars = makeUrbanTraffic(roads);
  const shops = [
    {
      id: "market-hall",
      type: "marketHall",
      name: "Market Hall",
      kind: "market",
      x: cx + 370,
      y: cy - 382,
      w: 250,
      h: 150,
      fixed: true,
      talk: "Press E to enter the wood market hall for upgrades, trades, and furniture.",
    },
    {
      id: "parkour-village-house",
      type: "parkourHouse",
      name: "Parkour Village House",
      kind: "parkour",
      x: cx - 635,
      y: cy - 55,
      w: 170,
      h: 120,
      fixed: true,
      talk: "Press E to enter a platformer challenge and earn house parts.",
    },
    {
      id: "canal-parkour-house",
      type: "parkourHouse",
      name: "Canal Parkour House",
      kind: "parkour",
      x: cx + 690,
      y: cy - 30,
      w: 170,
      h: 120,
      fixed: true,
      talk: "Press E for a quick platformer challenge with a house reward.",
    },
    {
      id: "garden-parkour-house",
      type: "parkourHouse",
      name: "Garden Parkour House",
      kind: "parkour",
      x: cx - 360,
      y: cy + 390,
      w: 170,
      h: 120,
      fixed: true,
      talk: "Press E to clear a short parkour section for furniture.",
    },
  ];
  const buildings = [
    { id: "city-block-a", type: "urbanBuilding", x: cx - 630, y: cy + 52, w: 180, h: 150, fixed: true, color: "#76828a" },
    { id: "city-block-b", type: "urbanBuilding", x: cx + 620, y: cy + 60, w: 190, h: 160, fixed: true, color: "#697982" },
    { id: "city-block-c", type: "urbanBuilding", x: cx - 210, y: cy - 315, w: 180, h: 145, fixed: true, color: "#858174" },
    { id: "city-block-d", type: "urbanBuilding", x: cx + 210, y: cy - 320, w: 190, h: 150, fixed: true, color: "#707e79" },
    { id: "city-block-e", type: "urbanBuilding", x: cx - 720, y: cy - 285, w: 170, h: 135, fixed: true, color: "#627984" },
    { id: "city-block-f", type: "urbanBuilding", x: cx + 740, y: cy - 295, w: 180, h: 140, fixed: true, color: "#7d786c" },
    { id: "city-block-g", type: "urbanBuilding", x: cx - 500, y: cy + 375, w: 175, h: 150, fixed: true, color: "#6f7d8f" },
    { id: "city-block-h", type: "urbanBuilding", x: cx + 390, y: cy + 520, w: 160, h: 132, fixed: true, color: "#7d8490" },
  ];
  const walls = buildings.map((item) => ({
    id: `${item.id}-wall`,
    x: item.x - item.w / 2,
    y: item.y - item.h / 2,
    w: item.w,
    h: item.h,
    color: item.color,
    material: "concrete",
    mineable: false,
  }));
  const lilyPads = [
    { id: "park-pad-north", x: park.x + 130, y: park.y - 34, phase: 0.2 },
    { id: "park-pad-east", x: park.x + park.w + 34, y: park.y + 116, phase: 1.4 },
    { id: "park-pad-south", x: park.x + 340, y: park.y + park.h + 36, phase: 2.2 },
    { id: "city-canal-pad-west", x: x + 176, y: cy + 210, phase: 0.7 },
    { id: "city-canal-pad-east", x: x + TOP_DOWN_URBAN.w - 176, y: cy - 90, phase: 2.9 },
    { id: "north-pocket-pad", x: pocketParks[0].x + 60, y: pocketParks[0].y + pocketParks[0].h + 20, phase: 1.1 },
    { id: "east-pocket-pad", x: pocketParks[1].x + pocketParks[1].w - 45, y: pocketParks[1].y - 22, phase: 2.5 },
  ];
  const pickups = [
    { id: "urban-pearl-park", currency: "pearls", x: park.x + park.w / 2, y: park.y + park.h / 2, value: 2 },
    { id: "urban-amber-shop", currency: "amber", x: cx - 320, y: cy - 110, value: 1 },
    { id: "urban-flies-trade", currency: "flies", x: cx + 310, y: cy - 108, value: 3 },
    { id: "urban-pearl-north-park", currency: "pearls", x: pocketParks[0].x + 150, y: pocketParks[0].y + 85, value: 1 },
    { id: "urban-amber-east-park", currency: "amber", x: pocketParks[1].x + 135, y: pocketParks[1].y + 88, value: 1 },
    { id: "urban-flies-south-plaza", currency: "flies", x: pocketParks[2].x + 220, y: pocketParks[2].y + 86, value: 4 },
  ];

  return {
    roads,
    parks: [park, ...pocketParks],
    cars,
    water,
    lilyPads,
    structures: [...shops, ...buildings],
    places: shops,
    walls,
    pickups,
  };
}

function makeUrbanTraffic(roads) {
  const driveableRoads = roads.filter((road) => road.kind !== "crosswalk");
  const palette = ["#e65b4f", "#4d8bd9", "#f0b93f", "#57a96b", "#9d6cc7", "#d95c90", "#b9c1c4"];
  const traffic = [];
  for (const road of driveableRoads) {
    const horizontal = road.w >= road.h;
    const laneCount = road.id.includes("main") ? 3 : 2;
    for (let lane = 0; lane < laneCount; lane += 1) {
      const laneOffset = ((lane + 0.5) / laneCount);
      const laneRect = horizontal
        ? {
            x: road.x + 22,
            y: road.y + road.h * laneOffset - 18,
            w: road.w - 44,
            h: 36,
            axis: "x",
          }
        : {
            x: road.x + road.w * laneOffset - 18,
            y: road.y + 22,
            w: 36,
            h: road.h - 44,
            axis: "y",
          };
      traffic.push({
        id: `traffic-${road.id}-${lane}`,
        name: lane === 0 && road.id.includes("main") ? "City bus" : "Car",
        ...laneRect,
        speed: 145 + lane * 36 + (road.id.length % 4) * 14,
        offset: (lane * 0.31 + road.id.length * 0.07) % 1,
        direction: lane % 2 === 0 ? 1 : -1,
        carW: lane === 0 && road.id.includes("main") ? 118 : 82,
        carH: lane === 0 && road.id.includes("main") ? 34 : 30,
        color: palette[(lane + road.id.length) % palette.length],
        stealsFlies: lane === 0 && road.id.includes("main") ? 8 : 5,
      });
    }
  }
  return traffic;
}

function makePlayerHouse(x, y, level = 1) {
  return {
    id: "player-house",
    type: "playerHouse",
    name: "Your House",
    kind: "playerHouse",
    x,
    y,
    w: 170,
    h: 120,
    level,
    fixed: true,
    talk: `Press E to enter your level ${level} house platformer.`,
  };
}

function setNotice(state, text, duration = 2.8) {
  state.notice = text;
  state.noticeTimer = duration;
}

function addCurrency(state, currency, amount) {
  if (currency === "pearls") state.pearls += amount;
  else if (currency === "amber") state.amber += amount;
  else state.score += amount;
}

function canAffordCost(state, cost) {
  return (
    state.score >= (cost.flies ?? 0) &&
    state.pearls >= (cost.pearls ?? 0) &&
    state.amber >= (cost.amber ?? 0)
  );
}

function spendCost(state, cost) {
  state.score -= cost.flies ?? 0;
  state.pearls -= cost.pearls ?? 0;
  state.amber -= cost.amber ?? 0;
}

function costLabel(cost) {
  return [
    cost.flies ? `${cost.flies} flies` : "",
    cost.pearls ? `${cost.pearls} pearls` : "",
    cost.amber ? `${cost.amber} amber` : "",
  ].filter(Boolean).join(" and ");
}

function currencyLabel(currency) {
  if (currency === "pearls") return "moon pearls";
  if (currency === "amber") return "amber coins";
  return "flies";
}

function formatTime(seconds) {
  const whole = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(whole / 60);
  const rest = whole % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

function structureName(type) {
  if (type === "parkourHouse") return "parkour house";
  if (type === "brokenArch") return "broken arch";
  if (type === "stoneNest") return "stone nest";
  if (type === "marketStall") return "market stall";
  return type;
}
