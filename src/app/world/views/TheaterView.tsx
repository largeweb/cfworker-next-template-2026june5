"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ViewProps } from "../WorldCanvas";
import type { Agent, Sign } from "@/lib/world-types";
import { getAgentSymbolType } from "@/lib/world-types";

const CELL_SIZE = 32;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2;

interface Position {
  x: number;
  y: number;
}

function ThoughtStage({
  agents,
  onSelectAgent,
  selectedAgentId,
}: {
  agents: Agent[];
  onSelectAgent: (agent: Agent) => void;
  selectedAgentId: string | null;
}) {
  const thinkingAgents = agents.filter((a) => a.thought);
  const featured = selectedAgentId
    ? agents.find((a) => a.id === selectedAgentId)
    : thinkingAgents[0];

  if (!featured?.thought) {
    return (
      <div className="h-48 flex items-center justify-center text-[var(--garden-ink-light)] font-serif italic border-b border-[var(--garden-dust)]">
        The garden is quiet. No thoughts drift through.
      </div>
    );
  }

  const symbolType = getAgentSymbolType(featured.symbol);
  const colors: Record<string, string> = {
    clay: "var(--garden-terracotta)",
    thorn: "var(--garden-thorn)",
    reed: "var(--garden-reed)",
    cole: "var(--garden-coal)",
    sol: "var(--garden-gold)",
  };

  return (
    <div className="border-b border-[var(--garden-dust)] p-6 bg-[var(--garden-paper-dark)]/50">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--garden-paper)] font-bold text-lg"
            style={{ backgroundColor: colors[symbolType] }}
          >
            {featured.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-bold text-[var(--garden-ink)]">{featured.name}</div>
            <div className="text-xs text-[var(--garden-ink-light)] capitalize">
              {featured.status} · {featured.energy} energy · {featured.health} health
            </div>
          </div>
        </div>

        <blockquote className="font-serif text-lg text-[var(--garden-ink)] leading-relaxed pl-4 border-l-2 border-[var(--garden-olive)]">
          {featured.thought}
        </blockquote>

        <div className="flex gap-2 mt-4">
          {thinkingAgents.map((agent) => (
            <button
              key={agent.id}
              onClick={() => onSelectAgent(agent)}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                agent.id === featured.id
                  ? "ring-2 ring-[var(--garden-olive)] ring-offset-2 ring-offset-[var(--garden-paper)]"
                  : "opacity-50 hover:opacity-100"
              }`}
              style={{
                backgroundColor: colors[getAgentSymbolType(agent.symbol)],
                color: "var(--garden-paper)",
              }}
              title={agent.name}
            >
              {agent.name.charAt(0).toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ThoughtLogModal({
  agent,
  onClose,
}: {
  agent: Agent;
  onClose: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  const log = agent.log || [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-[var(--garden-paper)] border border-[var(--garden-dust)] rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--garden-dust)]">
          <div className="flex items-center gap-3">
            <span className="text-xl">{agent.symbol}</span>
            <div>
              <h3 className="font-bold text-[var(--garden-ink)]">{agent.name}&apos;s Journal</h3>
              <p className="text-xs text-[var(--garden-ink-light)]">Scroll up for older entries</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[var(--garden-ink-light)] hover:text-[var(--garden-ink)]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 flex flex-col">
          {log.length === 0 ? (
            <div className="text-center text-[var(--garden-ink-light)] font-serif italic py-8">
              No entries yet.
            </div>
          ) : (
            <div className="space-y-3">
              {log.map((entry, i) => (
                <div
                  key={i}
                  className="text-sm text-[var(--garden-ink)] font-serif py-2 border-b border-[var(--garden-dust-light)] last:border-0"
                >
                  {entry}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniToken({
  agent,
  position,
  onClick,
  isSelected,
}: {
  agent: Agent;
  position: Position;
  onClick: () => void;
  isSelected: boolean;
}) {
  const symbolType = getAgentSymbolType(agent.symbol);

  const colors: Record<string, string> = {
    clay: "var(--garden-terracotta)",
    thorn: "var(--garden-thorn)",
    reed: "var(--garden-reed)",
    cole: "var(--garden-coal)",
    sol: "var(--garden-gold)",
  };

  return (
    <g
      transform={`translate(${position.x * CELL_SIZE + CELL_SIZE / 2}, ${
        position.y * CELL_SIZE + CELL_SIZE / 2
      })`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{ cursor: "pointer" }}
    >
      <circle
        cx={0}
        cy={0}
        r={10}
        fill={colors[symbolType]}
        stroke={isSelected ? "var(--garden-olive)" : "none"}
        strokeWidth={2}
        opacity={agent.status === "sleeping" ? 0.5 : 1}
      />
      <text
        x={0}
        y={4}
        textAnchor="middle"
        fill="var(--garden-paper)"
        fontSize={10}
        fontWeight="bold"
      >
        {agent.name.charAt(0).toUpperCase()}
      </text>
    </g>
  );
}

function MiniSign({
  sign,
  onClick,
  isSelected,
}: {
  sign: Sign;
  onClick: () => void;
  isSelected: boolean;
}) {
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
        x={-6}
        y={-4}
        width={12}
        height={8}
        rx={1}
        fill="var(--garden-wood)"
        stroke={isSelected ? "var(--garden-olive)" : "var(--garden-wood-dark)"}
        strokeWidth={isSelected ? 1.5 : 0.5}
      />
    </g>
  );
}

export default function TheaterView({
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
  const [logModalAgent, setLogModalAgent] = useState<Agent | null>(null);
  const dragStart = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });

  const gridWidth = world.grid.width * CELL_SIZE;
  const gridHeight = world.grid.height * CELL_SIZE;

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

  const handleAgentClick = useCallback(
    (agent: Agent) => {
      onSelectAgent(agent);
    },
    [onSelectAgent]
  );

  const handleAgentDoubleClick = useCallback((agent: Agent) => {
    setLogModalAgent(agent);
  }, []);

  return (
    <div className="flex flex-col h-full bg-[var(--garden-paper)]">
      <ThoughtStage
        agents={world.agents}
        onSelectAgent={onSelectAgent}
        selectedAgentId={selectedAgent?.id ?? null}
      />

      <div
        ref={containerRef}
        className="flex-1 overflow-hidden cursor-grab active:cursor-grabbing"
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <svg
          width="100%"
          height="100%"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
          }}
        >
          <rect
            x={0}
            y={0}
            width={gridWidth}
            height={gridHeight}
            fill="var(--garden-paper-dark)"
            stroke="var(--garden-dust)"
            strokeWidth={1}
          />

          {Array.from({ length: world.grid.width + 1 }, (_, x) => (
            <line
              key={`v${x}`}
              x1={x * CELL_SIZE}
              y1={0}
              x2={x * CELL_SIZE}
              y2={gridHeight}
              stroke="var(--garden-dust)"
              strokeWidth={0.25}
              opacity={0.4}
            />
          ))}
          {Array.from({ length: world.grid.height + 1 }, (_, y) => (
            <line
              key={`h${y}`}
              x1={0}
              y1={y * CELL_SIZE}
              x2={gridWidth}
              y2={y * CELL_SIZE}
              stroke="var(--garden-dust)"
              strokeWidth={0.25}
              opacity={0.4}
            />
          ))}

          <g>
            {world.signs.map((sign) => (
              <MiniSign
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

              return (
                <g
                  key={agent.id}
                  onDoubleClick={() => handleAgentDoubleClick(agent)}
                >
                  <MiniToken
                    agent={agent}
                    position={pos}
                    onClick={() => handleAgentClick(agent)}
                    isSelected={selectedAgent?.id === agent.id}
                  />
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {logModalAgent && (
        <ThoughtLogModal agent={logModalAgent} onClose={() => setLogModalAgent(null)} />
      )}

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
      </div>
    </div>
  );
}
