// ============================================================
// 音频：
//  · 场景配乐（core/score.ts，按画面自动切换，现场合成）
//  · 随身听（这里）：一个小道具，可以放那几首 8bit 歌；放歌的时候场景配乐会安静下来
//  · 合成音效（零素材，WebAudio 现场合成）
// ============================================================
import { BGM_TRACKS } from '../music';
import { getSave, setSettings, PlayerState } from './save';
import { score } from './score';

// ---------------- 随身听 ----------------
type Listener = () => void;
class Walkman {
  private el: HTMLAudioElement | null = null;
  private suppressed = false;
  private listeners = new Set<Listener>();
  private snap = { playing: false, idx: 0, mode: 'seq' as PlayerState['mode'], t: 0, dur: 0 };
  started = false;

  get tracks() { return BGM_TRACKS; }
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
    a.onplay = () => { score.duckFor(true); this.emit(); };
    a.onpause = () => { score.duckFor(false); this.emit(); };
    a.ontimeupdate = () => this.emit();
    a.onloadedmetadata = () => this.emit();
    this.el = a;
    this.load(this.st().idx);
    this.applyVolume();
    return a;
  }
  private load(idx: number) {
    const a = this.el!;
    const i = ((idx % BGM_TRACKS.length) + BGM_TRACKS.length) % BGM_TRACKS.length;
    if (!a.src.endsWith(BGM_TRACKS[i].url)) a.src = BGM_TRACKS[i].url;
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
    const n = BGM_TRACKS.length;
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
  }
}
export const walkman = new Walkman();

/** 总入口：给 App / 设置用 */
export const music = {
  start() { score.start(); walkman.start(); },
  suppress(on: boolean) { score.suppress(on); walkman.suppress(on); },
  applyVolume() { score.applyVolume(); walkman.applyVolume(); },
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
