import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { WorldState, Agent } from "../../route";

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

    const worldData = await kv.get("world:current", "json") as WorldState | null;

    if (!worldData) {
      return Response.json({ error: "No world data" }, { status: 404 });
    }

    const agent = worldData.agents.find((a: Agent) => a.id === id);

    if (!agent) {
      return Response.json({ error: "Agent not found" }, { status: 404 });
    }

    const agentLog = await kv.get(`agent:${id}:log`, "json") as string[] | null;

    return Response.json(
      {
        ...agent,
        log: agentLog ?? agent.log ?? [],
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=5, stale-while-revalidate=10",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching agent:", error);
    return Response.json({ error: "Failed to fetch agent" }, { status: 500 });
  }
}
