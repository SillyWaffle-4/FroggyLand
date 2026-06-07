import {
  ACTIVE_MARGIN,
  FROG_HEIGHT,
  FROG_WIDTH,
  FLY_DESPAWN_MARGIN,
  FLY_REFILL_INTERVAL,
  GRAVITY,
  JUMP_SPEED,
  LILYPAD_JUMP_SPEED,
  MAX_ACTIVE_FLIES,
  MAX_PARTICLES,
  MIN_LOCAL_FLIES,
  MOVE_SPEED,
  PLACED_PAD_HEIGHT,
  PLACED_PAD_WIDTH,
  TONGUE_COOLDOWN,
  TONGUE_HOLD,
  TONGUE_MAX,
  TONGUE_UPGRADE_LIMIT,
  TONGUE_UPGRADE_STEP,
  TONGUE_SPEED,
  TUTORIAL_END_X,
  VIEW_HEIGHT,
  VIEW_WIDTH,
  keys,
} from "./constants.js";
import { beep } from "./audio.js";
import { WORLD, cameraMax, getItemsInRange, getRegionName } from "./world.js";
import { clamp, lineCircleHit, rectsOverlap } from "./utils.js";

function makeFly(point, ageOffset = 0) {
  return {
    id: crypto.randomUUID(),
    anchorKey: `${point.x}:${point.y}`,
    anchorX: point.x,
    anchorY: point.y,
    x: point.x,
    y: point.y,
    radius: 11,
    wobble: Math.random() * Math.PI * 2,
    orbit: point.orbit ?? 44 + Math.random() * 48,
    age: ageOffset,
  };
}

export function createInitialState() {
  const starterPoints = WORLD.flySpawnPoints.slice(0, MAX_ACTIVE_FLIES);
  return {
    time: 0,
    cameraX: 0,
    score: 0,
    pearls: 0,
    amber: 0,
    lilyPads: 0,
    tongueRangeBonus: 0,
    purchasedUpgrades: new Set(),
    collectedPickups: new Set(),
    collectedRelics: new Set(),
    placedPads: [],
    placementMode: false,
    nearbyNpcId: null,
    notice: "Catch flies, trade with pond folk, and explore the open map.",
    noticeTimer: 3.2,
    tutorialComplete: false,
    pointer: { x: WORLD.spawn.x, y: WORLD.spawn.y },
    reachedGoal: false,
    activeCheckpoint: null,
    checkpointFlash: 0,
    flySpawnCooldown: 1.5,
    regionName: getRegionName(WORLD.spawn.x),
    active: getActiveWorld(0, WORLD.spawn.x),
    frog: {
      x: WORLD.spawn.x,
      y: WORLD.spawn.y,
      vx: 0,
      vy: 0,
      facing: 1,
      grounded: false,
      onLilypad: false,
      inWater: false,
      jumpHeld: false,
    },
    flies: starterPoints.map((point, index) => makeFly(point, index * 0.25)),
    tongueCooldown: 0,
    tongue: {
      active: false,
      returning: false,
      hold: 0,
      length: 0,
      targetLength: 0,
      angle: 0,
      caughtFlyId: null,
      tipX: WORLD.spawn.x,
      tipY: WORLD.spawn.y,
    },
    particles: [],
  };
}

