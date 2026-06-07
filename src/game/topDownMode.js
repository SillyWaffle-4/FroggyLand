import { TOP_DOWN_WORLD_SIZE, VIEW_HEIGHT, VIEW_WIDTH } from "./constants.js";
import { beep } from "./audio.js";
import { TOP_DOWN_CHUNK_SIZE, TOP_DOWN_URBAN, generateTopDownChunk } from "./procedural.js";
import { clamp, rectsOverlap, roundRect } from "./utils.js";

const FROG_SIZE = 42;
const MOVE_SPEED = 270;
const SWIM_SPEED_MULTIPLIER = 0.72;
const LEAP_DURATION = 0.72;
const LEAP_SPEED_MULTIPLIER = 1.58;
const MAX_LEAP_UPGRADE = 10;
const ACTIVE_MARGIN = 220;
const CENTER = TOP_DOWN_WORLD_SIZE / 2;
const MINE_RANGE = 96;
const DAY_DURATION = 300;
const NIGHT_DURATION = 660;
const BIRD_INTERVAL = 60;
const BIRD_WARNING = 8;
const BIRD_SWOOP = 17;
export const CHECKPOINT_COST = { pearls: 6, amber: 2 };
export const HOUSE_COST = { flies: 8, pearls: 3, amber: 1 };
export const LILY_PAD_COST = { flies: 3 };
export const TOP_DOWN_ZOOM = 0.86;

export const FURNITURE_SHOP_ITEMS = [
  { part: "window", name: "Round Window", cost: { pearls: 4 } },
  { part: "rug", name: "Leaf Rug", cost: { flies: 6, pearls: 2 } },
  { part: "lantern", name: "Glow Lantern", cost: { amber: 2, pearls: 3 } },
  { part: "trophy", name: "Parkour Trophy", cost: { amber: 5, pearls: 8 } },
];

export const PICKAXES = [
  { tier: 0, id: "none", name: "None", material: "bare hands", costPearls: 0, maxWallTier: 0, hits: Infinity },
  { tier: 1, id: "reed", name: "Reed Pickaxe", material: "reed", costPearls: 35, maxWallTier: 1, hits: 5 },
  { tier: 2, id: "stone", name: "Stone Pickaxe", material: "stone", costPearls: 100, maxWallTier: 2, hits: 4 },
  { tier: 3, id: "amber", name: "Amber Pickaxe", material: "amber", costPearls: 180, costAmber: 12, maxWallTier: 2, hits: 2 },
  { tier: 4, id: "crystal", name: "Crystal Pickaxe", material: "crystal", costPearls: 300, costAmber: 25, maxWallTier: 3, hits: 2 },
];

const WALL_MATERIALS = {
  clay: { name: "Clay Wall", tier: 1, hp: 4, color: "#8b8172", shine: "#b6a78d" },
  stone: { name: "Stone Wall", tier: 2, hp: 6, color: "#68746d", shine: "#aab4ae" },
  crystal: { name: "Crystal Wall", tier: 3, hp: 8, color: "#796c9d", shine: "#d9c8ff" },
  concrete: { name: "Concrete", tier: 99, hp: 999, color: "#76828a", shine: "#c7d0d4" },
};

const URBAN_FEATURES = makeUrbanFeatures();

export function createTopDownState(progress = {}) {
  const saved = progress.topDown ?? {};
  const frog = { x: CENTER - 180, y: CENTER + 420, facing: 1, jumpHeld: false };
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
    pickaxeTier: saved.pickaxeTier ?? 0,
    leapUpgrade: saved.leapUpgrade ?? 0,
    leapTimer: 0,
    lilyBoostTimer: 0,
    discoveredStructures: new Set(),
    collectedPickups: new Set(),
    minedWalls: new Set(),
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
    playerHouse: progress.house ? makePlayerHouse(progress.house.x, progress.house.y) : null,
    bird: null,
    birdCooldown: BIRD_INTERVAL,
    pointer: { x: frog.x, y: frog.y },
    chunks: new Map(),
    active: emptyActive(),
    nearbyPlaceId: null,
    notice: "Top-down is now a 300k x 300k world. The middle city has shops, trades, and a water-ringed park.",
    noticeTimer: 4.4,
  };
  updateCamera(state);
  state.active = getActiveTopDown(state);
  return state;
}

