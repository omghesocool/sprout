"use client";

import { useMemo, useRef, useState } from "react";
import { formatShareText } from "@/lib/domain";
import { useSprout } from "@/lib/store";
import { Modal } from "./Modal";

/** Builds a chat-ready text version of your liked names (or your matches) to copy or send. */
export function ShareSheet() {
  const s = useSprout();
  const scope = s.shareScope ?? "liked";
  const [grouped, setGrouped] = useState(true);
  const [details, setDetails] = useState(false);
  const [copied, setCopied] = useState(false);
  const preview = useRef<HTMLTextAreaElement>(null);

  const isMatches = scope === "matches";
  // Matches are shared in your combined ranking order; likes are grouped or alphabetical.
  const names = isMatches ? s.combined.map((r) => r.cluster) : s.likedList;

  const text = useMemo(
    () =>
      formatShareText(names, {
        title: isMatches ? "💛 Baby names we both like" : "🌱 My liked baby names",
        grouped,
        details,
        numbered: isMatches,
      }),
    [names, isMatches, grouped, details],
  );

  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard API blocked (older browsers, some in-app webviews): fall back to selecting the text.
      preview.current?.focus();
      preview.current?.select();
      try {
        document.execCommand("copy");
      } catch {
        return;
      }
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  };

  const share = async () => {
    try {
      await navigator.share({ title: isMatches ? "Names we both like" : "My liked names", text });
    } catch {
      /* the person closed the share sheet — nothing to do */
    }
  };

  return (
    <Modal label={isMatches ? "Share your matches" : "Share your liked names"} onClose={s.closeShare}>
      <h2 className="title">{isMatches ? "Share your matches" : "Share your liked names"}</h2>

      {names.length === 0 ? (
        <p className="muted" style={{ margin: 0 }}>
          Nothing to share yet — swipe right on a few names first.
        </p>
      ) : (
        <>
          <div className="stack" style={{ gap: 4 }}>
            {!isMatches && (
              <label className="check">
                <input type="checkbox" checked={grouped} onChange={(e) => setGrouped(e.target.checked)} />
                <span>Group by girls, boys and gender-neutral</span>
              </label>
            )}
            <label className="check">
              <input type="checkbox" checked={details} onChange={(e) => setDetails(e.target.checked)} />
              <span>Include meanings and origins</span>
            </label>
          </div>

          <label className="small-label" htmlFor="share-preview">
            PREVIEW — ready to paste into a chat
          </label>
          <textarea id="share-preview" ref={preview} className="share-preview" readOnly value={text} rows={10} onFocus={(e) => e.currentTarget.select()} />

          <div className="stack" style={{ gap: 8 }}>
            <button className="btn block" onClick={copy}>
              {copied ? "Copied ✓" : "Copy to clipboard"}
            </button>
            {canShare && (
              <button className="btn secondary block" onClick={share}>
                Send via…
              </button>
            )}
          </div>
        </>
      )}
      <button className="btn ghost block" onClick={s.closeShare}>
        Close
      </button>
    </Modal>
  );
}
