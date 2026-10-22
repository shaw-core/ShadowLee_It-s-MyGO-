// ============================================================
// 第二章 · 独立过场《快醒醒！》
//  第五关跳进裂缝之后、原有 c2_end 与终端结局之前播放。
//  白色朦胧的梦境、点阵电子屏上的外星人与企鹅、终端风格的蓝色大字，画外的呼唤与两个人的对话。
//  v0.16.4：半梦半醒——眼皮沉沉半合、画面失焦随呼吸起伏，每喊一声就猛地对一下焦、波纹荡开，一次比一次清楚。
//  · 所有对白、两句大字按编剧最终执行文稿逐字实现，不加台词；「？？？」是画外音，不露脸、不出名字牌
//  · 没有配音：只有字幕 + 很轻的一小段滤波后的歌（第二句大字附近，约 3.5 秒）+ 图案脉动
//  · 时间轴驱动（镜头 A–G），自动连播；点击 / 空格 / 回车可以提前进入下一句字幕
//  · 看过一次以后才出现「跳过」（要再点一次确认）；页面切到后台时时间轴暂停
//  · onEnd 只会触发一次；卸载时清理计时器、音频节点和 <audio>
//  · 不碰 uaua 在场事件、不解锁随身听曲目（那是第三章的事）
// ============================================================
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PixelSprite, LedSprite, PENGUIN_A, PENGUIN_B, ALIEN, PAIR } from './UauaPixelSprites';
import { UAUA_TRACK } from '../music';
import { getSave } from '../core/save';
import { walkman } from '../core/audio';
import { WakeupSound } from './wakeupAudio';

type Who = '？？？' | '李豆沙' | '室友姐';
interface Line { who: Who; t: string; at: number; dur: number }

// ---------------- 锁定对白（顺序与文字不可改） ----------------
const L = (who: Who, t: string): { who: Who; t: string } => ({ who, t });
const SHOT_LINES: { start: number; gap: number; lines: { who: Who; t: string }[] }[] = [
  // 镜头 C：画外呼唤（在两句大字出现后）
  { start: 16.0, gap: 0.3, lines: [L('？？？', '快醒醒！快醒醒，豆沙！')] },
  // 镜头 D：李豆沙听到，室友姐没听到
  { start: 21.6, gap: 0.4, lines: [
    L('李豆沙', '……诶？'), L('室友姐', '怎么了？'), L('李豆沙', '你刚刚有没有听到……'), L('室友姐', '听到什么？'), L('李豆沙', '有人在叫我。'),
  ] },
  // 镜头 E：信号逐渐接近
  { start: 34.6, gap: 0.4, lines: [
    L('？？？', '豆沙！'), L('李豆沙', '等一下——'), L('李豆沙', '……这个声音。'), L('室友姐', '你认识？'), L('李豆沙', '我好像——'),
  ] },
  // 镜头 F：认出声音，但还没见面
  { start: 47.6, gap: 0.45, lines: [
    L('？？？', '你不会睡过去了吧……'), L('？？？', '喂，小李！'), L('李豆沙', '……uaua？'), L('？？？', '……终于有反应了。'),
  ] },
  // 镜头 G：梦醒
  { start: 59.4, gap: 0.35, lines: [
    L('室友姐', '豆沙？'), L('室友姐', '你脸色怎么了？'), L('李豆沙', '我刚才……好像听见 uaua 了。'), L('室友姐', 'uaua？'), L('李豆沙', '……算了。'), L('李豆沙', '可能是我还没缓过来吧。'),
  ] },
];
/** 每句字幕的显示时长：按字数，最短 2 秒 */
const durFor = (t: string) => Math.max(1.9, 1.1 + t.length * 0.12);
const buildLines = (): Line[] => {
  const out: Line[] = [];
  for (const s of SHOT_LINES) {
    let at = s.start;
    for (const l of s.lines) { const d = durFor(l.t); out.push({ ...l, at, dur: d }); at += d + s.gap; }
  }
  return out;
};
export const WAKEUP_LINES = buildLines();
const LAST_LINE_END = WAKEUP_LINES[WAKEUP_LINES.length - 1].at + WAKEUP_LINES[WAKEUP_LINES.length - 1].dur;
const BIG1_AT = 13.0, BIG2_AT = 14.9, BIG_OUT = 19.8;
const FADE_OUT_AT = LAST_LINE_END + 0.6, TOTAL = FADE_OUT_AT + 1.6;
/** 歌曲片段：第二句大字附近，约 3.5 秒；从曲中这个位置开始（秒） */
const SNIP_AT = 15.2, SNIP_LEN = 3.6, SNIP_FROM = 62;