export function getActiveWorld(cameraX, frogX = cameraX) {
  const minX = Math.min(cameraX, frogX) - ACTIVE_MARGIN;
  const maxX = Math.max(cameraX + VIEW_WIDTH, frogX) + ACTIVE_MARGIN;
  return {
    platforms: getItemsInRange(WORLD.spatial.platforms, minX, maxX),
    waterZones: getItemsInRange(WORLD.spatial.waterZones, minX, maxX),
    lilypads: getItemsInRange(WORLD.spatial.lilypads, minX, maxX),
    npcs: getItemsInRange(WORLD.spatial.npcs, minX, maxX),
    flySpawnPoints: getItemsInRange(WORLD.spatial.flySpawnPoints, minX, maxX),
    relics: getItemsInRange(WORLD.spatial.relics, minX, maxX),
    pearls: getItemsInRange(WORLD.spatial.pearls, minX, maxX),
    amberCoins: getItemsInRange(WORLD.spatial.amberCoins, minX, maxX),
    cars: getItemsInRange(WORLD.spatial.cars, minX, maxX),
    messages: getItemsInRange(WORLD.spatial.messages, minX, maxX),
    checkpoints: getItemsInRange(WORLD.spatial.checkpoints, minX, maxX),
    caveZones: getItemsInRange(WORLD.spatial.caveZones, minX, maxX),
    decorations: getItemsInRange(WORLD.spatial.decorations, minX, maxX),
  };
}

export function findNearbyNpc(state) {
  const frogCenterX = state.frog.x + FROG_WIDTH / 2;
  const frogFeetY = state.frog.y + FROG_HEIGHT;
  return state.active.npcs.find((npc) => (
    Math.abs(npc.x - frogCenterX) < 95 &&
    Math.abs(npc.y - frogFeetY) < 95
  )) ?? null;
}

function forEachLilypad(state, callback) {
  for (const pad of state.active.lilypads) callback(pad);
  for (const pad of state.placedPads) {
    if (pad.x + pad.w >= state.cameraX - ACTIVE_MARGIN && pad.x <= state.cameraX + VIEW_WIDTH + ACTIVE_MARGIN) {
      callback(pad);
    }
  }
}

export function updateGame(state, pressed, pointer, dt, soundOn) {
  state.time += dt;
  state.checkpointFlash = Math.max(0, state.checkpointFlash - dt);
  state.noticeTimer = Math.max(0, state.noticeTimer - dt);
  state.tongueCooldown = Math.max(0, state.tongueCooldown - dt);
  state.pointer = { x: pointer.x, y: pointer.y };

  const frog = state.frog;
  const previousY = frog.y;
  const wantsLeft = keys.left.some((key) => pressed.has(key));
  const wantsRight = keys.right.some((key) => pressed.has(key));
  const wantsJump = keys.jump.some((key) => pressed.has(key));

  if (wantsLeft === wantsRight) {
    frog.vx *= Math.pow(0.001, dt);
  } else {
    frog.vx = wantsLeft ? -MOVE_SPEED : MOVE_SPEED;
    frog.facing = wantsLeft ? -1 : 1;
  }

  if (wantsJump && frog.grounded && !frog.jumpHeld) {
    frog.vy = frog.onLilypad ? -LILYPAD_JUMP_SPEED : -JUMP_SPEED;
    frog.grounded = false;
    frog.jumpHeld = true;
    addSplash(state, frog.x + FROG_WIDTH / 2, frog.y + FROG_HEIGHT, frog.onLilypad ? "#b8f05e" : "#bff5ff");
    if (soundOn) beep(frog.onLilypad ? 760 : 440, 0.04);
  }
  if (!wantsJump) {
    frog.jumpHeld = false;
  }

  frog.vy += GRAVITY * dt;
  frog.x += frog.vx * dt;
  frog.y += frog.vy * dt;
  frog.x = clamp(frog.x, 18, WORLD.worldWidth - FROG_WIDTH - 20);
  if (frog.x >= TUTORIAL_END_X) {
    state.tutorialComplete = true;
  }

  state.active = getActiveWorld(state.cameraX, frog.x);
  resolveTerrain(state, previousY);
  updateFlies(state, dt);
  updateTongue(state, pointer, dt, soundOn);
  updateParticles(state, dt);
  updateCheckpoint(state, soundOn);
  updateCurrencyPickups(state, soundOn);
  updateRelics(state, soundOn);
  updateCarHazards(state, soundOn);
  state.nearbyNpcId = findNearbyNpc(state)?.id ?? null;

  if (state.noticeTimer <= 0) {
    const npc = findNearbyNpc(state);
    if (npc) {
      state.notice = `${npc.name}: ${npc.talk}`;
    } else if (state.placementMode) {
      state.notice = "Click a water surface to place a lily pad.";
    } else if (state.tongueCooldown > 0) {
      state.notice = "Tongue cooling down. Time the next snap.";
    } else {
      state.notice = "Explore the open map, collect currencies, buy upgrades, and find hidden relic routes.";
    }
  }

  state.cameraX = clamp(frog.x + FROG_WIDTH / 2 - VIEW_WIDTH * 0.42, 0, cameraMax());
  state.regionName = getRegionName(frog.x + FROG_WIDTH / 2);
  state.active = getActiveWorld(state.cameraX, frog.x);
  updateGoal(state, soundOn);

  if (frog.y > VIEW_HEIGHT + 240) {
    respawnFrog(state);
  }
}

