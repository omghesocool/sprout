"use client";

import { useState } from "react";
import { useSprout } from "@/lib/store";
import { Modal } from "./Modal";
import { CopyButton } from "./Pairing";

function relativeTime(ms: number): string {
  const seconds = Math.round((Date.now() - ms) / 1000);
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return hours < 24 ? `${hours}h ago` : new Date(ms).toLocaleDateString();
}

export function SettingsScreen() {
  const s = useSprout();
  const [confirmLeave, setConfirmLeave] = useState(false);

  return (
    <>
      <header style={{ padding: "20px 20px 0" }}>
        <h1 className="title">Settings</h1>
      </header>

      <div className="stack pad">
        <section className="stack" aria-label="Couple code">
          <div className="small-label">YOUR COUPLE CODE</div>
          <div className="code-box">{s.coupleId}</div>
          <CopyButton text={s.coupleId ?? ""} />
          <p className="muted" style={{ margin: 0 }}>
            {s.partnerJoined ? "Your partner has joined. ✓" : "Waiting for your partner to join with this code."}
          </p>
        </section>

        <section className="stack" aria-label="Names you've added">
          <div className="small-label">NAMES YOU&apos;VE ADDED</div>
          {s.customList.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>
              Missing a name? Add your own and it goes to the front of both your decks.
            </p>
          ) : (
            <ul className="added-list">
              {s.customList.map((c) => (
                <li key={c.id} className="added-item">
                  <span>
                    <strong>{c.name}</strong>{" "}
                    <span className="muted">· {c.addedBy === "me" ? "you" : "your partner"}</span>
                  </span>
                  {c.addedBy === "me" && (
                    <button className="link-btn" onClick={() => s.removeCustomName(c.id)} aria-label={`Remove ${c.name}`}>
                      Remove
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          <button className="btn secondary" onClick={() => s.setShowAddName(true)}>
            Add a name
          </button>
        </section>

        <div className="setting">
          <div>
            <h3>Dark mode</h3>
            <div className="muted">Easier on the eyes for late-night swiping.</div>
          </div>
          <button className="switch" role="switch" aria-checked={s.isDark} aria-label="Dark mode" onClick={s.toggleDark} />
        </div>

        <section className="setting" style={{ flexDirection: "column", alignItems: "stretch" }} aria-label="Sync status">
          <h3>Sync</h3>
          <div className="muted">
            {s.totalSwipes} swipes · {s.unsyncedCount} waiting to sync ·{" "}
            {s.lastSyncMs ? `last synced ${relativeTime(s.lastSyncMs)}` : "not synced yet"}
          </div>
          <button className="btn secondary" onClick={s.syncNow} disabled={s.unsyncedCount === 0}>
            Sync now
          </button>
        </section>

        <button className="btn danger" onClick={() => setConfirmLeave(true)}>
          Leave this pairing
        </button>
      </div>

      {confirmLeave && (
        <Modal label="Leave this pairing?" variant="dialog" onClose={() => setConfirmLeave(false)}>
          <h2 className="title">Leave this pairing?</h2>
          <p className="muted" style={{ margin: 0 }}>
            This clears your matches and couple code. This can&apos;t be undone.
          </p>
          <button
            className="btn danger block"
            onClick={() => {
              setConfirmLeave(false);
              s.leavePairing();
            }}
          >
            Yes, leave
          </button>
          <button className="btn ghost block" onClick={() => setConfirmLeave(false)}>
            Cancel
          </button>
        </Modal>
      )}
    </>
  );
}
