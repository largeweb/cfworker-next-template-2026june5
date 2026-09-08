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

const AGENT_GLOW_COLORS: Record<string, string> = {
  clay: "#ff8060",
  thorn: "#60ff80",
  reed: "#ffdd60",
  cole: "#a0a0c0",
  sol: "#ffff80",
  unknown: "#c0c0c0",
};

const AGENT_FAB_COLORS: Record<string, string> = {
  clay: "#c08060",
  thorn: "#60a080",
  reed: "#a0a040",
  cole: "#606080",
  sol: "#c0c040",
  unknown: "#808090",
};

function getAgentFabColor(agent: Agent): string {
  const appearance = (agent as Agent & { appearance?: string }).appearance;
  if (appearance) {
    const lower = appearance.toLowerCase();
    if (lower.includes("brown") || lower.includes("clay")) return AGENT_FAB_COLORS.clay;
    if (lower.includes("green") || lower.includes("thorn")) return AGENT_FAB_COLORS.thorn;
    if (lower.includes("gold") || lower.includes("reed")) return AGENT_FAB_COLORS.reed;
    if (lower.includes("charcoal") || lower.includes("cole") || lower.includes("dark")) return AGENT_FAB_COLORS.cole;
    if (lower.includes("yellow") || lower.includes("sol")) return AGENT_FAB_COLORS.sol;
  }
  const name = (agent.name || agent.id || "").toLowerCase();
  if (name.includes("clay")) return AGENT_FAB_COLORS.clay;
  if (name.includes("thorn")) return AGENT_FAB_COLORS.thorn;
  if (name.includes("reed")) return AGENT_FAB_COLORS.reed;
  if (name.includes("cole")) return AGENT_FAB_COLORS.cole;
  if (name.includes("sol")) return AGENT_FAB_COLORS.sol;
  return AGENT_FAB_COLORS.unknown;
}

interface FlavorSkin {
  background: string;
  gridColor: string;
  borderColor: string;
  signPost: string;
  signPlaque: string;
  signBorder: string;
  signText: string;
  puffColor: string;
}

