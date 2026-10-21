// ============================================================
// 场景配乐控制器：根据当前画面切换曲子，交叉淡入淡出
//  · 图层滤镜：漫画层像隔着纸听（收窄的频段），线框层像隔着水听（低通）
//  · 随身听在放歌时，配乐自动安静下来；终端结局 / 异常警告期间完全静音
// ============================================================
import { compile, Compiled, isChip, makeImpulse, Outs, playDrum, playNote, skipOnLoop } from './synth';
import { TRACKS } from './tracks';
import { getSave } from './save';

export type MusicLayer = 'real' | 'manga' | 'wire';

interface Playing {
  comp: Compiled;
  gain: GainNode;
  outs: Outs;
  step: number;
  next: number;
  stopping: boolean;
  chip: boolean;
  space: number;
}

class Score {
  private c: AudioContext | null = null;
  private bus!: GainNode;
  private hp!: BiquadFilterNode;
  private lp!: BiquadFilterNode;
  private duck!: GainNode;
  private out!: GainNode;
  private verbIn!: GainNode;
  private delayIn!: GainNode;
  private playing: Playing[] = [];
  private cur: Playing | null = null;
  private want: string | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private layer: MusicLayer = 'real';
  private suppressed = false;
  /** 让场景配乐让路的原因：walkman（随身听在放歌）/ uaua（悠亚的专属曲） */
  private duckReasons = new Set<string>();
  private uauaSince = 0;
  private get ducked() { return this.duckReasons.size > 0; }
  private cache = new Map<string, Compiled>();
  started = false;

  private ensure() {
    if (this.c) return this.c;
    try { this.c = new (window.AudioContext || (window as any).webkitAudioContext)(); } catch { return null; }
    const c = this.c;
    this.bus = c.createGain();
    this.hp = c.createBiquadFilter(); this.hp.type = 'highpass'; this.hp.frequency.value = 10;
    this.lp = c.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.frequency.value = 20000; this.lp.Q.value = 0.5;
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.2;
    this.duck = c.createGain();
    this.out = c.createGain();
    this.bus.connect(this.hp); this.hp.connect(this.lp); this.lp.connect(comp); comp.connect(this.duck); this.duck.connect(this.out); this.out.connect(c.destination);
    // 共用的混响和延迟
    this.verbIn = c.createGain();
    const verb = c.createConvolver(); verb.buffer = makeImpulse(c, 2.0, 2.6);
    const verbOut = c.createGain(); verbOut.gain.value = 0.9;
    this.verbIn.connect(verb); verb.connect(verbOut); verbOut.connect(this.bus);
    this.delayIn = c.createGain();
    const dl = c.createDelay(1.5); const fb = c.createGain(); fb.gain.value = 0.32;
    const dlf = c.createBiquadFilter(); dlf.type = 'lowpass'; dlf.frequency.value = 2400;
    this.delayIn.connect(dl); dl.connect(dlf); dlf.connect(fb); fb.connect(dl); dlf.connect(this.bus);
    (this as any).dl = dl;
    this.applyVolume();
    this.applyDuck(true);
    this.applyLayer(true);
    return c;
  }

  /** 第一次用户操作时调用（浏览器的自动播放限制） */
  start() {
    const c = this.ensure();
    if (!c) return;
    if (c.state === 'suspended') c.resume().catch(() => {});
    this.started = true;
    if (!this.timer) this.timer = setInterval(() => this.tick(), 25);
    if (this.want) this.switchTo(this.want);
  }

  /** 切到某个场景的曲子（同一首不会重新开始） */
  scene(id: string | null) {
    this.want = id;
    if (this.started) this.switchTo(id);
  }
  get current() { return this.want; }

  setLayer(l: MusicLayer) { if (l === this.layer) return; this.layer = l; this.applyLayer(false); }
  suppress(on: boolean) { this.suppressed = on; this.applyDuck(false); }
  /** 随身听在放歌 */
  duckFor(on: boolean) { this.duckBy('walkman', on); }
  /** 某个原因要求场景配乐让路 / 不再需要让路。uaua：约 1 秒淡出，淡完才停排音符 */
  duckBy(reason: 'walkman' | 'uaua', on: boolean) {
    if (on === this.duckReasons.has(reason)) return;
    if (on) { this.duckReasons.add(reason); if (reason === 'uaua' && this.c) this.uauaSince = this.c.currentTime; }
    else this.duckReasons.delete(reason);
    this.applyDuck(false);
  }
  /** 调试用：当前的让路状态与增益 */
  debugState() { return { reasons: [...this.duckReasons], suppressed: this.suppressed, duckGain: this.duck ? +this.duck.gain.value.toFixed(3) : null, scene: this.want }; }

  applyVolume() {
    if (!this.c) return;
    const s = getSave().settings;
    this.out.gain.setTargetAtTime(Math.max(0, Math.min(1, s.master * s.bgm)) * 1.4, this.c.currentTime, 0.05);
  }

