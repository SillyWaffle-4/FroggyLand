import { FROG_HEIGHT, GROUND_Y } from "../constants.js";

export const windbellRidge = {
  name: "Windbell Ridge",
  startX: 15380,
  endX: 18150,
  platforms: [
    { x: 15405, y: GROUND_Y, w: 285, h: 80, type: "ground" },
    { x: 15805, y: 450, w: 190, h: 28, type: "stone" },
    { x: 16125, y: 360, w: 175, h: 26, type: "grass" },
    { x: 16480, y: 275, w: 210, h: 26, type: "grass" },
    { x: 16860, y: 430, w: 190, h: 28, type: "stone" },
    { x: 17220, y: 345, w: 210, h: 26, type: "grass" },
    { x: 17600, y: 470, w: 190, h: 28, type: "stone" },
    { x: 17910, y: 420, w: 245, h: 80, type: "ground" },
  ],
  waterZones: [
    { x: 15690, y: 512, w: 520, h: 108 },
    { x: 16690, y: 514, w: 520, h: 106 },
    { x: 17425, y: 518, w: 480, h: 102 },
  ],
  lilypads: [
    { x: 15755, y: 490, w: 122, h: 22, phase: 0.2 },
    { x: 15980, y: 490, w: 120, h: 22, phase: 1.6 },
    { x: 16780, y: 492, w: 126, h: 22, phase: 0.7 },
    { x: 17060, y: 492, w: 118, h: 22, phase: 1.9 },
  ],
  npcs: [
    {
      id: "ridge-quartermaster",
      name: "Quartermaster",
      x: 17255,
      y: 345,
      currency: "amber",
      cost: 3,
      reward: "pads",
      pads: 2,
      talk: "Amber coins are for route supplies. I trade 3 amber for 2 lily pads.",
    },
  ],
  flySpawnPoints: [
    { x: 15555, y: 405, orbit: 34 },
    { x: 15920, y: 330, orbit: 58 },
    { x: 16210, y: 250, orbit: 52 },
    { x: 16580, y: 165, orbit: 62 },
    { x: 16955, y: 355, orbit: 48 },
    { x: 17345, y: 255, orbit: 54 },
    { x: 17710, y: 395, orbit: 46 },
    { x: 18025, y: 340, orbit: 40 },
  ],
  pearls: [
    { id: "ridge-pearl-1", x: 16190, y: 315, value: 1 },
    { id: "ridge-pearl-2", x: 16585, y: 228, value: 1 },
    { id: "ridge-pearl-3", x: 17335, y: 300, value: 1 },
  ],
  amberCoins: [
    { id: "ridge-amber-1", x: 15870, y: 405, value: 1 },
    { id: "ridge-amber-2", x: 16490, y: 230, value: 1 },
    { id: "ridge-amber-3", x: 16945, y: 392, value: 1 },
    { id: "ridge-amber-4", x: 17680, y: 424, value: 1 },
  ],
  relics: [
    { id: "ridge-bell", x: 16580, y: 228 },
    { id: "wind-cache", x: 17680, y: 424 },
  ],
  messages: [
    { x: 15495, y: 475, w: 260, text: "Windbell Ridge" },
    { x: 16475, y: 228, w: 300, text: "Long tongue helps here" },
    { x: 17255, y: 300, w: 330, text: "Amber coins buy extra pads" },
    { x: 18025, y: 374, w: 280, text: "Current shrine finish" },
  ],
  checkpoints: [
    { id: "ridge-bellpost", x: 17240, y: 345, spawnX: 17240, spawnY: 345 - FROG_HEIGHT },
  ],
  decorations: [
    { type: "vine", x: 16220, y: 360 },
    { type: "crystal", x: 16565, y: 275, color: "#ffe96f" },
    { type: "reeds", x: 17085, y: 514 },
    { type: "mushroom", x: 18025, y: 420, color: "#f6b7ff" },
  ],
};
