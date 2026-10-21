// ============================================================
// 音频：
//  · 场景配乐（core/score.ts，按画面自动切换，现场合成）
//  · 随身听（这里）：一个小道具，可以放那几首 8bit 歌；放歌的时候场景配乐会安静下来
//  · 合成音效（零素材，WebAudio 现场合成）
// ============================================================
import { BGM_TRACKS, EXTRA_TRACKS, UAUA_TRACK, UAUA_LOOP, BgmTrack } from '../music';
import { getSave, setSettings, PlayerState, hasFlag, addFlag } from './save';
import { score } from './score';

// ---------------- 随身听 ----------------
type Listener = () => void;
const absUrl = (u: string) => { try { return new URL(u, location.href).href; } catch { return u; } };
/** 随身听里现在能看到的曲目：固定的 10 首 + 已经解锁的追加曲（追加在末尾，前面的下标永远不变） */
export const visibleTracks = (): BgmTrack[] => [...BGM_TRACKS, ...EXTRA_TRACKS.filter(t => !t.unlockFlag || hasFlag(t.unlockFlag))];
class Walkman {
  private el: HTMLAudioElement | null = null;
  private suppressed = false;
  private listeners = new Set<Listener>();
  private snap = { playing: false, idx: 0, mode: 'seq' as PlayerState['mode'], t: 0, dur: 0 };
  started = false;

  get tracks() { return visibleTracks(); }
  /** 随身听真的在出声（不是暂停、不是被静音演出压住） */
  get isPlaying() { return !!this.el && !this.el.paused && !this.suppressed; }
  /** 随身听开始/停止出声时通知（悠亚的专属曲据此让路） */
  private activeHooks = new Set<Listener>();
  onActiveChange(l: Listener) { this.activeHooks.add(l); return () => { this.activeHooks.delete(l); }; }
  private fireActive() { this.activeHooks.forEach(l => l()); }
  subscribe = (l: Listener) => { this.listeners.add(l); return () => { this.listeners.delete(l); }; };
  getSnapshot = () => this.snap;
  private emit() {
    const a = this.el; const st = getSave().settings.player;
    this.snap = { playing: !!a && !a.paused, idx: st.idx, mode: st.mode, t: a?.currentTime ?? 0, dur: a && isFinite(a.duration) ? a.duration : 0 };
    this.listeners.forEach(l => l());
  }
  private st() { return getSave().settings.player; }
  private set(patch: Partial<PlayerState>) { setSettings({ player: { ...this.st(), ...patch } }); }

