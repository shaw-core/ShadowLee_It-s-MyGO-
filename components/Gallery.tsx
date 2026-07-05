import React from 'react';
import { AffectionState } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Heart, ArrowLeft, PlayCircle, Box, Grid2x2 } from 'lucide-react';
import { EVENTS } from '../constants';
import { EVENTS3D } from '../game3d/story3d';

interface GalleryProps {
  affectionData: AffectionState[];
  collectedPages: string[];
  onBack: () => void;
  onReplayEvent: (eventId: string) => void;
}

const PAGES_2D = ['page_ch1', 'page_ch2', 'page_ch3', 'page_ch4', 'page_ch5'];
const PAGES_3D = ['page3d_ch1', 'page3d_ch2', 'page3d_ch3', 'page3d_ch4', 'page3d_ch5'];

const Gallery: React.FC<GalleryProps> = ({ affectionData, collectedPages, onBack, onReplayEvent }) => {

  const getEventForPage = (pageId: string) => {
    return Object.values(EVENTS).find(e => e.requiredPageId === pageId)
        ?? Object.values(EVENTS3D).find(e => e.requiredPageId === pageId);
  };

  const renderPageGrid = (pageIds: string[]) => (
    <div className="grid grid-cols-5 gap-3">
      {pageIds.map((pageId, idx) => {
        const isCollected = collectedPages.includes(pageId);
        const linkedEvent = getEventForPage(pageId);
        return (
          <div
            key={pageId}
            onClick={() => {
              if (isCollected && linkedEvent) onReplayEvent(linkedEvent.id);
            }}
            className={`aspect-[2/3] border-4 relative group overflow-hidden transition-transform ${
              isCollected
                ? 'border-pink-400 bg-white cursor-pointer hover:-translate-y-1 hover:shadow-lg'
                : 'border-gray-200 bg-gray-50 opacity-60'
            }`}>
            {isCollected ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-black font-bold text-center p-1 relative">
                <div className="absolute inset-1 border-2 border-black flex items-center justify-center z-10">
                  <span className="text-[10px] bg-white px-1">SCENE {idx + 1}</span>
                </div>
                <img src={`https://picsum.photos/seed/${pageId}/200/300?grayscale`} alt="Manga Page" className="absolute inset-0 opacity-50 mix-blend-multiply pixelated w-full h-full object-cover" />
                <div className="absolute bottom-1 right-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                  <PlayCircle className="text-pink-500 fill-white" size={20} />
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300 font-pixel text-2xl">
                ?
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FEF7CD] text-blue-900 p-8 font-pixel overflow-y-auto">
      <button onClick={onBack} className="flex items-center text-blue-600 hover:text-blue-900 mb-8 bg-white border-4 border-blue-200 px-4 py-2 hover:border-blue-500 shadow-md">
        <ArrowLeft className="mr-2" /> 返回主菜单
      </button>

      <h1 className="text-4xl font-bold mb-8 text-pink-500 drop-shadow-[2px_2px_0_#fff]">百合回忆录</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

        {/* Affection Stats */}
        <div className="bg-white p-6 border-4 border-blue-200 retro-border shadow-[4px_4px_0_0_#93c5fd]">
           <h2 className="text-2xl font-bold mb-4 flex items-center text-pink-400">
              <Heart className="mr-2 text-pink-500" fill="currentColor" /> 羁绊深度
           </h2>
           <div className="h-64 w-full bg-[#FEF7CD] border-2 border-blue-100 p-2">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={affectionData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis dataKey="name" type="category" stroke="#1e3a8a" width={100} tick={{fontFamily: 'Noto Sans SC'}} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', borderColor: '#1e3a8a', color: '#1e3a8a', fontFamily: 'Noto Sans SC' }}
                    itemStyle={{ color: '#ec4899' }}
                    cursor={{fill: 'rgba(236, 72, 153, 0.1)'}}
                  />
                  <Bar dataKey="value" barSize={30}>
                    {affectionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || '#ec4899'} stroke="#1e3a8a" strokeWidth={2} />
                    ))}
                  </Bar>
               </BarChart>
             </ResponsiveContainer>
           </div>
           <p className="text-xs text-blue-400 mt-4 border-t border-blue-100 pt-2">
             高好感度将解锁特殊结局CG与"直球"对话选项。
           </p>
        </div>

        {/* Comic Collection: 前编 + 后编 */}
        <div className="bg-white p-6 border-4 border-blue-200 retro-border shadow-[4px_4px_0_0_#93c5fd]">
           <h2 className="text-2xl font-bold mb-2 text-blue-400">漫画收藏</h2>
           <p className="text-sm text-gray-400 mb-4">点击已解锁的封面可重温剧情</p>

           <h3 className="flex items-center text-lg font-bold text-blue-600 mb-2">
             <Grid2x2 className="mr-2" size={18} /> 前编 · 像素篇
           </h3>
           {renderPageGrid(PAGES_2D)}

           <h3 className="flex items-center text-lg font-bold text-pink-500 mt-6 mb-2">
             <Box className="mr-2" size={18} /> 后编 · 多边形篇
           </h3>
           {renderPageGrid(PAGES_3D)}
        </div>

      </div>
    </div>
  );
};

export default Gallery;