const SKINS: Record<Flavor, FlavorSkin> = {
  garden: {
    background: "#d8e4c8",
    gridColor: "#b8c4a8",
    borderColor: "#6b8e4a",
    signPost: "#5a4020",
    signPlaque: "#c8a060",
    signBorder: "#8b6030",
    signText: "#5a4020",
    puffColor: "rgba(200,180,140,0.4)",
  },
  tabletop: {
    background: "#2a5a3a",
    gridColor: "#1a4a2a",
    borderColor: "#8b6030",
    signPost: "#3a2a10",
    signPlaque: "#a08050",
    signBorder: "#6b4020",
    signText: "#3a2a10",
    puffColor: "rgba(60,40,20,0.3)",
  },
  night: {
    background: "#1a1a2a",
    gridColor: "#2a2a3a",
    borderColor: "#4a4a6a",
    signPost: "#3a3a4a",
    signPlaque: "#5a5a6a",
    signBorder: "#4a4a5a",
    signText: "#8a8a9a",
    puffColor: "rgba(100,100,140,0.3)",
  },
  theater: {
    background: "#1a1210",
    gridColor: "#2a2018",
    borderColor: "#6a4a30",
    signPost: "#3a2a1a",
    signPlaque: "#c8a878",
    signBorder: "#8a6a4a",
    signText: "#4a3a2a",
    puffColor: "rgba(255,200,100,0.2)",
  },
  fab: {
    background: "#0a1018",
    gridColor: "#1a3030",
    borderColor: "#2a4a4a",
    signPost: "#3a5a5a",
    signPlaque: "#1a2828",
    signBorder: "#4a8080",
    signText: "#80c0c0",
    puffColor: "rgba(80,200,200,0.2)",
  },
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

function getAgentGlowColor(agent: Agent): string {
  const appearance = (agent as Agent & { appearance?: string }).appearance;
  if (appearance) {
    const lower = appearance.toLowerCase();
    if (lower.includes("brown") || lower.includes("clay")) return AGENT_GLOW_COLORS.clay;
    if (lower.includes("green") || lower.includes("thorn")) return AGENT_GLOW_COLORS.thorn;
    if (lower.includes("gold") || lower.includes("reed")) return AGENT_GLOW_COLORS.reed;
    if (lower.includes("charcoal") || lower.includes("cole") || lower.includes("dark")) return AGENT_GLOW_COLORS.cole;
    if (lower.includes("yellow") || lower.includes("sol")) return AGENT_GLOW_COLORS.sol;
  }
  const name = (agent.name || agent.id || "").toLowerCase();
  if (name.includes("clay")) return AGENT_GLOW_COLORS.clay;
  if (name.includes("thorn")) return AGENT_GLOW_COLORS.thorn;
  if (name.includes("reed")) return AGENT_GLOW_COLORS.reed;
  if (name.includes("cole")) return AGENT_GLOW_COLORS.cole;
  if (name.includes("sol")) return AGENT_GLOW_COLORS.sol;
  return AGENT_GLOW_COLORS.unknown;
}

function getEnergyPips(energy: number): number {
  if (energy >= 100) return 6;
  if (energy >= 80) return 5;
  if (energy >= 60) return 4;
  if (energy >= 40) return 3;
  if (energy >= 20) return 2;
  if (energy > 0) return 1;
  return 0;
}

interface LerpPosition {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  startTime: number;
  puffUntil: number;
  trail: Array<{ x: number; y: number; t: number }>;
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
        <option value="tabletop">{FLAVOR_LABELS.tabletop}</option>
        <option value="night">{FLAVOR_LABELS.night}</option>
        <option value="theater">{FLAVOR_LABELS.theater}</option>
        <option value="fab">{FLAVOR_LABELS.fab}</option>
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

function CanvasMap({ agents, signs, onSelectAgent, flavor }: { agents: Agent[]; signs: Sign[]; onSelectAgent: (agent: Agent) => void; flavor: Flavor }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lerpPositions = useRef<Map<string, LerpPosition>>(new Map());
  const prevPositions = useRef<Map<string, { x: number; y: number }>>(new Map());
  const animationRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  const getCurrentPositions = useCallback(() => {
    const now = Date.now();
    const positions = new Map<string, { x: number; y: number; puff: boolean; trail: Array<{ x: number; y: number; age: number }> }>();
    
    for (const agent of agents) {
      const lerp = lerpPositions.current.get(agent.id);
      if (lerp) {
        const elapsed = now - lerp.startTime;
        const t = Math.min(1, elapsed / LERP_DURATION);
        const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        const trail = lerp.trail
          .filter(p => now - p.t < 400)
          .map(p => ({ x: p.x, y: p.y, age: (now - p.t) / 400 }));
        positions.set(agent.id, {
          x: lerp.fromX + (lerp.toX - lerp.fromX) * eased,
          y: lerp.fromY + (lerp.toY - lerp.fromY) * eased,
          puff: now < lerp.puffUntil,
          trail,
        });
      } else {
        positions.set(agent.id, { x: agent.x, y: agent.y, puff: false, trail: [] });
      }
    }
    return positions;
  }, [agents]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const skin = SKINS[flavor];

    ctx.fillStyle = skin.background;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    ctx.strokeStyle = skin.gridColor;
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

    const positions = getCurrentPositions();

    if (flavor === "theater") {
      const spotlightAgent = agents.find(a => a.status === "idle" || a.status === "thinking") 
        || agents.find(a => a.status !== "sleeping" && a.status !== "downed")
        || agents[0];
      
      if (spotlightAgent) {
        const spotPos = positions.get(spotlightAgent.id) || { x: spotlightAgent.x, y: spotlightAgent.y };
        const spotCx = spotPos.x * CELL_SIZE + CELL_SIZE / 2;
        const spotCy = spotPos.y * CELL_SIZE + CELL_SIZE / 2;
        
        const gradient = ctx.createRadialGradient(spotCx, spotCy, 0, spotCx, spotCy, 80);
        gradient.addColorStop(0, "rgba(255,240,200,0.25)");
        gradient.addColorStop(0.4, "rgba(255,220,150,0.12)");
        gradient.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      }
    }

    for (const sign of signs) {
      const cx = sign.x * CELL_SIZE + CELL_SIZE / 2;
      const cy = sign.y * CELL_SIZE + CELL_SIZE / 2;
      
      if (flavor === "fab") {
        ctx.fillStyle = "#1a2828";
        ctx.strokeStyle = "#4a8080";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(cx - 9, cy - 5, 18, 10, 1);
        ctx.fill();
        ctx.stroke();
        
        ctx.fillStyle = "#80c0c0";
        ctx.font = "bold 4px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const label = sign.text.slice(0, 6).toUpperCase();
        ctx.fillText(label, cx, cy);
      } else if (flavor === "theater") {
        ctx.fillStyle = "#3a2a1a";
        ctx.fillRect(cx - 1, cy + 3, 2, 5);
        
        ctx.fillStyle = "#c8a878";
        ctx.strokeStyle = "#8a6a4a";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(cx - 10, cy - 6, 20, 12, 2);
        ctx.fill();
        ctx.stroke();
        
        ctx.fillStyle = "#4a3a2a";
        ctx.font = "bold 5px serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const label = sign.text.slice(0, 5).toUpperCase();
        ctx.fillText(label, cx, cy);
      } else {
        ctx.fillStyle = skin.signPost;
        ctx.fillRect(cx - 1, cy + 2, 2, 4);
        
        ctx.fillStyle = skin.signPlaque;
        ctx.strokeStyle = skin.signBorder;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.roundRect(cx - 8, cy - 4, 16, 8, 1);
        ctx.fill();
        ctx.stroke();
        
        ctx.fillStyle = skin.signText;
        ctx.font = "5px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const label = sign.text.slice(0, 5);
        ctx.fillText(label, cx, cy);
      }
    }

    for (const agent of agents) {
      const pos = positions.get(agent.id) || { x: agent.x, y: agent.y, puff: false, trail: [] };
      const cx = pos.x * CELL_SIZE + CELL_SIZE / 2;
      const cy = pos.y * CELL_SIZE + CELL_SIZE / 2;
      const color = getAgentColor(agent);
      const glowColor = getAgentGlowColor(agent);
      const isDimmed = agent.status === "sleeping" || agent.status === "downed";

      if (pos.puff) {
        ctx.fillStyle = skin.puffColor;
        ctx.beginPath();
        ctx.arc(cx, cy + 2, 6, 0, Math.PI * 2);
        ctx.fill();
      }

      if (flavor === "night") {
        ctx.globalAlpha = isDimmed ? 0.25 : 1;

        for (const tp of pos.trail) {
          const tcx = tp.x * CELL_SIZE + CELL_SIZE / 2;
          const tcy = tp.y * CELL_SIZE + CELL_SIZE / 2;
          ctx.globalAlpha = (1 - tp.age) * 0.3 * (isDimmed ? 0.25 : 1);
          ctx.fillStyle = glowColor;
          ctx.beginPath();
          ctx.arc(tcx, tcy, 3, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.globalAlpha = isDimmed ? 0.25 : 1;

        if (!isDimmed) {
          ctx.fillStyle = glowColor;
          ctx.globalAlpha = 0.3;
          ctx.beginPath();
          ctx.arc(cx, cy, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 0.5;
          ctx.beginPath();
          ctx.arc(cx, cy, 7, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.globalAlpha = isDimmed ? 0.25 : 1;
        ctx.fillStyle = glowColor;
        ctx.beginPath();
        ctx.arc(cx, cy, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.globalAlpha = (isDimmed ? 0.15 : 0.6);
        ctx.beginPath();
        ctx.arc(cx - 1, cy - 1, 1.5, 0, Math.PI * 2);
        ctx.fill();

      } else if (flavor === "tabletop") {
        ctx.globalAlpha = isDimmed ? 0.5 : 1;

        ctx.fillStyle = "#4a3020";
        ctx.beginPath();
        ctx.arc(cx, cy, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(cx, cy, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "#2a1a10";
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.arc(cx, cy, 5.5, 0, Math.PI * 2);
        ctx.stroke();

        const pips = getEnergyPips(agent.energy);
        if (pips > 0) {
          ctx.fillStyle = "rgba(255,255,255,0.8)";
          const pipPositions = [
            [[0, 0]],
            [[-1.5, 0], [1.5, 0]],
            [[-1.5, -1.5], [1.5, -1.5], [0, 1.5]],
            [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]],
            [[-1.5, -1.5], [1.5, -1.5], [0, 0], [-1.5, 1.5], [1.5, 1.5]],
            [[-1.5, -2], [1.5, -2], [-1.5, 0], [1.5, 0], [-1.5, 2], [1.5, 2]],
          ];
          const layout = pipPositions[Math.min(pips, 6) - 1];
          for (const [px, py] of layout) {
            ctx.beginPath();
            ctx.arc(cx + px, cy + py, 0.8, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } else if (flavor === "theater") {
        ctx.globalAlpha = isDimmed ? 0.15 : 1;

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(cx, cy + 1, 5, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(cx, cy - 2, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "rgba(255,255,200,0.4)";
        ctx.beginPath();
        ctx.arc(cx - 1, cy - 3, 1.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (flavor === "fab") {
        const fabColor = getAgentFabColor(agent);
        ctx.globalAlpha = isDimmed ? 0.35 : 1;

        ctx.fillStyle = "#0a1010";
        ctx.beginPath();
        ctx.roundRect(cx - 5, cy - 5, 10, 10, 1);
        ctx.fill();

        ctx.fillStyle = fabColor;
        ctx.beginPath();
        ctx.roundRect(cx - 4, cy - 4, 8, 8, 0.5);
        ctx.fill();

        ctx.strokeStyle = "#40c0c0";
        ctx.lineWidth = 0.3;
        ctx.beginPath();
        ctx.moveTo(cx - 5, cy - 2);
        ctx.lineTo(cx - 6, cy - 2);
        ctx.moveTo(cx - 5, cy);
        ctx.lineTo(cx - 6, cy);
        ctx.moveTo(cx - 5, cy + 2);
        ctx.lineTo(cx - 6, cy + 2);
        ctx.moveTo(cx + 5, cy - 2);
        ctx.lineTo(cx + 6, cy - 2);
        ctx.moveTo(cx + 5, cy);
        ctx.lineTo(cx + 6, cy);
        ctx.moveTo(cx + 5, cy + 2);
        ctx.lineTo(cx + 6, cy + 2);
        ctx.moveTo(cx - 2, cy - 5);
        ctx.lineTo(cx - 2, cy - 6);
        ctx.moveTo(cx, cy - 5);
        ctx.lineTo(cx, cy - 6);
        ctx.moveTo(cx + 2, cy - 5);
        ctx.lineTo(cx + 2, cy - 6);
        ctx.moveTo(cx - 2, cy + 5);
        ctx.lineTo(cx - 2, cy + 6);
        ctx.moveTo(cx, cy + 5);
        ctx.lineTo(cx, cy + 6);
        ctx.moveTo(cx + 2, cy + 5);
        ctx.lineTo(cx + 2, cy + 6);
        ctx.stroke();

        ctx.fillStyle = "rgba(100,200,200,0.6)";
        ctx.beginPath();
        ctx.arc(cx - 2, cy - 2, 0.8, 0, Math.PI * 2);
        ctx.fill();
      } else {
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
      }

      ctx.globalAlpha = 1;
    }
  }, [agents, signs, getCurrentPositions, flavor]);

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
          trail: [],
        });
      } else if (prev.x !== agent.x || prev.y !== agent.y) {
        const currentX = current ? current.fromX + (current.toX - current.fromX) * Math.min(1, (now - current.startTime) / LERP_DURATION) : prev.x;
        const currentY = current ? current.fromY + (current.toY - current.fromY) * Math.min(1, (now - current.startTime) / LERP_DURATION) : prev.y;
        const existingTrail = current?.trail.filter(p => now - p.t < 400) || [];
        existingTrail.push({ x: currentX, y: currentY, t: now });
        lerpPositions.current.set(agent.id, {
          fromX: currentX, fromY: currentY,
          toX: agent.x, toY: agent.y,
          startTime: now, puffUntil: now + 300,
          trail: existingTrail.slice(-5),
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

  const skin = SKINS[flavor];

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_SIZE}
      height={CANVAS_SIZE}
      onClick={handleClick}
      className="w-full max-w-[448px] aspect-square rounded-lg cursor-pointer shadow-md"
      style={{ border: `2px solid ${skin.borderColor}` }}
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
                  <CanvasMap agents={world.agents} signs={world.signs} onSelectAgent={handleSelectAgent} flavor={flavor} />
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
