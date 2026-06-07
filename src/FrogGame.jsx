import React from "react";
import { MAX_DT, TARGET_FRAME_MS, VIEW_HEIGHT, VIEW_WIDTH, keys } from "./game/constants.js";
import { BUILD_CATALOG, buildCurrencyLabel } from "./game/building.js";
import { WORLD } from "./game/world.js";
import { drawGame } from "./game/renderer.js";
import {
  buyBuildItem,
  cancelBuildMode,
  createInitialState,
  findNearbyNpc,
  placeBuildItem,
  placeLilyPad,
  selectBuildItem,
  startTongue,
  togglePlacementMode,
  tradeWithNearbyNpc,
  updateGame,
} from "./game/simulation.js";

export function FrogGame({ soundOn }) {
  const canvasRef = React.useRef(null);
  const wrapperRef = React.useRef(null);
  const stateRef = React.useRef(createInitialState());
  const pressedRef = React.useRef(new Set());
  const pointerRef = React.useRef({ x: VIEW_WIDTH / 2, y: VIEW_HEIGHT / 2, down: false });
  const soundOnRef = React.useRef(soundOn);
  const [hud, setHud] = React.useState(() => makeHud(stateRef.current));

  React.useEffect(() => {
    soundOnRef.current = soundOn;
  }, [soundOn]);

  React.useEffect(() => {
    const onKeyDown = (event) => {
      if (event.code === "KeyE") {
        event.preventDefault();
        if (!event.repeat) tradeWithNearbyNpc(stateRef.current, soundOnRef.current);
        return;
      }
      if (event.code === "KeyP") {
        event.preventDefault();
        if (!event.repeat) togglePlacementMode(stateRef.current);
        return;
      }
      if (event.code === "Escape") {
        stateRef.current.placementMode = false;
        cancelBuildMode(stateRef.current);
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
  }, []);

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
      drawGame(context, stateRef.current);

      hudTimer += dt;
      if (hudTimer > 0.2) {
        hudTimer = 0;
        const nextHud = makeHud(stateRef.current);
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
  }, []);

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
    if (stateRef.current.buildMode) {
      placeBuildItem(stateRef.current, nextPointer, soundOnRef.current);
      return;
    }
    startTongue(stateRef.current, nextPointer);
  };

  const handlePointerUp = () => {
    pointerRef.current.down = false;
  };

  return (
    <section className="game-layout">
      <div className="canvas-wrap" ref={wrapperRef}>
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

      <aside className="panel">
        <div className="area-name">
          <span>Area</span>
          <strong>{hud.regionName}</strong>
        </div>
        <div className="stat-grid">
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
            <span>Nearby</span>
            <strong>{hud.flyCount}</strong>
          </div>
          <div>
            <span>Shrine</span>
            <strong>{hud.reachedGoal ? "Found" : "Open"}</strong>
          </div>
          <div>
            <span>Check</span>
            <strong>{hud.checkpointName}</strong>
          </div>
          <div>
            <span>Mode</span>
            <strong>{hud.placementMode ? "Place" : "Tongue"}</strong>
          </div>
          <div>
            <span>Cooldown</span>
            <strong>{hud.tongueCooldown}</strong>
          </div>
          <div>
            <span>Range</span>
            <strong>{hud.tongueRange}</strong>
          </div>
        </div>
        {(hud.canTrade || hud.canPlace) && (
          <div className="action-grid">
            {hud.canTrade && (
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
        <div className="build-shop" aria-label="Build shop">
          <div className="shop-title">
            <span>Home</span>
            <strong>{hud.placedBuilds} placed</strong>
          </div>
          <div className="build-grid">
            {BUILD_CATALOG.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`build-button ${hud.buildMode === item.id ? "is-active" : ""}`}
                onClick={() => {
                  if (hud.buildInventory[item.id] > 0) {
                    selectBuildItem(stateRef.current, item.id);
                  } else {
                    buyBuildItem(stateRef.current, item.id, soundOnRef.current);
                  }
                  setHud(makeHud(stateRef.current));
                }}
              >
                <span>{item.name}</span>
                <strong>
                  {hud.buildInventory[item.id] > 0
                    ? `${hud.buildInventory[item.id]} owned`
                    : `${item.cost} ${buildCurrencyLabel(item.currency)}`}
                </strong>
              </button>
            ))}
          </div>
          {hud.buildMode && (
            <button
              type="button"
              className="panel-button"
              onClick={() => {
                cancelBuildMode(stateRef.current);
                setHud(makeHud(stateRef.current));
              }}
            >
              Stop Building
            </button>
          )}
        </div>
        <p className="notice">{hud.nearbyNpcName ? `Near ${hud.nearbyNpcName}. ${hud.notice}` : hud.notice}</p>
        <div className="control-list" aria-label="Controls">
          {!hud.tutorialComplete && <span><kbd>A</kbd><kbd>D</kbd> Move</span>}
          {!hud.tutorialComplete && <span><kbd>W</kbd><kbd>Space</kbd> Jump</span>}
          <span><kbd>Click</kbd> Tongue</span>
          {hud.buildMode && <span><kbd>Click</kbd> Place {hud.buildName}</span>}
          {hud.canTrade && <span><kbd>E</kbd> Trade</span>}
          {hud.canPlace && <span><kbd>P</kbd> Place</span>}
        </div>
      </aside>
    </section>
  );
}

function makeHud(state) {
  const nearbyNpc = findNearbyNpc(state);
  return {
    regionName: state.regionName,
    score: state.score,
    lilyPads: state.lilyPads,
    pearls: state.pearls,
    amber: state.amber,
    relics: state.collectedRelics.size,
    totalRelics: WORLD.relics.length,
    flyCount: state.flies.length,
    reachedGoal: state.reachedGoal,
    checkpointName: state.activeCheckpoint ? "On" : "Off",
    placementMode: state.placementMode,
    buildMode: state.buildMode,
    buildName: BUILD_CATALOG.find((item) => item.id === state.buildMode)?.name ?? "Build",
    buildInventory: state.buildInventory,
    placedBuilds: state.placedBuilds.length,
    nearbyNpcName: nearbyNpc?.name ?? null,
    canTrade: Boolean(nearbyNpc),
    canPlace: state.lilyPads > 0 || state.placementMode,
    tutorialComplete: state.tutorialComplete,
    tongueCooldown: state.tongueCooldown > 0 ? `${Math.ceil(state.tongueCooldown * 10) / 10}s` : "Ready",
    tongueRange: state.tongueRangeBonus > 0 ? `+${state.tongueRangeBonus}` : "Base",
    notice: state.notice,
  };
}
