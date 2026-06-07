import { VIEW_HEIGHT, VIEW_WIDTH, keys } from "./constants.js";
import { beep } from "./audio.js";
import { BUILD_CATALOG, buildCurrencyLabel, getBuildItem } from "./building.js";
import { generateTopDownStructures } from "./procedural.js";
import { clamp, rectsOverlap, roundRect } from "./utils.js";

const FROG_SIZE = 42;
const MOVE_SPEED = 250;

function makePickups() {
  const pickups = [];
  const currencies = ["flies", "pearls", "amber"];
  for (let i = 0; i < 34; i += 1) {
    const currency = currencies[i % currencies.length];
    pickups.push({
      id: `top-pickup-${i}`,
      currency,
      x: 80 + ((i * 157) % (VIEW_WIDTH - 160)),
      y: 92 + ((i * 91) % (VIEW_HEIGHT - 170)),
      value: currency === "flies" ? 2 : 1,
    });
  }
  return pickups;
}

export function createTopDownState() {
  return {
    time: 0,
    frog: { x: VIEW_WIDTH / 2, y: VIEW_HEIGHT / 2, facing: 1 },
    score: 5,
    pearls: 2,
    amber: 2,
    structures: generateTopDownStructures(),
    discoveredStructures: new Set(),
    pickups: makePickups(),
    collectedPickups: new Set(),
    placedBuilds: [],
    buildInventory: Object.fromEntries(BUILD_CATALOG.map((item) => [item.id, 0])),
    buildMode: null,
    pointer: { x: VIEW_WIDTH / 2, y: VIEW_HEIGHT / 2 },
    notice: "Explore the top-down pond, find generated structures, collect currencies, and build your home.",
    noticeTimer: 4,
  };
}

export function updateTopDownGame(state, pressed, pointer, dt, soundOn) {
  state.time += dt;
  state.noticeTimer = Math.max(0, state.noticeTimer - dt);
  state.pointer = { x: pointer.x, y: pointer.y };

  const frog = state.frog;
  const oldX = frog.x;
  const oldY = frog.y;
  const dx = (keys.right.some((key) => pressed.has(key)) ? 1 : 0) - (keys.left.some((key) => pressed.has(key)) ? 1 : 0);
  const dy = ((pressed.has("KeyS") || pressed.has("ArrowDown")) ? 1 : 0) - (keys.jump.some((key) => pressed.has(key)) ? 1 : 0);
  const length = Math.sqrt(dx * dx + dy * dy) || 1;
  frog.x = clamp(frog.x + (dx / length) * MOVE_SPEED * dt, 28, VIEW_WIDTH - 28);
  frog.y = clamp(frog.y + (dy / length) * MOVE_SPEED * dt, 36, VIEW_HEIGHT - 36);
  if (dx !== 0) frog.facing = dx < 0 ? -1 : 1;

  const frogRect = { x: frog.x - FROG_SIZE / 2, y: frog.y - FROG_SIZE / 2, w: FROG_SIZE, h: FROG_SIZE };
  const blocked = state.structures.some((item) => (
    item.type !== "pond" &&
    rectsOverlap(frogRect, { x: item.x - item.w / 2, y: item.y - item.h / 2, w: item.w, h: item.h })
  ));
  if (blocked) {
    frog.x = oldX;
    frog.y = oldY;
  }

  collectTopDownPickups(state, soundOn);
  discoverStructures(state, soundOn);

  if (state.noticeTimer <= 0) {
    state.notice = state.buildMode
      ? "Click an open spot to place your bought house piece."
      : "Generated huts, ponds, ruins, gardens, and carts are scattered around the map.";
  }
}

function collectTopDownPickups(state, soundOn) {
  const frogRect = { x: state.frog.x - 24, y: state.frog.y - 24, w: 48, h: 48 };
  for (const pickup of state.pickups) {
    if (state.collectedPickups.has(pickup.id)) continue;
    const pickupRect = { x: pickup.x - 14, y: pickup.y - 14, w: 28, h: 28 };
    if (rectsOverlap(frogRect, pickupRect)) {
      state.collectedPickups.add(pickup.id);
      addCurrency(state, pickup.currency, pickup.value);
      setNotice(state, `Collected ${pickup.value} ${currencyLabel(pickup.currency)}.`);
      if (soundOn) beep(pickup.currency === "flies" ? 900 : 720, 0.04);
    }
  }
}

