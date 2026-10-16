"use client";

import { useState } from "react";
import { CODE_LENGTH } from "@/lib/domain";
import { useSprout } from "@/lib/store";

export function Pairing() {
  const s = useSprout();
  const { pairing } = s;

  // A couple exists (we just created it) but the user hasn't continued into the app yet.
  if (pairing.mode === "create" && s.coupleId) return <CodeStep />;

  return (
    <main className="pairing">
      <div className="wordmark">🌱 Sprout</div>

      {pairing.mode === "choose" && (
        <>
          <h1>{"Two of you.\nOne list of names."}</h1>
          <p className="muted" style={{ margin: 0 }}>
            Pair up with your partner so you can each swipe privately and see where you match.
          </p>
          {!s.firebaseConfigured && (
            <p className="error" role="alert">
              Firebase isn&apos;t configured for this site yet, so pairing won&apos;t work. See the README&apos;s setup steps.
            </p>
          )}
          <button className="btn block" onClick={s.startCreateCouple}>
            Create a couple
          </button>
          <button className="btn secondary block" onClick={() => s.pairingGo("join")}>
            Join a couple
          </button>
        </>
      )}

      {pairing.mode === "create" && (
        <>
          <h2 className="title">Your couple code</h2>
          {pairing.creating && <p className="muted">Setting things up…</p>}
          {pairing.createError && (
            <>
              <p className="error" role="alert">
                {pairing.createError}
              </p>
              <button className="btn block" onClick={s.startCreateCouple}>
                Try again
              </button>
            </>
          )}
          <button className="btn ghost" onClick={() => s.pairingGo("choose")}>
            ← Back
          </button>
        </>
      )}

      {pairing.mode === "join" && (
        <>
          <h2 className="title">Enter their code</h2>
          <p className="muted" style={{ margin: 0 }}>
            Ask your partner for their {CODE_LENGTH}-character couple code.
          </p>
          <label className="sr-only" htmlFor="join-code">
            Couple code
          </label>
          <input
            id="join-code"
            className="code-input"
            value={pairing.joinCode}
            onChange={(e) => s.setJoinCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && s.submitJoin()}
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            maxLength={CODE_LENGTH + 2}
            placeholder="······"
            aria-invalid={pairing.joinError ? true : undefined}
          />
          {pairing.joinError && (
            <p className="error" role="alert">
              {pairing.joinError}
            </p>
          )}
          <button className="btn block" onClick={s.submitJoin} disabled={pairing.joinCode.length < CODE_LENGTH || pairing.joining}>
            {pairing.joining ? "Joining…" : pairing.joinError ? "Try again" : "Continue"}
          </button>
          <button className="btn ghost" onClick={() => s.pairingGo("choose")}>
            ← Back
          </button>
        </>
      )}
    </main>
  );
}

function CodeStep() {
  const s = useSprout();
  return (
    <main className="pairing">
      <div className="wordmark">🌱 Sprout</div>
      <h2 className="title">Your couple code</h2>
      <div className="code-box" aria-label={`Your couple code is ${s.coupleId?.split("").join(" ")}`}>
        {s.coupleId}
      </div>
      <CopyButton text={s.coupleId ?? ""} />
      <p className="muted" style={{ margin: 0 }}>
        Share this with your partner so they can join you. It&apos;s just for the two of you.
      </p>
      <button className="btn block" onClick={s.enterApp}>
        Continue
      </button>
    </main>
  );
}

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="btn secondary block"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        } catch {
          /* clipboard blocked — the code is on screen to read out */
        }
      }}
    >
      {copied ? "Copied ✓" : "Copy code"}
    </button>
  );
}
