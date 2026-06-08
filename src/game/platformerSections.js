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

const PARKOUR_SECTION_LIBRARY = SECTION_LIBRARY.filter((section) => section.id !== "sunken-grotto");

export function randomPlatformerSection(entry = "") {
  const index = Math.abs(hashString(entry || "parkour-house")) % PARKOUR_SECTION_LIBRARY.length;
  return makeSection(PARKOUR_SECTION_LIBRARY[index], entry, {
    forceReturn: true,
    noNpcs: true,
  });
}

export function shopPlatformerSection() {
  const startX = 120;
  const floorY = GROUND_Y;
  return makeSection({
    id: "market-hall",
    name: "Market Hall",
    startX,
    spawnY: floorY - FROG_HEIGHT,
    endX: 1940,
    endY: floorY,
    customWorld: {
      platforms: [
        { id: "market-floor", type: "wood", x: 0, y: floorY, w: 1960, h: 80 },
        { id: "market-left-loft", type: "wood", x: 250, y: 410, w: 270, h: 24 },
        { id: "market-mid-loft", type: "wood", x: 710, y: 350, w: 310, h: 24 },
        { id: "market-right-loft", type: "wood", x: 1220, y: 410, w: 330, h: 24 },
        { id: "market-awning-step-a", type: "wood", x: 580, y: 475, w: 130, h: 22 },
        { id: "market-awning-step-b", type: "wood", x: 1040, y: 475, w: 130, h: 22 },
      ],
      waterZones: [],
      lilypads: [],
      npcs: [
        makeMarketTrader("market-trade", "Barter Frog", 285, floorY, "trade", "Trades flies into pearls and amber."),
        makeMarketTrader("market-leap", "Leap Frog", 560, floorY, "leap", "Sells lily leap upgrades."),
        makeMarketTrader("market-speed", "Swift Frog", 830, floorY, "speed", "Sells speed upgrades."),
        makeMarketTrader("market-spawn", "Buzz Frog", 1095, floorY, "spawn", "Sells fly spawn upgrades."),
        makeMarketTrader("market-pickaxe", "Tool Frog", 1365, floorY, "pickaxe", "Sells pickaxes and mining gear."),
        makeMarketTrader("market-furniture", "Decor Frog", 1585, floorY, "furniture", "Sells furniture for your house."),
        makeMarketTrader("market-house", "Builder Frog", 1780, floorY, "house", "Sells house expansion levels."),
      ],
      flySpawnPoints: [],
      relics: [],
      pearls: [],
      amberCoins: [],
      cars: [],
      messages: [
        { x: 1000, y: 182, w: 430, text: "Market Hall" },
        { x: 1000, y: 216, w: 580, text: "Talk to each trader. No flies or gems spawn in here." },
      ],
      checkpoints: [],
      caveZones: [],
      decorations: makeWoodDecorations(2020, floorY),
      structures: makeMarketStalls(floorY),
    },
  }, "shop", {
    forceReturn: false,
    interiorKind: "market",
    noFlies: true,
    addEndCheckpoint: false,
  });
}

export function housePlatformerSection(level = 1, placedInterior = {}) {
  const houseLevel = Math.max(1, Math.min(20, Number(level) || 1));
  const floorY = GROUND_Y;
  const roomW = 330;
  const downstairsRooms = Math.max(1, Math.min(5, houseLevel >= 20 ? 5 : 1 + Math.floor((houseLevel - 1) / 4)));
  const upstairsRooms = houseLevel < 10 ? 0 : Math.max(1, Math.min(4, houseLevel >= 20 ? 4 : 1 + Math.floor((houseLevel - 10) / 3)));
  const width = Math.max(920, downstairsRooms * roomW + 210);
  const startX = 96;
  const upperY = 312;
  const platforms = [
    { id: "house-floor", type: "wood", x: 0, y: floorY, w: width, h: 80 },
  ];
  const structures = [];
  const decorations = [];
  const messages = [
    { x: width / 2, y: 182, w: 420, text: `Your House - Level ${houseLevel}` },
  ];
  const checkpoints = [
    {
      id: "house-door",
      x: width - 110,
      y: floorY,
      spawnX: startX,
      spawnY: floorY - FROG_HEIGHT,
      endSection: true,
      forceReturn: false,
      label: "Door",
    },
  ];

  for (let i = 0; i < downstairsRooms; i += 1) {
    const roomX = 40 + i * roomW;
    structures.push({ id: `down-room-${i}`, type: "houseRoom", floor: "down", x: roomX, y: floorY - 220, w: roomW - 18, h: 220 });
    if (i > 0) {
      structures.push({ id: `down-arch-${i}`, type: "houseArch", x: roomX - 18, y: floorY - 126, w: 36, h: 126 });
    }
    platforms.push({ id: `down-shelf-${i}`, type: "wood", x: roomX + 92, y: 432 - (i % 2) * 38, w: 104, h: 18 });
  }

  if (houseLevel >= 10) {
    const ladderX = Math.min(width - 240, 330);
    structures.push({ id: "house-ladder", type: "ladder", x: ladderX, y: upperY - 18, w: 42, h: floorY - upperY + 46 });
    for (let i = 0; i < 8; i += 1) {
      platforms.push({ id: `ladder-rung-${i}`, type: "wood", x: ladderX - 18 + (i % 2) * 28, y: floorY - 54 - i * 33, w: 86, h: 12 });
    }
    messages.push({ x: ladderX + 34, y: upperY + 14, w: 280, text: "Ladder opening connects both floors" });
  }

  if (upstairsRooms > 0) {
    const upperFloorX = 80;
    const upperFloorW = upstairsRooms * roomW;
    const ladderX = Math.min(width - 240, 330);
    const ladderGapX = ladderX - 34;
    const ladderGapW = 110;
    if (ladderGapX > upperFloorX + 38) {
      platforms.push({ id: "house-upper-floor-left", type: "wood", x: upperFloorX, y: upperY, w: ladderGapX - upperFloorX, h: 26 });
    }
    const rightFloorX = ladderGapX + ladderGapW;
    const rightFloorW = upperFloorX + upperFloorW - rightFloorX;
    if (rightFloorW > 38) {
      platforms.push({ id: "house-upper-floor-right", type: "wood", x: rightFloorX, y: upperY, w: rightFloorW, h: 26 });
    }
    for (let i = 0; i < upstairsRooms; i += 1) {
      const roomX = 40 + i * roomW;
      structures.push({ id: `up-room-${i}`, type: "houseRoom", floor: "up", x: roomX, y: upperY - 190, w: roomW - 18, h: 190 });
      if (i > 0) {
        structures.push({ id: `up-arch-${i}`, type: "houseArch", x: roomX - 18, y: upperY - 106, w: 36, h: 106 });
      }
      platforms.push({ id: `up-shelf-${i}`, type: "wood", x: roomX + 120, y: upperY - 88 - (i % 2) * 34, w: 110, h: 16 });
    }
  }

  addPlacedDecorations(decorations, placedInterior, width, floorY, upperY);

  return makeSection({
    id: "house-interior",
    name: `Your House Lv ${houseLevel}`,
    startX,
    spawnY: floorY - FROG_HEIGHT,
    endX: width - 70,
    endY: floorY,
    customWorld: {
      platforms,
      waterZones: [],
      lilypads: [],
      npcs: [],
      flySpawnPoints: [],
      relics: [],
      pearls: [],
      amberCoins: [],
      cars: [],
      messages,
      checkpoints,
      caveZones: [],
      decorations,
      structures,
    },
  }, "houseInterior", {
    forceReturn: false,
    interiorKind: "house",
    noFlies: true,
    addEndCheckpoint: false,
  });
}

