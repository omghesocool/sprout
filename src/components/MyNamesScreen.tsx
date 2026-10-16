"use client";

import { useState } from "react";
import { displayOrigin } from "@/lib/domain";
import { useSprout } from "@/lib/store";
import { GENDER_LABEL, type Cluster, type Gender } from "@/lib/types";
import { ShareIcon } from "./icons";
import { GenderDot } from "./NameCardContent";

type View = "liked" | "passed" | "stats";
const PAGE = 60;

export function MyNamesScreen() {
  const s = useSprout();
  const [view, setView] = useState<View>("liked");

  return (
    <>
      <header style={{ padding: "20px 20px 0" }}>
        <h1 className="title">My names</h1>
        <p className="muted" style={{ margin: "4px 0 0" }}>
          Everything you&apos;ve swiped, and what it says about your taste.
        </p>
      </header>

      <div className="seg" role="group" aria-label="My names view">
        <button aria-pressed={view === "liked"} onClick={() => setView("liked")}>
          Liked <span className="seg-count">{s.likedList.length}</span>
        </button>
        <button aria-pressed={view === "passed"} onClick={() => setView("passed")}>
          Passed <span className="seg-count">{s.passedList.length}</span>
        </button>
        <button aria-pressed={view === "stats"} onClick={() => setView("stats")}>
          Stats
        </button>
      </div>

      {view === "stats" ? <Stats /> : <NameList key={view} kind={view} />}
    </>
  );
}

function NameList({ kind }: { kind: "liked" | "passed" }) {
  const s = useSprout();
  const [shown, setShown] = useState(PAGE);
  const list = kind === "liked" ? s.likedList : s.passedList;

  if (list.length === 0) {
    return (
      <div className="center-stack">
        <div className="emoji">{kind === "liked" ? "💛" : "👋"}</div>
        <h2 className="title">{kind === "liked" ? "No likes yet" : "No passes yet"}</h2>
        <p className="muted" style={{ margin: 0 }}>
          {kind === "liked"
            ? "Swipe right on a name and it will show up here."
            : "Names you swipe left on will show up here, in case you change your mind."}
        </p>
        <button className="btn" onClick={() => s.setTab("swipe")}>
          Start swiping
        </button>
      </div>
    );
  }

  return (
    <>
      {kind === "liked" && (
        <div className="list-actions">
          <button className="btn secondary" style={{ minHeight: 40, padding: "0 18px" }} onClick={() => s.openShare("liked")}>
            <ShareIcon width={18} height={18} /> Share list
          </button>
        </div>
      )}
      <ul className="pick-list">
        {list.slice(0, shown).map((c) => (
          <PickRow key={c.id} cluster={c} kind={kind} />
        ))}
      </ul>
      {shown < list.length && (
        <div style={{ padding: "0 20px 24px" }}>
          <button className="btn secondary block" onClick={() => setShown(shown + PAGE)}>
            Show more ({list.length - shown} left)
          </button>
        </div>
      )}
    </>
  );
}

function PickRow({ cluster, kind }: { cluster: Cluster; kind: "liked" | "passed" }) {
  const s = useSprout();
  const origin = displayOrigin(cluster);
  const isMatch = kind === "liked" && s.matches.some((m) => m.id === cluster.id);
  return (
    <li className="pick-row">
      <button className="pick-main" onClick={() => s.openDetail(cluster.id)}>
        <span className="pick-name">
          {cluster.name}
          {isMatch && (
            <span className="match-tag" title="Your partner liked this too">
              match
            </span>
          )}
        </span>
        <span className="row" style={{ gap: 6 }}>
          <GenderDot gender={cluster.gender} size={8} />
          <span className="small-label">{GENDER_LABEL[cluster.gender]}</span>
          {origin && <span className="small-label">· {origin.toUpperCase()}</span>}
        </span>
      </button>
      <button
        className={`pick-action ${kind === "liked" ? "pass" : "like"}`}
        onClick={() => s.changeSwipe(cluster.id, kind !== "liked")}
        aria-label={kind === "liked" ? `Move ${cluster.name} to passed` : `Move ${cluster.name} to liked`}
      >
        {kind === "liked" ? "Pass" : "Like"}
      </button>
    </li>
  );
}

const GENDER_ORDER: Gender[] = ["M", "F", "N"];

function Stats() {
  const s = useSprout();
  const st = s.pickStats;

  if (st.liked + st.passed === 0) {
    return (
      <div className="center-stack">
        <div className="emoji">📊</div>
        <h2 className="title">Nothing to show yet</h2>
        <p className="muted" style={{ margin: 0 }}>
          Swipe on a few names and your tastes will appear here.
        </p>
        <button className="btn" onClick={() => s.setTab("swipe")}>
          Start swiping
        </button>
      </div>
    );
  }

  const seen = st.liked + st.passed;
  const maxOrigin = Math.max(1, ...st.likedOrigins.map((o) => o.liked));
  const maxSyll = Math.max(1, ...st.likedSyllables.map((x) => x.count));

  return (
    <div className="stats">
      <section className="stat-tiles" aria-label="Totals">
        <div className="stat-tile">
          <strong>{st.liked}</strong>
          <span>liked</span>
        </div>
        <div className="stat-tile">
          <strong>{st.passed}</strong>
          <span>passed</span>
        </div>
        <div className="stat-tile">
          <strong>{st.likeRate === null ? "–" : `${Math.round(st.likeRate * 100)}%`}</strong>
          <span>like rate</span>
        </div>
      </section>

      {st.liked === 0 ? (
        <p className="muted" style={{ margin: "0 20px" }}>
          You haven&apos;t liked anything yet, so there are no preferences to chart. Your {seen} passes are in the
          Passed list.
        </p>
      ) : (
        <>
          <section className="stat-section" aria-label="Liked names by gender">
            <h2 className="small-label">THE NAMES YOU LIKED ARE…</h2>
            <ul className="bars">
              {GENDER_ORDER.map((g) => (
                <li key={g}>
                  <span className="bar-label">
                    <GenderDot gender={g} size={9} /> {g === "N" ? "Gender-neutral" : g === "M" ? "Boy names" : "Girl names"}
                  </span>
                  <span className="bar-track" aria-hidden="true">
                    <span className={`bar-fill gender-${g}`} style={{ width: `${(st.likedByGender[g] / st.liked) * 100}%` }} />
                  </span>
                  <span className="bar-value">
                    {st.likedByGender[g]} · {Math.round((st.likedByGender[g] / st.liked) * 100)}%
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="stat-section" aria-label="Liked names by origin">
            <h2 className="small-label">ORIGINS YOU LIKE MOST</h2>
            <ul className="bars">
              {st.likedOrigins.map((o) => (
                <li key={o.origin}>
                  <span className="bar-label">{o.origin}</span>
                  <span className="bar-track" aria-hidden="true">
                    <span className="bar-fill primary" style={{ width: `${(o.liked / maxOrigin) * 100}%` }} />
                  </span>
                  <span className="bar-value">
                    {o.liked} <span className="muted">of {o.seen} seen</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="stat-section" aria-label="Liked names by syllables">
            <h2 className="small-label">SYLLABLES</h2>
            <ul className="bars">
              {st.likedSyllables.map((x) => (
                <li key={x.label}>
                  <span className="bar-label">{x.label}</span>
                  <span className="bar-track" aria-hidden="true">
                    <span className="bar-fill peach" style={{ width: `${(x.count / maxSyll) * 100}%` }} />
                  </span>
                  <span className="bar-value">{x.count}</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
