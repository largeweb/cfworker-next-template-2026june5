"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { WorldState, AnimationState, WorldEvent, GridShape, Agent, Sign } from "./world-types";
import { EMPTY_WORLD } from "./world-types";

const POLL_INTERVAL = 10_000;

function normalizeGrid(grid: GridShape): { width: number; height: number } {
  if (Array.isArray(grid)) {
    return { width: grid.length, height: grid[0]?.length ?? 0 };
  }
  return { width: grid.width, height: grid.height };
}

export function useWorld() {
  const [world, setWorld] = useState<WorldState>(EMPTY_WORLD);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchedTick, setLastFetchedTick] = useState(-1);
  const pendingEventsRef = useRef<WorldEvent[]>([]);

  const fetchWorld = useCallback(async () => {
    try {
      const res = await fetch("/api/world");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = await res.json() as {
        tick: number;
        grid: GridShape;
        agents?: Agent[];
        signs?: Sign[];
        events?: WorldEvent[];
        timestamp: string;
      };
      
      const data: WorldState = {
        tick: raw.tick,
        grid: normalizeGrid(raw.grid),
        agents: raw.agents || [],
        signs: raw.signs || [],
        events: raw.events || [],
        timestamp: raw.timestamp,
      };
      
      if (data.tick !== lastFetchedTick) {
        pendingEventsRef.current = data.events;
        setLastFetchedTick(data.tick);
      }
      
      setWorld(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  }, [lastFetchedTick]);

  useEffect(() => {
    fetchWorld();
    const interval = setInterval(fetchWorld, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchWorld]);

  return { world, loading, error, pendingEvents: pendingEventsRef.current };
}

export function useAnimationState(
  world: WorldState,
  pendingEvents: WorldEvent[]
) {
  const [animState, setAnimState] = useState<AnimationState>({
    phase: "idle",
    currentEventIndex: 0,
    eventProgress: 0,
    agentPositions: new Map(),
    thinkingAgents: new Set(),
  });

  const lastTickRef = useRef<number>(-1);

  useEffect(() => {
    if (world.tick === lastTickRef.current) return;
    lastTickRef.current = world.tick;

    const positions = new Map<string, { x: number; y: number }>();
    world.agents.forEach((a) => positions.set(a.id, { x: a.x, y: a.y }));

    const thinking = new Set<string>();
    world.agents.forEach((a) => {
      if (a.status === "thinking") thinking.add(a.id);
    });

    const currentEventIndex = pendingEvents.length > 0 ? pendingEvents.length - 1 : 0;

    setAnimState({
      phase: pendingEvents.length > 0 ? "action" : "idle",
      currentEventIndex,
      eventProgress: 1,
      agentPositions: positions,
      thinkingAgents: thinking,
    });
  }, [world.tick, world.agents, pendingEvents]);

  return animState;
}
