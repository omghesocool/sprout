import { type Cluster, type CustomName, type Filters, type Gender, POPULARITY_BANDS } from "./types";

export const DEFAULT_FILTERS: Filters = {
  genders: [],
  origins: [],
  syllables: [],
  popularity: "any",
};

/** The syllable filter offers 1, 2, 3 and "4+". */
export const SYLLABLE_OPTIONS = [1, 2, 3, 4] as const;
export const syllableLabel = (n: number) => (n >= 4 ? "4+" : String(n));
const syllableBucket = (n: number) => Math.min(Math.max(n, 1), 4);

export function popularityLabel(c: Cluster): string | null {
  if (c.nzRank != null && c.nzYear != null) return `NZ #${c.nzRank} in ${c.nzYear}`;
  if (c.usRank != null) return `US #${c.usRank}`;
  return null;
}

/** The primary origin to print, or null when the list doesn't say. */
export function displayOrigin(c: Cluster): string | null {
  const o = c.origins[0];
  return o && o !== "Unknown" ? o : null;
}

export function altSpellings(c: Cluster): string[] {
  return c.variants.filter((v) => v !== c.name);
}

export function filtersMatch(f: Filters, c: Cluster): boolean {
  if (f.genders.length > 0 && !f.genders.includes(c.gender)) return false;
  if (f.origins.length > 0 && !c.origins.some((o) => f.origins.includes(o))) return false;
  if (f.syllables.length > 0 && !f.syllables.includes(syllableBucket(c.syllables))) return false;
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

// ---- names people add themselves ----

export const MAX_NAME_LENGTH = 30;
export const MAX_ORIGIN_LENGTH = 30;
export const MAX_MEANING_LENGTH = 120;

/** Case-, accent- and spacing-insensitive form used to spot duplicates. */
export function canonicalName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export interface CustomNameInput {
  name: string;
  gender: Gender | null;
  origin: string;
  meaning: string;
}

/** Returns an error message, or null if the input is fine. */
export function validateCustomName(input: CustomNameInput): string | null {
  const name = input.name.trim();
  if (!name) return "Type a name first.";
  if (name.length > MAX_NAME_LENGTH) return `Names can be up to ${MAX_NAME_LENGTH} letters.`;
  if (!/^\p{L}[\p{L}\p{M}'’ -]*$/u.test(name)) return "Names can only use letters, spaces, hyphens and apostrophes.";
  if (!input.gender) return "Pick Boy, Girl or Gender-neutral.";
  if (input.origin.trim().length > MAX_ORIGIN_LENGTH) return `Origin can be up to ${MAX_ORIGIN_LENGTH} characters.`;
  if (input.meaning.trim().length > MAX_MEANING_LENGTH) return `Meaning can be up to ${MAX_MEANING_LENGTH} characters.`;
  return null;
}

/**
 * The existing card this name would collide with, if any: same spelling (or listed as a variant)
 * in the same gender, or in a neutral card either way round.
 */
export function findDuplicate(existing: Cluster[], name: string, gender: Gender): Cluster | undefined {
  const key = canonicalName(name);
  return existing.find(
    (c) =>
      (c.gender === gender || c.gender === "N" || gender === "N") &&
      (canonicalName(c.name) === key || c.variants.some((v) => canonicalName(v) === key)),
  );
}

/** Stable 53-bit ID (safe as a JS number and a Firestore integer) derived from the name, so both
 * partners adding the same name land on the same card. The "custom:" prefix keeps these away from
 * the IDs the names pipeline hashes for the built-in list. */
export async function customNameId(gender: Gender, name: string): Promise<number> {
  const bytes = new TextEncoder().encode(`custom:${gender}:${canonicalName(name)}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Number(new DataView(digest).getBigUint64(0) & ((1n << 53n) - 1n));
}

/** Custom names come first in the deck: someone went to the trouble of typing them in. */
export function customToCluster(c: CustomName, myUid: string | null): Cluster {
  return {
    id: c.id,
    name: c.name,
    gender: c.gender,
    meaning: c.meaning,
    etymology: null,
    origins: [c.origin || "Unknown"],
    tier: 1,
    syllables: estimateSyllables(c.name, c.origin ? [c.origin] : []),
    variants: [c.name],
    nzRank: null,
    nzYear: null,
    usRank: null,
    pop: 1,
    addedBy: c.addedBy === myUid ? "me" : "partner",
  };
}

// ---- syllables ----

const EVERY_VOWEL_ORIGINS = new Set(["Māori", "Pacific", "Hawaiian"]);
const MAORI_DIPHTHONGS = new Set(["ae", "ai", "ao", "au", "ei", "eu", "oi", "ou"]);
const HIATUS = new Set(["ia", "io", "iu", "ua", "uo", "eo", "oe"]);

function groupEveryVowel(group: string): number {
  let count = 0;
  for (let i = 0; i < group.length; ) {
    count++;
    i += MAORI_DIPHTHONGS.has(group.slice(i, i + 2)) ? 2 : 1;
  }
  return count;
}

function groupEnglish(group: string, atEnd: boolean, prev: string): number {
  let count = 1;
  for (let i = 0; i < group.length - 1; i++) {
    const pair = group[i] + group[i + 1];
    if (HIATUS.has(pair)) count++;
    else if (pair === "ie" && !(atEnd && i === group.length - 2)) count++; // Daniel, Gabriel; not Annie
    else if (pair === "ui" && !["q", "g"].includes(i > 0 ? group[i - 1] : prev)) count++; // Luisa; not Quinn
    else if ((pair === "ea" || pair === "oa") && atEnd && group.length === 2) count++; // Andrea, Noa
  }
  return count;
}

/**
 * Rule-based syllable count for a given name — the same rules as names-etl's `estimate_syllables`,
 * used for names people type in themselves. Approximate by design (it only feeds a 1 / 2 / 3 / 4+
 * filter), so the built-in list's counts were checked by hand instead.
 */
export function estimateSyllables(word: string, origins: readonly string[] = []): number {
  const lower = word.trim().toLowerCase();
  if (!lower) return 0;
  const parts = lower.split(/[\s\-'’]+/).filter(Boolean);
  if (parts.length > 1) return parts.reduce((sum, p) => sum + estimateSyllables(p, origins), 0);

  const everyVowel = origins.length > 0 && EVERY_VOWEL_ORIGINS.has(origins[0]);
  const chars = lower.normalize("NFKD").replace(/\p{M}/gu, "").split("");
  // y is a consonant at the start of a word or between vowels (Yara, Maya), otherwise a vowel.
  chars.forEach((c, i) => {
    if (c !== "y") return;
    const before = i > 0 && "aeiou".includes(chars[i - 1]);
    const after = i + 1 < chars.length && "aeiou".includes(chars[i + 1]);
    if ((i === 0 && after) || (before && after)) chars[i] = "ʏ";
  });
  const plain = chars.join("");

  let count = 0;
  for (const m of plain.matchAll(/[aeiouy]+/g)) {
    const start = m.index ?? 0;
    const group = m[0];
    count += everyVowel
      ? groupEveryVowel(group)
      : groupEnglish(group, start + group.length === plain.length, start > 0 ? plain[start - 1] : "");
  }
  if (!everyVowel && count > 1 && plain.endsWith("e") && !"aeiouy".includes(plain[plain.length - 2])) {
    const syllabicLe = plain.length > 2 && plain.endsWith("le") && !"aeiouyl".includes(plain[plain.length - 3]);
    if (!syllabicLe) count--; // silent final e (Kate, Claire, Isabelle)
  }
  return Math.max(count, 1);
}

// ---- name preferences (the setup screen) ----

export type GenderPref = "boy" | "girl" | "both";

/** Boys / Girls pick that gender's names plus, optionally, the gender-neutral ones. Both = no filter. */
export function gendersFor(pref: GenderPref, includeNeutral: boolean): Gender[] {
  if (pref === "both") return [];
  const own: Gender = pref === "boy" ? "M" : "F";
  return includeNeutral ? [own, "N"] : [own];
}

export function genderPrefOf(f: Filters): { pref: GenderPref; neutral: boolean } {
  const hasM = f.genders.includes("M");
  const hasF = f.genders.includes("F");
  if (hasM && !hasF) return { pref: "boy", neutral: f.genders.includes("N") };
  if (hasF && !hasM) return { pref: "girl", neutral: f.genders.includes("N") };
  return { pref: "both", neutral: true };
}

// ---- "my names" statistics ----

export interface OriginStat {
  origin: string;
  liked: number;
  seen: number;
}

export interface PickStats {
  liked: number;
  passed: number;
  /** Share of names seen that were liked, 0-1 (null before the first swipe). */
  likeRate: number | null;
  likedByGender: Record<Gender, number>;
  likedOrigins: OriginStat[];
  likedSyllables: { label: string; count: number }[];
}

export function computePickStats(liked: Cluster[], passed: Cluster[], maxOrigins = 8): PickStats {
  const likedByGender: Record<Gender, number> = { M: 0, F: 0, N: 0 };
  const origins = new Map<string, OriginStat>();
  const bump = (c: Cluster, isLike: boolean) => {
    const origin = displayOrigin(c) ?? "Not specified";
    const stat = origins.get(origin) ?? { origin, liked: 0, seen: 0 };
    stat.seen++;
    if (isLike) stat.liked++;
    origins.set(origin, stat);
  };
  const syllableCounts = new Map<number, number>();
  for (const c of liked) {
    likedByGender[c.gender]++;
    bump(c, true);
    const bucket = syllableBucket(c.syllables);
    syllableCounts.set(bucket, (syllableCounts.get(bucket) ?? 0) + 1);
  }
  for (const c of passed) bump(c, false);

  const total = liked.length + passed.length;
  return {
    liked: liked.length,
    passed: passed.length,
    likeRate: total > 0 ? liked.length / total : null,
    likedByGender,
    likedOrigins: [...origins.values()]
      .filter((o) => o.liked > 0)
      .sort((a, b) => b.liked - a.liked || a.origin.localeCompare(b.origin))
      .slice(0, maxOrigins),
    likedSyllables: SYLLABLE_OPTIONS.map((n) => ({ label: syllableLabel(n), count: syllableCounts.get(n) ?? 0 })),
  };
}