export function makeTopDownProgress(state) {
  return {
    score: state.score,
    pearls: state.pearls,
    amber: state.amber,
    pickaxeTier: state.pickaxeTier,
    leapUpgrade: state.leapUpgrade,
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
  state.pointer = { x: pointer.x, y: pointer.y };
  state.active = getActiveTopDown(state);

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
  updateCamera(state);
  state.active = getActiveTopDown(state);
  collectTopDownPickups(state, soundOn);
  discoverStructures(state, soundOn);
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

  const newPad = {
    id: `placed-top-pad-${Math.round(state.time * 1000)}-${state.placedLilyPads.length + 1}`,
    x: state.frog.x,
    y: state.frog.y,
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
  const speed = MOVE_SPEED * (inWater && !leaping ? SWIM_SPEED_MULTIPLIER : 1) * (leaping ? leapSpeed : 1);

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
      active.structures.push(...chunk.structures);
      active.pickups.push(...chunk.pickups);
    }
  }

  active.water = mergeWaterRects(active.water);

  active.roads.push(...URBAN_FEATURES.roads.filter((item) => isVisible(item, minX, minY, maxX, maxY)));
  active.parks.push(...URBAN_FEATURES.parks.filter((item) => isVisible(item, minX, minY, maxX, maxY)));
  active.water.push(...URBAN_FEATURES.water.filter((item) => isVisible(item, minX, minY, maxX, maxY)));
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

export function getDayInfo(state) {
  const cycleLength = DAY_DURATION + NIGHT_DURATION;
  const cycleTime = state.time % cycleLength;
  const isDay = cycleTime < DAY_DURATION;
  const remaining = isDay ? DAY_DURATION - cycleTime : cycleLength - cycleTime;
  return {
    isDay,
    phase: isDay ? "Day" : "Night",
    remaining,
    label: `${isDay ? "Day" : "Night"} ${formatTime(remaining)}`,
  };
}

function updateBirdHazard(state, dt, soundOn) {
  const dayInfo = getDayInfo(state);
  if (!dayInfo.isDay) {
    state.bird = null;
    state.birdCooldown = BIRD_INTERVAL;
    return;
  }

  if (!state.bird) {
    state.birdCooldown -= dt;
    if (state.birdCooldown <= 0) {
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
    state.birdCooldown = BIRD_INTERVAL + Math.random() * 14;
  }
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
  return nearest;
}

export function interactTopDownPlace(state, soundOn) {
  const place = findNearbyTopDownPlace(state);
  if (!place) {
    setNotice(state, "No top-down shop nearby.");
    return false;
  }

  if (place.kind === "parkour") {
    setNotice(state, "Entering a short platformer parkour house. Clear it to earn a part.", 2);
    if (soundOn) beep(900, 0.06);
    return { mode: "platformer", entry: `parkour:${place.id}` };
  }

  if (place.kind === "playerHouse") {
    setNotice(state, "Entering your house interior. Spend platformer rewards to decorate.", 2);
    if (soundOn) beep(780, 0.06);
    return { mode: "platformer", entry: "houseInterior" };
  }

  if (place.kind === "upgrade") {
    if (state.amber < 3 || state.pearls < 2) {
      setNotice(state, "Upgrade Shop wants 3 amber and 2 pearls for a stronger lily leap.");
      if (soundOn) beep(160, 0.04);
      return false;
    }
    if (state.leapUpgrade >= MAX_LEAP_UPGRADE) {
      setNotice(state, "Your lily leap is already fully upgraded.");
      return false;
    }
    state.amber -= 3;
    state.pearls -= 2;
    state.leapUpgrade += 1;
    setNotice(state, `Lily leap upgraded to level ${state.leapUpgrade}.`);
    if (soundOn) beep(980, 0.06);
    return true;
  }

  if (place.kind === "furniture") {
    const item = FURNITURE_SHOP_ITEMS[state.furnitureShopIndex % FURNITURE_SHOP_ITEMS.length];
    if (!canAffordCost(state, item.cost)) {
      setNotice(state, `Furniture Shop wants ${costLabel(item.cost)} for ${item.name}.`);
      if (soundOn) beep(160, 0.04);
      return false;
    }
    spendCost(state, item.cost);
    state.furnitureShopIndex += 1;
    setNotice(state, `Bought ${item.name}. Place it inside your house.`);
    if (soundOn) beep(900, 0.05);
    return { furnitureReward: { part: item.part, name: item.name, amount: 1 } };
  }

  if (place.kind === "pickaxe") {
    const nextPickaxe = PICKAXES.find((pickaxe) => pickaxe.tier === state.pickaxeTier + 1);
    if (!nextPickaxe) {
      setNotice(state, "Pickaxe Shop: you already have the strongest crystal pickaxe.");
      return false;
    }
    const amberCost = nextPickaxe.costAmber ?? 0;
    if (state.pearls < nextPickaxe.costPearls || state.amber < amberCost) {
      const amberText = amberCost > 0 ? ` and ${amberCost} amber` : "";
      setNotice(state, `Pickaxe Shop wants ${nextPickaxe.costPearls} pearls${amberText} for the ${nextPickaxe.name}.`);
      if (soundOn) beep(160, 0.04);
      return false;
    }
    state.pearls -= nextPickaxe.costPearls;
    state.amber -= amberCost;
    state.pickaxeTier = nextPickaxe.tier;
    setNotice(state, `Bought ${nextPickaxe.name}. Press M near a wall to mine.`);
    if (soundOn) beep(920, 0.06);
    return true;
  }

  if (state.score < 4) {
    setNotice(state, "Trading Place wants 4 flies for amber and pearls.");
    if (soundOn) beep(160, 0.04);
    return false;
  }
  state.score -= 4;
  state.amber += 1;
  state.pearls += 1;
  setNotice(state, "Traded 4 flies for 1 amber and 1 pearl.");
  if (soundOn) beep(740, 0.05);
  return true;
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
  const house = makePlayerHouse(state.frog.x + 92, state.frog.y - 6);
  state.playerHouse = house;
  setNotice(state, "House placed. Press E near it to edit inside in platformer mode.", 3.2);
  if (soundOn) beep(1040, 0.07);
  return { x: house.x, y: house.y };
}

export function mineNearbyWall(state, soundOn) {
  const pickaxe = getCurrentPickaxe(state);
  if (pickaxe.tier <= 0) {
    setNotice(state, "You need to buy a pickaxe before mining walls.");
    if (soundOn) beep(150, 0.04);
    return false;
  }

  const wall = findNearbyMineableWall(state);
  if (!wall) {
    setNotice(state, "No mineable wall close enough. Stand beside a generated wall and press M.");
    return false;
  }

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
    setNotice(state, `${pickaxe.name} mined through a ${material.name}.`);
    if (soundOn) beep(1040, 0.06);
    return true;
  }

  state.wallDamage.set(wall.id, damage);
  setNotice(state, `${material.name} cracked ${damage}/${requiredHits}.`);
  if (soundOn) beep(520, 0.04);
  return true;
}

export function drawTopDownGame(ctx, state) {
  ctx.clearRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  drawGround(ctx, state);

  ctx.save();
  ctx.scale(state.zoom, state.zoom);
  ctx.translate(-state.cameraX, -state.cameraY);
  drawRoads(ctx, state);
  drawWater(ctx, state);
  drawParks(ctx, state);
  drawLilyPads(ctx, state);
  drawWalls(ctx, state);
  drawStructures(ctx, state);
  drawCheckpoints(ctx, state);
  drawTopDownPickups(ctx, state);
  drawBird(ctx, state);
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
  ctx.fillStyle = "#bfe7c0";
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  const startX = -((state.cameraX * 0.35) % 140);
  const startY = -((state.cameraY * 0.35) % 110);
  for (let y = startY; y < VIEW_HEIGHT + 80; y += 110) {
    for (let x = startX; x < VIEW_WIDTH + 80; x += 140) {
      ctx.beginPath();
      ctx.ellipse(x, y, 38, 10, -0.15, 0, Math.PI * 2);
      ctx.fill();
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

function drawRoads(ctx, state) {
  for (const road of state.active.roads) {
    ctx.fillStyle = "#394143";
    roundRect(ctx, road.x, road.y, road.w, road.h, 8);
    ctx.fill();
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
    if (item.type === "upgradeShop") {
      drawShop(ctx, item, "#9d6cc7", "UP");
    } else if (item.type === "pickaxeShop") {
      drawShop(ctx, item, "#6f7b75", "PX");
    } else if (item.type === "tradePost") {
      drawShop(ctx, item, "#d58432", "TR");
    } else if (item.type === "furnitureShop") {
      drawShop(ctx, item, "#2d9eb4", "FS");
    } else if (item.type === "parkourHouse") {
      drawHousePortal(ctx, item, "#5fcb55", "PK");
    } else if (item.type === "playerHouse") {
      drawHousePortal(ctx, item, "#ffdf5d", "MY");
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

function drawTopDownPickups(ctx, state) {
  for (const pickup of state.active.pickups) {
    if (state.collectedPickups.has(pickup.id)) continue;
    ctx.save();
    ctx.translate(pickup.x, pickup.y);
    const pulse = 1 + Math.sin(state.time * 4 + pickup.x * 0.01) * 0.12;
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

function drawFrog(ctx, state) {
  const frog = state.frog;
  const leaping = state.leapTimer > 0;
  ctx.save();
  ctx.translate(frog.x, frog.y - (leaping ? 16 : 0));
  ctx.scale(frog.facing, 1);
  ctx.fillStyle = leaping ? "rgba(255, 223, 93, 0.36)" : "rgba(19, 36, 26, 0.18)";
  ctx.beginPath();
  ctx.ellipse(0, leaping ? 32 : 18, leaping ? 36 : 28, leaping ? 10 : 8, 0, 0, Math.PI * 2);
  ctx.fill();
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

function makeUrbanFeatures() {
  const x = TOP_DOWN_URBAN.x;
  const y = TOP_DOWN_URBAN.y;
  const cx = x + TOP_DOWN_URBAN.w / 2;
  const cy = y + TOP_DOWN_URBAN.h / 2;
  const park = { id: "urban-park", x: cx - 240, y: cy + 145, w: 480, h: 270 };
  const water = [
    { id: "park-water-top", x: park.x - 72, y: park.y - 72, w: park.w + 144, h: 74, urban: true, round: 18 },
    { id: "park-water-bottom", x: park.x - 72, y: park.y + park.h - 2, w: park.w + 144, h: 76, urban: true, round: 18 },
    { id: "park-water-left", x: park.x - 72, y: park.y, w: 74, h: park.h, urban: true, round: 18 },
    { id: "park-water-right", x: park.x + park.w - 2, y: park.y, w: 74, h: park.h, urban: true, round: 18 },
    { id: "city-canal-west", x: x + 130, y: y + 120, w: 92, h: TOP_DOWN_URBAN.h - 220, urban: true, round: 14 },
    { id: "city-canal-east", x: x + TOP_DOWN_URBAN.w - 230, y: y + 150, w: 104, h: TOP_DOWN_URBAN.h - 280, urban: true, round: 14 },
  ];
  const roads = [
    { id: "main-road-h", x: x + 130, y: cy - 70, w: TOP_DOWN_URBAN.w - 260, h: 140 },
    { id: "main-road-v", x: cx - 78, y: y + 85, w: 156, h: TOP_DOWN_URBAN.h - 170 },
  ];
  const shops = [
    {
      id: "upgrade-shop",
      type: "upgradeShop",
      name: "Upgrade Shop",
      kind: "upgrade",
      x: cx - 450,
      y: cy - 260,
      w: 190,
      h: 130,
      fixed: true,
      talk: "Press E to buy stronger lily leaps. There are 10 upgrade levels.",
    },
    {
      id: "pickaxe-shop",
      type: "pickaxeShop",
      name: "Pickaxe Shop",
      kind: "pickaxe",
      x: cx,
      y: cy - 382,
      w: 190,
      h: 130,
      fixed: true,
      talk: "Press E to buy pickaxes. Stone costs 100 pearls and mines tougher walls.",
    },
    {
      id: "trading-place",
      type: "tradePost",
      name: "Trading Place",
      kind: "trade",
      x: cx + 420,
      y: cy - 250,
      w: 190,
      h: 130,
      fixed: true,
      talk: "Press E to trade 4 flies for 1 amber and 1 pearl.",
    },
    {
      id: "furniture-shop",
      type: "furnitureShop",
      name: "Furniture Shop",
      kind: "furniture",
      x: cx + 620,
      y: cy + 285,
      w: 190,
      h: 130,
      fixed: true,
      talk: "Press E to buy rotating furniture for your house interior.",
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
  ];
  const pickups = [
    { id: "urban-pearl-park", currency: "pearls", x: park.x + park.w / 2, y: park.y + park.h / 2, value: 2 },
    { id: "urban-amber-shop", currency: "amber", x: cx - 320, y: cy - 110, value: 1 },
    { id: "urban-flies-trade", currency: "flies", x: cx + 310, y: cy - 108, value: 3 },
  ];

  return {
    roads,
    parks: [park],
    water,
    lilyPads,
    structures: [...shops, ...buildings],
    places: shops,
    walls,
    pickups,
  };
}

function makePlayerHouse(x, y) {
  return {
    id: "player-house",
    type: "playerHouse",
    name: "Your House",
    kind: "playerHouse",
    x,
    y,
    w: 170,
    h: 120,
    fixed: true,
    talk: "Press E to edit the inside in platformer mode.",
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
