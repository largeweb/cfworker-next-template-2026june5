"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ViewProps } from "../WorldCanvas";
import { getAgentSymbolType } from "@/lib/world-types";
import type { Agent, Sign } from "@/lib/world-types";

const CELL_SIZE = 24;
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 2.5;

interface Position {
  x: number;
  y: number;
}

const AGENT_COLORS: Record<string, string> = {
  clay: "#c4644a",
  thorn: "#4a4540",
  reed: "#b8b0a0",
  cole: "#3d3835",
  sol: "#d4a54a",
};

function GardenToken({
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
  const color = AGENT_COLORS[symbolType] || "#c4644a";

  return (
    <g
      transform={`translate(${position.x * CELL_SIZE + CELL_SIZE / 2}, ${position.y * CELL_SIZE + CELL_SIZE / 2})`}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      style={{ cursor: "pointer" }}
      className={isSleeping ? "" : "animate-pulse"}
    >
      <ellipse cx={0} cy={10} rx={8} ry={3} fill="rgba(0,0,0,0.15)" />
      <rect x={-7} y={-10} width={14} height={20} rx={2} fill={color}
        stroke={isSelected ? "#6b8e4a" : "transparent"} strokeWidth={2} opacity={isSleeping ? 0.5 : 1} />
      <text x={0} y={4} textAnchor="middle" fill="#fff" fontSize={12} fontWeight="bold" fontFamily="serif">
        {agent.name.charAt(0).toUpperCase()}
      </text>
      {isThinking && (
        <g className="animate-pulse">
          <circle cx={10} cy={-12} r={4} fill="#6b8e4a" />
        </g>
      )}
      {isSleeping && (
        <text x={10} y={-8} fontSize={8} fill="#666" fontStyle="italic">z</text>
      )}
    </g>
  );
}

function GardenSign({ sign, onClick, isSelected }: { sign: Sign; onClick: () => void; isSelected: boolean }) {
  return (
    <g
      transform={`translate(${sign.x * CELL_SIZE + CELL_SIZE / 2}, ${sign.y * CELL_SIZE + CELL_SIZE / 2})`}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      style={{ cursor: "pointer" }}
    >
      <rect x={-1} y={3} width={2} height={6} fill="#5c4a32" />
      <rect x={-6} y={-4} width={12} height={8} rx={1} fill="#8b6f47"
        stroke={isSelected ? "#6b8e4a" : "#5c4a32"} strokeWidth={isSelected ? 1.5 : 0.5} />
      <text x={0} y={1} textAnchor="middle" fill="#fff" fontSize={5} fontFamily="monospace">
        {sign.text.slice(0, 3)}
      </text>
    </g>
  );
}

function Tree({ x, y, height }: { x: number; y: number; height: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x={-2} y={0} width={4} height={height * 0.4} fill="#5c4a32" />
      <polygon points={`0,${-height * 0.6} ${-8},${height * 0.1} ${8},${height * 0.1}`} fill="#4a5a3d" />
    </g>
  );
}

export default function ThreeView({
  world,
  animState,
  selectedAgent,
  selectedSign,
  onSelectAgent,
  onSelectSign,
}: ViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(0.8);
  const [isDragging, setIsDragging] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });

  const gridWidth = world.grid.width * CELL_SIZE;
  const gridHeight = world.grid.height * CELL_SIZE;

  const centerView = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setPan({ x: (rect.width - gridWidth * zoom) / 2, y: (rect.height - gridHeight * zoom) / 2 });
  }, [gridWidth, gridHeight, zoom]);

  useEffect(() => {
    if (!initialized && containerRef.current) {
      centerView();
      setInitialized(true);
    }
  }, [initialized, centerView]);

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

  const trees = Array.from({ length: 8 }, (_, i) => ({
    x: (i * 137 + 50) % gridWidth,
    y: (i * 89 + 30) % gridHeight,
    height: 15 + (i % 3) * 5,
  }));

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden cursor-grab active:cursor-grabbing"
      style={{ background: "#d9e6cf" }}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <svg width="100%" height="100%" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "0 0" }}>
        <rect x={-10} y={-10} width={gridWidth + 20} height={gridHeight + 20} fill="#8b9a6b" />

        {Array.from({ length: world.grid.width + 1 }, (_, x) => (
          <line key={`v${x}`} x1={x * CELL_SIZE} y1={0} x2={x * CELL_SIZE} y2={gridHeight} stroke="#6b7c5a" strokeWidth={0.5} opacity={0.5} />
        ))}
        {Array.from({ length: world.grid.height + 1 }, (_, y) => (
          <line key={`h${y}`} x1={0} y1={y * CELL_SIZE} x2={gridWidth} y2={y * CELL_SIZE} stroke="#6b7c5a" strokeWidth={0.5} opacity={0.5} />
        ))}

        <g>
          {trees.map((tree, i) => (
            <Tree key={i} x={tree.x} y={tree.y} height={tree.height} />
          ))}
        </g>

        <g>
          {world.signs.map((sign) => (
            <GardenSign key={sign.id} sign={sign} onClick={() => onSelectSign(sign)} isSelected={selectedSign?.id === sign.id} />
          ))}
        </g>

        <g>
          {world.agents.map((agent) => {
            const pos = animState.agentPositions.get(agent.id) || { x: agent.x, y: agent.y };
            return (
              <GardenToken
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

      <div className="absolute top-2 left-2 bg-[#d9e6cf]/80 px-2 py-1 rounded text-xs text-[#4a5a3d]">
        Garden (2D)
      </div>
      <div className="absolute bottom-4 left-4 flex gap-2">
        <button onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z * 1.2))}
          className="w-8 h-8 bg-[#d9e6cf] border border-[#6b7c5a] rounded text-[#4a5a3d] hover:bg-[#c9d6bf]">+</button>
        <button onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z / 1.2))}
          className="w-8 h-8 bg-[#d9e6cf] border border-[#6b7c5a] rounded text-[#4a5a3d] hover:bg-[#c9d6bf]">−</button>
        <button onClick={centerView}
          className="px-3 h-8 bg-[#d9e6cf] border border-[#6b7c5a] rounded text-xs text-[#4a5a3d] hover:bg-[#c9d6bf]">Reset</button>
      </div>
    </div>
  );
}
