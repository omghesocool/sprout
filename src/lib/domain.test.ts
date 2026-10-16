import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  SYLLABLE_OPTIONS,
  canonicalName,
  computePickStats,
  customNameId,
  estimateSyllables,
  gendersFor,
  genderPrefOf,
  syllableLabel,
  customToCluster,
  findDuplicate,
  validateCustomName,
  DEFAULT_FILTERS,
  cleanCodeInput,
  combineRankings,
  filtersMatch,
  findNewMatches,
  generateCoupleCode,
  popularityLabel,
  sortForDeck,
} from "./domain";
import type { Cluster } from "./types";

const base: Cluster = {
  id: 1,
  name: "Aiden",
  gender: "M",
  meaning: "little fire",
  etymology: null,
  origins: ["Irish"],
  tier: 1,
  syllables: 2,
  variants: ["Aiden", "Aidan"],
  nzRank: null,
  nzYear: null,
  usRank: null,
  pop: 0,
};
const c = (patch: Partial<Cluster>): Cluster => ({ ...base, ...patch });

describe("filtersMatch", () => {
  it("matches everything by default", () => {
    expect(filtersMatch(DEFAULT_FILTERS, base)).toBe(true);
  });

  it("filters by gender and origin; empty lists mean no filter", () => {
    expect(filtersMatch({ ...DEFAULT_FILTERS, genders: ["F"] }, base)).toBe(false);
    expect(filtersMatch({ ...DEFAULT_FILTERS, genders: ["M", "F"] }, base)).toBe(true);
    expect(filtersMatch({ ...DEFAULT_FILTERS, origins: ["Latin"] }, base)).toBe(false);
    expect(filtersMatch({ ...DEFAULT_FILTERS, origins: ["Latin", "Irish"] }, base)).toBe(true);
  });

  it("filters by syllables, where 4 means four or more", () => {
    expect(filtersMatch({ ...DEFAULT_FILTERS, syllables: [1] }, base)).toBe(false);
    expect(filtersMatch({ ...DEFAULT_FILTERS, syllables: [1, 2] }, base)).toBe(true);
    expect(filtersMatch({ ...DEFAULT_FILTERS, syllables: [4] }, c({ syllables: 6 }))).toBe(true);
    expect(filtersMatch({ ...DEFAULT_FILTERS, syllables: [3] }, c({ syllables: 6 }))).toBe(false);
  });

  it("popularity uses NZ rank first, then US rank, and hides unranked names", () => {
    const top25 = { ...DEFAULT_FILTERS, popularity: "top25" as const };
    expect(filtersMatch(top25, base)).toBe(false);
    expect(filtersMatch(top25, c({ nzRank: 10, nzYear: 2020 }))).toBe(true);
    expect(filtersMatch(top25, c({ nzRank: 80, usRank: 5 }))).toBe(false); // NZ wins over a better US rank
    expect(filtersMatch(top25, c({ usRank: 5 }))).toBe(true);
  });
});

describe("popularityLabel", () => {
  it("is never a bare number", () => {
    expect(popularityLabel(c({ nzRank: 34, nzYear: 2019 }))).toBe("NZ #34 in 2019");
    expect(popularityLabel(c({ usRank: 12 }))).toBe("US #12");
    expect(popularityLabel(c({ nzRank: 34 }))).toBeNull();
    expect(popularityLabel(base)).toBeNull();
  });
});

describe("findNewMatches", () => {
  it("is likes in common minus what is already matched", () => {
    expect(findNewMatches([1, 2, 3], [2, 3, 4], [3])).toEqual([2]);
    expect(findNewMatches([], [1], [])).toEqual([]);
  });
});

describe("combineRankings (Borda)", () => {
  it("scores position 0 highest and orders by combined score", () => {
    const out = combineRankings([1, 2, 3], [3, 2, 1]);
    expect(out.find((i) => i.clusterId === 2)?.combinedScore).toBe(4);
    expect(out.find((i) => i.clusterId === 1)?.combinedScore).toBe(4);
    expect(out.find((i) => i.clusterId === 1)?.disagreement).toBe(2);
    expect(out.map((i) => i.combinedScore)).toEqual([...out.map((i) => i.combinedScore)].sort((a, b) => b - a));
  });

  it("does not penalise something only one person has ranked", () => {
    const out = combineRankings([1, 2], [1]);
    const two = out.find((i) => i.clusterId === 2)!;
    expect(two.partnerPosition).toBeNull();
    expect(two.disagreement).toBeNull();
    expect(two.combinedScore).toBe(1);
  });
});