  private ensure() {
    if (this.el) return this.el;
    const a = new Audio();
    a.preload = 'auto';
    a.onended = () => {
      const st = this.st();
      if (st.mode === 'one') { a.currentTime = 0; a.play().catch(() => {}); return; }
      this.next();
    };
    a.onplay = () => { score.duckFor(true); this.emit(); this.fireActive(); };
    a.onpause = () => { score.duckFor(false); this.emit(); this.fireActive(); };
    a.onerror = () => {
      // 追加曲（悠亚的歌）加载失败：提示一次，停下随身听，回到场景配乐
      const tr = this.tracks[this.st().idx];
      if (tr && EXTRA_TRACKS.includes(tr)) { notices.push(UAUA_TEXT.missing); this.set({ on: false }); this.emit(); this.fireActive(); }
    };
    a.ontimeupdate = () => this.emit();
    a.onloadedmetadata = () => this.emit();
    this.el = a;
    this.load(this.st().idx);
    this.applyVolume();
    return a;
  }
  private load(idx: number) {
    const a = this.el!;
    const list = this.tracks; const n = list.length;
    const i = ((idx % n) + n) % n;
    if (a.src !== absUrl(list[i].url)) a.src = list[i].url;
    if (i !== this.st().idx) this.set({ idx: i });
  }
  applyVolume() {
    if (!this.el) return;
    const s = getSave().settings;
    this.el.volume = Math.max(0, Math.min(1, s.master * s.bgm));
  }
  /** 第一次用户操作：如果上次关游戏时在放，就接着放 */
  start() {
    if (this.started) return;
    this.started = true;
    this.ensure();
    if (this.st().on && !this.suppressed) this.el!.play().catch(() => {});
    this.emit();
  }
  play(idx?: number) {
    const a = this.ensure();
    if (idx !== undefined) this.load(idx);
    this.set({ on: true });
    if (!this.suppressed) a.play().catch(() => {});
    this.emit();
  }
  /** 停下随身听，回到场景配乐 */
  pause() { const a = this.ensure(); this.set({ on: false }); a.pause(); this.emit(); }
  toggle() { const a = this.ensure(); if (a.paused) this.play(); else this.pause(); }
  next() {
    const st = this.st();
    const n = this.tracks.length;
    const i = st.mode === 'shuffle' ? (st.idx + 1 + Math.floor(Math.random() * (n - 1))) % n : (st.idx + 1) % n;
    this.play(i);
  }
  prev() { const a = this.ensure(); if (a.currentTime > 3) { a.currentTime = 0; return; } this.play(this.st().idx - 1); }
  seek(frac: number) { const a = this.ensure(); if (isFinite(a.duration)) a.currentTime = a.duration * frac; }
  setMode(mode: PlayerState['mode']) { this.set({ mode }); this.emit(); }
  /** 演出期间（终端结局 / 异常警告）暂时静音，结束后按原状态恢复 */
  suppress(on: boolean) {
    this.suppressed = on;
    if (!this.el) return;
    if (on) { this.el.pause(); this.set({ on: this.st().on }); }
    else if (this.started && this.st().on) this.el.play().catch(() => {});
    this.fireActive();
  }
}
export const walkman = new Walkman();

// ---------------- 轻提示（音频相关的一句话） ----------------
export const UAUA_TEXT = {
  enter: '⟡ 悠亚来了。',
  leave: '她离开了。周围的声音慢慢恢复。',
  unlock: '随身听新增曲目：《かなしばりに遭ったら》',
  missing: '这首曲子的音源还没有安装。',
} as const;
class Notices {
  private seq = 0;
  private items: { id: number; text: string }[] = [];
  private ls = new Set<Listener>();
  subscribe = (l: Listener) => { this.ls.add(l); return () => { this.ls.delete(l); }; };
  getSnapshot = () => this.items;
  push(text: string, ms = 3200) {
    const id = ++this.seq;
    this.items = [...this.items, { id, text }];
    this.ls.forEach(l => l());
    setTimeout(() => { this.items = this.items.filter(n => n.id !== id); this.ls.forEach(l => l()); }, ms);
  }
}
export const notices = new Notices();

// ============================================================
// 悠亚在场：专属曲的生命周期
//  · enterUauaPresence(origin) / leaveUauaPresence(reason)：重复调用无副作用
//  · 入场：场景配乐约 1 秒淡出 → 专属曲约 1.5 秒淡入；在场期间循环（跳过首尾静音）
//  · 离场：专属曲约 1 秒淡出后暂停，场景配乐恢复成「当前画面」该放的那首
//  · 优先级：玩家主动在用随身听时，随身听优先——专属曲保持静音等候，随身听停下后再淡入；
//    任何时候都只有一个录音在出声
//  · 浏览器不许自动播放时：等下一次点击/按键再试，不刷报错
//  · 音源加载失败：提示一次「这首曲子的音源还没有安装。」，场景配乐照常
//  · 第一次遇见悠亚：随身听解锁这首歌（存档 flag: music:uaua_kanashibari）
// ============================================================
export type UauaOrigin = 'story' | 'secret_form';
export type UauaLeaveReason = 'form' | 'unmount' | 'screen';
const FADE_IN = 1.5, FADE_OUT = 1.0, FADE_YIELD = 0.25;   // 给随身听让路时要快，不能和玩家点的歌叠在一起

