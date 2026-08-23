"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { WorldState, AnimationState, WorldEvent } from "./world-types";
import { EMPTY_WORLD } from "./world-types";

const POLL_INTERVAL = 10_000;
const EVENT_REPLAY_DURATION = 25_000;

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

  const animFrameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const lastTickRef = useRef<number>(-1);

  useEffect(() => {
    const positions = new Map<string, { x: number; y: number }>();
    world.agents.forEach((a) => positions.set(a.id, { x: a.x, y: a.y }));
    
    const thinking = new Set<string>();
    world.agents.forEach((a) => {
      if (a.status === "thinking") thinking.add(a.id);
    });

    setAnimState((prev) => ({
      ...prev,
      agentPositions: positions,
      thinkingAgents: thinking,
    }));
  }, [world.agents]);

  useEffect(() => {
    if (world.tick === lastTickRef.current) return;
    lastTickRef.current = world.tick;

    if (pendingEvents.length === 0) {
      setAnimState((prev) => ({
        ...prev,
        phase: "idle",
        currentEventIndex: 0,
        eventProgress: 0,
      }));
      return;
    }

    startTimeRef.current = performance.now();
    const eventDuration = EVENT_REPLAY_DURATION / pendingEvents.length;

    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const totalProgress = elapsed / EVENT_REPLAY_DURATION;

      if (totalProgress >= 1) {
        const finalPositions = new Map<string, { x: number; y: number }>();
        world.agents.forEach((a) => finalPositions.set(a.id, { x: a.x, y: a.y }));
        
        setAnimState((prev) => ({
          ...prev,
          phase: "idle",
          currentEventIndex: pendingEvents.length,
          eventProgress: 1,
          agentPositions: finalPositions,
        }));
        return;
      }

      const currentEventIndex = Math.min(
        Math.floor(totalProgress * pendingEvents.length),
        pendingEvents.length - 1
      );
      const eventProgress =
        (totalProgress * pendingEvents.length) % 1;

      const positions = new Map<string, { x: number; y: number }>();
      world.agents.forEach((a) => positions.set(a.id, { x: a.x, y: a.y }));

      for (let i = 0; i <= currentEventIndex; i++) {
        const evt = pendingEvents[i];
        if (evt.type === "move") {
          const progress = i < currentEventIndex ? 1 : eventProgress;
          const fromX = (evt.data.fromX as number) ?? 0;
          const fromY = (evt.data.fromY as number) ?? 0;
          const toX = (evt.data.toX as number) ?? (evt.data.x as number) ?? 0;
          const toY = (evt.data.toY as number) ?? (evt.data.y as number) ?? 0;

          const eased = easeInOutCubic(progress);
          positions.set(evt.agentId, {
            x: fromX + (toX - fromX) * eased,
            y: fromY + (toY - fromY) * eased,
          });
        }
      }

      setAnimState({
        phase: "action",
        currentEventIndex,
        eventProgress,
        agentPositions: positions,
        thinkingAgents: new Set(
          world.agents.filter((a) => a.status === "thinking").map((a) => a.id)
        ),
      });

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [world.tick, world.agents, pendingEvents]);

  return animState;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
