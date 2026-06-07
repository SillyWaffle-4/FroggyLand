import { GROUND_Y, FROG_HEIGHT, TRADE_COST, TRADE_PADS } from "../constants.js";

export const canopyRuins = {
  name: "Canopy Ruins",
  startX: 4550,
  endX: 7200,
  platforms: [
    { x: 4570, y: GROUND_Y, w: 300, h: 80, type: "ground" },
    { x: 4990, y: 450, w: 210, h: 28, type: "grass" },
    { x: 5320, y: 375, w: 220, h: 26, type: "grass" },
    { x: 5620, y: 300, w: 165, h: 26, type: "grass" },
    { x: 5915, y: 492, w: 160, h: 28, type: "stone" },
    { x: 6250, y: 420, w: 240, h: 28, type: "grass" },
    { x: 6570, y: 354, w: 280, h: 28, type: "grass" },
    { x: 6970, y: 455, w: 300, h: 80, type: "ground" },
  ],
  waterZones: [
    { x: 4870, y: 510, w: 510, h: 110 },
    { x: 5790, y: 522, w: 520, h: 98 },
    { x: 6850, y: 508, w: 220, h: 112 },
  ],
  lilypads: [
    { x: 4950, y: 488, w: 116, h: 22, phase: 0.2 },
    { x: 5165, y: 488, w: 122, h: 22, phase: 1.4 },
    { x: 5890, y: 499, w: 132, h: 22, phase: 0.7 },
    { x: 6170, y: 499, w: 128, h: 22, phase: 1.8 },
  ],
  npcs: [
    {
      id: "reed-scout",
      name: "Reed Scout",
      x: 5635,
      y: 300,
      cost: TRADE_COST,
      pads: TRADE_PADS,
      talk: "The route splits: climb above the broken arches or build across the water.",
    },
    {
      id: "dock-sage",
      name: "Dock Sage",
      x: 7045,
      y: 455,
      cost: 3,
      pads: 2,
      talk: "A deep cave opens after the dock. Bring pads if you like shortcuts.",
    },
  ],
  flySpawnPoints: [
    { x: 4760, y: 410, orbit: 18 },
    { x: 5110, y: 330, orbit: 52 },
    { x: 5420, y: 235, orbit: 70 },
    { x: 5750, y: 225, orbit: 44 },
    { x: 6330, y: 280, orbit: 72 },
    { x: 6650, y: 250, orbit: 46 },
    { x: 7060, y: 350, orbit: 60 },
  ],
  relics: [
    { id: "ruin-high", x: 5675, y: 252 },
    { id: "arch-star", x: 6590, y: 300 },
    { id: "dock-cache", x: 7018, y: 405 },
  ],
  messages: [
    { x: 4775, y: 470, w: 250, text: "Canopy Ruins" },
    { x: 5370, y: 402, w: 290, text: "Low route: water and lilypads" },
    { x: 5665, y: 252, w: 280, text: "High route: platform chain" },
    { x: 6590, y: 305, w: 250, text: "Checkpoint marker" },
    { x: 7000, y: 405, w: 250, text: "Deep cave entrance" },
  ],
  checkpoints: [
    { id: "ruin-bell", x: 6590, y: 354, spawnX: 6590, spawnY: 354 - FROG_HEIGHT },
  ],
  decorations: [
    { type: "vine", x: 5360, y: 224 },
    { type: "vine", x: 6320, y: 346 },
    { type: "reeds", x: 5140, y: 510 },
  ],
};
