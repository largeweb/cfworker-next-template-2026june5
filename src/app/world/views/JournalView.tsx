"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

function AgentToken({
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
  const [breathPhase, setBreathPhase] = useState(0);

  useEffect(() => {
    let frame: number;
    const animate = () => {
      setBreathPhase((p) => (p + 0.015) % (Math.PI * 2));
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  const breathScale = 1 + Math.sin(breathPhase) * 0.02;
  const idleShift = Math.sin(breathPhase * 0.7) * 1;

  const colors: Record<string, { bg: string; border: string; text: string }> = {
    clay: {
      bg: "var(--garden-terracotta)",
      border: "var(--garden-terracotta-dark)",
      text: "var(--garden-paper)",
    },
    thorn: {
      bg: "var(--garden-thorn)",
      border: "var(--garden-coal)",
      text: "var(--garden-dust)",
    },
    reed: {
      bg: "var(--garden-reed)",
      border: "var(--garden-dust)",
      text: "var(--garden-ink)",
    },
    cole: {
      bg: "var(--garden-coal)",
      border: "var(--garden-thorn)",
      text: "var(--garden-dust)",
    },
    sol: {
      bg: "var(--garden-gold)",
      border: "var(--garden-wood)",
      text: "var(--garden-ink)",
    },
  };

  const c = colors[symbolType];

  return (
    <g
      transform={`translate(${position.x * CELL_SIZE + CELL_SIZE / 2}, ${
        position.y * CELL_SIZE + CELL_SIZE / 2 + idleShift
      }) scale(${breathScale})`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{ cursor: "pointer" }}
    >
      <rect
        x={-16}
        y={-16}
        width={32}
        height={32}
        rx={4}
        fill={c.bg}
        stroke={isSelected ? "var(--garden-olive)" : c.border}
        strokeWidth={isSelected ? 3 : 2}
        opacity={isSleeping ? 0.5 : 1}
        className="transition-opacity duration-500"
      />
      <text
        x={0}
        y={6}
        textAnchor="middle"
        fill={c.text}
        fontSize={14}
        fontWeight="bold"
        fontFamily="serif"
        opacity={isSleeping ? 0.6 : 1}
      >
        {agent.name.charAt(0).toUpperCase()}
      </text>

      {isThinking && (
        <g>
          <circle
            cx={14}
            cy={-14}
            r={4}
            fill="var(--garden-olive)"
            opacity={0.7 + Math.sin(breathPhase * 3) * 0.3}
          />
          <circle
            cx={18}
            cy={-20}
            r={2.5}
            fill="var(--garden-olive)"
            opacity={0.5 + Math.sin(breathPhase * 3 + 0.5) * 0.3}
          />
          <circle
            cx={20}
            cy={-26}
            r={1.5}
            fill="var(--garden-olive)"
            opacity={0.3 + Math.sin(breathPhase * 3 + 1) * 0.3}
          />
        </g>
      )}

      {isSleeping && (
        <text
          x={16}
          y={-12}
          fontSize={10}
          fill="var(--garden-ink-light)"
          fontStyle="italic"
          fontFamily="cursive"
          opacity={0.5 + Math.sin(breathPhase * 0.5) * 0.3}
        >
          z
        </text>
      )}
    </g>
  );
}

function SignMarker({
  sign,
  onClick,
  isSelected,
}: {
  sign: Sign;
  onClick: () => void;
  isSelected: boolean;
}) {
  const preview = sign.text.slice(0, 4);

  return (
    <g
      transform={`translate(${sign.x * CELL_SIZE + CELL_SIZE / 2}, ${
        sign.y * CELL_SIZE + CELL_SIZE / 2
      })`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{ cursor: "pointer" }}
    >
      <rect
        x={-12}
        y={-8}
        width={24}
        height={16}
        rx={2}
        fill="var(--garden-wood)"
        stroke={isSelected ? "var(--garden-olive)" : "var(--garden-wood-dark)"}
        strokeWidth={isSelected ? 2 : 1}
      />
      <line
        x1={0}
        y1={8}
        x2={0}
        y2={16}
        stroke="var(--garden-wood-dark)"
        strokeWidth={3}
      />
      <text
        x={0}
        y={3}
        textAnchor="middle"
        fill="var(--garden-paper)"
        fontSize={7}
        fontFamily="monospace"
        fontWeight="bold"
      >
        {preview}
      </text>
    </g>
  );
}

export default function JournalView({
  world,
  animState,
  selectedAgent,
  selectedSign,
  onSelectAgent,
  onSelectSign,
  followedAgentId,
}: ViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });

  const gridWidth = world.grid.width * CELL_SIZE;
  const gridHeight = world.grid.height * CELL_SIZE;

  useEffect(() => {
    if (followedAgentId) {
      const pos = animState.agentPositions.get(followedAgentId);
      if (pos && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setPan({
          x: rect.width / 2 - pos.x * CELL_SIZE * zoom - CELL_SIZE / 2,
          y: rect.height / 2 - pos.y * CELL_SIZE * zoom - CELL_SIZE / 2,
        });
      }
    }
  }, [followedAgentId, animState.agentPositions, zoom]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * delta));

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const newPanX = mouseX - ((mouseX - pan.x) / zoom) * newZoom;
      const newPanY = mouseY - ((mouseY - pan.y) / zoom) * newZoom;

      setZoom(newZoom);
      setPan({ x: newPanX, y: newPanY });
    },
    [zoom, pan]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      setIsDragging(true);
      dragStart.current = { x: e.clientX, y: e.clientY };
      panStart.current = { x: pan.x, y: pan.y };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [pan]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setPan({
        x: panStart.current.x + dx,
        y: panStart.current.y + dy,
      });
    },
    [isDragging]
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const gridLines = [];
  for (let x = 0; x <= world.grid.width; x++) {
    gridLines.push(
      <line
        key={`v${x}`}
        x1={x * CELL_SIZE}
        y1={0}
        x2={x * CELL_SIZE}
        y2={gridHeight}
        stroke="var(--garden-dust)"
        strokeWidth={0.5}
        opacity={0.5}
      />
    );
  }
  for (let y = 0; y <= world.grid.height; y++) {
    gridLines.push(
      <line
        key={`h${y}`}
        x1={0}
        y1={y * CELL_SIZE}
        x2={gridWidth}
        y2={y * CELL_SIZE}
        stroke="var(--garden-dust)"
        strokeWidth={0.5}
        opacity={0.5}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden bg-[var(--garden-paper)] cursor-grab active:cursor-grabbing"
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E")`,
      }}
    >
      <svg
        width="100%"
        height="100%"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "0 0",
        }}
      >
        <defs>
          <pattern
            id="paper-texture"
            patternUnits="userSpaceOnUse"
            width={100}
            height={100}
          >
            <filter id="paper-noise">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.9"
                numOctaves="4"
              />
            </filter>
            <rect width="100%" height="100%" filter="url(#paper-noise)" opacity="0.02" />
          </pattern>
        </defs>

        <rect
          x={0}
          y={0}
          width={gridWidth}
          height={gridHeight}
          fill="var(--garden-paper)"
          stroke="var(--garden-dust)"
          strokeWidth={2}
        />
        <rect
          x={0}
          y={0}
          width={gridWidth}
          height={gridHeight}
          fill="url(#paper-texture)"
        />

        <g>{gridLines}</g>

        <g>
          {world.signs.map((sign) => (
            <SignMarker
              key={sign.id}
              sign={sign}
              onClick={() => onSelectSign(sign)}
              isSelected={selectedSign?.id === sign.id}
            />
          ))}
        </g>

        <g>
          {world.agents.map((agent) => {
            const pos = animState.agentPositions.get(agent.id) || {
              x: agent.x,
              y: agent.y,
            };
            const isThinking = animState.thinkingAgents.has(agent.id);
            const isSleeping = agent.status === "sleeping";

            return (
              <AgentToken
                key={agent.id}
                agent={agent}
                position={pos}
                isThinking={isThinking}
                isSleeping={isSleeping}
                onClick={() => onSelectAgent(agent)}
                isSelected={selectedAgent?.id === agent.id}
              />
            );
          })}
        </g>
      </svg>

      <div className="absolute bottom-4 left-4 flex gap-2">
        <button
          onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z * 1.2))}
          className="w-8 h-8 bg-[var(--garden-paper-dark)] border border-[var(--garden-dust)] rounded text-[var(--garden-ink)] hover:bg-[var(--garden-dust-light)] transition-colors"
        >
          +
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z / 1.2))}
          className="w-8 h-8 bg-[var(--garden-paper-dark)] border border-[var(--garden-dust)] rounded text-[var(--garden-ink)] hover:bg-[var(--garden-dust-light)] transition-colors"
        >
          −
        </button>
        <button
          onClick={() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
          className="px-3 h-8 bg-[var(--garden-paper-dark)] border border-[var(--garden-dust)] rounded text-xs text-[var(--garden-ink)] hover:bg-[var(--garden-dust-light)] transition-colors"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
