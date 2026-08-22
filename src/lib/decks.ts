export interface Deck {
  slug: string;
  title: string;
  date: string;
  blurb: string;
}

export const decks: Deck[] = [
  {
    slug: "residential-power",
    title: "A hundred front doors. One trade.",
    date: "2026-08-21",
    blurb: "Specialist properties for residential power.",
  },
];

export function getDeckBySlug(slug: string): Deck | undefined {
  return decks.find((d) => d.slug === slug);
}

export function getRecentDecks(limit: number = 3): Deck[] {
  return [...decks]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);
}
