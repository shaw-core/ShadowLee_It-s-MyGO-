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
      {systemAnomaly && (
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
              <button onClick={onDismissAnomaly}
                className="border-2 border-red-400 px-8 py-2 font-mono font-bold tracking-[0.3em] text-red-300 hover:bg-red-500 hover:text-black transition-colors">
                [ 确认 ]
              </button>
            </div>
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
