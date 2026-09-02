"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useWorld } from "@/lib/use-world";
import type { Agent } from "@/lib/world-types";

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
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" 
      style={{ padding: "env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)" }}
      onClick={onClose}
    >
      <div
        className="bg-[var(--garden-paper)] border border-[var(--garden-dust)] rounded-t-2xl sm:rounded-lg shadow-xl w-full sm:max-w-md max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--garden-dust)]">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{displayAgent.symbol}</span>
            <div>
              <h3 className="text-lg font-bold text-[var(--garden-ink)]">{displayAgent.name}</h3>
              <p className="text-sm text-[var(--garden-ink-light)] capitalize">{displayAgent.status}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[var(--garden-ink-light)] hover:text-[var(--garden-ink)] transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[var(--garden-paper-dark)] rounded-lg p-3 text-center">
              <div className="text-xs text-[var(--garden-ink-light)] mb-1">Energy</div>
              <div className="text-xl font-bold text-[var(--garden-olive)]">{displayEnergy}</div>
            </div>
            <div className="bg-[var(--garden-paper-dark)] rounded-lg p-3 text-center">
              <div className="text-xs text-[var(--garden-ink-light)] mb-1">Health</div>
              <div className="text-xl font-bold text-[var(--garden-terracotta)]">{displayHealth}</div>
            </div>
            <div className="bg-[var(--garden-paper-dark)] rounded-lg p-3 text-center">
              <div className="text-xs text-[var(--garden-ink-light)] mb-1">Position</div>
              <div className="text-xl font-bold text-[var(--garden-ink)]">
                {displayAgent.x},{displayAgent.y}
              </div>
            </div>
          </div>

          <div>
            <div className="text-xs text-[var(--garden-ink-light)] mb-2 font-medium uppercase tracking-wider">
              Last Thought
            </div>
            {loading ? (
              <p className="text-base text-[var(--garden-ink-light)] italic font-serif">Loading...</p>
            ) : fetchError ? (
              <p className="text-base text-[var(--garden-ink-light)] font-serif">—</p>
            ) : thought ? (
              <p className="text-base text-[var(--garden-ink)] font-serif leading-relaxed bg-[var(--garden-paper-dark)] p-4 rounded-lg border-l-4 border-[var(--garden-olive)]">
                {thought}
              </p>
            ) : (
              <p className="text-base text-[var(--garden-ink-light)] font-serif">—</p>
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

  const handleSelectAgent = useCallback((agent: Agent) => {
    setSelectedAgent(agent);
  }, []);

  return (
    <main 
      className="min-h-screen bg-[var(--garden-paper)] flex flex-col"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <header className="sticky top-0 z-40 border-b bg-[var(--garden-paper)] border-[var(--garden-dust)] px-4 py-4 sm:py-3">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <Link
            href="/"
            className="text-sm text-[var(--garden-ink-light)] hover:text-[var(--garden-ink)] transition-colors"
          >
            ←
          </Link>
          <div className="flex-1">
            <h1 className="text-lg sm:text-base font-bold text-[var(--garden-ink)]">The Garden</h1>
            <p className="text-sm text-[var(--garden-ink-light)] font-serif">tick {world.tick}</p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto px-4 py-6">
          {loading ? (
            <div className="text-center text-[var(--garden-ink-light)] font-serif italic py-12">
              Loading world data...
            </div>
          ) : error ? (
            <div className="text-center text-[var(--garden-terracotta)] py-12">
              {error}
            </div>
          ) : world.agents.length === 0 ? (
            <div className="text-center text-[var(--garden-ink-light)] font-serif italic py-12">
              No agents in the garden yet.
            </div>
          ) : (
            <div className="space-y-3">
              {world.agents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => handleSelectAgent(agent)}
                  className="w-full text-left p-4 bg-[var(--garden-paper-dark)] rounded-xl border border-[var(--garden-dust)] active:bg-[var(--garden-dust-light)] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{agent.symbol}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-lg font-bold text-[var(--garden-ink)] truncate">
                          {agent.name}
                        </span>
                        <span className="text-sm text-[var(--garden-ink-light)] capitalize shrink-0">
                          {agent.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-[var(--garden-ink-light)]">
                        <span>⚡ {Math.round(agent.energy)}</span>
                        <span>({agent.x}, {agent.y})</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedAgent && (
        <AgentModal agent={selectedAgent} onClose={() => setSelectedAgent(null)} />
      )}
    </main>
  );
}
