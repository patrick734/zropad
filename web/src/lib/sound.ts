"use client";

/** Tiny synthesised sounds for the live feed. Off until the user turns them on. */
let ctx: AudioContext | null = null;
let on = typeof window !== "undefined" && localStorage.getItem("zropad-sound") === "1";

export const soundOn = () => on;
export function setSound(v: boolean) {
  on = v;
  try {
    localStorage.setItem("zropad-sound", v ? "1" : "0");
  } catch {}
  if (v && !ctx) ctx = new AudioContext();
}

function tone(freq: number, dur: number, type: OscillatorType, gain: number, delay = 0) {
  if (!on) return;
  ctx ??= new AudioContext();
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  const t0 = ctx.currentTime + delay;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

export const sounds = {
  buy: () => (tone(660, 0.12, "triangle", 0.08), tone(990, 0.15, "triangle", 0.06, 0.06)),
  sell: () => (tone(440, 0.12, "triangle", 0.07), tone(330, 0.15, "triangle", 0.06, 0.06)),
  whale: () => [220, 330, 440, 660].forEach((f, i) => tone(f, 0.3, "sawtooth", 0.05, i * 0.08)),
  launch: () => [523, 784, 1047].forEach((f, i) => tone(f, 0.25, "sine", 0.08, i * 0.07)),
  win: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.35, "triangle", 0.1, i * 0.1)),
};
