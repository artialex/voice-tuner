import { PianoKeyboard } from "./components/PianoKeyboard";
import { PitchReadout } from "./components/PitchReadout";
import { TargetControls } from "./components/TargetControls";
import { useVoiceTuner } from "./hooks/useVoiceTuner";
import { midiToFrequency, octaveForMidi } from "./music";

export function App() {
  const {
    centsLabel,
    guidance,
    isListening,
    keyboard,
    noteStability,
    pitchView,
    referencePlaying,
    referenceVolume,
    startListening,
    setCentsLabel,
    setNoteStability,
    setReferenceVolume,
    status,
    stopListening,
    stopReferenceTone,
    targetMidi,
    setStatus,
    setTargetMidi,
    startReferenceTone
  } = useVoiceTuner();

  const targetNoteIndex = ((targetMidi % 12) + 12) % 12;
  const targetOctave = octaveForMidi(targetMidi);
  const targetFrequency = midiToFrequency(targetMidi);
  const needleOffset = Math.max(-50, Math.min(50, pitchView?.noteCents ?? 0));

  return (
    <main className="shell">
      <section className="panel">
        <p className="eyebrow">Live Microphone Pitch Detection</p>
        <h1>Voice Tuner</h1>
        <p className="lede">
          Sing or play a steady note and this tuner will estimate the closest pitch in real time.
        </p>

        <div className="status-row">
          <button
            className="listen-button"
            type="button"
            onClick={() => {
              if (isListening) {
                stopListening();
                return;
              }

              void startListening().catch(handleStartError);
            }}
          >
            {isListening ? "Stop Listening" : "Start Listening"}
          </button>
          <p className="status-pill">{status}</p>
        </div>

        <TargetControls
          onToggleReference={() => {
            if (referencePlaying) {
              stopReferenceTone();
              return;
            }

            void startReferenceTone().catch((error) => {
              console.error(error);
              setStatus("Reference tone failed");
            });
          }}
          onTargetMidiChange={setTargetMidi}
          onNoteStabilityChange={setNoteStability}
          onVolumeChange={setReferenceVolume}
          noteStability={noteStability}
          referencePlaying={referencePlaying}
          referenceVolume={referenceVolume}
          targetFrequency={targetFrequency}
          targetNoteIndex={targetNoteIndex}
          targetOctave={targetOctave}
        />

        <PitchReadout centsLabel={centsLabel} needleOffset={needleOffset} pitchView={pitchView} />

        <PianoKeyboard
          activeMidi={pitchView?.midi ?? null}
          keys={keyboard}
          onKeyPress={(midi) => {
            setTargetMidi(midi);
            void startReferenceTone(midi).catch((error) => {
              console.error(error);
              setStatus("Reference tone failed");
            });
          }}
          onKeyRelease={stopReferenceTone}
          targetMidi={targetMidi}
        />

        <p className="guidance">{guidance}</p>
        <p className="hint">
          Best results come from a clear single note in a quiet room. Browser microphone
          permission is required.
        </p>
      </section>
    </main>
  );

  function handleStartError(error: unknown) {
    console.error(error);
    setStatus("Microphone access failed");
    setCentsLabel("Allow microphone access and try again");
  }
}
