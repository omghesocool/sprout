"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  CODE_LENGTH,
  DEFAULT_FILTERS,
  cleanCodeInput,
  combineRankings,
  customNameId,
  customToCluster,
  filtersMatch,
  findDuplicate,
  validateCustomName,
  type CustomNameInput,
  generateCoupleCode,
  sortForDeck,
  type RankedItem,
} from "./domain";
import { ensureSignedIn, isFirebaseConfigured } from "./firebase";
import * as sync from "./sync";
import type { Cluster, CustomRecord, Filters, NamesFile, SwipeRecord } from "./types";

export type Tab = "swipe" | "matches" | "ranking" | "settings";
export type PairingMode = "choose" | "create" | "join";

const STORAGE_KEY = "sprout:v1";
const UNDO_LIMIT = 10;

/** Everything that survives a reload. Swipe keys are cluster IDs as strings (JSON object keys). */
interface Persisted {
  coupleId: string | null;
  swipes: Record<string, SwipeRecord>;
  partnerLikes: number[];
  myRanking: number[];
  partnerRanking: number[];
  unlockedTier: number;
  filters: Filters;
  dark: boolean | null;
  lastSyncMs: number | null;
  /** Names the couple typed in, keyed by cluster ID. */
  customNames: Record<string, CustomRecord>;
}

const EMPTY: Persisted = {
  coupleId: null,
  swipes: {},
  partnerLikes: [],
  myRanking: [],
  partnerRanking: [],
  unlockedTier: 1,
  filters: DEFAULT_FILTERS,
  dark: null,
  lastSyncMs: null,
  customNames: {},
};

function loadPersisted(): Persisted {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<Persisted>;
    return { ...EMPTY, ...parsed, filters: { ...DEFAULT_FILTERS, ...parsed.filters } };
  } catch {
    return EMPTY;
  }
}

export interface RankedDisplay {
  cluster: Cluster;
  myPosition: number | null;
  partnerPosition: number | null;
  disagreement: number | null;
}

interface PairingState {
  mode: PairingMode;
  creating: boolean;
  createError: string | null;
  joinCode: string;
  joining: boolean;
  joinError: string | null;
}

const INITIAL_PAIRING: PairingState = {
  mode: "choose",
  creating: false,
  createError: null,
  joinCode: "",
  joining: false,
  joinError: null,
};

const NETWORK_ERROR = "Couldn't reach the server — check your connection and try again.";
const BAD_CODE_ERROR = "That code doesn't look right — check with your partner and try again.";
const NOT_CONFIGURED_ERROR = "Firebase isn't configured for this site yet — see the README's setup steps.";

export interface Sprout {
  // loading
  ready: boolean;
  namesError: string | null;
  firebaseConfigured: boolean;

  // navigation
  inApp: boolean;
  tab: Tab;
  setTab: (tab: Tab) => void;
  enterApp: () => void;

  // pairing
  coupleId: string | null;
  partnerJoined: boolean;
  pairing: PairingState;
  pairingGo: (mode: PairingMode) => void;
  startCreateCouple: () => void;
  setJoinCode: (text: string) => void;
  submitJoin: () => void;

  // swiping
  deck: Cluster[];
  totalAllowed: number;
  allowedForTierCount: number;
  unlockedTier: number;
  maxTier: number;
  nextTierCount: number;
  canUndo: boolean;
  swipe: (clusterId: number, liked: boolean) => void;
  undo: () => void;
  unlockNextTier: () => void;
  celebration: Cluster | null;
  dismissCelebration: () => void;
  toast: string | null;

  // filters
  filters: Filters;
  allOrigins: string[];
  lengthBounds: { min: number; max: number };
  updateFilters: (patch: Partial<Filters>) => void;
  resetFilters: () => void;
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;

  // matches + ranking
  matches: Cluster[];
  myOrdered: RankedDisplay[];
  combined: RankedDisplay[];
  reorder: (orderedIds: number[]) => void;
  detail: Cluster | null;
  openDetail: (id: number) => void;
  closeDetail: () => void;

