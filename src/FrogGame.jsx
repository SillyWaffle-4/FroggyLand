import React from "react";
import { MAX_DT, TARGET_FRAME_MS, VIEW_HEIGHT, VIEW_WIDTH, keys } from "./game/constants.js";
import { WORLD } from "./game/world.js";
import { drawGame } from "./game/renderer.js";
import {
  createInitialState,
  findNearbyNpc,
  placeLilyPad,
  startTongue,
  togglePlacementMode,
  tradeWithNearbyNpc,
  updateGame,
} from "./game/simulation.js";
import { housePlatformerSection, randomPlatformerSection, shopPlatformerSection } from "./game/platformerSections.js";
import { FURNITURE_SHOP_ITEMS, PICKAXES } from "./game/topDownMode.js";

const HOUSE_PARTS = [
  { id: "window", name: "Round Window" },
  { id: "rug", name: "Leaf Rug" },
  { id: "lantern", name: "Glow Lantern" },
  { id: "trophy", name: "Parkour Trophy" },
];

const PARKOUR_GOAL_X = 1500;
const SHOP_GOAL_X = 1500;

const EMPTY_PROGRESS = {
  houseParts: {},
  placedInterior: {},
  rewards: {},
};

export function FrogGame(props) {
  return <PlatformerGame {...props} />;
}

