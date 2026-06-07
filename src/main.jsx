import React from "react";
import { createRoot } from "react-dom/client";
import { Gamepad2, Hammer, Map, RotateCcw, Sparkles, Volume2, VolumeX } from "lucide-react";
import "./styles.css";
import { FrogGame } from "./FrogGame.jsx";
import { TopDownGame } from "./TopDownGame.jsx";

function App() {
  const [runId, setRunId] = React.useState(1);
  const [soundOn, setSoundOn] = React.useState(false);
  const [mode, setMode] = React.useState(null);

  if (!mode) {
    return (
      <main className="app-shell menu-shell">
        <ModeMenu
          onSelect={(nextMode) => {
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
          <p>{mode === "platformer" ? "Open-map platformer" : "Top-down pond builder"}</p>
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
        <FrogGame key={`platformer-${runId}`} soundOn={soundOn} />
      ) : (
        <TopDownGame key={`topdown-${runId}`} soundOn={soundOn} />
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
        <div className="menu-house" />
      </div>
      <div className="menu-copy">
        <div className="menu-kicker">
          <Sparkles size={18} />
          Random structures, currencies, builds, and big exploration
        </div>
        <h1>FroggyLand</h1>
        <p>Pick how you want to explore: side-scrolling caves and roads, or a top-down pond map where you decorate your little frog home.</p>
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
          <span>Roam a pondland, discover random huts and ruins, collect loot, and build decorations.</span>
        </button>
      </div>
    </section>
  );
}

createRoot(document.getElementById("root")).render(<App />);
