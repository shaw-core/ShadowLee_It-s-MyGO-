// ============================================================
// 《快醒醒！》的背景声（全部用 WebAudio 现场合成，不用任何录音素材）
//  方向（Kan）：像电视头小豆结尾那段演出的氛围，但不要「代码 / 终端」的声音——
//  是半梦半醒之间，听到有人在喊自己。所以：没有打字声、没有数据蜂鸣；
//  底下是和终端结尾同一种低低的失谐长音，上面是梦一样的长音和呼吸；
//  呼唤声隔着一层「睡意」，一开始闷得听不清，越往后越清楚。
//  · 梦境底：慢慢换和弦的柔和长音（轻微走音的「磁带晃动」）+ 高处若有若无的闪光音 + 一层呼吸般的空气声，
//    全部泡在很长、很暗的混响里，再整体压一层低通——像隔着水、隔着睡意听到的声音
//  · 电子呼唤：「？？？」每说一句，远处就有一串像被调制过的人声在喊——
//    锯齿/三角波声源 + 元音共振峰滤波 + 轻微降位数 + 「睡意」低通 + 远近两条回声 + 长混响。
//    只是「有人在喊自己」的声音质感，不是配音，听不出具体字词
// ============================================================

type Vowel = 'a' | 'e' | 'i' | 'o' | 'u';
const FORMANTS: Record<Vowel, [number, number, number]> = {
  a: [800, 1150, 2900], e: [420, 1650, 2700], i: [300, 2250, 3000], o: [470, 820, 2830], u: [330, 720, 2530],
};
// 台词里出现的字 → 大致的元音（只用来让「喊声」的音色有起伏）
const VOWEL_OF: Record<string, Vowel> = {
  快: 'a', 醒: 'i', 豆: 'o', 沙: 'a', 你: 'i', 不: 'u', 会: 'e', 睡: 'e', 过: 'o', 去: 'u', 了: 'e', 吧: 'a',
  喂: 'e', 小: 'a', 李: 'i', 终: 'o', 于: 'u', 有: 'o', 反: 'a', 应: 'i',
};

const impulse = (c: BaseAudioContext, sec: number, decay: number) => {
  const len = Math.floor(c.sampleRate * sec);
  const b = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      // 暗一点的尾巴：一阶低通过的噪声
      lp = lp * 0.82 + (Math.random() * 2 - 1) * 0.18;
      d[i] = lp * Math.pow(1 - i / len, decay) * 2.2;
    }
  }
  return b;
};
const crushCurve = (bits: number) => {
  const n = 2048, c = new Float32Array(n), q = Math.pow(2, bits - 1);
  for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = Math.round(x * q) / q; }
  return c;
};

const CHORDS: number[][] = [
  [146.83, 220.0, 277.18, 329.63],   // D  A  C# E
  [123.47, 185.0, 220.0, 293.66],    // B  F# A  D
  [98.0, 146.83, 185.0, 246.94],     // G  D  F# B
  [110.0, 164.81, 220.0, 277.18],    // A  E  A  C#
];

export class WakeupSound {
  readonly ctx: BaseAudioContext;
  readonly out: GainNode;
  private vol: number;
  private dream: GainNode;     // 梦境底的总音量（跟着画面起伏）
  private dreamLP: BiquadFilterNode;
  private verb: ConvolverNode;
  private voiceBus: GainNode;
  private voiceLP: BiquadFilterNode;   // 隔着睡意的那层「棉花」：越到后面开得越大
  private verbSend: GainNode;
  private nodes: AudioScheduledSourceNode[] = [];
  private timers: ReturnType<typeof setInterval>[] = [];
  private chordIdx = 0;
  private started = false;
  calls = 0;

