import { GROUND_Y, FROG_HEIGHT } from "../constants.js";

export const deepCave = {
  name: "Moonroot Cavern",
  startX: 7200,
  endX: 9900,
  caveZones: [
    { x: 7240, y: 74, w: 2500, h: 546 },
  ],
  platforms: [
    { x: 7250, y: 445, w: 300, h: 80, type: "cave" },
    { x: 7700, y: 475, w: 190, h: 28, type: "moss" },
    { x: 8010, y: 388, w: 180, h: 26, type: "moss" },
    { x: 8340, y: 308, w: 180, h: 26, type: "moss" },
    { x: 8690, y: 458, w: 170, h: 28, type: "stone" },
    { x: 9045, y: 382, w: 190, h: 26, type: "moss" },
    { x: 9400, y: 505, w: 150, h: 28, type: "stone" },
    { x: 9695, y: 420, w: 250, h: 80, type: "cave" },
  ],
  waterZones: [
    { x: 7550, y: 510, w: 430, h: 110 },
    { x: 8565, y: 514, w: 520, h: 106 },
    { x: 9200, y: 518, w: 500, h: 102 },
  ],
  lilypads: [
    { x: 7610, y: 488, w: 118, h: 22, phase: 0.1 },
    { x: 7820, y: 488, w: 128, h: 22, phase: 1.2 },
    { x: 8665, y: 492, w: 124, h: 22, phase: 0.7 },
    { x: 8900, y: 492, w: 120, h: 22, phase: 1.7 },
  ],
  npcs: [
    {
      id: "moon-minnow",
      name: "Moon Minnow",
      x: 9065,
      y: 382,
      cost: 2,
      pads: 1,
      talk: "The moonroot shrine is ahead. The last pond has a secret if you place a pad left.",
    },
  ],
  flySpawnPoints: [
    { x: 7420, y: 405, orbit: 20 },
    { x: 7810, y: 335, orbit: 56 },
    { x: 8085, y: 270, orbit: 44 },
    { x: 8390, y: 210, orbit: 50 },
    { x: 8730, y: 392, orbit: 44 },
    { x: 9080, y: 282, orbit: 62 },
    { x: 9470, y: 430, orbit: 46 },
    { x: 9775, y: 350, orbit: 42 },
  ],
  relics: [
    { id: "moonroot-first", x: 8368, y: 262 },
    { id: "root-vault", x: 9085, y: 330 },
    { id: "last-pond-left", x: 9310, y: 468 },
  ],
  messages: [
    { x: 7390, y: 395, w: 280, text: "Moonroot Cavern" },
    { x: 8355, y: 260, w: 280, text: "Optional relic above the route" },
    { x: 9460, y: 465, w: 310, text: "Water path saves time if you place well" },
    { x: 9795, y: 380, w: 240, text: "Moonroot shrine" },
  ],
  checkpoints: [
    { id: "moonroot-lamp", x: 8010, y: 388, spawnX: 8010, spawnY: 388 - FROG_HEIGHT },
  ],
  decorations: [
    { type: "crystal", x: 7490, y: 445, color: "#a7f3ff" },
    { type: "mushroom", x: 8150, y: 388, color: "#79d8ff" },
    { type: "crystal", x: 8820, y: 458, color: "#c993ff" },
    { type: "mushroom", x: 9730, y: 420, color: "#ffe96f" },
  ],
};
