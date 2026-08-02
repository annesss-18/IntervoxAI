// Downsample microphone audio to 16 kHz PCM with a short VAD hold.
class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.TargetSampleRate = 16000;
    // A 128 ms buffer balances latency and batching.
    this.BufferSize = 2048;
    this.buffer = new Float32Array(this.BufferSize);
    this.bufferIndex = 0;
    // Preserve fractional phase across render quanta to prevent resampling drift.
    this.sourcePosition = 0;
    this.VadThreshold = 0.005;

    // Retain speech briefly across natural pauses.
    this.VadHoldFrames = 5;
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

    // Resample hardware audio to 16 kHz with linear interpolation.
    const ratio = sampleRate / this.TargetSampleRate;

    while (this.sourcePosition < inputChannel.length) {
      const srcIndex = this.sourcePosition;
      const srcIndexFloor = Math.floor(srcIndex);
      const fraction = srcIndex - srcIndexFloor;

      const sample1 = inputChannel[srcIndexFloor] || 0;
      const sample2 = inputChannel[srcIndexFloor + 1] || sample1;
      const value = sample1 + (sample2 - sample1) * fraction;

      this.buffer[this.bufferIndex++] = value;

      if (this.bufferIndex >= this.BufferSize) {
        this.flush();
      }

      this.sourcePosition += ratio;
    }

    // Rebase to the next input block while retaining the fractional phase.
    this.sourcePosition -= inputChannel.length;

    return true;
  }

  flush() {
    let rms = 0;
    for (let i = 0; i < this.bufferIndex; i++) {
      const sample = this.buffer[i] || 0;
      rms += sample * sample;
    }
    rms = Math.sqrt(rms / Math.max(1, this.bufferIndex));

    if (rms >= this.VadThreshold) {
      this.vadHoldCount = this.VadHoldFrames;
    } else {
      if (this.vadHoldCount > 0) {
        this.vadHoldCount--;
      } else {
        this.bufferIndex = 0;
        return;
      }
    }

    // Convert samples to signed 16-bit PCM.
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