  constructor(ctx: BaseAudioContext, out: GainNode, vol: number) {
    this.ctx = ctx; this.out = out; this.vol = vol;
    const c = ctx;
    this.verb = c.createConvolver(); this.verb.buffer = impulse(c, 5.5, 2.4);
    const verbOut = c.createGain(); verbOut.gain.value = 0.9;
    this.verb.connect(verbOut); verbOut.connect(out);
    this.dreamLP = c.createBiquadFilter(); this.dreamLP.type = 'lowpass'; this.dreamLP.frequency.value = 1600; this.dreamLP.Q.value = 0.4;
    this.dream = c.createGain(); this.dream.gain.value = 0.0001;
    const dreamHP = c.createBiquadFilter(); dreamHP.type = 'highpass'; dreamHP.frequency.value = 85; dreamHP.Q.value = 0.5;
    this.dreamLP.connect(dreamHP); dreamHP.connect(this.dream);
    const dry = c.createGain(); dry.gain.value = 0.35; this.dream.connect(dry); dry.connect(out);
    const wet = c.createGain(); wet.gain.value = 0.9; this.dream.connect(wet); wet.connect(this.verb);
    this.voiceBus = c.createGain(); this.voiceBus.gain.value = 0.36 * vol;
    // 呼唤声：先过一层「睡意」低通（一开始很闷），再一点点干声、很多回声和混响——像从很远的地方、隔着梦传过来
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 220;
    this.voiceLP = c.createBiquadFilter(); this.voiceLP.type = 'lowpass'; this.voiceLP.frequency.value = 850; this.voiceLP.Q.value = 0.5;
    this.voiceBus.connect(hp); hp.connect(this.voiceLP);
    const lp = this.voiceLP;
    const vDry = c.createGain(); vDry.gain.value = 0.38; lp.connect(vDry); vDry.connect(out);
    // 两条回声：近的一条、远的一条（更闷），喊声在梦里来回荡
    for (const [time, fbk, cut, lvl] of [[0.34, 0.36, 1500, 0.4], [0.86, 0.42, 900, 0.32]] as const) {
      const dl = c.createDelay(2); dl.delayTime.value = time;
      const fb = c.createGain(); fb.gain.value = fbk;
      const dlf = c.createBiquadFilter(); dlf.type = 'lowpass'; dlf.frequency.value = cut;
      lp.connect(dl); dl.connect(dlf); dlf.connect(fb); fb.connect(dl);
      const o = c.createGain(); o.gain.value = lvl; dlf.connect(o); o.connect(out);
    }
    this.verbSend = c.createGain(); this.verbSend.gain.value = 1.0; lp.connect(this.verbSend); this.verbSend.connect(this.verb);
  }

