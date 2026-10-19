// ============================================================
// 第一章关卡（16px 网格，内部分辨率 640×360）
// 图例：
//   .  空          #  实心(两层)   R 实心(仅现实)   M 实心(仅漫画)
//   -  单向平台(两层)   r 单向(仅现实)   m 单向(仅漫画)
//   ^  尖刺(两层)   x 尖刺(仅现实)   X 尖刺(仅漫画)
//   B  弹簧        P  出生点        C  书签(存档点)   G  终点
//   N  室友姐      p  百合页        s  碎片
// 跳跃能力：最高约 3 格，平地约 4 格远；弹簧约 7 格高。
// ============================================================

export type ThemeId = 'room' | 'street' | 'apartment' | 'warehouse' | 'park' | 'danmaku' | 'rooftop';
export type LayerMask = 'B' | 'R' | 'M';

export type Ent2D =
  | { t: 'prop'; k: string; x: number; y: number; layer?: LayerMask; flip?: boolean; fg?: boolean }
  | { t: 'sign'; k?: string; x: number; y: number; text: string; manga?: string }
  | { t: 'hint'; x: number; y: number; text: string }
  | { t: 'mover'; x: number; y: number; w: number; dx: number; dy: number; period: number; layer?: LayerMask; style?: 'box' | 'danmaku' | 'board' | 'leaf' | 'cloud'; text?: string; color?: string; phase?: number }
  | { t: 'moment'; x: number; y: number; w: number; h: number; scene: string; layer?: LayerMask };

export interface Level2D {
  id: number;
  title: string;
  sub: string;
  theme: ThemeId;
  map: string[];
  ents: Ent2D[];
  /** 第一次切到漫画层时播放的小剧场 */
  firstSwitchScene?: string;
  /** 屏幕上方飘过的弹幕（氛围） */
  ambientDanmaku?: string[];
}

class Grid {
  w: number; h: number; c: string[][];
  constructor(w: number, h: number) {
    this.w = w; this.h = h;
    this.c = Array.from({ length: h }, () => Array(w).fill('.'));
  }
  r(x0: number, y0: number, x1: number, y1: number, ch: string) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.c[y][x] = ch;
    return this;
  }
  s(x: number, y: number, ch: string) { return this.r(x, y, x, y, ch); }
  rows() { return this.c.map(r => r.join('')); }
}