function resolveTerrain(state, previousY) {
  const frog = state.frog;
  const previousBottom = previousY + FROG_HEIGHT;
  frog.grounded = false;
  frog.onLilypad = false;
  frog.inWater = false;

  let frogRect = { x: frog.x, y: frog.y, w: FROG_WIDTH, h: FROG_HEIGHT };

  for (const zone of state.active.waterZones) {
    if (rectsOverlap(frogRect, zone) && frog.y + FROG_HEIGHT >= zone.y + 6) {
      frog.inWater = true;
      const walkY = zone.y + 18 - FROG_HEIGHT;
      if (frog.y > walkY) {
        frog.y = walkY;
        frog.vy = Math.min(frog.vy, 35);
        frog.grounded = true;
        frogRect = { x: frog.x, y: frog.y, w: FROG_WIDTH, h: FROG_HEIGHT };
      }
      frog.vx *= 0.985;
    }
  }

  for (const platform of state.active.platforms) {
    const platformRect = { x: platform.x, y: platform.y, w: platform.w, h: platform.h };
    if (
      rectsOverlap(frogRect, platformRect) &&
      frog.vy >= 0 &&
      previousBottom <= platform.y + 12
    ) {
      frog.y = platform.y - FROG_HEIGHT;
      frog.vy = 0;
      frog.grounded = true;
      frogRect = { x: frog.x, y: frog.y, w: FROG_WIDTH, h: FROG_HEIGHT };
    }
  }

  forEachLilypad(state, (pad) => {
    const bob = Math.sin(state.time * 2.4 + pad.phase) * 4;
    const padRect = { x: pad.x, y: pad.y + bob, w: pad.w, h: pad.h };
    const footDistance = frog.y + FROG_HEIGHT - padRect.y;
    const canStepFromWater = frog.inWater && frog.grounded && footDistance > 0 && footDistance < 48;
    if (
      rectsOverlap(frogRect, padRect) &&
      frog.vy >= 0 &&
      (previousBottom <= padRect.y + 14 || canStepFromWater)
    ) {
      frog.y = padRect.y - FROG_HEIGHT;
      frog.vy = 0;
      frog.grounded = true;
      frog.onLilypad = true;
      frogRect = { x: frog.x, y: frog.y, w: FROG_WIDTH, h: FROG_HEIGHT };
    }
  });
}

