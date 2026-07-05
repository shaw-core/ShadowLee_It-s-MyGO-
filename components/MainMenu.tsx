import React, { useState } from 'react';
import { Play, BookHeart, Star, X, ImageOff, Sparkles, Shirt, Camera } from 'lucide-react';
import { SPECIAL_CG_URL } from '../constants';

interface MainMenuProps {
  onStart2D: () => void;
  onStart3D: () => void;
  onGallery: () => void;
  onSkinSelect?: () => void;
  onSecretEnding?: () => void;
  isGameCleared: boolean;      // 前编（2D）通关
  is3DCleared?: boolean;       // 后编（3D）通关
  isFullCompletion?: boolean;
  hasSpecialCG?: boolean;
  onSpecialCG3D?: () => void;
  onCheatUnlock?: () => void; // New cheat prop
}

const MainMenu: React.FC<MainMenuProps> = ({ onStart2D, onStart3D, onGallery, onSkinSelect, onSecretEnding, isGameCleared, is3DCleared, isFullCompletion, hasSpecialCG, onSpecialCG3D, onCheatUnlock }) => {
  const [showCG, setShowCG] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [clickCount, setClickCount] = useState(0);

  const handleTitleClick = () => {
    setClickCount(prev => prev + 1);
    if (clickCount + 1 >= 5 && onCheatUnlock) {
      onCheatUnlock();
      setClickCount(0);
      // Optional: alert('Developer Mode: All Unlocked!');
    }
  };

  return (
    <div className="w-full h-screen flex flex-col items-center bg-[#FEF7CD] text-blue-900 relative overflow-y-auto font-pixel">
      {/* Background decoration */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full manga-pattern opacity-10"></div>
          <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl animate-pulse rect-pixel"></div>
          <div className="absolute bottom-1/4 right-1/4 w-32 h-32 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{animationDelay: '1s'}}></div>
      </div>

      <div className="z-10 text-center space-y-5 my-auto py-10">
        <h1 
            onClick={handleTitleClick}
            className="text-4xl md:text-6xl font-bold tracking-tighter mb-2 text-blue-600 drop-shadow-[4px_4px_0_#fff] cursor-pointer select-none active:scale-95 transition-transform"
            title="Continuous Click 5 times to unlock ALL"
        >
            李豆沙的<br/>次元冲刺
        </h1>
        <p className="text-xl text-blue-800 font-bold tracking-widest uppercase bg-white px-6 py-2 inline-block border-4 border-blue-200">
          - 秘密百合漫画册 -
        </p>

        <div className="flex flex-col gap-3 w-72 mx-auto pt-6">
          <button 
            onClick={onStart2D}
            className="group flex items-center justify-center px-6 py-3 bg-blue-500 text-white font-bold text-lg border-4 border-blue-700 hover:bg-blue-400 hover:border-blue-500 transition-none retro-border shadow-[4px_4px_0_0_#1e3a8a] hover:translate-y-1 hover:shadow-none"
          >
            <Play className="mr-2 group-hover:fill-current" />
            <span className="flex flex-col items-start leading-tight">
              <span>前编 · 像素篇{isGameCleared ? ' ★' : ''}</span>
              <span className="text-xs font-normal opacity-80">经典 2D {isGameCleared ? '(二周目)' : ''}</span>
            </span>
          </button>

          <button 
            onClick={onStart3D}
            className="group flex items-center justify-center px-6 py-3 bg-pink-500 text-white font-bold text-lg border-4 border-pink-700 hover:bg-pink-400 hover:border-pink-500 transition-none retro-border shadow-[4px_4px_0_0_#9d174d] hover:translate-y-1 hover:shadow-none"
          >
            <Sparkles className="mr-2" />
            <span className="flex flex-col items-start leading-tight">
              <span>后编 · 多边形篇{is3DCleared ? ' ★' : ''}</span>
              <span className="text-xs font-normal opacity-80">全新 3D {is3DCleared ? '(二周目)' : ''}</span>
            </span>
          </button>
          
          <button 
            onClick={onGallery}
            className="flex items-center justify-center px-6 py-3 bg-white border-4 border-blue-500 text-blue-600 font-bold text-lg hover:bg-pink-50 hover:border-pink-400 hover:text-pink-500 transition-none retro-border shadow-[4px_4px_0_0_#93c5fd] hover:translate-y-1 hover:shadow-none"
          >
            <BookHeart className="mr-2" /> 记忆图鉴
          </button>

          {onSkinSelect && (
            <button 
              onClick={onSkinSelect}
              className="flex items-center justify-center px-6 py-3 bg-white border-4 border-blue-500 text-blue-600 font-bold text-lg hover:bg-blue-50 hover:border-blue-400 transition-none retro-border shadow-[4px_4px_0_0_#93c5fd] hover:translate-y-1 hover:shadow-none"
            >
              <Shirt className="mr-2" /> 外观选择
            </button>
          )}

          {is3DCleared && onSpecialCG3D && (
             <button
                onClick={onSpecialCG3D}
                className="flex items-center justify-center px-6 py-3 bg-orange-400 border-4 border-orange-600 text-white font-bold text-lg hover:bg-orange-300 transition-none retro-border shadow-[4px_4px_0_0_#9a3412] hover:translate-y-1 hover:shadow-none"
             >
                <Camera className="mr-2" /> 后编 · 合影
             </button>
          )}

          {hasSpecialCG && (
             <button 
                onClick={() => { setShowCG(true); setImgError(false); }}
                className="flex items-center justify-center px-6 py-3 bg-pink-500 border-4 border-pink-700 text-white font-bold text-lg hover:bg-pink-400 transition-none retro-border shadow-[4px_4px_0_0_#be185d] hover:translate-y-1 hover:shadow-none animate-pulse"
             >
                <Star className="mr-2" /> 特别回顾
             </button>
          )}
        </div>
      </div>
      
      <div className="mt-8 text-blue-400 text-xs animate-pulse z-10">
         按 [Q] 键切换现实与漫画
      </div>

      {/* Secret Ending Trigger - Visible but disabled if not full completion */}
      {isGameCleared && onSecretEnding && (
          <button 
            onClick={isFullCompletion ? onSecretEnding : undefined}
            className={`absolute bottom-8 right-8 transition-transform hover:scale-110 flex flex-col items-center ${
                isFullCompletion ? 'text-blue-400 hover:text-blue-600 animate-pulse cursor-pointer' : 'text-gray-300 cursor-not-allowed opacity-50'
            }`}
            title={isFullCompletion ? "进入真结局" : "需要100%收集"}
          >
            <Sparkles size={32} fill="currentColor" />
            {!isFullCompletion && <span className="text-[10px] mt-1 font-bold">???</span>}
          </button>
      )}

      {/* Special CG Modal */}
      {showCG && (
          <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-8" onClick={() => setShowCG(false)}>
             <div className="relative border-8 border-white shadow-[0_0_50px_rgba(236,72,153,0.5)] bg-white/50 p-2 transform rotate-1 hover:rotate-0 transition-transform duration-500 max-w-[90vw] max-h-[90vh]">
                <button 
                    onClick={(e) => { e.stopPropagation(); setShowCG(false); }}
                    className="absolute -top-6 -right-6 bg-red-500 text-white p-2 rounded-full border-4 border-white hover:bg-red-600 z-10"
                >
                    <X size={24} />
                </button>
                
                {imgError ? (
                    <div className="w-[300px] h-[300px] flex flex-col items-center justify-center bg-gray-200 text-gray-500 font-bold p-4 text-center">
                        <ImageOff size={48} className="mb-2" />
                        <p>无法显示图片</p>
                        <p className="text-xs mt-2 font-mono text-red-400">请确保根目录下存在:<br/>special_cg.png</p>
                    </div>
                ) : (
                    <img 
                        src={SPECIAL_CG_URL} 
                        alt="Special CG" 
                        onError={() => setImgError(true)}
                        className="w-full h-auto max-h-[75vh] object-contain pixelated"
                        style={{ imageRendering: 'pixelated' }}
                    />
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