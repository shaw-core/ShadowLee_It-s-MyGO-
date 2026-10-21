// 音频相关的一句话轻提示（悠亚来了 / 离开 / 随身听新增曲目 / 音源未安装）
// 不挡操作、不抢焦点；几秒后自己消失。
import React, { useSyncExternalStore } from 'react';
import { notices } from '../core/audio';

const AudioNotice: React.FC = () => {
  const items = useSyncExternalStore(notices.subscribe, notices.getSnapshot);
  if (!items.length) return null;
  return (
    <div className="fixed top-14 left-1/2 -translate-x-1/2 z-[96] flex flex-col items-center gap-2 pointer-events-none" role="status" aria-live="polite">
      {items.map(n => (
        <div key={n.id} className="px-4 py-1.5 rounded-full text-sm font-bold bg-ink/85 text-paper border-2 border-paper/80 shadow-lg anim-fade whitespace-nowrap max-w-[92vw] truncate">
          {n.text}
        </div>
      ))}
    </div>
  );
};
export default AudioNotice;
