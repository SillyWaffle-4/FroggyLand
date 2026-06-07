import {
  FROG_HEIGHT,
  FROG_WIDTH,
  PLACED_PAD_WIDTH,
  VIEW_HEIGHT,
  VIEW_WIDTH,
} from "./constants.js";
import { WORLD } from "./world.js";
import { clamp, isPointVisible, isRectVisible, roundRect } from "./utils.js";

export function drawGame(ctx, state) {
  const cameraX = state.cameraX;
  ctx.clearRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  drawSky(ctx, cameraX);

  ctx.save();
  ctx.translate(-cameraX, 0);
  drawBackLayer(ctx, cameraX);
  drawCaves(ctx, state.active.caveZones, cameraX);
  drawWater(ctx, state.active.waterZones, state.time, cameraX);
  drawPlatforms(ctx, state.active.platforms, cameraX);
  drawDecorations(ctx, state.active.decorations, cameraX);
  drawLilypads(ctx, state, state.time, cameraX);
  drawPlacementPreview(ctx, state);
  drawMessages(ctx, state.active.messages, cameraX);
  drawCurrencyPickups(ctx, state, cameraX);
  drawRelics(ctx, state, state.active.relics, cameraX);
  drawNpcs(ctx, state, state.active.npcs, cameraX);
  drawFlies(ctx, state.flies, state.time, cameraX);
  drawTongue(ctx, state);
  drawFrog(ctx, state.frog, state.time);
  drawParticles(ctx, state.particles, cameraX);
  drawCheckpoints(ctx, state, state.active.checkpoints, cameraX);
  drawGoal(ctx, state, cameraX);
  ctx.restore();

  drawAreaBanner(ctx, state);
}

function drawSky(ctx, cameraX) {
  ctx.fillStyle = "#9eddf4";
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  ctx.fillStyle = "#d7f1ce";
  ctx.fillRect(0, VIEW_HEIGHT * 0.55, VIEW_WIDTH, VIEW_HEIGHT * 0.45);

  ctx.fillStyle = "rgba(255,255,255,0.72)";
  for (let i = 0; i < 4; i += 1) {
    const x = ((i * 330 - cameraX * 0.12) % (VIEW_WIDTH + 180)) - 90;
    const y = 70 + (i % 2) * 54;
    drawCloud(ctx, x, y, 0.82);
  }
}