  // names people add themselves
  showAddName: boolean;
  setShowAddName: (show: boolean) => void;
  addCustomName: (input: CustomNameInput & { like: boolean }) => Promise<{ ok: true } | { ok: false; error: string }>;
  removeCustomName: (id: number) => void;
  /** Every name either partner has added, newest first. */
  customList: Cluster[];

  // settings
  isDark: boolean;
  toggleDark: () => void;
  leavePairing: () => void;
  lastSyncMs: number | null;
  unsyncedCount: number;
  totalSwipes: number;
  syncNow: () => void;
}

const Ctx = createContext<Sprout | null>(null);

export function useSprout(): Sprout {
  const value = useContext(Ctx);
  if (!value) throw new Error("useSprout must be used inside <SproutProvider>");
  return value;
}

export function SproutProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [p, setP] = useState<Persisted>(EMPTY);
  const pRef = useRef(p);
  pRef.current = p;

  const [names, setNames] = useState<Cluster[] | null>(null);
  const [namesError, setNamesError] = useState<string | null>(null);

  const [inApp, setInApp] = useState(false);
  const [tab, setTab] = useState<Tab>("swipe");
  const [pairing, setPairing] = useState<PairingState>(INITIAL_PAIRING);
  const [showFilters, setShowFilters] = useState(false);
  const [showAddName, setShowAddName] = useState(false);
  const [celebration, setCelebration] = useState<Cluster | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [undoStack, setUndoStack] = useState<number[]>([]);
  const [systemDark, setSystemDark] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const userIdRef = useRef<string | null>(null);
  userIdRef.current = userId;
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);

  const namesRef = useRef<Cluster[] | null>(null);

  // ---- boot: local state + names list ----
  useEffect(() => {
    const loaded = loadPersisted();
    setP(loaded);
    setInApp(Boolean(loaded.coupleId));
    setHydrated(true);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemDark(media.matches);
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    media.addEventListener("change", onChange);

    let cancelled = false;
    fetch("/names.json")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<NamesFile>;
      })
      .then((file) => !cancelled && setNames(file.clusters))
      .catch((e) => !cancelled && setNamesError(`Couldn't load the names list (${String(e)}).`));
    return () => {
      cancelled = true;
      media.removeEventListener("change", onChange);
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    } catch {
      /* storage full or blocked — the app still works, it just won't remember across reloads */
    }
  }, [p, hydrated]);

  const isDark = p.dark ?? systemDark;
  useEffect(() => {
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
  }, [isDark]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(t);
  }, [toast]);

  // ---- sync: sign in + find the partner ----
  const { coupleId } = p;
  useEffect(() => {
    if (!hydrated || !coupleId || !isFirebaseConfigured()) return;
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    ensureSignedIn()
      .then((uid) => {
        if (cancelled) return;
        setUserId(uid);
        unsubscribe = sync.watchPartnerId(coupleId, uid, setPartnerId);
      })
      .catch((err) => {
        console.warn("sign-in failed, will retry", err);
        if (!cancelled) window.setTimeout(() => setRetryTick((n) => n + 1), 15000);
      });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [hydrated, coupleId, retryTick]);

  // ---- sync: partner's likes and ranking, live ----
  useEffect(() => {
    if (!coupleId || !partnerId || !userId) return;
    const offLikes = sync.watchPartnerLikes(coupleId, partnerId, (ids) => {
      const cur = pRef.current;
      const mine = new Set(Object.entries(cur.swipes).filter(([, s]) => s.liked).map(([id]) => Number(id)));
      const before = new Set(cur.partnerLikes);
      const fresh = ids.filter((id) => mine.has(id) && !before.has(id));
      for (const id of fresh) void sync.pushMatch(coupleId, id, Date.now());
      if (fresh.length > 0) {
        const first = namesRef.current?.find((c) => c.id === fresh[0]);
        setToast(first ? `💛 New match: ${first.name}` : "💛 New match!");
      }
      setP((s) => ({ ...s, partnerLikes: ids, lastSyncMs: Date.now() }));
    });
    const offRanking = sync.watchPartnerRanking(coupleId, partnerId, (order) =>
      setP((s) => ({ ...s, partnerRanking: order, lastSyncMs: Date.now() })),
    );
    return () => {
      offLikes();
      offRanking();
    };
  }, [coupleId, partnerId, userId]);

  // ---- sync: names either partner has added ----
  useEffect(() => {
    if (!coupleId || !userId) return;
    return sync.watchCustomNames(coupleId, (docs) => {
      setP((s) => {
        const remote = new Map(docs.map((d) => [String(d.id), d]));
        const next: Record<string, CustomRecord> = {};
        for (const [id, rec] of Object.entries(s.customNames)) {
          // Keep my own not-yet-uploaded names; anything else missing remotely was removed.
          if (!remote.has(id) && !rec.synced && rec.addedBy === userId) next[id] = rec;
        }
        for (const d of docs) next[String(d.id)] = { ...d, synced: true };
        return { ...s, customNames: next };
      });
    });
  }, [coupleId, userId]);

  // ---- sync: push anything still queued ----
  const flushing = useRef(false);
  const flushUnsynced = useCallback(async () => {
    const uid = userIdRef.current;
    const code = pRef.current.coupleId;
    if (!uid || !code || flushing.current) return;
    flushing.current = true;
    try {
      for (const [id, rec] of Object.entries(pRef.current.swipes)) {
        if (rec.synced) continue;
        if (await sync.pushSwipe(code, uid, Number(id), rec.liked, rec.ts)) {
          setP((s) => {
            const current = s.swipes[id];
            if (!current || current.ts !== rec.ts) return s; // changed again while pushing
            return { ...s, swipes: { ...s.swipes, [id]: { ...current, synced: true } }, lastSyncMs: Date.now() };
          });
        }
      }
      for (const [id, rec] of Object.entries(pRef.current.customNames)) {
        if (rec.synced || rec.addedBy !== uid) continue;
        if (await sync.pushCustomName(code, rec)) {
          setP((s) => {
            const current = s.customNames[id];
            return current ? { ...s, customNames: { ...s.customNames, [id]: { ...current, synced: true } } } : s;
          });
        }
      }
    } finally {
      flushing.current = false;
    }
  }, []);

  const unsyncedCount = useMemo(
    () =>
      Object.values(p.swipes).filter((s) => !s.synced).length +
      Object.values(p.customNames).filter((c) => !c.synced).length,
    [p.swipes, p.customNames],
  );

  useEffect(() => {
    if (!userId || !coupleId) return;
    void flushUnsynced();
    const onOnline = () => void flushUnsynced();
    window.addEventListener("online", onOnline);
    const timer = window.setInterval(() => void flushUnsynced(), 30000);
    return () => {
      window.removeEventListener("online", onOnline);
      window.clearInterval(timer);
    };
  }, [userId, coupleId, flushUnsynced]);

  // ---- derived data ----
  const customList = useMemo(
    () =>
      Object.values(p.customNames)
        .sort((a, b) => b.ts - a.ts)
        .map((c) => customToCluster(c, userId)),
    [p.customNames, userId],
  );
  const allNames = useMemo(() => (names ? [...names, ...customList] : null), [names, customList]);
  namesRef.current = allNames;

  const sortedNames = useMemo(() => (allNames ? sortForDeck(allNames) : []), [allNames]);
  const byId = useMemo(() => new Map((allNames ?? []).map((c) => [c.id, c])), [allNames]);

  const allOrigins = useMemo(
    () => [...new Set((allNames ?? []).flatMap((c) => c.origins))].sort((a, b) => a.localeCompare(b)),
    [allNames],
  );
  const lengthBounds = useMemo(() => {
    const lengths = (allNames ?? []).map((c) => c.name.length);
    return lengths.length ? { min: Math.min(...lengths), max: Math.max(...lengths) } : { min: 2, max: 12 };
  }, [allNames]);
  const maxTier = useMemo(
    () => Math.max(p.unlockedTier, ...(allNames ?? []).map((c) => c.tier), 1),
    [allNames, p.unlockedTier],
  );

  const { deck, totalAllowed, allowedForTierCount, nextTierCount } = useMemo(() => {
    const allowed = sortedNames.filter((c) => c.tier <= p.unlockedTier);
    const filtered = allowed.filter((c) => filtersMatch(p.filters, c));
    return {
      deck: filtered.filter((c) => p.swipes[c.id] === undefined),
      totalAllowed: filtered.length,
      allowedForTierCount: allowed.length,
      nextTierCount: sortedNames.filter((c) => c.tier === p.unlockedTier + 1 && filtersMatch(p.filters, c)).length,
    };
  }, [sortedNames, p.unlockedTier, p.filters, p.swipes]);

  const matchIds = useMemo(() => {
    const partner = new Set(p.partnerLikes);
    return Object.entries(p.swipes)
      .filter(([id, s]) => s.liked && partner.has(Number(id)))
      .sort((a, b) => b[1].ts - a[1].ts)
      .map(([id]) => Number(id))
      .filter((id) => byId.has(id));
  }, [p.swipes, p.partnerLikes, byId]);

  const matches = useMemo(() => matchIds.map((id) => byId.get(id)!), [matchIds, byId]);

  /** My personal order: whatever I've dragged into place, with brand-new matches appended last. */
  const myOrderIds = useMemo(() => {
    const live = new Set(matchIds);
    const ranked = p.myRanking.filter((id) => live.has(id));
    const rankedSet = new Set(ranked);
    return [...ranked, ...[...matchIds].reverse().filter((id) => !rankedSet.has(id))];
  }, [matchIds, p.myRanking]);

  const { myOrdered, combined } = useMemo(() => {
    const live = new Set(matchIds);
    const partnerOrder = p.partnerRanking.filter((id) => live.has(id));
    const ranked: RankedItem[] = combineRankings(myOrderIds, partnerOrder);
    const display = (item: RankedItem): RankedDisplay => ({
      cluster: byId.get(item.clusterId)!,
      myPosition: item.myPosition,
      partnerPosition: item.partnerPosition,
      disagreement: item.disagreement,
    });
    const combinedList = ranked.filter((i) => byId.has(i.clusterId)).map(display);
    const mine = [...combinedList].sort(
      (a, b) => (a.myPosition ?? Infinity) - (b.myPosition ?? Infinity),
    );
    return { myOrdered: mine, combined: combinedList };
  }, [matchIds, myOrderIds, p.partnerRanking, byId]);

  // ---- actions ----
  const swipe = useCallback(
    (clusterId: number, liked: boolean) => {
      const cur = pRef.current;
      if (!cur.coupleId || cur.swipes[String(clusterId)]) return;
      const ts = Date.now();
      const completesMatch = liked && cur.partnerLikes.includes(clusterId);
      setP((s) => ({ ...s, swipes: { ...s.swipes, [clusterId]: { liked, ts, synced: false } } }));
      setUndoStack((stack) => [...stack, clusterId].slice(-UNDO_LIMIT));
      if (completesMatch) {
        const cluster = namesRef.current?.find((c) => c.id === clusterId);
        if (cluster) setCelebration(cluster);
        void sync.pushMatch(cur.coupleId, clusterId, ts);
      }
      const uid = userIdRef.current;
      if (uid) {
        const code = cur.coupleId;
        void sync.pushSwipe(code, uid, clusterId, liked, ts).then((ok) => {
          if (!ok) return;
          setP((s) => {
            const rec = s.swipes[String(clusterId)];
            if (!rec || rec.ts !== ts) return s;
            return { ...s, swipes: { ...s.swipes, [clusterId]: { ...rec, synced: true } }, lastSyncMs: Date.now() };
          });
        });
      }
    },
    [],
  );

  const undo = useCallback(() => {
    const cur = pRef.current;
    const last = undoStack[undoStack.length - 1];
    if (last === undefined || !cur.coupleId) return;
    const wasMatch = cur.swipes[String(last)]?.liked && cur.partnerLikes.includes(last);
    setUndoStack((stack) => stack.slice(0, -1));
    setP((s) => {
      const { [String(last)]: _removed, ...rest } = s.swipes;
      return { ...s, swipes: rest, myRanking: s.myRanking.filter((id) => id !== last) };
    });
    const uid = userIdRef.current;
    if (uid) void sync.deleteSwipe(cur.coupleId, uid, last);
    if (wasMatch) void sync.deleteMatch(cur.coupleId, last);
  }, [undoStack]);

  const reorder = useCallback((orderedIds: number[]) => {
    const cur = pRef.current;
    setP((s) => ({ ...s, myRanking: orderedIds }));
    const uid = userIdRef.current;
    if (uid && cur.coupleId) void sync.pushRanking(cur.coupleId, uid, orderedIds);
  }, []);

  const addCustomName = useCallback(
    async (input: CustomNameInput & { like: boolean }) => {
      const invalid = validateCustomName(input);
      if (invalid) return { ok: false as const, error: invalid };
      const gender = input.gender!;
      const name = input.name.trim().replace(/\s+/g, " ");
      const uid = userIdRef.current;
      const code = pRef.current.coupleId;
      if (!uid || !code) {
        return { ok: false as const, error: "Connect to the internet once first, so your partner gets this name too." };
      }
      const dup = findDuplicate(namesRef.current ?? [], name, gender);
      if (dup) return { ok: false as const, error: `${dup.name} is already in the list.` };

      const id = await customNameId(gender, name);
      const record: CustomRecord = {
        id,
        name,
        gender,
        origin: input.origin.trim(),
        meaning: input.meaning.trim(),
        addedBy: uid,
        ts: Date.now(),
        synced: false,
      };
      setP((s) => ({ ...s, customNames: { ...s.customNames, [id]: record } }));
      if (input.like) swipe(id, true);
      setToast(`Added ${name}`);
      void sync.pushCustomName(code, record).then((ok) => {
        if (!ok) return;
        setP((s) => {
          const current = s.customNames[id];
          return current ? { ...s, customNames: { ...s.customNames, [id]: { ...current, synced: true } } } : s;
        });
      });
      return { ok: true as const };
    },
    [swipe],
  );

  const removeCustomName = useCallback((id: number) => {
    const cur = pRef.current;
    const rec = cur.customNames[String(id)];
    if (!rec || rec.addedBy !== userIdRef.current || !cur.coupleId) return; // only whoever added it
    setP((s) => {
      const { [String(id)]: _gone, ...rest } = s.customNames;
      return { ...s, customNames: rest };
    });
    void sync.deleteCustomName(cur.coupleId, id);
  }, []);

  const unlockNextTier = useCallback(() => setP((s) => ({ ...s, unlockedTier: s.unlockedTier + 1 })), []);
  const updateFilters = useCallback((patch: Partial<Filters>) => setP((s) => ({ ...s, filters: { ...s.filters, ...patch } })), []);
  const resetFilters = useCallback(() => setP((s) => ({ ...s, filters: DEFAULT_FILTERS })), []);
  const toggleDark = useCallback(() => setP((s) => ({ ...s, dark: !(s.dark ?? systemDark) })), [systemDark]);

  // pairing
  const pairingGo = useCallback((mode: PairingMode) => setPairing((s) => ({ ...s, mode, joinError: null })), []);

  const startCreateCouple = useCallback(() => {
    setPairing((s) => ({ ...s, mode: "create", creating: true, createError: null }));
    void (async () => {
      try {
        if (!isFirebaseConfigured()) throw new Error("not-configured");
        const uid = await ensureSignedIn();
        let code = generateCoupleCode();
        for (let i = 0; i < 5 && (await sync.coupleExists(code)); i++) code = generateCoupleCode();
        await sync.createCouple(code, uid);
        setP((s) => ({ ...s, coupleId: code }));
        setPairing((s) => ({ ...s, creating: false }));
      } catch (err) {
        const notConfigured = err instanceof Error && err.message === "not-configured";
        setPairing((s) => ({ ...s, creating: false, createError: notConfigured ? NOT_CONFIGURED_ERROR : NETWORK_ERROR }));
      }
    })();
  }, []);

  const setJoinCode = useCallback(
    (text: string) => setPairing((s) => ({ ...s, joinCode: cleanCodeInput(text), joinError: null })),
    [],
  );

  const submitJoin = useCallback(() => {
    const code = pairing.joinCode;
    if (code.length < CODE_LENGTH || pairing.joining) return;
    setPairing((s) => ({ ...s, joining: true, joinError: null }));
    void (async () => {
      try {
        if (!isFirebaseConfigured()) throw new Error("not-configured");
        const uid = await ensureSignedIn();
        const ok = await sync.joinCouple(code, uid);
        if (!ok) {
          setPairing((s) => ({ ...s, joining: false, joinError: BAD_CODE_ERROR }));
          return;
        }
        setP((s) => ({ ...s, coupleId: code }));
        setInApp(true);
        setPairing(INITIAL_PAIRING);
      } catch (err) {
        const notConfigured = err instanceof Error && err.message === "not-configured";
        setPairing((s) => ({ ...s, joining: false, joinError: notConfigured ? NOT_CONFIGURED_ERROR : NETWORK_ERROR }));
      }
    })();
  }, [pairing.joinCode, pairing.joining]);

  const enterApp = useCallback(() => {
    setInApp(true);
    setPairing(INITIAL_PAIRING);
  }, []);

  /** A local reset only: the partner keeps their side, exactly like the Android app. */
  const leavePairing = useCallback(() => {
    setP((s) => ({ ...EMPTY, dark: s.dark }));
    setInApp(false);
    setPartnerId(null);
    setUndoStack([]);
    setTab("swipe");
    setPairing(INITIAL_PAIRING);
  }, []);

  const value: Sprout = {
    ready: hydrated && names !== null,
    namesError,
    firebaseConfigured: isFirebaseConfigured(),
    inApp: inApp && Boolean(p.coupleId),
    tab,
    setTab,
    enterApp,
    coupleId: p.coupleId,
    partnerJoined: partnerId !== null,
    pairing,
    pairingGo,
    startCreateCouple,
    setJoinCode,
    submitJoin,
    deck,
    totalAllowed,
    allowedForTierCount,
    unlockedTier: p.unlockedTier,
    maxTier,
    nextTierCount,
    canUndo: undoStack.length > 0,
    swipe,
    undo,
    unlockNextTier,
    celebration,
    dismissCelebration: () => setCelebration(null),
    toast,
    filters: p.filters,
    allOrigins,
    lengthBounds,
    updateFilters,
    resetFilters,
    showFilters,
    setShowFilters,
    matches,
    myOrdered,
    combined,
    reorder,
    detail: detailId !== null ? (byId.get(detailId) ?? null) : null,
    openDetail: setDetailId,
    closeDetail: () => setDetailId(null),
    showAddName,
    setShowAddName,
    addCustomName,
    removeCustomName,
    customList,
    isDark,
    toggleDark,
    leavePairing,
    lastSyncMs: p.lastSyncMs,
    unsyncedCount,
    totalSwipes: Object.keys(p.swipes).length,
    syncNow: () => void flushUnsynced(),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
