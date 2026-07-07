import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GAME_VERSION, CHANGELOG } from '../version';

interface MatrixEndingProps {
  onExit: () => void;
  hackAccess?: boolean;   // 使用电视头小豆通关：持有 TVHEAD_ADMIN 权限碎片
}

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

const HACK_LINE = '> [!] 检测到未知权限碎片：TVHEAD_ADMIN —— 是否尝试入侵终端系统？';

// 隐藏系统文件
const HIDDEN_FILES: { name: string; size: string; content: string | null }[] = [
  {
    name: 'dev_notes.txt', size: '2.1 KB',
    content: `[策划备忘 · 节选]

- 存档点必须是"某个人"，不能是系统UI。
  玩家要在情感上欠它一次。
- 晕3D不是惩罚机制。它存在的意义，
  是让薄荷糖变成一份礼物。
- TVHEAD_ADMIN：电视头小豆持有部分系统写入权限
  （来源不明），表现为可自行写入一枚临时锚点。
  该权限等级足以读取本目录。——你现在就在用它。
- 第三关"世界重排"：必须让玩家先亲眼看到，
  再在对话里说破。顺序不能反。
- 砍掉的内容：会驮人的低多边形鲸鱼。
  性能原因。下个世界再见。
- 裂缝不是漏洞。裂缝是门。
  别在正文里承认这一点。`,
  },
  {
    name: 'kimo_bear.md', size: '0.6 KB',
    content: `[角色档案 KIMO-BEAR]

类型：锚点管理者（非本世界原生）
权限：anchor.write / player.rollback
限制：无法离开锚点半径
      无法修改地形
      无法跟随离开本世界

备注：它说它在等的不是"玩家"，
      是"她们"。
      ——这一条不要写进正式设定集。`,
  },
  {
    name: 'level3_shift.src', size: '1.4 KB',
    content: `// L3 世界重排 —— 实装代码片段
{ id: 'l3_shift_trig', type: 'TRIGGER',
  x: 14.9, y: 4.2, z: -7.4,
  w: 4.5, h: 4, d: 4.5,
  layerMask: 'BOTH', shiftGroup: 1 },
{ ...P('l3_r6', 15.5, 2.4, -13.8, 3.0, 3.0, 'MANGA'),
  shiftTo: { x: 12.9, y: 3.7, z: -10.4 },
  shiftGroup: 1 },
{ ...P('l3_r7', 6.2, 2.8, -14.5, 3.0, 3.0, 'REAL'),
  shiftTo: { x: 9.2, y: 4.2, z: -10.9 },
  shiftGroup: 1 },

// ease = k * k * (3 - 2k)  // smoothstep
// 位移时长 0.7s，触发时相机震动 0.55s
// TODO(kimo): 别让她们看到平台没对齐的那一帧`,
  },
  {
    name: 'snap_L1.txt', size: '0.9 KB',
    content: `[渲染快照 L1 · 多出来的一维]
（图像数据已损坏，仅存线框布局）

                          ◇GOAL
                    ┌──┐ /
              ┌──┐  │天│┌────┐
        ▲弹跳菇 │空││岛链│
┌──────┐┌─┐┌─┐│  │└────┘
│ START ││s││s│└──┘
│ ●panda││1││2│   ┌───┐
└──────┘└─┘└─┘═══│ISLE│──page
              线框桥└───┘  (z轴支线)`,
  },
  {
    name: 'snap_L3.txt', size: '0.9 KB',
    content: `[渲染快照 L3 · 线框断层塔]
（图像数据已损坏，仅存线框布局）

            ◇GOAL
   PEAK┐    /
  ┌────┤▓▓▓▓ ←碎裂平台(会塌)
  │重排Ⅱ│
  └─↺──┘      █████
     ┌──────┐ █塔柱█
     │ TOP  │ █████
     └──────┘
   ↺重排Ⅰ：踏板初始错位
    盘旋而上 → 咔哒归位`,
  },
  { name: 'version.log', size: '1.2 KB', content: `${CHANGELOG}\n\n当前构建：${GAME_VERSION}` },
  { name: 'world_03.plan', size: '?? KB', content: null }, // 权限不足
];

const TYPE_MS = 34;
const LINE_PAUSE_MS = 300;
const RAIN_FULL_MS = 2200;
const RAIN_FADE_MS = 1900;

type Phase = 'terminal' | 'hacking' | 'files' | 'viewing';

