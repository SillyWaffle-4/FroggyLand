import { FROG_HEIGHT, GROUND_Y } from "../constants.js";

export const opalMarsh = {
  name: "Opal Marsh",
  startX: 12650,
  endX: 15380,
  platforms: [
    { x: 12700, y: GROUND_Y, w: 300, h: 80, type: "ground" },
    { x: 13115, y: 462, w: 220, h: 28, type: "grass" },
    { x: 13470, y: 382, w: 200, h: 26, type: "grass" },
    { x: 13820, y: 300, w: 190, h: 26, type: "stone" },
    { x: 14235, y: 448, w: 210, h: 28, type: "grass" },
    { x: 14580, y: 370, w: 230, h: 26, type: "grass" },
    { x: 14970, y: 452, w: 260, h: 80, type: "ground" },
  ],
  waterZones: [
    { x: 13000, y: 512, w: 640, h: 108 },
    { x: 14020, y: 518, w: 565, h: 102 },
    { x: 14790, y: 512, w: 180, h: 108 },
  ],
  lilypads: [
    { x: 13100, y: 490, w: 124, h: 22, phase: 0.4 },
    { x: 13410, y: 490, w: 128, h: 22, phase: 1.3 },
    { x: 14105, y: 494, w: 120, h: 22, phase: 0.8 },
    { x: 14395, y: 494, w: 126, h: 22, phase: 1.8 },
  ],
  npcs: [
    {
      id: "opal-tinker",
      name: "Opal Tinker",
      x: 13855,
      y: 300,
      currency: "pearls",
      cost: 4,
      reward: "tongueRange",
      rangeBonus: 90,
      talk: "Bring 4 moon pearls and I will stretch your tongue farther for the ridge flies.",
    },
  ],
  flySpawnPoints: [
    { x: 12840, y: 405, orbit: 32 },
    { x: 13230, y: 330, orbit: 52 },
    { x: 13580, y: 268, orbit: 46 },
    { x: 13880, y: 205, orbit: 42 },
    { x: 14340, y: 360, orbit: 58 },
    { x: 14705, y: 280, orbit: 50 },
    { x: 15100, y: 355, orbit: 42 },
  ],
  pearls: [
    { id: "opal-pearl-1", x: 13180, y: 430, value: 1 },
    { id: "opal-pearl-2", x: 13555, y: 334, value: 1 },
    { id: "opal-pearl-3", x: 13860, y: 252, value: 1 },
    { id: "opal-pearl-4", x: 14320, y: 418, value: 1 },
    { id: "opal-pearl-5", x: 14700, y: 322, value: 1 },
  ],
  amberCoins: [
    { id: "opal-amber-1", x: 12940, y: 496, value: 1 },
    { id: "opal-amber-2", x: 14555, y: 324, value: 1 },
  ],
  relics: [
    { id: "opal-high-shell", x: 13890, y: 252 },
    { id: "opal-reed-cache", x: 14730, y: 322 },
  ],
  messages: [
    { x: 12795, y: 475, w: 240, text: "Opal Marsh" },
    { x: 13235, y: 414, w: 320, text: "Moon pearls are a new currency" },
    { x: 13860, y: 254, w: 300, text: "Spend pearls for upgrades" },
    { x: 14570, y: 326, w: 320, text: "Amber coins buy supplies later" },
  ],
  checkpoints: [
    { id: "opal-stump", x: 14980, y: 452, spawnX: 14980, spawnY: 452 - FROG_HEIGHT },
  ],
  decorations: [
    { type: "reeds", x: 13035, y: 512 },
    { type: "crystal", x: 13495, y: 382, color: "#f6b7ff" },
    { type: "mushroom", x: 13885, y: 300, color: "#79d8ff" },
    { type: "reeds", x: 14515, y: 518 },
  ],
};
