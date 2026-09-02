"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useWorld } from "@/lib/use-world";
import type { Agent } from "@/lib/world-types";
import { getAgentSymbolType } from "@/lib/world-types";

const AGENT_COLORS: Record<string, string> = {
  clay: "#c4644a",
  thorn: "#4a4540",
  reed: "#b8b0a0",
  cole: "#3d3835",
  sol: "#d4a54a",
};

function AgentModal({
  agent,
  onClose,
}: {
  agent: Agent;
  onClose: () => void;
}) {
  const [agentDetails, setAgentDetails] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFetchError(false);
    
    fetch(`/api/world/agent/${agent.id}`)
      .then((res) => res.json() as Promise<Agent & { error?: string }>)
      .then((data) => {
        if (!cancelled) {
          if (data && !data.error) {
            setAgentDetails(data);
          } else {
            setFetchError(true);
          }
        }
      })
      .catch(() => {
        if (!cancelled) setFetchError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [agent.id]);

  const displayAgent = agentDetails || agent;
  const displayEnergy = Math.round(displayAgent.energy ?? 0);
  const displayHealth = Math.round(displayAgent.health ?? 0);
  const thought = displayAgent.thought;

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

          <div>
            <div className="text-xs text-[var(--garden-ink-light)] mb-1 font-medium uppercase tracking-wider">
              Last Thought
            </div>
            {loading ? (
              <p className="text-sm text-[var(--garden-ink-light)] italic font-serif">Loading...</p>
            ) : fetchError ? (
              <p className="text-sm text-[var(--garden-ink-light)] font-serif">—</p>
            ) : thought ? (
              <p className="text-sm text-[var(--garden-ink)] font-serif leading-relaxed bg-[var(--garden-paper-dark)] p-3 rounded border-l-2 border-[var(--garden-olive)]">
                {thought}
              </p>
            ) : (
              <p className="text-sm text-[var(--garden-ink-light)] font-serif">—</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function WorldCanvas() {
  const { world, loading, error } = useWorld();
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  const handleSelectAgent = useCallback((agent: Agent | null) => {
    setSelectedAgent(agent);
  }, []);

  const grid = world.grid as { width: number; height: number };
  const gridWidth = grid.width;
  const gridHeight = grid.height;
  const cellSize = 16;
  const boardWidth = gridWidth * cellSize;
  const boardHeight = gridHeight * cellSize;

  return (
    <main className="min-h-screen bg-[var(--garden-paper)] flex flex-col">
      <header className="sticky top-0 z-40 border-b bg-[var(--garden-paper)] border-[var(--garden-dust)] px-4 py-3">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-xs text-[var(--garden-ink-light)] hover:text-[var(--garden-ink)] transition-colors flex items-center gap-1"
          >
            <span>←</span>
            <span>Back</span>
          </Link>
          <div className="h-4 w-px bg-[var(--garden-dust)]" />
          <h1 className="text-sm font-bold text-[var(--garden-ink)]">The Garden</h1>
          <span className="text-xs text-[var(--garden-ink-light)] font-serif italic">
            tick {world.tick}
          </span>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-[var(--garden-ink-light)] font-serif italic">
            Loading...
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center text-[var(--garden-terracotta)]">
            {error}
          </div>
        ) : (
          <>
            <div className="flex-1 flex items-center justify-center p-4">
              <div
                style={{
                  position: "relative",
                  width: boardWidth,
                  height: boardHeight,
                  backgroundColor: "#e8e0d0",
                  border: "2px solid var(--garden-dust)",
                  backgroundImage: `
                    repeating-linear-gradient(0deg, var(--garden-dust) 0px, var(--garden-dust) 1px, transparent 1px, transparent ${cellSize}px),
                    repeating-linear-gradient(90deg, var(--garden-dust) 0px, var(--garden-dust) 1px, transparent 1px, transparent ${cellSize}px)
                  `,
                  backgroundSize: `${cellSize}px ${cellSize}px`,
                }}
              >
                {world.agents.slice(0, 8).map((agent) => {
                  const symbolType = getAgentSymbolType(agent.symbol);
                  const color = AGENT_COLORS[symbolType];
                  return (
                    <div
                      key={agent.id}
                      onClick={() => handleSelectAgent(agent)}
                      style={{
                        position: "absolute",
                        left: agent.x * cellSize + cellSize / 2 - 6,
                        top: agent.y * cellSize + cellSize / 2 - 6,
                        width: 12,
                        height: 12,
                        backgroundColor: color,
                        borderRadius: "50%",
                        cursor: "pointer",
                        border: "2px solid rgba(255,255,255,0.5)",
                        boxSizing: "border-box",
                      }}
                      title={agent.name}
                    />
                  );
                })}
              </div>
            </div>

            <div className="lg:w-64 p-4 border-t lg:border-t-0 lg:border-l border-[var(--garden-dust)] bg-[var(--garden-paper-dark)]">
              <div className="text-sm font-bold text-[var(--garden-ink)] mb-3">
                Agents ({world.agents.length})
              </div>
              <div className="space-y-2">
                {world.agents.map((agent) => {
                  const symbolType = getAgentSymbolType(agent.symbol);
                  const color = AGENT_COLORS[symbolType];
                  return (
                    <div
                      key={agent.id}
                      onClick={() => handleSelectAgent(agent)}
                      className="flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-[var(--garden-dust-light)] transition-colors"
                    >
                      <div
                        style={{
                          width: 10,
                          height: 10,
                          backgroundColor: color,
                          borderRadius: "50%",
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-[var(--garden-ink)] truncate">
                          {agent.name}
                        </div>
                        <div className="text-xs text-[var(--garden-ink-light)] capitalize">
                          {agent.status} · ({agent.x}, {agent.y})
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {selectedAgent && (
        <AgentModal agent={selectedAgent} onClose={() => setSelectedAgent(null)} />
      )}
    </main>
  );
}
