"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { WorldState, AnimationState, WorldEvent } from "./world-types";
import { EMPTY_WORLD } from "./world-types";

const POLL_INTERVAL = 10_000;

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
      const data: WorldState = await res.json();
      
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
