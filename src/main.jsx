import React from "react";
import { createRoot } from "react-dom/client";
import { Gamepad2, Hammer, Map, RotateCcw, Sparkles, Volume2, VolumeX } from "lucide-react";
import "./styles.css";
import { FrogGame } from "./FrogGame.jsx";
import { TopDownGame } from "./TopDownGame.jsx";

const STARTING_PROGRESS = {
  house: null,
  topDown: {
    score: 8,
    pearls: 3,
    amber: 3,
    pickaxeTier: 0,
    leapUpgrade: 0,
    checkpoints: [],
    placedLilyPads: [],
    furnitureShopIndex: 0,
  },
  houseParts: {
    window: 0,
    rug: 0,
    lantern: 0,
    trophy: 0,
  },
  placedInterior: {
    window: 0,
    rug: 0,
    lantern: 0,
    trophy: 0,
  },
  rewards: {},
};

function loadProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem("froggyland-progress") ?? "null");
    if (!saved || typeof saved !== "object") return STARTING_PROGRESS;
    return {
      ...STARTING_PROGRESS,
      ...saved,
      topDown: { ...STARTING_PROGRESS.topDown, ...(saved.topDown ?? {}) },
      houseParts: { ...STARTING_PROGRESS.houseParts, ...(saved.houseParts ?? {}) },
      placedInterior: { ...STARTING_PROGRESS.placedInterior, ...(saved.placedInterior ?? {}) },
      rewards: { ...STARTING_PROGRESS.rewards, ...(saved.rewards ?? {}) },
    };
  } catch {
    return STARTING_PROGRESS;
  }
}

function App() {
  const [runId, setRunId] = React.useState(1);
  const [soundOn, setSoundOn] = React.useState(false);
  const [mode, setMode] = React.useState(null);
  const [platformerEntry, setPlatformerEntry] = React.useState("openMap");
  const [progress, setProgress] = React.useState(loadProgress);

  const updateProgress = React.useCallback((updater) => {
    setProgress((current) => {
      const next = typeof updater === "function" ? updater(current) : updater;
      return {
        ...current,
        ...next,
        topDown: { ...current.topDown, ...(next.topDown ?? {}) },
        houseParts: { ...current.houseParts, ...(next.houseParts ?? {}) },
        placedInterior: { ...current.placedInterior, ...(next.placedInterior ?? {}) },
        rewards: { ...current.rewards, ...(next.rewards ?? {}) },
      };
    });
  }, []);

  React.useEffect(() => {
    localStorage.setItem("froggyland-progress", JSON.stringify(progress));
  }, [progress]);

  const enterPlatformer = React.useCallback((entry = "openMap") => {
    setPlatformerEntry(entry);
    setMode("platformer");
    setRunId((value) => value + 1);
  }, []);

  if (!mode) {
    return (
      <main className="app-shell menu-shell">
        <ModeMenu
          onSelect={(nextMode) => {
            if (nextMode === "platformer") {
              setPlatformerEntry("openMap");
            }
            setMode(nextMode);
            setRunId((value) => value + 1);
          }}
        />
      </main>
    );
  }

  return (
    <main className="app-shell play-shell">
      <section className="topbar" aria-label="Game controls">
        <div>
          <h1>FroggyLand</h1>
          <p>
            {mode === "platformer"
              ? platformerEntry === "houseInterior" ? "House interior editor" : platformerEntry === "parkourVillage" ? "Parkour village challenge" : "Open-map platformer"
              : "Top-down pond explorer"}
          </p>
        </div>
        <div className="button-row">
          <button
            className="mode-chip"
            type="button"
            onClick={() => setMode(null)}
          >
            <Map size={17} />
            Modes
          </button>
          <button
            className="icon-button"
            type="button"
            onClick={() => setRunId((value) => value + 1)}
            aria-label="Restart run"
            title="Restart run"
          >
            <RotateCcw size={20} />
          </button>
          <button
            className="icon-button"
            type="button"
            onClick={() => setSoundOn((value) => !value)}
            aria-label={soundOn ? "Mute placeholder sound" : "Unmute placeholder sound"}
            title={soundOn ? "Mute placeholder sound" : "Unmute placeholder sound"}
          >
            {soundOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
        </div>
      </section>

      {mode === "platformer" ? (
        <FrogGame
          key={`platformer-${runId}-${platformerEntry}`}
          soundOn={soundOn}
          entry={platformerEntry}
          progress={progress}
          onProgressChange={updateProgress}
          onExitToTopDown={() => setMode("topdown")}
        />
      ) : (
        <TopDownGame
          key={`topdown-${runId}`}
          soundOn={soundOn}
          progress={progress}
          onProgressChange={updateProgress}
          onEnterPlatformer={enterPlatformer}
        />
      )}
    </main>
  );
}

function ModeMenu({ onSelect }) {
  return (
    <section className="mode-menu" aria-label="Choose game mode">
      <div className="menu-art" aria-hidden="true">
        <div className="menu-sun" />
        <div className="menu-ridge ridge-a" />
        <div className="menu-ridge ridge-b" />
        <div className="menu-road" />
        <div className="menu-pond" />
        <div className="menu-frog">
          <span />
        </div>
      </div>
      <div className="menu-copy">
        <div className="menu-kicker">
          <Sparkles size={18} />
          Random structures, currencies, shops, pickaxes, and big exploration
        </div>
        <h1>FroggyLand</h1>
        <p>Pick how you want to explore: side-scrolling caves and roads, or a huge top-down pond map with shops, water, walls, pickaxes, and lily-pad leaps.</p>
      </div>
      <div className="mode-card-grid">
        <button className="mode-card platform-card" type="button" onClick={() => onSelect("platformer")}>
          <span className="mode-icon"><Gamepad2 size={28} /></span>
          <strong>Platformer Mode</strong>
          <span>Open map, caves, cars, lily pad gates, currencies, relics, and generated structures.</span>
        </button>
        <button className="mode-card topdown-card" type="button" onClick={() => onSelect("topdown")}>
          <span className="mode-icon"><Hammer size={28} /></span>
          <strong>Top Down Mode</strong>
          <span>Roam a scrolling pondland, discover random huts and ruins, collect loot, buy pickaxes, and mine walls.</span>
        </button>
      </div>
    </section>
  );
}

createRoot(document.getElementById("root")).render(<App />);
