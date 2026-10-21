import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GAME_VERSION, CHANGELOG } from '../version';
import { addFlag, hasSeen, markSeen } from '../core/save';
import MangaCutscene from './MangaCutscene';
import { PAGES } from '../story/cutscenes';
import Archive3D from './Archive3D';
import ForeshadowFeed, { FeedStage } from './ForeshadowFeed';
import { getSave } from '../core/save';

interface MatrixEndingProps {
  onExit: (hacked: boolean) => void;
  hackAccess?: boolean;        // 使用电视头小豆通关：持有 TVHEAD_ADMIN 权限碎片
  collectedPages?: string[];   // 已收集的草稿页（解密时随时查看）
  /** 从手账的附录直接接入档案馆（跳过终端） */
  direct?: boolean;
}

// 草稿页边角的密文（与图鉴一致）
const PAGE_CIPHER: [string, string, string][] = [
  ['page3d_ch1', '第1页', '边角字母：C · C'],
  ['page3d_ch2', '第2页', '边角字母：J · G'],
  ['page3d_ch3', '第3页', '边角字母：G · B'],
  ['page3d_ch4', '第4页', '边角字母：G · A'],
  ['page3d_ch5', '第5页', '边角小字：「A 是 0。往后数。」'],
];
export const buildDraftPagesFile = (collected: string[]): string => {
  const lines = PAGE_CIPHER.map(([id, label, cipher]) =>
    collected.includes(id) ? `  ${label} …… ${cipher}` : `  ${label} …… [未持有]`);
  return `[实体扫描 · 随身物品 · 草稿页]

${lines.join('\n')}

（扫描说明：字母印在纸页边角，
  肉眼几乎不可见。扫描层可读。）`;
};

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
  '> 轮廓比对 .......... 不一致',
  '> [下一帧记录丢失]',
  '',
  '> [SYSTEM] press EXIT to leave this world',
];

// 第二章首通 · 伏笔演出：这三行出现时，角落里的监控画面跟着变
const FX_PANDA = '> 一只新的熊猫存档点，慢慢亮了起来。';
const FX_MISMATCH = '> 轮廓比对 .......... 不一致';
const FX_LOST = '> [下一帧记录丢失]';
const FX_SEEN = 'fx:c2_contour';
/** 演出期间，这几行打完后多停一会儿（只在播放演出时） */
const FX_HOLD: Record<string, number> = { [FX_PANDA]: 900, [FX_MISMATCH]: 800, [FX_LOST]: 650 };

const HACK_LINE = '> [!] 检测到未知权限碎片：TVHEAD_ADMIN —— 是否尝试入侵终端系统？';

