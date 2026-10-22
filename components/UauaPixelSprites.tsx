// ============================================================
// 《快醒醒！》用的像素精灵（全部手画的格子，不用 emoji / 图标库）
//  · PENGUIN_A / PENGUIN_B：32×32 企鹅两帧（圆头、两只眼睛、小嘴、深蓝背、浅色肚皮、两侧短翅、两只分开的脚）
//  · ALIEN：32×32 外星人头像（大脑袋、两只大眼、窄下巴）
//  · PAIR：两个人的低对比剪影（戴熊猫耳帽的豆沙、长发的室友姐，牵着手）
// 用 SVG 一格一个 rect、crispEdges 渲染，放大也是方方正正的像素。
// ============================================================
import React from 'react';

export const PIXEL_COLORS: Record<string, string> = {
  O: '#12407e', D: '#1b58aa', M: '#347cde', L: '#acd8ff', W: '#ffffff', K: '#0d2a5c', Y: '#f2c96b',
};

export const PENGUIN_A: string[] = [
  '................................',
  '............OOOOOOOO............',
  '..........OODDDDDDDDOO..........',
  '.........ODDDDDDDDDDDDO.........',
  '........ODDDDDDDDDDDDDDO........',
  '.......ODDDDDDDDDDDDDDDDO.......',
  '.......ODDWWWDDDDDDWWWDDO.......',
  '......ODDWWKKWDDDDWKKWWDDO......',
  '......ODDWWKKWDDDDWKKWWDDO......',
  '......ODDDWWWLLLLLLWWWDDDO......',
  '......ODDDDLLLLYYLLLLDDDDO......',
  '.......ODDDLLLYYYYLLLDDDO.......',
  '.......ODDLLLLLYYLLLLLDDO.......',
  '......ODDLLLLLLLLLLLLLLDDO......',
  '.....ODDLLLLLWLLLLLLLLLLDDO.....',
  '....OMDDLLLLWWLLLLLLLLLLDDMO....',
  '...OMMDDLLLLWLLLLLLLLLLLDDMMO...',
  '..OMMMDDLLLLLLLLLLLLLLLLDDMMMO..',
  '..OMMDDLLLLLLLLLLLLLLLLLLDDMMO..',
  '..OMMODLLLLLLLLLLLLLLLLLLDOMMO..',
  '..OMO.DLLLLLLLLLLLLLLLLLLD.OMO..',
  '...O..DLLLLLLLLLLLLLLLLLLD..O...',
  '......DLLLLLLLLLLLLLLLLLLD......',
  '......DDLLLLLLLLLLLLLLLLDD......',
  '.......DDLLLLLLLLLLLLLLDD.......',
  '........DDLLLLLLLLLLLLDD........',
  '.........DDDLLLLLLLLDDD.........',
  '..........ODDDDDDDDDDO..........',
  '........YYYYY......YYYYY........',
  '.......YYYYYY......YYYYYY.......',
  '................................',
  '................................',
];

export const PENGUIN_B: string[] = [
  '................................',
  '............OOOOOOOO............',
  '..........OODDDDDDDDOO..........',
  '.........ODDDDDDDDDDDDO.........',
  '........ODDDDDDDDDDDDDDO........',
  '.......ODDDDDDDDDDDDDDDDO.......',
  '.......ODDWWWDDDDDDWWWDDO.......',
  '......ODDWWKKWDDDDWKKWWDDO......',
  '......ODDWWKKWDDDDWKKWWDDO......',
  '......ODDDWWWLLLLLLWWWDDDO......',
  '......ODDDDLLLLYYLLLLDDDDO......',
  '.......ODDDLLLYYYYLLLDDDO.......',
  '.......ODDLLLLLYYLLLLLDDO.......',
  '......ODDLLLLLLLLLLLLLLDDO......',
  '.....ODDLLLLLWLLLLLLLLLLDDO.....',
  '....OMDDLLLLWWLLLLLLLLLLDDMO....',
  '..OOMMDDLLLLWLLLLLLLLLLLDDMMOO..',
  '.OMMMMDDLLLLLLLLLLLLLLLLDDMMMMO.',
  '.OMMMDDLLLLLLLLLLLLLLLLLLDDMMMO.',
  '..OMODDLLLLLLLLLLLLLLLLLLDDOMO..',
  '...O..DLLLLLLLLLLLLLLLLLLD..O...',
  '......DLLLLLLLLLLLLLLLLLLD......',
  '......DLLLLLLLLLLLLLLLLLLD......',
  '......DDLLLLLLLLLLLLLLLLDD......',
  '.......DDLLLLLLLLLLLLLLDD.......',
  '........DDLLLLLLLLLLLLDD........',
  '.........DDDLLLLLLLLDDD.........',
  '..........ODDDDDDDDDDO..........',
  '........YYYYY......YYYYY........',
  '.......YYYYYY......YYYYYY.......',
  '................................',
  '................................',
];

