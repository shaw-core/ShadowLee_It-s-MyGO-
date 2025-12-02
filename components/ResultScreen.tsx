import React from 'react';
import { LevelResult } from '../types';
import { Star, Clock, Skull, ArrowRight } from 'lucide-react';

interface ResultScreenProps {
  result: LevelResult;
  onContinue: () => void;
}

const ResultScreen: React.FC<ResultScreenProps> = ({ result, onContinue }) => {
  const hasPage = result.collectedIds.some(id => id.startsWith('page'));
  
  return (
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 font-pixel">
      <div className="bg-[#FEF7CD] border-4 border-blue-500 p-8 max-w-md w-full text-center retro-border shadow-[8px_8px_0_0_#1e3a8a] relative text-blue-900">
        
        <h2 className="text-4xl font-bold text-blue-600 mb-6 drop-shadow-[2px_2px_0_#fff]">关卡完成!</h2>

        <div className="space-y-6 mb-8 bg-white/80 p-6 border-2 border-blue-200">
          <div className="flex items-center justify-between text-xl border-b border-blue-100 pb-2">
             <div className="flex items-center text-blue-400"><Clock className="mr-3"/> 用时</div>
             <div className="font-mono text-blue-800">{(result.timeTaken / 1000).toFixed(2)}s</div>
          </div>
          
          <div className="flex items-center justify-between text-xl border-b border-blue-100 pb-2">
             <div className="flex items-center text-blue-400"><Skull className="mr-3 text-red-400"/> 死亡数</div>
             <div className="font-mono text-blue-800">{result.deathCount}</div>
          </div>

          <div className="pt-2">
             <h3 className="text-left text-sm text-blue-400 mb-2">收集品</h3>
             <div className="flex items-center gap-4">
                <div className={`flex flex-col items-center p-2 border-2 ${hasPage ? 'border-pink-400 bg-pink-50 text-pink-500' : 'border-gray-200 text-gray-300'}`}>
                    <Star size={32} fill={hasPage ? "currentColor" : "none"} />
                    <span className="text-xs mt-1">百合页</span>
                </div>
                <div className="flex-1 text-right text-blue-400">
                   找到 {result.collectedIds.filter(id => id.startsWith('shard')).length} 个碎片
                </div>
             </div>
          </div>
        </div>

        {hasPage && (
           <div className="mb-6 text-pink-500 text-sm animate-pulse border-2 border-pink-300 p-2 bg-pink-50 rounded">
              ★ 解锁了新的回忆剧情! ★
           </div>
        )}

        <button 
          onClick={onContinue}
          className="w-full bg-blue-500 text-white font-bold py-4 border-b-8 border-r-8 border-blue-700 active:border-0 active:translate-y-2 hover:bg-blue-400 transition-none flex items-center justify-center shadow-lg"
        >
           继续 <ArrowRight className="ml-2" />
        </button>
      </div>
    </div>
  );
};

export default ResultScreen;