"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useWorld } from "@/lib/use-world";
import type { Agent, Sign } from "@/lib/world-types";

const GRID_SIZE = 32;
const CELL_SIZE = 14;
const CANVAS_SIZE = GRID_SIZE * CELL_SIZE;
const LERP_DURATION = 1500;
const ANIMATION_INTERVAL = 33;

type Flavor = "garden" | "tabletop" | "night" | "theater" | "fab";

const FLAVOR_LABELS: Record<Flavor, string> = {
  garden: "Garden",
  tabletop: "Tabletop",
  night: "Night",
  theater: "Theater",
  fab: "Fab",
};

const AGENT_COLORS: Record<string, string> = {
  clay: "#a05030",
  thorn: "#3a5a3a",
  reed: "#c9a040",
  cole: "#404040",
  sol: "#e0b020",
  unknown: "#888888",
};

function getAgentColor(agent: Agent): string {
  const appearance = (agent as Agent & { appearance?: string }).appearance;
  if (appearance) {
    const lower = appearance.toLowerCase();
    if (lower.includes("brown") || lower.includes("clay")) return AGENT_COLORS.clay;
    if (lower.includes("green") || lower.includes("thorn")) return AGENT_COLORS.thorn;
    if (lower.includes("gold") || lower.includes("reed")) return AGENT_COLORS.reed;
    if (lower.includes("charcoal") || lower.includes("cole") || lower.includes("dark")) return AGENT_COLORS.cole;
    if (lower.includes("yellow") || lower.includes("sol")) return AGENT_COLORS.sol;
  }
  const name = (agent.name || agent.id || "").toLowerCase();
  if (name.includes("clay")) return AGENT_COLORS.clay;
  if (name.includes("thorn")) return AGENT_COLORS.thorn;
  if (name.includes("reed")) return AGENT_COLORS.reed;
  if (name.includes("cole")) return AGENT_COLORS.cole;
  if (name.includes("sol")) return AGENT_COLORS.sol;
  return AGENT_COLORS.unknown;
}

interface LerpPosition {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  startTime: number;
  puffUntil: number;
}

function FlavorSelect({ value, onChange }: { value: Flavor; onChange: (f: Flavor) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-[var(--garden-ink-light)]">Flavor:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Flavor)}
        className="text-sm bg-[var(--garden-paper-dark)] border border-[var(--garden-dust)] rounded px-2 py-1 text-[var(--garden-ink)]"
      >
        <option value="garden">{FLAVOR_LABELS.garden}</option>
        <option value="tabletop" disabled>{FLAVOR_LABELS.tabletop} (coming soon)</option>
        <option value="night" disabled>{FLAVOR_LABELS.night} (coming soon)</option>
        <option value="theater" disabled>{FLAVOR_LABELS.theater} (coming soon)</option>
        <option value="fab" disabled>{FLAVOR_LABELS.fab} (coming soon)</option>
      </select>
    </div>
  );
}

