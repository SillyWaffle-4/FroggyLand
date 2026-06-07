import { GROUND_Y, FROG_HEIGHT } from "../constants.js";

export const meadow = {
  name: "Meadow Creek",
  startX: 0,
  endX: 2300,
  platforms: [
    { x: 0, y: GROUND_Y, w: 360, h: 80, type: "ground" },
    { x: 430, y: 468, w: 160, h: 28, type: "grass" },
    { x: 660, y: 405, w: 155, h: 28, type: "grass" },
    { x: 985, y: 486, w: 155, h: 28, type: "stone" },
    { x: 1280, y: 330, w: 200, h: 28, type: "grass" },
    { x: 1510, y: GROUND_Y, w: 350, h: 80, type: "ground" },
    { x: 1900, y: 452, w: 210, h: 28, type: "grass" },
    { x: 2180, y: 392, w: 190, h: 28, type: "stone" },
  ],
  waterZones: [
    { x: 845, y: 515, w: 430, h: 105 },
    { x: 1858, y: 512, w: 300, h: 108 },
  ],
  lilypads: [
    { x: 900, y: 492, w: 118, h: 22, phase: 0.3 },
    { x: 1080, y: 492, w: 124, h: 22, phase: 1.2 },
  ],
  npcs: [
    {
      id: "sprout",
      name: "Sprout",
      x: 735,
      y: 405,
      cost: 1,
      pads: 1,
      talk: "Trade 1 fly for a lily pad. Press P, then click water to place it.",
    },
  ],
  flySpawnPoints: [
    { x: 205, y: 410, orbit: 18 },
    { x: 560, y: 335, orbit: 30 },
    { x: 1360, y: 340, orbit: 36 },
    { x: 2040, y: 330, orbit: 48 },
  ],
  relics: [
    { id: "meadow-glow", x: 692, y: 360 },
    { id: "creek-arch", x: 1325, y: 286 },
  ],
  messages: [
    { x: 130, y: 470, w: 240, text: "Move with A/D or arrows" },
    { x: 510, y: 418, w: 260, text: "Jump with W, Space, or Up" },
    { x: 725, y: 355, w: 270, text: "Click flies with the tongue" },
    { x: 1030, y: 462, w: 355, text: "Trade for a pad, then place it on water" },
    { x: 1285, y: 285, w: 320, text: "This ledge needs a lily pad boost" },
    { x: 2070, y: 410, w: 280, text: "Cave mouth ahead" },
  ],
  checkpoints: [
    { id: "meadow-camp", x: 1700, y: GROUND_Y, spawnX: 1700, spawnY: GROUND_Y - FROG_HEIGHT },
  ],
  decorations: [
    { type: "reeds", x: 870, y: 512 },
    { type: "reeds", x: 1205, y: 512 },
    { type: "mushroom", x: 2225, y: 392, color: "#ff7e67" },
  ],
};
