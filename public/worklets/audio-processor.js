class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this.TargetSampleRate = 16000
    this.BufferSize = 4096 // larger buffer for network efficiency (approx 250ms at 16kHz)
    this.buffer = new Float32Array(this.BufferSize)
    this.bufferIndex = 0
    this.VadThreshold = 0.005

    this.port.onmessage = (event) => {
      const payload = event.data
      if (!payload || payload.type !== 'SET_VAD_THRESHOLD') return

      const nextThreshold = Number(payload.value)
      if (Number.isFinite(nextThreshold)) {
        this.VadThreshold = Math.max(0.0005, Math.min(0.05, nextThreshold))
      }
    }
  }

  process(inputs) {
    const input = inputs[0]
    if (!input || !input.length) return true

    const inputChannel = input[0]
    // If no input data, keep processor alive
    if (!inputChannel) return true

    // Downsample and process
    // We assume input is standard 44.1 or 48kHz, we need 16kHz
    // Simple linear interpolation / decimation

    // Note: sampleRate is a global in AudioWorkletScope
    const ratio = sampleRate / this.TargetSampleRate

    // We process the input chunk and fill our internal buffer
    // This is a simplified downsampler that works on the current chunk
    // For production "perfect" audio we'd need a more complex ring buffer/filter
    // but for speech recognition this is usually sufficient and very fast.

    const newSamples = Math.floor(inputChannel.length / ratio)

    for (let i = 0; i < newSamples; i++) {
      // Linear interpolation
      const srcIndex = i * ratio
      const srcIndexFloor = Math.floor(srcIndex)
      const fraction = srcIndex - srcIndexFloor

      const sample1 = inputChannel[srcIndexFloor] || 0
      const sample2 = inputChannel[srcIndexFloor + 1] || sample1
      const value = sample1 + (sample2 - sample1) * fraction

      this.buffer[this.bufferIndex++] = value

      if (this.bufferIndex >= this.BufferSize) {
        this.flush()
      }
    }

    return true
  }

  flush() {
    // Drop near-silent chunks to reduce background noise and unnecessary network traffic.
    let rms = 0
    for (let i = 0; i < this.bufferIndex; i++) {
      const sample = this.buffer[i] || 0
      rms += sample * sample
    }
    rms = Math.sqrt(rms / Math.max(1, this.bufferIndex))
    if (rms < this.VadThreshold) {
      this.bufferIndex = 0
      return
    }

    // Convert to 16-bit PCM
    const pcmData = new Int16Array(this.bufferIndex)
    for (let i = 0; i < this.bufferIndex; i++) {
      const s = Math.max(-1, Math.min(1, this.buffer[i]))
      pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7fff
    }

    // Send to main thread
    this.port.postMessage(pcmData)

    // Reset buffer
    this.bufferIndex = 0
  }
}

registerProcessor('audio-processor', AudioProcessor)