describe("sortForDeck", () => {
  it("orders by tier, then popularity", () => {
    const sorted = sortForDeck([c({ id: 1, tier: 2, pop: 1 }), c({ id: 2, tier: 1, pop: 0.1 }), c({ id: 3, tier: 1, pop: 0.9 })]);
    expect(sorted.map((x) => x.id)).toEqual([3, 2, 1]);
  });

  it("is stable across calls for equally-popular names", () => {
    const list = [1, 2, 3, 4, 5].map((id) => c({ id }));
    expect(sortForDeck(list).map((x) => x.id)).toEqual(sortForDeck([...list].reverse()).map((x) => x.id));
  });
});

describe("couple codes", () => {
  it("generates 6 characters without ambiguous 0/O/1/I", () => {
    for (let i = 0; i < 200; i++) expect(generateCoupleCode()).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
  });

  it("cleans typed input", () => {
    expect(cleanCodeInput(" ab-c d3ef9 ")).toBe("ABCD3E");
  });
});

describe("custom names", () => {
  const list = [
    c({ id: 1, name: "Aidan", gender: "M", variants: ["Aidan", "Aiden"] }),
    c({ id: 2, name: "Riley", gender: "N", variants: ["Riley"] }),
    c({ id: 3, name: "Zoe", gender: "F", variants: ["Zoe", "Zoë"] }),
  ];

  it("canonicalName ignores case, accents and spacing", () => {
    expect(canonicalName("  Zoë ")).toBe("zoe");
    expect(canonicalName("ANNE  marie")).toBe("anne marie");
  });

  it("validates input", () => {
    const ok = { name: "Oakley", gender: "M" as const, origin: "", meaning: "" };
    expect(validateCustomName(ok)).toBeNull();
    expect(validateCustomName({ ...ok, name: "  " })).toMatch(/name/i);
    expect(validateCustomName({ ...ok, name: "R2D2" })).toMatch(/letters/i);
    expect(validateCustomName({ ...ok, name: "Mary-Anne O'Neil" })).toBeNull();
    expect(validateCustomName({ ...ok, gender: null })).toMatch(/gender|boy/i);
    expect(validateCustomName({ ...ok, meaning: "x".repeat(121) })).toMatch(/meaning/i);
  });

  it("finds duplicates by spelling, variant and accent, respecting gender", () => {
    expect(findDuplicate(list, "aiden", "M")?.id).toBe(1); // a listed variant
    expect(findDuplicate(list, "Aidan", "F")).toBeUndefined(); // different gender is allowed
    expect(findDuplicate(list, "Riley", "F")?.id).toBe(2); // neutral card blocks either gender
    expect(findDuplicate(list, "Zoë", "F")?.id).toBe(3);
    expect(findDuplicate(list, "Zoe", "N")?.id).toBe(3); // adding neutral over an existing one
    expect(findDuplicate(list, "Oakley", "M")).toBeUndefined();
  });

  it("gives the same ID for the same name and a safe integer", async () => {
    const a = await customNameId("M", "Oakley");
    expect(await customNameId("M", "  oakley ")).toBe(a);
    expect(await customNameId("F", "Oakley")).not.toBe(a);
    expect(Number.isSafeInteger(a)).toBe(true);
    expect(a).toBeGreaterThanOrEqual(0);
  });

  it("builds a deck card that sorts first and records who added it", () => {
    const mine = customToCluster({ id: 9, name: "Oakley", gender: "M", origin: "", meaning: "", addedBy: "u1", ts: 1 }, "u1");
    expect(mine.addedBy).toBe("me");
    expect(mine.origins).toEqual(["Unknown"]);
    expect(customToCluster({ ...{ id: 9, name: "O", gender: "M" as const, origin: "x", meaning: "", ts: 1 }, addedBy: "u2" }, "u1").addedBy).toBe("partner");
    expect(sortForDeck([c({ id: 1, pop: 0.9 }), mine])[0].id).toBe(9);
  });
});

