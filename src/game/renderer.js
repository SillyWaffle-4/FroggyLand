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
  drawGeneratedStructures(ctx, state.active.structures, cameraX);
  drawLilypads(ctx, state, state.time, cameraX);
  drawPlacementPreview(ctx, state);
  drawMessages(ctx, state, state.active.messages, cameraX);
  drawCurrencyPickups(ctx, state, cameraX);
  drawRelics(ctx, state, state.active.relics, cameraX);
  drawNpcs(ctx, state, state.active.npcs, cameraX);
  drawFlies(ctx, state.flies, state.time, cameraX);
  drawCars(ctx, state.active.cars, state.time, cameraX);
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

    // Water base with gradient
    const gradient = ctx.createLinearGradient(zone.x, zone.y, zone.x, zone.y + zone.h);
    gradient.addColorStop(0, "#3dc8d8");
    gradient.addColorStop(1, "#1f8a99");
    ctx.fillStyle = gradient;
    ctx.fillRect(zone.x, zone.y, zone.w, zone.h);

    // Water texture/ripples
    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    for (let i = 0; i < 3; i++) {
      const waveOffset = (time * 0.5 + i * 0.3) % zone.w;
      ctx.fillRect(zone.x + waveOffset, zone.y + i * 20, 80, 4);
    }

    // Wave animation
    ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
    ctx.lineWidth = 2;
    for (let y = zone.y + 16; y < zone.y + zone.h; y += 42) {
      ctx.beginPath();
      for (let x = zone.x; x <= zone.x + zone.w; x += 50) {
        const waveY = y + Math.sin(time * 2.2 + x * 0.025) * 4 + Math.cos(time * 1.5 + x * 0.015) * 2;
        if (x === zone.x) ctx.moveTo(x, waveY);
        else ctx.lineTo(x, waveY);
      }
      ctx.stroke();
    }

    // Additional subtle wave layer
    ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
    ctx.lineWidth = 1;
    for (let y = zone.y + 30; y < zone.y + zone.h; y += 35) {
      ctx.beginPath();
      for (let x = zone.x; x <= zone.x + zone.w; x += 35) {
        const waveY = y + Math.sin(time * 1.8 - x * 0.02) * 3;
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
    const isRoad = platform.type === "road";
    ctx.fillStyle = isGround ? "#765b35" : isCave ? "#3d332d" : isRoad ? "#343a3d" : platform.type === "stone" ? "#737a77" : "#5b8f3a";
    roundRect(ctx, platform.x, platform.y, platform.w, platform.h, 8);
    ctx.fill();
    ctx.fillStyle = isGround ? "#70b34a" : isCave ? "#6b5a4e" : isRoad ? "#4b5255" : isMoss ? "#73ad58" : platform.type === "stone" ? "#a8b1a9" : "#8ed05c";
    roundRect(ctx, platform.x, platform.y, platform.w, Math.min(16, platform.h), 8);
    ctx.fill();
    if (isRoad) {
      ctx.strokeStyle = "rgba(255, 223, 93, 0.82)";
      ctx.lineWidth = 4;
      ctx.setLineDash([34, 26]);
      ctx.beginPath();
      ctx.moveTo(platform.x + 18, platform.y + 40);
      ctx.lineTo(platform.x + platform.w - 18, platform.y + 40);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}

function drawDecorations(ctx, decorations, cameraX) {
  for (const item of decorations) {
    if (!isPointVisible(cameraX, item.x, 110)) {
      continue;
    }
    if (item.type === "crystal") {
      // Shadow
      ctx.save();
      ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
      ctx.beginPath();
      ctx.ellipse(item.x, item.y + 2, 16, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = item.color ?? "#a7f3ff";
      ctx.beginPath();
      ctx.moveTo(item.x, item.y - 44);
      ctx.lineTo(item.x + 18, item.y - 12);
      ctx.lineTo(item.x + 3, item.y);
      ctx.lineTo(item.x - 16, item.y - 10);
      ctx.closePath();
      ctx.fill();

      // Shine
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.beginPath();
      ctx.moveTo(item.x - 2, item.y - 20);
      ctx.lineTo(item.x + 4, item.y - 12);
      ctx.lineTo(item.x + 2, item.y - 16);
      ctx.closePath();
      ctx.fill();
      continue;
    }
    if (item.type === "mushroom") {
      // Stem
      ctx.fillStyle = "#f8f0d8";
      ctx.fillRect(item.x - 7, item.y - 30, 14, 30);

      // Cap with shading
      ctx.fillStyle = item.color ?? "#ff7e67";
      ctx.beginPath();
      ctx.ellipse(item.x, item.y - 32, 28, 14, 0, Math.PI, Math.PI * 2);
      ctx.fill();

      // Cap highlight
      ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
      ctx.beginPath();
      ctx.ellipse(item.x - 8, item.y - 36, 14, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    if (item.type === "vine") {
      ctx.strokeStyle = "#2d5838";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(item.x, item.y - 80);
      ctx.bezierCurveTo(item.x - 24, item.y - 45, item.x + 20, item.y - 30, item.x - 8, item.y);
      ctx.stroke();

      // Vine highlight
      ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(item.x + 2, item.y - 80);
      ctx.bezierCurveTo(item.x - 20, item.y - 45, item.x + 24, item.y - 30, item.x - 4, item.y);
      ctx.stroke();
      continue;
    }
    
    // Reeds with detail
    ctx.fillStyle = "#568849";
    ctx.fillRect(item.x, item.y - 34, 6, 34);
    ctx.fillRect(item.x + 16, item.y - 26, 6, 26);
    
    // Reed tips
    ctx.fillStyle = "#6db354";
    ctx.beginPath();
    ctx.moveTo(item.x + 3, item.y - 34);
    ctx.lineTo(item.x + 1, item.y - 40);
    ctx.lineTo(item.x + 5, item.y - 38);
    ctx.closePath();
    ctx.fill();
  }
}

function drawFoliage(ctx, foliageList, cameraX) {
  if (!foliageList || foliageList.length === 0) return;
  
  for (const item of foliageList) {
    if (!isPointVisible(cameraX, item.x, 80)) {
      continue;
    }

    const baseColor = item.tint === "dark" ? "#4a7d2a" : "#6ba349";
    const scale = item.scale || 1;

    if (item.type === "bush") {
      ctx.fillStyle = baseColor;
      ctx.beginPath();
      ctx.ellipse(item.x, item.y, 24 * scale, 18 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
      ctx.beginPath();
      ctx.ellipse(item.x + 8, item.y + 6, 14 * scale, 8 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (item.type === "wildflower") {
      ctx.fillStyle = baseColor;
      ctx.fillRect(item.x - 2 * scale, item.y - 12 * scale, 4 * scale, 12 * scale);
      ctx.fillStyle = "#ff8fa0";
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2;
        const x = item.x + Math.cos(angle) * 8 * scale;
        const y = item.y - 12 * scale + Math.sin(angle) * 6 * scale;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    } else if (item.type === "grass_clump") {
      ctx.fillStyle = baseColor;
      for (let i = 0; i < 4; i++) {
        const offset = i * 6 * scale;
        ctx.beginPath();
        ctx.moveTo(item.x - 8 * scale + offset, item.y);
        ctx.quadraticCurveTo(item.x - 6 * scale + offset, item.y - 16 * scale, item.x - 4 * scale + offset, item.y - 20 * scale);
        ctx.lineWidth = 2 * scale;
        ctx.stroke();
      }
    } else if (item.type === "tall_grass") {
      ctx.strokeStyle = baseColor;
      ctx.lineWidth = 3 * scale;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(item.x, item.y);
      ctx.quadraticCurveTo(item.x - 6 * scale, item.y - 12 * scale, item.x - 4 * scale, item.y - 28 * scale);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(item.x + 2 * scale, item.y + 2 * scale);
      ctx.quadraticCurveTo(item.x + 8 * scale, item.y - 10 * scale, item.x + 6 * scale, item.y - 26 * scale);
      ctx.stroke();
    } else if (item.type === "tree_urban") {
      // Trunk
      ctx.fillStyle = "#5a4a3a";
      ctx.fillRect(item.x - 6 * scale, item.y - 8 * scale, 12 * scale, 16 * scale);
      // Canopy
      ctx.fillStyle = "#4a7d2a";
      ctx.beginPath();
      ctx.ellipse(item.x, item.y - 16 * scale, 20 * scale, 18 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (item.type === "shrub_urban") {
      ctx.fillStyle = baseColor;
      ctx.beginPath();
      ctx.ellipse(item.x, item.y, 16 * scale, 14 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawGeneratedStructures(ctx, structures, cameraX) {
  for (const item of structures) {
    if (!isRectVisible(cameraX, item.x, item.w, 110)) {
      continue;
    }

    // Shadow for depth
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
    ctx.beginPath();
    ctx.ellipse(item.x + item.w / 2, item.y + item.h + 6, item.w / 2 + 8, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (item.type === "watchtower") {
      // Base stone
      ctx.fillStyle = "#6d5233";
      ctx.fillRect(item.x, item.y, item.w, 28);
      ctx.fillStyle = "#a9885f";
      roundRect(ctx, item.x + 4, item.y + 2, item.w - 8, 24, 6);
      ctx.fill();

      // Wood pillars with texture
      const woodColor = item.detail === "weathered" ? "#654a2f" : "#7a5938";
      ctx.fillStyle = woodColor;
      ctx.fillRect(item.x + 16, item.y + 18, 16, 88);
      ctx.fillRect(item.x + 80, item.y + 18, 16, 88);
      
      // Wood grain texture
      if (item.detail !== "plain") {
        ctx.strokeStyle = "rgba(0, 0, 0, 0.2)";
        ctx.lineWidth = 1;
        for (let i = 0; i < 6; i++) {
          ctx.beginPath();
          ctx.moveTo(item.x + 16, item.y + 20 + i * 12);
          ctx.lineTo(item.x + 32, item.y + 20 + i * 12);
          ctx.stroke();
        }
      }

      // Roof
      ctx.fillStyle = "#df6756";
      ctx.beginPath();
      ctx.moveTo(item.x - 8, item.y + 2);
      ctx.lineTo(item.x + item.w / 2, item.y - 34);
      ctx.lineTo(item.x + item.w + 8, item.y + 2);
      ctx.closePath();
      ctx.fill();

      // Roof shading
      ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
      ctx.beginPath();
      ctx.moveTo(item.x + item.w / 2, item.y - 34);
      ctx.lineTo(item.x + item.w + 8, item.y + 2);
      ctx.lineTo(item.x + item.w / 2, item.y - 10);
      ctx.closePath();
      ctx.fill();
      continue;
    }

    if (item.type === "brokenArch") {
      const rotation = item.rotation || 0;
      ctx.save();
      ctx.translate(item.x + item.w / 2, item.y);
      ctx.rotate(rotation * Math.PI / 180);
      ctx.translate(-item.w / 2, 0);

      // Stone supports
      ctx.fillStyle = "#5a6b66";
      ctx.fillRect(8, -4, 28, 82);
      ctx.fillRect(item.w - 36, -4, 28, 82);

      // Arch
      ctx.strokeStyle = "#6f7b75";
      ctx.lineWidth = 20;
      ctx.beginPath();
      ctx.arc(item.w / 2, 0, 58, Math.PI, Math.PI * 2);
      ctx.stroke();

      // Inner detail
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(item.w / 2, 0, 48, Math.PI, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
      continue;
    }

    if (item.type === "marketStall") {
      // Wooden supports
      ctx.fillStyle = "#6b4423";
      ctx.fillRect(item.x + 12, item.y - 56, 12, 56);
      ctx.fillRect(item.x + item.w - 24, item.y - 56, 12, 56);

      // Canvas top
      ctx.fillStyle = "#fff1a8";
      roundRect(ctx, item.x + 5, item.y - 36, item.w - 10, 28, 6);
      ctx.fill();

      // Canvas shading
      ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
      roundRect(ctx, item.x + 5, item.y - 36, item.w - 10, 14, 6);
      ctx.fill();

      // Hanging goods
      ctx.fillStyle = "#df6756";
      ctx.fillRect(item.x + 10, item.y - 36, 20, 28);
      ctx.fillRect(item.x + item.w / 2 - 10, item.y - 36, 20, 28);
      ctx.fillRect(item.x + item.w - 30, item.y - 36, 20, 28);

      // Goods detail
      ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
      ctx.fillRect(item.x + 12, item.y - 32, 16, 8);
      continue;
    }

    if (item.type === "stoneNest") {
      // Nest body
      ctx.fillStyle = "#6f7b75";
      ctx.beginPath();
      ctx.ellipse(item.x + item.w / 2, item.y - 16, item.w / 2, 24, 0, 0, Math.PI * 2);
      ctx.fill();

      // Nest shading
      ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
      ctx.beginPath();
      ctx.ellipse(item.x + item.w / 2 + 10, item.y - 12, item.w / 3, 14, 0, 0, Math.PI * 2);
      ctx.fill();

      // Eggs/gems
      ctx.fillStyle = "#a7f3ff";
      ctx.beginPath();
      ctx.arc(item.x + item.w / 2 - 16, item.y - 27, 10, 0, Math.PI * 2);
      ctx.arc(item.x + item.w / 2 + 4, item.y - 28, 9, 0, Math.PI * 2);
      ctx.arc(item.x + item.w / 2 + 18, item.y - 25, 8, 0, Math.PI * 2);
      ctx.fill();

      // Egg shine
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.beginPath();
      ctx.arc(item.x + item.w / 2 - 16, item.y - 31, 3, 0, Math.PI * 2);
      ctx.arc(item.x + item.w / 2 + 4, item.y - 32, 3, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }

    // Road sign or similar
    ctx.fillStyle = item.color || "#8b7355";
    ctx.fillRect(item.x + item.w / 2 - 5, item.y - 72, 10, 72);
    ctx.fillStyle = item.color || "#ffe27a";
    roundRect(ctx, item.x + 12, item.y - 72, item.w - 24, 34, 6);
    ctx.fill();

    // Sign detail
    if (item.detail === "ornate") {
      ctx.strokeStyle = "rgba(0, 0, 0, 0.2)";
      ctx.lineWidth = 1;
      ctx.strokeRect(item.x + 18, item.y - 66, item.w - 36, 22);
    }
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

function drawMessages(ctx, state, messages, cameraX) {
  ctx.font = "600 17px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  for (const message of messages) {
    if (message.tutorial && state.tutorialComplete) {
      continue;
    }
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

function drawCars(ctx, cars, time, cameraX) {
  for (const car of cars) {
    const rect = getCarRect(car, time);
    if (!isRectVisible(cameraX, rect.x, rect.w, 120)) {
      continue;
    }

    ctx.save();
    ctx.translate(rect.x, rect.y);
    ctx.fillStyle = "rgba(16, 27, 25, 0.24)";
    ctx.beginPath();
    ctx.ellipse(rect.w / 2, rect.h + 4, rect.w / 2, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = car.color ?? "#e65b4f";
    roundRect(ctx, 0, 4, rect.w, rect.h - 4, 8);
    ctx.fill();
    ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
    roundRect(ctx, 18, 0, rect.w - 36, 18, 6);
    ctx.fill();
    ctx.fillStyle = "#1b2830";
    ctx.beginPath();
    ctx.arc(18, rect.h, 8, 0, Math.PI * 2);
    ctx.arc(rect.w - 18, rect.h, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffef9a";
    const headlightX = car.direction === -1 ? 6 : rect.w - 12;
    ctx.fillRect(headlightX, 15, 6, 8);
    ctx.restore();
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
    const endSection = checkpoint.endSection;
    const glow = active ? 0.8 + Math.sin(state.time * 8) * 0.12 : 0;

    if (active || endSection || state.checkpointFlash > 0) {
      ctx.globalAlpha = active ? Math.max(glow, state.checkpointFlash) : 0.15;
      ctx.fillStyle = endSection ? "#ff7e67" : "#ffdf5d";
      ctx.beginPath();
      ctx.arc(checkpoint.x + 6, checkpoint.y - 76, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = "#5a3f2c";
    ctx.fillRect(checkpoint.x, checkpoint.y - 94, 10, 94);
    ctx.fillStyle = endSection ? "#ff7e67" : active ? "#ffdf5d" : "#8ac8ff";
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
    if (endSection) {
      ctx.fillStyle = "#3b1715";
      ctx.font = "900 13px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("END", checkpoint.x + 42, checkpoint.y - 68);
    }
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
