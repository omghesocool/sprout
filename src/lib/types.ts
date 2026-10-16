export type Gender = "M" | "F" | "N";

export const GENDER_LABEL: Record<Gender, string> = {
  M: "Boy",
  F: "Girl",
  N: "Gender-neutral",
};

/** One swipeable card: a name plus its alternate spellings. Mirrors names-etl's `cluster`. */
export interface Cluster {
  id: number;
  name: string;
  gender: Gender;
  meaning: string;
  etymology: string | null;
  origins: string[];
  tier: number;
  /** How many syllables the name has (used by the syllable filter). */
  syllables: number;
  /** Includes `name` itself, first. */
  variants: string[];
  nzRank: number | null;
  nzYear: number | null;
  usRank: number | null;
  pop: number;
  /** Set only on names a user typed in themselves. */
  addedBy?: "me" | "partner";
}

export interface NamesFile {
  schemaVersion: number;
  builtAt: string;
  clusters: Cluster[];
}

export type PopularityBand = "any" | "top25" | "top50" | "top100";

export const POPULARITY_BANDS: { id: PopularityBand; label: string; maxRank: number | null }[] = [
  { id: "any", label: "Any", maxRank: null },
  { id: "top25", label: "Top 25", maxRank: 25 },
  { id: "top50", label: "Top 50", maxRank: 50 },
  { id: "top100", label: "Top 100", maxRank: 100 },
];

/** Empty gender/origin lists mean "no filter". */
export interface Filters {
  genders: Gender[];
  origins: string[];
  /** Syllable counts to include; 4 means "4 or more". Empty = any. */
  syllables: number[];
  popularity: PopularityBand;
}

export interface SwipeRecord {
  liked: boolean;
  ts: number;
  /** False until the Firestore write for this swipe has succeeded. */
  synced: boolean;
}

/** A name someone in the couple added themselves. Stored in Firestore so both partners see it. */
export interface CustomName {
  id: number;
  name: string;
  gender: Gender;
  origin: string;
  meaning: string;
  /** Firebase uid of whoever added it; only they can remove it. */
  addedBy: string;
  ts: number;
}

/** A custom name as kept on this device; `synced` is false until Firestore has it. */
export interface CustomRecord extends CustomName {
  synced: boolean;
}
