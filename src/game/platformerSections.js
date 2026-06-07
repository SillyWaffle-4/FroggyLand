import { FROG_HEIGHT, GROUND_Y } from "./constants.js";

const SECTION_LIBRARY = [
  { id: "meadow-creek", name: "Meadow Creek", startX: 120, spawnY: GROUND_Y - FROG_HEIGHT, endX: 1700, endY: GROUND_Y },
  { id: "mushroom-cave", name: "Mushroom Cave", startX: 2388, spawnY: 480 - FROG_HEIGHT, endX: 3330, endY: 430 },
  { id: "canopy-ruins", name: "Canopy Ruins", startX: 4576, spawnY: GROUND_Y - FROG_HEIGHT, endX: 5620, endY: 300 },
  { id: "moonroot-cavern", name: "Moonroot Cavern", startX: 7248, spawnY: 470 - FROG_HEIGHT, endX: 8010, endY: 388 },
  { id: "sunken-grotto", name: "Sunken Grotto", startX: 10020, spawnY: 482 - FROG_HEIGHT, endX: 11495, endY: 252 },
  { id: "opal-marsh", name: "Opal Marsh", startX: 12690, spawnY: GROUND_Y - FROG_HEIGHT, endX: 13820, endY: 300 },
  { id: "windbell-ridge", name: "Windbell Ridge", startX: 15410, spawnY: GROUND_Y - FROG_HEIGHT, endX: 16480, endY: 275 },
  { id: "mistfall-steps", name: "Mistfall Steps", startX: 18200, spawnY: GROUND_Y - FROG_HEIGHT, endX: 19595, endY: 230 },
  { id: "lockroot-hollow", name: "Lockroot Hollow", startX: 21200, spawnY: 480 - FROG_HEIGHT, endX: 22635, endY: 348 },
  { id: "lantern-coast", name: "Lantern Coast", startX: 24280, spawnY: GROUND_Y - FROG_HEIGHT, endX: 25430, endY: 295 },
  { id: "urban-causeway", name: "Urban Causeway", startX: 27520, spawnY: GROUND_Y - FROG_HEIGHT, endX: 28620, endY: GROUND_Y },
  { id: "forktail-junction", name: "Forktail Junction", startX: 31040, spawnY: GROUND_Y - FROG_HEIGHT, endX: 32035, endY: 270 },
];

const SHOP_SECTION = {
  id: "market-training",
  name: "Market Hall Route",
  startX: 2388,
  spawnY: 480 - FROG_HEIGHT,
  endX: 3330,
  endY: 430,
};

export function randomPlatformerSection(entry = "") {
  const seed = `${entry}:${Date.now()}:${Math.random()}`;
  const index = Math.abs(hashString(seed)) % SECTION_LIBRARY.length;
  return makeSection(SECTION_LIBRARY[index], entry);
}

export function shopPlatformerSection() {
  return makeSection(SHOP_SECTION, "shop", { forceReturn: false });
}

function makeSection(section, entry, options = {}) {
  const spawnX = section.startX;
  return {
    ...section,
    entry,
    spawnX,
    startX: Math.max(0, section.startX - 120),
    endCheckpoint: {
      id: `end-${section.id}`,
      x: section.endX,
      y: section.endY,
      spawnX,
      spawnY: section.spawnY,
      endSection: true,
      forceReturn: options.forceReturn ?? true,
      label: "End",
    },
  };
}

function hashString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  }
  return hash;
}
