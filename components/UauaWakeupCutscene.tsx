// ============================================================
// 第二章 · 独立过场《快醒醒！》
//  第五关跳进裂缝之后、原有 c2_end 与终端结局之前播放。
//  白色朦胧的梦境、蓝色像素外星人与企鹅、蓝色像素大字，画外的呼唤与两个人的对话。
//  · 所有对白、两句大字按编剧最终执行文稿逐字实现，不加台词；「？？？」是画外音，不露脸、不出名字牌
//  · 没有配音：只有字幕 + 很轻的一小段滤波后的歌（第二句大字附近，约 3.5 秒）+ 图案脉动
//  · 时间轴驱动（镜头 A–G），自动连播；点击 / 空格 / 回车可以提前进入下一句字幕
//  · 看过一次以后才出现「跳过」（要再点一次确认）；页面切到后台时时间轴暂停
//  · onEnd 只会触发一次；卸载时清理计时器、音频节点和 <audio>
//  · 不碰 uaua 在场事件、不解锁随身听曲目（那是第三章的事）
// ============================================================
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PixelSprite, PENGUIN_A, PENGUIN_B, ALIEN, PAIR } from './UauaPixelSprites';
import { UAUA_TRACK } from '../music';
import { getSave } from '../core/save';
import { walkman } from '../core/audio';

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

// ---------------- 像素大字：画到小画布上再放大，保持方格 ----------------
const PixelText: React.FC<{ text: string; px: number; style?: React.CSSProperties }> = ({ text, px, style }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const [ar, setAr] = useState(4);
  useEffect(() => {
    const draw = () => {
      const c = ref.current; if (!c) return;
      const x = c.getContext('2d')!;
      const font = `900 ${px}px "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif`;
      x.font = font;
      const w = Math.ceil(x.measureText(text).width) + 4, h = Math.ceil(px * 1.25);
      c.width = w; c.height = h;
      x.font = font; x.textBaseline = 'middle'; x.fillStyle = '#246bc9';
      x.fillText(text, 2, h / 2 + 1);
      // 二值化：去掉抗锯齿的半透明边，像素边缘干干净净
      const d = x.getImageData(0, 0, w, h);
      for (let i = 3; i < d.data.length; i += 4) d.data[i] = d.data[i] > 90 ? 255 : 0;
      x.putImageData(d, 0, 0);
      setAr(w / h);
    };
    draw();
    document.fonts?.ready.then(draw).catch(() => {});
  }, [text, px]);
  return <canvas ref={ref} aria-label={text} style={{ imageRendering: 'pixelated', aspectRatio: String(ar), ...style }} />;
};

interface Props { onEnd: () => void; allowSkip?: boolean }

