export type NoteName =
  | "C"
  | "C#"
  | "D"
  | "D#"
  | "E"
  | "F"
  | "F#"
  | "G"
  | "G#"
  | "A"
  | "A#"
  | "B";

export type PitchView = {
  frequency: number;
  midi: number;
  note: NoteName;
  noteCents: number;
  octave: number;
  targetCents: number;
};

export type KeyboardKey = {
  isBlack: boolean;
  label: string;
  midi: number;
  whiteIndex: number;
};