describe("estimateSyllables", () => {
  it.each([
    ["Kate", ["English"], 1],
    ["Aiden", ["Irish"], 2],
    ["Mia", [], 2],
    ["Julia", [], 3],
    ["Olivia", [], 4],
    ["Isabelle", [], 3],
    ["Annie", [], 2],
    ["Maya", [], 2],
    ["Quinn", [], 1],
    ["Gabriel", [], 3],
    ["Luisa", [], 3],
    ["Maple", [], 2],
    ["Mary-Ann", [], 3],
    ["Aroha", ["Māori"], 3],
    ["Kaitiaki", ["Māori"], 4],
    ["Tawhirimatea", ["Māori"], 6],
    ["Wi", ["Māori"], 1],
  ])("%s (%j) has %i", (name, origins, expected) => {
    expect(estimateSyllables(name, origins as string[])).toBe(expected);
  });

  it("agrees with the hand-checked counts in names.json for most of the built-in list", () => {
    const file = JSON.parse(readFileSync("public/names.json", "utf-8")) as { clusters: Cluster[] };
    const agree = file.clusters.filter((n) => estimateSyllables(n.name, n.origins) === n.syllables).length;
    // ~5% were corrected by hand (silent e, Daniel, Leah...); a porting bug would drop this a lot.
    expect(agree / file.clusters.length).toBeGreaterThan(0.93);
  });
});

describe("syllable labels", () => {
  it("offers 1, 2, 3 and 4+", () => {
    expect(SYLLABLE_OPTIONS.map(syllableLabel)).toEqual(["1", "2", "3", "4+"]);
  });
});

describe("gender preferences from the setup screen", () => {
  it("maps Boys/Girls (with or without neutral) and Both to the gender filter", () => {
    expect(gendersFor("boy", true)).toEqual(["M", "N"]);
    expect(gendersFor("girl", false)).toEqual(["F"]);
    expect(gendersFor("both", true)).toEqual([]);
  });

  it("reads a saved filter back into a preference", () => {
    expect(genderPrefOf({ ...DEFAULT_FILTERS, genders: ["M", "N"] })).toEqual({ pref: "boy", neutral: true });
    expect(genderPrefOf({ ...DEFAULT_FILTERS, genders: ["F"] })).toEqual({ pref: "girl", neutral: false });
    expect(genderPrefOf(DEFAULT_FILTERS).pref).toBe("both");
    expect(genderPrefOf({ ...DEFAULT_FILTERS, genders: ["M", "F"] }).pref).toBe("both");
  });
});

describe("computePickStats", () => {
  const liked = [
    c({ id: 1, gender: "M", origins: ["Irish"], syllables: 2 }),
    c({ id: 2, gender: "F", origins: ["Irish"], syllables: 3 }),
    c({ id: 3, gender: "N", origins: ["Latin"], syllables: 6 }),
  ];
  const passed = [c({ id: 4, gender: "F", origins: ["Irish"] }), c({ id: 5, gender: "M", origins: ["Greek"] })];

  it("counts likes by gender, origin and syllables", () => {
    const st = computePickStats(liked, passed);
    expect(st.liked).toBe(3);
    expect(st.passed).toBe(2);
    expect(st.likeRate).toBeCloseTo(0.6);
    expect(st.likedByGender).toEqual({ M: 1, F: 1, N: 1 });
    expect(st.likedOrigins[0]).toEqual({ origin: "Irish", liked: 2, seen: 3 });
    expect(st.likedOrigins.map((o) => o.origin)).not.toContain("Greek"); // passed only
    expect(st.likedSyllables).toEqual([
      { label: "1", count: 0 },
      { label: "2", count: 1 },
      { label: "3", count: 1 },
      { label: "4+", count: 1 },
    ]);
  });

  it("copes with no swipes at all", () => {
    expect(computePickStats([], []).likeRate).toBeNull();
  });
});
