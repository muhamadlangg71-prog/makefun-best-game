// Lanternfall — every sound is synthesised with WebAudio, no audio files.
// The context is created on the first user gesture (the start button),
// so the game stays silent on the title screen until the player plays.
export class SoundBank {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.ambient = null;
  }

  // Call from a user gesture. Safe to call repeatedly.
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
    this.startAmbient();
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.5;
  }

  // A quiet two-oscillator drone under the game, so the arena never
  // feels dead. Starts once, with the audio context.
  startAmbient() {
    if (!this.ctx || this.ambient) return;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.04;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    const oscA = this.ctx.createOscillator();
    oscA.type = 'sine';
    oscA.frequency.value = 110;
    const oscB = this.ctx.createOscillator();
    oscB.type = 'sine';
    oscB.frequency.value = 164.8;
    oscA.connect(filter);
    oscB.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    oscA.start();
    oscB.start();
    this.ambient = { oscA, oscB, gain };
  }

  // One short tone with a pitch slide and an exponential fade.
  tone({ type = 'sine', from = 440, to = null, duration = 0.12, volume = 0.2, delay = 0 }) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t0);
    if (to !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + duration);
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  // Filtered noise burst, for impacts and explosions.
  noise({ duration = 0.2, volume = 0.25, frequency = 1200, delay = 0 }) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const length = Math.max(1, Math.floor(this.ctx.sampleRate * duration));
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = frequency;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start(t0);
  }

  shoot() {
    this.tone({ type: 'square', from: 880, to: 440, duration: 0.07, volume: 0.08 });
  }

  hit() {
    this.tone({ type: 'triangle', from: 320, to: 180, duration: 0.06, volume: 0.12 });
  }

  explode() {
    this.noise({ duration: 0.28, volume: 0.3, frequency: 900 });
    this.tone({ type: 'sine', from: 160, to: 40, duration: 0.25, volume: 0.25 });
  }

  pickup() {
    this.tone({ type: 'sine', from: 660, to: 990, duration: 0.1, volume: 0.14 });
    this.tone({ type: 'sine', from: 990, to: 1320, duration: 0.12, volume: 0.1, delay: 0.06 });
  }

  powerup() {
    [523, 659, 784, 1047].forEach((f, i) => {
      this.tone({ type: 'sine', from: f, duration: 0.14, volume: 0.14, delay: i * 0.07 });
    });
  }

  hurt() {
    this.tone({ type: 'sawtooth', from: 140, to: 60, duration: 0.22, volume: 0.22 });
    this.noise({ duration: 0.12, volume: 0.15, frequency: 500 });
  }

  waveStart() {
    [392, 523, 659].forEach((f, i) => {
      this.tone({ type: 'triangle', from: f, duration: 0.16, volume: 0.16, delay: i * 0.09 });
    });
  }

  upgrade() {
    [440, 554, 659, 880].forEach((f, i) => {
      this.tone({ type: 'sine', from: f, duration: 0.18, volume: 0.13, delay: i * 0.08 });
    });
  }

  gameOver() {
    [330, 262, 196, 131].forEach((f, i) => {
      this.tone({ type: 'triangle', from: f, duration: 0.32, volume: 0.18, delay: i * 0.18 });
    });
  }

  victory() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => {
      this.tone({ type: 'sine', from: f, duration: 0.3, volume: 0.16, delay: i * 0.11 });
    });
  }

  click() {
    this.tone({ type: 'sine', from: 700, to: 900, duration: 0.05, volume: 0.1 });
  }
}
