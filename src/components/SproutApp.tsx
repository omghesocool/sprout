"use client";

import { SproutProvider, useSprout, type Tab } from "@/lib/store";
import { FilterSheet } from "./FilterSheet";
import { GridIcon, HeartIcon, ListIcon, SettingsIcon } from "./icons";
import { MatchesScreen } from "./MatchesScreen";
import { Modal } from "./Modal";
import { NameCardContent } from "./NameCardContent";
import { Pairing } from "./Pairing";
import { RankingScreen } from "./RankingScreen";
import { SettingsScreen } from "./SettingsScreen";
import { SwipeScreen } from "./SwipeScreen";

export function SproutApp() {
  return (
    <SproutProvider>
      <div className="shell">
        <Body />
      </div>
    </SproutProvider>
  );
}

function Body() {
  const s = useSprout();

  if (s.namesError) {
    return (
      <div className="center-stack" role="alert">
        <div className="emoji">😕</div>
        <h1 className="title">Couldn&apos;t load the names</h1>
        <p className="muted" style={{ margin: 0 }}>{s.namesError}</p>
        <button className="btn" onClick={() => window.location.reload()}>
          Try again
        </button>
      </div>
    );
  }

  if (!s.ready) {
    return (
      <div className="splash" role="status" aria-label="Loading">
        🌱
      </div>
    );
  }

  if (!s.inApp) return <Pairing />;

  return (
    <>
      <main className="screen">
        {s.tab === "swipe" && <SwipeScreen />}
        {s.tab === "matches" && <MatchesScreen />}
        {s.tab === "ranking" && <RankingScreen />}
        {s.tab === "settings" && <SettingsScreen />}
      </main>
      <TabBar />

      {s.showFilters && <FilterSheet />}
      {s.celebration && <Celebration />}
      {s.detail && (
        <Modal label={`${s.detail.name} details`} variant="dialog" onClose={s.closeDetail}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, textAlign: "left", width: "100%" }}>
            <NameCardContent cluster={s.detail} />
          </div>
          <button className="btn secondary block" onClick={s.closeDetail}>
            Close
          </button>
        </Modal>
      )}
      {s.toast && (
        <div className="toast" role="status">
          {s.toast}
        </div>
      )}
    </>
  );
}

function Celebration() {
  const s = useSprout();
  const cluster = s.celebration!;
  return (
    <Modal label="It's a match!" variant="dialog" onClose={s.dismissCelebration}>
      <div className="emoji" style={{ fontSize: 44 }}>🎉</div>
      <h2 className="title">It&apos;s a match!</h2>
      <div className="card-name">{cluster.name}</div>
      <p className="muted" style={{ margin: 0 }}>You both liked this one. It&apos;s in your matches now.</p>
      <button className="btn block" onClick={s.dismissCelebration}>
        Keep swiping
      </button>
      <button
        className="btn secondary block"
        onClick={() => {
          s.dismissCelebration();
          s.setTab("matches");
        }}
      >
        See matches
      </button>
    </Modal>
  );
}

const TABS: { id: Tab; label: string; Icon: typeof HeartIcon }[] = [
  { id: "swipe", label: "Swipe", Icon: HeartIcon },
  { id: "matches", label: "Matches", Icon: GridIcon },
  { id: "ranking", label: "Ranking", Icon: ListIcon },
  { id: "settings", label: "Settings", Icon: SettingsIcon },
];

function TabBar() {
  const s = useSprout();
  return (
    <nav className="tabbar" aria-label="Sections">
      {TABS.map(({ id, label, Icon }) => (
        <button key={id} className="tab" aria-current={s.tab === id ? "page" : undefined} onClick={() => s.setTab(id)}>
          <Icon width={22} height={22} />
          {label}
          {id === "matches" && s.matches.length > 0 && <span className="badge">{s.matches.length}</span>}
        </button>
      ))}
    </nav>
  );
}
