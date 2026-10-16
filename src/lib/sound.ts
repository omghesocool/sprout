/**
 * The "you've got a match" fanfare, synthesised with the Web Audio API so there is no audio
 * file to download or license. Browsers only let a page make sound after the person has
 * touched it, so the context is created and resumed on the first tap or key press.
 */

let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  return ctx;
}

/** Call from a user gesture (a tap or key press) so later sounds are allowed to play. */
export function unlockAudio(): void {
  const c = context();
  if (c && c.state === "suspended") void c.resume().catch(() => undefined);
}

function note(c: AudioContext, out: AudioNode, freq: number, start: number, length: number, peak: number, type: OscillatorType) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
  osc.connect(gain).connect(out);
  osc.start(start);
  osc.stop(start + length + 0.05);
}

/** A rising C-major arpeggio that lands on a bright chord, about a second long. */
export function playMatchSound(): void {
  const c = context();
  if (!c) return;
  if (c.state === "suspended") void c.resume().catch(() => undefined);

  const master = c.createGain();
  master.gain.value = 0.22;
  master.connect(c.destination);

  const t = c.currentTime + 0.02;
  const rise = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
  rise.forEach((f, i) => note(c, master, f, t + i * 0.085, 0.4, 0.9, "triangle"));

  const chordAt = t + rise.length * 0.085;
  [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) =>
    note(c, master, f, chordAt, 0.75, i === 0 ? 0.55 : 0.4, i < 2 ? "triangle" : "sine"),
  );
  // a couple of sparkles on top
  [1568, 2093, 1760].forEach((f, i) => note(c, master, f, chordAt + 0.12 + i * 0.09, 0.3, 0.18, "sine"));

  try {
    navigator.vibrate?.([70, 40, 70, 40, 140]);
  } catch {
    /* vibration isn't available everywhere */
  }
}
