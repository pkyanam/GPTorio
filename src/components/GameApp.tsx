"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useConvexAuth } from "convex/react";
import {
  SignInButton,
  SignOutButton,
  UserButton,
  useAuth
} from "@clerk/nextjs";
import { api } from "../../convex/_generated/api";
import GameCanvas from "./GameCanvas";
import {
  createInitialState,
  stepGame,
  placeBuilding,
  nextDir,
  normalizeState,
  BUILD_COSTS,
  canAffordBuild,
  Tool,
  Direction,
  GameState
} from "../lib/game";

type GameLayoutProps = {
  gameState: GameState | null;
  activeTool: Tool;
  activeDir: Direction;
  running: boolean;
  saveEnabled: boolean;
  saveStatus: string;
  saveNote?: string | null;
  lastSavedLabel: string;
  authControls: React.ReactNode;
  buildNotice?: string | null;
  onSelectTool: (tool: Tool) => void;
  onToggleRun: () => void;
  onSave: () => void;
  onReset: () => void;
  onPlace: (x: number, y: number) => void;
  onErase: (x: number, y: number) => void;
};

export default function GameApp() {
  return <GameGate />;
}

function GameGate() {
  const { isSignedIn } = useAuth();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const saveEnabled = Boolean(isSignedIn && isAuthenticated);

  if (saveEnabled) {
    return <GameInnerAuthed />;
  }

  const authControls = isSignedIn ? (
    <>
      <UserButton />
      <SignOutButton>
        <button className="tool-btn">Sign out</button>
      </SignOutButton>
    </>
  ) : (
    <SignInButton mode="modal">
      <button className="tool-btn">Sign in</button>
    </SignInButton>
  );

  const saveNote = isSignedIn
    ? isLoading
      ? "Save system connecting..."
      : "Save system unavailable."
    : "Save requires sign-in.";

  const lastSavedLabel = isSignedIn ? "Save system offline" : "Local session only";

  return (
    <GameInnerLocal
      authControls={authControls}
      saveNote={saveNote}
      lastSavedLabel={lastSavedLabel}
    />
  );
}

function useGameControls() {
  const [activeTool, setActiveTool] = useState<Tool>("belt");
  const [activeDir, setActiveDir] = useState<Direction>("right");
  const [running, setRunning] = useState(true);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      const key = event.key.toLowerCase();
      if (key === "r") {
        setActiveDir((dir) => nextDir(dir));
      }
      if (event.code === "Space") {
        event.preventDefault();
        setRunning((prev) => !prev);
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveDir("up");
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setActiveDir("right");
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveDir("down");
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setActiveDir("left");
      }
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  return {
    activeTool,
    setActiveTool,
    activeDir,
    setActiveDir,
    running,
    setRunning
  };
}

function GameInnerAuthed() {
  const gameDoc = useQuery(api.games.getMyGame);
  const saveGame = useMutation(api.games.upsertMyGame);
  const resetGame = useMutation(api.games.resetMyGame);

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveStatus, setSaveStatus] = useState("Idle");
  const [buildNotice, setBuildNotice] = useState<string | null>(null);

  const dirtyRef = useRef(false);
  const loadedRef = useRef(false);
  const latestStateRef = useRef<GameState | null>(null);

  const { activeTool, setActiveTool, activeDir, running, setRunning } =
    useGameControls();

  useEffect(() => {
    if (!loadedRef.current) {
      if (gameDoc === undefined) return;
      if (gameDoc?.state) {
        setGameState(normalizeState(gameDoc.state as GameState));
      } else {
        setGameState(createInitialState());
      }
      loadedRef.current = true;
    }
  }, [gameDoc]);

  useEffect(() => {
    latestStateRef.current = gameState;
    if (gameState) {
      dirtyRef.current = true;
    }
  }, [gameState]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setGameState((prev) => (prev ? stepGame(prev) : prev));
    }, 250);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    const id = setInterval(async () => {
      if (!dirtyRef.current || !latestStateRef.current) return;
      setSaveStatus("Saving...");
      try {
        await saveGame({ state: latestStateRef.current });
        dirtyRef.current = false;
        setLastSaved(new Date());
        setSaveStatus("Saved");
      } catch (error) {
        setSaveStatus("Save failed");
      }
    }, 5000);
    return () => clearInterval(id);
  }, [saveGame]);

  if (!gameState) {
    return <div className="signin-wrap">Loading save...</div>;
  }

  const handlePlace = (x: number, y: number) => {
    setGameState((prev) => {
      if (!prev) return prev;
      if (activeTool !== "erase" && !canAffordBuild(prev, activeTool)) {
        setBuildNotice("Not enough resources in stockpile.");
        return prev;
      }
      setBuildNotice(null);
      return placeBuilding(prev, x, y, activeTool, activeDir);
    });
  };

  const handleErase = (x: number, y: number) => {
    setGameState((prev) => (prev ? placeBuilding(prev, x, y, "erase", activeDir) : prev));
  };

  const handleManualSave = async () => {
    if (!latestStateRef.current) return;
    setSaveStatus("Saving...");
    await saveGame({ state: latestStateRef.current });
    dirtyRef.current = false;
    setLastSaved(new Date());
    setSaveStatus("Saved");
  };

  const handleReset = async () => {
    const next = createInitialState();
    setGameState(next);
    await resetGame({ state: next });
    dirtyRef.current = false;
    setLastSaved(new Date());
    setSaveStatus("Reset saved");
  };

  const lastSavedLabel = lastSaved
    ? `Last saved ${lastSaved.toLocaleTimeString()}`
    : "Not saved yet";

  return (
    <GameLayout
      gameState={gameState}
      activeTool={activeTool}
      activeDir={activeDir}
      running={running}
      saveEnabled
      saveStatus={saveStatus}
      lastSavedLabel={lastSavedLabel}
      buildNotice={buildNotice}
      authControls={
        <>
          <UserButton />
          <SignOutButton>
            <button className="tool-btn">Sign out</button>
          </SignOutButton>
        </>
      }
      onSelectTool={setActiveTool}
      onToggleRun={() => setRunning((prev) => !prev)}
      onSave={handleManualSave}
      onReset={handleReset}
      onPlace={handlePlace}
      onErase={handleErase}
    />
  );
}

