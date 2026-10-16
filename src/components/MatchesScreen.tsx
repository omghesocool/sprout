"use client";

import { useSprout } from "@/lib/store";
import { GENDER_LABEL } from "@/lib/types";
import { GenderDot } from "./NameCardContent";

export function MatchesScreen() {
  const s = useSprout();
  const count = s.matches.length;

  return (
    <>
      <header className="row" style={{ padding: "20px 20px 6px", alignItems: "flex-end", gap: 10 }}>
        <h1 className="title">Your matches</h1>
        <span className="label">
          {count} match{count === 1 ? "" : "es"}
        </span>
      </header>

      {count === 0 ? (
        <div className="center-stack">
          <div className="emoji">💌</div>
          <h2 className="title">No matches yet</h2>
          <p className="muted" style={{ margin: 0 }}>
            Keep swiping — matches show up here the moment you both like the same name.
          </p>
          {!s.partnerJoined && s.firebaseConfigured && (
            <p className="muted" style={{ margin: 0 }}>
              Your partner hasn&apos;t joined yet — share your couple code from Settings.
            </p>
          )}
          <button className="btn" onClick={() => s.setTab("swipe")}>
            Keep swiping
          </button>
        </div>
      ) : (
        <ul className="grid2" style={{ listStyle: "none", margin: 0 }}>
          {s.matches.map((c) => (
            <li key={c.id}>
              <button className="match-card" style={{ width: "100%", height: "100%" }} onClick={() => s.openDetail(c.id)}>
                <h3>{c.name}</h3>
                <span className="row" style={{ gap: 6 }}>
                  <GenderDot gender={c.gender} size={8} />
                  <span className="small-label">{GENDER_LABEL[c.gender]}</span>
                </span>
                <span className="small-label">{c.origins[0]?.toUpperCase()}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
