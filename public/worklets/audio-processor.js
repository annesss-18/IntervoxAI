class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.TargetSampleRate = 16000;
    this.BufferSize = 2048; // ~125ms buffer at 16kHz for lower turn-end latency.
    this.buffer = new Float32Array(this.BufferSize);
    this.bufferIndex = 0;
    this.VadThreshold = 0.005;

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
    // Keep node active even when an input frame has no channel data.
    if (!inputChannel) return true;

    // Downsample from the hardware rate to 16kHz using linear interpolation.
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
    // Skip near-silent buffers to reduce noise and bandwidth.
    let rms = 0;
    for (let i = 0; i < this.bufferIndex; i++) {
      const sample = this.buffer[i] || 0;
      rms += sample * sample;
    }
    rms = Math.sqrt(rms / Math.max(1, this.bufferIndex));
    if (rms < this.VadThreshold) {
      this.bufferIndex = 0;
      return;
    }

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
