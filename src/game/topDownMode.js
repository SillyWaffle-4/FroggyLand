import { TOP_DOWN_WORLD_SIZE, VIEW_HEIGHT, VIEW_WIDTH } from "./constants.js";
import { beep } from "./audio.js";
import { TOP_DOWN_CHUNK_SIZE, TOP_DOWN_URBAN, generateTopDownChunk } from "./procedural.js";
import { clamp, rectsOverlap, roundRect } from "./utils.js";

const FROG_SIZE = 42;
const MOVE_SPEED = 270;
const SWIM_SPEED_MULTIPLIER = 0.72;
const LEAP_DURATION = 0.72;
const LEAP_SPEED_MULTIPLIER = 1.45;
const ACTIVE_MARGIN = 220;
const CENTER = TOP_DOWN_WORLD_SIZE / 2;

const URBAN_FEATURES = makeUrbanFeatures();

export function createTopDownState() {
  const frog = { x: CENTER - 180, y: CENTER + 420, facing: 1, jumpHeld: false };
  const state = {
    worldSize: TOP_DOWN_WORLD_SIZE,
    time: 0,
    cameraX: 0,
    cameraY: 0,
    frog,
    score: 8,
    pearls: 3,
    amber: 3,
    leapUpgrade: 0,
    leapTimer: 0,
    lilyBoostTimer: 0,
    discoveredStructures: new Set(),
    collectedPickups: new Set(),
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
  state.nearbyPlaceId = findNearbyTopDownPlace(state)?.id ?? null;

  if (state.noticeTimer <= 0) {
    const place = findNearbyTopDownPlace(state);
    if (place) {
      state.notice = `${place.name}: ${place.talk}`;
    } else if (onLilyPad || state.lilyBoostTimer > 0) {
      state.notice = "Press Space from a lily pad to leap over walls.";
    } else {
      state.notice = "Explore the 300k x 300k pondland. Water is common near walls, and the city hub sits in the middle.";
    }
  }
}

function moveTopDownFrog(state, pressed, dt) {
  const frog = state.frog;
  const oldX = frog.x;
  const oldY = frog.y;
  const dx = (pressed.has("KeyD") || pressed.has("ArrowRight") ? 1 : 0) - (pressed.has("KeyA") || pressed.has("ArrowLeft") ? 1 : 0);
  const dy = (pressed.has("KeyS") || pressed.has("ArrowDown") ? 1 : 0) - (pressed.has("KeyW") || pressed.has("ArrowUp") ? 1 : 0);
  const length = Math.sqrt(dx * dx + dy * dy) || 1;
  const inWater = isInWater(state);
  const leaping = state.leapTimer > 0;
  const speed = MOVE_SPEED * (inWater && !leaping ? SWIM_SPEED_MULTIPLIER : 1) * (leaping ? LEAP_SPEED_MULTIPLIER : 1);

  frog.x = clamp(frog.x + (dx / length) * speed * dt, 28, state.worldSize - 28);
  frog.y = clamp(frog.y + (dy / length) * speed * dt, 36, state.worldSize - 36);
  if (dx !== 0) frog.facing = dx < 0 ? -1 : 1;

  if (!leaping && isBlockedByWall(state)) {
    frog.x = oldX;
    frog.y = oldY;
  }
}

function updateCamera(state) {
  state.cameraX = clamp(state.frog.x - VIEW_WIDTH / 2, 0, state.worldSize - VIEW_WIDTH);
  state.cameraY = clamp(state.frog.y - VIEW_HEIGHT / 2, 0, state.worldSize - VIEW_HEIGHT);
}

function getActiveTopDown(state) {
  const minX = state.cameraX - ACTIVE_MARGIN;
  const maxX = state.cameraX + VIEW_WIDTH + ACTIVE_MARGIN;
  const minY = state.cameraY - ACTIVE_MARGIN;
  const maxY = state.cameraY + VIEW_HEIGHT + ACTIVE_MARGIN;
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
      active.walls.push(...chunk.walls);
      active.water.push(...chunk.water);
      active.lilyPads.push(...chunk.lilyPads);
      active.structures.push(...chunk.structures);
      active.pickups.push(...chunk.pickups);
    }
  }

  active.roads.push(...URBAN_FEATURES.roads.filter((item) => isVisible(item, minX, minY, maxX, maxY)));
  active.parks.push(...URBAN_FEATURES.parks.filter((item) => isVisible(item, minX, minY, maxX, maxY)));
  active.water.push(...URBAN_FEATURES.water.filter((item) => isVisible(item, minX, minY, maxX, maxY)));
  active.lilyPads.push(...URBAN_FEATURES.lilyPads.filter((item) => isVisible({ x: item.x - 28, y: item.y - 18, w: 56, h: 36 }, minX, minY, maxX, maxY)));
  active.walls.push(...URBAN_FEATURES.walls.filter((item) => isVisible(item, minX, minY, maxX, maxY)));
  active.structures.push(...URBAN_FEATURES.structures.filter((item) => isVisible(item, minX, minY, maxX, maxY)));
  active.pickups.push(...URBAN_FEATURES.pickups.filter((item) => isVisible({ x: item.x - 16, y: item.y - 16, w: 32, h: 32 }, minX, minY, maxX, maxY)));
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

