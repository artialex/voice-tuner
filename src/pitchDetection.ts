const SILENCE_RMS_THRESHOLD = 0.01;
const MIN_FREQUENCY = 32.7;
const MAX_FREQUENCY = 1047;
const CLARITY_THRESHOLD = 0.82;
const HARMONIC_TOLERANCE = 0.9;

export function detectPitch(samples: Float32Array<ArrayBufferLike>, sampleRate: number) {
  let rms = 0;

  for (let i = 0; i < samples.length; i += 1) {
    rms += samples[i] * samples[i];
  }

  rms = Math.sqrt(rms / samples.length);
  if (rms < SILENCE_RMS_THRESHOLD) {
    return null;
  }

  const minLag = Math.floor(sampleRate / MAX_FREQUENCY);
  const maxLag = Math.min(Math.floor(sampleRate / MIN_FREQUENCY), samples.length - 2);
  const correlations = new Float32Array(maxLag + 1);
  let bestLag = -1;
  let bestCorrelation = 0;

  for (let lag = minLag; lag <= maxLag; lag += 1) {
    const correlation = correlationAtLag(samples, lag);
    correlations[lag] = correlation;

    if (correlation > bestCorrelation) {
      bestCorrelation = correlation;
      bestLag = lag;
    }
  }

  if (bestLag === -1 || bestCorrelation < CLARITY_THRESHOLD) {
    return null;
  }

  let fundamentalLag = bestLag;
  for (let lag = minLag; lag < bestLag; lag += 1) {
    if (correlations[lag] >= bestCorrelation * HARMONIC_TOLERANCE) {
      fundamentalLag = lag;
      break;
    }
  }

  const previousLag = Math.max(minLag, fundamentalLag - 1);
  const nextLag = Math.min(maxLag, fundamentalLag + 1);
  const previousCorrelation = correlations[previousLag] || correlationAtLag(samples, previousLag);
  const currentCorrelation =
    correlations[fundamentalLag] || correlationAtLag(samples, fundamentalLag);
  const nextCorrelation = correlations[nextLag] || correlationAtLag(samples, nextLag);
  const denominator = 2 * (2 * currentCorrelation - previousCorrelation - nextCorrelation);
  const shift = denominator === 0 ? 0 : (nextCorrelation - previousCorrelation) / denominator;
  const refinedLag = fundamentalLag + shift;
  const frequency = sampleRate / refinedLag;

  return frequency >= MIN_FREQUENCY && frequency <= MAX_FREQUENCY ? frequency : null;
}

function correlationAtLag(samples: Float32Array<ArrayBufferLike>, lag: number) {
  let cross = 0;
  let energyA = 0;
  let energyB = 0;

  for (let i = 0; i < samples.length - lag; i += 1) {
    const a = samples[i];
    const b = samples[i + lag];
    cross += a * b;
    energyA += a * a;
    energyB += b * b;
  }

  if (energyA === 0 || energyB === 0) {
    return 0;
  }

  return cross / Math.sqrt(energyA * energyB);
}
