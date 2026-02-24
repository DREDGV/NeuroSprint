import type { AudioSettings } from "../../types/domain";

type CueType = "start" | "finish" | "click" | "correct" | "error";

const CUE_MAP: Record<CueType, { freq: number; duration: number; type: OscillatorType }> = {
  start: { freq: 640, duration: 0.11, type: "sine" },
  finish: { freq: 880, duration: 0.2, type: "triangle" },
  click: { freq: 520, duration: 0.04, type: "square" },
  correct: { freq: 740, duration: 0.08, type: "sine" },
  error: { freq: 240, duration: 0.11, type: "sawtooth" }
};

let audioContext: AudioContext | null = null;

function shouldPlay(type: CueType, settings: AudioSettings): boolean {
  if (settings.muted || settings.volume <= 0) {
    return false;
  }
  if (type === "start" || type === "finish") {
    return settings.startEnd;
  }
  if (type === "click") {
    return settings.click;
  }
  if (type === "correct") {
    return settings.correct;
  }
  return settings.error;
}

function getAudioContext(): AudioContext | null {
  const Context =
    typeof window !== "undefined"
      ? window.AudioContext || (window as Window & { webkitAudioContext?: AudioContext }).webkitAudioContext
      : undefined;
  if (!Context) {
    return null;
  }
  if (!audioContext) {
    audioContext = new Context();
  }
  return audioContext;
}

export function playAudioCue(type: CueType, settings: AudioSettings): void {
  if (!shouldPlay(type, settings)) {
    return;
  }

  const context = getAudioContext();
  if (!context) {
    return;
  }

  const cue = CUE_MAP[type];
  try {
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    oscillator.type = cue.type;
    oscillator.frequency.value = cue.freq;
    gainNode.gain.value = Math.max(0.01, Math.min(0.8, settings.volume));

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + cue.duration);
  } catch {
    // no-op
  }
}