function discoverStructures(state, soundOn) {
  for (const item of state.structures) {
    if (state.discoveredStructures.has(item.id)) continue;
    const dx = state.frog.x - item.x;
    const dy = state.frog.y - item.y;
    if (dx * dx + dy * dy < 85 * 85) {
      state.discoveredStructures.add(item.id);
      const bonus = item.type === "pond" ? "pearls" : item.type === "cart" ? "amber" : "flies";
      addCurrency(state, bonus, bonus === "flies" ? 1 : 1);
      setNotice(state, `Found a ${structureName(item.type)}. It had ${currencyLabel(bonus)} tucked inside.`);
      if (soundOn) beep(980, 0.05);
      return;
    }
  }
}

export function buyTopDownBuildItem(state, itemId, soundOn) {
  const item = getBuildItem(itemId);
  if (!item) return false;
  const available = getCurrency(state, item.currency);
  if (available < item.cost) {
    setNotice(state, `${item.name} costs ${item.cost} ${buildCurrencyLabel(item.currency)}. You have ${available}.`);
    if (soundOn) beep(160, 0.04);
    return false;
  }
  spendCurrency(state, item.currency, item.cost);
  state.buildInventory[item.id] = (state.buildInventory[item.id] ?? 0) + 1;
  state.buildMode = item.id;
  setNotice(state, `${item.name} bought. Click an open spot to place it.`);
  if (soundOn) beep(760, 0.05);
  return true;
}

export function selectTopDownBuildItem(state, itemId) {
  const item = getBuildItem(itemId);
  if (!item || (state.buildInventory[item.id] ?? 0) <= 0) return false;
  state.buildMode = item.id;
  setNotice(state, `Placing ${item.name}.`);
  return true;
}

export function cancelTopDownBuild(state) {
  state.buildMode = null;
}

export function placeTopDownBuildItem(state, pointer, soundOn) {
  const item = getBuildItem(state.buildMode);
  if (!item || (state.buildInventory[item.id] ?? 0) <= 0) {
    state.buildMode = null;
    return false;
  }
  const x = clamp(pointer.x, item.w / 2 + 18, VIEW_WIDTH - item.w / 2 - 18);
  const y = clamp(pointer.y, item.h / 2 + 18, VIEW_HEIGHT - item.h / 2 - 18);
  const nextRect = { x: x - item.w / 2, y: y - item.h / 2, w: item.w, h: item.h };
  const tooCloseToFrog = rectsOverlap(nextRect, { x: state.frog.x - 34, y: state.frog.y - 34, w: 68, h: 68 });
  const blocked = state.structures.some((structure) => (
    rectsOverlap(nextRect, { x: structure.x - structure.w / 2, y: structure.y - structure.h / 2, w: structure.w, h: structure.h })
  )) || state.placedBuilds.some((placed) => (
    rectsOverlap(nextRect, { x: placed.x - placed.w / 2, y: placed.y - placed.h / 2, w: placed.w, h: placed.h })
  ));
  if (tooCloseToFrog || blocked) {
    setNotice(state, "That spot is too crowded.");
    return false;
  }
  state.placedBuilds.push({ id: crypto.randomUUID(), itemId: item.id, x, y, w: item.w, h: item.h });
  state.buildInventory[item.id] -= 1;
  state.buildMode = state.buildInventory[item.id] > 0 ? item.id : null;
  setNotice(state, `${item.name} placed.`);
  if (soundOn) beep(620, 0.05);
  return true;
}

export function drawTopDownGame(ctx, state) {
  ctx.clearRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  drawGround(ctx);
  drawStructures(ctx, state);
  drawTopDownPickups(ctx, state);
  drawTopDownBuilds(ctx, state);
  drawBuildPreview(ctx, state);
  drawFrog(ctx, state);
}