export const ALIEN: string[] = [
  '................................',
  '................................',
  '...........OOOOOOOOOO...........',
  '.........OOMMMMMMMMMMOO.........',
  '........OMMMMMMMMMMMMMMO........',
  '.......OMMMMMMMMMMMMMMMMO.......',
  '......OMMMMMMMMMMMMMMMMMMO......',
  '.....OMMMMMMMMMMMMMMMMMMMMO.....',
  '.....OMMMMMMMMMMMMMMMMMMMMO.....',
  '....OMMKKKKKMMMMMMMMKKKKKMMO....',
  '....OMKKKKKKKMMMMMMKKKKKKKMO....',
  '....OMKKWKKKKKMMMMKKKKKWKKMO....',
  '....OMMKKKKKKKMMMMKKKKKKKMMO....',
  '.....OMMKKKKKMMMMMMKKKKKMMO.....',
  '.....OMMMMMMMMMMMMMMMMMMMMO.....',
  '......OMMMMMMMMMMMMMMMMMMO......',
  '.......OMMMMMMMMMMMMMMMMO.......',
  '........OMMMMMMKKMMMMMMO........',
  '.........OMMMMMMMMMMMMO.........',
  '..........OMMMMMMMMMMO..........',
  '...........OOMMMMMMOO...........',
  '.............OOOOOO.............',
  '................................',
];

export const PAIR: string[] = [
  '........................................',
  '..........................OOOOO.........',
  '.....OO....OO...........OOOOOOOOO.......',
  '....OOOO..OOOO.........OOOOOOOOOOO......',
  '....OOOOOOOOOO........OOOOOOOOOOOOO.....',
  '.....OOOOOOOO.........OOOOOOOOOOOOO.....',
  '....OOOOOOOOOO........OOOOOOOOOOOOO.....',
  '....OOOOOOOOOO........OOOOOOOOOOOOO.....',
  '....OOOOOOOOOO........OOOOOOOOOOOOO.....',
  '.....OOOOOOOO.........OOOOOOOOOOOOO.....',
  '......OOOOOO..........OOOOOOOOOOOOO.....',
  '.......OOOO...........OOOOOOOOOOOOO.....',
  '.....OOOOOOOO.........OOOOOOOOOOOOO.....',
  '....OOOOOOOOOO........OOOOOOOOOOOOO.....',
  '...OOOOOOOOOOOO.......OOOOOOOOOOOOO.....',
  '...OOOOOOOOOOOO.......OOOOOOOOOOOOO.....',
  '..OO.OOOOOOOOOOO.....OOOOOOOOOOOOOOO....',
  '..OO.OOOOOOOOOOOOOOOOOO.OOOOOOOOO.OO....',
  '..OO.OOOOOOOOOO.OOOOOO..OOOOOOOOO.OO....',
  '..O..OOOOOOOOOO.........OOOOOOOOO..O....',
  '.....OOOOOOOOOO.........OOOOOOOOO.......',
  '....OOOOOOOOOOOO........OOOOOOOOO.......',
  '....OOOOOOOOOOOO.......OOOOOOOOOOO......',
  '....OOOOOOOOOOOO.......OOOOOOOOOOO......',
  '.....OOO....OOO.......OOOOOOOOOOOOO.....',
  '.....OOO....OOO.......OOOOOOOOOOOOO.....',
  '.....OOO....OOO........OOO.....OOO......',
  '.....OOO....OOO........OOO.....OOO......',
  '.....OOO....OOO........OOO.....OOO......',
  '.....OOO....OOO........OOO.....OOO......',
  '.....OOO....OOO........OOO.....OOO......',
  '....OOOO....OOOO.......OOO.....OOO......',
  '....OOOO....OOOO......OOOO.....OOOO.....',
  '........................................',
];