export function tradeWithNearbyNpc(state, soundOn) {
  const npc = findNearbyNpc(state);
  if (!npc) {
    setNotice(state, "No trader nearby. Stand next to an NPC and press E.");
    return false;
  }

  const currency = npc.currency ?? "flies";
  const available = getCurrency(state, currency);
  if (available < npc.cost) {
    setNotice(state, `${npc.name} wants ${npc.cost} ${currencyLabel(currency)}. You have ${available}.`);
    if (soundOn) beep(180, 0.04);
    return false;
  }

  if (npc.reward === "tongueRange") {
    if (state.purchasedUpgrades.has(npc.id) || state.tongueRangeBonus >= TONGUE_UPGRADE_STEP * TONGUE_UPGRADE_LIMIT) {
      setNotice(state, `${npc.name} has already upgraded your tongue.`);
      return false;
    }
    spendCurrency(state, currency, npc.cost);
    state.tongueRangeBonus += npc.rangeBonus ?? TONGUE_UPGRADE_STEP;
    state.purchasedUpgrades.add(npc.id);
    setNotice(state, `${npc.name} upgraded tongue range by ${npc.rangeBonus ?? TONGUE_UPGRADE_STEP}.`);
    addSplash(state, npc.x, npc.y - 42, "#f6b7ff");
    if (soundOn) beep(980, 0.06);
    return true;
  }

  spendCurrency(state, currency, npc.cost);
  state.lilyPads += npc.pads;
  setNotice(state, `${npc.name} traded ${npc.pads} lily pad for ${npc.cost} ${currencyLabel(currency)}.`);
  addSplash(state, npc.x, npc.y - 42, "#b8f05e");
  if (soundOn) beep(700, 0.05);
  return true;
}

export function togglePlacementMode(state) {
  if (state.placementMode) {
    state.placementMode = false;
    setNotice(state, "Placement cancelled. Click now uses the tongue again.", 1.8);
    return;
  }

  if (state.lilyPads <= 0) {
    setNotice(state, "You need to trade flies for a lily pad first.");
    return;
  }

  state.placementMode = true;
  setNotice(state, "Placement mode: click water to choose where the lily pad goes.");
}

export function placeLilyPad(state, pointer, soundOn) {
  if (state.lilyPads <= 0) {
    state.placementMode = false;
    setNotice(state, "No lily pads left. Trade with an NPC for more.");
    return false;
  }

  const waterZones = getItemsInRange(WORLD.spatial.waterZones, pointer.x - 20, pointer.x + 20);
  const zone = waterZones.find((water) => (
    pointer.x >= water.x &&
    pointer.x <= water.x + water.w &&
    pointer.y >= water.y - 36 &&
    pointer.y <= water.y + water.h
  ));

  if (!zone) {
    setNotice(state, "Lily pads can only be placed on water.");
    return false;
  }

  const x = clamp(pointer.x - PLACED_PAD_WIDTH / 2, zone.x + 12, zone.x + zone.w - PLACED_PAD_WIDTH - 12);
  const y = zone.y - 23;
  const newPad = { x, y, w: PLACED_PAD_WIDTH, h: PLACED_PAD_HEIGHT, phase: Math.random() * Math.PI * 2, placed: true };
  const basePads = getItemsInRange(WORLD.spatial.lilypads, x - 120, x + PLACED_PAD_WIDTH + 120);
  const existingPads = [...basePads, ...state.placedPads];
  const tooClose = existingPads.some((pad) => (
    Math.abs((pad.x + pad.w / 2) - (newPad.x + newPad.w / 2)) < 78 &&
    Math.abs(pad.y - newPad.y) < 42
  ));

  if (tooClose) {
    setNotice(state, "That spot is too close to another lily pad.");
    return false;
  }

  state.placedPads.push(newPad);
  state.lilyPads -= 1;
  state.placementMode = state.lilyPads > 0;
  setNotice(state, state.placementMode ? "Pad placed. Click another water spot or press P to stop." : "Pad placed. Catch more flies if you need another.");
  addSplash(state, newPad.x + newPad.w / 2, newPad.y + 16, "#b8f05e");
  if (soundOn) beep(620, 0.05);
  return true;
}

