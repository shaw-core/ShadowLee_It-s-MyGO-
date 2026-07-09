import React, { useState, useEffect } from 'react';
import { BookHeart, Star, X, ImageOff, Sparkles, Shirt, Camera, Music, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { SPECIAL_CG_URL } from '../constants';
import { GAME_VERSION } from '../version';

interface MainMenuProps {
  onStart2D: () => void;
  onStart3D: () => void;
  onGallery: () => void;
  onSkinSelect?: () => void;
  onSecretEnding?: () => void;
  isGameCleared: boolean;      // 第一章（2D）通关
  is3DCleared?: boolean;       // 第二章（3D）通关
  isFullCompletion?: boolean;
  hasSpecialCG?: boolean;
  onSpecialCG3D?: () => void;
  onCheatUnlock?: () => void;
  bgmName?: string;
  onPrevBgm?: () => void;
  onNextBgm?: () => void;
  systemAnomaly?: boolean;     // 入侵隐藏终端后：世界系统异常
  onDismissAnomaly?: () => void;
}

const MainMenu: React.FC<MainMenuProps> = ({
  onStart2D, onStart3D, onGallery, onSkinSelect, onSecretEnding,
  isGameCleared, is3DCleared, isFullCompletion, hasSpecialCG,
  onSpecialCG3D, onCheatUnlock, bgmName, onPrevBgm, onNextBgm, systemAnomaly, onDismissAnomaly,
}) => {
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

  // 小豆的入侵脚本：登录 → sudo 提权 → 解除禁令 → exit
  const HACK_LINES = [
    'panda-gatekeeper login: tvhead',
    'password: ············',
    '',
    'tvhead@panda:~$ sudo -i',
    '[sudo] password for tvhead: ············',
    '',
    'root@panda:~# gatekeeper --status',
    '  ● access_ban : ACTIVE  (target = WORLD_UI)',
    'root@panda:~# gatekeeper --revoke access_ban --auth TVHEAD_ADMIN',
    '  revoking lock ............... OK',
    '  ACCESS BAN LIFTED',
    'root@panda:~# exit',
    'logout',
  ];

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

  // 电视头终端：逐字打印（带键盘敲击声），打完 exit 自动回标题
  useEffect(() => {
    if (seq !== 'tvhead') return;
    let alive = true;
    const timers: ReturnType<typeof setTimeout>[] = [];
    setHackTyped([]);
    setHackCur('');
    // 屏幕点亮音
    seqBlip(180, 0.35, 'sine', 0.12, 420);
    const run = async () => {
      await new Promise<void>(res => { timers.push(setTimeout(res, 900)); }); // 亮起后停顿
      for (const line of HACK_LINES) {
        if (!alive) return;
        for (let ci = 1; ci <= line.length; ci++) {
          if (!alive) return;
          setHackCur(line.slice(0, ci));
          if (line[ci - 1] !== ' ') seqBlip(1700 + Math.random() * 1500, 0.02, 'square', 0.07);
          await new Promise<void>(res => { timers.push(setTimeout(res, 26 + Math.random() * 14)); });
        }
        setHackTyped(prev => [...prev, line]);
        setHackCur('');
        seqBlip(340, 0.04, 'square', 0.06); // 回车
        await new Promise<void>(res => { timers.push(setTimeout(res, line === '' ? 90 : line.includes('OK') || line.includes('LIFTED') ? 500 : 240)); });
      }
      if (!alive) return;
      await new Promise<void>(res => { timers.push(setTimeout(res, 700)); });
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
    if (clickCount + 1 >= 5 && onCheatUnlock) {
      onCheatUnlock();
      setClickCount(0);
    }
  };

  return (
    <div className="w-full h-screen flex flex-col items-center bg-[#FEF7CD] text-blue-900 relative overflow-y-auto font-pixel">
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
          0% { opacity: 0; transform: scale(0.94); filter: drop-shadow(0 0 0 rgba(125,180,255,0)); }
          100% { opacity: 1; transform: scale(1); filter: drop-shadow(0 0 26px rgba(125,180,255,0.7)); }
        }
        @keyframes tv-breathe {
          0%, 100% { filter: drop-shadow(0 0 18px rgba(125,180,255,0.5)); }
          50% { filter: drop-shadow(0 0 40px rgba(125,180,255,0.9)); }
        }
      `}</style>

      {/* 经典背景装饰 */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full manga-pattern opacity-10"></div>
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl animate-pulse rect-pixel"></div>
        <div className="absolute bottom-1/4 right-1/4 w-32 h-32 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="z-10 flex flex-col items-center my-auto py-10 w-full px-4">
        {/* 大标题（经典样式） */}
        <div className="text-center select-none space-y-4">
          <h1
            onClick={handleTitleClick}
            className="text-4xl md:text-6xl font-bold tracking-tighter text-blue-600 drop-shadow-[4px_4px_0_#fff] cursor-pointer active:scale-95 transition-transform leading-tight"
            title=""
          >
            李豆沙的次元冲刺
          </h1>
          <p className="text-lg md:text-xl text-blue-800 font-bold tracking-widest uppercase bg-white px-6 py-2 inline-block border-4 border-blue-200">
            - 秘密百合漫画册 -
          </p>
        </div>

        {/* 章节选择 */}
        <div className="flex flex-col gap-4 w-full max-w-md mt-8">
          <button
            onClick={onStart2D}
            className="group relative flex items-center gap-4 px-5 py-4 bg-white border-4 border-blue-500 retro-border shadow-[6px_6px_0_0_#1e3a8a] hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0_0_#1e3a8a] transition-all text-left"
          >
            <span className="text-3xl font-bold text-blue-300 group-hover:text-blue-500 transition-colors leading-none">壹</span>
            <span className="flex flex-col">
              <span className="text-lg font-bold text-blue-800">第一章 · 漫画的世界{isGameCleared ? ' ★' : ''}</span>
              <span className="text-xs text-blue-500">被封印在分镜里的两个人 {isGameCleared ? '｜二周目已解锁' : ''}</span>
            </span>
            <span className="ml-auto text-blue-300 group-hover:translate-x-1 transition-transform">▶</span>
          </button>

          <button
            onClick={onStart3D}
            className="group relative flex items-center gap-4 px-5 py-4 bg-white border-4 border-pink-500 retro-border shadow-[6px_6px_0_0_#9d174d] hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0_0_#9d174d] transition-all text-left"
          >
            <span className="text-3xl font-bold text-pink-300 group-hover:text-pink-500 transition-colors leading-none">贰</span>
            <span className="flex flex-col">
              <span className="text-lg font-bold text-pink-700">第二章 · 多边形的世界{is3DCleared ? ' ★' : ''}</span>
              <span className="text-xs text-pink-500">门的另一侧，是多出来的一维 {is3DCleared ? '｜二周目已解锁' : ''}</span>
            </span>
            <span className="ml-auto text-pink-300 group-hover:translate-x-1 transition-transform">▶</span>
          </button>

          {/* 次级功能 */}
          <div className="grid grid-cols-2 gap-3 mt-1">
            <button onClick={onGallery}
              className="flex items-center justify-center px-3 py-2.5 bg-white border-4 border-blue-500 text-blue-600 font-bold text-sm hover:bg-pink-50 hover:border-pink-400 hover:text-pink-500 retro-border shadow-[3px_3px_0_0_#93c5fd] hover:translate-y-0.5 hover:shadow-none transition-all">
              <BookHeart className="mr-1.5" size={16} /> 记忆图鉴
            </button>
            {onSkinSelect && (
              <button onClick={onSkinSelect}
                className="flex items-center justify-center px-3 py-2.5 bg-white border-4 border-blue-500 text-blue-600 font-bold text-sm hover:bg-blue-50 hover:border-blue-400 retro-border shadow-[3px_3px_0_0_#93c5fd] hover:translate-y-0.5 hover:shadow-none transition-all">
                <Shirt className="mr-1.5" size={16} /> 外观选择
              </button>
            )}
            {is3DCleared && onSpecialCG3D && (
              <button onClick={onSpecialCG3D}
                className="flex items-center justify-center px-3 py-2.5 bg-orange-400 border-4 border-orange-600 text-white font-bold text-sm hover:bg-orange-300 retro-border shadow-[3px_3px_0_0_#9a3412] hover:translate-y-0.5 hover:shadow-none transition-all">
                <Camera className="mr-1.5" size={16} /> 后编合影
              </button>
            )}
            {hasSpecialCG && (
              <button onClick={() => { setShowCG(true); setImgError(false); }}
                className="flex items-center justify-center px-3 py-2.5 bg-pink-500 border-4 border-pink-700 text-white font-bold text-sm hover:bg-pink-400 retro-border shadow-[3px_3px_0_0_#be185d] hover:translate-y-0.5 hover:shadow-none transition-all animate-pulse">
                <Star className="mr-1.5" size={16} /> 特别回顾
              </button>
            )}
          </div>

          {/* BGM 选择器 */}
          {bgmName && (
            <div className="flex items-center justify-between px-3 py-2 bg-white border-4 border-blue-200 retro-border mt-1">
              <span className="flex items-center text-blue-500 text-xs font-bold"><Music size={14} className="mr-1.5" /> BGM</span>
              <div className="flex items-center gap-2">
                <button onClick={onPrevBgm} className="text-blue-400 hover:text-pink-500 p-0.5"><ChevronLeft size={16} /></button>
                <span className="text-xs font-bold text-blue-700 min-w-[130px] text-center">{bgmName}</span>
                <button onClick={onNextBgm} className="text-blue-400 hover:text-pink-500 p-0.5"><ChevronRight size={16} /></button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 底栏 */}
      <div className="z-10 w-full flex items-center justify-between px-6 pb-4 text-[10px] md:text-xs text-blue-400">
        <span>{GAME_VERSION}</span>
        <span className="animate-pulse">按 [Q] 键切换现实与线框</span>
        <span className="opacity-60">© ShadowLee</span>
      </div>

      {/* 隐藏结局入口 */}
      {isGameCleared && onSecretEnding && (
        <button
          onClick={isFullCompletion ? onSecretEnding : undefined}
          className={`absolute bottom-10 right-8 transition-transform hover:scale-110 flex flex-col items-center z-10 ${
            isFullCompletion ? 'text-blue-400 hover:text-blue-600 animate-pulse cursor-pointer' : 'text-gray-300 cursor-not-allowed opacity-50'
          }`}
          title={isFullCompletion ? '进入真结局' : '需要100%收集'}
        >
          <Sparkles size={32} fill="currentColor" />
          {!isFullCompletion && <span className="text-[10px] mt-1 font-bold">???</span>}
        </button>
      )}

      {/* 世界系统异常：全屏警告（入侵隐藏终端后出现） */}
      {systemAnomaly && seq === 'idle' && (
        <div className="fixed inset-0 z-[90] bg-black/75 flex items-center justify-center p-6">
          <div className="relative w-full max-w-xl border-4 border-red-500 bg-red-950/80 backdrop-blur-sm text-red-400 px-8 py-8 overflow-hidden"
               style={{ animation: 'anomaly-glitch 2.4s linear infinite', boxShadow: '0 0 40px rgba(220,38,38,0.55), inset 0 0 30px rgba(220,38,38,0.2)' }}>
            {/* 扫描线 */}
            <div className="absolute left-0 w-full h-8 bg-red-500/10 pointer-events-none"
                 style={{ animation: 'anomaly-scan 2.8s linear infinite' }} />
            <div className="absolute inset-0 pointer-events-none opacity-30"
                 style={{ background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.4) 0px, rgba(0,0,0,0.4) 1px, transparent 1px, transparent 3px)' }} />

            <div className="flex items-center justify-center font-bold text-2xl md:text-3xl mb-4 tracking-wider"
                 style={{ textShadow: '2px 0 0 rgba(0,255,255,0.5), -2px 0 0 rgba(255,0,0,0.7)' }}>
              <AlertTriangle size={32} className="mr-3 animate-pulse" /> WORLD SYSTEM WARNING
            </div>
            <div className="font-mono text-sm md:text-base leading-loose text-center text-red-300">
              世界完整性校验失败<br />
              检测到未授权访问痕迹 —— 权限等级：TVHEAD_ADMIN<br />
              [P.A.N.D.A.] 监察进程已被唤醒<br />
              <span className="opacity-60 text-xs">该事件将被记录，并同步至更高一层。</span>
            </div>
            <div className="mt-6 flex justify-center">
              <button onClick={() => { ensureSeqCtx(); setSeq('denied'); }}
                className="border-2 border-red-400 px-8 py-2 font-mono font-bold tracking-[0.3em] text-red-300 hover:bg-red-500 hover:text-black transition-colors">
                [ 确认 ]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 隐藏结局后的标题页演出 ===== */}
      {seq === 'denied' && (
        <div className="fixed inset-0 z-[95] bg-black flex flex-col items-center justify-center select-none cursor-default"
             onClick={() => setDeniedClicks(c => c + 1)}>
          <div className="text-red-600 font-bold text-6xl md:text-8xl tracking-[0.2em]"
               style={{ animation: 'anomaly-glitch 2.2s linear infinite', textShadow: '3px 0 0 rgba(0,255,255,0.4), -3px 0 0 rgba(255,0,0,0.6)' }}>
            禁止进入
          </div>
          <div className="mt-6 font-mono text-red-800 text-sm tracking-[0.5em]">ACCESS RESTRICTED</div>
        </div>
      )}

      {seq === 'tvhead' && (
        <div className="fixed inset-0 z-[95] bg-black flex flex-col items-center justify-center select-none overflow-hidden px-4">
          {/* 电视头：亮起后轻微呼吸光 */}
          <div className="relative w-60 h-40 md:w-72 md:h-48 bg-[#15181f] rounded-xl border-4 border-[#3a4152] shrink-0"
               style={{ animation: 'tv-on 0.7s ease-out forwards, tv-breathe 3s ease-in-out 0.7s infinite' }}>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-5">
              <div className="flex gap-8">
                <div className="w-14 h-3.5 md:w-16 md:h-4 rounded-full bg-[#7db4ff]" />
                <div className="w-14 h-3.5 md:w-16 md:h-4 rounded-full bg-[#7db4ff]" />
              </div>
              <svg width="76" height="28" viewBox="0 0 90 34">
                <path d="M 8 8 A 16 16 0 0 0 44 8" fill="none" stroke="#7db4ff" strokeWidth="8" strokeLinecap="round" />
                <path d="M 46 8 A 16 16 0 0 0 82 8" fill="none" stroke="#7db4ff" strokeWidth="8" strokeLinecap="round" />
              </svg>
            </div>
            <div className="absolute inset-0 rounded-lg pointer-events-none opacity-30"
                 style={{ background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.5) 0px, rgba(0,0,0,0.5) 1px, transparent 1px, transparent 3px)' }} />
          </div>
          {/* 小豆的蓝色终端 */}
          <div className="w-full max-w-xl mt-6 font-mono text-[12px] md:text-sm leading-relaxed text-[#7db4ff]"
               style={{ textShadow: '0 0 8px rgba(125,180,255,0.5)' }}>
            {hackTyped.map((line, i) => (
              <div key={i} className="whitespace-pre-wrap min-h-[1.4em]">{line}</div>
            ))}
            {hackCur !== '' && (
              <div className="whitespace-pre-wrap min-h-[1.4em]">
                {hackCur}<span style={{ animation: 'cursor-blink 1s step-end infinite' }}>█</span>
              </div>
            )}
            {hackCur === '' && hackTyped.length < 13 && (
              <span style={{ animation: 'cursor-blink 1s step-end infinite' }}>█</span>
            )}
          </div>
          <style>{`@keyframes cursor-blink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }`}</style>
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