// ============================================================
const L1 = (): Level2D => {
  const g = new Grid(132, 22);
  g.r(0, 19, 43, 21, '#');
  g.s(3, 18, 'P');
  // 书堆台阶
  g.r(14, 17, 16, 18, '#');
  g.r(18, 15, 20, 18, '#');
  // 书桌（单向）
  g.r(21, 14, 34, 14, '-');
  g.s(30, 12, 's');
  g.r(35, 19, 43, 21, '#');
  // 现实里的墙：切到漫画层就消失
  g.r(41, 9, 42, 18, 'R');
  // 漫画层的桥，下面是乐高积木
  g.r(44, 21, 51, 21, '^');
  g.r(44, 19, 51, 19, 'm');
  g.r(52, 19, 131, 21, '#');
  g.s(55, 18, 'C');
  // 床 + 弹簧床垫
  g.r(60, 17, 74, 18, '#');
  g.s(67, 17, 'B');
  // 床上方的书架：漫画层才有，上面放着百合页
  g.r(62, 10, 71, 10, 'm');
  g.s(69, 9, 'p');
  g.s(64, 9, 's');
  g.r(73, 12, 77, 12, '-');
  // 地板上的乐高
  g.r(80, 18, 82, 18, '^');
  // 交替平台
  g.r(86, 17, 90, 17, '-');
  g.r(93, 15, 96, 15, 'r');
  g.r(99, 13, 102, 13, 'm');
  g.s(101, 12, 's');
  g.r(105, 16, 108, 16, '-');
  g.s(112, 18, 'C');
  g.s(121, 18, 'N');
  g.s(126, 18, 'G');
  return {
    id: 1, title: '第1话 · 直播事故', sub: '今晚的直播，画面好像不太对劲。', theme: 'room', map: g.rows(),
    firstSwitchScene: 'c1_m_glitch',
    ambientDanmaku: ['来了来了', 'Kimo熊报到', '豆沙晚上好', '今天玩什么', '前排', '主播好可爱', '哈哈哈哈', '小心脚下', '这跳跃我给满分', '小室呢？'],
    ents: [
      { t: 'hint', x: 6, y: 17, text: '← → / A D  移动' },
      { t: 'hint', x: 13, y: 15, text: '空格  跳跃（按住跳得更高）' },
      { t: 'prop', k: 'window', x: 4, y: 12 },
      { t: 'prop', k: 'poster', x: 10, y: 11 },
      { t: 'prop', k: 'deskLegs', x: 21, y: 18 },
      { t: 'prop', k: 'monitor', x: 24, y: 13 },
      { t: 'prop', k: 'chair', x: 32, y: 18 },
      { t: 'sign', k: 'sticky', x: 22, y: 13, text: '便利贴：「直播前检查——麦克风、摄像头、水杯。」' },
      { t: 'hint', x: 36, y: 17, text: 'Q  切换次元' },
      { t: 'prop', k: 'bookshelf', x: 46, y: 18 },
      { t: 'prop', k: 'plushPanda', x: 57, y: 18 },
      { t: 'prop', k: 'bed', x: 60, y: 18 },
      { t: 'hint', x: 63, y: 15, text: '踩上床垫可以弹得很高' },
      { t: 'prop', k: 'lamp', x: 84, y: 18 },
      { t: 'prop', k: 'rug', x: 88, y: 18 },
      { t: 'prop', k: 'plant', x: 110, y: 18 },
      { t: 'prop', k: 'roomDoor', x: 123, y: 18 },
      { t: 'sign', k: 'crt', x: 115, y: 18, text: '旧电视。没有插电。', manga: '旧电视。……屏幕上，好像有一张闭着眼睛的方脸。' },
    ],
  };
};

// ============================================================
const L2 = (): Level2D => {
  const g = new Grid(156, 22);
  g.r(0, 19, 39, 21, '#');
  g.s(2, 18, 'P');
  // 店铺遮阳棚
  g.r(12, 16, 17, 16, '-');
  g.r(20, 14, 25, 14, '-');
  g.s(22, 13, 's');
  // 断掉的路：现实里是刺，漫画层有一座桥
  g.r(40, 21, 61, 21, 'x');
  g.r(39, 17, 62, 17, 'm');
  g.r(45, 18, 46, 20, 'R');
  g.r(53, 16, 54, 20, 'R');
  g.r(48, 16, 51, 16, 'r');
  g.s(49, 15, 's');
  g.r(50, 14, 54, 14, 'm');
  g.s(52, 13, 'p');
  g.r(62, 19, 70, 21, '#');
  g.s(65, 18, 'C');
  // 屋顶跑酷
  g.r(71, 17, 78, 21, '#');
  g.r(81, 15, 87, 21, '#');
  g.s(84, 14, 's');
  g.r(91, 15, 97, 21, '#');
  g.s(94, 14, 'C');
  // 移动的广告牌
  g.r(99, 21, 120, 21, '^');
  g.r(121, 15, 127, 21, '#');
  g.r(128, 19, 155, 21, '#');
  g.s(145, 18, 'N');
  g.s(150, 18, 'G');
  return {
    id: 2, title: '第2话 · 查岗时刻', sub: '黄昏的街，路灯一盏一盏亮起来。', theme: 'street', map: g.rows(),
    ents: [
      { t: 'moment', x: 6, y: 15, w: 2, h: 4, scene: 'c1_m_clock' },
      { t: 'prop', k: 'shop', x: 10, y: 18 },
      { t: 'prop', k: 'shop2', x: 19, y: 18 },
      { t: 'sign', k: 'clock', x: 30, y: 18, text: '街角的钟。时针指着七点整。', manga: '街角的钟。……秒针，一直没有动过。' },
      { t: 'prop', k: 'streetLamp', x: 35, y: 18 },
      { t: 'prop', k: 'vending', x: 63, y: 18 },
      { t: 'prop', k: 'streetLamp', x: 68, y: 18 },
      { t: 'prop', k: 'chimney', x: 74, y: 16 },
      { t: 'prop', k: 'antenna', x: 86, y: 14 },
      { t: 'prop', k: 'chimney', x: 93, y: 14 },
      { t: 'mover', x: 100, y: 15, w: 4, dx: 14, dy: 0, period: 6, style: 'board', text: '联动预告' },
      { t: 'prop', k: 'shop', x: 131, y: 18 },
      { t: 'prop', k: 'streetLamp', x: 140, y: 18 },
      { t: 'prop', k: 'bench', x: 137, y: 18 },
      { t: 'sign', k: 'poster2', x: 134, y: 15, text: '海报：「今晚 7:00 准时开播」。' },
    ],
  };
};

