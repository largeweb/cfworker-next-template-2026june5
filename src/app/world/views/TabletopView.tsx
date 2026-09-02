"use client";

import { useCallback, useEffect, useRef, useState, memo } from "react";
import type { ViewProps } from "@/lib/world-types";
import type { Agent, Sign } from "@/lib/world-types";
import { getAgentSymbolType, getGridDimensions } from "@/lib/world-types";

const CELL_SIZE = 40;

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
        left: x * CELL_SIZE + CELL_SIZE / 2 - 12,
        top: y * CELL_SIZE + CELL_SIZE / 2 - 12,
        width: 24,
        height: 24,
        backgroundColor: color,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: "bold",
        fontSize: 14,
        fontFamily: "serif",
        color: "#fff",
        cursor: "pointer",
        opacity: isSleeping ? 0.5 : 1,
        border: isSelected ? "3px solid #d4af37" : "2px solid #333",
        boxSizing: "border-box",
        boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
      }}
    >
      {agent.name.charAt(0).toUpperCase()}
      {isThinking && (
        <div
          style={{
            position: "absolute",
            top: -5,
            right: -5,
            width: 10,
            height: 10,
            backgroundColor: "#4a90d9",
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
        left: sign.x * CELL_SIZE + CELL_SIZE / 2 - 8,
        top: sign.y * CELL_SIZE + CELL_SIZE / 2 - 6,
        width: 16,
        height: 12,
        backgroundColor: "#654321",
        borderRadius: 2,
        cursor: "pointer",
        border: isSelected ? "1px solid #d4af37" : "none",
        boxSizing: "border-box",
      }}
    />
  );
});

function DiceRoll({ agentName }: { agentName: string }) {
  const [value, setValue] = useState(0);
  const [rolling, setRolling] = useState(true);

  useEffect(() => {
    if (!rolling) return;
    let count = 0;
    const interval = setInterval(() => {
      setValue(Math.floor(Math.random() * 20) + 1);
      count++;
      if (count > 10) { clearInterval(interval); setRolling(false); }
    }, 100);
    return () => clearInterval(interval);
  }, [rolling]);

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#2d2420] p-2 rounded border border-[#d4af37]">
      <div className="text-[#d4af37] text-xs mb-1 text-center">{agentName} rolls</div>
      <div className="w-10 h-10 bg-[#1a1512] border-2 border-[#8b7355] rounded flex items-center justify-center text-xl font-bold text-[#f4e4bc]">
        {value || "?"}
      </div>
    </div>
  );
}

export default function TabletopView({
  world,
  animState,
  selectedAgent,
  selectedSign,
  onSelectAgent,
  onSelectSign,
}: ViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(0.7);
  const [isDragging, setIsDragging] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });

  const { width: gridWidth, height: gridHeight } = getGridDimensions(world.grid);
  const pixelWidth = gridWidth * CELL_SIZE;
  const pixelHeight = gridHeight * CELL_SIZE;

  const showDice = animState.thinkingAgents.size > 0;
  const thinkingAgentName = showDice ? world.agents.find(a => animState.thinkingAgents.has(a.id))?.name || "Agent" : "";

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
      style={{ backgroundColor: "#1a1512" }}
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
          backgroundColor: "#3d3428",
          backgroundImage: `
            repeating-linear-gradient(0deg, #2d2420 0px, #2d2420 1px, transparent 1px, transparent ${CELL_SIZE}px),
            repeating-linear-gradient(90deg, #2d2420 0px, #2d2420 1px, transparent 1px, transparent ${CELL_SIZE}px)
          `,
          backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px`,
          boxShadow: "inset 0 0 40px rgba(0,0,0,0.5)",
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

      {showDice && <DiceRoll key={thinkingAgentName} agentName={thinkingAgentName} />}

      <div className="absolute bottom-4 left-4 flex gap-2">
        <button onClick={() => setZoom((z) => Math.min(2.5, z * 1.2))}
          className="w-8 h-8 bg-[#2d2420] border border-[#8b7355] rounded text-[#f4e4bc] hover:bg-[#3d3428]">+</button>
        <button onClick={() => setZoom((z) => Math.max(0.3, z / 1.2))}
          className="w-8 h-8 bg-[#2d2420] border border-[#8b7355] rounded text-[#f4e4bc] hover:bg-[#3d3428]">−</button>
        <button onClick={centerView}
          className="px-3 h-8 bg-[#2d2420] border border-[#8b7355] rounded text-xs text-[#f4e4bc] hover:bg-[#3d3428]">Reset</button>
      </div>
    </div>
  );
}
