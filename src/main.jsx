import React from "react";
import { createRoot } from "react-dom/client";
import { Eye, EyeOff, Hammer, Map, RotateCcw, Sparkles, Volume2, VolumeX } from "lucide-react";
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
  const [chromeHidden, setChromeHidden] = React.useState(false);

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
    <main className={`app-shell play-shell ${chromeHidden ? "chrome-hidden" : ""}`}>
      {!chromeHidden && (
        <section className="topbar" aria-label="Game controls">
          <div>
            <h1>FroggyLand</h1>
            <p>
              {mode === "platformer"
                ? platformerEntry === "houseInterior" ? "House interior editor" : platformerEntry === "shop" ? "Market Hall platformer" : platformerEntry.startsWith("parkour") ? "Parkour house challenge" : "Open-map platformer"
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
            <button
              className="icon-button"
              type="button"
              onClick={() => setChromeHidden(true)}
              aria-label="Hide top menu"
              title="Hide top menu"
            >
              <EyeOff size={20} />
            </button>
          </div>
        </section>
      )}
      {chromeHidden && (
        <button
          type="button"
          className="show-chrome-button"
          onClick={() => setChromeHidden(false)}
          aria-label="Show top menu"
          title="Show top menu"
        >
          <Eye size={20} />
        </button>
      )}

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
          Top-down exploration, parkour houses, shops, pickaxes, and big rewards
        </div>
        <h1>FroggyLand</h1>
        <p>Explore a huge pond map, build checkpoints, enter parkour houses, survive daytime birds, and unlock platformer rooms through the world.</p>
      </div>
      <div className="mode-card-grid">
        <button className="mode-card topdown-card" type="button" onClick={() => onSelect("topdown")}>
          <span className="mode-icon"><Hammer size={28} /></span>
          <strong>Play FroggyLand</strong>
          <span>Start in top-down pondland, then find parkour houses and Market Hall platformer rooms inside the map.</span>
        </button>
      </div>
    </section>
  );
}

createRoot(document.getElementById("root")).render(<App />);
