"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./deck.module.css";

const TOTAL = 21;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function Matrix() {
  return (
    <div className={styles.matrix} aria-hidden="true">
      {Array.from({ length: 72 }, (_, n) => (
        <i
          key={n}
          className={n === 0 ? styles.matrixOn : n < 12 ? styles.matrixRow : undefined}
        />
      ))}
    </div>
  );
}

function SlideShell({
  on,
  ghost,
  children,
}: {
  on: boolean;
  ghost?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={`${styles.slide} ${on ? styles.slideOn : ""}`}
      aria-hidden={!on}
    >
      {ghost ? <div className={styles.ghost}>{ghost}</div> : null}
      <div className={styles.body}>{children}</div>
    </section>
  );
}

export default function ResidentialPowerDeck() {
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const go = useCallback((n: number, pushHash = true) => {
    const next = Math.max(0, Math.min(TOTAL - 1, n));
    indexRef.current = next;
    setIndex(next);
    if (pushHash && typeof window !== "undefined") {
      history.replaceState(null, "", `#${next + 1}`);
    }
  }, []);

  useEffect(() => {
    const fromHash = parseInt(window.location.hash.slice(1), 10);
    if (fromHash >= 1 && fromHash <= TOTAL) {
      go(fromHash - 1, false);
    } else {
      go(0, false);
    }

    const onHash = () => {
      const n = parseInt(window.location.hash.slice(1), 10);
      if (n >= 1 && n <= TOTAL) go(n - 1, false);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        go(indexRef.current + 1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp" || e.key === "Backspace") {
        e.preventDefault();
        go(indexRef.current - 1);
      } else if (e.key === "Home") {
        e.preventDefault();
        go(0);
      } else if (e.key === "End") {
        e.preventDefault();
        go(TOTAL - 1);
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      }
    };

    window.addEventListener("hashchange", onHash);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("hashchange", onHash);
      window.removeEventListener("keydown", onKey);
    };
  }, [go]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    touchStart.current = { x: e.clientX, y: e.clientY };
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) go(indexRef.current + 1);
      else go(indexRef.current - 1);
      return;
    }
    if (Math.abs(dx) < 12 && Math.abs(dy) < 12) {
      if (e.clientX < window.innerWidth * 0.12) go(indexRef.current - 1);
      else go(indexRef.current + 1);
    }
  };

  return (
    <div
      className={styles.stage}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      role="application"
      aria-label="A hundred front doors. One trade."
    >
      <div className={styles.grain} />
      <div className={styles.vignette} />
      <div
        className={styles.progress}
        style={{ width: `${((index + 1) / TOTAL) * 100}%` }}
      />
      <div className={styles.counter}>
        <b>{pad(index + 1)}</b> / {pad(TOTAL)}
      </div>

      <SlideShell on={index === 0}>
        <div className={styles.rule} />
        <h1 className={`${styles.display} ${styles.displayXl}`}>
          A hundred
          <br />
          front doors.
          <br />
          <span className={styles.am}>One trade.</span>
        </h1>
        <p className={`${styles.lede} ${styles.ledeSerif}`}>
          specialist properties for residential power
        </p>
      </SlideShell>

      <SlideShell on={index === 1}>
        <p className={styles.kicker}>The default</p>
        <h1 className={`${styles.display} ${styles.displayXl}`}>
          Most trades
          <br />
          still rent
          <br />
          <span className={styles.am}>one door.</span>
        </h1>
      </SlideShell>

      <SlideShell on={index === 2}>
        <p className={styles.kicker}>The problem</p>
        <h1 className={styles.display}>
          One fat website
          <br />
          cannot win every
          <br />
          <span className={styles.am}>query-place pair.</span>
        </h1>
      </SlideShell>

      <SlideShell on={index === 3}>
        <p className={styles.kicker}>What this is</p>
        <ul className={`${styles.stack} ${styles.stackHuge}`}>
          <li>Isolated properties.</li>
          <li>One conversion hub.</li>
          <li className={styles.am}>Tracked DIDs.</li>
        </ul>
      </SlideShell>

      <SlideShell on={index === 4}>
        <p className={styles.kicker}>This video</p>
        <h1 className={styles.display}>
          A menu of <span className={styles.am}>plays.</span>
          <br />
          Not a clone of
          <br />
          someone else&apos;s niche.
        </h1>
      </SlideShell>

      <SlideShell on={index === 5} ghost="01">
        <p className={styles.kicker}>Play 01</p>
        <h1 className={styles.display}>
          Specialist query
          <br />
          <span className={styles.am}>× named place.</span>
        </h1>
        <p className={styles.lede}>Exact-match domains. The page is the property.</p>
      </SlideShell>

      <SlideShell on={index === 6} ghost="02">
        <p className={styles.kicker}>Play 02 &nbsp;·&nbsp; finer geo</p>
        <ul className={`${styles.stack} ${styles.stackHuge}`}>
          <li>First-ring suburb.</li>
          <li>Exurban belt.</li>
          <li>County.</li>
          <li className={styles.dim}>Not &quot;the city.&quot;</li>
        </ul>
      </SlideShell>

      <SlideShell on={index === 7} ghost="03">
        <p className={styles.kicker}>Play 03 &nbsp;·&nbsp; utility territory</p>
        <h1 className={`${styles.display} ${styles.displaySm}`}>
          Speak the utility.
          <br />
          <span className={styles.am}>Duke. ConEd. PGE.</span>
        </h1>
        <p className={styles.lede}>Outage maps already trained the searcher.</p>
      </SlideShell>

      <SlideShell on={index === 8} ghost="04">
        <p className={styles.kicker}>Play 04 &nbsp;·&nbsp; time-boxed</p>
        <h1 className={styles.display}>Event satellites.</h1>
        <ul className={styles.stack} style={{ marginTop: "0.7em" }}>
          <li>Heat dome.</li>
          <li>Ice storm.</li>
          <li className={styles.am}>Rebate window.</li>
        </ul>
      </SlideShell>

      <SlideShell on={index === 9} ghost="05">
        <p className={styles.kicker}>Play 05 &nbsp;·&nbsp; three SERP surfaces</p>
        <div className={styles.trio}>
          <div className={styles.trioRow}>
            <span className={styles.trioN}>01</span>
            <span className={styles.trioT}>Conversion hub</span>
          </div>
          <div className={styles.trioRow}>
            <span className={styles.trioN}>02</span>
            <span className={styles.trioT}>Isolated satellites</span>
          </div>
          <div className={styles.trioRow}>
            <span className={styles.trioN}>03</span>
            <span className={`${styles.trioT} ${styles.am}`}>A directory</span>
          </div>
        </div>
      </SlideShell>

      <SlideShell on={index === 10} ghost="06">
        <p className={styles.kicker}>Play 06 &nbsp;·&nbsp; how you get paid</p>
        <ul className={styles.stack}>
          <li>Rent the line.</li>
          <li>Rev-share the job.</li>
          <li>Run it.</li>
          <li className={styles.am}>Own the truck.</li>
        </ul>
      </SlideShell>

      <SlideShell on={index === 11}>
        <p className={styles.kicker}>The worked example</p>
        <h1 className={`${styles.display} ${styles.displaySm}`}>Why residential power.</h1>
        <ul className={`${styles.stack} ${styles.stackTight}`} style={{ marginTop: "0.7em" }}>
          <li>Urgent. High ticket.</li>
          <li>Fragmented.</li>
          <li className={styles.am}>No national owner of the long-tail.</li>
        </ul>
      </SlideShell>

      <SlideShell on={index === 12}>
        <p className={styles.kicker}>Six intents &nbsp;·&nbsp; one vertical</p>
        <ul className={`${styles.stack} ${styles.stackTight}`}>
          <li>Standby generators</li>
          <li>Automatic transfer switches</li>
          <li>200A service-panel upgrades</li>
          <li>Level-2 EVSE</li>
          <li>Whole-home battery + inverter</li>
          <li className={styles.am}>Storm temporary-power</li>
        </ul>
      </SlideShell>

      <SlideShell on={index === 13}>
        <p className={styles.kicker}>The matrix &nbsp;·&nbsp; one commuting shed</p>
        <div className={styles.eq}>
          6 × 12 = <span className={styles.am}>72</span>
        </div>
        <p className={styles.lede} style={{ marginTop: "0.55em" }}>
          Six intents. Twelve named places. Seventy-two isolated properties.
        </p>
        <Matrix />
      </SlideShell>

      <SlideShell on={index === 14}>
        <p className={styles.kicker}>Rules &nbsp;·&nbsp; non-negotiable</p>
        <ul className={styles.stack}>
          <li>One intent. One place.</li>
          <li>One tracked DID.</li>
          <li>No shared link graph.</li>
          <li className={styles.am}>Flat HTML.</li>
        </ul>
      </SlideShell>

      <SlideShell on={index === 15}>
        <p className={styles.kicker}>Intake</p>
        <ul className={`${styles.stack} ${styles.stackHuge}`}>
          <li>Unique DID</li>
          <li className={styles.dim}>→ one AI qualifier</li>
          <li className={styles.am}>→ a licensed electrician</li>
        </ul>
      </SlideShell>

      <SlideShell on={index === 16}>
        <p className={styles.kicker}>Cost &nbsp;·&nbsp; be boring</p>
        <div className={styles.cost}>
          <div className={styles.costLine}>
            Domain first. <span className={styles.am}>$12–40.</span>
          </div>
          <div className={styles.costNote}>
            The page is a day. The DID is a few dollars a month.
          </div>
          <div className={styles.costLine}>Prove the pair.</div>
          <div className={`${styles.costLine} ${styles.am}`}>Then clone.</div>
        </div>
      </SlideShell>

      <SlideShell on={index === 17}>
        <p className={styles.kicker}>Build order</p>
        <div className={styles.trio}>
          <div className={styles.trioRow}>
            <span className={styles.trioN}>01</span>
            <span className={styles.trioT}>Prove one query-place pair</span>
          </div>
          <div className={styles.trioRow}>
            <span className={styles.trioN}>02</span>
            <span className={styles.trioT}>Clone the winner across places</span>
          </div>
          <div className={styles.trioRow}>
            <span className={styles.trioN}>03</span>
            <span className={`${styles.trioT} ${styles.am}`}>Add the next intent</span>
          </div>
        </div>
      </SlideShell>

      <SlideShell on={index === 18}>
        <p className={styles.kicker}>Same plays &nbsp;·&nbsp; other trades</p>
        <ul className={styles.cols}>
          <li>Storm tarp</li>
          <li>Septic</li>
          <li>Wildlife</li>
          <li>Injectables</li>
          <li>Tree-to-wire</li>
          <li className={styles.am}>Foundation</li>
        </ul>
      </SlideShell>

      <SlideShell on={index === 19}>
        <p className={styles.kicker}>The only sequence</p>
        <h1 className={styles.display}>
          Don&apos;t spray 80 clones
          <br />
          on day one.
        </h1>
        <p className={`${styles.lede} ${styles.ledeSerif}`} style={{ marginTop: "1.1em" }}>
          Prove one. Then the map fills itself.
        </p>
      </SlideShell>

      <SlideShell on={index === 20}>
        <div className={styles.rule} />
        <h1 className={`${styles.display} ${styles.displayLg}`}>
          A hundred front doors.
          <br />
          <span className={styles.am}>One trade.</span>
        </h1>
        <span className={styles.endSub}>Subscribe</span>
      </SlideShell>
    </div>
  );
}