function GameInnerLocal({
  authControls,
  saveNote,
  lastSavedLabel
}: {
  authControls: React.ReactNode;
  saveNote: string;
  lastSavedLabel: string;
}) {
  const [gameState, setGameState] = useState<GameState>(() => createInitialState());
  const [saveStatus, setSaveStatus] = useState("Local only");
  const [buildNotice, setBuildNotice] = useState<string | null>(null);

  const { activeTool, setActiveTool, activeDir, running, setRunning } =
    useGameControls();

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setGameState((prev) => (prev ? stepGame(prev) : prev));
    }, 250);
    return () => clearInterval(id);
  }, [running]);

  const handlePlace = (x: number, y: number) => {
    setGameState((prev) => {
      if (!prev) return prev;
      if (activeTool !== "erase" && !canAffordBuild(prev, activeTool)) {
        setBuildNotice("Not enough resources in stockpile.");
        return prev;
      }
      setBuildNotice(null);
      return placeBuilding(prev, x, y, activeTool, activeDir);
    });
  };

  const handleErase = (x: number, y: number) => {
    setGameState((prev) => (prev ? placeBuilding(prev, x, y, "erase", activeDir) : prev));
  };

  const handleReset = () => {
    setGameState(createInitialState());
    setSaveStatus("Reset local");
  };

  return (
    <GameLayout
      gameState={gameState}
      activeTool={activeTool}
      activeDir={activeDir}
      running={running}
      saveEnabled={false}
      saveStatus={saveStatus}
      saveNote={saveNote}
      lastSavedLabel={lastSavedLabel}
      buildNotice={buildNotice}
      authControls={authControls}
      onSelectTool={setActiveTool}
      onToggleRun={() => setRunning((prev) => !prev)}
      onSave={() => undefined}
      onReset={handleReset}
      onPlace={handlePlace}
      onErase={handleErase}
    />
  );
}