function PlatformerGame({ soundOn, entry = "openMap", progress = EMPTY_PROGRESS, onProgressChange, onExitToTopDown }) {
  const isParkourEntry = entry.startsWith("parkour");
  const isShopEntry = entry === "shop";
  const isHouseEntry = entry === "houseInterior";
  const banksPlatformerLoot = isParkourEntry || isShopEntry;
  const platformerSection = React.useMemo(() => {
    if (isParkourEntry) return randomPlatformerSection(entry);
    if (isShopEntry) return shopPlatformerSection();
    if (isHouseEntry) return housePlatformerSection(progress.house?.level ?? progress.topDown?.houseLevel ?? 1, progress.placedInterior);
    return null;
  }, [entry, isHouseEntry, isParkourEntry, isShopEntry, progress.house?.level, progress.placedInterior, progress.topDown?.houseLevel]);
  const canvasRef = React.useRef(null);
  const wrapperRef = React.useRef(null);
  const progressRef = React.useRef(progress);
  const stateRef = React.useRef(null);
  const sectionReturnQueuedRef = React.useRef(false);
  if (!stateRef.current) {
    stateRef.current = createInitialState({ section: platformerSection, topDownUpgrades: progress.topDown });
    if (isParkourEntry) {
      stateRef.current.notice = `Parkour House: ${platformerSection.name} is a short room. Reach the red END checkpoint for a reward.`;
      stateRef.current.noticeTimer = 4;
    } else if (isShopEntry) {
      stateRef.current.shopUnlocked = true;
      stateRef.current.notice = "Market Hall: talk to traders for upgrades. No flies or gems spawn here.";
      stateRef.current.noticeTimer = 4;
    } else if (isHouseEntry) {
      stateRef.current.notice = `House level ${progress.house?.level ?? progress.topDown?.houseLevel ?? 1}: parkour through every unlocked room.`;
      stateRef.current.noticeTimer = 4;
    }
  }
  const pressedRef = React.useRef(new Set());
  const pointerRef = React.useRef({ x: VIEW_WIDTH / 2, y: VIEW_HEIGHT / 2, down: false });
  const soundOnRef = React.useRef(soundOn);
  const [hud, setHud] = React.useState(() => makeHud(stateRef.current, entry, progress));
  const [inventoryHidden, setInventoryHidden] = React.useState(false);

  React.useEffect(() => {
    soundOnRef.current = soundOn;
  }, [soundOn]);

  React.useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  React.useEffect(() => {
    const onKeyDown = (event) => {
      if (event.code === "KeyE") {
        event.preventDefault();
        if (!event.repeat) {
          const nearbyNpc = findNearbyNpc(stateRef.current);
          if (isShopEntry && nearbyNpc?.marketAction) {
            const message = runMarketAction(nearbyNpc.marketAction, progressRef.current, onProgressChange);
            stateRef.current.notice = message;
            stateRef.current.noticeTimer = 3;
          } else {
            tradeWithNearbyNpc(stateRef.current, soundOnRef.current);
          }
        }
        return;
      }
      if (event.code === "KeyP") {
        event.preventDefault();
        if (!event.repeat) togglePlacementMode(stateRef.current);
        return;
      }
      if (event.code === "Escape") {
        stateRef.current.placementMode = false;
        return;
      }
      if ([...keys.left, ...keys.right, ...keys.jump].includes(event.code)) {
        event.preventDefault();
        pressedRef.current.add(event.code);
      }
    };
    const onKeyUp = (event) => pressedRef.current.delete(event.code);

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [isShopEntry, onProgressChange]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const resize = () => {
      const rect = wrapperRef.current.getBoundingClientRect();
      const scale = Math.min(rect.width / VIEW_WIDTH, 1);
      canvas.style.width = `${VIEW_WIDTH * scale}px`;
      canvas.style.height = `${VIEW_HEIGHT * scale}px`;
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d", { alpha: false });
    context.imageSmoothingEnabled = false;
    let frameId;
    let last = performance.now();
    let lastFrame = last;
    let hudTimer = 0;
    let lastHudKey = "";
    let autoExitId = null;

    const tick = (now) => {
      if (document.hidden) {
        last = now;
        frameId = requestAnimationFrame(tick);
        return;
      }

      if (now - lastFrame < TARGET_FRAME_MS) {
        frameId = requestAnimationFrame(tick);
        return;
      }

      const dt = Math.min((now - last) / 1000, MAX_DT);
      last = now;
      lastFrame = now;
      updateGame(stateRef.current, pressedRef.current, pointerRef.current, dt, soundOnRef.current);
      if (isParkourEntry) {
        grantParkourReward(stateRef.current, entry, progressRef.current, onProgressChange);
      } else if (isShopEntry) {
        unlockMarketCounter(stateRef.current);
      }
      if (banksPlatformerLoot) {
        bankPlatformerLoot(stateRef.current, onProgressChange);
      }
      drawGame(context, stateRef.current);

      if (stateRef.current.forceTopDownReturn && !sectionReturnQueuedRef.current) {
        sectionReturnQueuedRef.current = true;
        autoExitId = window.setTimeout(() => {
          if (banksPlatformerLoot) {
            bankPlatformerLoot(stateRef.current, onProgressChange);
          }
          onExitToTopDown?.();
        }, 450);
      }

      hudTimer += dt;
      if (hudTimer > 0.2) {
        hudTimer = 0;
        const nextHud = makeHud(stateRef.current, entry, progressRef.current);
        const nextHudKey = JSON.stringify(nextHud);
        if (nextHudKey !== lastHudKey) {
          lastHudKey = nextHudKey;
          setHud(nextHud);
        }
      }
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frameId);
      if (autoExitId) window.clearTimeout(autoExitId);
    };
  }, [banksPlatformerLoot, entry, isParkourEntry, isShopEntry, onExitToTopDown, onProgressChange]);

  const pointerToWorld = React.useCallback((event) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * VIEW_WIDTH;
    const y = ((event.clientY - rect.top) / rect.height) * VIEW_HEIGHT;
    return { x: x + stateRef.current.cameraX, y };
  }, []);

  const handlePointerMove = (event) => {
    pointerRef.current = { ...pointerRef.current, ...pointerToWorld(event) };
  };

  const handlePointerDown = (event) => {
    canvasRef.current.focus();
    const nextPointer = pointerToWorld(event);
    pointerRef.current = { ...nextPointer, down: true };
    if (stateRef.current.placementMode) {
      placeLilyPad(stateRef.current, nextPointer, soundOnRef.current);
      return;
    }
    startTongue(stateRef.current, nextPointer);
  };

  const handlePointerUp = () => {
    pointerRef.current.down = false;
  };

  const handleMarketAction = (action) => {
    const message = runMarketAction(action, progressRef.current, onProgressChange);
    stateRef.current.notice = message;
    stateRef.current.noticeTimer = 3;
    setHud(makeHud(stateRef.current, entry, progressRef.current));
  };

  const handleExitToTopDown = () => {
    if (banksPlatformerLoot) {
      bankPlatformerLoot(stateRef.current, onProgressChange);
    }
    onExitToTopDown?.();
  };

  return (
    <section className="game-layout">
      <div className="canvas-wrap platformer-wrap" ref={wrapperRef}>
        <canvas
          ref={canvasRef}
          width={VIEW_WIDTH}
          height={VIEW_HEIGHT}
          onPointerMove={handlePointerMove}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          aria-label="Frog platformer game canvas"
          tabIndex={0}
        />
      </div>

      {inventoryHidden && (
        <button
          type="button"
          className="inventory-toggle inventory-toggle-collapsed"
          onClick={() => setInventoryHidden(false)}
        >
          Inventory
        </button>
      )}

      <aside className={`panel ${inventoryHidden ? "panel-hidden" : ""}`}>
        <button
          type="button"
          className="inventory-toggle"
          onClick={() => setInventoryHidden(true)}
        >
          Shrink Inventory
        </button>
        <div className="area-name">
          <span>Area</span>
          <strong>{hud.regionName}</strong>
        </div>
        <div className="inventory-grid" aria-label="Inventory">
          <div>
            <span>Flies</span>
            <strong>{hud.score}</strong>
          </div>
          <div>
            <span>Pads</span>
            <strong>{hud.lilyPads}</strong>
          </div>
          <div>
            <span>Pearls</span>
            <strong>{hud.pearls}</strong>
          </div>
          <div>
            <span>Amber</span>
            <strong>{hud.amber}</strong>
          </div>
          <div>
            <span>Relics</span>
            <strong>{hud.relics}/{hud.totalRelics}</strong>
          </div>
          <div>
            <span>Range</span>
            <strong>{hud.tongueRange}</strong>
          </div>
          {hud.canReturnTopDown && (
            <div>
              <span>Parts</span>
              <strong>{hud.partTotal}</strong>
            </div>
          )}
        </div>
        {(hud.canTrade || hud.canPlace || hud.canReturnTopDown || hud.marketAction) && (
          <div className="action-grid">
            {hud.canReturnTopDown && (
              <button
                type="button"
                className="panel-button"
                onClick={handleExitToTopDown}
              >
                Return Top Down
              </button>
            )}
            {hud.marketAction && (
              <button
                type="button"
                className="panel-button"
                onClick={() => handleMarketAction(hud.marketAction)}
              >
                {hud.marketActionLabel}
              </button>
            )}
            {hud.canTrade && !hud.marketAction && (
              <button
                type="button"
                className="panel-button"
                onClick={() => tradeWithNearbyNpc(stateRef.current, soundOnRef.current)}
              >
                Trade
              </button>
            )}
            {hud.canPlace && (
              <button
                type="button"
                className="panel-button"
                onClick={() => togglePlacementMode(stateRef.current)}
              >
                {hud.placementMode ? "Stop Placing" : "Place Pad"}
              </button>
            )}
          </div>
        )}
        <p className="notice">{hud.nearbyNpcName ? `Near ${hud.nearbyNpcName}. ${hud.notice}` : hud.notice}</p>
        <div className="control-list" aria-label="Controls">
          {!hud.tutorialComplete && <span><kbd>A</kbd><kbd>D</kbd> Move</span>}
          {!hud.tutorialComplete && <span><kbd>W</kbd><kbd>Space</kbd> Jump</span>}
          <span><kbd>Click</kbd> Tongue</span>
          {hud.marketAction ? <span><kbd>E</kbd> Shop</span> : hud.canTrade && <span><kbd>E</kbd> Trade</span>}
          {hud.canPlace && <span><kbd>P</kbd> Place</span>}
          {hud.canReturnTopDown && <span><kbd>Modes</kbd> Return</span>}
        </div>
      </aside>
    </section>
  );
}

