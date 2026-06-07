import React from "react";
import { createRoot } from "react-dom/client";
import { RotateCcw, Volume2, VolumeX } from "lucide-react";
import "./styles.css";
import { FrogGame } from "./FrogGame.jsx";

function App() {
  const [runId, setRunId] = React.useState(1);
  const [soundOn, setSoundOn] = React.useState(false);

  return (
    <main className="app-shell">
      <section className="topbar" aria-label="Game controls">
        <div>
          <h1>FroggyLand</h1>
          <p>Prototype platformer</p>
        </div>
        <div className="button-row">
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

      <FrogGame key={runId} soundOn={soundOn} />
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