class UauaChannel {
  origin: UauaOrigin | null = null;
  /** 专属曲的 <audio>（只读；调试/验收用） */
  el: HTMLAudioElement | null = null;
  // 音量走 WebAudio：<audio> → GainNode → 输出。淡入淡出在音频线程上按时间表执行，
  // 不会因为切关时主线程忙着搭场景而卡住（卡住时用 <audio>.volume 的老办法会整段不动）
  private ctx: AudioContext | null = null;
  private g: GainNode | null = null;
  private gain = 0;            // 逻辑音量 0~1（再乘 master×bgm）——仅在没有 WebAudio 时使用
  private target = 0;
  private fadeTimer: ReturnType<typeof setInterval> | ReturnType<typeof setTimeout> | null = null;
  private fadeToken = 0;
  private presenceId = 0;
  private startedFor = -1;
  private suppressed = false;
  private missing = false;
  private missingNoticed = false;
  private gestureArmed = false;
  private ducking = false;
  readonly log: string[] = [];

  private walkmanT: ReturnType<typeof setTimeout> | null = null;
  // 随身听换曲时会先「暂停」一下再「播放」：稍等一拍再判断，免得专属曲在换曲的空隙里冒出来
  constructor() { walkman.onActiveChange(() => { if (this.walkmanT) clearTimeout(this.walkmanT); this.walkmanT = setTimeout(() => { this.walkmanT = null; if (this.origin) this.sync('walkman'); }, 150); }); }

  private note(msg: string) {
    const line = `${(performance.now() / 1000).toFixed(2)}s ${msg}`;
    this.log.push(line); if (this.log.length > 300) this.log.shift();
  }
  private vol() { const s = getSave().settings; return Math.max(0, Math.min(1, s.master * s.bgm)); }
  private level() { if (this.g) { const v = this.vol(); return v > 1e-4 ? this.g.gain.value / v : this.target; } return this.gain; }
  applyVolume() {
    if (this.g && this.ctx) { if (!this.fadeTimer) { const t = this.ctx.currentTime; this.g.gain.cancelScheduledValues(t); this.g.gain.setTargetAtTime(this.target * this.vol(), t, 0.05); } return; }
    if (this.el) this.el.volume = Math.max(0, Math.min(1, this.gain * this.vol()));
  }
  private graph() {
    if (this.g || !this.el) return this.g;
    try {
      const C = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new C(); const src = ctx.createMediaElementSource(this.el); const g = ctx.createGain();
      g.gain.value = 0; src.connect(g); g.connect(ctx.destination);
      this.ctx = ctx; this.g = g; this.el.volume = 1;
    } catch { this.note('WebAudio unavailable → <audio>.volume fallback'); }
    return this.g;
  }

  private ensure() {
    if (this.el) return this.el;
    const a = new Audio();
    a.preload = 'auto';
    a.loop = true;   // 兜底；正常情况下在 UAUA_LOOP.end 处跳回开头的音乐部分
    a.src = UAUA_TRACK.url;
    a.ontimeupdate = () => { if (this.origin && a.currentTime >= UAUA_LOOP.end) a.currentTime = UAUA_LOOP.start; };
    a.onplaying = () => { this.note(`playing t=${a.currentTime.toFixed(2)}`); if (this.wants()) { this.setDuck(true); this.fadeTo(1, FADE_IN); } };
    a.oncanplay = () => this.note(`canplay dur=${a.duration.toFixed(2)}`);
    a.onerror = () => {
      this.missing = true;
      this.note(`error code=${a.error?.code ?? '?'} → 回退场景配乐`);
      this.setDuck(false);
      this.stopFade(); this.gain = 0; this.target = 0;
      if (this.g && this.ctx) { this.g.gain.cancelScheduledValues(this.ctx.currentTime); this.g.gain.value = 0; }
      if (!this.missingNoticed) { this.missingNoticed = true; notices.push(UAUA_TEXT.missing); }
    };
    this.el = a;
    return a;
  }
  private setDuck(on: boolean) { if (this.ducking === on) return; this.ducking = on; score.duckBy('uaua', on); this.note(on ? 'scene BGM → fade out' : 'scene BGM → restore'); }
  private stopFade() { if (this.fadeTimer) { clearInterval(this.fadeTimer as ReturnType<typeof setInterval>); clearTimeout(this.fadeTimer as ReturnType<typeof setTimeout>); this.fadeTimer = null; } this.fadeToken++; }
  private fadeTo(target: number, sec: number, done?: () => void) {
    this.stopFade();
    const token = this.fadeToken;
    this.target = target;
    const g = this.graph();
    if (g && this.ctx) {
      const t = this.ctx.currentTime; const cur = g.gain.value;
      g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(cur, t); g.gain.linearRampToValueAtTime(target * this.vol(), t + sec);
      this.fadeTimer = setTimeout(() => { if (token !== this.fadeToken) return; this.fadeTimer = null; this.note(`fade → ${target} done (${sec}s)`); done?.(); }, sec * 1000 + 30);
      return;
    }
    const from = this.gain; const t0 = performance.now();
    this.fadeTimer = setInterval(() => {
      if (token !== this.fadeToken) return;
      const k = Math.min(1, (performance.now() - t0) / (sec * 1000));
      this.gain = from + (target - from) * k;
      this.applyVolume();
      if (k >= 1) { this.stopFade(); this.note(`fade → ${target} done (${sec}s)`); done?.(); }
    }, 40);
  }
  private wants() { return !!this.origin && !this.suppressed && !this.missing && !walkman.isPlaying; }