function AgentModal({ agent, onClose }: { agent: Agent; onClose: () => void }) {
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
      .catch(() => { if (!cancelled) setFetchError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });

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

function CanvasMap({ agents, signs, onSelectAgent }: { agents: Agent[]; signs: Sign[]; onSelectAgent: (agent: Agent) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lerpPositions = useRef<Map<string, LerpPosition>>(new Map());
  const prevPositions = useRef<Map<string, { x: number; y: number }>>(new Map());
  const animationRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  const getCurrentPositions = useCallback(() => {
    const now = Date.now();
    const positions = new Map<string, { x: number; y: number; puff: boolean }>();
    
    for (const agent of agents) {
      const lerp = lerpPositions.current.get(agent.id);
      if (lerp) {
        const elapsed = now - lerp.startTime;
        const t = Math.min(1, elapsed / LERP_DURATION);
        const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        positions.set(agent.id, {
          x: lerp.fromX + (lerp.toX - lerp.fromX) * eased,
          y: lerp.fromY + (lerp.toY - lerp.fromY) * eased,
          puff: now < lerp.puffUntil,
        });
      } else {
        positions.set(agent.id, { x: agent.x, y: agent.y, puff: false });
      }
    }
    return positions;
  }, [agents]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#d8e4c8";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    ctx.strokeStyle = "#b8c4a8";
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
      
      ctx.fillStyle = "#5a4020";
      ctx.fillRect(cx - 1, cy + 2, 2, 4);
      
      ctx.fillStyle = "#c8a060";
      ctx.strokeStyle = "#8b6030";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.roundRect(cx - 8, cy - 4, 16, 8, 1);
      ctx.fill();
      ctx.stroke();
      
      ctx.fillStyle = "#5a4020";
      ctx.font = "5px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const label = sign.text.slice(0, 5);
      ctx.fillText(label, cx, cy);
    }

    const positions = getCurrentPositions();
    for (const agent of agents) {
      const pos = positions.get(agent.id) || { x: agent.x, y: agent.y, puff: false };
      const cx = pos.x * CELL_SIZE + CELL_SIZE / 2;
      const cy = pos.y * CELL_SIZE + CELL_SIZE / 2;
      const color = getAgentColor(agent);
      const isDimmed = agent.status === "sleeping" || agent.status === "downed";

      if (pos.puff) {
        ctx.fillStyle = "rgba(200,180,140,0.4)";
        ctx.beginPath();
        ctx.arc(cx, cy + 2, 6, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = isDimmed ? 0.5 : 1;

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(cx, cy + 1, 5, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(cx, cy - 2, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.beginPath();
      ctx.arc(cx - 1, cy - 3, 1.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 1;
    }
  }, [agents, signs, getCurrentPositions]);

  useEffect(() => {
    const now = Date.now();
    for (const agent of agents) {
      const prev = prevPositions.current.get(agent.id);
      const current = lerpPositions.current.get(agent.id);
      
      if (!prev) {
        lerpPositions.current.set(agent.id, {
          fromX: agent.x, fromY: agent.y,
          toX: agent.x, toY: agent.y,
          startTime: now, puffUntil: 0,
        });
      } else if (prev.x !== agent.x || prev.y !== agent.y) {
        const currentX = current ? current.fromX + (current.toX - current.fromX) * Math.min(1, (now - current.startTime) / LERP_DURATION) : prev.x;
        const currentY = current ? current.fromY + (current.toY - current.fromY) * Math.min(1, (now - current.startTime) / LERP_DURATION) : prev.y;
        lerpPositions.current.set(agent.id, {
          fromX: currentX, fromY: currentY,
          toX: agent.x, toY: agent.y,
          startTime: now, puffUntil: now + 300,
        });
      }
      prevPositions.current.set(agent.id, { x: agent.x, y: agent.y });
    }
  }, [agents]);

  useEffect(() => {
    mountedRef.current = true;

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
      if (dist < 12) {
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
      className="w-full max-w-[448px] aspect-square border-2 border-[var(--garden-olive)] rounded-lg cursor-pointer shadow-md"
    />
  );
}

export function WorldCanvas() {
  const { world, loading, error } = useWorld();
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [canvasFailed, setCanvasFailed] = useState(false);
  const [flavor, setFlavor] = useState<Flavor>("garden");

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
      <header className="sticky top-0 z-40 border-b bg-[var(--garden-paper)] border-[var(--garden-dust)] px-4 py-3">
        <div className="flex items-center justify-between gap-3 max-w-3xl mx-auto">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-[var(--garden-ink-light)] hover:text-[var(--garden-ink)]">←</Link>
            <div>
              <h1 className="text-lg sm:text-base font-bold text-[var(--garden-ink)]">The Garden</h1>
              <p className="text-sm text-[var(--garden-ink-light)] font-serif">tick {world.tick}</p>
            </div>
          </div>
          <FlavorSelect value={flavor} onChange={setFlavor} />
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
                    {world.agents.map((agent) => {
                      const color = getAgentColor(agent);
                      const isDimmed = agent.status === "sleeping" || agent.status === "downed";
                      return (
                        <button
                          key={agent.id}
                          onClick={() => handleSelectAgent(agent)}
                          className="w-full text-left p-3 bg-[var(--garden-paper-dark)] rounded-lg border border-[var(--garden-dust)] active:bg-[var(--garden-dust-light)] transition-colors"
                          style={{ opacity: isDimmed ? 0.6 : 1 }}
                        >
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                              style={{ backgroundColor: color }}
                            >
                              {(agent.name || "?").charAt(0).toUpperCase()}
                            </div>
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
                      );
                    })}
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