// ============================================================
const L3 = (): Level2D => {
  const g = new Grid(150, 22);
  g.r(0, 19, 18, 21, '#');
  g.s(2, 18, 'P');
  // 公寓外墙：阳台（单向）与空调外机
  g.r(20, 19, 30, 21, '#');
  g.r(19, 17, 24, 17, '-');
  g.r(27, 15, 32, 15, '-');
  g.r(21, 13, 26, 13, '-');
  g.s(23, 12, 's');
  g.r(34, 13, 36, 14, '#');      // 空调外机
  g.r(39, 12, 45, 12, '-');
  g.r(42, 11, 43, 11, '^');      // 仙人掌盆栽
  // 晾衣绳：现实里是绳子，漫画层是一条线
  g.r(48, 12, 56, 12, 'r');
  g.r(49, 9, 55, 9, 'm');
  g.s(52, 8, 'p');
  g.r(58, 11, 64, 21, '#');
  g.s(61, 10, 'C');
  // 屋顶之间
  g.r(65, 21, 70, 21, '^');
  g.r(66, 12, 69, 12, 'm');
  g.r(71, 13, 77, 21, '#');
  g.r(74, 12, 74, 12, '^');
  g.r(80, 15, 83, 15, '-');
  g.r(86, 13, 92, 21, '#');
  g.s(89, 12, 's');
  g.r(93, 21, 99, 21, '^');
  g.r(95, 15, 97, 15, 'm');
  g.r(100, 16, 110, 21, '#');
  g.s(103, 15, 'C');
  // 对面那台电视（漫画层里能看见那张脸）
  g.r(111, 19, 149, 21, '#');
  g.r(118, 17, 121, 17, '-');
  g.s(119, 16, 's');
  g.s(140, 18, 'N');
  g.s(145, 18, 'G');
  return {
    id: 3, title: '第3话 · 扁头比格犬', sub: '深夜的公寓楼，吹风机的声音隔着墙。', theme: 'apartment', map: g.rows(),
    ents: [
      { t: 'prop', k: 'aptWindow', x: 4, y: 15 },
      { t: 'prop', k: 'aptWindowLit', x: 10, y: 15 },
      { t: 'prop', k: 'ac', x: 34, y: 14 },
      { t: 'prop', k: 'cactus', x: 42, y: 11 },
      { t: 'prop', k: 'laundry', x: 48, y: 11 },
      { t: 'prop', k: 'pipe', x: 57, y: 21 },
      { t: 'prop', k: 'aptWindowLit', x: 60, y: 17 },
      { t: 'prop', k: 'waterTank', x: 72, y: 12 },
      { t: 'prop', k: 'aptWindow', x: 88, y: 17 },
      { t: 'moment', x: 113, y: 14, w: 6, h: 5, scene: 'c1_m_tv', layer: 'M' },
      { t: 'sign', k: 'tvWindow', x: 125, y: 18, text: '对面的窗户。电视开着，屏幕上一片雪花。', manga: '对面的窗户。屏幕上——是一张闭着眼睛的、方方正正的脸。' },
      { t: 'prop', k: 'aptWindowLit', x: 132, y: 17 },
      { t: 'prop', k: 'streetLamp', x: 137, y: 18 },
    ],
  };
};