  private armGesture() {
    if (this.gestureArmed) return;
    this.gestureArmed = true;
    const retry = () => { this.disarmGesture(); if (this.wants()) this.sync('gesture'); };
    this.disarm = () => { window.removeEventListener('pointerdown', retry, true); window.removeEventListener('keydown', retry, true); };
    window.addEventListener('pointerdown', retry, true); window.addEventListener('keydown', retry, true);
    this.note('autoplay blocked → wait for next input');
  }
  private disarm: () => void = () => {};
  private disarmGesture() { if (!this.gestureArmed) return; this.gestureArmed = false; this.disarm(); }

  private sync(why: string) {
    const a = this.ensure();
    if (this.wants()) {
      if (this.startedFor !== this.presenceId) {
        this.startedFor = this.presenceId;
        try { a.currentTime = UAUA_LOOP.start; } catch { /* 元数据还没到 */ }
      }
      this.note(`sync(${why}) → play`);
      this.graph();
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      const p = a.play();
      p?.then(() => {
        // <audio> 能放但音频图还没被允许启动：同样等下一次输入
        if (this.ctx && this.ctx.state !== 'running') this.armGesture(); else this.disarmGesture();
      }).catch((e: DOMException) => {
        if (e?.name === 'NotAllowedError') this.armGesture();
        else if (e?.name !== 'AbortError') this.note(`play() rejected: ${e?.name}`);
      });
      if (!a.paused && a.readyState >= 3) { this.setDuck(true); this.fadeTo(1, FADE_IN); }
    } else {
      this.note(`sync(${why}) → quiet`);
      this.disarmGesture();
      this.setDuck(false);
      if (a.paused) { this.stopFade(); this.gain = 0; this.target = 0; if (this.g && this.ctx) { this.g.gain.cancelScheduledValues(this.ctx.currentTime); this.g.gain.value = 0; } return; }
      this.fadeTo(0, why === 'walkman' ? FADE_YIELD : FADE_OUT, () => { if (!this.wants()) { a.pause(); this.note('paused'); } });
    }
  }

