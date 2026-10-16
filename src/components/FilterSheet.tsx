"use client";

import { SYLLABLE_OPTIONS, syllableLabel } from "@/lib/domain";
import { useSprout } from "@/lib/store";
import { GENDER_LABEL, POPULARITY_BANDS, type Gender } from "@/lib/types";
import { Modal } from "./Modal";

const GENDERS: Gender[] = ["M", "F", "N"];

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

export function FilterSheet() {
  const s = useSprout();
  const { filters } = s;

  return (
    <Modal label="Filters" onClose={() => s.setShowFilters(false)}>
      <h2 className="title">Filters</h2>

      <div className="filter-section">
        <div className="small-label">GENDER</div>
        <div className="chips">
          {GENDERS.map((g) => (
            <button
              key={g}
              className="chip"
              aria-pressed={filters.genders.includes(g)}
              onClick={() => s.updateFilters({ genders: toggle(filters.genders, g) })}
            >
              {GENDER_LABEL[g]}
            </button>
          ))}
        </div>
      </div>

      {s.allOrigins.length > 0 && (
        <div className="filter-section">
          <div className="small-label">ORIGIN</div>
          <div className="chips">
            {s.allOrigins.map((o) => (
              <button
                key={o}
                className="chip"
                aria-pressed={filters.origins.includes(o)}
                onClick={() => s.updateFilters({ origins: toggle(filters.origins, o) })}
              >
                {o}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="filter-section">
        <div className="small-label">SYLLABLES</div>
        <div className="chips">
          {SYLLABLE_OPTIONS.map((n) => (
            <button
              key={n}
              className="chip"
              aria-pressed={filters.syllables.includes(n)}
              onClick={() => s.updateFilters({ syllables: toggle(filters.syllables, n) })}
            >
              {syllableLabel(n)}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-section">
        <div className="small-label">POPULARITY</div>
        <div className="chips">
          {POPULARITY_BANDS.map((b) => (
            <button
              key={b.id}
              className="chip"
              aria-pressed={filters.popularity === b.id}
              onClick={() => s.updateFilters({ popularity: b.id })}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      <div className="row" style={{ justifyContent: "space-between", marginTop: 6 }}>
        <button className="btn ghost" onClick={s.resetFilters}>
          Reset
        </button>
        <button className="btn" onClick={() => s.setShowFilters(false)}>
          Show {s.totalAllowed} names
        </button>
      </div>
    </Modal>
  );
}