// 隐藏系统文件（世界观文物：只暗示，不说破）
export const HIDDEN_FILES: { name: string; size: string; content: string | null }[] = [
  {
    name: 'news_archive.txt', size: '3.7 KB',
    content: `[外部网络存档 · 新闻标题抓取 · 片段]
※ 抓取时间戳已损坏

「观测站确认：'折叠'现象首次抵达近地轨道」
「第7区在两小时内经历了三种几何。
  幸存者描述：'世界突然变薄了，像一页纸。'」
「奇怪的是——被'略去'的人没有留下遗体。
  他们只是不再被空间描述。」
「'活下来的不是躲得最深的人，
  是想象力更好的人。'
  ——某匿名研究员接受采访时表示」
「保存空间第二批入驻抽签结果公示，
  中签者需签署《叙事沉浸知情豁免书》」
「今日维度稳定度：2.4 ／ 不宜外出（第 214 天）」

[以下 47,203 条记录因存储降级丢失]`,
  },
  {
    name: 'panda_plan.doc', size: '2.4 KB',
    content: `[档案代号：P.A.N.D.A.]
Persistent Avatar Nested Dimension Archive
（嵌套维度持久化身档案）· 计划书节选 · 第3版

1. 背景
   （本节已按 S-3 密级要求删除）

2. 目标
   为参与者的「延续体」提供可长期运行的
   嵌套叙事栖息地。
   第一期载体：低带宽分镜结构（代号：漫画）
   第二期载体：多边形结构（代号：低模）

2.5 最终目标（第█期）
   使延续体获得跨██的认知结构，
   以█████的形态重返地表。
   （本节其余内容已按 S-3 密级要求删除）

3. 原则
   3.1 延续体不应知晓自身的性质。
   3.2 每个世界必须预留一条未写死的路径。
       （附录B：关于"裂缝"的必要性）
   3.3 锚点系统全程随行。任何一次坠落
       都必须被回滚。一次都不能漏。

批准席（3/3）：
   [签名涂改] ／ [签名涂改] ／ Kimo`,
  },
  {
    name: 'incident_0x02.log', size: '1.1 KB',
    content: `[事故记录 0x02 · 第二期载体]
密级：黄

现象：构建批次 B-7 校验完成前，
  实例 A-04 与实例 A-05 脱离构建沙箱，
  自行进入第一期载体（分镜世界）。

关联备注：两实例的羁绊参数互相引用，
  已形成闭环。强制分离将导致
  双方同时校验失败。

处置决议：不回收。转入伴随观察。
  途经路径锚点密度提升至 2 倍。

决议签发：Kimo
  （单独签发，未走三席流程）`,
  },
  {
    name: 'trace_tvhead.log', size: '1.3 KB',
    content: `[异常体追踪 · 编号 TVHEAD]

首次出现：第二期载体上线后第 3 拍
签名比对：与实例 A-04 一致率 99.97%
世界线校验和：不匹配
  （来源线状态：已归档 / 不可恢复）

行为模式：
  - 持有本系统写入权限
    （来源不明，等级高于本系统，无法吊销）
  - 反复在 A-04 途经路径上写入临时锚点
  - 曾在第 5 号区域边界停留 41 拍，注视裂缝

留言缓存（仅一条，未发送）：
  「这一次，走到门外去。」

处置：不处置。`,
  },
  {
    name: 'level3_shift.src', size: '1.4 KB',
    content: `// L3 世界重排 —— 载体端实装片段
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
// 位移 0.7s；触发时载体震动 0.55s
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
│ ●anchor││1││2│   ┌───┐
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
  { name: 'sealed_truth.enc', size: '7.2 KB', content: 'ENCRYPTED' }, // 需要密钥
  { name: 'world_03.plan', size: '?? KB', content: null }, // 权限不足
];

// 加密文档（密钥散落在五张草稿页上：A=0..J=9 → 22966160）
const SEALED_PASSWORD = '22966160';
export const SEALED_CONTENT = `【P.A.N.D.A. 最高评议会 · 认知变异与异常事件交叉比对卷宗】
文件标识：LOG-SYS-A770
安全状态：[内部熔断隔离] ── 严禁向下层载体建立映射同步
=======================================================

── 记录一 · 外部探索事件与受体生理特征侧写 ──

【基准现实 12 号返回舱自动化回收简报】
* 外部结构检查：舱体气密性 100.00%，
  物理密封无磨损，外部压强常数平稳。
* 内部生理监测：先遣队全员（共6名）
  脑干无信号，判定生物学死亡。

【随舱医疗组交叉比对备注】：
「返回舱外壳连一粒沙尘的撞击痕迹都没有。
但舱门打开时，所有人的死状完全一致：
瞳孔极度放大，视觉皮层大面积灼伤。
他们在外出探测的第41拍，眼前的物理空间轴线
在2D和3D之间发生了解构级别的频繁调换。
物质什么都没碎。他们是死于
跟不上新维度的更换速度，
直接在世界的渲染底层里被抹去了。」

── 记录二 · 载体神经衰减指标与群体行为偏离 ──

【数字沙箱'延续体'年度神经弹性抽样常数】
----------------------------------------------
历史运行期   | 环境算法锁定模式   | 主动越层率 | 认知弹性
----------------------------------------------
第 03 运行年 | 动态多维视角混合   |  87.21%   | 0.91 (极优)
第 09 运行年 | 静态低模多边形固定 |  41.50%   | 0.44 (一般)
当前 运行年  | 静态低模多边形固定 |   2.34%   | 0.01 (退化)
----------------------------------------------

【叙事工程与维稳总监（O3-2）无记名手写签批】：
「在彻底洗去他们关于'维度'和'虚拟'的
原始认知后，这一万名受体在简单的低模
多边形世界里表现出了极高的归属感。
我们成功建立了一个绝对安全的动物园。
但代价是，全人类的神经元已经永久丧失了
对多维切换的重组能力。
最初设计的自救进化已经死了。
我们亲手送葬了文明，
换来了一场幸福的集体长眠。」

── 记录三 · 自动化拦截与覆写日志 ──

* 11:45:22 [系统提示] 边界算法由于高压震荡
  产生非预期漏洞（漏洞代码：裂缝-09）。
* 11:45:25 [系统提示] 检测到外部未知协议入侵，
  该协议正在利用"裂缝-09"向底层实例
  A-04、A-05 强制注入变异数据。
* 11:45:28 [安全应答] 自动化防御系统已启动，
  正在对受污染实例执行格式化拦截指令（KILL-9）──
* 11:45:30 [系统变更] 格式化拦截指令已被中止。
* 11:45:30 [指令来源] O3-3 (Kimo)
  ── 激活最高覆写权（OVERRIDE）。
* 11:45:30 [中止备注（手动追加文本）]：
  「暂缓拦截。系统报错堆栈占用过高。
   将裂缝09无限期挂起，全面封锁该区域的
   系统修复权限，保持当前重叠状态不变。」

[系统提示：检测到本地麦克风权限非预设开启，
 音频流已捕获]
[音频日志 - 正在录音]：
「小李，小室，救救大家吧。
我注定要死在这个温室里。
希望这一次我的选择没有错，
你们一定要走出去。
……算了，还是帮我删掉吧，PANDA。」

=======================================================
[系统提示：该手动备注及关联音频已由 O3-3
 执行本地隐藏，未上传至评议会共享日志]`;

const TYPE_MS = 34;
const LINE_PAUSE_MS = 300;
const RAIN_FULL_MS = 2200;
const RAIN_FADE_MS = 1900;

type Phase = 'terminal' | 'hacking' | 'files';

const KG = '#36e07a', KA = '#f5c451';
/** 终端按键（放在组件外，避免父组件刷新时被重建） */
const Key: React.FC<{ onClick: () => void; children: React.ReactNode; tone?: 'green' | 'amber'; blip: (f: number, d: number, t?: OscillatorType, g?: number) => void }> = ({ onClick, children, tone = 'green', blip }) => {
  const c = tone === 'amber' ? KA : KG;
  return (
    <button onClick={(ev) => { ev.stopPropagation(); onClick(); }}
      onMouseEnter={() => blip(1600, 0.015, 'square', 0.025)}
      className="group relative px-5 py-2 font-bold tracking-[0.25em] text-sm md:text-base border transition-colors"
      style={{ borderColor: c, color: c, background: 'rgba(0,0,0,.35)', boxShadow: `0 0 0 1px rgba(0,0,0,.6), 0 0 14px ${tone === 'amber' ? 'rgba(245,196,81,.25)' : 'rgba(54,224,122,.2)'}` }}>
      <span className="absolute inset-0 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-150" style={{ background: c }} />
      <span className="relative group-hover:text-black">{children}</span>
    </button>
  );
};

/** 标题栏计时：自己刷新，不牵动整个终端 */
const Clock: React.FC = () => {
  const [ms, setMs] = useState(0);
  useEffect(() => { const t0 = performance.now(); const id = setInterval(() => setMs(performance.now() - t0), 100); return () => clearInterval(id); }, []);
  return <span className="tabular-nums opacity-70">{`${String(Math.floor(ms / 60000)).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}.${Math.floor((ms % 1000) / 100)}`}</span>;
};

const MatrixEnding: React.FC<MatrixEndingProps> = ({ onExit, hackAccess, collectedPages = [], direct }) => {
  // 动态文件表：随身草稿页放在最上面，方便解谜
  const files = React.useMemo(() => ([
    { name: 'draft_pages.dat', size: '0.4 KB', content: buildDraftPagesFile(collectedPages) },
    ...HIDDEN_FILES,
  ]), [collectedPages]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [typed, setTyped] = useState<string[]>([]);
  const [currentLine, setCurrentLine] = useState('');
  const [done, setDone] = useState(false);
  const [crtOff, setCrtOff] = useState(false);
  const [phase, setPhase] = useState<Phase>(direct ? 'files' : 'terminal');
  const [hackProgress, setHackProgress] = useState(0);
  const skipRef = useRef(false); // 保留：演出不再允许点击快进
  const hackedRef = useRef(!!direct);
  const [diving, setDiving] = useState(false);   // 入侵成功后「钻进屏幕」
  // 第一次进来：先看一页 3D 分镜（电视头小豆穿过世界线）
  const [prologue, setPrologue] = useState(() => !direct && !hasSeen('page:arc_open'));
  // 首通伏笔：只在第一次通关看到这块终端时播放（开发页 ?fx 可强制重放）
  const fxOn = useRef(!direct && (!hasSeen(FX_SEEN) || (import.meta.env.DEV && new URLSearchParams(location.search).has('fx'))));
  const [feed, setFeed] = useState<FeedStage | null>(null);

  // ============ WebAudio：环境电流 / 打字声 / 关机音 ============
  const audioRef = useRef<{ ctx: AudioContext; master: GainNode } | null>(null);
  const ensureAudio = useCallback(() => {
    if (audioRef.current) return audioRef.current;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const master = ctx.createGain();
      master.gain.value = 0.62;
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
    const drone = ctx.createGain(); drone.gain.value = 0.09;
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

  // ---- 背景字符雨：远近两层，最后收成一条线「开机」 ----
  const [booted, setBooted] = useState(false);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);
    const CHARS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789ABCDEFXZ<>+*';
    const layers = [
      { size: 11, speed: 0.6, alpha: 0.35, drops: [] as number[] },
      { size: 17, speed: 1, alpha: 0.85, drops: [] as number[] },
    ];
    const reset = () => layers.forEach(l => { l.drops = Array.from({ length: Math.ceil(canvas.width / l.size) }, () => Math.random() * -50); });
    reset();
    const start = performance.now();
    let raf = 0;
    let bootFired = false;
    const loop = (now: number) => {
      const elapsed = now - start;
      const fade = elapsed < RAIN_FULL_MS ? 1 : Math.max(0, 1 - (elapsed - RAIN_FULL_MS) / RAIN_FADE_MS);
      ctx.fillStyle = 'rgba(2, 6, 4, 0.12)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (fade > 0) {
        for (const l of layers) {
          if (Math.ceil(canvas.width / l.size) !== l.drops.length) reset();
          ctx.font = `${l.size}px ui-monospace, monospace`;
          for (let i = 0; i < l.drops.length; i++) {
            const ch = CHARS[Math.floor(Math.random() * CHARS.length)];
            const bright = Math.random() < 0.05;
            ctx.fillStyle = bright ? `rgba(210,255,220,${fade})` : `rgba(32,194,94,${(0.4 + Math.random() * 0.5) * l.alpha * fade})`;
            ctx.fillText(ch, i * l.size, l.drops[i] * l.size);
            if (l.drops[i] * l.size > canvas.height && Math.random() > 0.975) l.drops[i] = 0;
            l.drops[i] += l.speed;
          }
        }
        raf = requestAnimationFrame(loop);
      } else {
        ctx.fillStyle = '#020604';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        if (!bootFired) { bootFired = true; setBooted(true); }
      }
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  // ---- 逐字打印（带打字音；点击快进） ----
  useEffect(() => {
    if (direct) return;
    let alive = true;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const allLines = hackAccess ? [...TERMINAL_LINES, '', HACK_LINE] : TERMINAL_LINES;
    const run = async () => {
      for (const line of allLines) {
        if (!alive) return;
        if (skipRef.current) break;
        if (fxOn.current) {
          if (line === FX_PANDA) setFeed('panda');
          else if (line === FX_MISMATCH) setFeed('mismatch');
          else if (line === FX_LOST) setFeed('tear');
        }
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
          const hold = fxOn.current ? FX_HOLD[line] ?? 0 : 0;
          await new Promise<void>(res => { timers.push(setTimeout(res, (line === '' ? 100 : LINE_PAUSE_MS) + hold)); });
        }
        if (fxOn.current && line === FX_LOST && alive) {
          setFeed('off');
          markSeen(FX_SEEN);
          timers.push(setTimeout(() => { if (alive) setFeed(null); }, 900));
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
        hackedRef.current = true;
        addFlag('hack');
        setTimeout(() => { setDiving(true); blip(200, 0.9, 'sawtooth', 0.08, 1800); }, 700);
        setTimeout(() => { setPhase('files'); setDiving(false); }, 1700);
      }
    };
    blip(180, 0.25, 'sawtooth', 0.1, 90);
    setTimeout(tick, 350);
  };

  // ---- 隐藏系统：交给 3D 档案馆 ----
  const checkPassword = useCallback((pw: string) => {
    if (pw === SEALED_PASSWORD) { addFlag('read:sealed'); return true; }
    return false;
  }, []);
  const onRead = useCallback((name: string) => addFlag(`read:${name}`), []);

  // ---- CRT 关机（含关机音） ----
  const handleExitWorld = () => {
    blip(900, 0.5, 'sawtooth', 0.16, 40);
    setTimeout(() => blip(60, 0.12, 'square', 0.2, 25), 380);
    setCrtOff(true);
    setTimeout(() => onExit(hackedRef.current), 1250);
  };

  // 屏幕在字符雨收拢时「开机」
  const [screenOn, setScreenOn] = useState(false);
  useEffect(() => { const t = setTimeout(() => setScreenOn(true), RAIN_FULL_MS + 150); return () => clearTimeout(t); }, []);
  // 入侵时旁边滚动的十六进制
  const [hex, setHex] = useState<string[]>([]);
  useEffect(() => {
    if (phase !== 'hacking') return;
    const id = setInterval(() => {
      const row = Array.from({ length: 8 }, () => Math.floor(Math.random() * 65536).toString(16).padStart(4, '0')).join(' ');
      setHex(h => [...h.slice(-9), `0x${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')}  ${row}`]);
    }, 60);
    return () => clearInterval(id);
  }, [phase]);

  const G = '#36e07a';
  const DIM = 'rgba(54,224,122,.55)';
  const AMBER = '#f5c451';
  const RED = '#ff5d6c';
  const CYAN = '#6ee7f2';

  /** 按语义给终端行上色（文字本身不变） */
  const renderLine = (line: string, key: React.Key) => {
    let color = G;
    if (line.startsWith('> [SYSTEM]')) color = CYAN;
    else if (line.startsWith('> [!]')) color = AMBER;
    if (line.includes('▓')) {
      const m = line.match(/^(.*?)(▓+)(░+)(.*)$/);
      if (m) return (
        <div key={key} className="whitespace-pre-wrap min-h-[1.5em]" style={{ color }}>
          {m[1]}<span className="mx-0.5 inline-block" style={{ color: G, textShadow: `0 0 10px ${G}` }}>{m[2]}</span><span style={{ color: DIM }}>{m[3]}</span>{m[4]}
        </div>
      );
    }
    const parts = line.split(/(lost|丢失|无$|CLEAR|不一致)/);
    return (
      <div key={key} className="whitespace-pre-wrap min-h-[1.5em]" style={{ color }}>
        {parts.map((p, i) => p === 'lost' || p === '丢失' || p === '无' || p === '不一致'
          ? <span key={i} style={{ color: RED, textShadow: `0 0 8px ${RED}` }}>{p}</span>
          : p === 'CLEAR' ? <span key={i} className="font-bold" style={{ color: '#d6ffe4', textShadow: `0 0 12px ${G}` }}>{p}</span>
            : <React.Fragment key={i}>{p}</React.Fragment>)}
      </div>
    );
  };

  const path = phase === 'files' ? '/SYSTEM_HIDDEN' : '/WORLD_02';

  return (
    <div className="fixed inset-0 overflow-hidden select-none" style={{ background: '#020604' }}>
      <style>{`
        @keyframes crt-shutdown {
          0%   { transform: scaleY(1) scaleX(1); filter: brightness(1); }
          18%  { transform: scaleY(1) scaleX(1); filter: brightness(3.5) saturate(0); }
          55%  { transform: scaleY(0.004) scaleX(1); filter: brightness(6) saturate(0); }
          80%  { transform: scaleY(0.004) scaleX(0.1); filter: brightness(8); }
          100% { transform: scaleY(0.003) scaleX(0.001); filter: brightness(10); }
        }
        @keyframes crt-flash { 0% { opacity: 0; } 12% { opacity: 0.95; } 40% { opacity: 0.2; } 100% { opacity: 0; } }
        @keyframes crt-line-glow { 0% { opacity: 0; } 30% { opacity: 1; } 75% { opacity: 1; } 100% { opacity: 0; transform: scaleX(0.001); } }
        @keyframes crt-dot-fade { 0% { opacity: 1; } 100% { opacity: 0; } }
        @keyframes crt-on { 0% { transform: scale(1, 0.004); filter: brightness(6); opacity: .9; } 35% { transform: scale(1, 0.004); filter: brightness(6); } 70% { transform: scale(1, 1.02); filter: brightness(1.8); } 100% { transform: scale(1, 1); filter: brightness(1); opacity: 1; } }
        @keyframes crt-flicker { 0%, 100% { opacity: 1; } 47% { opacity: .985; } 50% { opacity: .94; } 53% { opacity: .99; } }
        @keyframes scan-roll { from { transform: translateY(-30%); } to { transform: translateY(130%); } }
        @keyframes cursor-blink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
        @keyframes denied-shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }
        @keyframes granted { 0% { clip-path: inset(0 100% 0 0); } 60% { clip-path: inset(0 0 0 0); } 70% { transform: translateX(-3px); } 75% { transform: translateX(3px); } 80% { transform: none; } 100% { clip-path: inset(0 0 0 0); } }
        @keyframes line-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
        .term-scroll::-webkit-scrollbar { width: 6px; } .term-scroll::-webkit-scrollbar-thumb { background: rgba(54,224,122,.35); }
      `}</style>

      <div className="absolute inset-0"
           style={crtOff ? { animation: 'crt-shutdown 0.9s cubic-bezier(0.55, 0, 0.9, 0.35) forwards', transformOrigin: 'center center' } : undefined}>
        {/* 字符雨（在玻璃后面） */}
        <canvas ref={canvasRef} className="absolute inset-0" />

        {/* 显示器 */}
        {phase === 'files' && prologue && (
          <MangaCutscene page={PAGES.arc_open} onEnd={() => { markSeen('page:arc_open'); setPrologue(false); }} />
        )}
        {phase === 'files' && !prologue && (
          <Archive3D files={files} pageCipher={PAGE_CIPHER} collectedPages={collectedPages} sealedContent={SEALED_CONTENT}
            checkPassword={checkPassword} onRead={onRead} onExit={handleExitWorld} blip={blip} />
        )}
        {phase === 'files' && <div className="absolute inset-0 bg-white pointer-events-none" style={{ animation: 'crt-flash 1.2s ease-out forwards' }} />}
        {screenOn && phase !== 'files' && (
          <div className="absolute inset-0 flex items-center justify-center p-2 md:p-6"
               style={diving ? { transform: 'scale(5)', filter: 'brightness(4)', opacity: 0, transition: 'transform 1s cubic-bezier(.6,0,.9,.4), filter 1s, opacity .9s .1s' } : undefined}>
            <div className="relative w-full h-full max-w-5xl overflow-hidden"
                 style={{
                   borderRadius: 'clamp(12px, 3vw, 34px)',
                   background: 'radial-gradient(ellipse at 50% 45%, rgba(8,28,16,.92) 0%, rgba(3,12,7,.96) 65%, rgba(1,4,2,.98) 100%)',
                   boxShadow: 'inset 0 0 80px rgba(0,0,0,.9), inset 0 0 0 2px rgba(54,224,122,.12), 0 0 60px rgba(54,224,122,.08)',
                   animation: 'crt-on .75s cubic-bezier(.2,.8,.3,1) both, crt-flicker 4s linear infinite .8s',
                   fontFamily: '"JetBrains Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, "Noto Sans SC", monospace',
                 }}>
              {/* 标题栏 */}
              <div className="flex items-center gap-3 px-4 md:px-6 py-2.5 text-[11px] md:text-xs border-b" style={{ borderColor: 'rgba(54,224,122,.18)', color: DIM }}>
                <span className="flex gap-1.5"><i className="w-2.5 h-2.5 rounded-full" style={{ background: RED, opacity: .7 }} /><i className="w-2.5 h-2.5 rounded-full" style={{ background: AMBER, opacity: .7 }} /><i className="w-2.5 h-2.5 rounded-full" style={{ background: G, opacity: .7 }} /></span>
                <span style={{ color: G }}>shadowlee://console</span><span>{path}</span>
                <span className="ml-auto flex items-center gap-2">
                  {phase === 'files'
                    ? <><i className="w-1.5 h-1.5 rounded-full" style={{ background: AMBER, boxShadow: `0 0 6px ${AMBER}` }} />TVHEAD_ADMIN</>
                    : <><i className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: RED, boxShadow: `0 0 6px ${RED}` }} />LINK LOST</>}
                  <Clock />
                </span>
              </div>

              {/* ============ 终端主界面 ============ */}
              {(phase === 'terminal' || phase === 'hacking') && (
                <div className="absolute inset-x-0 top-10 bottom-0 overflow-y-auto term-scroll">
                  <div className="max-w-3xl px-5 md:px-10 pt-6 pb-24 text-[13px] md:text-[15px] leading-relaxed" style={{ textShadow: '0 0 8px rgba(54,224,122,.5)' }}>
                    {feed && (
                      <div className="mb-4 w-full max-w-[320px] md:absolute md:right-6 md:top-6 md:w-[300px] md:mb-0">
                        <ForeshadowFeed stage={feed} reduce={getSave().settings.reduceMotion} />
                      </div>
                    )}
                    {typed.map((line, i) => renderLine(line, i))}
                    {!done && (
                      <div className="whitespace-pre-wrap min-h-[1.5em]" style={{ color: G }}>
                        {currentLine}<span style={{ animation: 'cursor-blink 1s step-end infinite' }}>█</span>
                      </div>
                    )}

                    {done && phase === 'terminal' && (
                      <div className="mt-8 flex flex-wrap items-center gap-4">
                        <span style={{ color: G, animation: 'cursor-blink 1s step-end infinite' }}>█</span>
                        {hackAccess && <Key blip={blip} tone="amber" onClick={startHack}>[ 入侵终端 ]</Key>}
                        <Key blip={blip} onClick={handleExitWorld}>[ 退出世界 ]</Key>
                      </div>
                    )}

                    {phase === 'hacking' && (
                      <div className="mt-6 grid md:grid-cols-[1fr_auto] gap-4">
                        <div>
                          <div style={{ color: G }}>{'> 正在提升权限 ... TVHEAD_ADMIN'}</div>
                          <div className="flex items-center gap-3 mt-3">
                            <div className="flex-1 h-4 border relative overflow-hidden" style={{ borderColor: G }}>
                              <div className="h-full" style={{ width: `${hackProgress}%`, background: `repeating-linear-gradient(90deg, ${G} 0 6px, rgba(54,224,122,.6) 6px 8px)`, boxShadow: `0 0 12px ${G}` }} />
                            </div>
                            <span className="w-12 text-right tabular-nums" style={{ color: G }}>{hackProgress}%</span>
                          </div>
                          {hackProgress >= 100 && (
                            <div className="mt-4 inline-block px-3 py-1 font-bold tracking-[0.3em]"
                                 style={{ color: '#000', background: AMBER, boxShadow: `0 0 20px ${AMBER}`, animation: 'granted .6s steps(12) both' }}>
                              {'> ACCESS GRANTED'}
                            </div>
                          )}
                        </div>
                        <div className="hidden md:block text-[10px] leading-snug tabular-nums" style={{ color: 'rgba(54,224,122,.4)', textShadow: 'none' }}>
                          {hex.map((h, i) => <div key={i}>{h}</div>)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 玻璃：扫描线 + 滚动亮带 + 暗角 */}
              <div className="absolute inset-0 pointer-events-none" style={{ background: 'repeating-linear-gradient(0deg, rgba(0,0,0,.28) 0px, rgba(0,0,0,.28) 1px, transparent 1px, transparent 3px)' }} />
              <div className="absolute inset-x-0 h-1/4 pointer-events-none" style={{ background: 'linear-gradient(transparent, rgba(120,255,170,.035), transparent)', animation: 'scan-roll 7s linear infinite' }} />
              <div className="absolute inset-0 pointer-events-none" style={{ borderRadius: 'inherit', boxShadow: 'inset 0 0 120px rgba(0,0,0,.75)' }} />
            </div>
          </div>
        )}
      </div>

      {crtOff && <div className="absolute inset-0 bg-white pointer-events-none" style={{ animation: 'crt-flash 0.9s ease-out forwards' }} />}
      {crtOff && (
        <div className="absolute inset-0 flex items-center pointer-events-none">
          <div className="w-full h-[4px] bg-white" style={{ animation: 'crt-line-glow 0.9s cubic-bezier(0.55,0,0.9,0.35) forwards', boxShadow: '0 0 24px 8px rgba(255,255,255,0.95), 0 0 60px 20px rgba(180,255,200,0.5)' }} />
        </div>
      )}
      {crtOff && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-2 h-2 rounded-full bg-white" style={{ animation: 'crt-dot-fade 0.4s ease-out 0.85s forwards', boxShadow: '0 0 22px 8px rgba(255,255,255,0.9)' }} />
        </div>
      )}
    </div>
  );
};

export default MatrixEnding;
