import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildKeyboard,
  describeGuidance,
  describeTuning,
  frequencyToMidi,
  midiToFrequency,
  noteNameForMidi,
  octaveForMidi
} from "../music";
import { detectPitch } from "../pitchDetection";
import type { PitchView } from "../types";

const ANALYSIS_INTERVAL_MS = 75;
const MAX_MISSED_DETECTIONS = 4;
const DEFAULT_GUIDANCE =
  "Choose a target note, play the reference, then sing until the needle centers.";
const DEFAULT_NOTE_STABILITY = 0.55;

export function useVoiceTuner() {
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState("Microphone idle");
  const [targetMidi, setTargetMidi] = useState(69);
  const [pitchView, setPitchView] = useState<PitchView | null>(null);
  const [guidance, setGuidance] = useState(DEFAULT_GUIDANCE);
  const [centsLabel, setCentsLabel] = useState("Waiting for input");
  const [referencePlaying, setReferencePlaying] = useState(false);
  const [referenceVolume, setReferenceVolume] = useState(0.08);
  const [noteStability, setNoteStability] = useState(DEFAULT_NOTE_STABILITY);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const activeTrackRef = useRef<MediaStreamTrack | null>(null);
  const frameIdRef = useRef<number>(0);
  const bufferRef = useRef<Float32Array<ArrayBuffer> | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const referenceGainRef = useRef<GainNode | null>(null);
  const lastAnalysisAtRef = useRef(0);
  const lastStableFrequencyRef = useRef<number | null>(null);
  const missedDetectionsRef = useRef(0);
  const smoothedFrequencyRef = useRef<number | null>(null);
  const displayedMidiRef = useRef<number | null>(null);
  const pendingMidiRef = useRef<number | null>(null);
  const pendingMidiFramesRef = useRef(0);
  const isListeningRef = useRef(false);
  const referencePlayingRef = useRef(false);

  const keyboard = useMemo(() => buildKeyboard(), []);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    referencePlayingRef.current = referencePlaying;
  }, [referencePlaying]);

  useEffect(() => {
    if (oscillatorRef.current && audioContextRef.current) {
      oscillatorRef.current.frequency.setValueAtTime(
        midiToFrequency(targetMidi),
        audioContextRef.current.currentTime
      );
    }
  }, [targetMidi]);

  useEffect(() => {
    if (referenceGainRef.current && audioContextRef.current) {
      referenceGainRef.current.gain.setValueAtTime(
        referenceVolume,
        audioContextRef.current.currentTime
      );
    }
  }, [referenceVolume]);

  useEffect(() => () => {
    stopReferenceTone();
    stopListening();
  }, []);

  async function ensureAudioContext() {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    if (audioContextRef.current.state === "suspended") {
      await audioContextRef.current.resume();
    }
  }

  async function startListening() {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("This browser does not support microphone access.");
    }

    const mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        autoGainControl: false,
        echoCancellation: false,
        noiseSuppression: false
      }
    });

    await ensureAudioContext();
    const audioContext = audioContextRef.current as AudioContext;
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 4096;
    analyser.smoothingTimeConstant = 0.2;

    const buffer = new Float32Array(analyser.fftSize) as Float32Array<ArrayBuffer>;
    const sourceNode = audioContext.createMediaStreamSource(mediaStream);
    sourceNode.connect(analyser);

    analyserRef.current = analyser;
    mediaStreamRef.current = mediaStream;
    sourceNodeRef.current = sourceNode;
    bufferRef.current = buffer;
    activeTrackRef.current = mediaStream.getAudioTracks()[0] ?? null;
    lastAnalysisAtRef.current = 0;
    lastStableFrequencyRef.current = null;
    missedDetectionsRef.current = 0;
    smoothedFrequencyRef.current = null;
    displayedMidiRef.current = null;
    pendingMidiRef.current = null;
    pendingMidiFramesRef.current = 0;
    isListeningRef.current = true;

    if (activeTrackRef.current) {
      activeTrackRef.current.onended = () => {
        if (isListeningRef.current) {
          setStatus("Microphone input ended");
          stopListening();
        }
      };

      activeTrackRef.current.onmute = () => {
        if (isListeningRef.current) {
          setStatus("Microphone muted");
        }
      };

      activeTrackRef.current.onunmute = () => {
        if (isListeningRef.current) {
          setStatus("Listening");
        }
      };
    }

    audioContext.onstatechange = async () => {
      const currentContext = audioContextRef.current;
      if (!currentContext || !isListeningRef.current) {
        return;
      }

      if (currentContext.state === "suspended") {
        try {
          await currentContext.resume();
        } catch (error) {
          console.error(error);
        }
      }
    };

    setIsListening(true);
    setStatus("Listening");
    setCentsLabel("Hold a steady pitch");
    tick();
  }

  function stopListening() {
    isListeningRef.current = false;
    setIsListening(false);
    cancelAnimationFrame(frameIdRef.current);

    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (activeTrackRef.current) {
      activeTrackRef.current.onended = null;
      activeTrackRef.current.onmute = null;
      activeTrackRef.current.onunmute = null;
      activeTrackRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.onstatechange = null;
      maybeCloseAudioContext();
    }

    analyserRef.current = null;
    bufferRef.current = null;
    lastStableFrequencyRef.current = null;
    missedDetectionsRef.current = 0;
    smoothedFrequencyRef.current = null;
    displayedMidiRef.current = null;
    pendingMidiRef.current = null;
    pendingMidiFramesRef.current = 0;
    setStatus("Microphone idle");
    setPitchView(null);
    setCentsLabel("Waiting for input");
    setGuidance(DEFAULT_GUIDANCE);
  }

  function tick(timestamp = 0) {
    const analyser = analyserRef.current;
    const buffer = bufferRef.current;
    const audioContext = audioContextRef.current;

    if (!analyser || !buffer || !audioContext) {
      return;
    }

    if (timestamp - lastAnalysisAtRef.current < ANALYSIS_INTERVAL_MS) {
      frameIdRef.current = requestAnimationFrame(tick);
      return;
    }

    lastAnalysisAtRef.current = timestamp;
    analyser.getFloatTimeDomainData(buffer);
    const frequency = detectPitch(buffer, audioContext.sampleRate);

    if (!frequency) {
      missedDetectionsRef.current += 1;

      if (
        lastStableFrequencyRef.current &&
        missedDetectionsRef.current <= MAX_MISSED_DETECTIONS
      ) {
        renderPitch(lastStableFrequencyRef.current);
      } else {
        lastStableFrequencyRef.current = null;
        renderNoPitch();
      }
    } else {
      missedDetectionsRef.current = 0;
      lastStableFrequencyRef.current = frequency;
      renderPitch(frequency);
    }

    frameIdRef.current = requestAnimationFrame(tick);
  }

  function renderPitch(frequency: number) {
    const smoothedFrequency = smoothFrequency(frequency);
    const rawMidi = Math.round(frequencyToMidi(smoothedFrequency));
    const midi = chooseStableMidi(rawMidi, smoothedFrequency);
    const noteCents = Math.round(1200 * Math.log2(smoothedFrequency / midiToFrequency(midi)));
    const targetCents = Math.round(
      1200 * Math.log2(smoothedFrequency / midiToFrequency(targetMidi))
    );

    setPitchView({
      frequency: smoothedFrequency,
      midi,
      note: noteNameForMidi(midi),
      noteCents,
      octave: octaveForMidi(midi),
      targetCents
    });
    setCentsLabel(describeTuning(noteCents));
    setGuidance(describeGuidance(targetCents));
  }

  function renderNoPitch() {
    pendingMidiRef.current = null;
    pendingMidiFramesRef.current = 0;
    setPitchView(null);
    setCentsLabel("Listening for a stable note");
    setGuidance("Sing the target note with a steady vowel and watch for the needle to settle.");
  }

  function smoothFrequency(frequency: number) {
    const previous = smoothedFrequencyRef.current;
    const smoothingAmount = 0.12 + noteStability * 0.5;

    if (!previous) {
      smoothedFrequencyRef.current = frequency;
      return frequency;
    }

    const smoothed = previous + (frequency - previous) * smoothingAmount;
    smoothedFrequencyRef.current = smoothed;
    return smoothed;
  }

  function chooseStableMidi(candidateMidi: number, frequency: number) {
    const displayedMidi = displayedMidiRef.current;
    const holdCurrentNoteCents = 10 + noteStability * 36;
    const midiSwitchConfirmFrames = 1 + Math.round(noteStability * 4);

    if (displayedMidi === null) {
      displayedMidiRef.current = candidateMidi;
      return candidateMidi;
    }

    if (candidateMidi === displayedMidi) {
      pendingMidiRef.current = null;
      pendingMidiFramesRef.current = 0;
      return displayedMidi;
    }

    const currentMidiCents = Math.abs(
      1200 * Math.log2(frequency / midiToFrequency(displayedMidi))
    );

    if (currentMidiCents <= holdCurrentNoteCents) {
      pendingMidiRef.current = null;
      pendingMidiFramesRef.current = 0;
      return displayedMidi;
    }

    if (pendingMidiRef.current !== candidateMidi) {
      pendingMidiRef.current = candidateMidi;
      pendingMidiFramesRef.current = 1;
      return displayedMidi;
    }

    pendingMidiFramesRef.current += 1;

    if (pendingMidiFramesRef.current < midiSwitchConfirmFrames) {
      return displayedMidi;
    }

    displayedMidiRef.current = candidateMidi;
    pendingMidiRef.current = null;
    pendingMidiFramesRef.current = 0;
    return candidateMidi;
  }

  async function startReferenceTone(midi = targetMidi) {
    await ensureAudioContext();
    const audioContext = audioContextRef.current as AudioContext;
    stopReferenceTone();
    const oscillator = audioContext.createOscillator();
    const referenceGain = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = midiToFrequency(midi);
    referenceGain.gain.value = referenceVolume;
    oscillator.connect(referenceGain);
    referenceGain.connect(audioContext.destination);
    oscillator.start();

    oscillatorRef.current = oscillator;
    referenceGainRef.current = referenceGain;
    setReferencePlaying(true);
  }

  function stopReferenceTone() {
    if (oscillatorRef.current) {
      oscillatorRef.current.stop();
      oscillatorRef.current.disconnect();
      oscillatorRef.current = null;
    }

    if (referenceGainRef.current) {
      referenceGainRef.current.disconnect();
      referenceGainRef.current = null;
    }

    setReferencePlaying(false);
    referencePlayingRef.current = false;
    maybeCloseAudioContext();
  }

  function maybeCloseAudioContext() {
    if (!audioContextRef.current || isListeningRef.current || referencePlayingRef.current) {
      return;
    }

    void audioContextRef.current.close();
    audioContextRef.current = null;
  }

  return {
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
  };
}
