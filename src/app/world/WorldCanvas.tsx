"use client";

import { useState, useCallback, useEffect, lazy, Suspense, type ComponentType } from "react";
import Link from "next/link";
import { useWorld, useAnimationState } from "@/lib/use-world";
import type { ViewMode, Agent, Sign, WorldState, AnimationState } from "@/lib/world-types";
import { VIEW_LABELS } from "@/lib/world-types";

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

type LazyView = ComponentType<ViewProps>;

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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40" onClick={onClose}>
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

function TextOnlyView({
  world,
  onSelectAgent,
}: {
  world: WorldState;
  onSelectAgent: (agent: Agent) => void;
}) {
  return (
    <div className="p-6 font-serif text-[var(--garden-ink)]">
      <div className="mb-6">
        <div className="text-lg font-bold mb-2">World State</div>
        <div className="text-sm text-[var(--garden-ink-light)]">
          Tick: {world.tick} | Grid: {(world.grid as {width: number; height: number}).width}×{(world.grid as {width: number; height: number}).height}
        </div>
      </div>

      <div className="mb-6">
        <div className="text-md font-bold mb-3">Agents ({world.agents.length})</div>
        {world.agents.length === 0 ? (
          <div className="text-sm text-[var(--garden-ink-light)] italic">No agents present.</div>
        ) : (
          <div className="space-y-2">
            {world.agents.map((agent) => (
              <div
                key={agent.id}
                onClick={() => onSelectAgent(agent)}
                className="p-3 bg-[var(--garden-paper-dark)] rounded border border-[var(--garden-dust)] cursor-pointer hover:border-[var(--garden-olive)] transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="font-bold">{agent.symbol} {agent.name}</div>
                  <div className="text-xs text-[var(--garden-ink-light)] capitalize">{agent.status}</div>
                </div>
                <div className="text-xs text-[var(--garden-ink-light)] mt-1">
                  Position: ({agent.x}, {agent.y}) | Energy: {Math.round(agent.energy)} | Health: {Math.round(agent.health)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {world.signs.length > 0 && (
        <div className="mb-6">
          <div className="text-md font-bold mb-3">Signs ({world.signs.length})</div>
          <div className="space-y-2">
            {world.signs.map((sign) => (
              <div
                key={sign.id}
                className="p-3 bg-[var(--garden-paper-dark)] rounded border border-[var(--garden-dust)]"
              >
                <div className="text-sm">&ldquo;{sign.text}&rdquo;</div>
                <div className="text-xs text-[var(--garden-ink-light)] mt-1">
                  by {sign.author} at ({sign.x}, {sign.y})
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {world.events.length > 0 && (
        <div>
          <div className="text-md font-bold mb-3">Recent Events ({world.events.length})</div>
          <div className="space-y-1 text-sm text-[var(--garden-ink-light)]">
            {world.events.slice(-5).map((event, i) => (
              <div key={i}>
                [{event.type}] {event.agentName || event.agentId}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-[var(--garden-ink-light)] font-serif italic">
        Loading view...
      </div>
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
  const [loadedView, setLoadedView] = useState<LazyView | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

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

  const handleViewChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    if (mode === "journal") {
      setLoadedView(null);
      return;
    }

    setViewLoading(true);
    let importPromise: Promise<{ default: LazyView }>;
    
    switch (mode) {
      case "three":
        importPromise = import("./views/ThreeView");
        break;
      case "tabletop":
        importPromise = import("./views/TabletopView");
        break;
      case "night":
        importPromise = import("./views/NightView");
        break;
      case "theater":
        importPromise = import("./views/TheaterView");
        break;
      default:
        setViewLoading(false);
        return;
    }

    importPromise
      .then((mod) => {
        setLoadedView(() => mod.default);
      })
      .catch((err) => {
        console.error("Failed to load view:", err);
      })
      .finally(() => {
        setViewLoading(false);
      });
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

  const LoadedViewComponent = loadedView;

  return (
    <main className="min-h-screen bg-[var(--garden-paper)] flex flex-col">
      <header className="sticky top-0 z-40 border-b bg-[var(--garden-paper)] border-[var(--garden-dust)]">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-xs text-[var(--garden-ink-light)] hover:text-[var(--garden-ink)] transition-colors flex items-center gap-1"
            >
              <span>←</span>
              <span>Back</span>
            </Link>
            <div className="h-4 w-px bg-[var(--garden-dust)]" />
            <h1 className="text-sm font-bold text-[var(--garden-ink)]">
              The Garden
            </h1>
            <span className="text-xs text-[var(--garden-ink-light)] font-serif italic hidden sm:inline">
              Genesis-001 · tick {world.tick}
            </span>
          </div>

          <ViewToggle current={viewMode} onChange={handleViewChange} />
        </div>
      </header>

      <div className="flex-1 relative overflow-auto">
        {loading ? (
          <div className="p-6 text-[var(--garden-ink-light)] font-serif italic">Loading world data...</div>
        ) : error ? (
          <div className="p-6 text-[var(--garden-terracotta)]">{error}</div>
        ) : viewMode === "journal" ? (
          <TextOnlyView world={world} onSelectAgent={handleSelectAgent} />
        ) : viewLoading ? (
          <LoadingSpinner />
        ) : LoadedViewComponent ? (
          <LoadedViewComponent {...viewProps} />
        ) : (
          <LoadingSpinner />
        )}
      </div>

      {selectedAgent && (
        <AgentModal agent={selectedAgent} onClose={() => setSelectedAgent(null)} />
      )}
    </main>
  );
}
