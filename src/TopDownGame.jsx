import React from "react";
import { MAX_DT, TARGET_FRAME_MS, VIEW_HEIGHT, VIEW_WIDTH, keys } from "./game/constants.js";
import { BUILD_CATALOG, buildCurrencyLabel } from "./game/building.js";
import {
  buyTopDownBuildItem,
  cancelTopDownBuild,
  createTopDownState,
  drawTopDownGame,
  findNearbyTopDownPlace,
  interactTopDownPlace,
  placeTopDownBuildItem,
  selectTopDownBuildItem,
  updateTopDownGame,
} from "./game/topDownMode.js";

export function TopDownGame({ soundOn }) {
  const canvasRef = React.useRef(null);
  const wrapperRef = React.useRef(null);
  const stateRef = React.useRef(createTopDownState());
  const pressedRef = React.useRef(new Set());
  const pointerRef = React.useRef({ x: VIEW_WIDTH / 2, y: VIEW_HEIGHT / 2, down: false });
  const soundOnRef = React.useRef(soundOn);
  const [hud, setHud] = React.useState(() => makeTopDownHud(stateRef.current));

  React.useEffect(() => {
    soundOnRef.current = soundOn;
  }, [soundOn]);

  React.useEffect(() => {
    const onKeyDown = (event) => {
      if (event.code === "Escape") {
        cancelTopDownBuild(stateRef.current);
        return;
      }
      if (event.code === "KeyE") {
        event.preventDefault();
        if (!event.repeat) {
          interactTopDownPlace(stateRef.current, soundOnRef.current);
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
      updateTopDownGame(stateRef.current, pressedRef.current, pointerRef.current, dt, soundOnRef.current);
      drawTopDownGame(context, stateRef.current);

      hudTimer += dt;
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
  }, []);

  const pointerToWorld = React.useCallback((event) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * VIEW_WIDTH + stateRef.current.cameraX,
      y: ((event.clientY - rect.top) / rect.height) * VIEW_HEIGHT + stateRef.current.cameraY,
    };
  }, []);

  const handlePointerMove = (event) => {
    pointerRef.current = { ...pointerRef.current, ...pointerToWorld(event) };
  };

  const handlePointerDown = (event) => {
    canvasRef.current.focus();
    const nextPointer = pointerToWorld(event);
    pointerRef.current = { ...nextPointer, down: true };
    if (stateRef.current.buildMode) {
      placeTopDownBuildItem(stateRef.current, nextPointer, soundOnRef.current);
      setHud(makeTopDownHud(stateRef.current));
    }
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
          <div><span>Found</span><strong>{hud.discovered}</strong></div>
          <div><span>Home</span><strong>{hud.placedBuilds}</strong></div>
          <div><span>Mode</span><strong>{hud.buildMode ? "Build" : "Explore"}</strong></div>
          <div><span>Leap</span><strong>{hud.leapReady}</strong></div>
          <div><span>Map</span><strong>{hud.mapSize}</strong></div>
        </div>
        {hud.canInteract && (
          <div className="action-grid">
            <button
              type="button"
              className="panel-button"
              onClick={() => {
                interactTopDownPlace(stateRef.current, soundOnRef.current);
                setHud(makeTopDownHud(stateRef.current));
              }}
            >
              Use {hud.nearbyPlaceName}
            </button>
          </div>
        )}
        <div className="build-shop" aria-label="Top-down build shop">
          <div className="shop-title">
            <span>Decorate</span>
            <strong>{hud.buildMode ? hud.buildName : "Creative"}</strong>
          </div>
          <div className="build-grid">
            {BUILD_CATALOG.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`build-button ${hud.buildMode === item.id ? "is-active" : ""}`}
                onClick={() => {
                  if (hud.buildInventory[item.id] > 0) {
                    selectTopDownBuildItem(stateRef.current, item.id);
                  } else {
                    buyTopDownBuildItem(stateRef.current, item.id, soundOnRef.current);
                  }
                  setHud(makeTopDownHud(stateRef.current));
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
                cancelTopDownBuild(stateRef.current);
                setHud(makeTopDownHud(stateRef.current));
              }}
            >
              Stop Building
            </button>
          )}
        </div>
        <p className="notice">{hud.notice}</p>
        <div className="control-list" aria-label="Top-down controls">
          <span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> Move</span>
          <span><kbd>Space</kbd> Lily leap</span>
          {hud.canInteract && <span><kbd>E</kbd> Shop</span>}
          {hud.buildMode && <span><kbd>Click</kbd> Place {hud.buildName}</span>}
        </div>
      </aside>
    </section>
  );
}

function makeTopDownHud(state) {
  const nearbyPlace = findNearbyTopDownPlace(state);
  return {
    score: state.score,
    pearls: state.pearls,
    amber: state.amber,
    discovered: state.discoveredStructures.size,
    mapSize: `${Math.round(state.worldSize / 1000)}k x ${Math.round(state.worldSize / 1000)}k`,
    leapReady: state.leapTimer > 0 ? "Jumping" : state.lilyBoostTimer > 0 ? "Ready" : `Lv ${state.leapUpgrade}`,
    buildInventory: state.buildInventory,
    buildMode: state.buildMode,
    buildName: BUILD_CATALOG.find((item) => item.id === state.buildMode)?.name ?? "Build",
    placedBuilds: state.placedBuilds.length,
    notice: state.notice,
    canInteract: Boolean(nearbyPlace),
    nearbyPlaceName: nearbyPlace?.name ?? "Shop",
  };
}
