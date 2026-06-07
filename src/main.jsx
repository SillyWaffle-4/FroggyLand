import React from "react";
import { createRoot } from "react-dom/client";
import { Car, Eye, EyeOff, Hammer, Map, Play, RotateCcw, Sparkles, Trees, Volume2, VolumeX, Waves } from "lucide-react";
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
        <div className="menu-cloud cloud-a" />
        <div className="menu-cloud cloud-b" />
        <div className="menu-ridge ridge-a" />
        <div className="menu-ridge ridge-b" />
        <div className="menu-city">
          <span />
          <span />
          <span />
        </div>
        <div className="menu-road" />
        <div className="menu-car car-a" />
        <div className="menu-car car-b" />
        <div className="menu-pond" />
        <div className="menu-frog">
          <span />
        </div>
      </div>
      <div className="menu-copy">
        <div className="menu-kicker">
          <Sparkles size={18} />
          Open-map pond adventure
        </div>
        <h1>FroggyLand</h1>
        <p>Explore pondland, cross city roads, hide from daytime birds, build checkpoints, and find parkour houses with rewards inside.</p>
        <div className="menu-feature-row" aria-label="Game features">
          <span><Map size={16} />300k map</span>
          <span><Car size={16} />city traffic</span>
          <span><Trees size={16} />urban parks</span>
          <span><Waves size={16} />safe water</span>
        </div>
      </div>
      <div className="mode-card-grid">
        <button className="mode-card topdown-card" type="button" onClick={() => onSelect("topdown")}>
          <span className="mode-icon"><Play size={28} /></span>
          <strong>Start Exploring</strong>
          <span>Top-down pondland begins near the city, with shops, parkour houses, lily leaps, pickaxes, and traffic hazards.</span>
          <span className="mode-card-action">Play now <Hammer size={16} /></span>
        </button>
      </div>
    </section>
  );
}

createRoot(document.getElementById("root")).render(<App />);
