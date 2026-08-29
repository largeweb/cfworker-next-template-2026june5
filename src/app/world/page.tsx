import type { Metadata } from "next";
import { WorldCanvas } from "./WorldCanvas";

export const metadata: Metadata = {
  title: "The Garden | Genesis-001",
  description: "Field notes from a simulated garden. Five agents, one world, many turns.",
};

export default function WorldPage() {
  return <WorldCanvas />;
}