const UauaWakeupCutscene: React.FC<Props> = ({ onEnd, allowSkip }) => {
  const [t, setT] = useState(0);
  const tRef = useRef(0);
  const ended = useRef(false);
  const snipRef = useRef<(() => void) | null>(null);
  const snipDone = useRef(false);
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
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      if (!document.hidden) { tRef.current += dt; setT(tRef.current); }
      if (!snipDone.current && tRef.current >= SNIP_AT && snipRef.current) { snipDone.current = true; snipRef.current(); }
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
    // 镜头 A：一声往下沉的低频 + 一层很薄的气声
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

  const particles = useMemo(() => Array.from({ length: 26 }, (_, i) => ({ x: (i * 37.3) % 100, y: (i * 61.7) % 100, s: 4 + (i % 4) * 3, d: 9 + (i % 5) * 3, o: 0.06 + (i % 3) * 0.04 })), []);
  const burst = useMemo(() => Array.from({ length: 14 }, (_, i) => ({ a: (i / 14) * Math.PI * 2, r: 0.6 + (i % 3) * 0.25 })), []);
  const burstK = t > 34.4 && t < 37.7 ? (t - 34.4) / 3.3 : -1;

  return (
    <div className="fixed inset-0 z-[90] overflow-hidden select-none" style={{ background: '#f7fbff', cursor: 'default' }}
         onClick={nextLine} role="dialog" aria-label="快醒醒！">
      <style>{`
        @keyframes wk-drift { from { transform: translateY(0) } to { transform: translateY(-40px) } }
        @keyframes wk-scan { from { background-position: 0 0 } to { background-position: 0 6px } }
      `}</style>

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
      {/* 扫描纹 */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'repeating-linear-gradient(0deg, rgba(36,107,201,.045) 0 1px, transparent 1px 3px)', animation: reduce ? undefined : 'wk-scan 1.2s linear infinite' }} />

      {/* 像素图案 */}
      <div className="absolute left-1/2 pointer-events-none" style={{ top: `${pTop}%`, transform: `translate(-50%, -50%) scale(${pScale})`, width: 'clamp(120px, 24vmin, 230px)' }}>
        <div className="relative w-full" style={{ aspectRatio: '1' }}>
          {/* 淡蓝光晕（在精灵后面，不糊轮廓） */}
          <div className="absolute -inset-[30%] rounded-full" style={{ background: 'radial-gradient(circle, rgba(120,180,255,.35) 0%, rgba(120,180,255,0) 65%)', opacity: Math.max(alienA, penguinA) + sigPulse * 0.6 }} />
          {alienA > 0.01 && (
            <PixelSprite grid={ALIEN} title="像素外星人" className="absolute inset-0 w-full h-full"
              style={{ opacity: alienA * (glitch ? 0.55 : 1), transform: glitch ? 'translateX(-6%)' : undefined }} />
          )}
          {glitch && (
            <PixelSprite grid={PENGUIN_A} title="" className="absolute inset-0 w-full h-full" style={{ opacity: 0.6, transform: 'translateX(7%)', clipPath: 'inset(20% 0 35% 0)' }} />
          )}
          {penguinA > 0.01 && (
            <>
              {ghost && <PixelSprite grid={PENGUIN_A} title="" className="absolute inset-0 w-full h-full" style={{ opacity: 0.35, transform: 'translate(5%, -2%)' }} />}
              <PixelSprite grid={frameB ? PENGUIN_B : PENGUIN_A} title="像素企鹅" className="absolute inset-0 w-full h-full"
                style={{ opacity: penguinA * (1 - dissolve * 0.75), filter: `drop-shadow(0 0 6px rgba(120,180,255,.55))`,
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
          <PixelText text="快醒醒！" px={22} style={{ height: 'clamp(52px, 13vmin, 140px)', opacity: big1, transform: `scale(${1 + 0.08 * (1 - smooth(BIG1_AT, BIG1_AT + 0.25, t))})`,
            filter: 'drop-shadow(2px 1px 0 rgba(120,180,255,.75)) drop-shadow(0 0 10px rgba(80,150,240,.35))', maxWidth: '92vw' }} />
          <PixelText text="快醒醒，豆沙！" px={22} style={{ height: 'clamp(60px, 15vmin, 170px)', opacity: big2, transform: `scale(${1 + 0.08 * (1 - smooth(BIG2_AT, BIG2_AT + 0.25, t))})`,
            filter: 'drop-shadow(2px 1px 0 rgba(120,180,255,.75)) drop-shadow(0 0 12px rgba(80,150,240,.4))', maxWidth: '94vw' }} />
        </div>
      )}

      {/* 白雾里的两个人（低对比剪影） */}
      {pair > 0.01 && (
        <div className="absolute left-1/2 pointer-events-none" style={{ top: '58%', transform: 'translate(-50%, -50%)', width: 'clamp(130px, 22vmin, 220px)', opacity: pair * 0.9 }}>
          <PixelSprite grid={PAIR} colors={{ O: '#c3d5ec' }} title="豆沙和室友姐的剪影" className="w-full h-auto" style={{ filter: 'blur(0.4px)' }} />
        </div>
      )}

      {/* 字幕 */}
      {line && (
        <div className="absolute inset-x-0 bottom-[7%] flex justify-center px-4 pointer-events-none">
          <div className="max-w-[min(680px,92vw)] w-full px-5 py-3 rounded-lg" style={{ opacity: lineK, background: 'rgba(255,255,255,.78)', border: '2px solid rgba(36,107,201,.45)', boxShadow: '0 4px 24px rgba(36,107,201,.12)' }}>
            <div className="text-xs font-bold tracking-wider mb-1" style={{ color: line.who === '？？？' ? '#6a8fc4' : line.who === '李豆沙' ? '#246bc9' : '#c2702e' }}>
              {line.who}
            </div>
            <div className="text-lg md:text-xl font-bold" style={{ color: '#1c3f78', fontStyle: line.who === '？？？' ? 'italic' : undefined, letterSpacing: '0.02em' }}>
              「{line.t.slice(0, shown)}{shown >= line.t.length ? '」' : ''}
            </div>
          </div>
        </div>
      )}

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