function makeHud(state, entry = "openMap", progress = EMPTY_PROGRESS) {
  const isParkourEntry = entry.startsWith("parkour");
  const isShopEntry = entry === "shop";
  const isHouseEntry = entry === "houseInterior";
  const nearbyNpc = findNearbyNpc(state);
  const partTotal = Object.values(progress.houseParts ?? {}).reduce((total, value) => total + value, 0);
  const topDown = progress.topDown ?? {};
  const marketAction = isShopEntry ? nearbyNpc?.marketAction ?? null : null;
  return {
    regionName: isParkourEntry ? "Parkour House" : isShopEntry ? "Market Hall" : isHouseEntry ? `House Lv ${progress.house?.level ?? topDown.houseLevel ?? 1}` : state.regionName,
    score: isShopEntry ? topDown.score ?? 0 : state.score,
    lilyPads: state.lilyPads,
    pearls: isShopEntry ? topDown.pearls ?? 0 : state.pearls,
    amber: isShopEntry ? topDown.amber ?? 0 : state.amber,
    relics: state.collectedRelics.size,
    totalRelics: WORLD.relics.length,
    placementMode: state.placementMode,
    nearbyNpcName: nearbyNpc?.name ?? null,
    canTrade: Boolean(nearbyNpc),
    canPlace: state.lilyPads > 0 || state.placementMode,
    canReturnTopDown: entry !== "openMap",
    marketUnlocked: false,
    marketAction,
    marketActionLabel: marketAction ? marketActionButtonLabel(marketAction) : "Shop",
    tutorialComplete: state.tutorialComplete,
    tongueRange: state.tongueRangeBonus > 0 ? `+${state.tongueRangeBonus}` : "Base",
    partTotal,
    notice: state.notice,
  };
}

