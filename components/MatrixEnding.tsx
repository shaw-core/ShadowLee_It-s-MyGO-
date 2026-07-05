import React, { useEffect, useRef, useState, useCallback } from 'react';

interface MatrixEndingProps {
  onExit: () => void;
}

// 终端逐字打印的结局文本
const TERMINAL_LINES = [
  '> connection to WORLD_02 [LOWPOLY] ......... lost',
  '> 检测到 2 个未注册对象越过世界边界',
  '> 对象追踪 ......... 丢失',
  '> 存档锚点响应 ...... 无',
  '',
  '> PROJECT SHADOWLEE',
  '> EPISODE 2 ................ CLEAR',
  '',
  '> NEXT WORLD LOADING ▓▓▓▓░░░░░░░░ 31%',
  '> 新的世界还没有加载完成。',
  '> 远处，一个陌生的天空正在上色。',
  '> 而在她们看不见的角落——',
  '> 一只新的熊猫存档点，慢慢亮了起来。',
  '',
  '> [SYSTEM] press EXIT to leave this world',
];

const TYPE_MS = 34;       // 每个字符
const LINE_PAUSE_MS = 320; // 每行结束停顿
const RAIN_FULL_MS = 2200; // 字符雨全亮时长
const RAIN_FADE_MS = 1900; // 字符雨褪去时长