function drawCloud(ctx, x, y, scale) {
  ctx.beginPath();
  ctx.ellipse(x, y, 44 * scale, 17 * scale, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 36 * scale, y + 2, 32 * scale, 14 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawBackLayer(ctx, cameraX) {
  ctx.fillStyle = "#5aae61";
  const hillStart = Math.max(-120, Math.floor(cameraX / 360) * 360 - 420);
  for (let x = hillStart; x < WORLD.worldWidth + 300; x += 360) {
    if (x > cameraX + VIEW_WIDTH + 320) break;
    ctx.beginPath();
    ctx.moveTo(x, 540);
    ctx.quadraticCurveTo(x + 120, 330, x + 270, 540);
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = "#316f48";
  const treeStart = Math.max(30, Math.floor(cameraX / 280) * 280 - 280);
  for (let x = treeStart; x < WORLD.worldWidth; x += 280) {
    if (x > cameraX + VIEW_WIDTH + 240) break;
    ctx.fillRect(x, 486, 14, 54);
    ctx.fillRect(x - 24, 448, 62, 42);
  }
}

function drawCaves(ctx, caveZones, cameraX) {
  for (const cave of caveZones) {
    if (!isRectVisible(cameraX, cave.x, cave.w)) {
      continue;
    }

    ctx.fillStyle = "#22332e";
    roundRect(ctx, cave.x, cave.y, cave.w, cave.h, 8);
    ctx.fill();
    ctx.fillStyle = "#16231f";
    ctx.fillRect(cave.x, cave.y + cave.h - 56, cave.w, 56);

    ctx.fillStyle = "#304942";
    for (let x = cave.x + 80; x < cave.x + cave.w; x += 180) {
      ctx.beginPath();
      ctx.moveTo(x, cave.y);
      ctx.lineTo(x + 35, cave.y + 84);
      ctx.lineTo(x + 70, cave.y);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function drawWater(ctx, waterZones, time, cameraX) {
  for (const zone of waterZones) {
    if (!isRectVisible(cameraX, zone.x, zone.w)) {
      continue;
    }
    ctx.fillStyle = "#2fb6c8";
    ctx.fillRect(zone.x, zone.y, zone.w, zone.h);
    ctx.strokeStyle = "rgba(255,255,255,0.38)";
    ctx.lineWidth = 2;
    for (let y = zone.y + 20; y < zone.y + zone.h; y += 40) {
      ctx.beginPath();
      for (let x = zone.x; x <= zone.x + zone.w; x += 70) {
        const waveY = y + Math.sin(time * 2 + x * 0.02) * 3;
        if (x === zone.x) ctx.moveTo(x, waveY);
        else ctx.lineTo(x, waveY);
      }
      ctx.stroke();
    }
  }
}

function drawPlatforms(ctx, platforms, cameraX) {
  for (const platform of platforms) {
    if (!isRectVisible(cameraX, platform.x, platform.w)) {
      continue;
    }
    const isGround = platform.type === "ground";
    const isCave = platform.type === "cave";
    const isMoss = platform.type === "moss";
    ctx.fillStyle = isGround ? "#765b35" : isCave ? "#3d332d" : platform.type === "stone" ? "#737a77" : "#5b8f3a";
    roundRect(ctx, platform.x, platform.y, platform.w, platform.h, 8);
    ctx.fill();
    ctx.fillStyle = isGround ? "#70b34a" : isCave ? "#6b5a4e" : isMoss ? "#73ad58" : platform.type === "stone" ? "#a8b1a9" : "#8ed05c";
    roundRect(ctx, platform.x, platform.y, platform.w, Math.min(16, platform.h), 8);
    ctx.fill();
  }
}

function drawDecorations(ctx, decorations, cameraX) {
  for (const item of decorations) {
    if (!isPointVisible(cameraX, item.x, 110)) {
      continue;
    }
    if (item.type === "crystal") {
      ctx.fillStyle = item.color ?? "#a7f3ff";
      ctx.beginPath();
      ctx.moveTo(item.x, item.y - 44);
      ctx.lineTo(item.x + 18, item.y - 12);
      ctx.lineTo(item.x + 3, item.y);
      ctx.lineTo(item.x - 16, item.y - 10);
      ctx.closePath();
      ctx.fill();
      continue;
    }
    if (item.type === "mushroom") {
      ctx.fillStyle = "#f8f0d8";
      ctx.fillRect(item.x - 7, item.y - 30, 14, 30);
      ctx.fillStyle = item.color ?? "#ff7e67";
      ctx.beginPath();
      ctx.ellipse(item.x, item.y - 32, 28, 14, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      continue;
    }
    if (item.type === "vine") {
      ctx.strokeStyle = "#315f3d";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(item.x, item.y - 80);
      ctx.bezierCurveTo(item.x - 24, item.y - 45, item.x + 20, item.y - 30, item.x - 8, item.y);
      ctx.stroke();
      continue;
    }
    ctx.fillStyle = "#568849";
    ctx.fillRect(item.x, item.y - 34, 6, 34);
    ctx.fillRect(item.x + 16, item.y - 26, 6, 26);
  }
}

function drawLilypads(ctx, state, time, cameraX) {
  const pads = [...state.active.lilypads, ...state.placedPads];
  for (const pad of pads) {
    if (!isRectVisible(cameraX, pad.x, pad.w)) {
      continue;
    }
    const bob = Math.sin(time * 2.4 + pad.phase) * 4;
    ctx.fillStyle = pad.placed ? "#8bdc4e" : "#6dbb4d";
    ctx.beginPath();
    ctx.ellipse(pad.x + pad.w / 2, pad.y + bob + 12, pad.w / 2, 18, 0, 0.24, Math.PI * 2.05);
    ctx.lineTo(pad.x + pad.w / 2, pad.y + bob + 12);
    ctx.fill();
    ctx.strokeStyle = pad.placed ? "#f5db5e" : "#3c7935";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = "#d6f76d";
    ctx.beginPath();
    ctx.ellipse(pad.x + pad.w / 2 - 18, pad.y + bob + 7, 16, 5, -0.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlacementPreview(ctx, state) {
  if (!state.placementMode || state.lilyPads <= 0) {
    return;
  }

  const pointer = state.pointer;
  const zone = state.active.waterZones.find((water) => (
    pointer.x >= water.x &&
    pointer.x <= water.x + water.w &&
    pointer.y >= water.y - 36 &&
    pointer.y <= water.y + water.h
  ));

  if (!zone) {
    return;
  }

  const x = clamp(pointer.x - PLACED_PAD_WIDTH / 2, zone.x + 12, zone.x + zone.w - PLACED_PAD_WIDTH - 12);
  const y = zone.y - 23;
  ctx.save();
  ctx.globalAlpha = 0.58;
  ctx.fillStyle = "#d9fb75";
  ctx.beginPath();
  ctx.ellipse(x + PLACED_PAD_WIDTH / 2, y + 12, PLACED_PAD_WIDTH / 2, 18, 0, 0.24, Math.PI * 2.05);
  ctx.lineTo(x + PLACED_PAD_WIDTH / 2, y + 12);
  ctx.fill();
  ctx.strokeStyle = "#ffdf5d";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
}

function drawMessages(ctx, messages, cameraX) {
  ctx.font = "600 17px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  for (const message of messages) {
    const width = message.w ?? 290;
    if (!isRectVisible(cameraX, message.x - width / 2, width, 80)) {
      continue;
    }
    ctx.fillStyle = "rgba(26, 46, 31, 0.22)";
    roundRect(ctx, message.x - width / 2, message.y - 30, width, 44, 8);
    ctx.fill();
    ctx.fillStyle = "#1b3824";
    ctx.fillText(message.text, message.x, message.y);
  }
}

function drawRelics(ctx, state, relics, cameraX) {
  for (const relic of relics) {
    if (state.collectedRelics.has(relic.id) || !isPointVisible(cameraX, relic.x, 90)) {
      continue;
    }

    const pulse = 0.75 + Math.sin(state.time * 5 + relic.x * 0.01) * 0.18;
    ctx.save();
    ctx.translate(relic.x, relic.y);
    ctx.rotate(state.time * 1.8);
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = "#a7f3ff";
    ctx.beginPath();
    ctx.moveTo(0, -15 * pulse);
    ctx.lineTo(12 * pulse, 0);
    ctx.lineTo(0, 15 * pulse);
    ctx.lineTo(-12 * pulse, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
}

function drawCurrencyPickups(ctx, state, cameraX) {
  drawPickupSet(ctx, state, state.active.pearls, cameraX, {
    currency: "pearls",
    fill: "#f6b7ff",
    stroke: "#ffffff",
    glow: "rgba(246, 183, 255, 0.34)",
  });
  drawPickupSet(ctx, state, state.active.amberCoins, cameraX, {
    currency: "amber",
    fill: "#ffbd5f",
    stroke: "#fff2c0",
    glow: "rgba(255, 189, 95, 0.3)",
  });
}

function drawPickupSet(ctx, state, pickups, cameraX, style) {
  for (const pickup of pickups) {
    if (state.collectedPickups.has(pickup.id) || !isPointVisible(cameraX, pickup.x, 90)) {
      continue;
    }

    const pulse = 1 + Math.sin(state.time * 4.2 + pickup.x * 0.01) * 0.12;
    ctx.save();
    ctx.translate(pickup.x, pickup.y);
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = style.glow;
    ctx.beginPath();
    ctx.arc(0, 0, 22 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = style.fill;
    ctx.strokeStyle = style.stroke;
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (style.currency === "pearls") {
      ctx.arc(0, 0, 10 * pulse, 0, Math.PI * 2);
    } else {
      ctx.moveTo(0, -12 * pulse);
      ctx.lineTo(11 * pulse, -2 * pulse);
      ctx.lineTo(7 * pulse, 12 * pulse);
      ctx.lineTo(-8 * pulse, 12 * pulse);
      ctx.lineTo(-11 * pulse, -2 * pulse);
      ctx.closePath();
    }
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

function drawNpcs(ctx, state, npcs, cameraX) {
  for (const npc of npcs) {
    if (!isPointVisible(cameraX, npc.x, 140)) {
      continue;
    }

    const nearby = state.nearbyNpcId === npc.id;
    ctx.save();
    ctx.translate(npc.x, npc.y);

    ctx.fillStyle = "rgba(27, 56, 36, 0.22)";
    ctx.beginPath();
    ctx.ellipse(0, 4, 30, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = nearby ? "#ffe27a" : "#c98d4c";
    ctx.beginPath();
    ctx.ellipse(0, -31, 21, 27, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#5f3a25";
    ctx.beginPath();
    ctx.ellipse(-11, -50, 9, 9, 0, 0, Math.PI * 2);
    ctx.ellipse(11, -50, 9, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff8e5";
    ctx.beginPath();
    ctx.arc(-7, -34, 4, 0, Math.PI * 2);
    ctx.arc(8, -34, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2a241e";
    ctx.beginPath();
    ctx.arc(-6, -34, 2, 0, Math.PI * 2);
    ctx.arc(9, -34, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#1b3824";
    ctx.font = "700 14px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(npc.name, 0, -67);

    if (nearby) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.86)";
      roundRect(ctx, -118, -128, 236, 38, 8);
      ctx.fill();
      ctx.fillStyle = "#1b3824";
      ctx.font = "650 13px Inter, system-ui, sans-serif";
      ctx.fillText(`E: ${merchantLabel(npc)}`, 0, -105);
    }

    ctx.restore();
  }
}

function merchantLabel(npc) {
  const currency = npc.currency === "pearls" ? "pearls" : npc.currency === "amber" ? "amber" : "flies";
  if (npc.reward === "tongueRange") {
    return `${npc.cost} ${currency} -> tongue +${npc.rangeBonus ?? 90}`;
  }
  return `${npc.cost} ${currency} -> ${npc.pads} pad${npc.pads === 1 ? "" : "s"}`;
}

function drawFlies(ctx, flies, time, cameraX) {
  for (const fly of flies) {
    if (!isPointVisible(cameraX, fly.x, 80)) {
      continue;
    }

    ctx.save();
    ctx.translate(fly.x, fly.y);
    ctx.rotate(Math.sin(time * 12 + fly.wobble) * 0.12);
    ctx.fillStyle = "rgba(255,255,255,0.76)";
    ctx.beginPath();
    ctx.ellipse(-8, -6, 11, 6, -0.6, 0, Math.PI * 2);
    ctx.ellipse(8, -6, 11, 6, 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1c2520";
    ctx.beginPath();
    ctx.ellipse(0, 2, 9, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffe96f";
    ctx.beginPath();
    ctx.arc(4, 0, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawTongue(ctx, state) {
  const { tongue, frog } = state;
  if (!tongue.active) {
    return;
  }
  const mouthX = frog.x + FROG_WIDTH / 2 + frog.facing * 19;
  const mouthY = frog.y + 17;
  ctx.lineCap = "round";
  ctx.strokeStyle = "#ff6f8e";
  ctx.lineWidth = 9;
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
  ctx.arc(tongue.tipX, tongue.tipY, 9, 0, Math.PI * 2);
  ctx.fill();
}

function drawFrog(ctx, frog, time) {
  const squish = frog.grounded ? 1 + Math.sin(time * 10) * 0.015 : 0.95;

  ctx.save();
  ctx.translate(frog.x + FROG_WIDTH / 2, frog.y + FROG_HEIGHT / 2);
  ctx.scale(frog.facing, 1);
  ctx.fillStyle = frog.onLilypad ? "#75dc52" : frog.inWater ? "#5bc88f" : "#60cb55";
  ctx.beginPath();
  ctx.ellipse(0, 6, 30, 21 * squish, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#6ee064";
  ctx.beginPath();
  ctx.ellipse(8, -7, 24, 19, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#2d512d";
  ctx.beginPath();
  ctx.ellipse(-20, 22, 15, 6, -0.1, 0, Math.PI * 2);
  ctx.ellipse(18, 21, 16, 6, 0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f6ffe8";
  ctx.beginPath();
  ctx.arc(-5, -21, 9, 0, Math.PI * 2);
  ctx.arc(17, -20, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#202820";
  ctx.beginPath();
  ctx.arc(-2, -20, 4, 0, Math.PI * 2);
  ctx.arc(20, -19, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#235233";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(15, -2, 11, 0.18, 1.9);
  ctx.stroke();
  ctx.restore();
}

function drawParticles(ctx, particles, cameraX) {
  for (const particle of particles) {
    if (!isPointVisible(cameraX, particle.x, 60)) {
      continue;
    }

    const alpha = 1 - particle.age / particle.life;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, 4 * alpha + 1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawCheckpoints(ctx, state, checkpoints, cameraX) {
  for (const checkpoint of checkpoints) {
    if (!isPointVisible(cameraX, checkpoint.x, 120)) {
      continue;
    }
    const active = state.activeCheckpoint?.id === checkpoint.id;
    const glow = active ? 0.8 + Math.sin(state.time * 8) * 0.12 : 0;

    if (active || state.checkpointFlash > 0) {
      ctx.globalAlpha = active ? Math.max(glow, state.checkpointFlash) : 0.15;
      ctx.fillStyle = "#ffdf5d";
      ctx.beginPath();
      ctx.arc(checkpoint.x + 6, checkpoint.y - 76, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = "#5a3f2c";
    ctx.fillRect(checkpoint.x, checkpoint.y - 94, 10, 94);
    ctx.fillStyle = active ? "#ffdf5d" : "#8ac8ff";
    ctx.beginPath();
    ctx.moveTo(checkpoint.x + 10, checkpoint.y - 94);
    ctx.lineTo(checkpoint.x + 86, checkpoint.y - 72);
    ctx.lineTo(checkpoint.x + 10, checkpoint.y - 50);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#f6fbff";
    ctx.beginPath();
    ctx.arc(checkpoint.x + 32, checkpoint.y - 73, 8, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGoal(ctx, state, cameraX) {
  const poleX = WORLD.goal.x;
  if (!isPointVisible(cameraX, poleX, 140)) {
    return;
  }
  ctx.fillStyle = "#5a3f2c";
  ctx.fillRect(poleX, WORLD.goal.y, 12, 190);
  ctx.fillStyle = state.reachedGoal ? "#ffdf5d" : "#ff7e67";
  ctx.beginPath();
  ctx.moveTo(poleX + 12, WORLD.goal.y);
  ctx.lineTo(poleX + 112, WORLD.goal.y + 32);
  ctx.lineTo(poleX + 12, WORLD.goal.y + 64);
  ctx.closePath();
  ctx.fill();
}

function drawAreaBanner(ctx, state) {
  ctx.save();
  ctx.globalAlpha = Math.min(0.95, 0.42 + state.checkpointFlash);
  ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
  roundRect(ctx, 24, 22, 270, 54, 8);
  ctx.fill();
  ctx.fillStyle = "#1b3824";
  ctx.font = "750 20px Inter, system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(state.regionName, 42, 55);
  ctx.fillStyle = "#436653";
  ctx.font = "650 14px Inter, system-ui, sans-serif";
  ctx.fillText("One open map", 42, 73);
  ctx.restore();
}
