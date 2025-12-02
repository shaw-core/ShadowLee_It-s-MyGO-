import React, { useState, useEffect } from 'react';
import { Home } from 'lucide-react';

interface SecretEndingProps {
  onExit: () => void;
}

const LINES = [
  { text: "你看到了她们真正的结局。", delay: 1000 },
  { text: "如果你想看看她们在现实里是怎样吵架、撒娇、和好——", delay: 2500 },
  { 
    text: "➤ 【室豆沙】因为之前亲亲没报备被疯狂拷打变成了撒娇小狗了好可爱哦", 
    link: "https://www.bilibili.com/video/BV1DLjhzhEdN/",
    delay: 4500 
  },
  { 
    text: "➤ 【室豆沙】小室说可以接受我亲亲但是不能接受我不告诉她", 
    link: "https://www.bilibili.com/video/BV1ZijBzFEMM/",
    delay: 6000 
  },
  { 
    text: "➤ 【室豆沙】睡醒后的对豆沙宠溺的小室", 
    link: "https://www.bilibili.com/video/BV1413gzQESe/",
    delay: 7500 
  },
  { 
    text: "更多故事在这里：https://space.bilibili.com/1703797642/", 
    link: "https://space.bilibili.com/1703797642/",
    delay: 9000 
  },
  { text: "谢谢你愿意陪她们走到这里。", delay: 11000 }
];

const SecretEnding: React.FC<SecretEndingProps> = ({ onExit }) => {
  const [visibleIndex, setVisibleIndex] = useState(-1);
  const [canExit, setCanExit] = useState(false);

  useEffect(() => {
    // Start animation sequence
    const timers: NodeJS.Timeout[] = [];
    
    LINES.forEach((line, index) => {
      const timer = setTimeout(() => {
        setVisibleIndex(index);
      }, line.delay);
      timers.push(timer);
    });

    // Enable exit after last line + 3 seconds to give time for impact
    const exitTimer = setTimeout(() => {
        setCanExit(true);
    }, LINES[LINES.length - 1].delay + 3000);
    timers.push(exitTimer);

    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="fixed inset-0 bg-[#0f172a] text-gray-200 font-sans flex flex-col items-center justify-center p-8 z-50 overflow-y-auto">
      <div className="max-w-3xl w-full space-y-6 text-center">
        {LINES.map((line, index) => (
          <div 
            key={index}
            className={`transition-opacity duration-1000 ${index <= visibleIndex ? 'opacity-100' : 'opacity-0'}`}
          >
            {line.link ? (
              <a 
                href={line.link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 hover:underline block py-2 text-lg md:text-xl transition-colors"
              >
                {line.text}
              </a>
            ) : (
              <p className={`text-lg md:text-2xl ${index === LINES.length - 1 ? "mt-16 text-white font-bold" : "text-gray-300"}`}>
                {line.text}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className={`transition-opacity duration-1000 mt-16 ${canExit ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
         <button 
           onClick={onExit}
           className="text-gray-500 hover:text-white transition-colors animate-pulse flex items-center gap-2 px-6 py-3 border border-gray-700 rounded-full hover:border-gray-400"
         >
            <Home size={16} /> 点击返回标题
         </button>
      </div>
    </div>
  );
};

export default SecretEnding;