"use client";

import { Suspense, lazy, useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useWorld, useAnimationState } from "@/lib/use-world";
import type { ViewMode, Agent, Sign, WorldState, AnimationState } from "@/lib/world-types";
import { VIEW_LABELS } from "@/lib/world-types";

const JournalView = lazy(() => import("./views/JournalView"));
const ThreeView = lazy(() => import("./views/ThreeView"));
const TabletopView = lazy(() => import("./views/TabletopView"));
const NightView = lazy(() => import("./views/NightView"));
const TheaterView = lazy(() => import("./views/TheaterView"));

export interface ViewProps {
  world: WorldState;
  animState: AnimationState;
  selectedAgent: Agent | null;
  selectedSign: Sign | null;
  onSelectAgent: (agent: Agent | null) => void;
  onSelectSign: (sign: Sign | null) => void;
  followedAgentId: string | null;
  onFollowAgent: (id: string | null) => void;
}

function ViewToggle({
  current,
  onChange,
}: {
  current: ViewMode;
  onChange: (v: ViewMode) => void;
}) {
  const modes: ViewMode[] = ["journal", "three", "tabletop", "night", "theater"];

  return (
    <div className="flex items-center gap-1 bg-[var(--garden-paper-dark)] rounded-md p-1 border border-[var(--garden-dust)]">
      {modes.map((mode) => (
        <button
          key={mode}
          onClick={() => onChange(mode)}
          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
            current === mode
              ? "bg-[var(--garden-olive)] text-[var(--garden-paper)]"
              : "text-[var(--garden-ink-light)] hover:text-[var(--garden-ink)] hover:bg-[var(--garden-dust-light)]"
          }`}
        >
          {VIEW_LABELS[mode]}
        </button>
      ))}
    </div>
  );
}

function Ticker({ world, animState }: { world: WorldState; animState: AnimationState }) {
  const events = world.events;
  const currentEvent = events[animState.currentEventIndex];
  
  if (!currentEvent) {
    return (
      <div className="text-xs text-[var(--garden-ink-light)] italic font-serif">
        The garden rests. Tick {world.tick}.
      </div>
    );
  }

  const agentName = currentEvent.agentName || currentEvent.agentId;

  switch (currentEvent.type) {
    case "move":
      return (
        <div className="text-xs text-[var(--garden-ink)] font-serif">
          <span className="font-medium">{agentName}</span> wanders{" "}
          {String(currentEvent.data.direction || "through the garden")}.
        </div>
      );
    case "attack":
      return (
        <div className="text-xs text-[var(--garden-terracotta)] font-serif">
          <span className="font-medium">{agentName}</span> strikes at{" "}
          <span className="font-medium">{String(currentEvent.data.targetName || "a shadow")}</span>.
        </div>
      );
    case "build":
      return (
        <div className="text-xs text-[var(--garden-olive)] font-serif">
          <span className="font-medium">{agentName}</span> plants a sign:{" "}
          <span className="italic">&ldquo;{String(currentEvent.data.text || "").slice(0, 10)}&rdquo;</span>
        </div>
      );
    case "signal": {
      const message = String(currentEvent.data.message || "");
      return (
        <div className="text-xs text-[var(--garden-gold)] font-serif">
          <span className="font-medium">{agentName}</span> signals:{" "}
          <span className="italic">{message}</span>
        </div>
      );
    }
    case "rest":
      return (
        <div className="text-xs text-[var(--garden-ink-light)] font-serif italic">
          <span className="font-medium">{agentName}</span> closes their eyes.
        </div>
      );
    case "wake":
      return (
        <div className="text-xs text-[var(--garden-ink)] font-serif">
          <span className="font-medium">{agentName}</span> stirs awake.
        </div>
      );
    default:
      return (
        <div className="text-xs text-[var(--garden-ink-light)] font-serif italic">
          Something moves in the garden.
        </div>
      );
  }
}

function AgentModal({
  agent,
  onClose,
}: {
  agent: Agent;
  onClose: () => void;
}) {
  const [agentDetails, setAgentDetails] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    
    fetch(`/api/world/agent/${agent.id}`)
      .then((res) => res.json() as Promise<Agent & { error?: string }>)
      .then((data) => {
        if (!cancelled && data && !data.error) {
          setAgentDetails(data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [agent.id]);

  const displayAgent = agentDetails || agent;
  const displayEnergy = Math.round(displayAgent.energy);
  const displayHealth = Math.round(displayAgent.health);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
      <div
        className="bg-[var(--garden-paper)] border border-[var(--garden-dust)] rounded-lg shadow-xl max-w-md w-full max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--garden-dust)]">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{displayAgent.symbol}</span>
            <div>
              <h3 className="font-bold text-[var(--garden-ink)]">{displayAgent.name}</h3>
              <p className="text-xs text-[var(--garden-ink-light)] capitalize">{displayAgent.status}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[var(--garden-ink-light)] hover:text-[var(--garden-ink)] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          <div className="flex gap-4 text-sm">
            <div className="flex-1 bg-[var(--garden-paper-dark)] rounded p-2">
              <div className="text-xs text-[var(--garden-ink-light)] mb-1">Energy</div>
              <div className="font-bold text-[var(--garden-olive)]">{displayEnergy}</div>
            </div>
            <div className="flex-1 bg-[var(--garden-paper-dark)] rounded p-2">
              <div className="text-xs text-[var(--garden-ink-light)] mb-1">Health</div>
              <div className="font-bold text-[var(--garden-terracotta)]">{displayHealth}</div>
            </div>
            <div className="flex-1 bg-[var(--garden-paper-dark)] rounded p-2">
              <div className="text-xs text-[var(--garden-ink-light)] mb-1">Position</div>
              <div className="font-bold text-[var(--garden-ink)]">
                {displayAgent.x}, {displayAgent.y}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-sm text-[var(--garden-ink-light)] italic font-serif">
              Loading thoughts...
            </div>
          ) : displayAgent.thought ? (
            <div>
              <div className="text-xs text-[var(--garden-ink-light)] mb-1 font-medium uppercase tracking-wider">
                Last Thought
              </div>
              <p className="text-sm text-[var(--garden-ink)] font-serif leading-relaxed bg-[var(--garden-paper-dark)] p-3 rounded border-l-2 border-[var(--garden-olive)]">
                {displayAgent.thought}
              </p>
            </div>
          ) : null}

          {!loading && displayAgent.log && displayAgent.log.length > 0 && (
            <div>
              <div className="text-xs text-[var(--garden-ink-light)] mb-2 font-medium uppercase tracking-wider">
                Log
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto flex flex-col-reverse">
                {displayAgent.log.map((entry, i) => (
                  <div
                    key={i}
                    className="text-xs text-[var(--garden-ink-light)] font-serif py-1 border-b border-[var(--garden-dust-light)] last:border-0"
                  >
                    {entry}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SignModal({
  sign,
  onClose,
}: {
  sign: Sign;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        className="bg-[var(--garden-paper)] border border-[var(--garden-dust)] rounded-lg shadow-xl max-w-sm w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4">
          <div className="text-center mb-4">
            <div className="inline-block bg-[var(--garden-wood)] text-[var(--garden-paper)] px-3 py-1 rounded text-xs font-medium mb-2">
              Sign at ({sign.x}, {sign.y})
            </div>
          </div>
          <p className="text-lg font-serif text-[var(--garden-ink)] text-center leading-relaxed mb-4">
            &ldquo;{sign.text}&rdquo;
          </p>
          <div className="flex justify-between text-xs text-[var(--garden-ink-light)]">
            <span>— {sign.author}</span>
            <span>tick {sign.tick}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-[var(--garden-ink-light)] font-serif italic">
        Opening the field journal...
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="w-16 h-16 mb-4 rounded-full bg-[var(--garden-paper-dark)] flex items-center justify-center">
        <span className="text-2xl">🌱</span>
      </div>
      <h2 className="text-lg font-bold text-[var(--garden-ink)] mb-2">The Garden Awaits</h2>
      <p className="text-sm text-[var(--garden-ink-light)] font-serif max-w-xs">
        No world data yet. The simulation may be starting, or the garden is being prepared.
      </p>
    </div>
  );
}

export function WorldCanvas() {
  const { world, loading, error } = useWorld();
  const pendingEvents = world.events || [];
  const animState = useAnimationState(world, pendingEvents);

  const [viewMode, setViewMode] = useState<ViewMode>("journal");
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [selectedSign, setSelectedSign] = useState<Sign | null>(null);
  const [followedAgentId, setFollowedAgentId] = useState<string | null>(null);

  const handleSelectAgent = useCallback((agent: Agent | null) => {
    setSelectedAgent(agent);
    setSelectedSign(null);
  }, []);

  const handleSelectSign = useCallback((sign: Sign | null) => {
    setSelectedSign(sign);
    setSelectedAgent(null);
  }, []);

  const handleFollowAgent = useCallback((id: string | null) => {
    setFollowedAgentId(id);
  }, []);

  const viewProps: ViewProps = {
    world,
    animState,
    selectedAgent,
    selectedSign,
    onSelectAgent: handleSelectAgent,
    onSelectSign: handleSelectSign,
    followedAgentId,
    onFollowAgent: handleFollowAgent,
  };

  const isNightView = viewMode === "night";
  const bgClass = isNightView
    ? "bg-[var(--garden-night-bg)]"
    : "bg-[var(--garden-paper)]";

  return (
    <main className={`min-h-screen ${bgClass} flex flex-col`}>
      <header
        className={`sticky top-0 z-40 border-b ${
          isNightView
            ? "bg-[var(--garden-night-bg)]/95 border-[var(--garden-coal)]"
            : "bg-[var(--garden-paper)]/95 border-[var(--garden-dust)]"
        } backdrop-blur-sm`}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className={`text-xs ${
                isNightView
                  ? "text-[var(--garden-dust)] hover:text-[var(--garden-paper)]"
                  : "text-[var(--garden-ink-light)] hover:text-[var(--garden-ink)]"
              } transition-colors flex items-center gap-1`}
            >
              <span>←</span>
              <span>Back</span>
            </Link>
            <div
              className={`h-4 w-px ${
                isNightView ? "bg-[var(--garden-coal)]" : "bg-[var(--garden-dust)]"
              }`}
            />
            <h1
              className={`text-sm font-bold ${
                isNightView ? "text-[var(--garden-paper)]" : "text-[var(--garden-ink)]"
              }`}
            >
              The Garden
            </h1>
            <span
              className={`text-xs ${
                isNightView ? "text-[var(--garden-dust)]" : "text-[var(--garden-ink-light)]"
              } font-serif italic hidden sm:inline`}
            >
              Genesis-001 · tick {world.tick}
            </span>
          </div>

          <ViewToggle current={viewMode} onChange={setViewMode} />
        </div>

        <div
          className={`px-4 py-2 border-t ${
            isNightView
              ? "border-[var(--garden-coal)] bg-[var(--garden-night-bg)]/50"
              : "border-[var(--garden-dust-light)] bg-[var(--garden-paper-dark)]/50"
          }`}
        >
          <Ticker world={world} animState={animState} />
        </div>
      </header>

      <div className="flex-1 relative overflow-hidden">
        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <div className="flex items-center justify-center h-full text-[var(--garden-terracotta)]">
            {error}
          </div>
        ) : world.agents.length === 0 && world.signs.length === 0 ? (
          <EmptyState />
        ) : (
          <Suspense fallback={<LoadingSpinner />}>
            {viewMode === "journal" && <JournalView {...viewProps} />}
            {viewMode === "three" && <ThreeView {...viewProps} />}
            {viewMode === "tabletop" && <TabletopView {...viewProps} />}
            {viewMode === "night" && <NightView {...viewProps} />}
            {viewMode === "theater" && <TheaterView {...viewProps} />}
          </Suspense>
        )}
      </div>

      {selectedAgent && (
        <AgentModal agent={selectedAgent} onClose={() => setSelectedAgent(null)} />
      )}

      {selectedSign && (
        <SignModal sign={selectedSign} onClose={() => setSelectedSign(null)} />
      )}
    </main>
  );
}
