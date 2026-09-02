"use client";

import { useCallback, useEffect, useRef, useState, memo } from "react";
import type { ViewProps } from "../WorldCanvas";
import type { Agent, Sign } from "@/lib/world-types";
import { getAgentSymbolType, getGridDimensions } from "@/lib/world-types";

const CELL_SIZE = 48;

const AGENT_COLORS: Record<string, { bg: string; text: string }> = {
  clay: { bg: "#c4644a", text: "#fff" },
  thorn: { bg: "#4a4540", text: "#ccc" },
  reed: { bg: "#b8b0a0", text: "#333" },
  cole: { bg: "#3d3835", text: "#ccc" },
  sol: { bg: "#d4a54a", text: "#333" },
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
  const c = AGENT_COLORS[symbolType];
  const isSleeping = agent.status === "sleeping";
  const isThinking = agent.status === "thinking";

  return (
    <div
      onClick={onClick}
      style={{
        position: "absolute",
        left: x * CELL_SIZE + CELL_SIZE / 2 - 16,
        top: y * CELL_SIZE + CELL_SIZE / 2 - 16,
        width: 32,
        height: 32,
        backgroundColor: c.bg,
        color: c.text,
        borderRadius: 4,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: "bold",
        fontSize: 14,
        fontFamily: "serif",
        cursor: "pointer",
        opacity: isSleeping ? 0.5 : 1,
        border: isSelected ? "3px solid #6b7c5a" : "2px solid rgba(0,0,0,0.2)",
        boxSizing: "border-box",
      }}
    >
      {agent.name.charAt(0).toUpperCase()}
      {isThinking && (
        <div
          style={{
            position: "absolute",
            top: -8,
            right: -8,
            width: 12,
            height: 12,
            backgroundColor: "#6b7c5a",
            borderRadius: "50%",
          }}
        />
      )}
      {isSleeping && (
        <div
          style={{
            position: "absolute",
            top: -6,
            right: -4,
            fontSize: 10,
            color: "#666",
            fontStyle: "italic",
          }}
        >
          z
        </div>
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
        left: sign.x * CELL_SIZE + CELL_SIZE / 2 - 12,
        top: sign.y * CELL_SIZE + CELL_SIZE / 2 - 8,
        width: 24,
        height: 16,
        backgroundColor: "#8b6f47",
        borderRadius: 2,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 7,
        fontFamily: "monospace",
        color: "#fff",
        cursor: "pointer",
        border: isSelected ? "2px solid #6b7c5a" : "1px solid #5c4a32",
        boxSizing: "border-box",
      }}
    >
      {sign.text.slice(0, 4)}
    </div>
  );
});

export default function JournalView({
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
  const [initialized, setInitialized] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });

  const { width: gridWidth, height: gridHeight } = getGridDimensions(world.grid);
  const pixelWidth = gridWidth * CELL_SIZE;
  const pixelHeight = gridHeight * CELL_SIZE;

  const centerGrid = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setPan({ x: (rect.width - pixelWidth) / 2, y: (rect.height - pixelHeight) / 2 });
    setZoom(1);
  }, [pixelWidth, pixelHeight]);

  useEffect(() => {
    if (!initialized && containerRef.current && gridWidth > 0) {
      centerGrid();
      setInitialized(true);
    }
  }, [initialized, centerGrid, gridWidth]);

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
      style={{ backgroundColor: "var(--garden-paper)" }}
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
          backgroundColor: "var(--garden-paper)",
          border: "2px solid var(--garden-dust)",
          backgroundImage: `
            repeating-linear-gradient(0deg, var(--garden-dust) 0px, var(--garden-dust) 1px, transparent 1px, transparent ${CELL_SIZE}px),
            repeating-linear-gradient(90deg, var(--garden-dust) 0px, var(--garden-dust) 1px, transparent 1px, transparent ${CELL_SIZE}px)
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

      <div className="absolute bottom-4 left-4 flex gap-2">
        <button onClick={() => setZoom((z) => Math.min(2.5, z * 1.2))}
          className="w-8 h-8 bg-[var(--garden-paper-dark)] border border-[var(--garden-dust)] rounded text-[var(--garden-ink)] hover:bg-[var(--garden-dust-light)]">+</button>
        <button onClick={() => setZoom((z) => Math.max(0.3, z / 1.2))}
          className="w-8 h-8 bg-[var(--garden-paper-dark)] border border-[var(--garden-dust)] rounded text-[var(--garden-ink)] hover:bg-[var(--garden-dust-light)]">−</button>
        <button onClick={centerGrid}
          className="px-3 h-8 bg-[var(--garden-paper-dark)] border border-[var(--garden-dust)] rounded text-xs text-[var(--garden-ink)] hover:bg-[var(--garden-dust-light)]">Reset</button>
      </div>
    </div>
  );
}