function grantParkourReward(state, entry, progress, onProgressChange) {
  const reward = getParkourReward(entry);
  if (state.parkourRewarded || !platformerObjectiveReached(state, PARKOUR_GOAL_X) || progress.rewards?.[reward.id]) {
    return;
  }
  state.parkourRewarded = true;
  onProgressChange?.((current) => ({
    houseParts: {
      [reward.part]: (current.houseParts?.[reward.part] ?? 0) + reward.amount,
    },
    placedInterior: {
      [reward.part]: (current.placedInterior?.[reward.part] ?? 0) + reward.amount,
    },
    rewards: {
      [reward.id]: true,
    },
  }));
  state.notice = `Platformer reward earned: ${reward.name}.`;
  state.noticeTimer = 3.4;
}

function unlockMarketCounter(state) {
  if (state.shopUnlocked || !platformerObjectiveReached(state, SHOP_GOAL_X)) return;
  state.shopUnlocked = true;
  state.notice = "Market counter unlocked. Buy upgrades, trade, or shop furniture.";
  state.noticeTimer = 3.4;
}

function platformerObjectiveReached(state, fallbackX) {
  return state.section ? state.sectionComplete : state.frog.x >= fallbackX;
}

function bankPlatformerLoot(state, onProgressChange) {
  const synced = state.syncedPlatformerLoot ?? { score: 0, pearls: 0, amber: 0 };
  const scoreDelta = Math.max(0, state.score - synced.score);
  const pearlDelta = Math.max(0, state.pearls - synced.pearls);
  const amberDelta = Math.max(0, state.amber - synced.amber);
  if (scoreDelta <= 0 && pearlDelta <= 0 && amberDelta <= 0) {
    return;
  }

  state.syncedPlatformerLoot = {
    score: state.score,
    pearls: state.pearls,
    amber: state.amber,
  };
  onProgressChange?.((current) => ({
    topDown: {
      score: (current.topDown?.score ?? 0) + scoreDelta,
      pearls: (current.topDown?.pearls ?? 0) + pearlDelta,
      amber: (current.topDown?.amber ?? 0) + amberDelta,
    },
  }));
}