function drawGround(ctx) {
  ctx.fillStyle = "#bfe7c0";
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  for (let y = 42; y < VIEW_HEIGHT; y += 82) {
    for (let x = 36; x < VIEW_WIDTH; x += 120) {
      ctx.beginPath();
      ctx.ellipse(x, y, 36, 10, -0.15, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.strokeStyle = "rgba(44, 91, 56, 0.16)";
  ctx.lineWidth = 2;
  for (let x = 70; x < VIEW_WIDTH; x += 160) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 80, VIEW_HEIGHT);
    ctx.stroke();
  }
}

function drawStructures(ctx, state) {
  for (const item of state.structures) {
    const found = state.discoveredStructures.has(item.id);
    ctx.save();
    ctx.translate(item.x, item.y);
    ctx.globalAlpha = found ? 1 : 0.72;
    if (item.type === "pond") {
      ctx.fillStyle = "#2d9eb4";
      ctx.beginPath();
      ctx.ellipse(0, 0, item.w / 2, item.h / 2, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#dffbff";
      ctx.lineWidth = 3;
      ctx.stroke();
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
    ctx.restore();
  }
}

function drawTopDownPickups(ctx, state) {
  for (const pickup of state.pickups) {
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

function drawTopDownBuilds(ctx, state) {
  for (const placed of state.placedBuilds) {
    const item = getBuildItem(placed.itemId);
    if (!item) continue;
    drawBuildPiece(ctx, item, placed.x, placed.y, placed.w, placed.h, 1);
  }
}

function drawBuildPreview(ctx, state) {
  const item = getBuildItem(state.buildMode);
  if (!item || (state.buildInventory[item.id] ?? 0) <= 0) return;
  ctx.save();
  ctx.globalAlpha = 0.5;
  drawBuildPiece(ctx, item, state.pointer.x, state.pointer.y, item.w, item.h, 1);
  ctx.restore();
}

function drawBuildPiece(ctx, item, cx, cy, w, h, alpha) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  if (item.kind === "roof") {
    ctx.fillStyle = item.color;
    ctx.beginPath();
    ctx.moveTo(cx - w / 2 - 8, cy + h / 2);
    ctx.lineTo(cx, cy - h / 2);
    ctx.lineTo(cx + w / 2 + 8, cy + h / 2);
    ctx.closePath();
    ctx.fill();
  } else if (item.kind === "window") {
    ctx.fillStyle = item.color;
    roundRect(ctx, cx - w / 2, cy - h / 2, w, h, 8);
    ctx.fill();
    ctx.strokeStyle = item.accent;
    ctx.lineWidth = 3;
    ctx.stroke();
  } else if (item.kind === "plant") {
    ctx.strokeStyle = item.accent;
    ctx.lineWidth = 5;
    for (let i = 0; i < 4; i += 1) {
      ctx.beginPath();
      ctx.moveTo(cx, cy + h / 2);
      ctx.quadraticCurveTo(cx - 26 + i * 18, cy, cx - 20 + i * 15, cy - h / 2);
      ctx.stroke();
    }
  } else if (item.kind === "decor") {
    ctx.strokeStyle = item.accent;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx, cy - h / 2);
    ctx.lineTo(cx, cy + h / 2);
    ctx.stroke();
    ctx.fillStyle = item.color;
    roundRect(ctx, cx - w / 2 + 5, cy - 8, w - 10, 24, 7);
    ctx.fill();
  } else {
    ctx.fillStyle = item.color;
    roundRect(ctx, cx - w / 2, cy - h / 2, w, h, 8);
    ctx.fill();
    ctx.fillStyle = item.accent;
    ctx.fillRect(cx - 8, cy + h / 2 - 24, 16, 24);
  }
  ctx.restore();
}

function drawFrog(ctx, state) {
  const frog = state.frog;
  ctx.save();
  ctx.translate(frog.x, frog.y);
  ctx.scale(frog.facing, 1);
  ctx.fillStyle = "rgba(19, 36, 26, 0.18)";
  ctx.beginPath();
  ctx.ellipse(0, 18, 28, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#5fcb55";
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

function setNotice(state, text, duration = 2.8) {
  state.notice = text;
  state.noticeTimer = duration;
}

function getCurrency(state, currency) {
  if (currency === "pearls") return state.pearls;
  if (currency === "amber") return state.amber;
  return state.score;
}

function spendCurrency(state, currency, amount) {
  if (currency === "pearls") state.pearls -= amount;
  else if (currency === "amber") state.amber -= amount;
  else state.score -= amount;
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