  enter(origin: UauaOrigin) {
    if (this.origin) { this.note(`enter(${origin}) ignored: already present`); return; }
    this.origin = origin; this.presenceId++;
    // 音源加载失败过：这次游戏里不再反复请求（刷新页面后会重试），场景配乐照常
    this.note(`enter(${origin})`);
    window.dispatchEvent(new CustomEvent('uaua:enter', { detail: { origin } }));
    notices.push(UAUA_TEXT.enter);
    if (UAUA_TRACK.unlockFlag && !hasFlag(UAUA_TRACK.unlockFlag)) {
      addFlag(UAUA_TRACK.unlockFlag);
      this.note('walkman unlock: uaua_kanashibari');
      setTimeout(() => notices.push(UAUA_TEXT.unlock, 4200), 900);
    }
    this.sync('enter');
  }
  leave(reason: UauaLeaveReason) {
    if (!this.origin) return;
    this.note(`leave(${reason})`);
    this.origin = null;
    window.dispatchEvent(new CustomEvent('uaua:leave', { detail: { reason } }));
    if (reason === 'form') notices.push(UAUA_TEXT.leave);
    this.sync('leave');
  }
  suppress(on: boolean) { if (this.suppressed === on) return; this.suppressed = on; if (this.origin) this.sync('suppress'); }
  /** 现在场景里响着的是悠亚的歌（给随身听屏幕显示「正在听这里的声音」用） */
  get audible() { return !!this.origin && !!this.el && !this.el.paused && this.target > 0; }
  debug() {
    const a = this.el;
    return {
      origin: this.origin, gain: +this.level().toFixed(3), volume: this.g ? +this.g.gain.value.toFixed(3) : a ? +a.volume.toFixed(3) : null, ctx: this.ctx?.state ?? null,
      paused: a ? a.paused : null, t: a ? +a.currentTime.toFixed(2) : null, dur: a && isFinite(a.duration) ? +a.duration.toFixed(2) : null,
      readyState: a?.readyState ?? null, missing: this.missing, waitingForInput: this.gestureArmed,
      walkmanPlaying: walkman.isPlaying, score: score.debugState(), src: a?.src ?? null,
    };
  }
}
export const uaua = new UauaChannel();
export const enterUauaPresence = (origin: UauaOrigin) => uaua.enter(origin);
export const leaveUauaPresence = (reason: UauaLeaveReason = 'form') => uaua.leave(reason);
if (typeof window !== 'undefined' && (import.meta.env.DEV || new URLSearchParams(location.search).has('audiolog'))) { (window as any).__uaua = uaua; (window as any).__walkman = walkman; }

/** 总入口：给 App / 设置用 */
export const music = {
  start() { score.start(); walkman.start(); },
  suppress(on: boolean) { score.suppress(on); walkman.suppress(on); uaua.suppress(on); },
  applyVolume() { score.applyVolume(); walkman.applyVolume(); uaua.applyVolume(); },
};

// ---------------- 合成音效 ----------------
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
const ac = () => {
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      master = ctx.createGain();
      master.connect(ctx.destination);
    } catch { return null; }
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  const s = getSave().settings;
  master!.gain.value = s.master * s.sfx;
  return ctx;
};

const tone = (freq: number, dur: number, type: OscillatorType = 'square', gain = 0.12, slideTo?: number, delay = 0) => {
  const c = ac(); if (!c || !master) return;
  const t0 = c.currentTime + delay;
  const o = c.createOscillator(); const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(master);
  o.start(t0); o.stop(t0 + dur + 0.03);
};

const noise = (dur: number, gain = 0.15, freq = 1200, q = 0.8, delay = 0, type: BiquadFilterType = 'bandpass') => {
  const c = ac(); if (!c || !master) return;
  const t0 = c.currentTime + delay;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource(); src.buffer = buf;
  const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = c.createGain(); g.gain.value = gain;
  src.connect(f); f.connect(g); g.connect(master);
  src.start(t0);
};

export type Sfx =
  | 'jump' | 'djump' | 'land' | 'switch' | 'switchBack' | 'page' | 'candy' | 'checkpoint'
  | 'death' | 'respawn' | 'click' | 'hover' | 'door' | 'bounce' | 'crumble' | 'shift'
  | 'pat' | 'dizzy' | 'stun' | 'unlock' | 'shield' | 'transform' | 'type' | 'confirm' | 'back'
  | 'goal' | 'whoosh' | 'thud';

