"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useWorld } from "@/lib/use-world";
import type { Agent, Sign } from "@/lib/world-types";
import { getAgentSymbolType } from "@/lib/world-types";

const GRID_SIZE = 32;
const CELL_SIZE = 14;
const CANVAS_SIZE = GRID_SIZE * CELL_SIZE;
const LERP_DURATION = 30000;
const ANIMATION_INTERVAL = 50;

const AGENT_COLORS: Record<string, string> = {
  clay: "#c4644a",
  thorn: "#4a4540",
  reed: "#b8b0a0",
  cole: "#3d3835",
  sol: "#d4a54a",
};

interface LerpPosition {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  startTime: number;
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

    return () => { cancelled = true; };
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
          <button onClick={onClose} className="p-2 text-[var(--garden-ink-light)] hover:text-[var(--garden-ink)]">
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
              <div className="text-xl font-bold text-[var(--garden-ink)]">{displayAgent.x},{displayAgent.y}</div>
            </div>
          </div>
          <div>
            <div className="text-xs text-[var(--garden-ink-light)] mb-2 font-medium uppercase tracking-wider">Last Thought</div>
            {loading ? (
              <p className="text-base text-[var(--garden-ink-light)] italic font-serif">Loading...</p>
            ) : fetchError ? (
              <p className="text-base text-[var(--garden-ink-light)] font-serif">—</p>
            ) : thought ? (
              <p className="text-base text-[var(--garden-ink)] font-serif leading-relaxed bg-[var(--garden-paper-dark)] p-4 rounded-lg border-l-4 border-[var(--garden-olive)]">{thought}</p>
            ) : (
              <p className="text-base text-[var(--garden-ink-light)] font-serif">—</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CanvasMap({
  agents,
  signs,
  onSelectAgent,
}: {
  agents: Agent[];
  signs: Sign[];
  onSelectAgent: (agent: Agent) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lerpPositions = useRef<Map<string, LerpPosition>>(new Map());
  const lastTickRef = useRef<number>(-1);
  const animationRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  const getCurrentPositions = useCallback(() => {
    const now = Date.now();
    const positions = new Map<string, { x: number; y: number }>();
    
    for (const agent of agents) {
      const lerp = lerpPositions.current.get(agent.id);
      if (lerp) {
        const elapsed = now - lerp.startTime;
        const t = Math.min(1, elapsed / LERP_DURATION);
        const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        positions.set(agent.id, {
          x: lerp.fromX + (lerp.toX - lerp.fromX) * eased,
          y: lerp.fromY + (lerp.toY - lerp.fromY) * eased,
        });
      } else {
        positions.set(agent.id, { x: agent.x, y: agent.y });
      }
    }
    return positions;
  }, [agents]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#e8e0d0";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    ctx.strokeStyle = "#c8c0b0";
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= GRID_SIZE; i++) {
      const pos = i * CELL_SIZE;
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, CANVAS_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, pos);
      ctx.lineTo(CANVAS_SIZE, pos);
      ctx.stroke();
    }

    for (const sign of signs) {
      const cx = sign.x * CELL_SIZE + CELL_SIZE / 2;
      const cy = sign.y * CELL_SIZE + CELL_SIZE / 2;
      ctx.fillStyle = "#8b6f47";
      ctx.fillRect(cx - 3, cy - 2, 6, 4);
    }

    const positions = getCurrentPositions();
    for (const agent of agents) {
      const pos = positions.get(agent.id) || { x: agent.x, y: agent.y };
      const cx = pos.x * CELL_SIZE + CELL_SIZE / 2;
      const cy = pos.y * CELL_SIZE + CELL_SIZE / 2;
      const symbolType = getAgentSymbolType(agent.symbol);
      const color = AGENT_COLORS[symbolType];

      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }, [agents, signs, getCurrentPositions]);

  useEffect(() => {
    mountedRef.current = true;

    const tick = agents[0]?.lastAction?.tick ?? -1;
    if (tick !== lastTickRef.current && lastTickRef.current !== -1) {
      const now = Date.now();
      for (const agent of agents) {
        const current = lerpPositions.current.get(agent.id);
        const fromX = current ? current.fromX + (current.toX - current.fromX) * Math.min(1, (now - current.startTime) / LERP_DURATION) : agent.x;
        const fromY = current ? current.fromY + (current.toY - current.fromY) * Math.min(1, (now - current.startTime) / LERP_DURATION) : agent.y;
        lerpPositions.current.set(agent.id, {
          fromX,
          fromY,
          toX: agent.x,
          toY: agent.y,
          startTime: now,
        });
      }
    } else if (lastTickRef.current === -1) {
      for (const agent of agents) {
        lerpPositions.current.set(agent.id, {
          fromX: agent.x,
          fromY: agent.y,
          toX: agent.x,
          toY: agent.y,
          startTime: Date.now(),
        });
      }
    }
    lastTickRef.current = tick;
  }, [agents]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        if (animationRef.current !== null) {
          clearInterval(animationRef.current);
          animationRef.current = null;
        }
      } else {
        if (animationRef.current === null && mountedRef.current) {
          animationRef.current = window.setInterval(() => {
            if (!document.hidden && mountedRef.current) draw();
          }, ANIMATION_INTERVAL);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    
    draw();
    animationRef.current = window.setInterval(() => {
      if (!document.hidden && mountedRef.current) draw();
    }, ANIMATION_INTERVAL);

    return () => {
      mountedRef.current = false;
      document.removeEventListener("visibilitychange", handleVisibility);
      if (animationRef.current !== null) {
        clearInterval(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [draw]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_SIZE / rect.width;
    const scaleY = CANVAS_SIZE / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    const positions = getCurrentPositions();
    for (const agent of agents) {
      const pos = positions.get(agent.id) || { x: agent.x, y: agent.y };
      const cx = pos.x * CELL_SIZE + CELL_SIZE / 2;
      const cy = pos.y * CELL_SIZE + CELL_SIZE / 2;
      const dist = Math.sqrt((clickX - cx) ** 2 + (clickY - cy) ** 2);
      if (dist < 10) {
        onSelectAgent(agent);
        return;
      }
    }
  }, [agents, getCurrentPositions, onSelectAgent]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_SIZE}
      height={CANVAS_SIZE}
      onClick={handleClick}
      className="w-full max-w-[448px] aspect-square border border-[var(--garden-dust)] rounded-lg cursor-pointer"
    />
  );
}

export function WorldCanvas() {
  const { world, loading, error } = useWorld();
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [canvasFailed, setCanvasFailed] = useState(false);

  useEffect(() => {
    try {
      const testCanvas = document.createElement("canvas");
      const ctx = testCanvas.getContext("2d");
      if (!ctx) setCanvasFailed(true);
    } catch {
      setCanvasFailed(true);
    }
  }, []);

  const handleSelectAgent = useCallback((agent: Agent) => {
    setSelectedAgent(agent);
  }, []);

  return (
    <main 
      className="min-h-screen bg-[var(--garden-paper)] flex flex-col"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <header className="sticky top-0 z-40 border-b bg-[var(--garden-paper)] border-[var(--garden-dust)] px-4 py-4 sm:py-3">
        <div className="flex items-center gap-3 max-w-3xl mx-auto">
          <Link href="/" className="text-sm text-[var(--garden-ink-light)] hover:text-[var(--garden-ink)]">←</Link>
          <div className="flex-1">
            <h1 className="text-lg sm:text-base font-bold text-[var(--garden-ink)]">The Garden</h1>
            <p className="text-sm text-[var(--garden-ink-light)] font-serif">tick {world.tick}</p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto px-4 py-6">
          {loading ? (
            <div className="text-center text-[var(--garden-ink-light)] font-serif italic py-12">Loading world data...</div>
          ) : error ? (
            <div className="text-center text-[var(--garden-terracotta)] py-12">{error}</div>
          ) : (
            <div className="flex flex-col lg:flex-row gap-6">
              {!canvasFailed && (
                <div className="flex justify-center lg:justify-start">
                  <CanvasMap agents={world.agents} signs={world.signs} onSelectAgent={handleSelectAgent} />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[var(--garden-ink-light)] mb-3">
                  Agents ({world.agents.length})
                </div>
                {world.agents.length === 0 ? (
                  <div className="text-center text-[var(--garden-ink-light)] font-serif italic py-6">No agents yet.</div>
                ) : (
                  <div className="space-y-2">
                    {world.agents.map((agent) => (
                      <button
                        key={agent.id}
                        onClick={() => handleSelectAgent(agent)}
                        className="w-full text-left p-3 bg-[var(--garden-paper-dark)] rounded-lg border border-[var(--garden-dust)] active:bg-[var(--garden-dust-light)] transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{agent.symbol}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="font-bold text-[var(--garden-ink)] truncate">{agent.name}</span>
                              <span className="text-xs text-[var(--garden-ink-light)] capitalize shrink-0">{agent.status}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-[var(--garden-ink-light)]">
                              <span>⚡{Math.round(agent.energy)}</span>
                              <span>({agent.x},{agent.y})</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
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