const smooth = (a: number, b: number, t: number) => { const k = Math.max(0, Math.min(1, (t - a) / (b - a))); return k * k * (3 - 2 * k); };

// ---------------- 终端风格的大字：等宽字体、逐字打出、方块光标、蓝色辉光（和后面的终端同一种字） ----------------
const TERM_FONT = '"JetBrains Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, "Noto Sans SC", monospace';
const TermText: React.FC<{ text: string; shown: number; size: string; opacity: number; cursor: boolean }> = ({ text, shown, size, opacity, cursor }) => (
  <div aria-label={text} className="whitespace-nowrap" style={{
    fontFamily: TERM_FONT, fontSize: size, lineHeight: 1.1, opacity, letterSpacing: '0.06em', fontWeight: 500,
    // 字身带扫描线（像终端屏幕上的字），外面一圈蓝色辉光
    color: 'transparent', backgroundImage: 'repeating-linear-gradient(0deg, #1652ad 0 2px, #2f74d6 2px 3px)', WebkitBackgroundClip: 'text', backgroundClip: 'text',
    textShadow: '-1px 0 0 rgba(80,170,255,.35), 0 0 10px rgba(36,107,201,.35), 0 0 24px rgba(36,107,201,.18)',
  }}>
    {text.slice(0, shown)}
    <span style={{ visibility: shown < text.length || cursor ? 'visible' : 'hidden', opacity: 0.85 }}>{shown < text.length || cursor ? '█' : ''}</span>
    {/* 占位：没打出来的字也占着宽度，整行不跳 */}
    <span style={{ visibility: 'hidden' }}>{text.slice(shown)}</span>
  </div>
);

interface Props { onEnd: () => void; allowSkip?: boolean }

