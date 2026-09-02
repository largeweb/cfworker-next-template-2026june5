"use client";

import { useCallback, useEffect, useRef, useState, memo, useMemo } from "react";
import type { ViewProps } from "@/lib/world-types";
import type { Agent, Sign } from "@/lib/world-types";
import { getAgentSymbolType, getGridDimensions } from "@/lib/world-types";

const CELL_SIZE = 32;

const AGENT_GLOW: Record<string, string> = {
  clay: "#ff9070",
  thorn: "#8888aa",
  reed: "#e0d8c8",
  cole: "#666688",
  sol: "#ffdd70",
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
  const glow = AGENT_GLOW[symbolType];
  const isSleeping = agent.status === "sleeping";
  const isThinking = agent.status === "thinking";

  return (
    <div
      onClick={onClick}
      style={{
        position: "absolute",
        left: x * CELL_SIZE + CELL_SIZE / 2 - 8,
        top: y * CELL_SIZE + CELL_SIZE / 2 - 8,
        width: 16,
        height: 16,
        backgroundColor: glow,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: "bold",
        fontSize: 10,
        fontFamily: "serif",
        color: "#111",
        cursor: "pointer",
        opacity: isSleeping ? 0.4 : 0.9,
        border: isSelected ? "2px solid #fff" : "none",
        boxSizing: "border-box",
        boxShadow: `0 0 8px ${glow}`,
      }}
    >
      {agent.name.charAt(0).toUpperCase()}
      {isThinking && (
        <div
          style={{
            position: "absolute",
            top: -4,
            right: -4,
            width: 6,
            height: 6,
            backgroundColor: "#88f",
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
        left: sign.x * CELL_SIZE + CELL_SIZE / 2 - 10,
        top: sign.y * CELL_SIZE + CELL_SIZE / 2 - 6,
        width: 20,
        height: 12,
        backgroundColor: "#3a3520",
        borderRadius: 2,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 6,
        fontFamily: "monospace",
        color: "#aa9966",
        cursor: "pointer",
        border: isSelected ? "1px solid #fff" : "none",
        boxSizing: "border-box",
        boxShadow: "0 0 4px rgba(170,153,102,0.3)",
      }}
    >
      {sign.text.slice(0, 3)}
    </div>
  );
});

const Fireflies = memo(function Fireflies({ gridWidth, gridHeight }: { gridWidth: number; gridHeight: number }) {
  const flies = useMemo(() => {
    const result = [];
    for (let i = 0; i < 8; i++) {
      result.push({
        id: i,
        x: Math.random() * gridWidth * CELL_SIZE,
        y: Math.random() * gridHeight * CELL_SIZE,
        opacity: 0.3 + Math.random() * 0.5,
      });
    }
    return result;
  }, [gridWidth, gridHeight]);

  return (
    <>
      {flies.map((f) => (
        <div
          key={f.id}
          style={{
            position: "absolute",
            left: f.x,
            top: f.y,
            width: 4,
            height: 4,
            backgroundColor: "#ffff88",
            borderRadius: "50%",
            opacity: f.opacity,
            pointerEvents: "none",
          }}
        />
      ))}
    </>
  );
});

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
      style={{ backgroundColor: "#0a0814" }}
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
          backgroundColor: "#151020",
          backgroundImage: `
            repeating-linear-gradient(0deg, #1a1525 0px, #1a1525 1px, transparent 1px, transparent ${CELL_SIZE}px),
            repeating-linear-gradient(90deg, #1a1525 0px, #1a1525 1px, transparent 1px, transparent ${CELL_SIZE}px)
          `,
          backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px`,
        }}
      >
        <Fireflies gridWidth={gridWidth} gridHeight={gridHeight} />

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
          className="w-8 h-8 bg-[#1a1525] border border-[#333] rounded text-[#888] hover:bg-[#252035]">+</button>
        <button onClick={() => setZoom((z) => Math.max(0.3, z / 1.2))}
          className="w-8 h-8 bg-[#1a1525] border border-[#333] rounded text-[#888] hover:bg-[#252035]">−</button>
        <button onClick={centerView}
          className="px-3 h-8 bg-[#1a1525] border border-[#333] rounded text-xs text-[#888] hover:bg-[#252035]">Reset</button>
      </div>
    </div>
  );
}
