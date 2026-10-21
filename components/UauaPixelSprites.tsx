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