const MatrixEnding: React.FC<MatrixEndingProps> = ({ onExit }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [typed, setTyped] = useState<string[]>([]);   // 已完成的行
  const [currentLine, setCurrentLine] = useState(''); // 正在打的行
  const [done, setDone] = useState(false);
  const [crtOff, setCrtOff] = useState(false);
  const skipRef = useRef(false);

  // ---- 背景矩阵字符雨（自动褪去） ----
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    const CHARS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789ABCDEFXZ<>+*';
    const fontSize = 16;
    let cols = Math.floor(canvas.width / fontSize);
    let drops = Array.from({ length: cols }, () => Math.floor(Math.random() * -40));
    const start = performance.now();
    let raf = 0;

    const loop = (now: number) => {
      const elapsed = now - start;
      // 全亮 → 线性褪去 → 结束
      const fade = elapsed < RAIN_FULL_MS ? 1 : Math.max(0, 1 - (elapsed - RAIN_FULL_MS) / RAIN_FADE_MS);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (fade > 0) {
        ctx.font = `${fontSize}px monospace`;
        if (Math.floor(canvas.width / fontSize) !== cols) {
          cols = Math.floor(canvas.width / fontSize);
          drops = Array.from({ length: cols }, () => Math.floor(Math.random() * -40));
        }
        for (let i = 0; i < cols; i++) {
          const ch = CHARS[Math.floor(Math.random() * CHARS.length)];
          const bright = Math.random() < 0.06;
          ctx.fillStyle = bright
            ? `rgba(190, 255, 200, ${0.95 * fade})`
            : `rgba(32, 194, 94, ${(0.5 + Math.random() * 0.4) * fade})`;
          ctx.fillText(ch, i * fontSize, drops[i] * fontSize);
          if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
          drops[i]++;
        }
        raf = requestAnimationFrame(loop);
      } else {
        // 彻底褪去后擦黑一次，停止渲染
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  // ---- 终端逐字打印（字符雨开始褪去后启动；点击可快进） ----
  useEffect(() => {
    let alive = true;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const startTyping = async () => {
      for (let li = 0; li < TERMINAL_LINES.length; li++) {
        const line = TERMINAL_LINES[li];
        if (!alive) return;
        if (skipRef.current) {
          setTyped(TERMINAL_LINES);
          setCurrentLine('');
          setDone(true);
          return;
        }
        for (let ci = 1; ci <= line.length; ci++) {
          if (!alive) return;
          if (skipRef.current) break;
          setCurrentLine(line.slice(0, ci));
          await new Promise<void>(res => { timers.push(setTimeout(res, TYPE_MS)); });
        }
        setTyped(prev => [...prev, line]);
        setCurrentLine('');
        if (!skipRef.current) {
          await new Promise<void>(res => { timers.push(setTimeout(res, line === '' ? 120 : LINE_PAUSE_MS)); });
        }
      }
      if (alive) {
        if (skipRef.current) setTyped(TERMINAL_LINES);
        setDone(true);
      }
    };
    const kick = setTimeout(startTyping, RAIN_FULL_MS + 500);
    timers.push(kick);
    return () => { alive = false; timers.forEach(clearTimeout); };
  }, []);

  const handleSkip = useCallback(() => {
    if (!done) skipRef.current = true;
  }, [done]);

  // ---- CRT 关机 → 返回封面 ----
  const handleExitWorld = () => {
    setCrtOff(true);
    setTimeout(onExit, 1050);
  };

  return (
    <div
      className="fixed inset-0 bg-black overflow-hidden select-none"
      onClick={handleSkip}
      style={{ cursor: done ? 'default' : 'pointer' }}
    >
      {/* CRT 关机动画的自定义关键帧 */}
      <style>{`
        @keyframes crt-shutdown {
          0%   { transform: scaleY(1) scaleX(1); filter: brightness(1); }
          55%  { transform: scaleY(0.006) scaleX(1); filter: brightness(2.6); }
          82%  { transform: scaleY(0.006) scaleX(0.12); filter: brightness(3.2); }
          100% { transform: scaleY(0.004) scaleX(0.002); filter: brightness(4); opacity: 0.9; }
        }
        @keyframes crt-dot-fade {
          0% { opacity: 1; } 100% { opacity: 0; }
        }
        @keyframes cursor-blink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
      `}</style>

      <div
        className="absolute inset-0"
        style={crtOff ? { animation: 'crt-shutdown 0.85s cubic-bezier(0.6, 0, 0.9, 0.4) forwards', transformOrigin: 'center center', background: '#0a0f0a' } : undefined}
      >
        {/* 矩阵字符雨 */}
        <canvas ref={canvasRef} className="absolute inset-0" />

        {/* 终端文字 */}
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div className="w-full max-w-2xl font-mono text-[13px] md:text-base leading-relaxed text-[#20c25e]"
               style={{ textShadow: '0 0 8px rgba(32,194,94,0.55)' }}>
            {typed.map((line, i) => (
              <div key={i} className="whitespace-pre-wrap min-h-[1.4em]">{line}</div>
            ))}
            {!done && (
              <div className="whitespace-pre-wrap min-h-[1.4em]">
                {currentLine}
                <span style={{ animation: 'cursor-blink 1s step-end infinite' }}>█</span>
              </div>
            )}
            {done && (
              <div className="mt-6 flex items-center gap-3">
                <span style={{ animation: 'cursor-blink 1s step-end infinite' }}>█</span>
                <button
                  onClick={(ev) => { ev.stopPropagation(); handleExitWorld(); }}
                  className="border border-[#20c25e] px-6 py-2 text-[#20c25e] hover:bg-[#20c25e] hover:text-black transition-colors tracking-[0.3em] font-bold"
                  style={{ textShadow: 'none' }}
                >
                  [ 退出世界 ]
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 扫描线质感 */}
        <div className="absolute inset-0 pointer-events-none opacity-25"
             style={{ background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.35) 0px, rgba(0,0,0,0.35) 1px, transparent 1px, transparent 3px)' }} />
      </div>

      {/* CRT 熄灭后残留的光点 */}
      {crtOff && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-1.5 h-1.5 rounded-full bg-white"
               style={{ animation: 'crt-dot-fade 0.35s ease-out 0.8s forwards', boxShadow: '0 0 18px 6px rgba(255,255,255,0.8)' }} />
        </div>
      )}
    </div>
  );
};

export default MatrixEnding;
