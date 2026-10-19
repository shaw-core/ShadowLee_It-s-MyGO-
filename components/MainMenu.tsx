import React, { useState, useEffect, useRef, useSyncExternalStore } from 'react';
import { BookHeart, Star, X, ImageOff, Sparkles, Shirt, Camera, Music, ChevronLeft, ChevronRight, AlertTriangle, Settings as Cog, Play, Headphones } from 'lucide-react';
import { SPECIAL_CG_URL } from '../constants';
import { GAME_VERSION } from '../version';
import { useSave } from '../core/save';
import { walkman, sfx } from '../core/audio';
import { openWalkman } from './Walkman';
import { count2D, count3D, ALL_2D_ITEMS, ALL_3D_ITEMS, SPECIAL_CG_ID } from '../core/progress';
import { LEVELS2D } from '../game2d/levels';
import { LEVELS3D } from '../game3d/levels3d';
import { getSprites, novusWave, SPR_W, SPR_H } from '../game2d/sprites';
import Settings from './ui/Settings';
import TvHead3D from './TvHead3D';

/** 演出用的满屏雪花噪点（低分辨率画布放大） */
const Static: React.FC<{ color: string; alpha: number }> = ({ color, alpha }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!; const g = c.getContext('2d')!;
    const W = 320, H = 180; c.width = W; c.height = H;
    const img = g.createImageData(W, H);
    const [r, gg, b] = color.split(',').map(Number);
    let raf = 0, f = 0;
    const loop = () => {
      if (f++ % 2 === 0) {
        for (let i = 0; i < W * H; i++) {
          const v = Math.random();
          img.data[i * 4] = r; img.data[i * 4 + 1] = gg; img.data[i * 4 + 2] = b;
          img.data[i * 4 + 3] = v > 0.5 ? v * 255 * alpha * 3 : 0;
        }
        // 偶尔一条横向撕裂
        if (Math.random() < 0.08) { const y = Math.floor(Math.random() * H); for (let x = 0; x < W; x++) img.data[(y * W + x) * 4 + 3] = 255 * alpha * 4; }
        g.putImageData(img, 0, 0);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [color, alpha]);
  return <canvas ref={ref} className="absolute inset-0 w-full h-full pointer-events-none" style={{ imageRendering: 'pixelated' }} />;
};

interface MainMenuProps {
  onChapter: (ch: 1 | 2) => void;
  onCodex: () => void;
  onSkinSelect: () => void;
  onSecretEnding: () => void;
  onSpecialCG3D: () => void;
  onCheatUnlock: () => void;
  systemAnomaly?: boolean;     // 入侵隐藏终端后：世界系统异常（仅当次会话）
  onDismissAnomaly?: () => void;
}

/** 标题下的小舞台：豆沙在格子里跑，画面每隔几秒在现实和漫画之间翻一次 */
const MenuStage: React.FC = () => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!; const g = c.getContext('2d')!;
    g.imageSmoothingEnabled = false;
    const W = c.width, H = c.height;
    const prev = document.createElement('canvas'); prev.width = W; prev.height = H;
    const pg = prev.getContext('2d')!;
    let x = 40, dir = 1, t = 0, ink = false, wipe = 1, raf = 0, jump = 0, vy = 0;
    const draw = (ctx: CanvasRenderingContext2D, inkL: boolean) => {
      const grd = ctx.createLinearGradient(0, 0, 0, H);
      if (inkL) { grd.addColorStop(0, '#ffffff'); grd.addColorStop(1, '#e9e9ef'); }
      else { grd.addColorStop(0, '#dbe8ff'); grd.addColorStop(1, '#fde7ef'); }
      ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
      if (inkL) { ctx.fillStyle = 'rgba(22,24,42,.18)'; for (let yy = 2; yy < H - 14; yy += 4) for (let xx = (yy / 4) % 2 ? 2 : 0; xx < W; xx += 4) ctx.fillRect(xx, yy, 1, 1); }
      else { for (let i = 0; i < 12; i++) { ctx.fillStyle = ['#fde68a', '#fbcfe8', '#bfdbfe'][i % 3]; ctx.fillRect(10 + i * 26, 8 + Math.round(Math.sin(i) * 3), 2, 3); } }
      ctx.fillStyle = inkL ? '#16182a' : '#c48f63'; ctx.fillRect(0, H - 12, W, 12);
      ctx.fillStyle = inkL ? '#ffffff' : '#e8b98a'; ctx.fillRect(0, H - 12, W, 2);
      const set = getSprites('dousha', inkL);
      const fr = jump > 0 ? set.frames.jump[0] : set.frames.run[Math.floor(t / 5) % 6];
      ctx.drawImage(fr[dir > 0 ? 0 : 1], Math.round(x), Math.round(H - 12 - SPR_H + 1 + jump));
      const nv = Math.abs(x - (W - 50)) < 60 ? novusWave(inkL, Math.floor(t / 14) % 2) : getSprites('novus', inkL).frames.idle[Math.floor(t / 30) % 2][1];
      ctx.drawImage(nv, W - 50, H - 12 - SPR_H + 1);
    };
    const loop = () => {
      t++;
      x += dir * 1.1;
      if (x > W - 90) dir = -1;
      if (x < 16) dir = 1;
      if (jump === 0 && t % 90 === 45) vy = -3.2;
      if (vy !== 0 || jump < 0) { jump += vy; vy += 0.22; if (jump >= 0) { jump = 0; vy = 0; } }
      if (t % 240 === 0) { pg.drawImage(c, 0, 0); ink = !ink; wipe = 0; }
      draw(g, ink);
      if (wipe < 1) {
        wipe = Math.min(1, wipe + 0.04);
        const r = wipe * Math.hypot(W, H);
        g.save(); g.beginPath(); g.rect(0, 0, W, H); g.arc(x + SPR_W / 2, H - 30, r, 0, Math.PI * 2, true); g.clip('evenodd'); g.drawImage(prev, 0, 0); g.restore();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} width={320} height={64} className="pixel w-full h-auto block" />;
};

const ChapterCard: React.FC<{ no: string; title: string; sub: string; cleared: boolean; done: number; total: number; got: number; gotTotal: number; pink?: boolean; onClick: () => void }> =
  ({ no, title, sub, cleared, done, total, got, gotTotal, pink, onClick }) => (
  <button onClick={() => { sfx('confirm'); onClick(); }} onMouseEnter={() => sfx('hover')}
    className={`group relative text-left bg-white border-[3px] px-5 pt-4 pb-3 transition-transform hover:-translate-y-1 active:translate-y-0.5 ${pink ? 'border-[#9d174d]' : 'border-ink'}`}
    style={{ boxShadow: `6px 6px 0 0 ${pink ? '#9d174d' : '#1e3a8a'}` }}>
    <span className={`absolute -top-4 -left-3 w-11 h-11 flex items-center justify-center font-display text-2xl text-white border-[3px] ${pink ? 'bg-sakura border-[#9d174d]' : 'bg-dou border-ink'} -rotate-6`}>{no}</span>
    <span className="block pl-7 font-display text-xl md:text-2xl leading-tight" style={{ color: pink ? '#be185d' : '#1e3a8a' }}>
      {title}{cleared && <Star size={16} className="inline ml-1.5 -mt-1 text-amber-400" fill="currentColor" />}
    </span>
    <span className={`block pl-7 text-xs mt-0.5 ${pink ? 'text-pink-500' : 'text-blue-500'}`}>{sub}</span>
    <span className="flex items-center gap-2 mt-3 text-[11px] font-bold" style={{ color: pink ? '#be185d' : '#1e3a8a' }}>
      <span className="flex-1 h-2.5 border-2 border-current bg-white overflow-hidden">
        <span className={`block h-full ${pink ? 'bg-sakura' : 'bg-dou'}`} style={{ width: `${(done / total) * 100}%` }} />
      </span>
      <span className="tabular-nums">{done}/{total} 话</span>
      <span className="opacity-60 tabular-nums">收集 {got}/{gotTotal}</span>
    </span>
    <span className={`absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity ${pink ? 'text-sakura' : 'text-dou'}`}><Play size={18} fill="currentColor" /></span>
  </button>
);

const MainMenu: React.FC<MainMenuProps> = ({
  onChapter, onCodex, onSkinSelect, onSecretEnding, onSpecialCG3D, onCheatUnlock, systemAnomaly, onDismissAnomaly,
}) => {
  const save = useSave();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showCG, setShowCG] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  // 隐藏结局后的标题页演出：warning确认 → 禁止进入(点5次或停留10秒)
  // → 电视头亮起 → 蓝色终端 sudo 提权解除禁令 → exit 回标题
  const [seq, setSeq] = useState<'idle' | 'denied' | 'tvhead'>('idle');
  const [deniedClicks, setDeniedClicks] = useState(0);
  const [hackTyped, setHackTyped] = useState<string[]>([]);
  const [hackCur, setHackCur] = useState('');
  const seqCtxRef = React.useRef<AudioContext | null>(null);
  const ensureSeqCtx = () => {
    if (!seqCtxRef.current) {
      try { seqCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)(); } catch { /* ignore */ }
    }
    return seqCtxRef.current;
  };
  const seqBlip = (freq: number, dur: number, type: OscillatorType = 'square', gain = 0.1, slideTo?: number) => {
    const ctx = ensureSeqCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slideTo !== undefined) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), ctx.currentTime + dur);
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + dur + 0.02);
  };

  // 小豆的入侵脚本（分三段：登录提权 → revoke进度条 → 慢速退出）
  const HACK_LINES_A = [
    'panda-gatekeeper login: tvhead',
    'password: ············',
    '',
    'tvhead@panda:~$ sudo -i',
    '[sudo] password for tvhead: ············',
    '',
    'root@panda:~# gatekeeper --status',
    '  ● access_ban : ACTIVE  (target = WORLD_UI)',
    'root@panda:~# gatekeeper --revoke access_ban --auth TVHEAD_ADMIN',
  ];
  const [hackProgress, setHackProgress] = useState<number | null>(null);

  // 禁止进入：停留超过 10 秒自动推进
  useEffect(() => {
    if (seq !== 'denied') return;
    const t = setTimeout(() => setSeq('tvhead'), 10000);
    return () => clearTimeout(t);
  }, [seq]);

  // 禁止进入：点击超过 5 次推进
  useEffect(() => {
    if (seq === 'denied' && deniedClicks >= 5) setSeq('tvhead');
  }, [seq, deniedClicks]);

  // 电视头终端：登录提权 → revoke进度条 → ACCESS BAN LIFTED → 慢速exit/logout → 停顿 → 最后一声回车 → 回标题
  useEffect(() => {
    if (seq !== 'tvhead') return;
    let alive = true;
    const timers: ReturnType<typeof setTimeout>[] = [];
    setHackTyped([]);
    setHackCur('');
    setHackProgress(null);
    const wait = (ms: number) => new Promise<void>(res => { timers.push(setTimeout(res, ms)); });
    const typeLine = async (line: string, msPerChar: number, keySound: boolean) => {
      for (let ci = 1; ci <= line.length; ci++) {
        if (!alive) return;
        setHackCur(line.slice(0, ci));
        if (keySound && line[ci - 1] !== ' ') seqBlip(1700 + Math.random() * 1500, 0.02, 'square', 0.07);
        await wait(msPerChar + Math.random() * 12);
      }
      setHackTyped(prev => [...prev, line]);
      setHackCur('');
      if (keySound) seqBlip(340, 0.04, 'square', 0.06); // 回车
    };
    // 屏幕点亮音
    seqBlip(180, 0.35, 'sine', 0.12, 420);
    const run = async () => {
      await wait(900); // 亮起后停顿
      // 段一：登录与提权
      for (const line of HACK_LINES_A) {
        if (!alive) return;
        await typeLine(line, 28, true);
        await wait(line === '' ? 90 : 260);
      }
      if (!alive) return;
      // 段二：解除禁令进度条（放慢，让玩家看清这一幕在干什么）
      await wait(350);
      setHackProgress(0);
      let p = 0;
      while (p < 100) {
        if (!alive) return;
        p = Math.min(100, p + 0.8 + Math.random() * 2.2);
        setHackProgress(Math.floor(p));
        seqBlip(280 + p * 9, 0.025, 'square', 0.04);
        // 偶发卡顿：像真的在和系统掰手腕
        await wait(Math.random() < 0.07 ? 340 : 55);
      }
      if (!alive) return;
      await wait(500);
      setHackTyped(prev => [...prev, '  revoke access_ban ............... OK']);
      setHackProgress(null);
      await wait(450);
      await typeLine('  ACCESS BAN LIFTED', 30, false);
      seqBlip(523, 0.14, 'square', 0.08); seqBlip(784, 0.2, 'square', 0.06);
      await wait(1100);
      // 段三：慢速退出
      await typeLine('root@panda:~# exit', 105, true);
      await wait(650);
      await typeLine('logout', 110, false);
      // 输入完成后停一拍，再响起最后那一声回车
      await wait(1400);
      if (!alive) return;
      seqBlip(300, 0.06, 'square', 0.14);
      seqBlip(150, 0.1, 'square', 0.1);
      await wait(650);
      if (!alive) return;
      setSeq('idle');
      setDeniedClicks(0);
      onDismissAnomaly?.();
      try { seqCtxRef.current?.close(); } catch { /* ignore */ }
      seqCtxRef.current = null;
    };
    run();
    return () => { alive = false; timers.forEach(clearTimeout); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seq]);
  // 系统故障杂音（警告显示期间循环播放，替代 BGM）
  useEffect(() => {
    if (!systemAnomaly) return;
    let ctx: AudioContext | null = null;
    let glitchTimer: ReturnType<typeof setInterval> | null = null;
    try {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      // 白噪声底
      const len = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * 0.6;
      const noise = ctx.createBufferSource();
      noise.buffer = buf; noise.loop = true;
      const band = ctx.createBiquadFilter();
      band.type = 'bandpass'; band.frequency.value = 900; band.Q.value = 0.6;
      const noiseGain = ctx.createGain(); noiseGain.gain.value = 0.16;
      noise.connect(band); band.connect(noiseGain); noiseGain.connect(master);
      noise.start();
      // 间歇性电子故障哔啵
      glitchTimer = setInterval(() => {
        if (!ctx || Math.random() > 0.6) return;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = Math.random() > 0.5 ? 'sawtooth' : 'square';
        o.frequency.setValueAtTime(120 + Math.random() * 2200, ctx.currentTime);
        o.frequency.exponentialRampToValueAtTime(40 + Math.random() * 400, ctx.currentTime + 0.09);
        g.gain.setValueAtTime(0.14, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        o.connect(g); g.connect(master);
        o.start(); o.stop(ctx.currentTime + 0.12);
      }, 280);
    } catch { /* ignore */ }
    return () => {
      if (glitchTimer) clearInterval(glitchTimer);
      try { ctx?.close(); } catch { /* ignore */ }
    };
  }, [systemAnomaly]);

  const handleTitleClick = () => {
    setClickCount(prev => prev + 1);
    if (clickCount + 1 >= 5) {
      onCheatUnlock();
      setClickCount(0);
      sfx('unlock');
    }
  };

  const done1 = LEVELS2D.filter(l => (save.stats[`c1_${l.id}`]?.clears ?? 0) > 0).length;
  const done2 = LEVELS3D.filter(l => (save.stats[`c2_${l.id}`]?.clears ?? 0) > 0).length;
  const hasSpecialCG = save.inventory.includes(SPECIAL_CG_ID);
  const wm = useSyncExternalStore(walkman.subscribe, walkman.getSnapshot);

  return (
    <div className="w-full h-[100dvh] flex flex-col items-center bg-paper text-ink relative overflow-y-auto overflow-x-hidden scroll-thin">
      <style>{`
        @keyframes anomaly-glitch {
          0%, 86%, 100% { transform: translate(0, 0) skewX(0); opacity: 1; filter: none; }
          87% { transform: translate(-6px, 2px) skewX(-4deg); opacity: 0.65; filter: hue-rotate(90deg); }
          88.5% { transform: translate(5px, -2px) skewX(3deg); opacity: 1; }
          90% { transform: translate(0, 0); opacity: 0.3; }
          91% { opacity: 1; }
          94% { transform: translate(3px, 1px) skewX(2deg); opacity: 0.8; filter: saturate(3); }
          95.5% { transform: translate(0, 0); opacity: 1; filter: none; }
        }
        @keyframes anomaly-scan { 0% { top: -10%; } 100% { top: 110%; } }
        @keyframes tv-on {
          0% { opacity: 0; transform: scale(0.94); filter: brightness(4) drop-shadow(0 0 0 rgba(125,180,255,0)); }
          30% { opacity: 1; filter: brightness(2.5) drop-shadow(0 0 30px rgba(125,180,255,0.9)); }
          100% { opacity: 1; transform: scale(1); filter: brightness(1) drop-shadow(0 0 26px rgba(125,180,255,0.7)); }
        }
        @keyframes warn-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes slice { 0%, 100% { clip-path: inset(0 0 60% 0); transform: translate(3px,0); } 20% { clip-path: inset(40% 0 30% 0); transform: translate(-4px,0); } 40% { clip-path: inset(70% 0 5% 0); transform: translate(2px,0); } 60% { clip-path: inset(10% 0 75% 0); transform: translate(-2px,0); } 80% { clip-path: inset(55% 0 20% 0); transform: translate(5px,0); } }
        @keyframes tv-breathe {
          0%, 100% { filter: drop-shadow(0 0 18px rgba(125,180,255,0.5)); }
          50% { filter: drop-shadow(0 0 40px rgba(125,180,255,0.9)); }
        }
      `}</style>

      {/* 背景：网点 + 两角的速度线 */}
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(rgba(30,58,138,.10) 1.2px, transparent 1.4px)', backgroundSize: '14px 14px' }} />
      <div className="absolute -top-24 -left-24 w-[420px] h-[420px] pointer-events-none opacity-60" style={{ background: 'repeating-conic-gradient(from 10deg at 0 0, #bfdbfe 0deg 3deg, transparent 3deg 11deg)', maskImage: 'radial-gradient(circle at 0 0, #000 30%, transparent 70%)' }} />
      <div className="absolute -bottom-24 -right-24 w-[420px] h-[420px] pointer-events-none opacity-60" style={{ background: 'repeating-conic-gradient(from 10deg at 100% 100%, #fbcfe8 0deg 3deg, transparent 3deg 11deg)', maskImage: 'radial-gradient(circle at 100% 100%, #000 30%, transparent 70%)' }} />

      <div className="z-10 flex flex-col items-center my-auto py-8 w-full max-w-3xl px-5">
        {/* 大标题 */}
        <div className="text-center select-none">
          <h1 onClick={handleTitleClick}
              className="font-display text-5xl md:text-7xl text-dou cursor-pointer active:scale-95 transition-transform leading-none"
              style={{ WebkitTextStroke: '10px #fff', paintOrder: 'stroke fill', filter: 'drop-shadow(5px 5px 0 #f9a8d4)' }}>
            李豆沙的次元冲刺
          </h1>
          <p className="mt-3 inline-block bg-white border-[3px] border-ink px-5 py-1 font-display text-lg md:text-xl text-ink -rotate-1" style={{ boxShadow: '3px 3px 0 0 #1e3a8a' }}>
            秘密百合漫画册
          </p>
        </div>

        {/* 小舞台 */}
        <div className="w-full max-w-md mt-6 border-[3px] border-ink-black bg-white p-1 rotate-[0.6deg]" style={{ boxShadow: '4px 4px 0 0 rgba(22,24,42,.25)' }}>
          <MenuStage />
        </div>

        {/* 章节 */}
        <div className="grid md:grid-cols-2 gap-6 w-full mt-8">
          <ChapterCard no="壹" title="第一章 · 漫画的世界" sub="被封印在分镜里的两个人"
            cleared={save.cleared1} done={done1} total={LEVELS2D.length} got={count2D(save)} gotTotal={ALL_2D_ITEMS.length}
            onClick={() => onChapter(1)} />
          <ChapterCard no="贰" title="第二章 · 多边形的世界" sub="门的另一侧，是多出来的一维" pink
            cleared={save.cleared2} done={done2} total={LEVELS3D.length} got={count3D(save)} gotTotal={ALL_3D_ITEMS.length}
            onClick={() => onChapter(2)} />
        </div>

        {/* 次级功能 */}
        <div className="flex flex-wrap justify-center gap-3 mt-7">
          <button className="btn px-4 py-2 text-sm" onClick={() => { sfx('click'); onCodex(); }}><BookHeart size={16} />豆沙的手账</button>
          <button className="btn px-4 py-2 text-sm" onClick={() => { sfx('click'); onSkinSelect(); }}><Shirt size={16} />外观</button>
          <button className="btn px-4 py-2 text-sm" onClick={() => { sfx('click'); setSettingsOpen(true); }}><Cog size={16} />设置</button>
          {save.cleared2 && (
            <button className="btn px-4 py-2 text-sm text-white" style={{ background: '#fb923c', borderColor: '#9a3412', boxShadow: '4px 4px 0 0 #9a3412' }}
              onClick={() => { sfx('click'); onSpecialCG3D(); }}><Camera size={16} />后编合影</button>
          )}
          {hasSpecialCG && (
            <button className="btn btn-pink px-4 py-2 text-sm" onClick={() => { sfx('click'); setShowCG(true); setImgError(false); }}><Star size={16} />特别回顾</button>
          )}
        </div>

        {/* 随身听：原来的 BGM 选择换成了一个小道具 */}
        <button onClick={() => openWalkman()}
                className="flex items-center gap-2 mt-6 px-3 py-1.5 bg-white/80 border-2 border-ink/30 hover:border-ink text-xs font-bold rounded-full transition-colors">
          <Headphones size={14} className="text-sakura" />
          <span>{wm.playing ? `随身听 · ${walkman.tracks[wm.idx].name}` : '掏出随身听'}</span>
          <kbd className="ml-1 px-1 border border-ink/30 rounded text-[10px] text-ink/50">M</kbd>
        </button>
      </div>

      {/* 底栏 */}
      <div className="z-10 w-full flex items-center justify-between px-6 pb-4 text-[10px] md:text-xs text-ink/50">
        <span>{GAME_VERSION}</span>
        <span>方向键移动 · 空格跳 · Q 切换图层</span>
        <span>© ShadowLee</span>
      </div>

      {/* 真结局入口：通关第一章就能进（第一章只有 2D 房间，通关第二章后可以切到 3D） */}
      {save.cleared1 && (
        <button
          onClick={() => { sfx('confirm'); onSecretEnding(); }}
          className="absolute bottom-12 right-8 transition-transform hover:scale-110 flex flex-col items-center z-10 text-dou cursor-pointer"
          title="回到她们的房间"
        >
          <Sparkles size={32} fill="currentColor" className="animate-pulse" />
          <span className="text-[10px] mt-1 font-bold">她们的房间</span>
        </button>
      )}

      {settingsOpen && <Settings onClose={() => setSettingsOpen(false)} />}

      {/* 世界系统异常：整个标题页被接管（只在本次会话出现） */}
      {systemAnomaly && seq === 'idle' && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-5 overflow-hidden"
             style={{ backdropFilter: 'grayscale(1) contrast(1.25) blur(2px)', WebkitBackdropFilter: 'grayscale(1) contrast(1.25) blur(2px)', background: 'radial-gradient(ellipse at center, rgba(40,0,6,.55) 0%, rgba(8,0,2,.88) 70%)' }}>
          <Static color="255,60,80" alpha={0.035} />
          {/* 上下警示带 */}
          {(['top-0', 'bottom-0'] as const).map(pos => (
            <div key={pos} className={`absolute inset-x-0 ${pos} h-7 overflow-hidden`} style={{ background: 'repeating-linear-gradient(-45deg, #ff3b4f 0 16px, #1a0004 16px 32px)', opacity: 0.85 }}>
              <div className="absolute inset-0 flex items-center whitespace-nowrap font-mono text-[11px] font-bold tracking-[0.4em] text-white/90" style={{ animation: 'warn-marquee 14s linear infinite' }}>
                {'WORLD INTEGRITY CHECK FAILED  ·  '.repeat(12)}
              </div>
            </div>
          ))}
          <div className="relative w-full max-w-xl" style={{ animation: 'anomaly-glitch 2.4s linear infinite' }}>
            <div className="relative bg-[#16020a]/90 border border-[#ff3b4f]/70 overflow-hidden"
                 style={{ boxShadow: '0 0 0 1px rgba(0,0,0,.6), 0 0 60px rgba(255,59,79,.35), inset 0 0 40px rgba(255,59,79,.12)' }}>
              <div className="absolute left-0 inset-y-0 w-1.5 bg-[#ff3b4f]" />
              <div className="absolute left-0 w-full h-10 bg-[#ff3b4f]/10 pointer-events-none" style={{ animation: 'anomaly-scan 2.8s linear infinite' }} />
              <div className="absolute inset-0 pointer-events-none opacity-30" style={{ background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.45) 0px, rgba(0,0,0,0.45) 1px, transparent 1px, transparent 3px)' }} />
              <div className="flex items-center gap-3 px-7 pt-6 pb-1 font-mono text-[11px] tracking-[0.3em] text-[#ff8a96]/70">
                <span className="w-2 h-2 rounded-full bg-[#ff3b4f] animate-pulse" />SYS · 0x7F · INTEGRITY
              </div>
              <div className="relative px-7 pb-2">
                <div className="relative font-mono font-bold text-2xl md:text-[34px] tracking-wider text-[#ff4d5f] flex items-center gap-3">
                  <AlertTriangle size={30} className="shrink-0 animate-pulse" />
                  <span className="relative">
                    WORLD SYSTEM WARNING
                    <span aria-hidden className="absolute inset-0 text-cyan-300/50" style={{ transform: 'translate(2px,0)', clipPath: 'inset(0 0 55% 0)', animation: 'slice 2.6s steps(1) infinite' }}>WORLD SYSTEM WARNING</span>
                  </span>
                </div>
              </div>
              <div className="px-7 pb-2 font-mono text-sm md:text-[15px] leading-loose text-[#ffb3bb]">
                世界完整性校验失败<br />
                检测到未授权访问痕迹 —— 权限等级：TVHEAD_ADMIN<br />
                [P.A.N.D.A.] 监察进程已被唤醒<br />
                <span className="opacity-60 text-xs">该事件将被记录，并同步至更高一层。</span>
              </div>
              <div className="px-7 pt-3 pb-7 flex justify-end">
                <button onClick={() => { ensureSeqCtx(); setSeq('denied'); }}
                  className="group relative px-8 py-2.5 font-mono font-bold tracking-[0.35em] text-[#ffb3bb] border border-[#ff4d5f] overflow-hidden">
                  <span className="absolute inset-0 bg-[#ff4d5f] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-150" />
                  <span className="relative group-hover:text-black">[ 确认 ]</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== 隐藏结局后的标题页演出 ===== */}
      {seq === 'denied' && (
        <div className="fixed inset-0 z-[95] bg-[#050002] flex flex-col items-center justify-center select-none cursor-default overflow-hidden"
             onClick={() => setDeniedClicks(c => c + 1)}>
          <Static color="255,40,60" alpha={0.05} />
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,.85) 100%)' }} />
          <div className="relative font-bold text-6xl md:text-9xl tracking-[0.2em] text-[#e0102a]"
               style={{ animation: 'anomaly-glitch 2.2s linear infinite', textShadow: '0 0 40px rgba(224,16,42,.55)' }}>
            禁止进入
            <span aria-hidden className="absolute inset-0 text-cyan-300/40" style={{ transform: 'translate(4px,0)', clipPath: 'inset(0 0 60% 0)', animation: 'slice 1.9s steps(1) infinite' }}>禁止进入</span>
            <span aria-hidden className="absolute inset-0 text-red-300/50" style={{ transform: 'translate(-5px,0)', clipPath: 'inset(62% 0 0 0)', animation: 'slice 2.3s steps(1) infinite reverse' }}>禁止进入</span>
          </div>
          <div className="relative mt-8 flex items-center gap-4 font-mono text-[#ff3b4f]/70 text-xs md:text-sm tracking-[0.5em]">
            <span className="w-10 h-px bg-current" />ACCESS RESTRICTED<span className="w-10 h-px bg-current" />
          </div>
        </div>
      )}

      {seq === 'tvhead' && (
        <div className="fixed inset-0 z-[95] bg-[#02040a] flex flex-col items-center justify-center select-none overflow-hidden px-4 gap-2">
          <Static color="125,180,255" alpha={0.025} />
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 35%, rgba(60,110,200,.22) 0%, transparent 55%)' }} />
          {/* 电视头：第二章的体素模型，亮起后轻轻呼吸 */}
          <div className="relative shrink-0" style={{ animation: 'tv-on 0.7s ease-out forwards, tv-breathe 3s ease-in-out 0.7s infinite' }}>
            <TvHead3D size={240} />
          </div>
          {/* 小豆的蓝色终端 */}
          <div className="relative w-full max-w-xl border border-[#7db4ff]/40 bg-[#040a18]/85"
               style={{ boxShadow: '0 0 40px rgba(125,180,255,.18), inset 0 0 30px rgba(125,180,255,.06)' }}>
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[#7db4ff]/30 font-mono text-[11px] text-[#7db4ff]/70">
              <span className="w-2 h-2 rounded-full bg-[#7db4ff]/70" />tvhead@panda-gatekeeper<span className="ml-auto">tty1</span>
            </div>
            <div className="px-4 py-3 font-mono text-[12px] md:text-sm leading-relaxed text-[#9cc6ff] min-h-[14rem]"
                 style={{ textShadow: '0 0 8px rgba(125,180,255,0.5)' }}>
              {hackTyped.map((line, i) => (
                <div key={i} className="whitespace-pre-wrap min-h-[1.4em]"
                     style={{ color: line.includes('ACCESS BAN LIFTED') ? '#e6f1ff' : line.startsWith('  ●') ? '#ffb3bb' : line.includes('OK') ? '#b7f5d0' : undefined, fontWeight: line.includes('ACCESS BAN LIFTED') ? 700 : undefined }}>
                  {line}
                </div>
              ))}
              {hackProgress !== null && (
                <div className="flex items-center gap-3 my-1">
                  <span className="shrink-0">{'  revoking'}</span>
                  <div className="flex-1 h-3.5 border max-w-[260px] overflow-hidden" style={{ borderColor: '#7db4ff' }}>
                    <div className="h-full" style={{ width: `${hackProgress}%`, background: 'repeating-linear-gradient(90deg, #7db4ff 0 6px, rgba(125,180,255,.55) 6px 8px)', boxShadow: '0 0 10px rgba(125,180,255,0.8)' }} />
                  </div>
                  <span className="w-10 text-right tabular-nums">{hackProgress}%</span>
                </div>
              )}
              {hackCur !== '' && (
                <div className="whitespace-pre-wrap min-h-[1.4em]">
                  {hackCur}<span style={{ animation: 'cursor-blink 1s step-end infinite' }}>█</span>
                </div>
              )}
              {hackCur === '' && hackProgress === null && (
                <span style={{ animation: 'cursor-blink 1s step-end infinite' }}>█</span>
              )}
            </div>
            <div className="absolute inset-0 pointer-events-none opacity-25" style={{ background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.5) 0px, rgba(0,0,0,0.5) 1px, transparent 1px, transparent 3px)' }} />
          </div>
        </div>
      )}

      {/* 特殊CG弹窗 */}
      {showCG && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-8" onClick={() => setShowCG(false)}>
          <div className="relative border-8 border-white shadow-[0_0_50px_rgba(236,72,153,0.5)] bg-white/50 p-2 transform rotate-1 hover:rotate-0 transition-transform duration-500 max-w-[90vw] max-h-[90vh]">
            <button
              onClick={(e) => { e.stopPropagation(); setShowCG(false); }}
              className="absolute -top-6 -right-6 bg-red-500 text-white p-2 rounded-full border-4 border-white hover:bg-red-600 z-10">
              <X size={24} />
            </button>
            {imgError ? (
              <div className="w-[300px] h-[300px] flex flex-col items-center justify-center bg-gray-200 text-gray-500 font-bold p-4 text-center">
                <ImageOff size={48} className="mb-2" />
                <p>无法显示图片</p>
                <p className="text-xs mt-2 font-mono text-red-400">请确保根目录下存在:<br />special_cg.png</p>
              </div>
            ) : (
              <>
                <img src={SPECIAL_CG_URL} alt="Special CG" onError={() => setImgError(true)}
                  className="w-full h-auto max-h-[75vh] object-contain pixelated" style={{ imageRendering: 'pixelated' }} />
                <span className="absolute bottom-4 right-5 text-white font-bold italic text-sm md:text-lg pointer-events-none"
                      style={{ textShadow: '0 2px 4px rgba(0,0,0,0.9), 0 0 12px rgba(0,0,0,0.6)' }}>
                  to be continue......
                </span>
              </>
            )}
            <p className="text-center mt-4 text-white font-bold text-xl drop-shadow-[0_2px_0_rgba(0,0,0,1)]">
              感谢游玩！室守星沙是真实的！
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MainMenu;
