import React from "react";
import { createRoot } from "react-dom/client";
import { Car, Eye, EyeOff, Hammer, Map, Play, RotateCcw, Settings, Sparkles, Trees, Trophy, Volume2, VolumeX, Waves } from "lucide-react";
import "./styles.css";
import { FrogGame } from "./FrogGame.jsx";
import { TopDownGame } from "./TopDownGame.jsx";

const STARTING_PROGRESS = {
  house: null,
  topDown: {
    score: 8,
    pearls: 3,
    amber: 3,
    materials: {
      wood: 0,
      clay: 0,
      stone: 0,
      crystal: 0,
      water: 0,
    },
    selectedPlaceable: "wood",
    placedMaterials: [],
    minedWalls: [],
    choppedTrees: [],
    pickaxeTier: 0,
    leapUpgrade: 0,
    speedUpgrade: 0,
    spawnRateUpgrade: 0,
    houseLevel: 0,
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
  achievements: {},
};

const ACHIEVEMENTS = [
  { id: "tongue-snack", name: "Tongue Snack", test: (progress) => (progress.topDown?.score ?? 0) >= 12 },
  { id: "fly-feast", name: "Fly Feast", test: (progress) => (progress.topDown?.score ?? 0) >= 40 },
  { id: "first-home", name: "First Home", test: (progress) => Boolean(progress.house) },
  { id: "timber", name: "Timber", test: (progress) => (progress.topDown?.materials?.wood ?? 0) > 0 || (progress.topDown?.choppedTrees?.length ?? 0) > 0 },
  { id: "forest-frog", name: "Forest Frog", test: (progress) => (progress.topDown?.choppedTrees?.length ?? 0) >= 8 },
  { id: "water-miner", name: "Water Miner", test: (progress) => (progress.topDown?.materials?.water ?? 0) > 0 },
  { id: "bridge-builder", name: "Bridge Builder", test: (progress) => (progress.topDown?.placedMaterials?.length ?? 0) > 0 },
  { id: "pond-maker", name: "Pond Maker", test: (progress) => (progress.topDown?.placedMaterials ?? []).some((item) => item.material === "water") },
  { id: "lily-trail", name: "Lily Trail", test: (progress) => (progress.topDown?.placedLilyPads?.length ?? 0) >= 4 },
  { id: "parkour-part", name: "Parkour Part", test: (progress) => Object.values(progress.houseParts ?? {}).some((value) => value > 0) },
  { id: "decorator", name: "Decorator", test: (progress) => Object.values(progress.placedInterior ?? {}).reduce((sum, value) => sum + value, 0) >= 4 },
  { id: "checkpoint-maker", name: "Checkpoint Maker", test: (progress) => (progress.topDown?.checkpoints?.length ?? 0) > 0 },
  { id: "swift-frog", name: "Swift Frog", test: (progress) => (progress.topDown?.speedUpgrade ?? 0) > 0 },
  { id: "speedster", name: "Speedster", test: (progress) => (progress.topDown?.speedUpgrade ?? 0) >= 3 },
  { id: "big-leaper", name: "Big Leaper", test: (progress) => (progress.topDown?.leapUpgrade ?? 0) >= 3 },
  { id: "buzz-boom", name: "Buzz Boom", test: (progress) => (progress.topDown?.spawnRateUpgrade ?? 0) > 0 },
  { id: "shop-regular", name: "Shop Regular", test: (progress) => (progress.topDown?.pickaxeTier ?? 0) >= 1 && (progress.topDown?.speedUpgrade ?? 0) >= 1 },
  { id: "second-floor", name: "Second Floor", test: (progress) => (progress.house?.level ?? progress.topDown?.houseLevel ?? 0) >= 10 },
  { id: "full-house", name: "Full House", test: (progress) => (progress.house?.level ?? progress.topDown?.houseLevel ?? 0) >= 20 },
];

const GRAPHICS_OPTIONS = [
  { id: "low", name: "Low", label: "Normal Art" },
  { id: "max", name: "Max", label: "Pixel Art" },
];

function loadGraphicsQuality() {
  try {
    const saved = localStorage.getItem("froggyland-graphics-quality");
    return GRAPHICS_OPTIONS.some((option) => option.id === saved) ? saved : "low";
  } catch {
    return "low";
  }
}

function loadProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem("froggyland-progress") ?? "null");
    if (!saved || typeof saved !== "object") return STARTING_PROGRESS;
    return {
      ...STARTING_PROGRESS,
      ...saved,
      house: saved.house ? { ...saved.house, level: saved.house.level ?? saved.topDown?.houseLevel ?? 1 } : null,
      topDown: {
        ...STARTING_PROGRESS.topDown,
        ...(saved.topDown ?? {}),
        materials: { ...STARTING_PROGRESS.topDown.materials, ...(saved.topDown?.materials ?? {}) },
      },
      houseParts: { ...STARTING_PROGRESS.houseParts, ...(saved.houseParts ?? {}) },
      placedInterior: { ...STARTING_PROGRESS.placedInterior, ...(saved.placedInterior ?? {}) },
      rewards: { ...STARTING_PROGRESS.rewards, ...(saved.rewards ?? {}) },
      achievements: { ...STARTING_PROGRESS.achievements, ...(saved.achievements ?? {}) },
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
  const [graphicsQuality, setGraphicsQuality] = React.useState(loadGraphicsQuality);

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
        achievements: { ...current.achievements, ...(next.achievements ?? {}) },
      };
    });
  }, []);

  React.useEffect(() => {
    const newlyUnlocked = ACHIEVEMENTS.filter((achievement) => !progress.achievements?.[achievement.id] && achievement.test(progress));
    if (!newlyUnlocked.length) return;
    setProgress((current) => ({
      ...current,
      achievements: {
        ...current.achievements,
        ...Object.fromEntries(newlyUnlocked.map((achievement) => [achievement.id, true])),
      },
    }));
  }, [progress]);

  React.useEffect(() => {
    localStorage.setItem("froggyland-progress", JSON.stringify(progress));
  }, [progress]);

  React.useEffect(() => {
    localStorage.setItem("froggyland-graphics-quality", graphicsQuality);
  }, [graphicsQuality]);

  const enterPlatformer = React.useCallback((entry = "openMap") => {
    setPlatformerEntry(entry);
    setMode("platformer");
    setRunId((value) => value + 1);
  }, []);

  if (mode === "settings") {
    return (
      <main className={`app-shell menu-shell quality-${graphicsQuality}`}>
        <SettingsPage
          graphicsQuality={graphicsQuality}
          onGraphicsQualityChange={setGraphicsQuality}
          onBack={() => setMode(null)}
        />
      </main>
    );
  }

  if (!mode) {
    return (
      <main className={`app-shell menu-shell quality-${graphicsQuality}`}>
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
    <main className={`app-shell play-shell quality-${graphicsQuality} ${chromeHidden ? "chrome-hidden" : ""}`}>
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
              onClick={() => setMode("settings")}
              aria-label="Open settings"
              title="Settings"
            >
              <Settings size={20} />
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
      {!chromeHidden && <AchievementStrip progress={progress} />}
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
          graphicsQuality={graphicsQuality}
          onProgressChange={updateProgress}
          onExitToTopDown={() => setMode("topdown")}
        />
      ) : (
        <TopDownGame
          key={`topdown-${runId}`}
          soundOn={soundOn}
          progress={progress}
          graphicsQuality={graphicsQuality}
          onProgressChange={updateProgress}
          onEnterPlatformer={enterPlatformer}
        />
      )}
    </main>
  );
}

