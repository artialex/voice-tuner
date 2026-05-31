import type { PitchView } from "../types";

type PitchReadoutProps = {
  centsLabel: string;
  needleOffset: number;
  pitchView: PitchView | null;
};

export function PitchReadout({ centsLabel, needleOffset, pitchView }: PitchReadoutProps) {
  return (
    <section className="readout" aria-live="polite">
      <div className="note-block">
        <span className="label">Your note</span>
        <div className="note">{pitchView?.note ?? "--"}</div>
        <div className="meta">Octave {pitchView?.octave ?? "--"}</div>
      </div>

      <div className="meter-block">
        <span className="label">Current note tuning</span>
        <div className="cents-line">
          <span>{centsLabel}</span>
        </div>
        <div className="tuner-scale" aria-hidden="true">
          <span className="tick tick-left"></span>
          <span className="tick tick-center"></span>
          <span className="tick tick-right"></span>
          <span className="needle" style={{ transform: `translateX(${needleOffset}%)` }}></span>
        </div>
        <div className="frequency">{pitchView ? `${pitchView.frequency.toFixed(1)} Hz` : "-- Hz"}</div>
      </div>
    </section>
  );
}
