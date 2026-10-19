// ============================================================
// 配乐合成器：零素材，全部用 WebAudio 现场合成
//  · 曲子写成「和弦 + 旋律字符串 + 伴奏样式 + 鼓点」，编译成按十六分音符排好的事件表
//  · 乐器：方波 / 三角波（第一章的 8bit 声音），钟琴、拨弦、长音垫、电钢、长笛、八音盒（第二章与演出）
//  · 同一套代码既给游戏实时播放，也能放进 OfflineAudioContext 离线渲染（开发时检查用）
// ============================================================

export type InstId =
  | 'pulse' | 'square' | 'tri' | 'chipArp'
  | 'bell' | 'pluck' | 'pad' | 'epiano' | 'piano' | 'flute' | 'saw' | 'musicbox' | 'sub' | 'softbass';
export type DrumId = 'kick' | 'kick2' | 'snare' | 'rim' | 'hat' | 'ohat' | 'clap' | 'shaker' | 'crackle';
export type BassStyle = 'long' | 'half' | 'root8' | 'octave' | 'rootFifth' | 'synco';
export type ArpStyle = 'up16' | 'updown8' | 'broken8' | 'off8' | 'up8';

export interface Part { inst: InstId; vol?: number; oct?: number; from?: number; until?: number }
export interface TrackDef {
  id: string;
  title: string;
  bpm: number;
  /** 0~0.5：每拍第二个八分音符往后推多少 */
  swing?: number;
  /** 每小节一组和弦，空格分开表示一小节里平分 */
  chords: string[];
  lead?: Part & { bars: string[] };
  lead2?: Part & { bars: string[] };
  bass?: Part & { style: BassStyle };
  arp?: Part & { style: ArpStyle };
  pad?: Part;
  drums?: { from?: number; vol?: number; fill?: Partial<Record<DrumId, string>> } & Partial<Record<DrumId, string>>;
  /** 混响量 0~1 */
  space?: number;
}