const UauaWakeupCutscene: React.FC<Props> = ({ onEnd, allowSkip }) => {
  const [t, setT] = useState(0);
  const tRef = useRef(0);
  const ended = useRef(false);
  const snipRef = useRef<(() => void) | null>(null);
  const snipDone = useRef(false);
  const soundRef = useRef<WakeupSound | null>(null);
  const calledRef = useRef(-1);
  const lastMix = useRef(-1);
  const [confirmSkip, setConfirmSkip] = useState(false);
  const reduce = useMemo(() => getSave().settings.reduceMotion || (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches), []);

  const finish = useCallback(() => {
    if (ended.current) return;
    ended.current = true;
    onEnd();
  }, [onEnd]);

  // ---- 时间轴：页面在后台时暂停 ----
  useEffect(() => {
    let raf = 0, last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.25, (now - last) / 1000); last = now;   // 帧率低的设备上也按真实时间走，和声音对得上
      if (!document.hidden) { tRef.current += dt; setT(tRef.current); }
      if (!snipDone.current && tRef.current >= SNIP_AT && snipRef.current) { snipDone.current = true; snipRef.current(); }
      // 背景声：梦境底跟着画面起伏；「？？？」开口时远处响起电子呼唤
      const snd = soundRef.current, tt = tRef.current;
      if (snd) {
        if (tt >= 2.8) snd.startDream();
        const li = WAKEUP_LINES.findIndex(l => tt >= l.at && tt < l.at + l.dur);
        if (li >= 0 && li > calledRef.current) {
          calledRef.current = li;
          if (WAKEUP_LINES[li].who === '？？？') snd.call(WAKEUP_LINES[li].t);
        }
        if (tt - lastMix.current > 0.25) {
          lastMix.current = tt;
          const speaking = li >= 0 && WAKEUP_LINES[li].who === '？？？';
          const snip = tt > SNIP_AT && tt < SNIP_AT + SNIP_LEN + 0.5;
          const k = smooth(2.8, 7.5, tt) * (1 + 0.3 * smooth(43.8, 46.6, tt) * (1 - smooth(47, 49, tt)) + 0.25 * smooth(58.4, 60.8, tt))
            * (speaking ? 0.7 : 1) * (snip ? 0.6 : 1) * (1 - smooth(FADE_OUT_AT, TOTAL, tt));
          snd.setDream(k);
        }
      }
      if (tRef.current >= TOTAL) { finish(); return; }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [finish]);

  // ---- 声音：抽离感的低频 + 风声（镜头 A）、一小段隔着世界的歌（镜头 C） ----
  useEffect(() => {
    let ctx: AudioContext | null = null;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let el: HTMLAudioElement | null = null;
    const s = getSave().settings;
    const vol = Math.max(0, Math.min(1, s.master * s.bgm));
    try { ctx = new (window.AudioContext || (window as any).webkitAudioContext)(); } catch { return; }
    const c = ctx;
    if (c.state === 'suspended') c.resume().catch(() => {});
    const out = c.createGain(); out.gain.value = 1; out.connect(c.destination);
    const snd = new WakeupSound(c, out, vol);
    soundRef.current = snd;
    (window as any).__wakeupSound = snd;
    const onVis = () => snd.pause(document.hidden);
    document.addEventListener('visibilitychange', onVis);
    // 镜头 A：一声往下沉的低频（之后接上 wakeupAudio.ts 的梦境底和电子呼唤） + 一层很薄的气声
    {
      const now = c.currentTime;
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(120, now); o.frequency.exponentialRampToValueAtTime(42, now + 3.6);
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(0.18 * vol + 0.0001, now + 0.6); g.gain.exponentialRampToValueAtTime(0.0001, now + 4.2);
      o.connect(g); g.connect(out); o.start(now); o.stop(now + 4.4);
      const len = Math.floor(c.sampleRate * 4.5); const buf = c.createBuffer(1, len, c.sampleRate); const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * 0.6;
      const n = c.createBufferSource(); n.buffer = buf;
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(2400, now); f.frequency.exponentialRampToValueAtTime(500, now + 4.2); f.Q.value = 0.7;
      const ng = c.createGain(); ng.gain.setValueAtTime(0.0001, now); ng.gain.exponentialRampToValueAtTime(0.06 * vol + 0.0001, now + 0.8); ng.gain.exponentialRampToValueAtTime(0.0001, now + 4.4);
      n.connect(f); f.connect(ng); ng.connect(out); n.start(now);
    }
    // 镜头 C：第二句大字附近漏进来一点点歌——低通、很轻、几秒就淡掉。
    // 随身听正在放歌时，以随身听为准（不叠两首录音）。不调用悠亚在场事件、不解锁曲目。
    snipRef.current = () => {
      if (walkman.isPlaying) return;
      try {
        el = new Audio(); el.preload = 'auto'; el.src = UAUA_TRACK.url;
        const src = c.createMediaElementSource(el);
        const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 650; lp.Q.value = 0.8;
        const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 120;
        const g = c.createGain(); g.gain.value = 0;
        src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(out);
        const level = 0.22 * vol;   // 约为正常 BGM 音量的 22%
        const start = () => {
          const now = c.currentTime;
          g.gain.cancelScheduledValues(now); g.gain.setValueAtTime(0, now);
          g.gain.linearRampToValueAtTime(level, now + 0.7);
          g.gain.setValueAtTime(level, now + SNIP_LEN - 1.3);
          g.gain.linearRampToValueAtTime(0, now + SNIP_LEN);
          timers.push(setTimeout(() => { el?.pause(); }, (SNIP_LEN + 0.2) * 1000));
        };
        el.addEventListener('loadedmetadata', () => { try { el!.currentTime = SNIP_FROM; } catch { /* ignore */ } }, { once: true });
        el.play().then(start).catch(() => { /* 播不了就算了：字幕照常走 */ });
        (window as any).__wakeupSnippet = { el, gain: g, lowpass: lp, level };
      } catch { /* ignore */ }
    };
    return () => {
      snipRef.current = null;
      document.removeEventListener('visibilitychange', onVis);
      snd.dispose(); soundRef.current = null;
      timers.forEach(clearTimeout);
      if (el) { el.pause(); el.removeAttribute('src'); el.load(); }
      c.close().catch(() => {});
      if ((window as any).__wakeupSnippet) (window as any).__wakeupSnippet = { ended: true };
    };
  }, []);

  // ---- 输入：点击 / 空格 / 回车 → 提前进入下一句 ----
  const nextLine = useCallback(() => {
    const now = tRef.current;
    const cur = WAKEUP_LINES.find(l => now >= l.at && now < l.at + l.dur);
    if (cur) { tRef.current = cur.at + cur.dur; setT(tRef.current); }
  }, []);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (['Space', 'Enter', 'KeyF'].includes(e.code) && !e.repeat) { e.preventDefault(); nextLine(); } };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [nextLine]);

  // ---------------- 由时间推出画面 ----------------
  const line = WAKEUP_LINES.find(l => t >= l.at && t < l.at + l.dur) ?? null;
  const lineK = line ? Math.min(1, (t - line.at) / 0.35) * (1 - smooth(line.at + line.dur - 0.3, line.at + line.dur, t)) : 0;
  const shown = line ? Math.min(line.t.length, Math.floor((t - line.at) * 22) + 1) : 0;   // 字幕逐字出现

  // 镜头 A：白光吞掉画面
  const whiteIn = smooth(0, 3.2, t);
  const geomOut = 1 - smooth(0.2, 3.6, t);
  // 镜头 B：外星人 → 错位叠闪 → 企鹅
  const alienA = smooth(5.0, 6.0, t) * (1 - smooth(8.6, 9.6, t));
  const glitch = !reduce && ((t > 7.0 && t < 7.18) || (t > 8.1 && t < 8.26));
  const penguinA = smooth(8.4, 10.0, t) * (1 - smooth(57.8, 59.8, t));
  // 位置：镜头 C 起往上挪；D 起留在上方，小一点
  const up = smooth(12.0, 13.0, t);
  const pScale = (1 - 0.2 * smooth(19.8, 21.3, t)) * (1 + 0.12 * Math.sin(Math.max(0, Math.min(1, (t - 34.2) / 1.4)) * Math.PI)) * (1 - 0.45 * smooth(57.8, 59.8, t));
  const pTop = 46 - 20 * up - 2 * smooth(19.8, 21.3, t);
  const frameB = !reduce && Math.floor(t * 1.6) % 2 === 1;
  const ghost = !reduce && ((t > 44.6 && t < 47.0) || (t > 51.0 && t < 51.25));
  const dissolve = smooth(54.5, 59.4, t);            // 镜头 F 后半：开始溶解
  const sigPulse = t > 34 && t < 38 ? 1 - Math.abs((t - 35.6) / 2.2) : 0;   // 镜头 E：信号变强
  // 大字
  const big1 = smooth(BIG1_AT, BIG1_AT + 0.12, t) * (1 - smooth(BIG_OUT, BIG_OUT + 0.8, t));
  const big2 = smooth(BIG2_AT, BIG2_AT + 0.12, t) * (1 - smooth(BIG_OUT, BIG_OUT + 0.8, t));
  // 镜头 D 起：两个人的剪影
  const pair = smooth(19.8, 21.8, t) * (1 - smooth(FADE_OUT_AT - 0.2, FADE_OUT_AT + 1.2, t));
  // 雾：镜头 E 末尾更亮一点；镜头 G 由蓝光过渡
  const fog = 0.35 + 0.35 * smooth(43.8, 46.6, t) * (1 - smooth(47, 49, t));
  const blueGlow = smooth(58.4, 60.8, t) * 0.55;
  const endFade = smooth(FADE_OUT_AT, TOTAL, t);

  // ---- 半梦半醒（v0.16.4）----
  // 喊声：第几声了、这一声开口多久了。一次比一次清楚——画面也跟着一次比一次「对上焦」
  const calls = WAKEUP_LINES.filter(l => l.who === '？？？' && t >= l.at);
  const lastCall = calls[calls.length - 1];
  const callK = lastCall ? t - lastCall.at : 99;                       // 距离最近一声多久
  const clarity = Math.min(1, Math.max(0, calls.length - 1) / 4);       // 0 → 1
  const focus = callK < 3 ? Math.exp(-callK * 0.9) : 0;                // 刚喊的那一下，猛地对焦
  const wake = smooth(58.6, 61.5, t);                                   // 镜头 G：醒过来
  const dreamBlur = Math.max(0, (2.4 - 1.5 * clarity) * (1 - wake) * smooth(3.5, 6, t) - focus * 2.4);
  const spriteBlur = Math.max(0, (0.7 - 0.6 * clarity) * (1 - wake) - focus);
  // 眼皮：沉沉地半合着，偶尔慢慢合上又睁开；被喊的时候一惊、睁开一点；醒来时完全睁开
  const droop = (c: number) => { const k = (t - c) / 1.6; return k > 0 && k < 1 ? Math.sin(k * Math.PI) : 0; };
  const lid = reduce ? 0.12 * (1 - wake) * smooth(4, 7, t)
    : Math.max(0, Math.min(0.92, (smooth(4, 6, t) * (0.38 - 0.18 * smooth(6, 10, t)) + 0.32 * (droop(25.4) + droop(30.6) + droop(41.8) + droop(55.6)) - focus * 0.14) * (1 - wake)));
  const breathe = reduce ? 1 : 1 + 0.012 * Math.sin(t * 0.55);
  const split = !reduce && callK < 0.45 ? (0.45 - callK) / 0.45 : 0;    // 刚开口时一下色偏（像信号）
  const ripples = lastCall && callK < 3.4 ? [0, 0.45, 0.9].map(d => (callK - d) / 2.3).filter(k => k > 0 && k < 1) : [];

  const particles = useMemo(() => Array.from({ length: 26 }, (_, i) => ({ x: (i * 37.3) % 100, y: (i * 61.7) % 100, s: 4 + (i % 4) * 3, d: 9 + (i % 5) * 3, o: 0.06 + (i % 3) * 0.04 })), []);
  const burst = useMemo(() => Array.from({ length: 14 }, (_, i) => ({ a: (i / 14) * Math.PI * 2, r: 0.6 + (i % 3) * 0.25 })), []);
  const burstK = t > 34.4 && t < 37.7 ? (t - 34.4) / 3.3 : -1;

  return (
    <div className="fixed inset-0 z-[90] overflow-hidden select-none" style={{ background: '#f7fbff', cursor: 'default' }}
         onClick={nextLine} role="dialog" aria-label="快醒醒！">
      <style>{`
        @keyframes wk-drift { from { transform: translateY(0) } to { transform: translateY(-40px) } }
        @keyframes wk-scan { from { background-position: 0 0 } to { background-position: 0 6px } }
        @keyframes wk-roll { from { transform: translateY(-30%) } to { transform: translateY(130%) } }
      `}</style>

      {/* —— 梦境层：失焦、随呼吸轻轻起伏（大字和字幕不在这一层，始终清楚） —— */}
      <div className="absolute inset-0" style={{ filter: dreamBlur > 0.05 ? `blur(${dreamBlur.toFixed(2)}px)` : undefined, transform: `scale(${breathe})` }}>
      {/* 雾：四周淡蓝，中间冷白 */}
      <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 50% 42%, rgba(250,253,255,1) 0%, rgba(240,247,255,${0.9}) 38%, rgba(196,222,250,${fog}) 78%, rgba(160,200,245,${fog + 0.1}) 100%)` }} />
      {/* 下坠时远去的几何：几道蓝线收拢、淡出 */}
      {geomOut > 0.01 && (
        <div className="absolute inset-0" style={{ opacity: geomOut }}>
          {Array.from({ length: 9 }, (_, i) => (
            <div key={i} className="absolute left-1/2 h-[2px]" style={{
              top: `${10 + i * 10}%`, width: `${(1 - whiteIn) * 140 + 6}%`, transform: 'translateX(-50%)',
              background: `rgba(36,107,201,${0.35 - i * 0.02})`,
            }} />
          ))}
          <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, rgba(30,58,138,${0.55 * geomOut}), rgba(20,40,90,${0.65 * geomOut}))` }} />
        </div>
      )}
      {/* 漂浮的低透明像素 */}
      <div className="absolute inset-0 pointer-events-none" style={{ opacity: smooth(4, 7, t) }}>
        {particles.map((p, i) => (
          <span key={i} className="absolute" style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.s, height: p.s, background: '#5b9be6', opacity: p.o,
            animation: reduce ? undefined : `wk-drift ${p.d}s linear ${-i}s infinite alternate` }} />
        ))}
      </div>
      </div>
      {/* 扫描纹 + 一道慢慢往下滚的干扰亮带（和电视头小豆结尾的屏幕同一种质感） */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'repeating-linear-gradient(0deg, rgba(36,107,201,.045) 0 1px, transparent 1px 3px)', animation: reduce ? undefined : 'wk-scan 1.2s linear infinite' }} />
      {!reduce && <div className="absolute inset-x-0 h-1/4 pointer-events-none" style={{ background: 'linear-gradient(transparent, rgba(110,160,240,.07), transparent)', animation: 'wk-roll 7s linear infinite' }} />}

      {/* 喊声的波纹：从企鹅那里一圈圈荡开，一次比一次大、一次比一次清楚 */}
      {ripples.map((k, i) => (
        <div key={i} className="absolute left-1/2 pointer-events-none rounded-full" style={{
          top: `${pTop}%`, width: `${(14 + k * (26 + clarity * 30))}vmin`, aspectRatio: '1', transform: 'translate(-50%, -50%)',
          border: `${3 - i}px solid rgba(52,124,222,${(1 - k) * (0.28 + clarity * 0.4)})`,
          boxShadow: `0 0 18px rgba(120,180,255,${(1 - k) * 0.35})`,
        }} />
      ))}

      {/* 像素图案 */}
      <div className="absolute left-1/2 pointer-events-none" style={{ top: `${pTop}%`, transform: `translate(-50%, -50%) scale(${pScale})`, width: 'clamp(120px, 24vmin, 230px)' }}>
        <div className="relative w-full" style={{ aspectRatio: '1' }}>
          {/* 淡蓝光晕（在精灵后面，不糊轮廓） */}
          <div className="absolute -inset-[30%] rounded-full" style={{ background: 'radial-gradient(circle, rgba(120,180,255,.35) 0%, rgba(120,180,255,0) 65%)', opacity: Math.max(alienA, penguinA) + sigPulse * 0.6 }} />
          {alienA > 0.01 && (
            <LedSprite grid={ALIEN} title="电子外星人图标" className="absolute inset-0 w-full h-full"
              style={{ opacity: alienA * (glitch ? 0.55 : 1), transform: glitch ? 'translateX(-6%)' : undefined }} />
          )}
          {glitch && (
            <LedSprite grid={PENGUIN_A} panel={false} title="" className="absolute inset-0 w-full h-full" style={{ opacity: 0.6, transform: 'translateX(7%)', clipPath: 'inset(20% 0 35% 0)' }} />
          )}
          {penguinA > 0.01 && (
            <>
              {ghost && <LedSprite grid={PENGUIN_A} panel={false} title="" className="absolute inset-0 w-full h-full" style={{ opacity: 0.35, transform: 'translate(5%, -2%)' }} />}
              <LedSprite grid={frameB ? PENGUIN_B : PENGUIN_A} title="电子企鹅图标" className="absolute inset-0 w-full h-full"
                style={{ opacity: penguinA * (1 - dissolve * 0.75),
                  filter: `${spriteBlur > 0.05 ? `blur(${spriteBlur.toFixed(2)}px) ` : ''}drop-shadow(0 0 6px rgba(120,180,255,.55))${split > 0 ? ` drop-shadow(${(3 * split).toFixed(1)}px 0 0 rgba(255,110,140,${(0.55 * split).toFixed(2)})) drop-shadow(${(-3 * split).toFixed(1)}px 0 0 rgba(60,140,255,${(0.6 * split).toFixed(2)}))` : ''}`,
                  clipPath: dissolve > 0.02 ? `inset(${dissolve * 22}% 0 0 0)` : undefined }} />
            </>
          )}
          {burstK >= 0 && burst.map((b, i) => (
            <span key={i} className="absolute" style={{ left: `${50 + Math.cos(b.a) * b.r * burstK * 90}%`, top: `${50 + Math.sin(b.a) * b.r * burstK * 90}%`, width: 8, height: 8, background: '#347cde', opacity: (1 - burstK) * 0.8 }} />
          ))}
        </div>
      </div>

      {/* 蓝色像素大字 */}
      {(big1 > 0.01 || big2 > 0.01) && (
        <div className="absolute inset-x-0 flex flex-col items-center gap-[2vh] pointer-events-none" style={{ top: '44%' }}>
          <TermText text="快醒醒！" size="clamp(40px, 10vmin, 112px)" opacity={big1}
            shown={Math.min(4, Math.floor((t - BIG1_AT) * 16) + 1)} cursor={false} />
          <TermText text="快醒醒，豆沙！" size="clamp(40px, 10.5vmin, 120px)" opacity={big2}
            shown={Math.min(7, Math.floor((t - BIG2_AT) * 16) + 1)} cursor={!reduce && Math.floor(t * 1.8) % 2 === 0} />
        </div>
      )}

      {/* 白雾里的两个人（低对比剪影） */}
      {pair > 0.01 && (
        <div className="absolute left-1/2 pointer-events-none" style={{ top: '58%', transform: 'translate(-50%, -50%)', width: 'clamp(130px, 22vmin, 220px)', opacity: pair * 0.9 }}>
          <PixelSprite grid={PAIR} colors={{ O: '#c3d5ec' }} title="豆沙和室友姐的剪影" className="w-full h-auto" style={{ filter: `blur(${(0.4 + dreamBlur * 0.5).toFixed(2)}px)` }} />
        </div>
      )}

      {/* 字幕 */}
      {line && (
        <div className="absolute inset-x-0 bottom-[7%] flex justify-center px-4 pointer-events-none">
          <div className="max-w-[min(680px,92vw)] w-full px-5 py-3 rounded-md relative overflow-hidden" style={{
            opacity: lineK, fontFamily: TERM_FONT, background: 'rgba(8,22,52,.82)', border: '1px solid rgba(90,160,255,.55)',
            boxShadow: '0 0 0 1px rgba(36,107,201,.25), 0 6px 30px rgba(36,107,201,.25), inset 0 0 30px rgba(60,130,240,.12)' }}>
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'repeating-linear-gradient(0deg, rgba(0,0,0,.22) 0 1px, transparent 1px 3px)' }} />
            <div className="relative text-xs font-bold tracking-wider mb-1" style={{ color: line.who === '？？？' ? 'rgba(160,200,255,.7)' : line.who === '李豆沙' ? '#8fd0ff' : '#ffc896' }}>
              {line.who}
            </div>
            <div className="relative text-base md:text-xl font-bold" style={{ color: '#d8ecff', textShadow: '0 0 8px rgba(110,180,255,.55)', fontStyle: line.who === '？？？' ? 'italic' : undefined, letterSpacing: '0.02em' }}>
              「{line.t.slice(0, shown)}{shown >= line.t.length ? '」' : <span style={{ opacity: 0.85 }}>█</span>}
            </div>
          </div>
        </div>
      )}

      {/* 眼皮：视野变成一道椭圆的缝，上下边缘是柔软的暗蓝——眼睛沉沉地半合着 */}
      {lid > 0.005 && (
        <div className="absolute inset-0 pointer-events-none" style={{
          background: `radial-gradient(ellipse 125% ${Math.max(6, (1 - lid) * 100).toFixed(1)}% at 50% 47%, rgba(30,45,85,0) 62%, rgba(36,56,102,${(0.42 + lid * 0.45).toFixed(2)}) 80%, rgba(22,34,66,${(0.62 + lid * 0.38).toFixed(2)}) 100%)`,
        }} />
      )}
      {/* 屏幕玻璃的暗角：圆角、四周微微发暗，像隔着一块老电视的玻璃在看梦 */}
      <div className="absolute inset-0 pointer-events-none" style={{ borderRadius: 'clamp(12px, 3vw, 34px)', boxShadow: `inset 0 0 ${120 + 60 * (1 - clarity)}px rgba(70,105,170,${0.28 * (1 - wake * 0.6)})` }} />

      {/* 镜头 G：蓝光过渡；结尾淡出 */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 40%, rgba(150,195,255,.9), rgba(90,150,235,.6))', opacity: blueGlow * (1 - endFade) }} />
      <div className="absolute inset-0 pointer-events-none" style={{ background: '#ffffff', opacity: endFade }} />

      {/* 跳过（看过以后才有，点两次） */}
      {allowSkip && t > 1 && !ended.current && (
        <button className="absolute right-4 top-4 px-3 py-1.5 text-xs font-bold rounded-full"
                style={{ color: '#246bc9', background: 'rgba(255,255,255,.7)', border: '1px solid rgba(36,107,201,.4)' }}
                onClick={e => { e.stopPropagation(); if (confirmSkip) finish(); else { setConfirmSkip(true); setTimeout(() => setConfirmSkip(false), 2500); } }}>
          {confirmSkip ? '再点一次跳过' : '跳过'}
        </button>
      )}
    </div>
  );
};

export default UauaWakeupCutscene;
export const WAKEUP_TOTAL = TOTAL;