// ============================================================
const L4 = (): Level2D => {
  const g = new Grid(160, 22);
  g.r(0, 19, 160, 21, '#');
  g.s(2, 18, 'P');
  // 纸箱堆
  g.r(10, 17, 12, 18, '#');
  g.r(13, 15, 15, 18, '#');
  g.s(14, 14, 's');
  // 传送带上的箱子（移动平台），下面是压缩机
  g.r(18, 19, 44, 19, '.'); g.r(18, 20, 44, 21, '.');
  g.r(18, 21, 44, 21, '^');
  g.r(45, 16, 49, 18, '#');
  g.s(47, 15, 'C');
  // 货架：漫画层才有的层板
  g.r(52, 15, 58, 15, 'm');
  g.r(60, 13, 66, 13, 'm');
  g.r(56, 11, 62, 11, '-');
  g.s(59, 10, 'p');
  g.r(64, 17, 70, 18, 'R');
  g.r(66, 16, 66, 16, 's');
  // 第二段传送带
  g.r(72, 19, 100, 21, '.');
  g.r(72, 21, 100, 21, '^');
  g.r(101, 16, 105, 18, '#');
  g.s(103, 15, 'C');
  g.r(108, 14, 111, 18, '#');
  g.r(114, 12, 117, 18, 'R');
  g.r(114, 12, 117, 12, '#');
  g.r(120, 15, 123, 18, 'M');
  g.s(116, 11, 's');
  g.s(150, 18, 'N');
  g.s(154, 18, 'G');
  return {
    id: 4, title: '第4话 · 苦力时刻', sub: '快递站的传送带，从来没有停过。', theme: 'warehouse', map: g.rows(),
    ents: [
      { t: 'prop', k: 'boxStack', x: 5, y: 18 },
      { t: 'sign', k: 'genkoBox', x: 7, y: 18, text: '箱子上贴着快递单：「第1话 · 原稿」。', manga: '快递单上的字，是手写的。……和漫画里的字体一样。' },
      { t: 'moment', x: 4, y: 15, w: 2, h: 4, scene: 'c1_m_box' },
      { t: 'prop', k: 'conveyor', x: 18, y: 21 },
      { t: 'mover', x: 18, y: 17, w: 3, dx: 22, dy: 0, period: 7, style: 'box' },
      { t: 'mover', x: 30, y: 15, w: 3, dx: -10, dy: 0, period: 5, style: 'box', phase: 0.5 },
      { t: 'prop', k: 'shelf', x: 52, y: 18 },
      { t: 'prop', k: 'hook', x: 62, y: 6 },
      { t: 'prop', k: 'conveyor', x: 72, y: 21 },
      { t: 'mover', x: 72, y: 17, w: 3, dx: 26, dy: 0, period: 8, style: 'box' },
      { t: 'mover', x: 86, y: 14, w: 3, dx: 0, dy: -4, period: 4, style: 'box', phase: 0.25 },
      { t: 'prop', k: 'boxStack', x: 128, y: 18 },
      { t: 'sign', k: 'genkoBox', x: 134, y: 18, text: '一箱写着「第4话 · 原稿 · 请勿折压」。', manga: '……箱子是空的。' },
      { t: 'prop', k: 'boxStack', x: 140, y: 18 },
      { t: 'prop', k: 'warehouseLamp', x: 30, y: 4 },
      { t: 'prop', k: 'warehouseLamp', x: 90, y: 4 },
      { t: 'prop', k: 'warehouseLamp', x: 140, y: 4 },
    ],
  };
};

