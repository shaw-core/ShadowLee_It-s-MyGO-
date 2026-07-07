import React, { useState } from 'react';
import { BookHeart, Star, X, ImageOff, Sparkles, Shirt, Camera, Music, ChevronLeft, ChevronRight } from 'lucide-react';
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
}

const MainMenu: React.FC<MainMenuProps> = ({
  onStart2D, onStart3D, onGallery, onSkinSelect, onSecretEnding,
  isGameCleared, is3DCleared, isFullCompletion, hasSpecialCG,
  onSpecialCG3D, onCheatUnlock, bgmName, onPrevBgm, onNextBgm,
}) => {
  const [showCG, setShowCG] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [clickCount, setClickCount] = useState(0);

  const handleTitleClick = () => {
    setClickCount(prev => prev + 1);
    if (clickCount + 1 >= 5 && onCheatUnlock) {
      onCheatUnlock();
      setClickCount(0);
    }
  };

  return (
    <div className="w-full h-screen flex flex-col items-center relative overflow-y-auto font-pixel text-blue-900"
         style={{ background: 'linear-gradient(180deg, #bfdbfe 0%, #e0f0ff 34%, #FEF7CD 100%)' }}>
      <style>{`
        @keyframes float-poly { 0%,100% { transform: translateY(0) rotate(var(--r)); } 50% { transform: translateY(-18px) rotate(calc(var(--r) + 12deg)); } }
        @keyframes title-shine { 0%, 88% { background-position: -220% 0; } 100% { background-position: 220% 0; } }
      `}</style>

      {/* 背景漂浮的低多边形 */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {[
          { l: '8%', t: '16%', s: 56, c: '#93c5fd', r: '12deg', d: '0s' },
          { l: '84%', t: '12%', s: 42, c: '#f9a8d4', r: '-8deg', d: '1.2s' },
          { l: '14%', t: '68%', s: 38, c: '#f9a8d4', r: '24deg', d: '0.6s' },
          { l: '78%', t: '62%', s: 62, c: '#93c5fd', r: '-16deg', d: '1.8s' },
          { l: '46%', t: '8%', s: 30, c: '#a7e0b0', r: '30deg', d: '2.4s' },
          { l: '60%', t: '80%', s: 34, c: '#a7e0b0', r: '-24deg', d: '0.3s' },
        ].map((p, i) => (
          <div key={i} className="absolute opacity-30"
               style={{
                 left: p.l, top: p.t, width: p.s, height: p.s, background: p.c,
                 clipPath: i % 2 === 0 ? 'polygon(50% 0, 100% 100%, 0 100%)' : undefined,
                 ['--r' as string]: p.r,
                 animation: `float-poly ${5 + i}s ease-in-out ${p.d} infinite`,
               }} />
        ))}
        <div className="absolute top-0 left-0 w-full h-full manga-pattern opacity-5" />
      </div>

      <div className="z-10 flex flex-col items-center my-auto py-10 w-full px-4">
        {/* 大标题 */}
        <div className="text-center select-none">
          <p className="text-xs md:text-sm tracking-[0.5em] text-blue-500/70 font-bold mb-2">PROJECT SHADOWLEE</p>
          <h1
            onClick={handleTitleClick}
            className="text-5xl md:text-7xl font-bold tracking-tight cursor-pointer active:scale-95 transition-transform leading-tight"
            style={{
              color: '#2563eb',
              textShadow: '3px 3px 0 #fff, 6px 6px 0 rgba(37,99,235,0.25)',
            }}
            title=""
          >
            李豆沙的次元冲刺
          </h1>
          <div className="mt-2 mx-auto inline-block relative overflow-hidden">
            <p className="text-sm md:text-base text-blue-800 font-bold tracking-[0.4em] bg-white/80 px-5 py-1.5 border-y-4 border-blue-200">
              DIMENSION DASH
            </p>
            <div className="absolute inset-0 pointer-events-none"
                 style={{
                   background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.9) 50%, transparent 60%)',
                   backgroundSize: '220% 100%',
                   animation: 'title-shine 5s linear infinite',
                 }} />
          </div>
        </div>

        {/* 章节选择 */}
        <div className="flex flex-col gap-4 w-full max-w-md mt-8">
          <button
            onClick={onStart2D}
            className="group relative flex items-center gap-4 px-5 py-4 bg-white/90 border-4 border-blue-500 retro-border shadow-[6px_6px_0_0_#1e3a8a] hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0_0_#1e3a8a] transition-all text-left"
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
            className="group relative flex items-center gap-4 px-5 py-4 bg-white/90 border-4 border-pink-500 retro-border shadow-[6px_6px_0_0_#9d174d] hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0_0_#9d174d] transition-all text-left"
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
              className="flex items-center justify-center px-3 py-2.5 bg-white/90 border-4 border-blue-300 text-blue-600 font-bold text-sm hover:border-pink-400 hover:text-pink-500 retro-border shadow-[3px_3px_0_0_#93c5fd] hover:translate-y-0.5 hover:shadow-none transition-all">
              <BookHeart className="mr-1.5" size={16} /> 记忆图鉴
            </button>
            {onSkinSelect && (
              <button onClick={onSkinSelect}
                className="flex items-center justify-center px-3 py-2.5 bg-white/90 border-4 border-blue-300 text-blue-600 font-bold text-sm hover:border-blue-500 retro-border shadow-[3px_3px_0_0_#93c5fd] hover:translate-y-0.5 hover:shadow-none transition-all">
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
            <div className="flex items-center justify-between px-3 py-2 bg-white/70 border-4 border-blue-200 retro-border mt-1">
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
              <img src={SPECIAL_CG_URL} alt="Special CG" onError={() => setImgError(true)}
                className="w-full h-auto max-h-[75vh] object-contain pixelated" style={{ imageRendering: 'pixelated' }} />
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
