// The world's sound, synthesised in the browser.
//
// sound.ts decides which layers play and how loud; this turns that into
// Web Audio. Everything is made from filtered noise and short tone sweeps,
// so there is no recording to license and nothing to download.
//
// Rules this holds to, from the brief:
//   Muted by default — no AudioContext exists until the viewer turns sound
//   on, which is a click, which is the only time browsers allow it anyway.
//   Paused in the background — the context suspends when the tab is hidden.
//   One engine for the whole visit, so walking from the house to the river
//   crossfades the soundscape instead of cutting it.

import type { SoundLayer, SoundLayerId } from './sound';

type Voice = { out: GainNode; stop: () => void };

const FADE = 0.6; // seconds

class WorldAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private voices = new Map<SoundLayerId, Voice>();
  private wanted: SoundLayer[] = [];
  private volume = 0.5;
  private on = false;
  private onVisibility = () => {
    if (!this.ctx) return;
    if (document.hidden) void this.ctx.suspend();
    else if (this.on) void this.ctx.resume();
  };

  get enabled() {
    return this.on;
  }

  /** Must be called from a user gesture. */
  async enable(volume: number) {
    this.volume = volume;
    if (!this.ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      const comp = this.ctx.createDynamicsCompressor();
      comp.connect(this.ctx.destination);
      this.master = this.ctx.createGain();
      this.master.gain.value = 0;
      this.master.connect(comp);
      this.noise = this.makeNoise();
      document.addEventListener('visibilitychange', this.onVisibility);
    }
    this.on = true;
    await this.ctx.resume();
    this.master!.gain.setTargetAtTime(this.volume * 0.6, this.ctx.currentTime, 0.3);
    this.apply();
  }

  disable() {
    this.on = false;
    if (!this.ctx || !this.master) return;
    this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
    const ctx = this.ctx;
    window.setTimeout(() => {
      if (!this.on) void ctx.suspend();
    }, 900);
  }

  setVolume(volume: number) {
    this.volume = volume;
    if (this.ctx && this.master && this.on) {
      this.master.gain.setTargetAtTime(volume * 0.6, this.ctx.currentTime, 0.15);
    }
  }

  setScape(layers: SoundLayer[]) {
    this.wanted = layers;
    if (this.on) this.apply();
  }

  // -------------------------------------------------------------------

  private apply() {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const want = new Map(this.wanted.map((l) => [l.id, l.gain]));
    for (const [id, voice] of this.voices) {
      if (!want.has(id)) {
        voice.out.gain.setTargetAtTime(0, ctx.currentTime, FADE / 3);
        window.setTimeout(() => voice.stop(), FADE * 2000);
        this.voices.delete(id);
      }
    }
    for (const [id, gain] of want) {
      let voice = this.voices.get(id);
      if (!voice) {
        voice = this.build(id);
        voice.out.connect(this.master);
        this.voices.set(id, voice);
      }
      voice.out.gain.setTargetAtTime(gain, ctx.currentTime, FADE / 3);
    }
  }

  private makeNoise(): AudioBuffer {
    const ctx = this.ctx!;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    // Brown-ish noise: softer than white, closer to wind and water.
    let last = 0;
    for (let i = 0; i < data.length; i += 1) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.04 * white) / 1.04;
      data[i] = last * 3.2;
    }
    return buffer;
  }

  private noiseSource(): AudioBufferSourceNode {
    const src = this.ctx!.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    // Start each layer somewhere different in the loop so two noise layers
    // never line up into a phasey hum.
    src.start(0, Math.random() * 1.9);
    return src;
  }

  private lfo(rate: number, depth: number, target: AudioParam): OscillatorNode {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.frequency.value = rate;
    const amount = ctx.createGain();
    amount.gain.value = depth;
    osc.connect(amount).connect(target);
    osc.start();
    return osc;
  }

  private build(id: SoundLayerId): Voice {
    const ctx = this.ctx!;
    const out = ctx.createGain();
    out.gain.value = 0;
    const stops: Array<() => void> = [];
    // One pending timer per layer at most; each tick schedules the next.
    let timer = 0;

    const filtered = (type: BiquadFilterType, freq: number, q = 0.7) => {
      const src = this.noiseSource();
      const filter = ctx.createBiquadFilter();
      filter.type = type;
      filter.frequency.value = freq;
      filter.Q.value = q;
      src.connect(filter);
      stops.push(() => src.stop());
      return filter;
    };

    switch (id) {
      case 'wind': {
        const f = filtered('lowpass', 480);
        const o = this.lfo(0.07, 260, f.frequency);
        stops.push(() => o.stop());
        f.connect(out);
        break;
      }
      case 'river': {
        const f = filtered('bandpass', 820, 0.6);
        const swell = ctx.createGain();
        swell.gain.value = 0.85;
        const o = this.lfo(0.27, 0.15, swell.gain);
        stops.push(() => o.stop());
        f.connect(swell).connect(out);
        break;
      }
      case 'rain': {
        const f = filtered('highpass', 1700);
        const top = ctx.createBiquadFilter();
        top.type = 'lowpass';
        top.frequency.value = 7200;
        f.connect(top).connect(out);
        break;
      }
      case 'leaves': {
        const f = filtered('bandpass', 2600, 1.4);
        const rustle = ctx.createGain();
        rustle.gain.value = 0.5;
        const o = this.lfo(0.19, 0.45, rustle.gain);
        stops.push(() => o.stop());
        f.connect(rustle).connect(out);
        break;
      }
      case 'insects': {
        const tone = ctx.createOscillator();
        tone.frequency.value = 4300;
        const chirp = ctx.createGain();
        chirp.gain.value = 0;
        const o = this.lfo(17, 0.05, chirp.gain);
        tone.connect(chirp).connect(out);
        tone.start();
        stops.push(() => tone.stop(), () => o.stop());
        break;
      }
      case 'birds': {
        const sing = () => {
          const notes = 2 + Math.floor(Math.random() * 3);
          const base = 2600 + Math.random() * 1400;
          for (let n = 0; n < notes; n += 1) {
            const t = ctx.currentTime + n * 0.13;
            const osc = ctx.createOscillator();
            const env = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(base, t);
            osc.frequency.exponentialRampToValueAtTime(base * (1.25 + Math.random() * 0.3), t + 0.08);
            env.gain.setValueAtTime(0, t);
            env.gain.linearRampToValueAtTime(0.12, t + 0.015);
            env.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
            osc.connect(env).connect(out);
            osc.start(t);
            osc.stop(t + 0.13);
          }
          timer = (window.setTimeout(sing, 1300 + Math.random() * 3800));
        };
        timer = (window.setTimeout(sing, 400));
        break;
      }
      case 'fire': {
        const f = filtered('bandpass', 480, 0.9);
        const bed = ctx.createGain();
        bed.gain.value = 0.5;
        f.connect(bed).connect(out);
        const crackle = () => {
          const src = this.noiseSource();
          const hp = ctx.createBiquadFilter();
          hp.type = 'highpass';
          hp.frequency.value = 2800;
          const env = ctx.createGain();
          const t = ctx.currentTime;
          env.gain.setValueAtTime(0.5, t);
          env.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
          src.connect(hp).connect(env).connect(out);
          src.stop(t + 0.06);
          timer = (window.setTimeout(crackle, 80 + Math.random() * 420));
        };
        timer = (window.setTimeout(crackle, 200));
        break;
      }
      case 'train': {
        const f = filtered('lowpass', 150);
        f.connect(out);
        const clack = () => {
          for (const offset of [0, 0.11]) {
            const src = this.noiseSource();
            const bp = ctx.createBiquadFilter();
            bp.type = 'bandpass';
            bp.frequency.value = 1100;
            const env = ctx.createGain();
            const t = ctx.currentTime + offset;
            env.gain.setValueAtTime(0.35, t);
            env.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
            src.connect(bp).connect(env).connect(out);
            src.stop(t + 0.07);
          }
          timer = (window.setTimeout(clack, 900));
        };
        timer = (window.setTimeout(clack, 300));
        break;
      }
    }

    return {
      out,
      stop: () => {
        window.clearTimeout(timer);
        stops.forEach((fn) => {
          try {
            fn();
          } catch {
            // Already stopped.
          }
        });
        out.disconnect();
      },
    };
  }
}

let engine: WorldAudio | null = null;

/** The one engine for this visit. Null on the server. */
export function worldAudio(): WorldAudio | null {
  if (typeof window === 'undefined') return null;
  if (!engine) engine = new WorldAudio();
  return engine;
}