function makeSection(section, entry, options = {}) {
  const spawnX = section.startX;
  return {
    ...section,
    entry,
    spawnX,
    startX: Math.max(0, section.startX - 120),
    interiorKind: options.interiorKind ?? section.interiorKind ?? null,
    noNpcs: options.noNpcs ?? section.noNpcs ?? false,
    noFlies: options.noFlies ?? section.noFlies ?? false,
    endCheckpoint: options.addEndCheckpoint === false ? null : {
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

function makeMarketTrader(id, name, x, floorY, action, talk) {
  return {
    id,
    name,
    x,
    y: floorY,
    marketAction: action,
    talk,
  };
}

function makeWoodDecorations(width, floorY) {
  const decorations = [];
  for (let x = 96; x < width; x += 170) {
    decorations.push({ id: `beam-${x}`, type: "woodBeam", x, y: floorY });
  }
  for (let x = 190; x < width; x += 260) {
    decorations.push({ id: `lantern-${x}`, type: "hangingLantern", x, y: 238 });
  }
  return decorations;
}

function makeMarketStalls(floorY) {
  return [
    { id: "stall-barter", type: "marketStall", x: 220, y: floorY - 18, w: 136, h: 88, color: "#d6a94f" },
    { id: "stall-leap", type: "marketStall", x: 500, y: floorY - 18, w: 136, h: 88, color: "#8bc85c" },
    { id: "stall-speed", type: "marketStall", x: 770, y: floorY - 18, w: 136, h: 88, color: "#6cb86d" },
    { id: "stall-spawn", type: "marketStall", x: 1035, y: floorY - 18, w: 136, h: 88, color: "#5fa8c6" },
    { id: "stall-tools", type: "marketStall", x: 1300, y: floorY - 18, w: 136, h: 88, color: "#9d8060" },
    { id: "stall-decor", type: "marketStall", x: 1525, y: floorY - 18, w: 136, h: 88, color: "#9d6cc7" },
    { id: "stall-builder", type: "marketStall", x: 1718, y: floorY - 18, w: 136, h: 88, color: "#bf7654" },
  ];
}

function addPlacedDecorations(decorations, placedInterior, width, floorY, upperY) {
  const counts = placedInterior ?? {};
  const addMany = (part, count, makeItem) => {
    for (let i = 0; i < count; i += 1) {
      decorations.push(makeItem(i));
    }
  };
  addMany("window", counts.window ?? 0, (index) => ({ id: `placed-window-${index}`, type: "roomWindow", x: 170 + (index * 190) % Math.max(240, width - 240), y: floorY - 165 - (index % 2) * 250 }));
  addMany("lantern", counts.lantern ?? 0, (index) => ({ id: `placed-lantern-${index}`, type: "hangingLantern", x: 240 + (index * 230) % Math.max(260, width - 260), y: index % 3 === 2 ? upperY - 142 : floorY - 246 }));
  addMany("rug", counts.rug ?? 0, (index) => ({ id: `placed-rug-${index}`, type: "roomRug", x: 220 + (index * 260) % Math.max(280, width - 280), y: floorY - 6 }));
  addMany("trophy", counts.trophy ?? 0, (index) => ({ id: `placed-trophy-${index}`, type: "roomTrophy", x: width - 210 - index * 44, y: floorY - 58 }));
}

function hashString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  }
  return hash;
}
