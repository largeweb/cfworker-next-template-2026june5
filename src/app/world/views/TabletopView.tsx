"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ViewProps } from "../WorldCanvas";
import { getAgentSymbolType } from "@/lib/world-types";
import type { Agent, Sign, WorldEvent } from "@/lib/world-types";

function useSharedAnimationTime() {
  const [time, setTime] = useState(0);
  const mountedRef = useRef(true);
  
  useEffect(() => {
    mountedRef.current = true;
    let frame: number;
    const animate = () => {
      if (!mountedRef.current) return;
      setTime((t) => t + 0.02);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => {
      mountedRef.current = false;
      cancelAnimationFrame(frame);
    };
  }, []);
  
  return time;
}

const CELL_SIZE = 52;
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 2.5;

interface Position {
  x: number;
  y: number;
}

function DiceRoll({
  attacker,
  defender,
  onComplete,
}: {
  attacker: string;
  defender: string;
  onComplete: () => void;
}) {
  const [roll1, setRoll1] = useState(1);
  const [roll2, setRoll2] = useState(1);
  const [rolling, setRolling] = useState(true);

  useEffect(() => {
    let count = 0;
    const interval = setInterval(() => {
      setRoll1(Math.floor(Math.random() * 6) + 1);
      setRoll2(Math.floor(Math.random() * 6) + 1);
      count++;
      if (count > 12) {
        setRolling(false);
        clearInterval(interval);
        setTimeout(onComplete, 1500);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [onComplete]);

  const diceFace = (n: number) => {
    const dots: Record<number, [number, number][]> = {
      1: [[50, 50]],
      2: [
        [25, 25],
        [75, 75],
      ],
      3: [
        [25, 25],
        [50, 50],
        [75, 75],
      ],
      4: [
        [25, 25],
        [75, 25],
        [25, 75],
        [75, 75],
      ],
      5: [
        [25, 25],
        [75, 25],
        [50, 50],
        [25, 75],
        [75, 75],
      ],
      6: [
        [25, 25],
        [75, 25],
        [25, 50],
        [75, 50],
        [25, 75],
        [75, 75],
      ],
    };
    return dots[n] || dots[1];
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-50">
      <div className="bg-[var(--garden-felt)] p-6 rounded-lg shadow-2xl border-4 border-[var(--garden-wood-dark)]">
        <div className="text-center mb-4 text-[var(--garden-paper)] font-serif">
          <span className="font-bold">{attacker}</span> attacks{" "}
          <span className="font-bold">{defender}</span>
        </div>
        <div className="flex gap-4 justify-center">
          <svg
            width="60"
            height="60"
            viewBox="0 0 100 100"
            className={`bg-[var(--garden-paper)] rounded-lg shadow-lg ${
              rolling ? "animate-bounce" : ""
            }`}
          >
            <rect
              width="100"
              height="100"
              fill="var(--garden-paper)"
              rx="10"
              stroke="var(--garden-wood)"
              strokeWidth="3"
            />
            {diceFace(roll1).map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r="10" fill="var(--garden-ink)" />
            ))}
          </svg>
          <svg
            width="60"
            height="60"
            viewBox="0 0 100 100"
            className={`bg-[var(--garden-terracotta)] rounded-lg shadow-lg ${
              rolling ? "animate-bounce" : ""
            }`}
            style={{ animationDelay: "50ms" }}
          >
            <rect
              width="100"
              height="100"
              fill="var(--garden-terracotta)"
              rx="10"
              stroke="var(--garden-terracotta-dark)"
              strokeWidth="3"
            />
            {diceFace(roll2).map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r="10" fill="var(--garden-paper)" />
            ))}
          </svg>
        </div>
        {!rolling && (
          <div className="text-center mt-4 text-[var(--garden-gold)] font-bold">
            {roll1} vs {roll2} —{" "}
            {roll1 >= roll2 ? `${attacker} prevails!` : `${defender} holds!`}
          </div>
        )}
      </div>
    </div>
  );
}

const TOKEN_COLORS: Record<string, { base: string; rim: string }> = {
  clay: { base: "#c4644a", rim: "#a34d38" },
  thorn: { base: "#4a4540", rim: "#2c2a24" },
  reed: { base: "#b8b0a0", rim: "#8a8376" },
  cole: { base: "#3d3835", rim: "#1a1815" },
  sol: { base: "#d4a54a", rim: "#b8903a" },
};

function TabletopToken({
  agent,
  position,
  isThinking,
  isSleeping,
  onClick,
  isSelected,
  animTime,
}: {
  agent: Agent;
  position: Position;
  isThinking: boolean;
  isSleeping: boolean;
  onClick: () => void;
  isSelected: boolean;
  animTime: number;
}) {
  const symbolType = getAgentSymbolType(agent.symbol);
  const c = TOKEN_COLORS[symbolType];
  const wobbleX = Math.sin(animTime) * (isSleeping ? 0 : 1);
  const wobbleY = Math.cos(animTime * 0.7) * (isSleeping ? 0 : 0.5);

  return (
    <g
      transform={`translate(${position.x * CELL_SIZE + CELL_SIZE / 2 + wobbleX}, ${
        position.y * CELL_SIZE + CELL_SIZE / 2 + wobbleY
      })`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{ cursor: "pointer" }}
    >
      <ellipse
        cx={0}
        cy={4}
        rx={16}
        ry={6}
        fill="rgba(0,0,0,0.2)"
        opacity={isSleeping ? 0.3 : 0.5}
      />

      <circle
        cx={0}
        cy={0}
        r={18}
        fill={c.base}
        stroke={isSelected ? "var(--garden-gold)" : c.rim}
        strokeWidth={isSelected ? 4 : 3}
        opacity={isSleeping ? 0.5 : 1}
      />
      <circle cx={0} cy={0} r={14} fill="none" stroke={c.rim} strokeWidth={1} opacity={0.5} />

      <text
        x={0}
        y={5}
        textAnchor="middle"
        fill="var(--garden-paper)"
        fontSize={16}
        fontWeight="bold"
        fontFamily="serif"
        style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.3)" }}
      >
        {agent.name.charAt(0).toUpperCase()}
      </text>

      {isThinking && (
        <g>
          <circle
            cx={0}
            cy={-24}
            r={6}
            fill="var(--garden-olive)"
            stroke="var(--garden-olive-dark)"
            strokeWidth={1}
            opacity={0.7 + Math.sin(animTime * 3) * 0.3}
          />
          <text x={0} y={-21} textAnchor="middle" fill="var(--garden-paper)" fontSize={8}>
            ?
          </text>
        </g>
      )}

      {isSleeping && (
        <text
          x={14}
          y={-10}
          fontSize={12}
          fill="var(--garden-ink-light)"
          fontStyle="italic"
          fontFamily="cursive"
          opacity={0.5 + Math.sin(animTime * 0.5) * 0.3}
        >
          zzz
        </text>
      )}
    </g>
  );
}

