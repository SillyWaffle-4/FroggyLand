import { FROG_HEIGHT, GROUND_Y } from "../constants.js";

export const sunkenGrotto = {
  name: "Sunken Grotto",
  startX: 9900,
  endX: 12650,
  caveZones: [
    { x: 9920, y: 62, w: 2580, h: 558 },
  ],
  platforms: [
    { x: 9970, y: 420, w: 280, h: 80, type: "cave" },
    { x: 10340, y: 458, w: 230, h: 28, type: "moss" },
    { x: 11380, y: 300, w: 220, h: 28, type: "moss" },
    { x: 11720, y: 382, w: 190, h: 26, type: "stone" },
    { x: 12030, y: 455, w: 220, h: 28, type: "moss" },
    { x: 12390, y: GROUND_Y, w: 260, h: 80, type: "cave" },
  ],
  waterZones: [
    { x: 10580, y: 512, w: 820, h: 108 },
    { x: 11910, y: 516, w: 410, h: 104 },
  ],
  lilypads: [
    { x: 11980, y: 492, w: 126, h: 22, phase: 1.1 },
  ],
  npcs: [
    {
      id: "basin-broker",
      name: "Basin Broker",
      x: 10415,
      y: 458,
      cost: 2,
      pads: 1,
      talk: "The next basin is too low for a normal jump. Buy a lily pad, place it in the middle, then boost out.",
    },
  ],
  flySpawnPoints: [
    { x: 10080, y: 320, orbit: 42 },
    { x: 10380, y: 340, orbit: 50 },
    { x: 10650, y: 382, orbit: 46 },
    { x: 11080, y: 390, orbit: 52 },
    { x: 11480, y: 210, orbit: 48 },
    { x: 11840, y: 310, orbit: 55 },
    { x: 12160, y: 365, orbit: 44 },
    { x: 12490, y: 425, orbit: 38 },
  ],
  relics: [
    { id: "sunken-required-pad", x: 11120, y: 468 },
    { id: "grotto-high-bell", x: 11495, y: 252 },
    { id: "final-moss-coin", x: 12140, y: 410 },
  ],
  messages: [
    { x: 10080, y: 372, w: 280, text: "Sunken Grotto" },
    { x: 10415, y: 414, w: 320, text: "Trade before the basin" },
    { x: 10990, y: 465, w: 380, text: "This ledge needs a bought lily pad boost" },
    { x: 11495, y: 252, w: 290, text: "High exit ledge" },
    { x: 12495, y: 462, w: 270, text: "End of the current map" },
  ],
  checkpoints: [
    { id: "grotto-basin", x: 10390, y: 458, spawnX: 10390, spawnY: 458 - FROG_HEIGHT },
  ],
  decorations: [
    { type: "crystal", x: 10180, y: 420, color: "#79d8ff" },
    { type: "mushroom", x: 10495, y: 458, color: "#ffe96f" },
    { type: "crystal", x: 11160, y: 512, color: "#c993ff" },
    { type: "vine", x: 11515, y: 300 },
    { type: "mushroom", x: 12195, y: 455, color: "#ff7e67" },
  ],
};