function updateFlies(state, dt) {
  const tongueFlyId = state.tongue.caughtFlyId;
  const minAnchorX = Math.min(state.cameraX, state.frog.x) - FLY_DESPAWN_MARGIN;
  const maxAnchorX = Math.max(state.cameraX + VIEW_WIDTH, state.frog.x) + FLY_DESPAWN_MARGIN;

  let writeIndex = 0;
  for (const fly of state.flies) {
    fly.age += dt;
    fly.x = fly.anchorX + Math.cos(fly.age * 1.8 + fly.wobble) * fly.orbit;
    fly.y = fly.anchorY + Math.sin(fly.age * 2.6 + fly.wobble * 0.7) * (fly.orbit * 0.55);
    if (fly.id === tongueFlyId || (fly.anchorX >= minAnchorX && fly.anchorX <= maxAnchorX)) {
      state.flies[writeIndex] = fly;
      writeIndex += 1;
    }
  }
  state.flies.length = writeIndex;

  const localSpawnPoints = state.active.flySpawnPoints;
  if (!localSpawnPoints.length || state.flies.length >= MAX_ACTIVE_FLIES) {
    state.flySpawnCooldown = Math.min(state.flySpawnCooldown, FLY_REFILL_INTERVAL);
    return;
  }

  state.flySpawnCooldown -= dt;
  if (state.flySpawnCooldown > 0) {
    return;
  }

  const used = new Set(state.flies.map((fly) => fly.anchorKey));
  const openPoints = localSpawnPoints.filter((point) => !used.has(`${point.x}:${point.y}`));
  const point = openPoints.length
    ? openPoints[Math.floor(Math.random() * openPoints.length)]
    : localSpawnPoints[Math.floor(Math.random() * localSpawnPoints.length)];

  if (point) {
    state.flies.push(makeFly(point));
  }
  state.flySpawnCooldown = state.flies.length < MIN_LOCAL_FLIES
    ? FLY_REFILL_INTERVAL
    : 0.9 + Math.random() * 0.8;
}

function updateCheckpoint(state, soundOn) {
  const frogRect = { x: state.frog.x, y: state.frog.y, w: FROG_WIDTH, h: FROG_HEIGHT };
  for (const checkpoint of state.active.checkpoints) {
    const checkpointRect = { x: checkpoint.x - 28, y: checkpoint.y - 86, w: 56, h: 100 };
    if (rectsOverlap(frogRect, checkpointRect)) {
      if (state.activeCheckpoint?.id !== checkpoint.id) {
        state.activeCheckpoint = checkpoint;
        state.checkpointFlash = 1.5;
        setNotice(state, `${getRegionName(checkpoint.x)} checkpoint saved.`);
        addSplash(state, checkpoint.x, checkpoint.y - 38, "#ffdf5d");
        if (soundOn) beep(660, 0.05);
      }
      return;
    }
  }
}

function updateRelics(state, soundOn) {
  const frogRect = { x: state.frog.x, y: state.frog.y, w: FROG_WIDTH, h: FROG_HEIGHT };
  for (const relic of state.active.relics) {
    if (state.collectedRelics.has(relic.id)) {
      continue;
    }

    const relicRect = { x: relic.x - 15, y: relic.y - 15, w: 30, h: 30 };
    if (rectsOverlap(frogRect, relicRect)) {
      state.collectedRelics.add(relic.id);
      setNotice(state, `Found a glowing relic. Relics collected: ${state.collectedRelics.size}.`);
      addSplash(state, relic.x, relic.y, "#a7f3ff");
      if (soundOn) beep(1040, 0.06);
    }
  }
}

function updateCurrencyPickups(state, soundOn) {
  const frogRect = { x: state.frog.x, y: state.frog.y, w: FROG_WIDTH, h: FROG_HEIGHT };
  collectPickups(state, frogRect, state.active.pearls, "pearls", "#f6b7ff", soundOn);
  collectPickups(state, frogRect, state.active.amberCoins, "amber", "#ffbd5f", soundOn);
}

