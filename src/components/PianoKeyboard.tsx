import type { KeyboardKey } from "../types";

type PianoKeyboardProps = {
  activeMidi: number | null;
  keys: KeyboardKey[];
  onKeyPress: (midi: number) => void;
  onKeyRelease: () => void;
  targetMidi: number;
};

export function PianoKeyboard({
  activeMidi,
  keys,
  onKeyPress,
  onKeyRelease,
  targetMidi
}: PianoKeyboardProps) {
  const whiteKeyCount = keys.filter((key) => !key.isBlack).length;

  return (
    <section className="keyboard-panel">
      <div className="keyboard-header">
        <span className="label">Live keyboard</span>
        <p className="keyboard-copy">
          Your current sung note is highlighted on the piano. The target key is outlined.
        </p>
      </div>
      <div className="keyboard-shell">
        <div
          className="keyboard"
          aria-label="Piano keyboard"
          style={{ width: `calc(${whiteKeyCount} * var(--white-key-width))` }}
        >
          <div className="keyboard-white-row">
            {keys
              .filter((key) => !key.isBlack)
              .map((key) => (
                <button
                  key={key.midi}
                  className={keyClassName(key.midi, false, activeMidi, targetMidi)}
                  type="button"
                  aria-label={key.label}
                  onPointerDown={() => onKeyPress(key.midi)}
                  onPointerUp={onKeyRelease}
                  onPointerCancel={onKeyRelease}
                  onPointerLeave={onKeyRelease}
                >
                  <span>{key.label}</span>
                </button>
              ))}
          </div>
          <div className="keyboard-black-row">
            {keys
              .filter((key) => key.isBlack)
              .map((key) => (
                <button
                  key={key.midi}
                  className={keyClassName(key.midi, true, activeMidi, targetMidi)}
                  type="button"
                  aria-label={key.label}
                  onPointerDown={() => onKeyPress(key.midi)}
                  onPointerUp={onKeyRelease}
                  onPointerCancel={onKeyRelease}
                  onPointerLeave={onKeyRelease}
                  style={{
                    left: `calc(${key.whiteIndex} * var(--white-key-width) - var(--black-key-width) / 2)`
                  }}
                >
                  <span>{key.label}</span>
                </button>
              ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function keyClassName(
  midi: number,
  isBlack: boolean,
  activeMidi: number | null,
  targetMidi: number
) {
  const classes = ["piano-key", isBlack ? "piano-key-black" : "piano-key-white"];

  if (midi === activeMidi) {
    classes.push("is-active");
  }

  if (midi === targetMidi) {
    classes.push("is-target");
  }

  return classes.join(" ");
}