function frogRect(state, padding = 0) {
  return {
    x: state.frog.x - FROG_SIZE / 2 + padding,
    y: state.frog.y - FROG_SIZE / 2 + padding,
    w: FROG_SIZE - padding * 2,
    h: FROG_SIZE - padding * 2,
  };
}

function isBlockedByWall(state) {
  const rect = frogRect(state, 7);
  return state.active.walls.some((wall) => rectsOverlap(rect, wall));
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
  return URBAN_FEATURES.places.find((place) => {
    const dx = state.frog.x - place.x;
    const dy = state.frog.y - place.y;
    return dx * dx + dy * dy < 125 * 125;
  }) ?? null;
}

export function interactTopDownPlace(state, soundOn) {
  const place = findNearbyTopDownPlace(state);
  if (!place) {
    setNotice(state, "No top-down shop nearby.");
    return false;
  }

  if (place.kind === "upgrade") {
    if (state.amber < 3 || state.pearls < 2) {
      setNotice(state, "Upgrade Shop wants 3 amber and 2 pearls for a stronger lily leap.");
      if (soundOn) beep(160, 0.04);
      return false;
    }
    if (state.leapUpgrade >= 3) {
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

export function drawTopDownGame(ctx, state) {
  ctx.clearRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  drawGround(ctx, state);

  ctx.save();
  ctx.translate(-state.cameraX, -state.cameraY);
  drawRoads(ctx, state);
  drawWater(ctx, state);
  drawParks(ctx, state);
  drawLilyPads(ctx, state);
  drawWalls(ctx, state);
  drawStructures(ctx, state);
  drawTopDownPickups(ctx, state);
  drawFrog(ctx, state);
  ctx.restore();
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
    ctx.fillStyle = wall.color ?? "#737c78";
    roundRect(ctx, wall.x, wall.y, wall.w, wall.h, 8);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fillRect(wall.x + 10, wall.y + 9, Math.max(20, wall.w - 20), 10);
    ctx.strokeStyle = "rgba(35, 42, 38, 0.22)";
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}

function drawLilyPads(ctx, state) {
  for (const pad of state.active.lilyPads) {
    const bob = Math.sin(state.time * 3 + pad.phase) * 2;
    ctx.fillStyle = "#73c957";
    ctx.beginPath();
    ctx.ellipse(pad.x, pad.y + bob, 32, 19, -0.15, 0.22, Math.PI * 2.05);
    ctx.lineTo(pad.x, pad.y + bob);
    ctx.fill();
    ctx.strokeStyle = "#dff56d";
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
    } else if (item.type === "tradePost") {
      drawShop(ctx, item, "#d58432", "TR");
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
      talk: "Press E to buy stronger lily leaps for 3 amber and 2 pearls.",
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

function setNotice(state, text, duration = 2.8) {
  state.notice = text;
  state.noticeTimer = duration;
}

function addCurrency(state, currency, amount) {
  if (currency === "pearls") state.pearls += amount;
  else if (currency === "amber") state.amber += amount;
  else state.score += amount;
}

function currencyLabel(currency) {
  if (currency === "pearls") return "moon pearls";
  if (currency === "amber") return "amber coins";
  return "flies";
}

function structureName(type) {
  if (type === "brokenArch") return "broken arch";
  if (type === "stoneNest") return "stone nest";
  if (type === "marketStall") return "market stall";
  return type;
}
