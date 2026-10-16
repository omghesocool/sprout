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
  /** Includes `name` itself, first. */
  variants: string[];
  nzRank: number | null;
  nzYear: number | null;
  usRank: number | null;
  pop: number;
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
  /** null = no limit, so names added to the list later are never silently hidden. */
  lengthMin: number | null;
  lengthMax: number | null;
  popularity: PopularityBand;
}

export interface SwipeRecord {
  liked: boolean;
  ts: number;
  /** False until the Firestore write for this swipe has succeeded. */
  synced: boolean;
}
