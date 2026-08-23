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

export type ViewMode = "journal" | "three" | "tabletop" | "night" | "theater";

export const VIEW_LABELS: Record<ViewMode, string> = {
  journal: "Journal",
  three: "Garden",
  tabletop: "Tabletop",
  night: "Night",
  theater: "Theater",
};

export const EMPTY_WORLD: WorldState = {
  tick: 0,
  grid: { width: 32, height: 32 },
  agents: [],
  signs: [],
  events: [],
  timestamp: new Date().toISOString(),
};

export interface AnimationState {
  phase: "idle" | "thinking" | "action" | "queue";
  currentEventIndex: number;
  eventProgress: number;
  agentPositions: Map<string, { x: number; y: number }>;
  thinkingAgents: Set<string>;
}

export function getAgentSymbolType(symbol: string): "clay" | "thorn" | "reed" | "cole" | "sol" {
  const s = symbol.toLowerCase();
  if (s.includes("clay") || s === "c") return "clay";
  if (s.includes("thorn") || s === "t") return "thorn";
  if (s.includes("reed") || s === "r") return "reed";
  if (s.includes("cole") || s === "k") return "cole";
  if (s.includes("sol") || s === "s") return "sol";
  return "clay";
}