// ---------------- 乐理小工具 ----------------
const PC: Record<string, number> = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
const QUAL: Record<string, number[]> = {
  '': [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11],
  m9: [0, 3, 7, 10, 14], maj9: [0, 4, 7, 11, 14], add9: [0, 4, 7, 14], '9': [0, 4, 7, 10, 14],
  sus2: [0, 2, 7], sus4: [0, 5, 7], '7sus4': [0, 5, 7, 10], '6': [0, 4, 7, 9], m6: [0, 3, 7, 9],
  dim: [0, 3, 6], m7b5: [0, 3, 6, 10],
};
const pcOf = (s: string) => {
  const m = /^([A-Ga-g])(#|b)?/.exec(s)!;
  return (PC[m[1].toLowerCase()] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12) % 12;
};
export interface Chord { root: number; bass: number; iv: number[] }
export const parseChord = (s: string): Chord => {
  const [main, slash] = s.split('/');
  const m = /^([A-G][#b]?)(.*)$/.exec(main);
  if (!m) throw new Error('bad chord ' + s);
  const root = pcOf(m[1]);
  const iv = QUAL[m[2]];
  if (!iv) throw new Error('bad chord quality ' + s);
  return { root, bass: slash ? pcOf(slash) : root, iv };
};
export const noteMidi = (s: string) => {
  const m = /^([a-g])(#|b)?(\d)$/.exec(s);
  if (!m) throw new Error('bad note ' + s);
  return 12 * (parseInt(m[3], 10) + 1) + PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
};
const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

// ---------------- 编译 ----------------
export type PartId = 'lead' | 'lead2' | 'bass' | 'arp' | 'pad' | 'drum';
export interface Ev { kind: 'note' | 'drum'; inst: InstId | DrumId; midi: number; dur: number; vel: number; part?: PartId }
export interface Compiled { def: TrackDef; bars: number; steps: Ev[][] }

export const compile = (def: TrackDef): Compiled => {
  const bars = def.chords.length;
  const steps: Ev[][] = Array.from({ length: bars * 16 }, () => []);
  const at = (step: number, e: Ev) => steps[((step % steps.length) + steps.length) % steps.length].push(e);
  const inRange = (p: Part, bar: number) => bar >= (p.from ?? 0) && bar < (p.until ?? Infinity);

  // 和弦切分
  const segs: { start: number; len: number; ch: Chord }[] = [];
  def.chords.forEach((bar, b) => {
    const cs = bar.trim().split(/\s+/);
    const len = 16 / cs.length;
    cs.forEach((c, i) => segs.push({ start: b * 16 + i * len, len, ch: parseChord(c) }));
  });

  // 旋律
  const melody = (p: Part & { bars: string[] }, part: PartId) => {
    let step = 0;
    let last: Ev | null = null;
    p.bars.forEach((bar, b) => {
      const toks = bar.trim().split(/\s+/);
      for (const tk of toks) {
        const subs = tk.split(',');
        const each = 2 / subs.length;
        for (const sub of subs) {
          if (sub === '-') { if (last) last.dur += each; }
          else if (sub === '.') last = null;
          else if (inRange(p, b)) {
            last = { kind: 'note', inst: p.inst, midi: noteMidi(sub) + 12 * (p.oct ?? 0), dur: each, vel: p.vol ?? 0.5, part };
            at(Math.round(step), last);
          } else last = null;
          step += each;
        }
      }
      step = (b + 1) * 16; // 每小节对齐
    });
  };
  if (def.lead) melody(def.lead, 'lead');
  if (def.lead2) melody(def.lead2, 'lead2');

  // 低音
  if (def.bass) {
    const p = def.bass;
    const base = 36 + 12 * (p.oct ?? 0); // C2
    for (const s of segs) {
      const bar = Math.floor(s.start / 16);
      if (!inRange(p, bar)) continue;
      const r = base + ((s.ch.bass - 0 + 12) % 12);
      const fifth = base + ((s.ch.root + 7) % 12);
      const v = p.vol ?? 0.5;
      const n = (st: number, m: number, d: number, vv = v) => at(s.start + st, { kind: 'note', inst: p.inst, midi: m, dur: d, vel: vv, part: 'bass' });
      switch (p.style) {
        case 'long': n(0, r, s.len - 0.2); break;
        case 'half': for (let i = 0; i < s.len; i += 8) n(i, r, Math.min(8, s.len - i) - 0.4); break;
        case 'root8': for (let i = 0; i < s.len; i += 2) n(i, r, 1.6, i % 4 ? v * 0.75 : v); break;
        case 'octave': for (let i = 0; i < s.len; i += 2) n(i, i % 4 ? r + 12 : r, 1.5, i % 4 ? v * 0.7 : v); break;
        case 'rootFifth': for (let i = 0; i < s.len; i += 4) n(i, (i / 4) % 2 ? (fifth < r ? fifth + 12 : fifth) : r, 3.4); break;
        case 'synco': for (const i of [0, 3, 6, 8, 11, 14]) if (i < s.len) n(i, i === 14 ? r + 12 : r, i === 6 ? 2 : 2.6, i === 0 || i === 8 ? v : v * 0.7); break;
      }
    }
  }

  // 和弦音：在 lo~lo+14 之间排开
  const voice = (ch: Chord, lo: number) => {
    const out = ch.iv.map(iv => { let m = lo + ((ch.root + iv) % 12 - lo % 12 + 24) % 12; if (iv >= 12) m += 12; return m; });
    return Array.from(new Set(out)).sort((a, b) => a - b);
  };

  if (def.pad) {
    const p = def.pad;
    for (const s of segs) {
      const bar = Math.floor(s.start / 16);
      if (!inRange(p, bar)) continue;
      for (const m of voice(s.ch, 55 + 12 * (p.oct ?? 0))) at(s.start, { kind: 'note', inst: p.inst, midi: m, dur: s.len - 0.1, vel: (p.vol ?? 0.3), part: 'pad' });
    }
  }

  if (def.arp) {
    const p = def.arp;
    for (const s of segs) {
      const bar = Math.floor(s.start / 16);
      if (!inRange(p, bar)) continue;
      const lo = 57 + 12 * (p.oct ?? 0);
      const tones = voice(s.ch, lo);
      const two = [...tones, ...tones.map(t => t + 12)];
      const v = p.vol ?? 0.3;
      const n = (st: number, m: number, d: number, vv = v) => at(s.start + st, { kind: 'note', inst: p.inst, midi: m, dur: d, vel: vv, part: 'arp' });
      switch (p.style) {
        case 'up16': for (let i = 0; i < s.len; i++) n(i, two[i % two.length], 0.9, i % 4 ? v * 0.7 : v); break;
        case 'up8': for (let i = 0; i < s.len; i += 2) n(i, two[(i / 2) % two.length], 1.8); break;
        case 'updown8': {
          const ud = [...two, ...two.slice(1, -1).reverse()];
          for (let i = 0; i < s.len; i += 2) n(i, ud[(i / 2) % ud.length], 1.8);
          break;
        }
        case 'broken8': {
          const r = tones[0] - 12, f = tones[Math.min(2, tones.length - 1)] - 12;
          const pat = [r, f, tones[1] ?? tones[0], f, tones[0] + 12, f, tones[1] ?? tones[0], f];
          for (let i = 0; i < s.len; i += 2) n(i, pat[(i / 2) % pat.length], 1.9, i === 0 ? v : v * 0.75);
          break;
        }
        case 'off8': for (let i = 2; i < s.len; i += 4) for (const t of tones) n(i, t, 0.9, v * 0.8); break;
      }
    }
  }

  if (def.drums) {
    const d = def.drums;
    const kinds: DrumId[] = ['kick', 'kick2', 'snare', 'rim', 'hat', 'ohat', 'clap', 'shaker', 'crackle'];
    for (let b = d.from ?? 0; b < bars; b++) {
      const fillBar = (b + 1) % 8 === 0;
      for (const k of kinds) {
        const pat = (fillBar && d.fill?.[k]) || d[k];
        if (!pat) continue;
        for (let i = 0; i < 16; i++) {
          const ch = pat[i];
          if (ch === 'x' || ch === 'o') at(b * 16 + i, { kind: 'drum', inst: k, midi: 0, dur: 1, vel: (ch === 'x' ? 1 : 0.5) * (d.vol ?? 0.6), part: 'drum' });
        }
      }
    }
  }
  return { def, bars, steps };
};

// ---------------- 发声 ----------------
export interface Outs { dry: AudioNode; verb: AudioNode; delay: AudioNode }

const waveCache = new WeakMap<BaseAudioContext, Record<string, PeriodicWave | AudioBuffer>>();
const cacheFor = (c: BaseAudioContext) => { let w = waveCache.get(c); if (!w) { w = {}; waveCache.set(c, w); } return w; };
const pulseWave = (c: BaseAudioContext, duty: number) => {
  const k = 'p' + duty; const cc = cacheFor(c);
  if (!cc[k]) {
    const N = 48; const re = new Float32Array(N), im = new Float32Array(N);
    for (let n = 1; n < N; n++) im[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * duty);
    cc[k] = c.createPeriodicWave(re, im);
  }
  return cc[k] as PeriodicWave;
};
const noiseBuf = (c: BaseAudioContext) => {
  const cc = cacheFor(c);
  if (!cc.noise) {
    const len = c.sampleRate; const b = c.createBuffer(1, len, c.sampleRate); const d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    cc.noise = b;
  }
  return cc.noise as AudioBuffer;
};
/** 混响的冲激响应：带一点早期反射的衰减噪声 */
export const makeImpulse = (c: BaseAudioContext, seconds = 2.4, decay = 2.6) => {
  const len = Math.floor(c.sampleRate * seconds);
  const b = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay) * (i < 400 ? i / 400 : 1);
  }
  return b;
};

type Env = { a: number; d: number; s: number; r: number };
const envGain = (c: BaseAudioContext, t: number, dur: number, peak: number, e: Env) => {
  const g = c.createGain();
  const gg = g.gain;
  gg.setValueAtTime(0.0001, t);
  gg.linearRampToValueAtTime(peak, t + e.a);
  gg.setTargetAtTime(peak * e.s, t + e.a, Math.max(0.01, e.d / 3));
  const end = t + Math.max(dur, e.a + 0.01);
  gg.setTargetAtTime(0.0001, end, Math.max(0.01, e.r / 4));
  return { g, stop: end + e.r * 2.2 + 0.05 };
};
// 混响 / 延迟的发送量：同一首曲子里同样的量共用一个增益节点，不再每个音符新建两个
const sendCache = new WeakMap<AudioNode, Map<number, GainNode>>();
const sendNode = (dest: AudioNode, amount: number) => {
  let m = sendCache.get(dest);
  if (!m) { m = new Map(); sendCache.set(dest, m); }
  const k = Math.round(amount * 100);
  let g = m.get(k);
  if (!g) { g = dest.context.createGain(); g.gain.value = k / 100; g.connect(dest); m.set(k, g); }
  return g;
};
const send = (src: AudioNode, o: Outs, verb: number, delay: number) => {
  src.connect(o.dry);
  if (verb > 0.005) src.connect(sendNode(o.verb, verb));
  if (delay > 0.005) src.connect(sendNode(o.delay, delay));
};
const osc = (c: BaseAudioContext, type: OscillatorType | PeriodicWave, f: number, t: number, stop: number, detune = 0) => {
  const o = c.createOscillator();
  if (typeof type === 'string') o.type = type as OscillatorType; else o.setPeriodicWave(type as PeriodicWave);
  o.frequency.setValueAtTime(f, t);
  o.detune.value = detune;
  o.start(t); o.stop(stop);
  return o;
};

/** 演奏一个音符。dur、t 单位是秒 */
export const playNote = (c: BaseAudioContext, o: Outs, inst: InstId, midi: number, t: number, dur: number, vel: number, space: number) => {
  const f = mtof(midi);
  const V = vel * 0.32;
  switch (inst) {
    case 'pulse': case 'square': case 'chipArp': {
      const duty = inst === 'pulse' ? 0.25 : inst === 'square' ? 0.5 : 0.125;
      const short = inst === 'chipArp';
      const { g, stop } = envGain(c, t, short ? Math.min(dur, 0.09) : dur, V * (short ? 0.6 : 0.75), { a: 0.004, d: 0.1, s: short ? 0.4 : 0.6, r: short ? 0.03 : 0.07 });
      const ov = osc(c, pulseWave(c, duty), f, t, stop);
      if (inst === 'pulse' && dur > 0.32) { // 长音加一点颤音
        const l = c.createOscillator(); const lg = c.createGain();
        l.frequency.value = 5.6; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(18, t + 0.3);
        l.connect(lg); lg.connect(ov.detune); l.start(t); l.stop(stop);
      }
      ov.connect(g); send(g, o, 0.12 * space, inst === 'pulse' ? 0.16 : 0);
      break;
    }
    case 'tri': {
      const { g, stop } = envGain(c, t, dur, V * 1.15, { a: 0.003, d: 0.05, s: 0.9, r: 0.04 });
      osc(c, 'triangle', f, t, stop).connect(g); send(g, o, 0, 0);
      break;
    }
    case 'bell': case 'musicbox': {
      const len = inst === 'bell' ? 1.6 : 1.0;
      const { g, stop } = envGain(c, t, 0.02, V * (inst === 'bell' ? 0.7 : 0.55), { a: 0.002, d: len, s: 0.0001, r: len });
      const car = osc(c, 'sine', f, t, stop);
      const mod = osc(c, 'sine', f * (inst === 'bell' ? 3.5 : 4), t, stop);
      const mg = c.createGain();
      mg.gain.setValueAtTime(f * (inst === 'bell' ? 1.6 : 0.9), t);
      mg.gain.exponentialRampToValueAtTime(f * 0.05, t + 0.4);
      mod.connect(mg); mg.connect(car.frequency);
      car.connect(g); send(g, o, 0.38 * space, 0.14);
      break;
    }
    case 'pluck': {
      const { g, stop } = envGain(c, t, Math.min(dur, 0.25), V * 0.6, { a: 0.003, d: 0.3, s: 0.25, r: 0.25 });
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 2;
      lp.frequency.setValueAtTime(Math.min(9000, f * 8), t);
      lp.frequency.exponentialRampToValueAtTime(Math.max(300, f * 1.5), t + 0.3);
      osc(c, 'sawtooth', f, t, stop, -4).connect(lp);
      osc(c, 'sawtooth', f, t, stop, 5).connect(lp);
      lp.connect(g); send(g, o, 0.3 * space, 0.22);
      break;
    }
    case 'pad': {
      const { g, stop } = envGain(c, t, dur, V * 0.32, { a: 0.6, d: 0.6, s: 0.85, r: 1.1 });
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1500; lp.Q.value = 0.4;
      osc(c, 'sawtooth', f, t, stop, -9).connect(lp);
      osc(c, 'sawtooth', f, t, stop, 8).connect(lp);
      lp.connect(g); send(g, o, 0.55 * space, 0);
      break;
    }
    case 'epiano': {
      const { g, stop } = envGain(c, t, dur, V * 0.75, { a: 0.004, d: 0.9, s: 0.35, r: 0.35 });
      osc(c, 'sine', f, t, stop).connect(g);
      const h = c.createGain(); h.gain.setValueAtTime(0.35, t); h.gain.exponentialRampToValueAtTime(0.02, t + 0.5);
      osc(c, 'sine', f * 2, t, stop).connect(h); h.connect(g);
      send(g, o, 0.25 * space, 0.08);
      break;
    }
    case 'piano': {
      const { g, stop } = envGain(c, t, dur, V * 0.7, { a: 0.003, d: 1.4, s: 0.15, r: 0.5 });
      osc(c, 'triangle', f, t, stop).connect(g);
      const h = c.createGain(); h.gain.setValueAtTime(0.3, t); h.gain.exponentialRampToValueAtTime(0.01, t + 0.35);
      osc(c, 'sine', f * 2, t, stop).connect(h); h.connect(g);
      const h3 = c.createGain(); h3.gain.setValueAtTime(0.12, t); h3.gain.exponentialRampToValueAtTime(0.005, t + 0.2);
      osc(c, 'sine', f * 3, t, stop).connect(h3); h3.connect(g);
      send(g, o, 0.35 * space, 0.05);
      break;
    }
    case 'flute': {
      const { g, stop } = envGain(c, t, dur, V * 0.7, { a: 0.07, d: 0.2, s: 0.85, r: 0.18 });
      const o1 = osc(c, 'sine', f, t, stop);
      const o2 = osc(c, 'triangle', f, t, stop);
      const l = c.createOscillator(); const lg = c.createGain();
      l.frequency.value = 5; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(14, t + 0.35);
      l.connect(lg); lg.connect(o1.detune); lg.connect(o2.detune); l.start(t); l.stop(stop);
      const g2 = c.createGain(); g2.gain.value = 0.3; o2.connect(g2); g2.connect(g); o1.connect(g);
      send(g, o, 0.35 * space, 0.15);
      break;
    }
    case 'saw': {
      const { g, stop } = envGain(c, t, dur, V * 0.42, { a: 0.02, d: 0.3, s: 0.75, r: 0.25 });
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600; lp.Q.value = 0.7;
      osc(c, 'sawtooth', f, t, stop, -7).connect(lp);
      osc(c, 'sawtooth', f, t, stop, 7).connect(lp);
      const l = c.createOscillator(); const lg = c.createGain();
      l.frequency.value = 5.2; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(dur > 0.4 ? 12 : 0, t + 0.4);
      l.connect(lg); l.start(t); l.stop(stop);
      lp.connect(g); send(g, o, 0.35 * space, 0.22);
      break;
    }
    case 'sub': {
      const { g, stop } = envGain(c, t, dur, V * 1.1, { a: 0.01, d: 0.2, s: 0.85, r: 0.12 });
      osc(c, 'sine', f, t, stop).connect(g);
      const h = c.createGain(); h.gain.value = 0.15; osc(c, 'triangle', f * 2, t, stop).connect(h); h.connect(g);
      send(g, o, 0, 0);
      break;
    }
    case 'softbass': {
      const { g, stop } = envGain(c, t, dur, V * 1.05, { a: 0.008, d: 0.25, s: 0.7, r: 0.1 });
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700;
      osc(c, 'triangle', f, t, stop).connect(lp);
      osc(c, 'sine', f, t, stop).connect(lp);
      lp.connect(g); send(g, o, 0.05 * space, 0);
      break;
    }
  }
};

export const playDrum = (c: BaseAudioContext, o: Outs, kind: DrumId, t: number, vel: number, chip: boolean, space: number) => {
  const V = vel * 0.5;
  const nz = (dur: number, type: BiquadFilterType, freq: number, q: number, gain: number, at = t) => {
    const s = c.createBufferSource(); s.buffer = noiseBuf(c);
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(gain, at); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    s.connect(f); f.connect(g);
    s.start(at, Math.random() * 0.5); s.stop(at + dur + 0.02);
    return g;
  };
  switch (kind) {
    case 'kick': case 'kick2': {
      const soft = kind === 'kick2';
      const g = c.createGain();
      g.gain.setValueAtTime(V * (soft ? 1.0 : 1.3), t); g.gain.exponentialRampToValueAtTime(0.0001, t + (soft ? 0.32 : 0.22));
      const ok = osc(c, chip && !soft ? 'triangle' : 'sine', soft ? 120 : 160, t, t + 0.35);
      ok.frequency.exponentialRampToValueAtTime(soft ? 42 : 48, t + (soft ? 0.18 : 0.12));
      ok.connect(g); send(g, o, 0, 0);
      if (!soft) send(nz(0.02, 'lowpass', 3000, 0.5, V * 0.3), o, 0, 0);
      break;
    }
    case 'snare': {
      send(nz(chip ? 0.12 : 0.18, 'bandpass', chip ? 2200 : 1800, 0.7, V * 0.9), o, 0.15 * space, 0);
      const g = c.createGain(); g.gain.setValueAtTime(V * 0.5, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
      const s = osc(c, 'triangle', 200, t, t + 0.12); s.frequency.exponentialRampToValueAtTime(140, t + 0.08);
      s.connect(g); send(g, o, 0, 0);
      break;
    }
    case 'rim': send(nz(0.05, 'bandpass', 3200, 2.5, V * 0.8), o, 0.2 * space, 0); break;
    case 'hat': send(nz(chip ? 0.03 : 0.04, 'highpass', 8000, 0.6, V * 0.32), o, 0.05 * space, 0); break;
    case 'ohat': send(nz(0.16, 'highpass', 7000, 0.6, V * 0.25), o, 0.08 * space, 0); break;
    case 'shaker': send(nz(0.06, 'highpass', 6000, 0.8, V * 0.16), o, 0.1 * space, 0); break;
    case 'clap': for (let i = 0; i < 3; i++) send(nz(i === 2 ? 0.14 : 0.02, 'bandpass', 1300, 1.2, V * 0.7, t + i * 0.011), o, 0.2 * space, 0); break;
    case 'crackle': for (let i = 0; i < 3; i++) send(nz(0.004, 'highpass', 2500, 0.5, V * (0.1 + Math.random() * 0.25), t + Math.random() * 0.12), o, 0, 0); break;
  }
};

/** 风格：第一章用 8bit 鼓 */
export const isChip = (def: TrackDef) => !!def.lead && ['pulse', 'square', 'tri'].includes(def.lead.inst);

/** 循环变奏：每 4 遍里的第 3 遍去掉主旋律（让伴奏喘口气），曲子不会显得太短 */
export const skipOnLoop = (loop: number, e: Ev, bars: number) => {
  const cyc = loop % 4;
  if (cyc === 2 && (e.part === 'lead' || e.part === 'lead2')) return true;
  // 短曲（8 小节）在第 3 遍的前半段把鼓也停掉
  if (cyc === 2 && bars <= 8 && e.part === 'drum') return true;
  return false;
};
