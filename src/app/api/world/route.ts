import { getCloudflareContext } from "@opennextjs/cloudflare";

export interface WorldState {
  tick: number;
  grid: {
    width: number;
    height: number;
  };
  agents: Agent[];
  signs: Sign[];
  events: WorldEvent[];
  timestamp: string;
}

export interface Agent {
  id: string;
  name: string;
  x: number;
  y: number;
  energy: number;
  health: number;
  status: "thinking" | "idle" | "sleeping" | "downed";
  symbol: string;
  thought?: string;
  lastAction?: WorldEvent;
  log?: string[];
}

export interface Sign {
  id: string;
  x: number;
  y: number;
  text: string;
  author: string;
  tick: number;
}

export interface WorldEvent {
  type: "move" | "attack" | "build" | "signal" | "rest" | "wake";
  agentId: string;
  agentName?: string;
  tick: number;
  data: Record<string, unknown>;
}

const EMPTY_WORLD: WorldState = {
  tick: 0,
  grid: { width: 32, height: 32 },
  agents: [],
  signs: [],
  events: [],
  timestamp: new Date().toISOString(),
};

function normalizeWorld(raw: Record<string, unknown>): WorldState {
  let grid: { width: number; height: number } = { width: 32, height: 32 };
  
  if (raw.grid) {
    if (Array.isArray(raw.grid)) {
      grid = { width: raw.grid.length, height: (raw.grid[0] as unknown[])?.length ?? 0 };
    } else if (typeof raw.grid === "object" && raw.grid !== null) {
      const g = raw.grid as Record<string, unknown>;
      grid = {
        width: typeof g.width === "number" ? g.width : 32,
        height: typeof g.height === "number" ? g.height : 32,
      };
    }
  }

  const agents: Agent[] = Array.isArray(raw.agents)
    ? raw.agents.map((a: Record<string, unknown>) => ({
        id: String(a.id ?? ""),
        name: String(a.name ?? "Unknown"),
        x: typeof a.x === "number" ? a.x : 0,
        y: typeof a.y === "number" ? a.y : 0,
        energy: typeof a.energy === "number" ? a.energy : 0,
        health: typeof a.health === "number" ? a.health : 0,
        status: (["thinking", "idle", "sleeping", "downed"].includes(String(a.status)) ? a.status : "idle") as Agent["status"],
        symbol: String(a.symbol ?? "?"),
        thought: typeof a.thought === "string" ? a.thought : undefined,
        lastAction: a.lastAction as WorldEvent | undefined,
        log: Array.isArray(a.log) ? a.log.map(String) : undefined,
      }))
    : [];

  const signs: Sign[] = Array.isArray(raw.signs)
    ? raw.signs.map((s: Record<string, unknown>) => ({
        id: String(s.id ?? ""),
        x: typeof s.x === "number" ? s.x : 0,
        y: typeof s.y === "number" ? s.y : 0,
        text: String(s.text ?? ""),
        author: String(s.author ?? ""),
        tick: typeof s.tick === "number" ? s.tick : 0,
      }))
    : [];

  const events: WorldEvent[] = Array.isArray(raw.events)
    ? raw.events.map((e: Record<string, unknown>) => ({
        type: (["move", "attack", "build", "signal", "rest", "wake"].includes(String(e.type)) ? e.type : "move") as WorldEvent["type"],
        agentId: String(e.agentId ?? ""),
        agentName: typeof e.agentName === "string" ? e.agentName : undefined,
        tick: typeof e.tick === "number" ? e.tick : 0,
        data: typeof e.data === "object" && e.data !== null ? e.data as Record<string, unknown> : {},
      }))
    : [];

  return {
    tick: typeof raw.tick === "number" ? raw.tick : 0,
    grid,
    agents,
    signs,
    events,
    timestamp: typeof raw.timestamp === "string" ? raw.timestamp : new Date().toISOString(),
  };
}

export async function GET() {
  try {
    const { env } = await getCloudflareContext();
    const kv = env.WORLDSIM_KV;

    if (!kv) {
      return Response.json(
        { error: "KV namespace not bound", world: EMPTY_WORLD },
        { status: 500 }
      );
    }

    const rawData = await kv.get("world:current", "json") as Record<string, unknown> | null;

    if (!rawData) {
      return Response.json(EMPTY_WORLD, {
        headers: {
          "Cache-Control": "public, s-maxage=5, stale-while-revalidate=10",
        },
      });
    }

    const world = normalizeWorld(rawData);

    return Response.json(world, {
      headers: {
        "Cache-Control": "public, s-maxage=5, stale-while-revalidate=10",
      },
    });
  } catch (error) {
    console.error("Error fetching world state:", error);
    return Response.json(
      { error: "Failed to fetch world state", world: EMPTY_WORLD },
      { status: 500 }
    );
  }
}
