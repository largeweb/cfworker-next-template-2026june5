import { getCloudflareContext } from "@opennextjs/cloudflare";

interface AgentResponse {
  id: string;
  name: string;
  x: number;
  y: number;
  energy: number;
  health: number;
  status: string;
  symbol: string;
  thought?: string;
}

interface AgentKVData {
  lastThought?: string;
  food?: number;
  generation?: number;
  memory?: unknown;
  [key: string]: unknown;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { env } = await getCloudflareContext();
    const kv = env.WORLDSIM_KV;

    if (!kv) {
      return Response.json({ error: "KV namespace not bound" }, { status: 500 });
    }

    const rawData = await kv.get("world:current", "json") as Record<string, unknown> | null;

    let rawAgent: Record<string, unknown> | undefined;
    
    if (rawData && Array.isArray(rawData.agents)) {
      rawAgent = rawData.agents.find((a: Record<string, unknown>) => 
        a.id === id || String(a.name).toLowerCase() === id.toLowerCase()
      ) as Record<string, unknown> | undefined;
    }

    const agentName = rawAgent ? String(rawAgent.name ?? id).toLowerCase() : id.toLowerCase();
    
    const [agentKVById, agentKVByName] = await Promise.all([
      kv.get(`agent:${id}`, "json") as Promise<AgentKVData | null>,
      kv.get(`agent:${agentName}`, "json") as Promise<AgentKVData | null>,
    ]);
    
    const agentKV = agentKVById || agentKVByName;

    if (!rawAgent) {
      return Response.json(
        {
          id,
          name: id,
          x: 0,
          y: 0,
          energy: 0,
          health: 0,
          status: "unknown",
          symbol: "?",
          thought: agentKV?.lastThought ?? undefined,
        } as AgentResponse,
        {
          headers: {
            "Cache-Control": "public, s-maxage=5, stale-while-revalidate=10",
          },
        }
      );
    }

    const response: AgentResponse = {
      id: String(rawAgent.id ?? ""),
      name: String(rawAgent.name ?? "Unknown"),
      x: typeof rawAgent.x === "number" ? rawAgent.x : 0,
      y: typeof rawAgent.y === "number" ? rawAgent.y : 0,
      energy: typeof rawAgent.energy === "number" ? rawAgent.energy : 0,
      health: typeof rawAgent.health === "number" ? rawAgent.health : 0,
      status: String(rawAgent.status ?? "idle"),
      symbol: String(rawAgent.symbol ?? "?"),
      thought: agentKV?.lastThought ?? (typeof rawAgent.thought === "string" ? rawAgent.thought : undefined),
    };

    return Response.json(response, {
      headers: {
        "Cache-Control": "public, s-maxage=5, stale-while-revalidate=10",
      },
    });
  } catch (error) {
    console.error("Error fetching agent:", error);
    return Response.json({ error: "Failed to fetch agent" }, { status: 500 });
  }
}
