"use client";

import { useMemo, useState } from "react";
import {
  DEFAULT_FILTERS,
  SYLLABLE_OPTIONS,
  gendersFor,
  genderPrefOf,
  syllableLabel,
  type GenderPref,
} from "@/lib/domain";
import { useSprout } from "@/lib/store";
import type { Filters } from "@/lib/types";

const COLLAPSED_ORIGINS = 12;

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

/** First-run (and "edit my preferences") screen: which names should land in the deck. */
export function Setup() {
  const s = useSprout();
  const initial = useMemo(() => genderPrefOf(s.filters), [s.filters]);

  const [pref, setPref] = useState<GenderPref>(initial.pref);
  const [neutral, setNeutral] = useState(initial.neutral);
  const [origins, setOrigins] = useState<string[]>(s.filters.origins);
  const [syllables, setSyllables] = useState<number[]>(s.filters.syllables);
  const [showAllOrigins, setShowAllOrigins] = useState(false);

  const filters: Filters = {
    ...DEFAULT_FILTERS,
    ...s.filters,
    genders: gendersFor(pref, neutral),
    origins,
    syllables,
  };
  const matching = s.countMatching(filters);
  const visibleOrigins = showAllOrigins ? s.originCounts : s.originCounts.slice(0, COLLAPSED_ORIGINS);
  // Keep anything already picked visible even when the list is collapsed.
  const hiddenPicked = s.originCounts.filter(
    (o) => origins.includes(o.origin) && !visibleOrigins.some((v) => v.origin === o.origin),
  );

  const genderChoices: { id: GenderPref; label: string }[] = [
    { id: "boy", label: "Boys" },
    { id: "girl", label: "Girls" },
    { id: "both", label: "Both" },
  ];

  return (
    <main className="setup">
      <div className="setup-body">
        <div className="wordmark">🌱 Sprout</div>
        <h1 className="title" style={{ fontSize: 28, marginTop: 6 }}>
          What kind of names do you like?
        </h1>
        <p className="muted" style={{ margin: "6px 0 0" }}>
          We&apos;ll start your deck with these. You can change any of it later from the filters.
        </p>

        <section className="filter-section" aria-labelledby="setup-gender">
          <div id="setup-gender" className="small-label">
            I&apos;M LOOKING FOR
          </div>
          <div className="seg wide" role="group" aria-label="Names for">
            {genderChoices.map((g) => (
              <button key={g.id} aria-pressed={pref === g.id} onClick={() => setPref(g.id)}>
                {g.label}
              </button>
            ))}
          </div>
          {pref !== "both" && (
            <label className="check">
              <input type="checkbox" checked={neutral} onChange={(e) => setNeutral(e.target.checked)} />
              <span>Include gender-neutral names</span>
            </label>
          )}
        </section>

        <section className="filter-section" aria-labelledby="setup-origin">
          <div id="setup-origin" className="small-label">
            ORIGIN <span className="muted">(pick any, or none for all)</span>
          </div>
          <div className="chips">
            {[...visibleOrigins, ...hiddenPicked].map(({ origin, count }) => (
              <button
                key={origin}
                className="chip"
                aria-pressed={origins.includes(origin)}
                onClick={() => setOrigins(toggle(origins, origin))}
              >
                {origin} <span className="chip-count">{count}</span>
              </button>
            ))}
          </div>
          {s.originCounts.length > COLLAPSED_ORIGINS && (
            <button className="link-btn quiet" onClick={() => setShowAllOrigins(!showAllOrigins)}>
              {showAllOrigins ? "Show fewer" : `Show all ${s.originCounts.length} origins`}
            </button>
          )}
        </section>

        <section className="filter-section" aria-labelledby="setup-syll">
          <div id="setup-syll" className="small-label">
            SYLLABLES <span className="muted">(pick any, or none for all)</span>
          </div>
          <div className="chips">
            {SYLLABLE_OPTIONS.map((n) => (
              <button
                key={n}
                className="chip"
                aria-pressed={syllables.includes(n)}
                onClick={() => setSyllables(toggle(syllables, n))}
              >
                {syllableLabel(n)}
              </button>
            ))}
          </div>
        </section>
      </div>

      <div className="setup-footer">
        <button className="btn block" onClick={() => s.finishSetup(filters)} disabled={matching === 0}>
          {matching === 0 ? "No names match — loosen a choice" : `Start swiping · ${matching.toLocaleString()} names`}
        </button>
        <button className="btn ghost block" onClick={s.skipSetup}>
          {s.firstRun ? "Skip for now" : "Cancel"}
        </button>
      </div>
    </main>
  );
}
