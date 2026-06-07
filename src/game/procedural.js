import { GROUND_Y, VIEW_HEIGHT, VIEW_WIDTH } from "./constants.js";

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

export function generateTopDownStructures(seed = 911) {
  const next = rand(seed);
  const structures = [];
  const types = ["hut", "pond", "ruin", "garden", "cart"];
  for (let i = 0; i < 42; i += 1) {
    const type = types[Math.floor(next() * types.length)];
    structures.push({
      id: `t-${i}`,
      type,
      x: 90 + Math.floor(next() * (VIEW_WIDTH - 180)),
      y: 92 + Math.floor(next() * (VIEW_HEIGHT - 150)),
      w: type === "pond" ? 96 : 58 + Math.floor(next() * 48),
      h: type === "pond" ? 62 : 48 + Math.floor(next() * 52),
      color: next() > 0.45 ? "#b98d55" : "#789e6b",
      discovered: false,
    });
  }
  return structures;
}
