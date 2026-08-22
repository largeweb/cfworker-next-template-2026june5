import Link from "next/link";
import { decks } from "@/lib/decks";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Slide Decks | Matthew Gordon",
  description: "Presentations and slide decks by Matthew Gordon",
};

function DeckThumbnail({ slug, title, blurb }: { slug: string; title: string; blurb: string }) {
  return (
    <Link
      href={`/slide-decks/${slug}`}
      className="group block aspect-video bg-[#0c0b09] rounded-lg overflow-hidden border border-[rgba(233,161,26,0.2)] hover:border-[#e9a11a] transition-colors"
    >
      <div className="w-full h-full flex flex-col justify-center px-8 py-6">
        <div className="w-10 h-[3px] bg-[#e9a11a] mb-4" />
        <h3 className="text-lg md:text-xl font-bold text-[#f4efe4] leading-tight tracking-tight">
          {title.split(". ").map((part, i, arr) => (
            <span key={i}>
              {i === arr.length - 1 ? (
                <span className="text-[#e9a11a]">{part}</span>
              ) : (
                <>
                  {part}.<br />
                </>
              )}
            </span>
          ))}
        </h3>
        <p className="mt-3 text-sm text-[#8a8376] italic font-serif">{blurb.toLowerCase()}</p>
      </div>
    </Link>
  );
}

export default function SlideDecksPage() {
  return (
    <main className="min-h-screen bg-[#050504] text-[#f4efe4] px-6 py-16 md:px-12 lg:px-24">
      <div className="max-w-5xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-[#8a8376] hover:text-[#e9a11a] transition-colors mb-12"
        >
          <span>←</span>
          <span>Back to home</span>
        </Link>

        <header className="mb-12">
          <div className="w-14 h-[3px] bg-[#e9a11a] mb-6" />
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Slide Decks</h1>
          <p className="text-lg text-[#8a8376]">Presentations on strategy, systems, and trades.</p>
        </header>

        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {decks.map((deck) => (
            <DeckThumbnail key={deck.slug} slug={deck.slug} title={deck.title} blurb={deck.blurb} />
          ))}
        </section>
      </div>
    </main>
  );
}
