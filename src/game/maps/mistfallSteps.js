import { FROG_HEIGHT, GROUND_Y } from "../constants.js";

export const mistfallSteps = {
  name: "Mistfall Steps",
  startX: 18150,
  endX: 21150,
  platforms: [
    { x: 18185, y: GROUND_Y, w: 290, h: 80, type: "ground" },
    { x: 18580, y: 470, w: 185, h: 28, type: "stone" },
    { x: 18880, y: 390, w: 170, h: 26, type: "grass" },
    { x: 19210, y: 310, w: 180, h: 26, type: "grass" },
    { x: 19570, y: 230, w: 190, h: 26, type: "stone" },
    { x: 19920, y: 356, w: 210, h: 28, type: "grass" },
    { x: 20295, y: 448, w: 190, h: 28, type: "stone" },
    { x: 20660, y: 360, w: 220, h: 26, type: "grass" },
    { x: 20980, y: 455, w: 220, h: 80, type: "ground" },
  ],
  waterZones: [
    { x: 18475, y: 514, w: 480, h: 106 },
    { x: 19760, y: 512, w: 520, h: 108 },
    { x: 20480, y: 518, w: 400, h: 102 },
  ],
  lilypads: [
    { x: 18540, y: 492, w: 124, h: 22, phase: 0.5 },
    { x: 18740, y: 492, w: 118, h: 22, phase: 1.7 },
    { x: 19855, y: 490, w: 126, h: 22, phase: 0.8 },
    { x: 20135, y: 490, w: 124, h: 22, phase: 1.5 },
  ],
  npcs: [
    {
      id: "mistfall-runner",
      name: "Mistfall Runner",
      x: 19965,
      y: 356,
      currency: "amber",
      cost: 4,
      reward: "pads",
      pads: 3,
      talk: "The steps split into wet paths. Four amber gets you three pads for the climb.",
    },
  ],
  flySpawnPoints: [
    { x: 18380, y: 405, orbit: 38 },
    { x: 18680, y: 340, orbit: 54 },
    { x: 18980, y: 280, orbit: 48 },
    { x: 19310, y: 210, orbit: 54 },
    { x: 19660, y: 150, orbit: 60 },
    { x: 20020, y: 280, orbit: 48 },
    { x: 20410, y: 390, orbit: 46 },
    { x: 20760, y: 300, orbit: 52 },
    { x: 21035, y: 385, orbit: 40 },
  ],
  pearls: [
    { id: "mist-pearl-1", x: 18975, y: 344, value: 1 },
    { id: "mist-pearl-2", x: 19315, y: 264, value: 1 },
    { id: "mist-pearl-3", x: 19660, y: 184, value: 1 },
    { id: "mist-pearl-4", x: 20775, y: 314, value: 1 },
  ],
  amberCoins: [
    { id: "mist-amber-1", x: 18595, y: 426, value: 1 },
    { id: "mist-amber-2", x: 19990, y: 312, value: 1 },
    { id: "mist-amber-3", x: 20385, y: 404, value: 1 },
  ],
  relics: [
    { id: "mistfall-top", x: 19660, y: 184 },
    { id: "mistfall-runner-cache", x: 20775, y: 314 },
  ],
  messages: [
    { x: 18340, y: 476, w: 260, text: "Mistfall Steps" },
    { x: 19650, y: 184, w: 300, text: "Climb the spray route" },
    { x: 19980, y: 310, w: 320, text: "Amber can buy a bridge plan" },
    { x: 20975, y: 410, w: 260, text: "Old lock cavern ahead" },
  ],
  checkpoints: [
    { id: "mistfall-top-camp", x: 19595, y: 230, spawnX: 19595, spawnY: 230 - FROG_HEIGHT },
  ],
  decorations: [
    { type: "reeds", x: 18500, y: 514 },
    { type: "crystal", x: 19270, y: 310, color: "#a7f3ff" },
    { type: "vine", x: 19610, y: 230 },
    { type: "mushroom", x: 20790, y: 360, color: "#ffe96f" },
  ],
};