function AchievementStrip({ progress }) {
  const unlocked = ACHIEVEMENTS.filter((achievement) => progress.achievements?.[achievement.id]);
  const recent = unlocked.slice(-4);
  const next = ACHIEVEMENTS.find((achievement) => !progress.achievements?.[achievement.id]);
  return (
    <section className="achievement-strip" aria-label="Achievements">
      <span className="achievement-total"><Trophy size={15} />{unlocked.length}/{ACHIEVEMENTS.length}</span>
      {recent.length ? recent.map((achievement) => (
        <span key={achievement.id} className="achievement-pill">{achievement.name}</span>
      )) : (
        <span className="achievement-pill">No achievements yet</span>
      )}
      {next && <span className="achievement-pill achievement-next">Next: {next.name}</span>}
    </section>
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
        <button className="mode-card settings-card" type="button" onClick={() => onSelect("settings")}>
          <span className="mode-icon"><Settings size={28} /></span>
          <strong>Settings</strong>
          <span>Graphics quality preferences.</span>
          <span className="mode-card-action">Open <Settings size={16} /></span>
        </button>
      </div>
    </section>
  );
}

function SettingsPage({ graphicsQuality, onGraphicsQualityChange, onBack }) {
  return (
    <section className="settings-page" aria-label="Settings">
      <div className="settings-copy">
        <div className="menu-kicker">
          <Settings size={18} />
          Settings
        </div>
        <h1>Settings</h1>
      </div>
      <div className="settings-panel">
        <div className="settings-row">
          <div>
            <span>Graphics Quality</span>
            <strong>{GRAPHICS_OPTIONS.find((option) => option.id === graphicsQuality)?.label ?? "Normal Art"}</strong>
          </div>
          <div className="segmented-control" role="group" aria-label="Graphics quality">
            {GRAPHICS_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={graphicsQuality === option.id ? "selected" : ""}
                onClick={() => onGraphicsQualityChange(option.id)}
              >
                <span>{option.name}</span>
                <strong>{option.label}</strong>
              </button>
            ))}
          </div>
        </div>
        <button className="mode-chip settings-back" type="button" onClick={onBack}>
          <Map size={17} />
          Modes
        </button>
      </div>
    </section>
  );
}

createRoot(document.getElementById("root")).render(<App />);
