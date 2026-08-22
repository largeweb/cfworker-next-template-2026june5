import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "A hundred front doors. One trade. | Matthew Gordon",
  description: "Specialist properties for residential power - a presentation by Matthew Gordon",
};

export default function ResidentialPowerDeck() {
  return (
    <iframe
      src="/slide-decks/residential-power.html"
      className="w-screen h-screen border-0"
      title="A hundred front doors. One trade."
      allowFullScreen
    />
  );
}
