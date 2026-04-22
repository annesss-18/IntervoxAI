/**
 * AudioWorklet processor for real-time microphone capture.
 *
 * Responsibilities:
 *   1. Downsample hardware audio (typically 44.1 kHz or 48 kHz) to 16 kHz
 *      using linear interpolation — the sample rate Gemini Live expects.
 *   2. Apply a VAD (Voice Activity Detection) threshold to avoid sending pure
 *      silence, reducing bandwidth and preventing the server-side VAD from
 *      treating ambient noise as speech.
 *   3. Apply a VAD hold to prevent hard audio gaps. When a buffer falls below
 *      the RMS threshold, do NOT drop it immediately — continue sending for
 *      VAD_HOLD_FRAMES additional frames. This smooths the audio stream during
 *      brief pauses (breathing, emphasis, thinking) so the server-side Gemini
 *      VAD does not prematurely commit the user's turn.
 *
 * Why the VAD hold matters:
 *   Without a hold, a 128 ms buffer of silence between words is dropped
 *   entirely. Gemini's server-side VAD sees a hard gap in the audio stream and
 *   may interpret it as end-of-turn, even if silenceDurationMs is set to a
 *   higher value. With a hold of 5 frames (~640 ms), brief pauses within a
 *   response are transmitted as quiet audio rather than silence, and the server
 *   VAD correctly identifies them as mid-speech.
 */
class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.TargetSampleRate = 16000;
    // ~128 ms buffer at 16 kHz for low turn-end latency.
    this.BufferSize = 2048;
    this.buffer = new Float32Array(this.BufferSize);
    this.bufferIndex = 0;
    this.VadThreshold = 0.005;

    // VAD hold: number of consecutive below-threshold buffers to continue
    // sending after the signal drops. Each buffer is ~128 ms, so 5 frames
    // gives ~640 ms of hold — enough to smooth breathing and brief pauses
    // without transmitting extended silence.
    this.VadHoldFrames = 5;
    // Count of below-threshold frames remaining in the current hold window.
    this.vadHoldCount = 0;

    this.port.onmessage = (event) => {
      const payload = event.data;
      if (!payload || payload.type !== "SET_VAD_THRESHOLD") return;

      const nextThreshold = Number(payload.value);
      if (Number.isFinite(nextThreshold)) {
        this.VadThreshold = Math.max(0.0005, Math.min(0.05, nextThreshold));
      }
    };
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input.length) return true;

    const inputChannel = input[0];
    if (!inputChannel) return true;

    // Downsample from the hardware rate to 16 kHz using linear interpolation.
    const ratio = sampleRate / this.TargetSampleRate;
    const newSamples = Math.floor(inputChannel.length / ratio);

    for (let i = 0; i < newSamples; i++) {
      const srcIndex = i * ratio;
      const srcIndexFloor = Math.floor(srcIndex);
      const fraction = srcIndex - srcIndexFloor;

      const sample1 = inputChannel[srcIndexFloor] || 0;
      const sample2 = inputChannel[srcIndexFloor + 1] || sample1;
      const value = sample1 + (sample2 - sample1) * fraction;

      this.buffer[this.bufferIndex++] = value;

      if (this.bufferIndex >= this.BufferSize) {
        this.flush();
      }
    }

    return true;
  }

  flush() {
    // Compute RMS energy of the current buffer.
    let rms = 0;
    for (let i = 0; i < this.bufferIndex; i++) {
      const sample = this.buffer[i] || 0;
      rms += sample * sample;
    }
    rms = Math.sqrt(rms / Math.max(1, this.bufferIndex));

    if (rms >= this.VadThreshold) {
      // Active speech — reset the hold counter and send.
      this.vadHoldCount = this.VadHoldFrames;
    } else {
      // Below threshold.
      if (this.vadHoldCount > 0) {
        // Still within the hold window — send this buffer as quiet audio
        // so the server VAD sees a continuous (quiet) stream rather than
        // a hard gap. Decrement the hold counter.
        this.vadHoldCount--;
      } else {
        // Hold window exhausted — this is genuine sustained silence.
        // Drop the buffer to avoid unnecessary bandwidth and to let the
        // server VAD identify the silence naturally.
        this.bufferIndex = 0;
        return;
      }
    }

    // Convert Float32 samples to Int16 PCM (little-endian, signed).
    const pcmData = new Int16Array(this.bufferIndex);
    for (let i = 0; i < this.bufferIndex; i++) {
      const s = Math.max(-1, Math.min(1, this.buffer[i]));
      pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    this.port.postMessage(pcmData);
    this.bufferIndex = 0;
  }
}

registerProcessor("audio-processor", AudioProcessor);
