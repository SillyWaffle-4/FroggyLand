import { GROUND_Y, FROG_HEIGHT, TRADE_COST, TRADE_PADS } from "../constants.js";

export const mushroomCave = {
  name: "Mushroom Cave",
  startX: 2300,
  endX: 4550,
  caveZones: [
    { x: 2350, y: 92, w: 2150, h: 528 },
  ],
  platforms: [
    { x: 2380, y: 480, w: 260, h: 80, type: "cave" },
    { x: 2700, y: 412, w: 205, h: 28, type: "moss" },
    { x: 3000, y: 332, w: 180, h: 26, type: "moss" },
    { x: 3290, y: 430, w: 220, h: 28, type: "stone" },
    { x: 3590, y: 352, w: 210, h: 26, type: "moss" },
    { x: 3920, y: 468, w: 190, h: 28, type: "stone" },
    { x: 4250, y: 390, w: 260, h: 80, type: "cave" },
  ],
  waterZones: [
    { x: 2645, y: 505, w: 625, h: 115 },
    { x: 3510, y: 512, w: 410, h: 108 },
    { x: 4108, y: 505, w: 285, h: 115 },
  ],
  lilypads: [
    { x: 2740, y: 488, w: 122, h: 22, phase: 1.4 },
    { x: 3090, y: 488, w: 130, h: 22, phase: 0.5 },
    { x: 3615, y: 490, w: 120, h: 22, phase: 1.7 },
  ],
  npcs: [
    {
      id: "moss-merchant",
      name: "Moss Merchant",
      x: 3026,
      y: 332,
      cost: TRADE_COST,
      pads: TRADE_PADS,
      talk: "The cave pond has gaps a normal jump will not forgive. Buy a pad before rushing.",
    },
    {
      id: "glowcap",
      name: "Glowcap",
      x: 4305,
      y: 390,
      cost: 3,
      pads: 2,
      talk: "Two pads open the lower tunnel and a safer way out.",
    },
  ],
  flySpawnPoints: [
    { x: 2480, y: 365, orbit: 52 },
    { x: 2820, y: 290, orbit: 56 },
    { x: 3090, y: 225, orbit: 44 },
    { x: 3420, y: 335, orbit: 48 },
    { x: 3690, y: 245, orbit: 60 },
    { x: 4010, y: 370, orbit: 46 },
    { x: 4380, y: 292, orbit: 58 },
  ],
  relics: [
    { id: "cave-bluecap", x: 3048, y: 286 },
    { id: "lower-tunnel", x: 3848, y: 468 },
    { id: "glow-stone", x: 4365, y: 342 },
  ],
  messages: [
    { x: 2480, y: 430, w: 260, text: "Mushroom Cave" },
    { x: 3060, y: 285, w: 300, text: "Caves are part of the same map", tutorial: true },
    { x: 3710, y: 306, w: 300, text: "Aim carefully through tight cave gaps", tutorial: true },
    { x: 4250, y: 348, w: 300, text: "Lower tunnel hides a relic" },
  ],
  checkpoints: [
    { id: "cave-lantern", x: 3330, y: 430, spawnX: 3330, spawnY: 430 - FROG_HEIGHT },
  ],
  decorations: [
    { type: "crystal", x: 2590, y: 478, color: "#79d8ff" },
    { type: "mushroom", x: 2875, y: 412, color: "#c993ff" },
    { type: "crystal", x: 3715, y: 352, color: "#ffe96f" },
    { type: "mushroom", x: 4440, y: 390, color: "#ff7e67" },
  ],
};