// ============================================================
const L5 = (): Level2D => {
  const g = new Grid(150, 22);
  g.r(0, 19, 150, 21, '#');
  g.s(2, 18, 'P');
  // 树枝（单向）
  g.r(14, 17, 18, 17, '-');
  g.r(20, 15, 24, 15, '-');
  g.s(22, 14, 's');
  // 池塘：漂浮的荷叶
  g.r(30, 19, 52, 21, '.');
  g.r(30, 21, 52, 21, 'x');
  g.r(30, 20, 52, 20, 'M');
  g.s(55, 18, 'C');
  // 坡上的小路
  g.r(60, 17, 66, 18, '#');
  g.r(67, 15, 72, 18, '#');
  g.r(74, 13, 77, 13, 'm');
  g.r(80, 11, 84, 11, 'r');
  g.r(86, 9, 90, 9, '-');
  g.s(88, 8, 'p');
  g.r(76, 15, 84, 18, '#');
  g.s(80, 14, 's');
  g.r(93, 19, 95, 21, '.');
  g.r(93, 21, 95, 21, '^');
  g.s(102, 18, 'C');
  g.r(108, 17, 112, 17, '-');
  g.s(110, 16, 's');
  g.s(136, 18, 'N');
  g.s(141, 18, 'G');
  return {
    id: 5, title: '第5话 · 家', sub: '回家的路上，萤火虫在草丛里亮着。', theme: 'park', map: g.rows(),
    ents: [
      { t: 'prop', k: 'tree', x: 13, y: 18 },
      { t: 'prop', k: 'tree', x: 22, y: 18, flip: true },
      { t: 'prop', k: 'bench', x: 6, y: 18 },
      { t: 'prop', k: 'parkLamp', x: 27, y: 18 },
      { t: 'prop', k: 'pond', x: 30, y: 21 },
      { t: 'mover', x: 33, y: 19, w: 3, dx: 6, dy: 0, period: 5, style: 'leaf' },
      { t: 'mover', x: 43, y: 19, w: 3, dx: -5, dy: 0, period: 4.4, style: 'leaf', phase: 0.3 },
      { t: 'mover', x: 47, y: 19, w: 3, dx: 3, dy: 0, period: 3.6, style: 'leaf', phase: 0.6 },
      { t: 'prop', k: 'bush', x: 58, y: 18 },
      { t: 'prop', k: 'tree', x: 85, y: 18 },
      { t: 'prop', k: 'parkLamp', x: 100, y: 18 },
      { t: 'prop', k: 'fence', x: 114, y: 18 },
      { t: 'prop', k: 'house', x: 124, y: 18 },
      { t: 'sign', k: 'mailbox', x: 121, y: 18, text: '信箱上写着两个人的名字。', manga: '信箱上写着两个人的名字。……字被网点盖住了，看不清。' },
      { t: 'sign', k: 'houseWindow', x: 131, y: 15, text: '窗户里能看到墙上的日历。看不清是几号。', manga: '日历每一页，都画着同一个圆圈。' },
    ],
  };
};

// ============================================================
const L6 = (): Level2D => {
  const g = new Grid(176, 22);
  g.r(0, 17, 10, 21, '#');
  g.s(3, 16, 'P');
  g.r(40, 15, 44, 15, '-');
  g.s(42, 14, 'C');
  g.s(42, 12, 's');
  g.s(50, 10, 's');
  g.r(78, 13, 82, 13, '-');
  g.s(80, 12, 'C');
  g.r(118, 14, 122, 14, '-');
  g.s(120, 13, 'C');
  g.s(120, 11, 's');
  g.r(160, 17, 175, 21, '#');
  g.s(164, 16, 'N');
  g.s(170, 16, 'G');
  const dm = (x: number, y: number, w: number, dx: number, period: number, text: string, color = '#ffffff', layer: LayerMask = 'B', phase = 0): Ent2D =>
    ({ t: 'mover', x, y, w, dx, dy: 0, period, style: 'danmaku', text, color, layer, phase });
  return {
    id: 6, title: '第6话 · Kimo熊的注视', sub: '弹幕像流星一样，从画面的另一边划过来。', theme: 'danmaku', map: g.rows(),
    ents: [
      dm(12, 16, 7, 20, 7, '【Kimo熊】室李嫁！室李嫁！', '#f9a8d4'),
      dm(24, 12, 6, -10, 5.5, '豆沙冲冲冲', '#ffffff', 'B', 0.4),
      dm(46, 14, 8, 22, 7.5, '【Kimo熊】李豆沙：我要和uaua结婚', '#93c5fd'),
      dm(56, 12, 5, -12, 5, '前方高能', '#fde68a', 'R', 0.2),
      dm(58, 9, 5, 12, 5, '小室好帅', '#fdba74', 'M', 0.7),
      dm(84, 12, 7, 24, 8, '【Kimo熊】我是李室民！', '#e5e7eb'),
      dm(96, 8, 6, -14, 6, '这里是Kimo熊应援团', '#c4b5fd', 'R', 0.5),
      dm(98, 16, 9, 12, 6.5, '……这一次，走到门外去。', '#7db4ff', 'M', 0.1),
      dm(124, 13, 9, 26, 8, '【SC】9999CNY：请原地结婚', '#fbbf24'),
      dm(136, 9, 6, -12, 5, '我们一直都在哦', '#f9a8d4', 'B', 0.3),
      dm(144, 15, 5, 10, 4.5, '哈哈哈哈哈', '#ffffff', 'B', 0.8),
      { t: 'prop', k: 'liveBadge', x: 2, y: 4 },
      { t: 'sign', k: 'heartBox', x: 7, y: 16, text: '弹幕从画面的右边飘过来。踩上去，它会带着你走。' },
    ],
  };
};