function collectPickups(state, frogRect, pickups, currency, color, soundOn) {
  for (const pickup of pickups) {
    if (state.collectedPickups.has(pickup.id)) {
      continue;
    }
    const pickupRect = { x: pickup.x - 13, y: pickup.y - 13, w: 26, h: 26 };
    if (rectsOverlap(frogRect, pickupRect)) {
      state.collectedPickups.add(pickup.id);
      addCurrency(state, currency, pickup.value ?? 1);
      setNotice(state, `Collected ${pickup.value ?? 1} ${currencyLabel(currency)}.`);
      addSplash(state, pickup.x, pickup.y, color);
      if (soundOn) beep(currency === "pearls" ? 1120 : 820, 0.045);
    }
  }
}

function updateGoal(state, soundOn) {
  const frogRect = { x: state.frog.x, y: state.frog.y, w: FROG_WIDTH, h: FROG_HEIGHT };
  const goalRect = { x: WORLD.goal.x - 20, y: WORLD.goal.y - 24, w: 120, h: 190 };
  const wasReached = state.reachedGoal;
  state.reachedGoal = rectsOverlap(frogRect, goalRect);
  if (state.reachedGoal && !wasReached) {
    setNotice(state, "Windbell shrine found. Keep exploring for relics, pearls, amber, or restart for a faster run.", 4);
    addSplash(state, WORLD.goal.x + 36, WORLD.goal.y + 48, "#ffdf5d");
    if (soundOn) beep(880, 0.05);
  }
}

function updateCarHazards(state, soundOn) {
  const frogRect = { x: state.frog.x + 6, y: state.frog.y + 6, w: FROG_WIDTH - 12, h: FROG_HEIGHT - 8 };
  for (const car of state.active.cars) {
    const carRect = getCarRect(car, state.time);
    if (rectsOverlap(frogRect, carRect)) {
      setNotice(state, "A car crashed into you. Check the lane timing before crossing.", 2.8);
      addSplash(state, state.frog.x + FROG_WIDTH / 2, state.frog.y + FROG_HEIGHT / 2, "#ff7e67");
      if (soundOn) beep(140, 0.08);
      respawnFrog(state);
      return;
    }
  }
}

function getCarRect(car, time) {
  const carWidth = car.carW ?? 86;
  const laneLength = Math.max(carWidth, car.w - carWidth);
  const cycle = laneLength / car.speed;
  const shiftedTime = (time + (car.offset ?? 0) * cycle) % cycle;
  const progress = shiftedTime / cycle;
  const rawX = car.direction === -1
    ? car.x + laneLength - progress * laneLength
    : car.x + progress * laneLength;
  return {
    x: rawX,
    y: car.y,
    w: carWidth,
    h: car.h,
  };
}

export function respawnFrog(state) {
  const spawn = state.activeCheckpoint
    ? { x: state.activeCheckpoint.spawnX, y: state.activeCheckpoint.spawnY }
    : WORLD.spawn;

  state.frog = {
    x: spawn.x,
    y: spawn.y,
    vx: 0,
    vy: 0,
    facing: 1,
    grounded: false,
    onLilypad: false,
    inWater: false,
    jumpHeld: false,
  };
  state.tongue.active = false;
  state.tongue.caughtFlyId = null;
  state.tongueCooldown = TONGUE_COOLDOWN;
  state.cameraX = clamp(state.frog.x + FROG_WIDTH / 2 - VIEW_WIDTH * 0.42, 0, cameraMax());
  state.active = getActiveWorld(state.cameraX, state.frog.x);
  addSplash(state, spawn.x + FROG_WIDTH / 2, spawn.y + FROG_HEIGHT, state.activeCheckpoint ? "#ffdf5d" : "#bff5ff");
}