function runMarketAction(action, progress, onProgressChange) {
  const topDown = progress.topDown ?? {};
  const nextTopDown = { ...topDown };
  const grantPart = {};

  if (action === "trade") {
    if ((nextTopDown.score ?? 0) < 4) return "Market trade needs 4 flies.";
    nextTopDown.score -= 4;
    nextTopDown.amber = (nextTopDown.amber ?? 0) + 1;
    nextTopDown.pearls = (nextTopDown.pearls ?? 0) + 1;
    onProgressChange?.({ topDown: nextTopDown });
    return "Traded 4 flies for 1 amber and 1 pearl.";
  }

  if (action === "leap") {
    if ((nextTopDown.leapUpgrade ?? 0) >= 10) return "Lily leap is already level 10.";
    if ((nextTopDown.amber ?? 0) < 3 || (nextTopDown.pearls ?? 0) < 2) return "Leap upgrade costs 3 amber and 2 pearls.";
    nextTopDown.amber -= 3;
    nextTopDown.pearls -= 2;
    nextTopDown.leapUpgrade = (nextTopDown.leapUpgrade ?? 0) + 1;
    onProgressChange?.({ topDown: nextTopDown });
    return `Lily leap upgraded to level ${nextTopDown.leapUpgrade}.`;
  }

  if (action === "speed") {
    if ((nextTopDown.speedUpgrade ?? 0) >= 12) return "Speed is already maxed out.";
    const nextLevel = (nextTopDown.speedUpgrade ?? 0) + 1;
    const cost = { flies: 4 + nextLevel * 2, pearls: 1 + Math.floor(nextLevel / 3), amber: Math.floor(nextLevel / 5) };
    if (!canAffordMarketCost(nextTopDown, cost)) return `Speed ${nextLevel} costs ${marketCostLabel(cost)}.`;
    spendMarketCost(nextTopDown, cost);
    nextTopDown.speedUpgrade = nextLevel;
    onProgressChange?.({ topDown: nextTopDown });
    return `Speed upgraded to level ${nextLevel}.`;
  }

  if (action === "spawn") {
    if ((nextTopDown.spawnRateUpgrade ?? 0) >= 12) return "Fly spawn rate is already maxed out.";
    const nextLevel = (nextTopDown.spawnRateUpgrade ?? 0) + 1;
    const cost = { flies: 6 + nextLevel * 2, pearls: 2 + Math.floor(nextLevel / 4), amber: Math.floor(nextLevel / 4) };
    if (!canAffordMarketCost(nextTopDown, cost)) return `Spawn rate ${nextLevel} costs ${marketCostLabel(cost)}.`;
    spendMarketCost(nextTopDown, cost);
    nextTopDown.spawnRateUpgrade = nextLevel;
    onProgressChange?.({ topDown: nextTopDown });
    return `Fly spawn rate upgraded to level ${nextLevel}.`;
  }

  if (action === "pickaxe") {
    const nextPickaxe = PICKAXES.find((pickaxe) => pickaxe.tier === (nextTopDown.pickaxeTier ?? 0) + 1);
    if (!nextPickaxe) return "You already have the strongest pickaxe.";
    const amberCost = nextPickaxe.costAmber ?? 0;
    if ((nextTopDown.pearls ?? 0) < nextPickaxe.costPearls || (nextTopDown.amber ?? 0) < amberCost) {
      const amberText = amberCost > 0 ? ` and ${amberCost} amber` : "";
      return `${nextPickaxe.name} costs ${nextPickaxe.costPearls} pearls${amberText}.`;
    }
    nextTopDown.pearls -= nextPickaxe.costPearls;
    nextTopDown.amber -= amberCost;
    nextTopDown.pickaxeTier = nextPickaxe.tier;
    onProgressChange?.({ topDown: nextTopDown });
    return `Bought ${nextPickaxe.name}.`;
  }

  if (action === "house") {
    if (!progress.house) return "Build your house in top-down first.";
    const currentLevel = Math.max(1, progress.house.level ?? nextTopDown.houseLevel ?? 1);
    if (currentLevel >= 20) return "Your house is already level 20.";
    const nextLevel = currentLevel + 1;
    const materials = { wood: 0, clay: 0, stone: 0, crystal: 0, water: 0, ...(nextTopDown.materials ?? {}) };
    const cost = getHouseUpgradeCost(nextLevel);
    if (!canAffordMarketCost(nextTopDown, cost.currency) || !canAffordMaterials(materials, cost.materials)) {
      return `House level ${nextLevel} costs ${houseUpgradeCostLabel(cost)}.`;
    }
    spendMarketCost(nextTopDown, cost.currency);
    spendMaterials(materials, cost.materials);
    nextTopDown.materials = materials;
    nextTopDown.houseLevel = nextLevel;
    onProgressChange?.({
      topDown: nextTopDown,
      house: { ...progress.house, level: nextLevel },
    });
    if (nextLevel === 10) return "House upgraded to level 10. The ladder and second floor are unlocked.";
    if (nextLevel === 20) return "House upgraded to level 20. Five downstairs rooms and four upstairs rooms are unlocked.";
    return `House upgraded to level ${nextLevel}.`;
  }

  const shopIndex = nextTopDown.furnitureShopIndex ?? 0;
  const item = FURNITURE_SHOP_ITEMS[shopIndex % FURNITURE_SHOP_ITEMS.length];
  if (!canAffordMarketCost(nextTopDown, item.cost)) return `${item.name} costs ${marketCostLabel(item.cost)}.`;
  spendMarketCost(nextTopDown, item.cost);
  nextTopDown.furnitureShopIndex = shopIndex + 1;
  grantPart[item.part] = (progress.houseParts?.[item.part] ?? 0) + 1;
  onProgressChange?.({ topDown: nextTopDown, houseParts: grantPart, placedInterior: grantPart });
  return `Bought ${item.name} for your house.`;
}