// ============================================================
const L7 = (): Level2D => {
  const g = new Grid(140, 22);
  g.r(0, 19, 36, 21, '#');
  g.s(2, 18, 'P');
  g.r(10, 17, 14, 18, '#');      // 通风口
  g.r(17, 15, 22, 15, '-');      // 晾衣杆
  g.s(20, 14, 's');
  g.r(37, 21, 44, 21, '^');
  g.r(36, 18, 45, 18, 'm');
  g.r(45, 19, 70, 21, '#');
  g.s(48, 18, 'C');
  // 水塔
  g.r(52, 17, 53, 18, '#');
  g.r(55, 14, 60, 18, '#');
  g.r(62, 12, 66, 12, '-');
  g.s(64, 11, 's');
  g.r(71, 21, 80, 21, '^');
  g.r(73, 17, 76, 17, 'r');
  g.r(79, 15, 82, 15, 'm');
  g.r(81, 19, 139, 21, '#');
  g.r(86, 16, 89, 18, '#');
  g.s(87, 15, 's');
  g.s(96, 18, 'C');
  g.s(124, 18, 'N');
  g.s(130, 18, 'G');
  return {
    id: 7, title: '第7话 · 门前的天台', sub: '今晚的风，有点温柔。', theme: 'rooftop', map: g.rows(),
    ents: [
      { t: 'prop', k: 'vent', x: 10, y: 18 },
      { t: 'prop', k: 'laundryPole', x: 16, y: 18 },
      { t: 'prop', k: 'waterTankBig', x: 55, y: 18 },
      { t: 'prop', k: 'antennaBig', x: 66, y: 18 },
      { t: 'prop', k: 'railing', x: 100, y: 18 },
      { t: 'moment', x: 104, y: 14, w: 2, h: 5, scene: 'c1_m_door' },
      { t: 'prop', k: 'plantPot', x: 110, y: 18 },
      { t: 'sign', k: 'starSign', x: 116, y: 18, text: '天上的星星很亮。今晚的风，有点温柔。', manga: '星星是用白色墨水点上去的。' },
    ],
  };
};

export const LEVELS2D: Level2D[] = [L1(), L2(), L3(), L4(), L5(), L6(), L7()];

export const pageIdFor = (lv: number) => `page_ch${lv}`;
export const shardIdFor = (lv: number, n: number) => `shard_c1_${lv}_${n}`;

/** 第一章收集品总数 */
export const TOTAL_2D = LEVELS2D.reduce((n, lv) => n + lv.map.join('').split('').filter(ch => ch === 'p' || ch === 's').length, 0);
/** 第一章百合页 id 列表 */
export const PAGES_2D = LEVELS2D.filter(lv => lv.map.some(r => r.includes('p'))).map(lv => pageIdFor(lv.id));
