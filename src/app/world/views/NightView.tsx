"use client";

import { useCallback, useRef, useState } from "react";
import type { ViewProps } from "../WorldCanvas";
import type { Agent, Sign } from "@/lib/world-types";
import { getAgentSymbolType } from "@/lib/world-types";

const CELL_SIZE = 48;
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 2.5;

interface Position {
  x: number;
  y: number;
}

const NIGHT_TOKEN_COLORS: Record<string, { glow: string; core: string }> = {
  clay: { glow: "#e87c3f", core: "#c4644a" },
  thorn: { glow: "#6b6560", core: "#4a4540" },
  reed: { glow: "#d0c8b8", core: "#b8b0a0" },
  cole: { glow: "#555550", core: "#3d3835" },
  sol: { glow: "#ffd080", core: "#d4a54a" },
};

function NightToken({
  agent,
  position,
  isThinking,
  isSleeping,
  onClick,
  isSelected,
}: {
  agent: Agent;
  position: Position;
  isThinking: boolean;
  isSleeping: boolean;
  onClick: () => void;
  isSelected: boolean;
}) {
  const symbolType = getAgentSymbolType(agent.symbol);
  const c = NIGHT_TOKEN_COLORS[symbolType];

  return (
    <g
      transform={`translate(${position.x * CELL_SIZE + CELL_SIZE / 2}, ${position.y * CELL_SIZE + CELL_SIZE / 2})`}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      style={{ cursor: "pointer" }}
    >
      <circle cx={0} cy={0} r={20} fill={c.glow} opacity={isSleeping ? 0.15 : 0.3} />
      <rect x={-14} y={-14} width={28} height={28} rx={4} fill={c.core}
        stroke={isSelected ? "var(--garden-gold)" : "transparent"} strokeWidth={2} opacity={isSleeping ? 0.5 : 0.9} />
      <text x={0} y={5} textAnchor="middle" fill="var(--garden-paper)" fontSize={14} fontWeight="bold" fontFamily="serif" opacity={isSleeping ? 0.4 : 0.9}>
        {agent.name.charAt(0).toUpperCase()}
      </text>
      {isThinking && (
        <g>
          <circle cx={14} cy={-14} r={3} fill="var(--garden-ember)" />
          <circle cx={18} cy={-20} r={2} fill="var(--garden-ember)" opacity={0.7} />
        </g>
      )}
      {isSleeping && (
        <text x={14} y={-10} fontSize={10} fill="var(--garden-dust)" fontStyle="italic" fontFamily="cursive">z</text>
      )}
    </g>
  );
}

function NightSign({ sign, onClick, isSelected }: { sign: Sign; onClick: () => void; isSelected: boolean }) {
  return (
    <g
      transform={`translate(${sign.x * CELL_SIZE + CELL_SIZE / 2}, ${sign.y * CELL_SIZE + CELL_SIZE / 2})`}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      style={{ cursor: "pointer" }}
    >
      <rect x={-10} y={-6} width={20} height={12} rx={2} fill="var(--garden-wood-dark)"
        stroke={isSelected ? "var(--garden-gold)" : "var(--garden-coal)"} strokeWidth={isSelected ? 2 : 1} opacity={0.6} />
      <line x1={0} y1={6} x2={0} y2={14} stroke="var(--garden-coal)" strokeWidth={2} />
      <text x={0} y={2} textAnchor="middle" fill="var(--garden-dust)" fontSize={6} fontFamily="monospace" opacity={0.6}>
        {sign.text.slice(0, 3)}
      </text>
    </g>
  );
}

function Fireflies({ width, height }: { width: number; height: number }) {
  const fireflies = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    x: (i * 137 + 50) % width,
    y: (i * 89 + 30) % height,
    size: 1 + (i % 2),
  }));

  return (
    <g>
      {fireflies.map((f) => (
        <circle key={f.id} cx={f.x} cy={f.y} r={f.size} fill="var(--garden-gold)" opacity={0.6} />
      ))}
    </g>
  );
}

export default function NightView({
  world,
  animState,
  selectedAgent,
  selectedSign,
  onSelectAgent,
  onSelectSign,
}: ViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });

  const gridWidth = world.grid.width * CELL_SIZE;
  const gridHeight = world.grid.height * CELL_SIZE;

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * delta));
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    setPan({ x: mouseX - ((mouseX - pan.x) / zoom) * newZoom, y: mouseY - ((mouseY - pan.y) / zoom) * newZoom });
    setZoom(newZoom);
  }, [zoom, pan]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    panStart.current = { x: pan.x, y: pan.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [pan]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    setPan({ x: panStart.current.x + (e.clientX - dragStart.current.x), y: panStart.current.y + (e.clientY - dragStart.current.y) });
  }, [isDragging]);

  const handlePointerUp = useCallback(() => setIsDragging(false), []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden bg-[var(--garden-night-bg)] cursor-grab active:cursor-grabbing"
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <svg width="100%" height="100%" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "0 0" }}>
        <rect x={0} y={0} width={gridWidth} height={gridHeight} fill="var(--garden-night-bg)" />

        <circle cx={gridWidth * 0.8} cy={gridHeight * 0.1} r={15} fill="#ffeedd" opacity={0.8} />

        {Array.from({ length: world.grid.width + 1 }, (_, x) => (
          <line key={`v${x}`} x1={x * CELL_SIZE} y1={0} x2={x * CELL_SIZE} y2={gridHeight} stroke="var(--garden-coal)" strokeWidth={0.5} opacity={0.15} />
        ))}
        {Array.from({ length: world.grid.height + 1 }, (_, y) => (
          <line key={`h${y}`} x1={0} y1={y * CELL_SIZE} x2={gridWidth} y2={y * CELL_SIZE} stroke="var(--garden-coal)" strokeWidth={0.5} opacity={0.15} />
        ))}

        <Fireflies width={gridWidth} height={gridHeight} />

        <g>
          {world.signs.map((sign) => (
            <NightSign key={sign.id} sign={sign} onClick={() => onSelectSign(sign)} isSelected={selectedSign?.id === sign.id} />
          ))}
        </g>

        <g>
          {world.agents.map((agent) => {
            const pos = animState.agentPositions.get(agent.id) || { x: agent.x, y: agent.y };
            return (
              <NightToken
                key={agent.id}
                agent={agent}
                position={pos}
                isThinking={animState.thinkingAgents.has(agent.id)}
                isSleeping={agent.status === "sleeping"}
                onClick={() => onSelectAgent(agent)}
                isSelected={selectedAgent?.id === agent.id}
              />
            );
          })}
        </g>
      </svg>

      <div className="absolute bottom-4 left-4 flex gap-2">
        <button onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z * 1.2))}
          className="w-8 h-8 bg-[var(--garden-coal)] border border-[var(--garden-thorn)] rounded text-[var(--garden-dust)] hover:bg-[var(--garden-thorn)]">+</button>
        <button onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z / 1.2))}
          className="w-8 h-8 bg-[var(--garden-coal)] border border-[var(--garden-thorn)] rounded text-[var(--garden-dust)] hover:bg-[var(--garden-thorn)]">−</button>
      </div>
    </div>
  );
}
