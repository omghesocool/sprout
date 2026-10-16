"use client";

import { useCallback, useEffect, useRef } from "react";
import { useSprout } from "@/lib/store";
import type { Cluster } from "@/lib/types";
import { CloseIcon, HeartIcon, TuneIcon, UndoIcon } from "./icons";
import { NameCardContent } from "./NameCardContent";

const FLING_DISTANCE = 110;
const FLING_VELOCITY = 0.6; // px per ms
const EXIT_MS = 230;

export function SwipeScreen() {
  const s = useSprout();
  const top = s.deck[0];
  const next = s.deck[1];
  const topEl = useRef<HTMLDivElement>(null);
  const busy = useRef(false);

  const { swipe } = s;
  const fling = useCallback(
    (liked: boolean) => {
      const el = topEl.current;
      if (!top || !el || busy.current) return;
      busy.current = true;
      const dir = liked ? 1 : -1;
      el.style.transition = `transform ${EXIT_MS}ms ease-in, opacity ${EXIT_MS}ms ease-in`;
      el.style.transform = `translateX(${dir * 700}px) rotate(${dir * 22}deg)`;
      el.style.opacity = "0";
      window.setTimeout(() => {
        busy.current = false;
        swipe(top.id, liked);
      }, EXIT_MS);
    },
    [top, swipe],
  );

  const { showFilters, celebration, detail, canUndo, undo } = s;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (showFilters || celebration || detail) return;
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (e.key === "ArrowRight") fling(true);
      else if (e.key === "ArrowLeft") fling(false);
      else if ((e.key === "z" || e.key === "Z") && canUndo) undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fling, showFilters, celebration, detail, canUndo, undo]);

  return (
    <>
      <header className="topbar">
        <span className="wordmark">🌱 Sprout</span>
        <button className="icon-btn" onClick={() => s.setShowFilters(true)} aria-label="Filters">
          <TuneIcon />
        </button>
      </header>

      {top ? (
        <>
          <div className="deck">
            {next && <Card key={next.id} cluster={next} behind />}
            <Card key={top.id} cluster={top} elRef={topEl} onFling={fling} />
          </div>
          <div className="actions">
            <button className="round reject" onClick={() => fling(false)} aria-label="Pass (left arrow)">
              <CloseIcon width={30} height={30} />
            </button>
            <button className="round small" onClick={s.undo} disabled={!s.canUndo} aria-label="Undo last swipe (Z)">
              <UndoIcon />
            </button>
            <button className="round like" onClick={() => fling(true)} aria-label="Like (right arrow)">
              <HeartIcon width={30} height={30} />
            </button>
          </div>
          <p className="hint">{s.deck.length} left to swipe · drag the card or use ← →</p>
        </>
      ) : (
        <EmptyDeck />
      )}
    </>
  );
}

function Card({
  cluster,
  behind,
  elRef,
  onFling,
}: {
  cluster: Cluster;
  behind?: boolean;
  elRef?: React.RefObject<HTMLDivElement | null>;
  onFling?: (liked: boolean) => void;
}) {
  const likeStamp = useRef<HTMLSpanElement>(null);
  const nopeStamp = useRef<HTMLSpanElement>(null);
  const drag = useRef<{ x: number; lastX: number; lastT: number; pointer: number } | null>(null);

  const apply = (el: HTMLDivElement, dx: number) => {
    el.style.transform = `translateX(${dx}px) rotate(${dx / 18}deg)`;
    const strength = Math.min(Math.abs(dx) / FLING_DISTANCE, 1);
    if (likeStamp.current) likeStamp.current.style.opacity = dx > 0 ? String(strength) : "0";
    if (nopeStamp.current) nopeStamp.current.style.opacity = dx < 0 ? String(strength) : "0";
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (behind || (e.pointerType === "mouse" && e.button !== 0)) return;
    drag.current = { x: e.clientX, lastX: e.clientX, lastT: performance.now(), pointer: e.pointerId };
    e.currentTarget.style.transition = "none";
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.pointer !== e.pointerId) return;
    d.lastX = e.clientX;
    d.lastT = performance.now();
    apply(e.currentTarget, e.clientX - d.x);
  };

  const finish = (e: React.PointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const d = drag.current;
    if (!d || d.pointer !== e.pointerId) return;
    drag.current = null;
    const el = e.currentTarget;
    const dx = e.clientX - d.x;
    const velocity = (e.clientX - d.lastX) / Math.max(performance.now() - d.lastT, 1);
    const farEnough = Math.abs(dx) > FLING_DISTANCE || (Math.abs(velocity) > FLING_VELOCITY && Math.abs(dx) > 30);
    if (!cancelled && farEnough) {
      onFling?.(dx > 0);
    } else {
      el.style.transition = "transform 0.2s ease-out";
      apply(el, 0);
    }
  };

  return (
    <div
      ref={elRef}
      className={`card ${behind ? "behind" : ""}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(e) => finish(e, false)}
      onPointerCancel={(e) => finish(e, true)}
      aria-hidden={behind || undefined}
    >
      <span ref={likeStamp} className="stamp like">
        LIKE
      </span>
      <span ref={nopeStamp} className="stamp nope">
        NOPE
      </span>
      <NameCardContent cluster={cluster} />
    </div>
  );
}

function EmptyDeck() {
  const s = useSprout();

  if (s.totalAllowed === 0 && s.allowedForTierCount > 0) {
    return (
      <div className="center-stack">
        <div className="emoji">🔍</div>
        <h2 className="title">No names match your filters</h2>
        <p className="muted" style={{ margin: 0 }}>
          Try widening your gender, origin, length, or popularity filters.
        </p>
        <button className="btn" onClick={() => s.setShowFilters(true)}>
          Adjust filters
        </button>
      </div>
    );
  }

  if (s.unlockedTier < s.maxTier) {
    return (
      <div className="center-stack">
        <div className="emoji">🌱</div>
        <h2 className="title">Tier {s.unlockedTier} complete!</h2>
        {s.nextTierCount > 0 ? (
          <>
            <p className="muted" style={{ margin: 0 }}>
              Unlock the next tier to add {s.nextTierCount} more names to swipe through.
            </p>
            <button className="btn" onClick={s.unlockNextTier}>
              Unlock {s.nextTierCount} names
            </button>
            <button className="btn ghost" onClick={() => s.setTab("matches")}>
              Not now
            </button>
          </>
        ) : (
          <>
            <p className="muted" style={{ margin: 0 }}>
              The next tier&apos;s names are all hidden by your current filters.
            </p>
            <button className="btn" onClick={() => s.setShowFilters(true)}>
              Adjust filters
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="center-stack">
      <div className="emoji">🎉</div>
      <h2 className="title">That&apos;s every name!</h2>
      <p className="muted" style={{ margin: 0 }}>
        Head to your matches to start ranking your favourites.
      </p>
      <button className="btn" onClick={() => s.setTab("matches")}>
        See matches
      </button>
    </div>
  );
}
