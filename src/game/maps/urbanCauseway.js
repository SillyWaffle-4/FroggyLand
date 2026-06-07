import { FROG_HEIGHT, GROUND_Y } from "../constants.js";

export const urbanCauseway = {
  name: "Urban Causeway",
  startX: 27450,
  endX: 30950,
  platforms: [
    { x: 27480, y: GROUND_Y, w: 430, h: 80, type: "ground" },
    { x: 27960, y: GROUND_Y, w: 880, h: 80, type: "road" },
    { x: 29010, y: 452, w: 220, h: 28, type: "stone" },
    { x: 29370, y: 370, w: 210, h: 26, type: "grass" },
    { x: 29685, y: GROUND_Y, w: 900, h: 80, type: "road" },
    { x: 30630, y: GROUND_Y, w: 300, h: 80, type: "ground" },
  ],
  waterZones: [
    { x: 28840, y: 516, w: 620, h: 104 },
  ],
  lilypads: [
    { x: 28930, y: 492, w: 126, h: 22, phase: 0.6 },
    { x: 29240, y: 492, w: 126, h: 22, phase: 1.5 },
  ],
  cars: [
    { id: "road-car-red", x: 28010, y: 499, w: 760, h: 36, speed: 260, offset: 0, direction: 1, color: "#e65b4f" },
    { id: "road-car-blue", x: 28010, y: 499, w: 760, h: 36, speed: 210, offset: 0.45, direction: -1, color: "#4d8bd9" },
    { id: "road-car-taxi", x: 29730, y: 499, w: 800, h: 36, speed: 285, offset: 0.15, direction: 1, color: "#f0b93f" },
    { id: "road-car-green", x: 29730, y: 499, w: 800, h: 36, speed: 235, offset: 0.62, direction: -1, color: "#57a96b" },
  ],
  npcs: [
    {
      id: "crosswalk-seller",
      name: "Crosswalk Seller",
      x: 29395,
      y: 370,
      currency: "amber",
      cost: 4,
      reward: "pads",
      pads: 3,
      talk: "Roads are loud and fast. Four amber gets you three pads for safer detours.",
    },
  ],
  flySpawnPoints: [
    { x: 27625, y: 395, orbit: 38 },
    { x: 28150, y: 390, orbit: 46 },
    { x: 28630, y: 360, orbit: 52 },
    { x: 29100, y: 330, orbit: 44 },
    { x: 29495, y: 280, orbit: 50 },
    { x: 29920, y: 388, orbit: 46 },
    { x: 30380, y: 390, orbit: 42 },
    { x: 30660, y: 372, orbit: 36 },
  ],
  pearls: [
    { id: "urban-pearl-1", x: 29100, y: 406, value: 1 },
    { id: "urban-pearl-2", x: 29480, y: 324, value: 1 },
    { id: "urban-pearl-3", x: 30380, y: 470, value: 1 },
  ],
  amberCoins: [
    { id: "urban-amber-1", x: 28230, y: 488, value: 1 },
    { id: "urban-amber-2", x: 28760, y: 488, value: 1 },
    { id: "urban-amber-3", x: 29980, y: 488, value: 1 },
    { id: "urban-amber-4", x: 30510, y: 488, value: 1 },
  ],
  relics: [
    { id: "crosswalk-token", x: 28760, y: 488 },
    { id: "underpass-pearl", x: 29100, y: 406 },
    { id: "tail-light-cache", x: 30380, y: 470 },
  ],
  messages: [
    { x: 27620, y: 475, w: 260, text: "Urban Causeway" },
    { x: 28280, y: 488, w: 330, text: "Watch the cars. They crash into you." },
    { x: 29400, y: 326, w: 300, text: "Trade before the second road" },
    { x: 30320, y: 488, w: 310, text: "Time your dash between cars" },
    { x: 30775, y: 474, w: 250, text: "Forktail junction ahead" },
  ],
  checkpoints: [
    { id: "causeway-crossing", x: 27610, y: GROUND_Y, spawnX: 27610, spawnY: GROUND_Y - FROG_HEIGHT },
    { id: "causeway-underpass", x: 29385, y: 370, spawnX: 29385, spawnY: 370 - FROG_HEIGHT },
  ],
  decorations: [
    { type: "crystal", x: 27675, y: GROUND_Y, color: "#a7f3ff" },
    { type: "mushroom", x: 29450, y: 370, color: "#ff7e67" },
    { type: "reeds", x: 28925, y: 516 },
    { type: "crystal", x: 30690, y: GROUND_Y, color: "#ffe96f" },
  ],
};
