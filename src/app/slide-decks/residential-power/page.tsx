import type { Metadata } from "next";
import ResidentialPowerDeck from "./ResidentialPowerDeck";

export const metadata: Metadata = {
  title: "A hundred front doors. One trade. | Matthew Gordon",
  description: "Specialist properties for residential power - a presentation by Matthew Gordon",
};

export default function ResidentialPowerPage() {
  return <ResidentialPowerDeck />;
}
