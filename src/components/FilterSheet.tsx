"use client";

import { POPULARITY_BANDS, GENDER_LABEL, type Gender } from "@/lib/types";
import { useSprout } from "@/lib/store";
import { Modal } from "./Modal";

const GENDERS: Gender[] = ["M", "F", "N"];

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

export function FilterSheet() {
  const s = useSprout();
  const { filters, lengthBounds } = s;
  const min = filters.lengthMin ?? lengthBounds.min;
  const max = filters.lengthMax ?? lengthBounds.max;
  const canSlide = lengthBounds.max > lengthBounds.min;

  // Sliding back to the full range stores null, so names added to the list later are never hidden.
  const setLength = (lo: number, hi: number) =>
    s.updateFilters({
      lengthMin: lo <= lengthBounds.min ? null : lo,
      lengthMax: hi >= lengthBounds.max ? null : hi,
    });

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

      {canSlide && (
        <div className="filter-section">
          <div className="small-label">
            NAME LENGTH: {min}–{max} LETTERS
          </div>
          <div className="range">
            <label className="sr-only" htmlFor="len-min">
              Shortest name length
            </label>
            <input
              id="len-min"
              type="range"
              min={lengthBounds.min}
              max={lengthBounds.max}
              value={min}
              onChange={(e) => setLength(Math.min(Number(e.target.value), max), max)}
            />
            <label className="sr-only" htmlFor="len-max">
              Longest name length
            </label>
            <input
              id="len-max"
              type="range"
              min={lengthBounds.min}
              max={lengthBounds.max}
              value={max}
              onChange={(e) => setLength(min, Math.max(Number(e.target.value), min))}
            />
          </div>
        </div>
      )}

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