function TabletopSign({
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
        x={-10}
        y={-6}
        width={20}
        height={12}
        rx={2}
        fill="var(--garden-wood)"
        stroke={isSelected ? "var(--garden-gold)" : "var(--garden-wood-dark)"}
        strokeWidth={isSelected ? 2 : 1}
        style={{ filter: "drop-shadow(1px 2px 2px rgba(0,0,0,0.3))" }}
      />
      <rect x={-1} y={6} width={2} height={8} fill="var(--garden-wood-dark)" />
      <text
        x={0}
        y={2}
        textAnchor="middle"
        fill="var(--garden-paper)"
        fontSize={6}
        fontFamily="monospace"
      >
        {sign.text.slice(0, 3)}
      </text>
    </g>
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
  const [zoom, setZoom] = useState(0.8);
  const [isDragging, setIsDragging] = useState(false);
  const [activeAttack, setActiveAttack] = useState<WorldEvent | null>(null);
  const dragStart = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });
  const animTime = useSharedAnimationTime();

  const gridWidth = world.grid.width * CELL_SIZE;
  const gridHeight = world.grid.height * CELL_SIZE;

  useEffect(() => {
    if (animState.phase === "action") {
      const currentEvent = world.events[animState.currentEventIndex];
      if (currentEvent?.type === "attack" && !activeAttack) {
        setActiveAttack(currentEvent);
      }
    }
  }, [animState, world.events, activeAttack]);

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

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden cursor-grab active:cursor-grabbing"
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      style={{
        background: `
          radial-gradient(ellipse at center, #5c4a32 0%, #3d3228 100%),
          url("data:image/svg+xml,%3Csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.02' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.15'/%3E%3C/svg%3E")
        `,
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
          <filter id="wood-texture">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" result="noise" />
            <feDiffuseLighting in="noise" lightingColor="#8b6f47" surfaceScale="2">
              <feDistantLight azimuth="45" elevation="60" />
            </feDiffuseLighting>
          </filter>
          <pattern id="wood-grain" patternUnits="userSpaceOnUse" width="200" height="200">
            <rect width="200" height="200" fill="#6b5a3a" />
            <rect width="200" height="200" filter="url(#wood-texture)" opacity="0.3" />
          </pattern>
        </defs>

        <rect
          x={-20}
          y={-20}
          width={gridWidth + 40}
          height={gridHeight + 40}
          rx={8}
          fill="url(#wood-grain)"
          stroke="#3d3228"
          strokeWidth={4}
        />

        <rect
          x={0}
          y={0}
          width={gridWidth}
          height={gridHeight}
          fill="var(--garden-felt)"
          stroke="#2a4a2a"
          strokeWidth={2}
        />

        {Array.from({ length: world.grid.width + 1 }, (_, x) => (
          <line
            key={`v${x}`}
            x1={x * CELL_SIZE}
            y1={0}
            x2={x * CELL_SIZE}
            y2={gridHeight}
            stroke="#2a4a2a"
            strokeWidth={0.5}
            opacity={0.3}
          />
        ))}
        {Array.from({ length: world.grid.height + 1 }, (_, y) => (
          <line
            key={`h${y}`}
            x1={0}
            y1={y * CELL_SIZE}
            x2={gridWidth}
            y2={y * CELL_SIZE}
            stroke="#2a4a2a"
            strokeWidth={0.5}
            opacity={0.3}
          />
        ))}

        <g>
          {world.signs.map((sign) => (
            <TabletopSign
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
              <TabletopToken
                key={agent.id}
                agent={agent}
                position={pos}
                isThinking={isThinking}
                isSleeping={isSleeping}
                onClick={() => onSelectAgent(agent)}
                isSelected={selectedAgent?.id === agent.id}
                animTime={animTime}
              />
            );
          })}
        </g>
      </svg>

      {activeAttack && (
        <DiceRoll
          attacker={activeAttack.agentName || activeAttack.agentId}
          defender={String(activeAttack.data.targetName || "Unknown")}
          onComplete={() => setActiveAttack(null)}
        />
      )}

      <div className="absolute bottom-4 left-4 flex gap-2">
        <button
          onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z * 1.2))}
          className="w-8 h-8 bg-[var(--garden-wood)] border border-[var(--garden-wood-dark)] rounded text-[var(--garden-paper)] hover:bg-[var(--garden-wood-dark)] transition-colors shadow"
        >
          +
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z / 1.2))}
          className="w-8 h-8 bg-[var(--garden-wood)] border border-[var(--garden-wood-dark)] rounded text-[var(--garden-paper)] hover:bg-[var(--garden-wood-dark)] transition-colors shadow"
        >
          −
        </button>
      </div>
    </div>
  );
}