  private applyDuck(instant: boolean) {
    if (!this.c) return;
    const v = this.suppressed || this.ducked ? 0 : 1;
    const t = this.c.currentTime;
    this.duck.gain.cancelScheduledValues(t);
    if (instant) this.duck.gain.setValueAtTime(v, t);
    else this.duck.gain.setTargetAtTime(v, t, this.suppressed ? 0.05 : this.duckReasons.has('uaua') && !this.duckReasons.has('walkman') ? 0.32 : 0.35);
  }

  private applyLayer(instant: boolean) {
    if (!this.c) return;
    const [hp, lp, q] = this.layer === 'manga' ? [420, 3000, 1.2] : this.layer === 'wire' ? [60, 750, 3] : [10, 20000, 0.5];
    const t = this.c.currentTime;
    const k = instant ? 0.001 : 0.12;
    this.hp.frequency.setTargetAtTime(hp, t, k);
    this.lp.frequency.setTargetAtTime(lp, t, k);
    this.lp.Q.setTargetAtTime(q, t, k);
  }

  private switchTo(id: string | null) {
    const c = this.c; if (!c) return;
    if (this.cur && this.cur.comp.def.id === id && !this.cur.stopping) return;
    const t = c.currentTime;
    // 旧的淡出
    for (const p of this.playing) {
      if (p.stopping) continue;
      p.stopping = true;
      p.gain.gain.cancelScheduledValues(t);
      p.gain.gain.setTargetAtTime(0.0001, t, 0.45);
      const victim = p;
      (victim.outs.verb as GainNode).gain.setTargetAtTime(0, t, 0.45);
      (victim.outs.delay as GainNode).gain.setTargetAtTime(0, t, 0.45);
      setTimeout(() => {
        victim.gain.disconnect(); (victim.outs.verb as GainNode).disconnect(); (victim.outs.delay as GainNode).disconnect();
        this.playing = this.playing.filter(x => x !== victim);
      }, 4000);
    }
    this.cur = null;
    if (!id || !TRACKS[id]) return;
    let comp = this.cache.get(id);
    if (!comp) { comp = compile(TRACKS[id]); this.cache.set(id, comp); }
    const gain = c.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.setTargetAtTime(1, t + 0.15, 0.4);
    gain.connect(this.bus);
    // 混响/延迟的发送量在 tick 里跟着这首曲子的音量走，淡出时一起淡出
    const verbSend = c.createGain(); verbSend.connect(this.verbIn);
    const delaySend = c.createGain(); delaySend.connect(this.delayIn);
    for (const sg of [verbSend, delaySend]) { sg.gain.setValueAtTime(0.0001, t); sg.gain.setTargetAtTime(1, t + 0.15, 0.4); }
    const outs: Outs = { dry: gain, verb: verbSend, delay: delaySend };
    const def = comp.def;
    (this as any).dl.delayTime.setValueAtTime((60 / def.bpm) * 0.75, t); // 附点八分的回声
    const p: Playing = { comp, gain, outs, step: 0, next: t + 0.2, stopping: false, chip: isChip(def), space: def.space ?? 0.6 };
    this.playing.push(p);
    this.cur = p;
  }

  private tick() {
    const c = this.c; if (!c) return;
    // 预排 0.3 秒：主线程偶尔卡一下（3D 渲染、加载）也不会断
    const now = c.currentTime;
    const horizon = now + 0.3;
    for (const p of this.playing) {
      if (p.stopping) continue;
      const def = p.comp.def;
      const stepDur = 60 / def.bpm / 4;
      const quiet = this.suppressed || this.duckReasons.has('walkman') || (this.duckReasons.has('uaua') && now - this.uauaSince > 1.4);
      // 落后太多（切到后台、页面卡住）：直接跳到现在，不要把错过的音一口气全补上——那会变成一团杂音
      if (p.next < now - 0.04) {
        const skip = Math.ceil((now + 0.02 - p.next) / stepDur);
        p.step += skip; p.next += skip * stepDur;
      }
      while (p.next < horizon) {
        const idx = p.step % p.comp.steps.length;
        if (!quiet) {
          const swing = (idx % 4 === 2 ? (def.swing ?? 0) : 0) * stepDur;
          const t = Math.max(p.next + swing, now + 0.01);
          const loop = Math.floor(p.step / p.comp.steps.length);
          for (const e of p.comp.steps[idx]) {
            if (skipOnLoop(loop, e, p.comp.bars)) continue;
            if (e.kind === 'note') playNote(c, p.outs, e.inst as any, e.midi, t, e.dur * stepDur, e.vel, p.space);
            else playDrum(c, p.outs, e.inst as any, t, e.vel, p.chip, p.space);
          }
        }
        p.step++;
        p.next += stepDur;
      }
    }
  }
}

export const score = new Score();
