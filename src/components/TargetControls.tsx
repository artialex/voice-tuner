import { NOTES, OCTAVES } from "../music";

type TargetControlsProps = {
  onToggleReference: () => void;
  onTargetMidiChange: (midi: number) => void;
  onNoteStabilityChange: (stability: number) => void;
  onVolumeChange: (volume: number) => void;
  noteStability: number;
  referencePlaying: boolean;
  referenceVolume: number;
  targetFrequency: number;
  targetNoteIndex: number;
  targetOctave: number;
};

export function TargetControls({
  onToggleReference,
  onTargetMidiChange,
  onNoteStabilityChange,
  onVolumeChange,
  noteStability,
  referencePlaying,
  referenceVolume,
  targetFrequency,
  targetNoteIndex,
  targetOctave
}: TargetControlsProps) {
  return (
    <section className="target-panel">
      <div className="target-controls">
        <label className="control">
          <span className="label">Target note</span>
          <select
            value={targetNoteIndex}
            onChange={(event) => {
              onTargetMidiChange(Number(event.target.value) + (targetOctave + 1) * 12);
            }}
          >
            {NOTES.map((note, index) => (
              <option key={note} value={index}>
                {note}
              </option>
            ))}
          </select>
        </label>
        <label className="control">
          <span className="label">Octave</span>
          <select
            value={targetOctave}
            onChange={(event) => {
              onTargetMidiChange(targetNoteIndex + (Number(event.target.value) + 1) * 12);
            }}
          >
            {OCTAVES.map((octave) => (
              <option key={octave} value={octave}>
                {octave}
              </option>
            ))}
          </select>
        </label>
        <button className="reference-button" type="button" onClick={onToggleReference}>
          {referencePlaying ? "Stop Reference" : "Play Reference"}
        </button>
      </div>
      <label className="volume-control">
        <span className="label">Reference volume</span>
        <div className="volume-row">
          <input
            className="volume-slider"
            type="range"
            min="0"
            max="0.2"
            step="0.01"
            value={referenceVolume}
            onChange={(event) => {
              onVolumeChange(Number(event.target.value));
            }}
          />
          <span className="volume-value">{Math.round((referenceVolume / 0.2) * 100)}%</span>
        </div>
      </label>
      <label className="volume-control">
        <span className="label">Note stability</span>
        <div className="volume-row">
          <input
            className="volume-slider"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={noteStability}
            onChange={(event) => {
              onNoteStabilityChange(Number(event.target.value));
            }}
          />
          <span className="volume-value">{noteStability < 0.5 ? "Loose" : "Tight"}</span>
        </div>
      </label>
      <p className="target-readout">
        Target: {NOTES[targetNoteIndex]}
        {targetOctave} ({targetFrequency.toFixed(1)} Hz)
      </p>
    </section>
  );
}
