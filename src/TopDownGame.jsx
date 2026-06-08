import React from "react";
import { MAX_DT, TARGET_FRAME_MS, VIEW_HEIGHT, VIEW_WIDTH, keys } from "./game/constants.js";
import {
  CHECKPOINT_COST,
  FURNITURE_SHOP_ITEMS,
  HOUSE_COST,
  LILY_PAD_COST,
  buildTopDownCheckpoint,
  buildTopDownHouse,
  chopNearbyTree,
  createTopDownState,
  drawTopDownGame,
  findNearbyMineableWall,
  findNearbyTopDownPlace,
  getDayInfo,
  getCurrentPickaxe,
  interactTopDownPlace,
  makeTopDownProgress,
  mineNearbyWall,
  placeTopDownLilyPad,
  placeTopDownMaterial,
  cycleTopDownPlaceable,
  toggleTopDownTeleportMap,
  teleportToTopDownCheckpoint,
  updateTopDownGame,
} from "./game/topDownMode.js";

export function TopDownGame({ soundOn, progress, onProgressChange, onEnterPlatformer }) {
  const canvasRef = React.useRef(null);
  const wrapperRef = React.useRef(null);
  const stateRef = React.useRef(createTopDownState(progress));
  const pressedRef = React.useRef(new Set());
  const pointerRef = React.useRef({ x: VIEW_WIDTH / 2, y: VIEW_HEIGHT / 2, down: false });
  const soundOnRef = React.useRef(soundOn);
  const [hud, setHud] = React.useState(() => makeTopDownHud(stateRef.current));

  React.useEffect(() => {
    soundOnRef.current = soundOn;
  }, [soundOn]);

  const syncTopDownProgress = React.useCallback(() => {
    onProgressChange?.({ topDown: makeTopDownProgress(stateRef.current) });
  }, [onProgressChange]);

  const handleInteract = React.useCallback(() => {
    const result = interactTopDownPlace(stateRef.current, soundOnRef.current);
    if (result?.furnitureReward) {
      onProgressChange?.((current) => ({
        topDown: makeTopDownProgress(stateRef.current),
        houseParts: {
          [result.furnitureReward.part]: (current.houseParts?.[result.furnitureReward.part] ?? 0) + result.furnitureReward.amount,
        },
      }));
    } else {
      syncTopDownProgress();
    }
    setHud(makeTopDownHud(stateRef.current));
    if (result?.mode === "platformer") {
      onEnterPlatformer?.(result.entry);
    }
  }, [onEnterPlatformer, onProgressChange, syncTopDownProgress]);

  const handleBuildHouse = React.useCallback(() => {
    const house = buildTopDownHouse(stateRef.current, soundOnRef.current);
    if (house) {
      onProgressChange?.({ house, topDown: makeTopDownProgress(stateRef.current) });
    } else {
      syncTopDownProgress();
    }
    setHud(makeTopDownHud(stateRef.current));
  }, [onProgressChange, syncTopDownProgress]);

  React.useEffect(() => {
    const onKeyDown = (event) => {
      if (event.code === "KeyE") {
        event.preventDefault();
        if (!event.repeat) {
          handleInteract();
        }
        return;
      }
      if (event.code === "KeyM") {
        event.preventDefault();
        if (!event.repeat) {
          mineNearbyWall(stateRef.current, soundOnRef.current);
          syncTopDownProgress();
          setHud(makeTopDownHud(stateRef.current));
        }
        return;
      }
      if (event.code === "KeyH") {
        event.preventDefault();
        if (!event.repeat) {
          handleBuildHouse();
        }
        return;
      }
      if (event.code === "KeyB") {
        event.preventDefault();
        if (!event.repeat) {
          buildTopDownCheckpoint(stateRef.current, soundOnRef.current);
          syncTopDownProgress();
          setHud(makeTopDownHud(stateRef.current));
        }
        return;
      }
      if (event.code === "KeyT") {
        event.preventDefault();
        if (!event.repeat) {
          toggleTopDownTeleportMap(stateRef.current, soundOnRef.current);
          syncTopDownProgress();
          setHud(makeTopDownHud(stateRef.current));
        }
        return;
      }
      if (event.code === "KeyL") {
        event.preventDefault();
        if (!event.repeat) {
          placeTopDownLilyPad(stateRef.current, soundOnRef.current);
          syncTopDownProgress();
          setHud(makeTopDownHud(stateRef.current));
        }
        return;
      }
      if (event.code === "KeyX") {
        event.preventDefault();
        if (!event.repeat) {
          chopNearbyTree(stateRef.current, soundOnRef.current);
          syncTopDownProgress();
          setHud(makeTopDownHud(stateRef.current));
        }
        return;
      }
      if (event.code === "KeyC") {
        event.preventDefault();
        if (!event.repeat) {
          cycleTopDownPlaceable(stateRef.current, soundOnRef.current);
          syncTopDownProgress();
          setHud(makeTopDownHud(stateRef.current));
        }
        return;
      }
      if (event.code === "KeyV") {
        event.preventDefault();
        if (!event.repeat) {
          placeTopDownMaterial(stateRef.current, soundOnRef.current);
          syncTopDownProgress();
          setHud(makeTopDownHud(stateRef.current));
        }
        return;
      }
      if ([...keys.left, ...keys.right, ...keys.jump, "KeyS", "ArrowDown"].includes(event.code)) {
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
  }, [handleBuildHouse, handleInteract, syncTopDownProgress]);

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
    let saveTimer = 0;
    let lastHudKey = "";

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
      updateTopDownGame(stateRef.current, pressedRef.current, pointerRef.current, dt, soundOnRef.current);
      
      drawTopDownGame(context, stateRef.current);

      hudTimer += dt;
      saveTimer += dt;
      if (saveTimer > 1) {
        saveTimer = 0;
        syncTopDownProgress();
      }
      if (hudTimer > 0.18) {
        hudTimer = 0;
        const nextHud = makeTopDownHud(stateRef.current);
        const nextHudKey = JSON.stringify(nextHud);
        if (nextHudKey !== lastHudKey) {
          lastHudKey = nextHudKey;
          setHud(nextHud);
        }
      }
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [syncTopDownProgress]);

  const pointerToWorld = React.useCallback((event) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const zoom = stateRef.current.zoom || 1;
    return {
      x: (((event.clientX - rect.left) / rect.width) * VIEW_WIDTH) / zoom + stateRef.current.cameraX,
      y: (((event.clientY - rect.top) / rect.height) * VIEW_HEIGHT) / zoom + stateRef.current.cameraY,
    };
  }, []);

  const handlePointerMove = (event) => {
    pointerRef.current = { ...pointerRef.current, ...pointerToWorld(event) };
  };

  const handlePointerDown = (event) => {
    canvasRef.current.focus();
    const nextPointer = pointerToWorld(event);
    pointerRef.current = { ...nextPointer, down: true };
  };

  const handlePointerUp = () => {
    pointerRef.current.down = false;
  };

  return (
    <section className="game-layout">
      <div className="canvas-wrap topdown-wrap" ref={wrapperRef}>
        <canvas
          ref={canvasRef}
          width={VIEW_WIDTH}
          height={VIEW_HEIGHT}
          onPointerMove={handlePointerMove}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          aria-label="Frog top-down game canvas"
          tabIndex={0}
        />
      </div>

      <aside className="panel">
        <div className="area-name">
          <span>Mode</span>
          <strong>Top Down Pondland</strong>
        </div>
        <div className="stat-grid">
          <div><span>Flies</span><strong>{hud.score}</strong></div>
          <div><span>Pearls</span><strong>{hud.pearls}</strong></div>
          <div><span>Amber</span><strong>{hud.amber}</strong></div>
          <div><span>Wood</span><strong>{hud.wood}</strong></div>
          <div><span>Water</span><strong>{hud.waterBlocks}</strong></div>
          <div><span>Blocks</span><strong>{hud.blockTotal}</strong></div>
          <div><span>Found</span><strong>{hud.discovered}</strong></div>
          <div><span>Leap</span><strong>{hud.leapReady}</strong></div>
          <div><span>Speed</span><strong>{hud.speedLevel}</strong></div>
          <div><span>Spawn</span><strong>{hud.spawnLevel}</strong></div>
          <div><span>Pickaxe</span><strong>{hud.pickaxeName}</strong></div>
          <div><span>Place</span><strong>{hud.selectedPlaceable}</strong></div>
          <div><span>House</span><strong>{hud.houseLevel}</strong></div>
          <div><span>Checkpoint</span><strong>{hud.checkpointLabel}</strong></div>
          <div><span>Pads</span><strong>{hud.placedPads}</strong></div>
          <div><span>Cycle</span><strong>{hud.dayLabel}</strong></div>
          <div><span>Bird</span><strong>{hud.birdLabel}</strong></div>
          <div><span>Map</span><strong>{hud.mapSize}</strong></div>
        </div>
        {(hud.canInteract || hud.canMine || hud.canTeleport || hud.canBuildCheckpoint || hud.canBuildHouse || hud.canPlaceLilyPad || hud.canPlaceMaterial) && (
          <div className="action-grid">
            {hud.canInteract && (
              <button
                type="button"
                className="panel-button"
                onClick={handleInteract}
              >
                Use {hud.nearbyPlaceName}
              </button>
            )}
            {hud.canMine && (
              <button
                type="button"
                className="panel-button"
                onClick={() => {
                  mineNearbyWall(stateRef.current, soundOnRef.current);
                  syncTopDownProgress();
                  setHud(makeTopDownHud(stateRef.current));
                }}
              >
                Mine
              </button>
            )}
            {hud.canPlaceMaterial && (
              <>
                <button
                  type="button"
                  className="panel-button"
                  onClick={() => {
                    cycleTopDownPlaceable(stateRef.current, soundOnRef.current);
                    syncTopDownProgress();
                    setHud(makeTopDownHud(stateRef.current));
                  }}
                >
                  Select {hud.selectedPlaceable}
                </button>
                <button
                  type="button"
                  className="panel-button"
                  onClick={() => {
                    placeTopDownMaterial(stateRef.current, soundOnRef.current);
                    syncTopDownProgress();
                    setHud(makeTopDownHud(stateRef.current));
                  }}
                >
                  Place {hud.selectedPlaceable}
                </button>
              </>
            )}
            {hud.canBuildCheckpoint && (
              <button
                type="button"
                className="panel-button"
                onClick={() => {
                  buildTopDownCheckpoint(stateRef.current, soundOnRef.current);
                  syncTopDownProgress();
                  setHud(makeTopDownHud(stateRef.current));
                }}
              >
                Build Checkpoint
              </button>
            )}
            {hud.canTeleport && (
              <button
                type="button"
                className="panel-button"
                onClick={() => {
                  toggleTopDownTeleportMap(stateRef.current, soundOnRef.current);
                  syncTopDownProgress();
                  setHud(makeTopDownHud(stateRef.current));
                }}
              >
                {hud.teleportMenuOpen ? "Close Map" : "Teleport"}
              </button>
            )}
            {hud.canPlaceLilyPad && (
              <button
                type="button"
                className="panel-button"
                onClick={() => {
                  placeTopDownLilyPad(stateRef.current, soundOnRef.current);
                  syncTopDownProgress();
                  setHud(makeTopDownHud(stateRef.current));
                }}
              >
                Place Lily Pad
              </button>
            )}
            {hud.canBuildHouse && (
              <button
                type="button"
                className="panel-button"
                onClick={handleBuildHouse}
              >
                Build House
              </button>
            )}
          </div>
        )}
        {hud.teleportMenuOpen && (
          <div className="teleport-panel" aria-label="Checkpoint map">
            <div className="teleport-map">
              {hud.checkpoints.map((checkpoint) => (
                <button
                  key={checkpoint.id}
                  type="button"
                  className="teleport-dot"
                  style={{ left: `${checkpoint.mapX}%`, top: `${checkpoint.mapY}%` }}
                  onClick={() => {
                    teleportToTopDownCheckpoint(stateRef.current, checkpoint.id, soundOnRef.current);
                    syncTopDownProgress();
                    setHud(makeTopDownHud(stateRef.current));
                  }}
                  aria-label={`Teleport to ${checkpoint.label}`}
                  title={`Teleport to ${checkpoint.label}`}
                >
                  {checkpoint.index}
                </button>
              ))}
            </div>
            <div className="checkpoint-list">
              {hud.checkpoints.map((checkpoint) => (
                <button
                  key={checkpoint.id}
                  type="button"
                  className="panel-button"
                  onClick={() => {
                    teleportToTopDownCheckpoint(stateRef.current, checkpoint.id, soundOnRef.current);
                    syncTopDownProgress();
                    setHud(makeTopDownHud(stateRef.current));
                  }}
                >
                  {checkpoint.label} {checkpoint.coords}
                </button>
              ))}
            </div>
          </div>
        )}
        <p className="notice">{hud.notice}</p>
        <div className="control-list" aria-label="Top-down controls">
          <span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> Move</span>
          <span><kbd>Click</kbd> Tongue</span>
          <span><kbd>Space</kbd> Lily leap</span>
          {hud.canInteract && <span><kbd>E</kbd> Shop</span>}
          <span><kbd>B</kbd> Build checkpoint</span>
          <span><kbd>T</kbd> Checkpoint map</span>
          <span><kbd>L</kbd> Place lily pad</span>
          <span><kbd>C</kbd> Select resource</span>
          <span><kbd>V</kbd> Place resource</span>
          {!hud.hasHouse && <span><kbd>H</kbd> Build house</span>}
          <span><kbd>M</kbd> Mine</span>
          <span><kbd>X</kbd> Chop nearby tree</span>
        </div>
      </aside>
    </section>
  );
}

