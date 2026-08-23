import Link from "next/link";
import { getRecentDecks } from "@/lib/decks";

function DeckThumbnail({ slug, title, blurb }: { slug: string; title: string; blurb: string }) {
  return (
    <Link
      href={`/slide-decks/${slug}`}
      className="group block aspect-video bg-[#0c0b09] rounded-lg overflow-hidden border border-[rgba(233,161,26,0.2)] hover:border-[#e9a11a] transition-colors"
    >
      <div className="w-full h-full flex flex-col justify-center px-6 py-5">
        <div className="w-8 h-[2px] bg-[#e9a11a] mb-3" />
        <h3 className="text-base font-bold text-[#f4efe4] leading-tight tracking-tight">
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
        <p className="mt-2 text-xs text-[#8a8376] italic font-serif">{blurb.toLowerCase()}</p>
      </div>
    </Link>
  );
}

function AmbientBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      <div
        className="absolute w-[800px] h-[600px] top-[-10%] left-[-5%] rounded-full opacity-[0.04]"
        style={{
          background: "radial-gradient(circle, #e9a11a 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute w-[600px] h-[500px] bottom-[-15%] right-[-10%] rounded-full opacity-[0.03]"
        style={{
          background: "radial-gradient(circle, #e9a11a 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "200px 200px",
        }}
      />
    </div>
  );
}