/** 电子屏（点阵）配色：亮的地方是灯珠亮，眼珠这种深色是灭着的灯珠 */
export const LED_COLORS: Record<string, string> = {
  O: '#5aaeff', D: '#2f72d6', M: '#3d8bef', L: '#a6dcff', W: '#eaf7ff', K: '', Y: '#8fe3ff',
};

/**
 * 点阵电子图标：深色小屏 + 一颗颗发光的圆灯珠，没点亮的灯珠也隐约可见。
 * 用来把企鹅 / 外星人画成「电子企鹅」那种屏幕图标。
 */
export const LedSprite: React.FC<{ grid: string[]; colors?: Record<string, string>; className?: string; style?: React.CSSProperties; title?: string; panel?: boolean; dim?: number }> = ({ grid, colors = LED_COLORS, className, style, title, panel = true, dim = 1 }) => {
  const w = Math.max(...grid.map(r => r.length)), h = grid.length, pad = 2;
  const W = w + pad * 2, H = h + pad * 2;
  // 灯珠只在图案变化时重建（每帧只改外层的 style，不重画上千个圆点）
  const body = React.useMemo(() => {
    const dots: React.ReactElement[] = [];
    grid.forEach((row, y) => {
      for (let x = 0; x < w; x++) {
        const c = row[x] ?? '.';
        const col = colors[c];
        if (c === '.' || !col) dots.push(<circle key={`${x}-${y}`} cx={x + 0.5 + pad} cy={y + 0.5 + pad} r={0.3} fill="#4a86d8" opacity={0.1} />);
        else dots.push(<circle key={`${x}-${y}`} cx={x + 0.5 + pad} cy={y + 0.5 + pad} r={0.43} fill={col} opacity={dim} />);
      }
    });
    return (
      <>
        <defs>
          <filter id="led-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="0.45" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <pattern id="led-scan" width="1" height="1" patternUnits="userSpaceOnUse"><rect width="1" height="0.12" fill="rgba(0,0,0,.35)" /></pattern>
        </defs>
        {panel && <rect x={0.2} y={0.2} width={W - 0.4} height={H - 0.4} rx={W * 0.12} fill="#0a1834" stroke="#3d7fe0" strokeWidth={0.35} strokeOpacity={0.8} />}
        <g filter="url(#led-glow)">{dots}</g>
        {panel && <rect x={0.2} y={0.2} width={W - 0.4} height={H - 0.4} rx={W * 0.12} fill="url(#led-scan)" />}
        {panel && <rect x={1} y={0.9} width={W * 0.55} height={H * 0.18} rx={W * 0.08} fill="rgba(255,255,255,.06)" />}
      </>
    );
  }, [grid, colors, panel, dim, w, W, H]);
  return <svg viewBox={`0 0 ${W} ${H}`} className={className} style={style} role="img" aria-label={title}>{body}</svg>;
};

/** 把一张格子图画成 SVG：同色的横向连续格合并成一个 rect，少一点节点 */
export const PixelSprite: React.FC<{ grid: string[]; colors?: Record<string, string>; className?: string; style?: React.CSSProperties; title?: string }> = ({ grid, colors = PIXEL_COLORS, className, style, title }) => {
  const w = Math.max(...grid.map(r => r.length)), h = grid.length;
  const rects: React.ReactElement[] = [];
  grid.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const c = row[x];
      if (c === '.') { x++; continue; }
      let e = x + 1; while (e < row.length && row[e] === c) e++;
      rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={e - x} height={1} fill={colors[c] ?? '#000'} />);
      x = e;
    }
  });
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={className} style={{ imageRendering: 'pixelated', ...style }} shapeRendering="crispEdges" role="img" aria-label={title}>
      {rects}
    </svg>
  );
};
