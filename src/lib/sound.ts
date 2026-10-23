// Tiny synthesized sound effects: no files, no network, instant.
export type Sfx = 'move' | 'capture' | 'check' | 'wrong' | 'solved' | 'complete';

let ctx: AudioContext | null = null;
let enabled = true;

export function setSoundEnabled(on: boolean) {
  enabled = on;
}

/** Call from a user gesture (tap/click/key): mobile browsers only allow audio to start there. */
export function unlockAudio() {
  if (typeof AudioContext === 'undefined') return;
  ctx ??= new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
}

function audio(): AudioContext | null {
  if (!enabled || typeof AudioContext === 'undefined') return null;
  ctx ??= new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(a: AudioContext, freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.12) {
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(gain, start + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g).connect(a.destination);
  o.start(start);
  o.stop(start + dur + 0.02);
}

// A short band-passed noise burst reads as wood on wood.
function knock(a: AudioContext, freq: number, start: number, dur: number, gain: number) {
  const len = Math.ceil(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  f.Q.value = 1.4;
  const g = a.createGain();
  g.gain.value = gain;
  src.connect(f).connect(g).connect(a.destination);
  src.start(start);
}

export function play(s: Sfx) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + 0.005;
  switch (s) {
    case 'move':
      knock(a, 1800, t, 0.05, 0.9);
      break;
    case 'capture':
      knock(a, 900, t, 0.08, 1.2);
      knock(a, 2200, t + 0.012, 0.04, 0.5);
      break;
    case 'check':
      knock(a, 1800, t, 0.05, 0.9);
      tone(a, 880, t + 0.03, 0.09, 'triangle', 0.06);
      tone(a, 660, t + 0.11, 0.12, 'triangle', 0.06);
      break;
    case 'wrong':
      tone(a, 140, t, 0.14, 'sine', 0.22);
      tone(a, 110, t + 0.05, 0.12, 'sine', 0.12);
      break;
    case 'solved':
      tone(a, 660, t, 0.12, 'triangle', 0.08);
      tone(a, 990, t + 0.09, 0.22, 'triangle', 0.08);
      break;
    case 'complete':
      [523, 659, 784, 1047].forEach((f, i) => tone(a, f, t + i * 0.08, 0.28, 'triangle', 0.08));
      break;
  }
}

export function buzz(pattern: number | number[]) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern);
}
