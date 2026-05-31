import type { KeyboardKey, NoteName } from "./types";

export const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;
export const OCTAVES = [2, 3, 4, 5, 6] as const;
export const KEYBOARD_START_MIDI = 36;
export const KEYBOARD_END_MIDI = 83;

const BLACK_KEY_INDEXES = new Set([1, 3, 6, 8, 10]);

export function frequencyToMidi(frequency: number) {
  return 69 + 12 * Math.log2(frequency / 440);
}

export function midiToFrequency(midiNote: number) {
  return 440 * 2 ** ((midiNote - 69) / 12);
}

export function describeTuning(cents: number) {
  if (Math.abs(cents) <= 5) {
    return `On target (${Math.abs(cents)} cents off)`;
  }

  return `${Math.abs(cents)} cents ${cents < 0 ? "too low" : "too high"}`;
}

export function describeGuidance(cents: number) {
  if (Math.abs(cents) <= 5) {
    return "Nice, you're centered. Hold that pitch steady.";
  }

  if (Math.abs(cents) <= 15) {
    return cents < 0 ? "A little higher." : "A little lower.";
  }

  return cents < 0 ? "Lift the pitch more." : "Relax the pitch down.";
}

export function buildKeyboard(): KeyboardKey[] {
  const keys: KeyboardKey[] = [];
  let whiteIndex = 0;

  for (let midi = KEYBOARD_START_MIDI; midi <= KEYBOARD_END_MIDI; midi += 1) {
    const noteIndex = ((midi % 12) + 12) % 12;
    const octave = Math.floor(midi / 12) - 1;
    const isBlack = BLACK_KEY_INDEXES.has(noteIndex);

    keys.push({
      isBlack,
      label: `${NOTES[noteIndex]}${octave}`,
      midi,
      whiteIndex
    });

    if (!isBlack) {
      whiteIndex += 1;
    }
  }

  return keys;
}

export function noteNameForMidi(midi: number): NoteName {
  const noteIndex = ((midi % 12) + 12) % 12;
  return NOTES[noteIndex];
}

export function octaveForMidi(midi: number) {
  return Math.floor(midi / 12) - 1;
}
