import { type Cluster, type Filters, POPULARITY_BANDS } from "./types";

export const DEFAULT_FILTERS: Filters = {
  genders: [],
  origins: [],
  lengthMin: null,
  lengthMax: null,
  popularity: "any",
};

export function popularityLabel(c: Cluster): string | null {
  if (c.nzRank != null && c.nzYear != null) return `NZ #${c.nzRank} in ${c.nzYear}`;
  if (c.usRank != null) return `US #${c.usRank}`;
  return null;
}

export function altSpellings(c: Cluster): string[] {
  return c.variants.filter((v) => v !== c.name);
}

export function filtersMatch(f: Filters, c: Cluster): boolean {
  if (f.genders.length > 0 && !f.genders.includes(c.gender)) return false;
  if (f.origins.length > 0 && !c.origins.some((o) => f.origins.includes(o))) return false;
  const length = c.name.length;
  if (f.lengthMin != null && length < f.lengthMin) return false;
  if (f.lengthMax != null && length > f.lengthMax) return false;
  const cap = POPULARITY_BANDS.find((b) => b.id === f.popularity)?.maxRank ?? null;
  if (cap != null) {
    const best = c.nzRank ?? c.usRank;
    if (best == null || best > cap) return false;
  }
  return true;
}

/** A cluster both people have liked that isn't already known — pure, client-side. */
export function findNewMatches(
  myLikes: Iterable<number>,
  partnerLikes: Iterable<number>,
  alreadyMatched: Iterable<number>,
): number[] {
  const partner = new Set(partnerLikes);
  const matched = new Set(alreadyMatched);
  const out: number[] = [];
  for (const id of new Set(myLikes)) {
    if (partner.has(id) && !matched.has(id)) out.push(id);
  }
  return out;
}

export interface RankedItem {
  clusterId: number;
  combinedScore: number;
  myPosition: number | null;
  partnerPosition: number | null;
  /** Gap between the two positions; null if either person hasn't ranked it yet. */
  disagreement: number | null;
}

/**
 * Borda count over both people's rankings. Position 0 scores n, last scores 1,
 * where n is the longer ranking. An item only one person has ranked still
 * counts for them rather than being penalised.
 */
export function combineRankings(my: number[], partner: number[]): RankedItem[] {
  const n = Math.max(my.length, partner.length);
  const myPos = new Map(my.map((id, i) => [id, i]));
  const partnerPos = new Map(partner.map((id, i) => [id, i]));
  const ids = [...new Set([...my, ...partner])];

  return ids
    .map((id): RankedItem => {
      const m = myPos.get(id);
      const p = partnerPos.get(id);
      return {
        clusterId: id,
        combinedScore: (m != null ? n - m : 0) + (p != null ? n - p : 0),
        myPosition: m ?? null,
        partnerPosition: p ?? null,
        disagreement: m != null && p != null ? Math.abs(m - p) : null,
      };
    })
    .sort((a, b) => b.combinedScore - a.combinedScore);
}

/** Small stable hash so equally-popular names don't fall into alphabetical order. */
function tieBreak(id: number): number {
  let h = id % 2147483647;
  h = (h * 48271) % 2147483647;
  return h;
}

/** Tier first (so "tier complete" means something), then popularity, then a stable shuffle. */
export function sortForDeck(clusters: Cluster[]): Cluster[] {
  return [...clusters].sort(
    (a, b) => a.tier - b.tier || b.pop - a.pop || tieBreak(a.id) - tieBreak(b.id),
  );
}

const CODE_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O or 1/I — read aloud and typed by hand
export const CODE_LENGTH = 6;

export function generateCoupleCode(random: (n: number) => number = (n) => Math.floor(Math.random() * n)): string {
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) out += CODE_CHARSET[random(CODE_CHARSET.length)];
  return out;
}

export function cleanCodeInput(text: string): string {
  return text.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, CODE_LENGTH);
}