function GameLayout({
  gameState,
  activeTool,
  activeDir,
  running,
  saveEnabled,
  saveStatus,
  saveNote,
  lastSavedLabel,
  authControls,
  buildNotice,
  onSelectTool,
  onToggleRun,
  onSave,
  onReset,
  onPlace,
  onErase
}: GameLayoutProps) {
  const [manualOpen, setManualOpen] = useState(false);

  const tools: { id: Tool; label: string }[] = useMemo(
    () => [
      { id: "belt", label: "Belt" },
      { id: "mine", label: "Mine" },
      { id: "furnace", label: "Furnace" },
      { id: "assembler", label: "Assembler" },
      { id: "wire-mill", label: "Wire Mill" },
      { id: "hub", label: "Hub" },
      { id: "chest", label: "Chest" },
      { id: "erase", label: "Erase" }
    ],
    []
  );

  if (!gameState) {
    return <div className="signin-wrap">Loading save...</div>;
  }

  return (
    <div className="app-shell">
      <aside className="panel">
        <h1>GPTorio</h1>
        <p>Mine iron/copper, smelt plates, assemble gears, and spin wire.</p>
        <div className="toolbar">
          {tools.map((tool) => (
            <button
              key={tool.id}
              className={`tool-btn ${activeTool === tool.id ? "active" : ""}`}
              onClick={() => onSelectTool(tool.id)}
              title={buildCostLabel(tool.id)}
            >
              {tool.label}
            </button>
          ))}
        </div>
        {buildNotice && <p className="save-note warn-text">{buildNotice}</p>}
        <div className="hud" style={{ marginTop: 16 }}>
          <span className="status-pill">Dir: {activeDir.toUpperCase()}</span>
          <span className="status-pill">Tick: {gameState.tick}</span>
          <span className="status-pill">Iron: {gameState.stats.ironMined}</span>
          <span className="status-pill">Copper: {gameState.stats.copperMined}</span>
          <span className="status-pill">Iron Plates: {gameState.stats.ironPlates}</span>
          <span className="status-pill">Copper Plates: {gameState.stats.copperPlates}</span>
          <span className="status-pill">Gears: {gameState.stats.gearsCrafted}</span>
          <span className="status-pill">Wire: {gameState.stats.wiresCrafted}</span>
        </div>
        <div className="legend-card" style={{ marginTop: 16 }}>
          <h2>Stockpile</h2>
          <ul>
            <li>Iron Ore: {gameState.inventory["iron-ore"]}</li>
            <li>Copper Ore: {gameState.inventory["copper-ore"]}</li>
            <li>Iron Plates: {gameState.inventory["iron-plate"]}</li>
            <li>Copper Plates: {gameState.inventory["copper-plate"]}</li>
            <li>Gears: {gameState.inventory.gear}</li>
            <li>Wire: {gameState.inventory.wire}</li>
          </ul>
        </div>
        <div className="hud" style={{ marginTop: 16 }}>
          <button className="tool-btn" onClick={onToggleRun}>
            {running ? "Pause" : "Play"}
          </button>
          <button className="tool-btn" onClick={onSave} disabled={!saveEnabled}>
            Save
          </button>
          <button className="tool-btn" onClick={onReset}>
            Reset
          </button>
          <span className="status-pill">{saveStatus}</span>
        </div>
        {saveNote && <p className="save-note">{saveNote}</p>}
        <div className="hud" style={{ marginTop: 16 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>{authControls}</div>
          <span className="status-pill">{lastSavedLabel}</span>
        </div>
        <div className="manual-launch" style={{ marginTop: 16 }}>
          <button className="tool-btn" onClick={() => setManualOpen(true)}>
            Instruction Manual
          </button>
          <span className="manual-subtext">Pop-out guide to run the factory.</span>
        </div>
      </aside>
      <main className="game-wrap">
        <GameCanvas
          state={gameState}
          activeTool={activeTool}
          activeDir={activeDir}
          onPlace={onPlace}
          onErase={onErase}
        />
      </main>
      <div className={`manual-popout ${manualOpen ? "open" : ""}`}>
        <div className="manual-header">
          <div>
            <h2>GPTorio Instruction Manual</h2>
            <p>Build a working production line from ore to finished parts.</p>
          </div>
          <button className="tool-btn" onClick={() => setManualOpen(false)}>
            Close
          </button>
        </div>
        <div className="manual-body">
          <div className="manual-section">
            <h3>Objective</h3>
            <p>
              Mine resources, route them with belts, and chain machines to craft higher-tier
              items. Watch the stats panel climb as your factory scales.
            </p>
          </div>
          <div className="manual-section">
            <h3>Factory Flow</h3>
            <ul>
              <li>Place mines on iron or copper deposits to extract ore.</li>
              <li>Belts move items one tile per tick in the direction they face.</li>
              <li>Furnaces smelt ore into plates.</li>
              <li>Assemblers turn iron plates into gears.</li>
              <li>Wire mills spin copper plates into wire.</li>
              <li>Hubs vacuum nearby items into your stockpile.</li>
              <li>Chests add items to your stockpile for building.</li>
            </ul>
          </div>
          <div className="manual-section">
            <h3>Controls</h3>
            <ul>
              <li>Click to place the selected building.</li>
              <li>Right-click to erase.</li>
              <li>Press R to rotate belt and machine outputs.</li>
              <li>Arrow keys set the facing direction.</li>
              <li>Space pauses or resumes the simulation.</li>
            </ul>
          </div>
          <div className="manual-section">
            <h3>Tips</h3>
            <ul>
              <li>Keep belts aligned to avoid jams at machine inputs.</li>
              <li>Split iron and copper lanes early so furnaces stay fed.</li>
              <li>Deposits run out, so expand to new patches.</li>
              <li>Buildings cost items from the stockpile.</li>
              <li>Pause to re-route belts without losing throughput.</li>
            </ul>
          </div>
        </div>
      </div>
      {manualOpen && (
        <button
          className="manual-backdrop"
          onClick={() => setManualOpen(false)}
          aria-label="Close manual"
        />
      )}
    </div>
  );
}

function buildCostLabel(type: Tool) {
  if (type === "erase") return "Erase tiles (no cost)";
  const cost = BUILD_COSTS[type];
  const parts = Object.entries(cost)
    .filter(([, amount]) => amount && amount > 0)
    .map(([item, amount]) => `${amount} ${formatItemLabel(item)}`);
  return parts.length ? `Cost: ${parts.join(", ")}` : "Cost: free";
}

function formatItemLabel(item: string) {
  switch (item) {
    case "iron-plate":
      return "iron plates";
    case "copper-plate":
      return "copper plates";
    case "iron-ore":
      return "iron ore";
    case "copper-ore":
      return "copper ore";
    case "gear":
      return "gears";
    case "wire":
      return "wire";
    default:
      return item;
  }
}
