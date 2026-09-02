"use client";

import { useCallback, useEffect, useRef, useState, memo } from "react";
import type { ViewProps } from "../WorldCanvas";
import type { Agent, Sign } from "@/lib/world-types";
import { getAgentSymbolType, getGridDimensions } from "@/lib/world-types";

const CELL_SIZE = 24;

const AGENT_COLORS: Record<string, string> = {
  clay: "#c4644a",
  thorn: "#4a4540",
  reed: "#b8b0a0",
  cole: "#3d3835",
  sol: "#d4a54a",
};

const AgentToken = memo(function AgentToken({
  agent,
  x,
  y,
  isSelected,
  onClick,
}: {
  agent: Agent;
  x: number;
  y: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  const symbolType = getAgentSymbolType(agent.symbol);
  const color = AGENT_COLORS[symbolType];
  const isSleeping = agent.status === "sleeping";
  const isThinking = agent.status === "thinking";

  return (
    <div
      onClick={onClick}
      style={{
        position: "absolute",
        left: x * CELL_SIZE + CELL_SIZE / 2 - 7,
        top: y * CELL_SIZE + CELL_SIZE / 2 - 10,
        width: 14,
        height: 20,
        backgroundColor: color,
        borderRadius: 2,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: "bold",
        fontSize: 12,
        fontFamily: "serif",
        color: "#fff",
        cursor: "pointer",
        opacity: isSleeping ? 0.5 : 1,
        border: isSelected ? "2px solid #6b8e4a" : "none",
        boxSizing: "border-box",
        boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
      }}
    >
      {agent.name.charAt(0).toUpperCase()}
      {isThinking && (
        <div
          style={{
            position: "absolute",
            top: -6,
            right: -6,
            width: 8,
            height: 8,
            backgroundColor: "#6b8e4a",
            borderRadius: "50%",
          }}
        />
      )}
    </div>
  );
});

const SignToken = memo(function SignToken({
  sign,
  isSelected,
  onClick,
}: {
  sign: Sign;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        position: "absolute",
        left: sign.x * CELL_SIZE + CELL_SIZE / 2 - 6,
        top: sign.y * CELL_SIZE + CELL_SIZE / 2 - 4,
        width: 12,
        height: 8,
        backgroundColor: "#8b6f47",
        borderRadius: 1,
        cursor: "pointer",
        border: isSelected ? "1px solid #6b8e4a" : "none",
        boxSizing: "border-box",
      }}
    />
  );
});

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

  const { width: gridWidth, height: gridHeight } = getGridDimensions(world.grid);
  const pixelWidth = gridWidth * CELL_SIZE;
  const pixelHeight = gridHeight * CELL_SIZE;

  const centerView = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setPan({ x: (rect.width - pixelWidth * zoom) / 2, y: (rect.height - pixelHeight * zoom) / 2 });
  }, [pixelWidth, pixelHeight, zoom]);

  useEffect(() => {
    if (!initialized && containerRef.current && gridWidth > 0) {
      centerView();
      setInitialized(true);
    }
  }, [initialized, centerView, gridWidth]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.3, Math.min(2.5, zoom * delta));
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
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, [pan]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    setPan({ x: panStart.current.x + (e.clientX - dragStart.current.x), y: panStart.current.y + (e.clientY - dragStart.current.y) });
  }, [isDragging]);

  const handlePointerUp = useCallback(() => setIsDragging(false), []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden cursor-grab active:cursor-grabbing"
      style={{ backgroundColor: "#d9e6cf" }}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <div
        style={{
          position: "relative",
          width: pixelWidth,
          height: pixelHeight,
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "0 0",
          backgroundColor: "#8b9a6b",
          backgroundImage: `
            repeating-linear-gradient(0deg, #6b7c5a 0px, #6b7c5a 1px, transparent 1px, transparent ${CELL_SIZE}px),
            repeating-linear-gradient(90deg, #6b7c5a 0px, #6b7c5a 1px, transparent 1px, transparent ${CELL_SIZE}px)
          `,
          backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px`,
        }}
      >
        {world.signs.map((sign) => (
          <SignToken
            key={sign.id}
            sign={sign}
            isSelected={selectedSign?.id === sign.id}
            onClick={() => onSelectSign(sign)}
          />
        ))}

        {world.agents.map((agent) => {
          const pos = animState.agentPositions.get(agent.id) || { x: agent.x, y: agent.y };
          return (
            <AgentToken
              key={agent.id}
              agent={agent}
              x={pos.x}
              y={pos.y}
              isSelected={selectedAgent?.id === agent.id}
              onClick={() => onSelectAgent(agent)}
            />
          );
        })}
      </div>

      <div className="absolute top-2 left-2 bg-[#d9e6cf]/80 px-2 py-1 rounded text-xs text-[#4a5a3d]">
        Garden (2D)
      </div>
      <div className="absolute bottom-4 left-4 flex gap-2">
        <button onClick={() => setZoom((z) => Math.min(2.5, z * 1.2))}
          className="w-8 h-8 bg-[#d9e6cf] border border-[#6b7c5a] rounded text-[#4a5a3d] hover:bg-[#c9d6bf]">+</button>
        <button onClick={() => setZoom((z) => Math.max(0.3, z / 1.2))}
          className="w-8 h-8 bg-[#d9e6cf] border border-[#6b7c5a] rounded text-[#4a5a3d] hover:bg-[#c9d6bf]">−</button>
        <button onClick={centerView}
          className="px-3 h-8 bg-[#d9e6cf] border border-[#6b7c5a] rounded text-xs text-[#4a5a3d] hover:bg-[#c9d6bf]">Reset</button>
      </div>
    </div>
  );
}
