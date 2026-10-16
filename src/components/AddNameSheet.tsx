"use client";

import { useState } from "react";
import { MAX_MEANING_LENGTH, MAX_NAME_LENGTH, MAX_ORIGIN_LENGTH } from "@/lib/domain";
import { useSprout } from "@/lib/store";
import { GENDER_LABEL, type Gender } from "@/lib/types";
import { Modal } from "./Modal";

const GENDERS: Gender[] = ["M", "F", "N"];

export function AddNameSheet() {
  const s = useSprout();
  const [name, setName] = useState("");
  const [gender, setGender] = useState<Gender | null>(null);
  const [origin, setOrigin] = useState("");
  const [meaning, setMeaning] = useState("");
  const [like, setLike] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const close = () => s.setShowAddName(false);

  const submit = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    const result = await s.addCustomName({ name, gender, origin, meaning, like });
    setSaving(false);
    if (result.ok) close();
    else setError(result.error);
  };

  return (
    <Modal label="Add a name" onClose={close}>
      <h2 className="title">Add a name</h2>
      <p className="muted" style={{ margin: 0 }}>
        It goes to the front of the deck for both of you. Only the person who adds a name can remove it.
      </p>

      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div className="field">
          <label htmlFor="add-name">Name</label>
          <input
            id="add-name"
            className="text-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={MAX_NAME_LENGTH}
            autoComplete="off"
            autoCapitalize="words"
            spellCheck={false}
            required
          />
        </div>

        <div className="field" role="group" aria-labelledby="add-gender-label">
          <span id="add-gender-label" className="small-label">
            GENDER
          </span>
          <div className="chips">
            {GENDERS.map((g) => (
              <button type="button" key={g} className="chip" aria-pressed={gender === g} onClick={() => setGender(g)}>
                {GENDER_LABEL[g]}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label htmlFor="add-origin">
            Origin <span className="muted">(optional)</span>
          </label>
          <input
            id="add-origin"
            className="text-input"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            maxLength={MAX_ORIGIN_LENGTH}
            list="add-origin-options"
            autoComplete="off"
          />
          <datalist id="add-origin-options">
            {s.allOrigins
              .filter((o) => o !== "Unknown")
              .map((o) => (
                <option key={o} value={o} />
              ))}
          </datalist>
        </div>

        <div className="field">
          <label htmlFor="add-meaning">
            Meaning <span className="muted">(optional)</span>
          </label>
          <input
            id="add-meaning"
            className="text-input"
            value={meaning}
            onChange={(e) => setMeaning(e.target.value)}
            maxLength={MAX_MEANING_LENGTH}
            autoComplete="off"
          />
        </div>

        <label className="check">
          <input type="checkbox" checked={like} onChange={(e) => setLike(e.target.checked)} />
          <span>I like it — add it to my likes now</span>
        </label>

        {error && (
          <p className="error" role="alert" style={{ margin: 0 }}>
            {error}
          </p>
        )}

        <div className="row" style={{ justifyContent: "space-between" }}>
          <button type="button" className="btn ghost" onClick={close}>
            Cancel
          </button>
          <button type="submit" className="btn" disabled={saving}>
            {saving ? "Adding…" : "Add name"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