const MatrixEnding: React.FC<MatrixEndingProps> = ({ onExit, hackAccess }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [typed, setTyped] = useState<string[]>([]);
  const [currentLine, setCurrentLine] = useState('');
  const [done, setDone] = useState(false);
  const [crtOff, setCrtOff] = useState(false);
  const [phase, setPhase] = useState<Phase>('terminal');
  const [hackProgress, setHackProgress] = useState(0);
  const [viewingFile, setViewingFile] = useState<number | null>(null);
  const [deniedFlash, setDeniedFlash] = useState(false);
  const skipRef = useRef(false);

  // ============ WebAudio：环境电流 / 打字声 / 关机音 ============
  const audioRef = useRef<{ ctx: AudioContext; master: GainNode } | null>(null);
  const ensureAudio = useCallback(() => {
    if (audioRef.current) return audioRef.current;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const master = ctx.createGain();
      master.gain.value = 0.3;
      master.connect(ctx.destination);
      audioRef.current = { ctx, master };
      return audioRef.current;
    } catch { return null; }
  }, []);

  const blip = useCallback((freq: number, dur: number, type: OscillatorType = 'square', gain = 0.08, slideTo?: number) => {
    const a = ensureAudio();
    if (!a) return;
    const { ctx, master } = a;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), ctx.currentTime + dur);
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(g); g.connect(master);
    osc.start(); osc.stop(ctx.currentTime + dur + 0.02);
  }, [ensureAudio]);

  const typeSoundRef = useRef(blip);
  useEffect(() => { typeSoundRef.current = blip; }, [blip]);

  // 环境电流：双失谐锯齿波 + 缓慢滤波扫动 + 随机数据音
  useEffect(() => {
    const a = ensureAudio();
    if (!a) return;
    const { ctx, master } = a;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    const drone = ctx.createGain(); drone.gain.value = 0.05;
    const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 220; filter.Q.value = 4;
    const o1 = ctx.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = 54;
    const o2 = ctx.createOscillator(); o2.type = 'sawtooth'; o2.frequency.value = 54.7;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.11;
    const lfoGain = ctx.createGain(); lfoGain.gain.value = 120;
    lfo.connect(lfoGain); lfoGain.connect(filter.frequency);
    o1.connect(filter); o2.connect(filter); filter.connect(drone); drone.connect(master);
    o1.start(); o2.start(); lfo.start();
    // 稀疏的数据蜂鸣
    const dataTimer = setInterval(() => {
      if (Math.random() < 0.35) blip(700 + Math.random() * 1200, 0.06, 'sine', 0.03);
    }, 650);
    return () => {
      clearInterval(dataTimer);
      try { o1.stop(); o2.stop(); lfo.stop(); } catch {}
      try { ctx.close(); } catch {}
      audioRef.current = null;
    };
  }, [ensureAudio, blip]);

  // ---- 背景字符雨 ----
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
          ctx.fillStyle = bright ? `rgba(190,255,200,${0.95 * fade})` : `rgba(32,194,94,${(0.5 + Math.random() * 0.4) * fade})`;
          ctx.fillText(ch, i * fontSize, drops[i] * fontSize);
          if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
          drops[i]++;
        }
        raf = requestAnimationFrame(loop);
      } else {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  // ---- 逐字打印（带打字音；点击快进） ----
  useEffect(() => {
    let alive = true;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const allLines = hackAccess ? [...TERMINAL_LINES, '', HACK_LINE] : TERMINAL_LINES;
    const run = async () => {
      for (const line of allLines) {
        if (!alive) return;
        if (skipRef.current) break;
        for (let ci = 1; ci <= line.length; ci++) {
          if (!alive) return;
          if (skipRef.current) break;
          setCurrentLine(line.slice(0, ci));
          if (line[ci - 1] !== ' ') typeSoundRef.current(1500 + Math.random() * 700, 0.025, 'square', 0.05);
          await new Promise<void>(res => { timers.push(setTimeout(res, TYPE_MS)); });
        }
        setTyped(prev => [...prev, line]);
        setCurrentLine('');
        typeSoundRef.current(420, 0.05, 'square', 0.04); // 回车音
        if (!skipRef.current) {
          await new Promise<void>(res => { timers.push(setTimeout(res, line === '' ? 100 : LINE_PAUSE_MS)); });
        }
      }
      if (alive) {
        if (skipRef.current) setTyped(allLines);
        setCurrentLine('');
        setDone(true);
      }
    };
    timers.push(setTimeout(run, RAIN_FULL_MS + 500));
    return () => { alive = false; timers.forEach(clearTimeout); };
  }, [hackAccess]);

  const handleSkip = useCallback(() => { if (!done && phase === 'terminal') skipRef.current = true; }, [done, phase]);

  // ---- 入侵：进度条 → 隐藏系统 ----
  const startHack = () => {
    setPhase('hacking');
    setHackProgress(0);
    let p = 0;
    const tick = () => {
      p = Math.min(100, p + 1 + Math.random() * 3.2);
      setHackProgress(Math.floor(p));
      blip(300 + p * 12, 0.03, 'square', 0.045);
      if (p < 100) {
        // 偶发卡顿（更像真的在入侵）
        setTimeout(tick, Math.random() < 0.08 ? 260 : 45);
      } else {
        // ACCESS GRANTED 和弦
        setTimeout(() => { blip(523, 0.16, 'square', 0.09); blip(784, 0.22, 'square', 0.07); }, 120);
        setTimeout(() => setPhase('files'), 600);
      }
    };
    blip(180, 0.25, 'sawtooth', 0.1, 90);
    setTimeout(tick, 350);
  };

  const openFile = (i: number) => {
    const f = HIDDEN_FILES[i];
    if (f.content === null) {
      // 权限不足
      blip(160, 0.25, 'sawtooth', 0.12, 70);
      setDeniedFlash(true);
      setTimeout(() => setDeniedFlash(false), 900);
      return;
    }
    blip(900, 0.06, 'square', 0.06);
    setViewingFile(i);
    setPhase('viewing');
  };

  // ---- CRT 关机（含关机音） ----
  const handleExitWorld = () => {
    // 电源切断音：高→低俯冲 + 咔哒
    blip(900, 0.5, 'sawtooth', 0.16, 40);
    setTimeout(() => blip(60, 0.12, 'square', 0.2, 25), 380);
    setCrtOff(true);
    setTimeout(onExit, 1250);
  };

  const green = '#20c25e';

  return (
    <div className="fixed inset-0 bg-black overflow-hidden select-none" onClick={handleSkip}
         style={{ cursor: !done && phase === 'terminal' ? 'pointer' : 'default' }}>
      <style>{`
        @keyframes crt-shutdown {
          0%   { transform: scaleY(1) scaleX(1); filter: brightness(1); }
          18%  { transform: scaleY(1) scaleX(1); filter: brightness(3.5) saturate(0); }
          55%  { transform: scaleY(0.004) scaleX(1); filter: brightness(6) saturate(0); }
          80%  { transform: scaleY(0.004) scaleX(0.1); filter: brightness(8); }
          100% { transform: scaleY(0.003) scaleX(0.001); filter: brightness(10); }
        }
        @keyframes crt-flash {
          0% { opacity: 0; } 12% { opacity: 0.95; } 40% { opacity: 0.2; } 100% { opacity: 0; }
        }
        @keyframes crt-line-glow {
          0% { opacity: 0; } 30% { opacity: 1; } 75% { opacity: 1; } 100% { opacity: 0; transform: scaleX(0.001); }
        }
        @keyframes crt-dot-fade { 0% { opacity: 1; } 100% { opacity: 0; } }
        @keyframes cursor-blink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
        @keyframes denied-shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }
      `}</style>

      <div className="absolute inset-0"
           style={crtOff ? { animation: 'crt-shutdown 0.9s cubic-bezier(0.55, 0, 0.9, 0.35) forwards', transformOrigin: 'center center', background: '#0a0f0a' } : undefined}>
        <canvas ref={canvasRef} className="absolute inset-0" />

        {/* ============ 终端主界面 ============ */}
        {(phase === 'terminal' || phase === 'hacking') && (
          <div className="absolute inset-0 flex items-center justify-center p-6 overflow-y-auto">
            <div className="w-full max-w-2xl font-mono text-[13px] md:text-base leading-relaxed" style={{ color: green, textShadow: '0 0 8px rgba(32,194,94,0.55)' }}>
              {typed.map((line, i) => (
                <div key={i} className="whitespace-pre-wrap min-h-[1.4em]">{line}</div>
              ))}
              {!done && (
                <div className="whitespace-pre-wrap min-h-[1.4em]">
                  {currentLine}<span style={{ animation: 'cursor-blink 1s step-end infinite' }}>█</span>
                </div>
              )}

              {done && phase === 'terminal' && (
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <span style={{ animation: 'cursor-blink 1s step-end infinite' }}>█</span>
                  {hackAccess && (
                    <button onClick={(ev) => { ev.stopPropagation(); startHack(); }}
                      className="border px-6 py-2 tracking-[0.3em] font-bold transition-colors border-yellow-400 text-yellow-300 hover:bg-yellow-400 hover:text-black"
                      style={{ textShadow: 'none' }}>
                      [ 入侵终端 ]
                    </button>
                  )}
                  <button onClick={(ev) => { ev.stopPropagation(); handleExitWorld(); }}
                    className="border px-6 py-2 tracking-[0.3em] font-bold transition-colors hover:text-black"
                    style={{ borderColor: green, color: green, textShadow: 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.background = green)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    [ 退出世界 ]
                  </button>
                </div>
              )}

              {phase === 'hacking' && (
                <div className="mt-6">
                  <div>{'> 正在提升权限 ... TVHEAD_ADMIN'}</div>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex-1 h-4 border" style={{ borderColor: green }}>
                      <div className="h-full transition-none" style={{ width: `${hackProgress}%`, background: green, boxShadow: `0 0 10px ${green}` }} />
                    </div>
                    <span className="w-12 text-right">{hackProgress}%</span>
                  </div>
                  {hackProgress >= 100 && (
                    <div className="mt-3 font-bold text-yellow-300" style={{ textShadow: '0 0 10px rgba(250,204,21,0.6)' }}>
                      {'> ACCESS GRANTED'}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============ 隐藏系统：文件列表 ============ */}
        {phase === 'files' && (
          <div className="absolute inset-0 flex items-center justify-center p-6 overflow-y-auto">
            <div className="w-full max-w-2xl font-mono text-[13px] md:text-base leading-relaxed"
                 style={{ color: green, textShadow: '0 0 8px rgba(32,194,94,0.4)', animation: deniedFlash ? 'denied-shake 0.25s' : undefined }}>
              <div className="text-yellow-300 mb-1">{'root@shadowlee:/SYSTEM_HIDDEN$  ls -la'}</div>
              <div className="opacity-60 mb-3">{'权限等级：TVHEAD_ADMIN ｜ 该目录不属于任何一个世界'}</div>
              {HIDDEN_FILES.map((f, i) => (
                <button key={f.name} onClick={() => openFile(i)}
                  className="w-full text-left px-2 py-1.5 border border-transparent hover:border-[#20c25e] hover:bg-[#20c25e]/10 flex justify-between transition-colors">
                  <span>{f.content === null ? '🔒 ' : '📄 '}{f.name}</span>
                  <span className="opacity-50">{f.size}</span>
                </button>
              ))}
              {deniedFlash && (
                <div className="mt-2 text-red-400 font-bold">{'> ACCESS DENIED —— 该文件属于下一个世界'}</div>
              )}
              <div className="mt-6 flex gap-3">
                <button onClick={handleExitWorld}
                  className="border px-6 py-2 tracking-[0.3em] font-bold hover:text-black transition-colors"
                  style={{ borderColor: green, color: green, textShadow: 'none' }}
                  onMouseEnter={e => (e.currentTarget.style.background = green)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  [ 退出世界 ]
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============ 隐藏系统：查看文件 ============ */}
        {phase === 'viewing' && viewingFile !== null && (
          <div className="absolute inset-0 flex items-center justify-center p-6 overflow-y-auto">
            <div className="w-full max-w-2xl font-mono text-[12px] md:text-sm leading-relaxed" style={{ color: green }}>
              <div className="text-yellow-300 mb-3">{`root@shadowlee:/SYSTEM_HIDDEN$  cat ${HIDDEN_FILES[viewingFile].name}`}</div>
              <pre className="whitespace-pre-wrap border-l-2 pl-4 opacity-90" style={{ borderColor: green }}>
                {HIDDEN_FILES[viewingFile].content}
              </pre>
              <div className="mt-6 flex gap-3">
                <button onClick={() => { blip(600, 0.05, 'square', 0.05); setPhase('files'); setViewingFile(null); }}
                  className="border px-6 py-2 tracking-[0.2em] font-bold hover:text-black transition-colors"
                  style={{ borderColor: green, color: green }}
                  onMouseEnter={e => (e.currentTarget.style.background = green)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  [ 返回 ]
                </button>
                <button onClick={handleExitWorld}
                  className="border px-6 py-2 tracking-[0.2em] font-bold hover:text-black transition-colors"
                  style={{ borderColor: green, color: green }}
                  onMouseEnter={e => (e.currentTarget.style.background = green)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  [ 退出世界 ]
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="absolute inset-0 pointer-events-none opacity-25"
             style={{ background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.35) 0px, rgba(0,0,0,0.35) 1px, transparent 1px, transparent 3px)' }} />
      </div>

      {/* CRT 关机：全屏白光爆闪 */}
      {crtOff && (
        <div className="absolute inset-0 bg-white pointer-events-none"
             style={{ animation: 'crt-flash 0.9s ease-out forwards' }} />
      )}
      {/* CRT 关机：中央高亮扫描线 */}
      {crtOff && (
        <div className="absolute inset-0 flex items-center pointer-events-none">
          <div className="w-full h-[4px] bg-white"
               style={{ animation: 'crt-line-glow 0.9s cubic-bezier(0.55,0,0.9,0.35) forwards', boxShadow: '0 0 24px 8px rgba(255,255,255,0.95), 0 0 60px 20px rgba(180,255,200,0.5)' }} />
        </div>
      )}
      {/* CRT 关机：残留光点 */}
      {crtOff && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-2 h-2 rounded-full bg-white"
               style={{ animation: 'crt-dot-fade 0.4s ease-out 0.85s forwards', boxShadow: '0 0 22px 8px rgba(255,255,255,0.9)' }} />
        </div>
      )}
    </div>
  );
};

export default MatrixEnding;