function makeTopDownHud(state) {
  const nearbyPlace = findNearbyTopDownPlace(state);
  const pickaxe = getCurrentPickaxe(state);
  const dayInfo = getDayInfo(state);
  const nextFurniture = FURNITURE_SHOP_ITEMS[state.furnitureShopIndex % FURNITURE_SHOP_ITEMS.length];
  const materials = state.materials ?? {};
  const blockTotal = (materials.clay ?? 0) + (materials.stone ?? 0) + (materials.crystal ?? 0);
  const selectedCount = materials[state.selectedPlaceable] ?? 0;
  return {
    score: state.score,
    pearls: state.pearls,
    amber: state.amber,
    wood: materials.wood ?? 0,
    waterBlocks: materials.water ?? 0,
    blockTotal,
    discovered: state.discoveredStructures.size,
    mapSize: `${Math.round(state.worldSize / 1000)}k x ${Math.round(state.worldSize / 1000)}k`,
    leapReady: state.leapTimer > 0 ? "Jumping" : state.lilyBoostTimer > 0 ? "Ready" : `Lv ${state.leapUpgrade}`,
    speedLevel: `Lv ${state.speedUpgrade ?? 0}`,
    spawnLevel: `Lv ${state.spawnRateUpgrade ?? 0}`,
    pickaxeName: pickaxe.tier > 0 ? pickaxe.name : "None",
    selectedPlaceable: `${state.selectedPlaceable ?? "wood"} ${selectedCount}`,
    houseLevel: state.houseLevel ? `Lv ${state.houseLevel}` : "None",
    checkpointLabel: state.checkpoints.length ? `${state.checkpoints.length}` : `${CHECKPOINT_COST.pearls}P ${CHECKPOINT_COST.amber}A`,
    hasCheckpoint: state.checkpoints.length > 0,
    checkpoints: state.checkpoints.map((checkpoint, index) => ({
      id: checkpoint.id,
      label: checkpoint.label,
      index: index + 1,
      coords: `${Math.round(checkpoint.x / 1000)}k, ${Math.round(checkpoint.y / 1000)}k`,
      mapX: Math.max(3, Math.min(97, (checkpoint.x / state.worldSize) * 100)),
      mapY: Math.max(3, Math.min(97, (checkpoint.y / state.worldSize) * 100)),
    })),
    teleportMenuOpen: state.teleportMenuOpen,
    placedPads: state.placedLilyPads.length,
    dayLabel: dayInfo.label,
    birdLabel: !dayInfo.isDay ? "Safe" : state.bird ? "Hide" : `${Math.ceil(state.birdCooldown)}s`,
    hasHouse: Boolean(state.playerHouse),
    notice: state.notice,
    canInteract: Boolean(nearbyPlace),
    nearbyPlaceName: nearbyPlace?.kind === "furniture" ? `${nearbyPlace.name} (${nextFurniture.name})` : nearbyPlace?.name ?? "Shop",
    canMine: Boolean(findNearbyMineableWall(state)),
    canPlaceMaterial: Object.values(materials).some((value) => value > 0),
    canBuildCheckpoint: state.pearls >= CHECKPOINT_COST.pearls && state.amber >= CHECKPOINT_COST.amber,
    canTeleport: state.checkpoints.length > 0,
    canPlaceLilyPad: state.score >= LILY_PAD_COST.flies,
    canBuildHouse: !state.playerHouse && state.score >= HOUSE_COST.flies && state.pearls >= HOUSE_COST.pearls && state.amber >= HOUSE_COST.amber,
  };
}