function marketActionButtonLabel(action) {
  if (action === "trade") return "Trade Flies";
  if (action === "leap") return "Buy Leap";
  if (action === "speed") return "Buy Speed";
  if (action === "spawn") return "Buy Spawn Rate";
  if (action === "pickaxe") return "Buy Pickaxe";
  if (action === "house") return "Upgrade House";
  return "Buy Furniture";
}

function canAffordMarketCost(topDown, cost) {
  return (
    (topDown.score ?? 0) >= (cost.flies ?? 0) &&
    (topDown.pearls ?? 0) >= (cost.pearls ?? 0) &&
    (topDown.amber ?? 0) >= (cost.amber ?? 0)
  );
}

function spendMarketCost(topDown, cost) {
  topDown.score = (topDown.score ?? 0) - (cost.flies ?? 0);
  topDown.pearls = (topDown.pearls ?? 0) - (cost.pearls ?? 0);
  topDown.amber = (topDown.amber ?? 0) - (cost.amber ?? 0);
}

function marketCostLabel(cost) {
  return [
    cost.flies ? `${cost.flies} flies` : "",
    cost.pearls ? `${cost.pearls} pearls` : "",
    cost.amber ? `${cost.amber} amber` : "",
  ].filter(Boolean).join(" and ");
}

function getHouseUpgradeCost(nextLevel) {
  return {
    currency: {
      flies: 4 + nextLevel,
      pearls: Math.floor(nextLevel / 2),
      amber: Math.floor(nextLevel / 5),
    },
    materials: {
      wood: 4 + nextLevel * 2,
      clay: nextLevel >= 6 ? Math.floor(nextLevel / 2) : 0,
      stone: nextLevel >= 11 ? Math.floor(nextLevel / 3) : 0,
      crystal: nextLevel >= 16 ? Math.floor(nextLevel / 5) : 0,
    },
  };
}