let lastType = 0;
export const sfx = (name: Sfx) => {
  switch (name) {
    case 'jump': tone(380, 0.12, 'square', 0.07, 720); break;
    case 'djump': tone(520, 0.1, 'square', 0.07, 980); tone(780, 0.1, 'triangle', 0.05, 1300, 0.04); break;
    case 'land': noise(0.07, 0.12, 400, 0.6); break;
    case 'switch': noise(0.22, 0.12, 2400, 0.4, 0, 'highpass'); tone(900, 0.18, 'sine', 0.06, 300); break;
    case 'switchBack': noise(0.22, 0.12, 2400, 0.4, 0, 'highpass'); tone(300, 0.18, 'sine', 0.06, 900); break;
    case 'page': [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.22, 'triangle', 0.09, undefined, i * 0.06)); break;
    case 'candy': tone(1320, 0.08, 'sine', 0.08); tone(1760, 0.14, 'sine', 0.07, undefined, 0.06); break;
    case 'checkpoint': [523, 659, 784].forEach((f, i) => tone(f, 0.35, 'sine', 0.08, undefined, i * 0.08)); break;
    case 'death': tone(600, 0.35, 'square', 0.09, 90); noise(0.15, 0.1, 800); break;
    case 'respawn': tone(300, 0.25, 'sine', 0.07, 700); break;
    case 'click': tone(880, 0.05, 'square', 0.05); break;
    case 'hover': tone(1200, 0.025, 'sine', 0.025); break;
    case 'confirm': tone(660, 0.07, 'square', 0.06); tone(990, 0.1, 'square', 0.05, undefined, 0.06); break;
    case 'back': tone(660, 0.07, 'square', 0.05); tone(440, 0.1, 'square', 0.04, undefined, 0.06); break;
    case 'door': noise(0.5, 0.08, 500, 2); tone(140, 0.5, 'sawtooth', 0.03, 220); break;
    case 'bounce': tone(200, 0.25, 'sine', 0.12, 700); break;
    case 'crumble': noise(0.4, 0.14, 300, 0.5, 0, 'lowpass'); break;
    case 'shift': tone(220, 0.06, 'square', 0.08); tone(160, 0.08, 'square', 0.08, undefined, 0.09); noise(0.12, 0.1, 900, 1, 0.05); break;
    case 'pat': tone(1046, 0.08, 'sine', 0.06); tone(1318, 0.12, 'sine', 0.05, undefined, 0.07); break;
    case 'dizzy': tone(500, 0.4, 'sine', 0.04, 380); break;
    case 'stun': [700, 600, 500, 420].forEach((f, i) => tone(f, 0.12, 'triangle', 0.06, undefined, i * 0.1)); break;
    case 'unlock': [659, 880, 1318].forEach((f, i) => tone(f, 0.25, 'triangle', 0.07, undefined, i * 0.09)); break;
    case 'shield': tone(900, 0.2, 'triangle', 0.08, 400); break;
    case 'transform': [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.3, 'sine', 0.06, undefined, i * 0.07)); noise(0.6, 0.05, 3000, 0.5); break;
    case 'goal': [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.4, 'triangle', 0.08, undefined, i * 0.09)); break;
    case 'whoosh': noise(0.45, 0.1, 1200, 0.5); break;
    case 'thud': tone(90, 0.25, 'sine', 0.18, 50); noise(0.1, 0.1, 200); break;
    case 'type': {
      const now = performance.now();
      if (now - lastType < 35) return;
      lastType = now;
      tone(1500 + Math.random() * 600, 0.02, 'square', 0.025);
      break;
    }
  }
};

/** 对话「说话声」：不同角色不同音高 */
const VOICE: Record<string, [number, OscillatorType]> = {
  dousha: [760, 'square'], novus: [520, 'triangle'], kimo: [330, 'sine'],
  narr: [0, 'sine'], note: [0, 'sine'], danmaku: [1200, 'square'], tv: [900, 'sawtooth'],
};
let lastVoice = 0;
export const voiceBlip = (who: string) => {
  const v = VOICE[who]; if (!v || !v[0]) return;
  const now = performance.now();
  if (now - lastVoice < 55) return;
  lastVoice = now;
  tone(v[0] * (0.92 + Math.random() * 0.16), 0.045, v[1], 0.035);
};
if (import.meta.env.DEV) (window as any).__walkman = walkman;