export default function Home() {
  const recentDecks = getRecentDecks(3);

  return (
    <main className="relative min-h-screen bg-[#050504] text-[#f4efe4] overflow-hidden">
      <AmbientBackground />

      <div className="relative z-10 px-6 py-16 md:px-12 lg:px-24 max-w-6xl mx-auto">
        <header className="mb-20">
          <div className="w-14 h-[3px] bg-[#e9a11a] mb-8" />
          <h1 className="text-5xl md:text-7xl font-bold tracking-[-0.04em] leading-[0.95] mb-6">
            Matthew
            <br />
            <span className="text-[#e9a11a]">Gordon</span>
          </h1>
          <p className="text-xl md:text-2xl text-[#8a8376] font-light max-w-xl leading-relaxed">
            Forward-deployed, full-stack AI engineer.
            <br />
            Charlotte, NC.
          </p>
        </header>

        <section className="mb-20">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-sm font-bold tracking-[0.2em] text-[#e9a11a] uppercase">
              Recent Decks
            </h2>
            <Link
              href="/slide-decks"
              className="text-sm text-[#8a8376] hover:text-[#e9a11a] transition-colors flex items-center gap-2"
            >
              <span>Go to slideshows</span>
              <span>→</span>
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {recentDecks.map((deck) => (
              <DeckThumbnail key={deck.slug} slug={deck.slug} title={deck.title} blurb={deck.blurb} />
            ))}
          </div>
        </section>

        <section className="mb-20">
          <Link
            href="/world"
            className="group inline-flex items-center gap-3 px-5 py-3 bg-[#1a1815] border border-[#3d3835] rounded hover:border-[#6b7c5a] transition-colors"
          >
            <span
              className="w-6 h-6 flex items-center justify-center rounded bg-[#c4644a] text-[#f5f1e6] text-xs font-bold"
              aria-hidden="true"
            >
              ✧
            </span>
            <span className="text-sm text-[#c4b8a4] group-hover:text-[#d9d0c0] transition-colors">
              <span className="font-medium text-[#f5f1e6]">The Garden</span>
              <span className="mx-2 text-[#5c574e]">·</span>
              field notes from Genesis-001
            </span>
          </Link>
        </section>

        <section className="mb-20">
          <h2 className="text-sm font-bold tracking-[0.2em] text-[#e9a11a] uppercase mb-8">
            Background
          </h2>
          <div className="space-y-6 text-[#b7b09f] leading-relaxed max-w-2xl">
            <p>
              4+ years enterprise software engineering. 10 years hands-on software development.
            </p>
            <p>
              UNC Chapel Hill, BS Computer Science, Neuroscience minor. Completed in ~2.5 years
              after an associate degree earned during high school.
            </p>
          </div>
        </section>

        <section className="mb-20">
          <h2 className="text-sm font-bold tracking-[0.2em] text-[#e9a11a] uppercase mb-8">
            Experience
          </h2>
          <div className="space-y-10">
            <article>
              <h3 className="text-xl font-semibold mb-1">Accenture</h3>
              <p className="text-sm text-[#8a8376] mb-3">
                Advanced App Engineering Analyst · Enterprise Client Delivery · Jan 2024 – Present
              </p>
              <p className="text-[#b7b09f] leading-relaxed mb-3">
                Clients: Capital One, Discover, Builders FirstSource. Built GenAI solutions
                (document generation, test-script generation, AI data modeling); AI agents reducing
                manual coordination 3×; SAP/Databricks/Snowflake/Airflow/Python/SQL.
              </p>
              <ul className="text-sm text-[#8a8376] space-y-2 ml-4">
                <li>
                  <span className="text-[#e9a11a]">Capital One</span>, Richmond VA, Oct 2025 –
                  Present: ~10 enterprise data-product definitions; standardized metadata for 15+
                  attributes; Metro 2 / fee activity / data governance; Snowflake + Databricks;
                  Claude Code / LLM-assisted modeling standards.
                </li>
                <li>
                  <span className="text-[#e9a11a]">Discover</span>, Chicago IL, Jul 2025 – Sept
                  2025: decision-tree-guided inference; 10%+ model accuracy improvement; Snowflake
                  validation / EDA.
                </li>
                <li>
                  <span className="text-[#e9a11a]">Builders FirstSource</span>, Irving TX, Feb 2024
                  – Jul 2025: SAP Test & Automation Lead, Order-to-Cash; ~100% testing productivity
                  improvement; reporting hours → minutes across 10+ workstreams.
                </li>
              </ul>
            </article>

            <article>
              <h3 className="text-xl font-semibold mb-1">The Hartford</h3>
              <p className="text-sm text-[#8a8376] mb-3">
                Software Engineer · Charlotte, NC · Dec 2022 – Jan 2024
              </p>
              <p className="text-[#b7b09f] leading-relaxed">
                Guidewire PolicyCenter for 400K+ customers; 3 Guidewire certifications; deployment
                dashboards; CI/CD.
              </p>
            </article>

            <article>
              <h3 className="text-xl font-semibold mb-1">Musicfy.lol / 24 Labs</h3>
              <p className="text-sm text-[#8a8376] mb-3">
                AI Engineer · Remote · Apr 2023 – Jun 2023
              </p>
              <p className="text-[#b7b09f] leading-relaxed">
                AI music generation; platform scaling beyond 100,000 users.
              </p>
            </article>

            <article>
              <h3 className="text-xl font-semibold mb-1">Infosys</h3>
              <p className="text-sm text-[#8a8376] mb-3">
                Software Development Engineer · Remote · Jun 2022 – Aug 2022
              </p>
              <p className="text-[#b7b09f] leading-relaxed">
                React enterprise apps; early GenAI with data science.
              </p>
            </article>
          </div>
        </section>

        <section className="mb-20">
          <h2 className="text-sm font-bold tracking-[0.2em] text-[#e9a11a] uppercase mb-8">
            Stack
          </h2>
          <p className="text-[#8a8376] leading-relaxed max-w-2xl">
            TypeScript · React · Node · Python · AI Agents · RAG · LangChain · OpenAI · Anthropic ·
            Google · MCP · Cloudflare · AWS · Azure · GCP · Snowflake · Databricks · Pinecone
          </p>
        </section>

        <footer className="pt-10 border-t border-[rgba(233,161,26,0.15)]">
          <div className="flex flex-wrap items-center gap-6 text-sm text-[#8a8376]">
            <a
              href="https://linkedin.com/in/matthew---gordon/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#e9a11a] transition-colors"
            >
              LinkedIn
            </a>
            <span className="text-[#5c574e]">·</span>
            <span>Charlotte, NC (EST)</span>
          </div>
        </footer>
      </div>
    </main>
  );
}