  // ---------------- 梦境底 ----------------
  /** offlineUntil：离线渲染（试听样本）时，把和弦一次排到这个时间为止，不用计时器 */
  startDream(offlineUntil?: number) {
    if (this.started) return;
    this.started = true;
    const c = this.ctx;
    if (offlineUntil !== undefined) { for (let t = c.currentTime; t < offlineUntil; t += 8) this.playChord(4.0, t); }
    else { this.playChord(4.0); this.timers.push(setInterval(() => this.playChord(4.0), 8000)); }
    // 和电视头小豆结尾那段一样的底：两支略微失谐的低锯齿波，低通缓慢扫动（只是更轻、更远）
    {
      const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 220; f.Q.value = 4;
      const g = c.createGain(); g.gain.value = 0.0001; g.gain.setTargetAtTime(0.05, c.currentTime, 2.5);
      const o1 = c.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = 54;
      const o2 = c.createOscillator(); o2.type = 'sawtooth'; o2.frequency.value = 54.7;
      const lfo = c.createOscillator(); lfo.frequency.value = 0.11; const lg = c.createGain(); lg.gain.value = 120;
      lfo.connect(lg); lg.connect(f.frequency);
      o1.connect(f); o2.connect(f); f.connect(g); g.connect(this.dreamLP);
      o1.start(); o2.start(); lfo.start(); this.nodes.push(o1, o2, lfo);
    }
    // 一个很高、很细、时有时无的耳鸣似的音——刚醒时耳朵里的那种
    {
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = 2637;
      const g = c.createGain(); g.gain.value = 0;
      const lfo = c.createOscillator(); lfo.frequency.value = 0.07; const lg = c.createGain(); lg.gain.value = 0.008;
      lfo.connect(lg); lg.connect(g.gain);
      o.connect(g); g.connect(this.dream); o.start(); lfo.start(); this.nodes.push(o, lfo);
    }
    // 空气声：粉噪声，慢慢呼吸
    const len = c.sampleRate * 4; const buf = c.createBuffer(1, len, c.sampleRate); const d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; b0 = 0.997 * b0 + w * 0.029; b1 = 0.985 * b1 + w * 0.032; b2 = 0.95 * b2 + w * 0.048; d[i] = (b0 + b1 + b2) * 0.6; }
    const n = c.createBufferSource(); n.buffer = buf; n.loop = true;
    const nf = c.createBiquadFilter(); nf.type = 'lowpass'; nf.frequency.value = 900;
    const ng = c.createGain(); ng.gain.value = 0.06;
    const lfo = c.createOscillator(); lfo.frequency.value = 0.11; const lg = c.createGain(); lg.gain.value = 0.04;
    lfo.connect(lg); lg.connect(ng.gain);
    n.connect(nf); nf.connect(ng); ng.connect(this.dreamLP);
    n.start(); lfo.start(); this.nodes.push(n, lfo);
    // 低通慢慢开合：时而清楚时而模糊
    const flfo = c.createOscillator(); flfo.frequency.value = 0.045; const fg = c.createGain(); fg.gain.value = 650;
    flfo.connect(fg); fg.connect(this.dreamLP.frequency); flfo.start(); this.nodes.push(flfo);
  }

  private playChord(fade: number, when?: number) {
    const c = this.ctx, now = when ?? c.currentTime;
    const notes = CHORDS[this.chordIdx++ % CHORDS.length];
    const dur = 8 + fade;
    const wob = c.createOscillator(); wob.frequency.value = 0.27 + Math.random() * 0.1;
    const wg = c.createGain(); wg.gain.value = 9;   // ±9 音分的磁带晃动
    wob.connect(wg); wob.start(now); wob.stop(now + dur + 0.1); this.nodes.push(wob);
    notes.forEach((f, i) => {
      for (const [type, det, amp] of [['triangle', -6, 0.07], ['sawtooth', 7, 0.018]] as const) {
        const o = c.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = det + (Math.random() - 0.5) * 4;
        wg.connect(o.detune);
        const g = c.createGain(); g.gain.setValueAtTime(0.0001, now);
        g.gain.exponentialRampToValueAtTime(amp, now + fade);
        g.gain.setValueAtTime(amp, now + dur - fade);
        g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
        o.connect(g); g.connect(this.dreamLP);
        o.start(now); o.stop(now + dur + 0.05); this.nodes.push(o);
      }
      // 高处的闪光音：两个八度上方，带一点颤音
      if (i % 2 === 1) {
        const s = c.createOscillator(); s.type = 'sine'; s.frequency.value = f * 4;
        const tg = c.createGain(); tg.gain.value = 0;
        const trem = c.createOscillator(); trem.frequency.value = 3.1 + i; const tremG = c.createGain(); tremG.gain.value = 0.006;
        trem.connect(tremG); tremG.connect(tg.gain);
        tg.gain.setValueAtTime(0, now); tg.gain.linearRampToValueAtTime(0.02, now + fade + 1); tg.gain.linearRampToValueAtTime(0, now + dur);
        s.connect(tg); tg.connect(this.dream);   // 跟着梦境底一起起落
        s.start(now); trem.start(now); s.stop(now + dur); trem.stop(now + dur); this.nodes.push(s, trem);
      }
    });
    if (this.nodes.length > 400) this.nodes = this.nodes.slice(-200);
  }

  /** 梦境底的音量（0~1.3），每帧可以调；内部平滑 */
  setDream(k: number, when?: number) {
    const t = when ?? this.ctx.currentTime;
    this.dream.gain.setTargetAtTime(Math.max(0.0001, k * 0.85 * this.vol), t, 0.4);
  }

  // ---------------- 电子呼唤 ----------------
  /** 按一句台词的字数和标点，在远处「喊」一串电子音 */
  call(text: string, when?: number) {
    const c = this.ctx;
    const now = when ?? c.currentTime;
    let at = now + 0.12;
    const shout = text.includes('！');
    // 一次比一次清楚：第一声几乎闷在被子里，认出来的时候已经能听出是在喊
    const clarity = Math.min(1, this.calls / 4);
    this.voiceLP.frequency.setTargetAtTime(850 + clarity * 1700, now, 0.3);
    this.verbSend.gain.setTargetAtTime(1.0 - clarity * 0.35, now, 0.3);
    // 开口前一口很轻的「吸气」：倒放似的气声慢慢涌上来
    this.swell(at - 0.35);
    const chars = Array.from(text);
    let syl = 0;
    const total = chars.filter(ch => VOWEL_OF[ch] || /[一-龥]/.test(ch)).length;
    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i];
      if (ch === '…') { at += 0.09; continue; }
      if (ch === '，' || ch === '。') { at += 0.16; continue; }
      if (ch === '！' || ch === '？' || ch === '—') { at += 0.12; continue; }
      if (!/[一-龥a-z]/i.test(ch)) continue;
      const last = syl === total - 1 || chars[i + 1] === '！' || chars[i + 1] === '，';
      const len = last ? (shout ? 0.46 : 0.34) : 0.17;
      this.syllable(at, len, VOWEL_OF[ch] ?? 'a', shout, syl, total, last);
      at += len + 0.035;
      syl++;
    }
    this.calls++;
  }

  private swell(at: number) {
    const c = this.ctx;
    const len = Math.floor(c.sampleRate * 0.45); const b = c.createBuffer(1, len, c.sampleRate); const d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1);
    const n = c.createBufferSource(); n.buffer = b;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(600, Math.max(0, at)); f.frequency.exponentialRampToValueAtTime(1800, at + 0.4); f.Q.value = 1.2;
    const soft = c.createBiquadFilter(); soft.type = 'lowpass'; soft.frequency.value = 2600;
    const st = Math.max(0, at);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, st); g.gain.exponentialRampToValueAtTime(0.05, at + 0.38); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.45);
    n.connect(f); f.connect(soft); soft.connect(g); g.connect(this.verb); n.start(st); this.nodes.push(n);
  }

  private syllable(at: number, len: number, v: Vowel, shout: boolean, idx: number, total: number, last: boolean) {
    const c = this.ctx;
    // 音高：喊的时候更高，一句话里往上走，最后一个字拖一下再往上挑
    const base = shout ? 392 : 330;
    const f0 = base * Math.pow(2, (idx / Math.max(1, total)) * (shout ? 3 : 1.5) / 12);
    const src = c.createGain(); src.gain.value = 1;
    const mk = (type: OscillatorType, mul: number, amp: number) => {
      const o = c.createOscillator(); o.type = type;
      o.frequency.setValueAtTime(f0 * mul * 0.94, at);
      o.frequency.exponentialRampToValueAtTime(f0 * mul, at + 0.05);
      if (last) o.frequency.exponentialRampToValueAtTime(f0 * mul * (shout ? 1.12 : 0.92), at + len);
      // 电子化的颤音
      const vib = c.createOscillator(); vib.frequency.value = 6.5; const vg = c.createGain(); vg.gain.value = f0 * mul * 0.012;
      vib.connect(vg); vg.connect(o.frequency); vib.start(at); vib.stop(at + len + 0.05);
      const g = c.createGain(); g.gain.value = amp; o.connect(g); g.connect(src);
      o.start(at); o.stop(at + len + 0.05); this.nodes.push(o, vib);
    };
    mk('sawtooth', 1, 0.45); mk('triangle', 1, 0.5); mk('sawtooth', 1.006, 0.22);
    // 元音共振峰
    const env = c.createGain();
    env.gain.setValueAtTime(0.0001, at);
    env.gain.exponentialRampToValueAtTime(shout ? 0.9 : 0.6, at + 0.06);
    env.gain.setValueAtTime(shout ? 0.9 : 0.6, at + len * 0.7);
    env.gain.exponentialRampToValueAtTime(0.0001, at + len);
    const [f1, f2, f3] = FORMANTS[v];
    for (const [f, q, a] of [[f1, 9, 1.0], [f2, 11, 0.7], [f3, 13, 0.35]] as const) {
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q;
      const g = c.createGain(); g.gain.value = a * 3.2;
      src.connect(bp); bp.connect(g); g.connect(env);
    }
    // 一点点降位数：带着电子质感，但不刺耳
    const crush = c.createWaveShaper(); crush.curve = crushCurve(7);
    // 一点环形调制：机械、隔着信号的感觉
    const ring = c.createGain(); ring.gain.value = 0.65;
    const rm = c.createOscillator(); rm.frequency.value = 58; const rmg = c.createGain(); rmg.gain.value = 0.18;
    rm.connect(rmg); rmg.connect(ring.gain); rm.start(at); rm.stop(at + len + 0.05); this.nodes.push(rm);
    env.connect(crush); crush.connect(ring); ring.connect(this.voiceBus);
  }

  /** 页面切到后台时暂停 / 回来继续 */
  pause(on: boolean) { const c = this.ctx as AudioContext; if (!c.suspend) return; if (on) c.suspend().catch(() => {}); else c.resume().catch(() => {}); }

  dispose() {
    this.timers.forEach(clearInterval);
    this.timers = [];
    for (const n of this.nodes) { try { n.stop(); } catch { /* 已经停了 */ } }
    this.nodes = [];
  }
}