export function startTongue(state, pointer) {
  if (state.tongue.active || state.tongueCooldown > 0) {
    return false;
  }

  const frog = state.frog;
  const mouthX = frog.x + FROG_WIDTH / 2 + frog.facing * 19;
  const mouthY = frog.y + 17;
  const dx = pointer.x - mouthX;
  const dy = pointer.y - mouthY;
  const distance = Math.sqrt(dx * dx + dy * dy) || 1;
  state.tongue = {
    active: true,
    returning: false,
    hold: 0,
    length: 0,
    targetLength: Math.min(distance, TONGUE_MAX + state.tongueRangeBonus),
    angle: Math.atan2(dy, dx),
    caughtFlyId: null,
    tipX: mouthX,
    tipY: mouthY,
  };
  frog.facing = dx < 0 ? -1 : 1;
  return true;
}

function updateTongue(state, pointer, dt, soundOn) {
  const tongue = state.tongue;
  if (!tongue.active) {
    if (pointer.down && state.tongueCooldown <= 0) {
      startTongue(state, pointer);
    }
    return;
  }

  const frog = state.frog;
  const mouthX = frog.x + FROG_WIDTH / 2 + frog.facing * 19;
  const mouthY = frog.y + 17;
  const target = tongue.returning ? 0 : tongue.targetLength;
  const direction = tongue.returning ? -1 : 1;
  tongue.length += direction * TONGUE_SPEED * dt;
  tongue.length = clamp(tongue.length, 0, tongue.targetLength);
  tongue.tipX = mouthX + Math.cos(tongue.angle) * tongue.length;
  tongue.tipY = mouthY + Math.sin(tongue.angle) * tongue.length;

  if (!tongue.returning) {
    for (const fly of state.flies) {
      if (lineCircleHit(mouthX, mouthY, tongue.tipX, tongue.tipY, fly.x, fly.y, fly.radius + 8)) {
        tongue.caughtFlyId = fly.id;
        tongue.returning = true;
        state.score += 1;
        addSplash(state, fly.x, fly.y, "#ffe96f");
        if (soundOn) beep(920, 0.035);
        break;
      }
    }

    if (Math.abs(tongue.length - target) < 1) {
      tongue.hold += dt;
      if (tongue.hold > TONGUE_HOLD) {
        tongue.returning = true;
      }
    }
  }

  if (tongue.caughtFlyId) {
    const fly = state.flies.find((item) => item.id === tongue.caughtFlyId);
    if (fly) {
      fly.x = tongue.tipX;
      fly.y = tongue.tipY;
    }
  }

  if (tongue.returning && tongue.length <= 1) {
    if (tongue.caughtFlyId) {
      state.flies = state.flies.filter((fly) => fly.id !== tongue.caughtFlyId);
    }
    tongue.active = false;
    tongue.caughtFlyId = null;
    state.tongueCooldown = TONGUE_COOLDOWN;
  }
}

function updateParticles(state, dt) {
  let writeIndex = 0;
  for (const particle of state.particles) {
    particle.age += dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vy += 500 * dt;
    if (particle.age < particle.life) {
      state.particles[writeIndex] = particle;
      writeIndex += 1;
    }
  }
  state.particles.length = writeIndex;
}

function addSplash(state, x, y, color) {
  for (let i = 0; i < 6; i += 1) {
    if (state.particles.length >= MAX_PARTICLES) {
      state.particles.shift();
    }
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.9;
    const speed = 70 + Math.random() * 160;
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      age: 0,
      life: 0.35 + Math.random() * 0.25,
      color,
    });
  }
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
  if (currency === "pearls") {
    state.pearls -= amount;
  } else if (currency === "amber") {
    state.amber -= amount;
  } else {
    state.score -= amount;
  }
}

function addCurrency(state, currency, amount) {
  if (currency === "pearls") {
    state.pearls += amount;
  } else if (currency === "amber") {
    state.amber += amount;
  } else {
    state.score += amount;
  }
}

function currencyLabel(currency) {
  if (currency === "pearls") return "moon pearls";
  if (currency === "amber") return "amber coins";
  return "flies";
}