function canAffordMaterials(materials, cost) {
  return Object.entries(cost).every(([material, amount]) => (materials[material] ?? 0) >= amount);
}

function spendMaterials(materials, cost) {
  for (const [material, amount] of Object.entries(cost)) {
    materials[material] = (materials[material] ?? 0) - amount;
  }
}

function houseUpgradeCostLabel(cost) {
  const currency = marketCostLabel(cost.currency);
  const materials = Object.entries(cost.materials)
    .filter(([, amount]) => amount > 0)
    .map(([material, amount]) => `${amount} ${material}`)
    .join(", ");
  return [currency, materials].filter(Boolean).join(" and ");
}

function getParkourReward(entry) {
  const challengeId = entry.replace(/^parkour:?/, "") || "village";
  const total = [...challengeId].reduce((sum, letter) => sum + letter.charCodeAt(0), 0);
  const part = HOUSE_PARTS[total % HOUSE_PARTS.length];
  return {
    id: `parkour-${challengeId}`,
    part: part.id,
    amount: 1,
    name: part.name,
  };
}

function HouseInteriorEditor({ progress = EMPTY_PROGRESS, onProgressChange, onExitToTopDown }) {
  const parts = progress.houseParts ?? {};
  const placed = progress.placedInterior ?? {};

  const placePart = (partId) => {
    const owned = parts[partId] ?? 0;
    const used = placed[partId] ?? 0;
    if (used >= owned) return;
    onProgressChange?.({ placedInterior: { [partId]: used + 1 } });
  };

  const removePart = (partId) => {
    const used = placed[partId] ?? 0;
    if (used <= 0) return;
    onProgressChange?.({ placedInterior: { [partId]: used - 1 } });
  };

  return (
    <section className="game-layout house-interior-layout">
      <div className="house-room" aria-label="House interior">
        <div className="room-wall">
          {Array.from({ length: placed.window ?? 0 }).map((_, index) => (
            <span key={`window-${index}`} className="room-window" />
          ))}
          {Array.from({ length: placed.lantern ?? 0 }).map((_, index) => (
            <span key={`lantern-${index}`} className="room-lantern" />
          ))}
          {Array.from({ length: placed.trophy ?? 0 }).map((_, index) => (
            <span key={`trophy-${index}`} className="room-trophy" />
          ))}
        </div>
        <div className="room-floor">
          {Array.from({ length: placed.rug ?? 0 }).map((_, index) => (
            <span key={`rug-${index}`} className="room-rug" />
          ))}
        </div>
      </div>

      <aside className="panel">
        <div className="area-name">
          <span>Inside</span>
          <strong>Your House</strong>
        </div>
        <div className="inventory-grid" aria-label="House parts">
          {HOUSE_PARTS.map((part) => (
            <div key={part.id}>
              <span>{part.name}</span>
              <strong>{placed[part.id] ?? 0}/{parts[part.id] ?? 0}</strong>
            </div>
          ))}
        </div>
        <div className="house-part-grid">
          {HOUSE_PARTS.map((part) => {
            const owned = parts[part.id] ?? 0;
            const used = placed[part.id] ?? 0;
            return (
              <React.Fragment key={part.id}>
                <button
                  type="button"
                  className="panel-button"
                  disabled={used >= owned}
                  onClick={() => placePart(part.id)}
                >
                  Place {part.name}
                </button>
                <button
                  type="button"
                  className="panel-button"
                  disabled={used <= 0}
                  onClick={() => removePart(part.id)}
                >
                  Remove
                </button>
              </React.Fragment>
            );
          })}
        </div>
        <button type="button" className="panel-button" onClick={onExitToTopDown}>
          Return Top Down
        </button>
        <p className="notice">Parkour Village House rewards unlock more parts.</p>
      </aside>
    </section>
  );
}
