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

const HOUSE_PARTS = [
  { id: "window", name: "Round Window" },
  { id: "rug", name: "Leaf Rug" },
  { id: "lantern", name: "Glow Lantern" },
  { id: "trophy", name: "Parkour Trophy" },
];

const PARKOUR_GOAL_X = 1880;

const EMPTY_PROGRESS = {
  houseParts: {},
  placedInterior: {},
  rewards: {},
};

export function FrogGame(props) {
  if (props.entry === "houseInterior") {
    return <HouseInteriorEditor {...props} />;
  }
  return <PlatformerGame {...props} />;
}

function PlatformerGame({ soundOn, entry = "openMap", progress = EMPTY_PROGRESS, onProgressChange, onExitToTopDown }) {
  const isParkourEntry = entry.startsWith("parkour");
  const canvasRef = React.useRef(null);
  const wrapperRef = React.useRef(null);
  const progressRef = React.useRef(progress);
  const stateRef = React.useRef(null);
  if (!stateRef.current) {
    stateRef.current = createInitialState();
    if (isParkourEntry) {
      stateRef.current.notice = "Parkour House: clear the short section to earn one furniture part.";
      stateRef.current.noticeTimer = 4;
    }
  }
  const pressedRef = React.useRef(new Set());
  const pointerRef = React.useRef({ x: VIEW_WIDTH / 2, y: VIEW_HEIGHT / 2, down: false });
  const soundOnRef = React.useRef(soundOn);
  const [hud, setHud] = React.useState(() => makeHud(stateRef.current, entry, progress));

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
      if (isParkourEntry) {
        grantParkourReward(stateRef.current, entry, progressRef.current, onProgressChange);
      }
      drawGame(context, stateRef.current);

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
    return () => cancelAnimationFrame(frameId);
  }, [entry, onProgressChange]);

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
        {(hud.canTrade || hud.canPlace || hud.canReturnTopDown) && (
          <div className="action-grid">
            {hud.canReturnTopDown && (
              <button
                type="button"
                className="panel-button"
                onClick={onExitToTopDown}
              >
                Return Top Down
              </button>
            )}
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
        <p className="notice">{hud.nearbyNpcName ? `Near ${hud.nearbyNpcName}. ${hud.notice}` : hud.notice}</p>
        <div className="control-list" aria-label="Controls">
          {!hud.tutorialComplete && <span><kbd>A</kbd><kbd>D</kbd> Move</span>}
          {!hud.tutorialComplete && <span><kbd>W</kbd><kbd>Space</kbd> Jump</span>}
          <span><kbd>Click</kbd> Tongue</span>
          {hud.canTrade && <span><kbd>E</kbd> Trade</span>}
          {hud.canPlace && <span><kbd>P</kbd> Place</span>}
          {hud.canReturnTopDown && <span><kbd>Modes</kbd> Return</span>}
        </div>
      </aside>
    </section>
  );
}

function makeHud(state, entry = "openMap", progress = EMPTY_PROGRESS) {
  const isParkourEntry = entry.startsWith("parkour");
  const nearbyNpc = findNearbyNpc(state);
  const partTotal = Object.values(progress.houseParts ?? {}).reduce((total, value) => total + value, 0);
  return {
    regionName: isParkourEntry ? "Parkour House" : state.regionName,
    score: state.score,
    lilyPads: state.lilyPads,
    pearls: state.pearls,
    amber: state.amber,
    relics: state.collectedRelics.size,
    totalRelics: WORLD.relics.length,
    placementMode: state.placementMode,
    nearbyNpcName: nearbyNpc?.name ?? null,
    canTrade: Boolean(nearbyNpc),
    canPlace: state.lilyPads > 0 || state.placementMode,
    canReturnTopDown: entry !== "openMap",
    tutorialComplete: state.tutorialComplete,
    tongueRange: state.tongueRangeBonus > 0 ? `+${state.tongueRangeBonus}` : "Base",
    partTotal,
    notice: state.notice,
  };
}

function grantParkourReward(state, entry, progress, onProgressChange) {
  const reward = getParkourReward(entry);
  if (state.parkourRewarded || state.frog.x < PARKOUR_GOAL_X || progress.rewards?.[reward.id]) {
    return;
  }
  state.parkourRewarded = true;
  onProgressChange?.((current) => ({
    houseParts: {
      [reward.part]: (current.houseParts?.[reward.part] ?? 0) + reward.amount,
    },
    rewards: {
      [reward.id]: true,
    },
  }));
  state.notice = `Platformer reward earned: ${reward.name}.`;
  state.noticeTimer = 3.4;
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
