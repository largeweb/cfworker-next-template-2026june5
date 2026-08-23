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

    const worldData = await kv.get("world:current", "json");

    if (!worldData) {
      return Response.json(EMPTY_WORLD, {
        headers: {
          "Cache-Control": "public, s-maxage=5, stale-while-revalidate=10",
        },
      });
    }

    return Response.json(worldData as WorldState, {
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
