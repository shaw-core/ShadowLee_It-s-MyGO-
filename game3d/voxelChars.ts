// ============================================================
// 第二章「多边形的世界」角色：体素小人
//
// 做法（参考精细体素手办的思路，造型和配色全是我们自己的角色）：
//  · 身体是干净的方块：躯干 / 手臂 / 腿都是整块，细节（扣子、领口、条纹、创可贴）直接画在体素表面上
//  · 头发和配饰才是一格一格堆出来的：前刘海有长短参差的发梢，两三列一组分深浅，没有随机噪点
//  · 头大约占身高的四成，腿比以前长；五官只画眼睛（上深下浅的虹膜 + 一个高光点）和很小的嘴
//  · 颜色是平涂色块，只保留很轻的环境光遮蔽
// 骨骼接口不变：group / body / head / legL / legR / armL / armR（L 在角色自己的左手边，也就是 -x）
// 坐标：体素单位，脚底 y=0，+z 是脸的方向。
// ============================================================
import * as THREE from 'three';
import { Vox } from './voxel';
import type { CharacterRig, SkinId } from './characters3d';

/** 人物：每格 2.3cm，全身约 46 格 ≈ 1.06m（腿占快一半，和立绘比例一致） */
const VX = 0.023;
/** 吉祥物（熊猫 / 企鹅）：每格 3cm */
const MV = 0.03;
const AO_K = 0.45;

const charMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0 });
const glowMat = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });

type P3 = [number, number, number];
const toMesh = (v: Vox, pivot: P3, m: THREE.Material, s: number) => {
  const me = new THREE.Mesh(v.geometry(s, pivot, 0, AO_K), m);
  me.castShadow = true; me.receiveShadow = true;
  return me;
};
/** 关节：组的位置在轴心，网格以轴心为原点 */
const joint = (parent: THREE.Object3D, v: Vox, pivot: P3, s = VX, m: THREE.Material = charMat) => {
  const g = new THREE.Group();
  g.position.set(pivot[0] * s, pivot[1] * s, pivot[2] * s);
  if (v.size) g.add(toMesh(v, pivot, m, s));
  parent.add(g);
  return g;
};

// ---------------- 调色 ----------------
const SKIN = 0xffe4d4, BLUSH = 0xffc4c4, MOUTH = 0xe39a95;
const INK = 0x262838, WHITE = 0xf6f7fb, OFF = 0xe4e8ef;
const BLUE_STAR = 0x7fb2f0;

interface HairPal { base: number; shade: number; deep: number; tint?: number; inner?: number }
/** 银白发，发梢和内层是蓝色（立绘里豆沙的挑染） */
const SILVER_BLUE: HairPal = { base: 0xeef0f6, shade: 0xd2d7e5, deep: 0xb3bbcf, tint: 0xc4d4ee, inner: 0x6f9be6 };
const SILVER: HairPal = { base: 0xeef0f6, shade: 0xd2d7e5, deep: 0xb3bbcf, tint: 0xb9cdee };
const ORANGE: HairPal = { base: 0xe27b40, shade: 0xc6632f, deep: 0xa04c24 };

interface EyePal { iris: number; irisD: number; irisL: number }
const EYE_BLUE: EyePal = { iris: 0x3f70da, irisD: 0x223f8f, irisL: 0x86adf2 };
const EYE_AMBER: EyePal = { iris: 0xb8722f, irisD: 0x74421c, irisL: 0xe8ac62 };
const EYE_GREY: EyePal = { iris: 0x6b8cb4, irisD: 0x3c5476, irisL: 0xa9c3df };

// ---------------- 头 ----------------
// 头骨 x -8..7（16 宽）· y 25..39（15 高）· z -7..6；脸在 z=6，前刘海在 z=7
const HEAD_Y0 = 25, HEAD_Y1 = 39;

/** 前刘海每一列的长度（x = -9..8），中间短、眼睛上方不挡、两边鬓角长 */
const BANGS: Record<string, number[]> = {
  soft: [12, 10, 6, 4, 5, 3, 4, 6, 5, 4, 6, 4, 3, 5, 4, 6, 10, 12],
  bob: [12, 11, 5, 5, 4, 5, 5, 6, 5, 5, 6, 5, 5, 4, 5, 5, 11, 12],
  long: [15, 13, 6, 4, 5, 3, 4, 7, 5, 4, 7, 4, 3, 5, 4, 6, 13, 15],
};

interface HeadSpec {
  hair: HairPal;
  style: 'bob' | 'long';
  eyes: EyePal;
  patch?: boolean;          // 眼罩遮住右眼（角色自己的右边 = -x）
  glasses?: number;         // 圆框眼镜的框色
  ears?: 'panda' | 'cat';
  earColor?: number;
  beanie?: boolean;         // 白色猫耳毛线帽 + 蓝色毛绒帽檐（毛绒小豆）
  sunglasses?: boolean;     // 推到头顶的飞行员墨镜（大墨镜小李）
  tufts?: boolean;          // 两侧小揪揪 + 白色小翅膀发夹
  ahoge?: boolean;
  braid?: boolean;          // 右侧一条细辫子（大墨镜小李）
  streak?: boolean;         // 前面一缕蓝色挑染
  starMark?: boolean;       // 左眼下面的蓝色小星星
  smile?: boolean;
  starPin?: boolean;
}

/** 发丝：两列一组，按固定的节奏分深浅；发梢最下面一格更深 */
const hairCol = (pal: HairPal) => (x: number, tip = false) => {
  if (tip) return pal.shade;
  const k = [0, 0, 1, 0, 0, 2, 0, 1][(Math.floor((x + 20) / 2)) % 8];
  return k === 1 ? pal.shade : k === 2 && pal.tint ? pal.tint : pal.base;
};

const paintEyes = (h: Vox, o: HeadSpec) => {
  const e = o.eyes;
  for (const x0 of [-6, 2]) {
    const outer = x0 < 0 ? x0 - 1 : x0 + 4;
    for (let x = x0; x <= x0 + 3; x++) h.set(x, 33, 6, INK);
    h.set(outer, 33, 6, INK); h.set(outer, 32, 6, INK);
    for (let x = x0; x <= x0 + 3; x++) { h.set(x, 32, 6, e.irisD); h.set(x, 31, 6, e.iris); h.set(x, 30, 6, e.iris); h.set(x, 29, 6, e.irisL); }
    h.set(x0 + 2, 32, 6, WHITE);
    h.set(x0 + 1, 30, 6, e.irisL);
  }
  if (o.smile) { for (let x = -2; x <= 1; x++) h.set(x, 27, 6, 0xb5505e); h.set(-1, 26, 6, 0xe8909a); h.set(0, 26, 6, 0xe8909a); h.set(-1, 27, 6, WHITE); h.set(0, 27, 6, WHITE); }
  else { h.set(-1, 27, 6, MOUTH); h.set(0, 27, 6, MOUTH); }
  h.set(-7, 28, 6, BLUSH); h.set(-6, 28, 6, BLUSH); h.set(5, 28, 6, BLUSH); h.set(6, 28, 6, BLUSH);
  if (o.starMark) { h.set(6, 29, 6, BLUE_STAR); h.set(5, 28, 6, BLUE_STAR); h.set(6, 28, 6, 0xb6d3f6); }
};

const buildHead = (o: HeadSpec): Vox => {
  const h = new Vox();
  h.box(-8, HEAD_Y0, -7, 7, HEAD_Y1, 6, SKIN);
  paintEyes(h, o);
  const col = hairCol(o.hair);
  const inner = o.hair.inner;
  const sideTo = o.style === 'bob' ? 28 : 27;
  const backTo = o.style === 'long' ? 11 : 27;
  // 发梢颜色：有挑染的话最下面两层是蓝色
  const tipCol = (x: number, y: number, y0: number) => (inner !== undefined && y <= y0 + 1 ? (y === y0 ? inner : 0x9dbdf0) : y === y0 ? col(x, true) : col(x));
  // 头顶两层（削圆角）
  for (let x = -9; x <= 8; x++) for (let z = -8; z <= 7; z++) {
    const corner = (x === -9 || x === 8) && (z === -8 || z === 7);
    if (!corner) h.set(x, 40, z, col(x));
    if (x > -9 && x < 8 && z > -8 && z < 7 && !((x === -8 || x === 7) && (z === -7 || z === 6))) h.set(x, 41, z, col(x));
  }
  for (const x of [-9, 8]) for (let z = -8; z <= 6; z++) for (let y = sideTo; y <= 39; y++) h.set(x, y, z, tipCol(x + z, y, sideTo));
  for (let x = -9; x <= 8; x++) {
    const jag = o.style === 'long' ? [0, 2, 1, 3, 0, 2, 1, 0, 2][(x + 9) % 9] : (x + 9) % 3 === 1 ? 1 : 0;
    const y0 = backTo + jag;
    for (let y = y0; y <= 39; y++) h.set(x, y, -8, tipCol(x, y, y0));
    if (o.style === 'long' && x > -9 && x < 8) for (let y = y0 + 2; y <= 36; y++) h.set(x, y, -9, y === y0 + 2 ? col(x, true) : col(x + 1));
  }
  // 前刘海
  const bangs = BANGS[o.style === 'bob' ? 'bob' : 'long'];
  for (let x = -9; x <= 8; x++) {
    const len = bangs[x + 9];
    const y0 = 40 - len;
    const streak = o.streak && (x === -7 || x === -6);
    for (let y = y0; y <= 40; y++) h.set(x, y, 7, streak ? (y === y0 ? 0x4f7fd4 : 0x6f9be6) : (x === -9 || x === 8) ? tipCol(x, y, y0) : y === y0 ? col(x, true) : col(x));
    if (x === -9 || x === 8) for (let y = y0; y <= 39; y++) h.set(x, y, 6, tipCol(x + 1, y, y0));
  }
  // 长发：胸前两缕
  if (o.style === 'long') for (const x of [-9, 8]) for (let y = 21; y <= 30; y++) { h.set(x, y, 5, col(x + 1, y === 21)); h.set(x, y, 4, col(x, y === 21)); }
  // 右侧细辫子 + 熊猫小夹子
  if (o.braid) {
    for (let y = 19; y <= 30; y++) { const k = y % 2; h.set(-10, y, 5 - k, k ? o.hair.base : o.hair.shade); h.set(-10, y, 4 + k, k ? 0x9dbdf0 : o.hair.base); }
    h.set(-11, 29, 5, WHITE); h.set(-11, 28, 5, 0x24252e); h.set(-11, 30, 5, 0x24252e);
  }
  // 两侧小揪揪 + 白色小翅膀
  if (o.tufts) for (const s of [-1, 1]) {
    const xa = s < 0 ? -10 : 9, xw = s < 0 ? -11 : 10;
    for (let y = 30; y <= 33; y++) for (let z = 0; z <= 2; z++) if (!((y === 30 || y === 33) && z !== 1)) h.set(xa, y, z, y === 30 ? (inner ?? o.hair.shade) : col(xa + z));
    h.set(xw, 33, 1, WHITE); h.set(xw, 34, 0, WHITE); h.set(xw, 34, 2, WHITE); h.set(xw, 33, 2, 0x9dbdf0);
  }
  if (o.ahoge) { h.set(0, 42, 1, o.hair.base); h.set(1, 43, 1, o.hair.base); h.set(1, 44, 0, o.hair.shade); h.set(0, 44, -1, o.hair.shade); }

  if (o.patch) {
    for (let x = -7; x <= -2; x++) for (let y = 28; y <= 34; y++) {
      if ((x === -7 || x === -2) && (y === 28 || y === 34)) continue;
      h.set(x, y, 7, x === -7 || x === -2 || y === 28 || y === 34 ? 0xd9dee8 : ((x + y) % 2 ? 0xf8f9fc : 0xeef1f6));
    }
    h.set(-8, 34, 7, 0xd9dee8); h.set(-1, 34, 7, 0xd9dee8);
  }
  if (o.glasses !== undefined) {
    for (const x0 of [-6, 2]) for (let x = x0 - 1; x <= x0 + 4; x++) for (let y = 28; y <= 34; y++) {
      const edgeX = x === x0 - 1 || x === x0 + 4, edgeY = y === 28 || y === 34;
      if (edgeX && edgeY) continue;
      if (edgeX || edgeY) h.set(x, y, 7, o.glasses);
    }
    h.set(-1, 32, 7, o.glasses); h.set(0, 32, 7, o.glasses);
  }
  if (o.starPin) { const c = 0xf6d06b; h.set(6, 36, 8, c); h.set(5, 36, 8, c); h.set(7, 36, 8, c); h.set(6, 37, 8, c); h.set(6, 35, 8, c); }

  // 熊猫耳（毛茸茸的深色圆耳）
  if (o.ears === 'panda') {
    const E = o.earColor ?? 0x24252e;
    for (const x0 of [-10, 5]) for (let x = x0; x <= x0 + 4; x++) for (let y = 40; y <= 44; y++) for (let z = -3; z <= 0; z++) {
      const ex = x === x0 || x === x0 + 4, ey = y === 44 || y === 40, ez = z === -3 || z === 0;
      if ((ex && ey) || (ex && ez && y > 42) || (ey && ez)) continue;
      h.set(x, y, z, z === 0 && !ex && y > 40 && y < 44 ? 0x4a4048 : E);
    }
  }
  if (o.ears === 'cat') {
    for (const s of [-1, 1]) for (let k = 0; k < 4; k++) {
      const xi = s < 0 ? -8 + Math.ceil(k / 2) : 3 + Math.floor(k / 2);
      const xo = s < 0 ? -4 - Math.floor(k / 2) : 7 - Math.ceil(k / 2);
      for (let x = xi; x <= xo; x++) for (let z = -2; z <= 0; z++) h.set(x, 42 + k, z, z === 0 && x > xi && x < xo && k < 3 ? 0xf2b4bc : o.hair.base);
    }
  }
  // 白色猫耳毛线帽：竖条纹针织 + 蓝色毛绒帽檐 + 左边蝴蝶结、右边星星徽章
  if (o.beanie) {
    const KNIT = 0xf7f8fb, KNIT_S = 0xe1e6ee, BAND = 0x9cc4ec, BAND_S = 0x86b2e2;
    for (let x = -10; x <= 9; x++) for (let z = -9; z <= 8; z++) for (let y = 37; y <= 44; y++) {
      const shell = x === -10 || x === 9 || z === -9 || z === 8 || y >= 43;
      if (!shell) continue;
      if (y === 44 && (x <= -9 || x >= 8 || z <= -8 || z >= 7)) continue;
      if ((x === -10 || x === 9) && (z === -9 || z === 8)) continue;
      const band = y <= 38;
      h.set(x, y, z, band ? ((x * 7 + z * 3 + y) % 4 === 0 ? BAND_S : BAND) : (x + z) % 2 ? KNIT_S : KNIT);
    }
    for (const s of [-1, 1]) for (let k = 0; k < 4; k++) {
      const xi = s < 0 ? -8 + Math.ceil(k / 2) : 3 + Math.floor(k / 2);
      const xo = s < 0 ? -4 - Math.floor(k / 2) : 7 - Math.ceil(k / 2);
      for (let x = xi; x <= xo; x++) for (let z = -2; z <= 0; z++) h.set(x, 45 + k, z, z === 0 && x > xi && x < xo && k < 3 ? 0xd9dde6 : KNIT);
    }
    // 蝴蝶结（角色右边 = -x）
    for (const [x, y] of [[-8, 38], [-8, 39], [-6, 38], [-6, 39], [-7, 38]] as const) h.set(x, y, 9, WHITE);
    h.set(-7, 39, 9, 0x8fb8e6);
    // 星星徽章
    for (const [x, y] of [[5, 39], [4, 39], [6, 39], [5, 40], [5, 38]] as const) h.set(x, y, 9, 0xc7d6ea);
  }
  // 飞行员墨镜推到头顶：银框 + 上深下浅的茶色镜片
  if (o.sunglasses) {
    const F = 0xcfd5de;
    for (const x0 of [-8, 1]) for (let x = x0; x <= x0 + 6; x++) for (let y = 39; y <= 43; y++) {
      const edge = x === x0 || x === x0 + 6 || y === 39 || y === 43;
      if ((x === x0 || x === x0 + 6) && y === 39) continue;
      h.set(x, y, 8, edge ? F : y >= 42 ? 0x2c2420 : y === 41 ? 0x43372f : 0x6a584c);
    }
    h.set(-1, 42, 8, F); h.set(0, 42, 8, F);
    h.set(-6, 42, 8, 0x9a8676);
    for (const x of [-9, 8]) for (let z = 0; z <= 7; z++) h.set(x, 42, z, F);
  }
  return h;
};

/** 电视头：白色外壳 + 深灰屏幕 + 发光的蓝色睡眼与猫嘴，顶上两只圆耳朵 */
const buildTvHead = () => {
  const h = new Vox(), glow = new Vox();
  const CASE = 0xeef1f6, CASE_S = 0xcfd5df, SCR = 0x303337, SCR2 = 0x2b2e32, G = 0x8ec3ff;
  h.box(-10, 25, -5, 9, 40, 4, CASE);
  for (let x = -10; x <= 9; x++) for (let z = -5; z <= 4; z++) h.set(x, 25, z, CASE_S);
  for (let x = -8; x <= 7; x++) for (let y = 27; y <= 38; y++) h.set(x, y, 4, y % 2 ? SCR : SCR2);
  for (let x = -10; x <= 9; x++) { h.set(x, 25, 5, CASE_S); h.set(x, 40, 5, CASE); }
  for (let y = 25; y <= 40; y++) { h.set(-10, y, 5, CASE); h.set(9, y, 5, CASE_S); }
  for (let y = 28; y <= 37; y += 3) { h.set(-10, y, 6, 0xdde2ea); h.set(9, y, 6, 0xdde2ea); }
  const px = (x: number, y: number) => { h.del(x, y, 4); glow.set(x, y, 4, G); };
  // 睡眼：两条粗横杠，外侧低一点
  for (const s of [-1, 1]) for (let k = 0; k < 5; k++) {
    const x = s < 0 ? -7 + k : 6 - k;
    const y = k < 2 ? 32 : 33;
    px(x, y); px(x, y + 1);
  }
  // ω 猫嘴
  for (const x of [-3, 0]) { px(x, 30); }
  for (const x of [-2, -1, 1, 2]) px(x, 29);
  px(-4, 30); px(3, 30);
  // 背面散热槽
  for (let y = 28; y <= 37; y += 2) for (let x = -6; x <= 5; x++) h.set(x, y, -6, CASE_S);
  // 圆耳朵（白壳 + 蓝色内圈）
  for (const x0 of [-9, 5]) for (let x = x0; x <= x0 + 4; x++) for (let y = 41; y <= 45; y++) for (let z = -2; z <= 1; z++) {
    const ex = x === x0 || x === x0 + 4, ey = y === 45;
    if (ex && ey) continue;
    if (z === 1 && !ex && !ey && y > 41) { h.del(x, y, z); glow.set(x, y, z, 0xa9d2ff); continue; }
    h.set(x, y, z, z === -2 || ex || ey ? CASE_S : CASE);
  }
  return { h, glow };
};

// ---------------- 身体 ----------------
// 腿：3 宽 · 4 深（z -2..1），左右各一条，中间空两格不并拢；躯干 x -5..4 · y 14..24 · z -3..2
const LX = -4, RX = 1;
/** 腿高 18 格（y 0..17）；躯干、手臂、头按原坐标建好后整体抬高 DY */
const LEG_TOP = 17, DY = 4;
type LegPaint = (lx: number, y: number, z: number, side: number) => number | null;
interface LegKit { paint: LegPaint; extra?: (v: Vox, x0: number, side: number) => void }
const buildLegs = (kit: LegKit) => {
  const out: Vox[] = [];
  for (const side of [-1, 1]) {
    const x0 = side < 0 ? LX : RX;
    const v = new Vox();
    for (let x = x0; x <= x0 + 2; x++) for (let y = 0; y <= LEG_TOP; y++) for (let z = -2; z <= 1; z++) {
      const c = kit.paint(x - x0, y, z, side);
      if (c !== null) v.set(x, y, z, c);
    }
    kit.extra?.(v, x0, side);
    out.push(v);
  }
  return { legL: out[0], legR: out[1] };
};

/** 前面的皮肤上贴东西（不凸出来，直接画在腿的正面 z=1） */
const sticker = (v: Vox, x: number, y: number, c: number) => { if (v.has(x, y, 1)) v.set(x, y, 1, c); };

/** 灯笼短裤（蓝色 + 白色荷叶边），比腿宽一圈 */
const bloomers = (v: Vox, x0: number, c: number, cS: number) => {
  for (let x = x0 - 1; x <= x0 + 3; x++) for (let y = 15; y <= 17; y++) for (let z = -3; z <= 2; z++) {
    const ex = x === x0 - 1 || x === x0 + 3, ez = z === -3 || z === 2;
    if (ex && ez && y === 15) continue;
    v.set(x, y, z, y === 15 ? cS : c);
  }
  for (let x = x0 - 1; x <= x0 + 3; x++) for (let z = -3; z <= 2; z++) {
    const ring = x === x0 - 1 || x === x0 + 3 || z === -3 || z === 2;
    if (ring) v.set(x, 14, z, (x + z) % 2 ? WHITE : 0xdfe9f7);
  }
};

/** 白色堆堆袜：比腿粗，竖罗纹 + 两道褶，外侧挂一个小毛球 */
const legWarmer = (v: Vox, x0: number, side: number) => {
  for (let x = x0 - 1; x <= x0 + 3; x++) for (let y = 1; y <= 7; y++) for (let z = -3; z <= 2; z++) {
    const ex = x === x0 - 1 || x === x0 + 3, ez = z === -3 || z === 2;
    if (ex && ez) continue;
    const fold = (y === 2 || y === 4 || y === 6) && (x + z + y) % 3 === 0;
    v.set(x, y, z, fold ? 0xd5dbe5 : (x + z) % 2 ? WHITE : OFF);
  }
  const xo = side < 0 ? x0 - 2 : x0 + 4;
  v.set(xo, 7, 0, 0x8fb8e6); v.set(xo, 8, 0, WHITE); v.set(xo, 7, 1, WHITE); v.set(xo, 8, 1, 0x8fb8e6);
};

/** 豆沙两套家居服共用的腿：灯笼短裤、膝盖的十字绷带、粉色创可贴、大腿上的星星翅膀腿环、堆堆袜 */
const doushaLegs = (bloom: number, bloomS: number) => buildLegs({
  paint: (lx, y, z) => (y === 0 ? 0xdfe4ec : SKIN),
  extra: (v, x0, side) => {
    bloomers(v, x0, bloom, bloomS);
    legWarmer(v, x0, side);
    if (side < 0) {
      // 右膝十字绷带
      for (let x = x0; x <= x0 + 2; x++) for (const y of [10, 11]) sticker(v, x, y, WHITE);
      sticker(v, x0 + 1, 10, 0x9cc0ec); sticker(v, x0 + 1, 11, 0x9cc0ec); sticker(v, x0, 11, 0x9cc0ec); sticker(v, x0 + 2, 10, 0x9cc0ec);
      sticker(v, x0 + 1, 8, 0xf3b4c0); sticker(v, x0 + 2, 8, 0xf3b4c0);
    } else {
      // 左大腿：白色腿环 + 星星，下面一张浅蓝创可贴
      for (let x = x0; x <= x0 + 2; x++) for (let z = -2; z <= 1; z++) if (x === x0 || x === x0 + 2 || z === -2 || z === 1) v.set(x, 13, z, WHITE);
      v.set(x0 + 1, 13, 2, 0x8fb8e6); v.set(x0 - 1, 13, 1, WHITE); v.set(x0 + 3, 13, 1, WHITE); v.set(x0 + 1, 12, 2, 0xc7d6ea);
      sticker(v, x0 + 1, 10, 0xc4dcf6); sticker(v, x0 + 2, 10, 0xc4dcf6);
    }
  },
});

interface ArmSpec { x0: number; w: number; sleeve: number; sleeveFrom: number; cuff?: number; skinFrom?: number; handW?: number }
/** 手臂：袖子从 sleeveFrom 到肩膀；袖口以下是手（宽袖子只露出一点手） */
const buildArm = (o: ArmSpec, decorate?: (v: Vox) => void) => {
  const v = new Vox();
  for (let x = o.x0; x < o.x0 + o.w; x++) for (let y = o.sleeveFrom; y <= 24; y++) for (let z = -2; z <= 1; z++)
    v.set(x, y, z, o.cuff !== undefined && y === o.sleeveFrom ? o.cuff : o.sleeve);
  // 裸露的手臂 / 手
  const hw = o.handW ?? 2, hx = o.x0 + Math.floor((o.w - hw) / 2);
  const from = o.skinFrom ?? o.sleeveFrom - 2;
  for (let x = hx; x < hx + hw; x++) for (let y = from; y < o.sleeveFrom; y++) for (let z = -1; z <= 0; z++) v.set(x, y, z, SKIN);
  decorate?.(v);
  return v;
};

type Outfit = { torso: Vox; legL: Vox; legR: Vox; armL: Vox; armR: Vox; armX: number; extra?: Vox; spread?: number };

const torsoBox = (c: number) => { const t = new Vox(); t.box(-5, 14, -3, 4, 24, 2, c); t.box(-2, 25, -1, 1, 25, 0, SKIN); return t; };

/** 外套壳：比躯干大一圈，前襟 [ox0, ox1] 敞开 */
const shell = (t: Vox, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, ox0: number, ox1: number, c: (x: number, y: number, z: number) => number) => {
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) {
    const sh = x === x0 || x === x1 || z === z0 || z === z1;
    if (!sh) continue;
    if (z === z1 && x >= ox0 && x <= ox1) continue;
    t.set(x, y, z, c(x, y, z));
  }
};

/** 毛绒小豆 / 电视头小豆：白色盘扣立领内搭 + 浅蓝宽袖外套（口袋有蕾丝和蝴蝶结）+ 灯笼短裤 */
const fluffy = (): Outfit => {
  const JK = 0xbcd6f2, JK_S = 0xa6c4e8, KNOT = 0x7fa8de;
  const t = torsoBox(0xf8f9fc);
  t.box(-3, 25, -2, 2, 25, 1, 0xf8f9fc); // 立领
  for (const y of [23, 21, 19, 17]) { t.set(-1, y, 2, KNOT); t.set(0, y, 2, KNOT); }
  for (let y = 15; y <= 23; y++) t.set(1, y, 2, y % 2 ? 0xe6edf8 : WHITE); // 荷叶边
  shell(t, -6, 5, 12, 24, -4, 3, -3, 2, (x, y) => (y === 12 ? JK_S : (x === -4 || x === 3) && y % 2 ? WHITE : JK));
  for (let y = 12; y <= 24; y++) { t.set(-4, y, 3, y % 2 ? WHITE : JK); t.set(3, y, 3, y % 2 ? WHITE : JK); }
  // 口袋
  for (const [a, b] of [[-6, -4], [3, 5]] as const) for (let x = a; x <= b; x++) for (let y = 12; y <= 15; y++) t.set(x, y, 4, y === 15 ? WHITE : JK_S);
  t.set(-5, 14, 5, KNOT); t.set(4, 14, 5, KNOT);
  const legs = doushaLegs(0xb9d1ee, 0xa3c1e6);
  const arm = (x0: number) => buildArm({ x0, w: 4, sleeve: JK, sleeveFrom: 12, cuff: 0xeef3fb, skinFrom: 10 }, v => {
    v.set(x0 + 1, 14, 2, 0xd3dae6); v.set(x0 + 2, 14, 2, 0xd3dae6); v.set(x0 + 1, 15, 2, 0xd3dae6); // 心形徽章
    for (let y = 21; y <= 23; y++) v.set(x0 + 1, y, 2, WHITE);
  });
  return { torso: t, ...legs, armL: arm(-10), armR: arm(6), armX: 8 };
};

/** 大墨镜小李：白色长上衣 + 黑色短裤（不是裙子）、蓝色oversize外套带毛领、白围巾、斜挎包、白罗纹袜 + 棕色乐福鞋 */
const pandaJacket = (): Outfit => {
  const J = 0x2f66c9, JS = 0x2756ac, JD = 0x23478f, FUR = 0xf6f6f2, FUR_S = 0xe3e3dc, BROWN = 0x5a3a2a;
  const t = torsoBox(0xf2f3f6);
  // 黑色吊带
  for (let y = 21; y <= 24; y++) { t.set(-3, y, 2, 0x1d1f27); t.set(2, y, 2, 0x1d1f27); }
  // 上衣下摆（到大腿根，下面露出黑色短裤）
  for (let x = -5; x <= 4; x++) for (let z = -3; z <= 2; z++) if (x === -5 || x === 4 || z === -3 || z === 2) { t.set(x, 13, z, 0xf2f3f6); t.set(x, 12, z, x === -1 && z === 2 ? 0xdfe2e8 : 0xf2f3f6); }
  // 斜挎带 + 熊猫小包
  for (let k = 0; k <= 8; k++) t.set(-4 + k, 23 - k, 3, k === 4 ? 0x9aa6bb : 0x1d1f27);
  for (let x = 3; x <= 5; x++) for (let y = 13; y <= 15; y++) for (let z = 3; z <= 4; z++) t.set(x, y, z, WHITE);
  t.set(3, 14, 5, 0x1d1f27); t.set(5, 14, 5, 0x1d1f27); t.set(4, 16, 4, 0xd8404f);
  // 外套：长到大腿，前襟大开，毛领
  shell(t, -7, 6, 11, 22, -5, 4, -4, 3, (x, y) => ((x * 3 + y * 2) % 7 === 0 ? JS : y === 11 ? JD : J));
  for (let y = 11; y <= 22; y++) { t.set(-5, y, 4, 0x9aa6bb); t.set(4, y, 4, 0x9aa6bb); }
  for (let x = -8; x <= 7; x++) for (let z = -6; z <= 5; z++) for (let y = 22; y <= 24; y++) {
    if (x > -8 && x < 7 && z > -6 && z < 5) continue;
    if (z === 5 && x > -4 && x < 3) continue;
    t.set(x, y, z, (x + y + z) % 3 ? FUR : FUR_S);
  }
  for (const [a, b] of [[-7, -5], [4, 6]] as const) for (let x = a; x <= b; x++) for (let y = 12; y <= 16; y++) t.set(x, y, 5, y === 16 ? JD : JS);
  // 棕色背带从右肩垂下来
  for (let y = 11; y <= 21; y++) t.set(-6, y, 6, y === 17 ? 0xb8c0cc : BROWN);
  t.set(-6, 15, 7, WHITE); t.set(-6, 14, 7, 0x1d1f27);
  // 白色毛绒围巾 + 垂下来的一端（粉色爪印）
  for (let x = -5; x <= 4; x++) for (let z = -3; z <= 3; z++) if (x === -5 || x === 4 || z === -3 || z >= 2) { t.set(x, 24, z, FUR); t.set(x, 23, z, FUR_S); }
  for (let y = 16; y <= 23; y++) for (let x = -3; x <= -1; x++) t.set(x, y, 4, (x + y) % 3 ? FUR : FUR_S);
  t.set(-2, 17, 5, 0xf2a0b0); t.set(-3, 18, 5, 0xf2a0b0); t.set(-1, 18, 5, 0xf2a0b0); t.set(-2, 19, 5, 0xf2a0b0);
  const legs = buildLegs({
    paint: (lx, y) => (y === 0 ? 0x231a17 : y <= 1 ? 0x3a2c28 : y <= 8 ? (lx % 2 ? WHITE : OFF) : y >= 14 ? 0x1d1f27 : SKIN),
    extra: (v, x0, side) => {
      for (let x = x0; x <= x0 + 2; x++) { v.set(x, 0, 2, 0x231a17); v.set(x, 1, 2, 0x3a2c28); }
      v.set(x0 + 1, 1, 3, WHITE); v.set(x0 + 1, 2, 2, 0x24252e);
      if (side < 0) { for (let x = x0; x <= x0 + 2; x++) for (let z = -2; z <= 1; z++) if (x === x0 || x === x0 + 2 || z === -2 || z === 1) v.set(x, 13, z, 0x2b2224); v.set(x0 - 1, 12, 1, WHITE); }
      else { v.set(x0 + 3, 6, 0, WHITE); v.set(x0 + 3, 7, 0, 0x24252e); v.set(x0 + 3, 5, 0, 0x24252e); }
    },
  });
  const arm = (x0: number) => buildArm({ x0, w: 5, sleeve: J, sleeveFrom: 13, cuff: JD, skinFrom: 11, handW: 3 }, v => {
    for (let y = 17; y <= 21; y += 2) for (let z = -2; z <= 1; z++) v.set(x0 + (x0 < 0 ? 0 : 4), y, z, JS);
  });
  return { torso: t, ...legs, armL: arm(-12), armR: arm(7), armX: 9.5, spread: 0.2 };
};

/** 眼罩小豆：彼得潘领白衬衫（蓝色荷叶边、流苏蝴蝶结、浅蓝褶）+ 泡泡短袖 + 灯笼短裤 */
const blouse = (): Outfit => {
  const W = 0xf7f8fb, PANEL = 0xd5e5f7, FR = 0xa9c8ef, BOW = 0x8db8f5;
  const t = torsoBox(W);
  for (const x of [-4, -3, 2, 3]) for (let y = 14; y <= 21; y++) t.set(x, y, 2, PANEL);
  // 圆领
  for (let x = -5; x <= 4; x++) { t.set(x, 24, 3, W); t.set(x, 23, 3, Math.abs(x + 0.5) < 1 ? W : FR); }
  t.box(-3, 25, -2, 2, 25, 1, W);
  for (const x of [-2, 1]) { t.set(x, 20, 3, BOW); t.set(x, 19, 3, 0x6f9ee8); t.set(x, 18, 3, BOW); }
  // 下摆荷叶边
  for (let x = -6; x <= 5; x++) for (let z = -4; z <= 3; z++) if (x === -6 || x === 5 || z === -4 || z === 3) { t.set(x, 13, z, (x + z) % 2 ? W : 0xe6edf8); t.set(x, 14, z, W); }
  const legs = doushaLegs(0xbcd3ef, 0xa6c4e8);
  const arm = (x0: number) => buildArm({ x0, w: 3, sleeve: W, sleeveFrom: 20, cuff: FR, skinFrom: 12, handW: 2 }, v => {
    for (let x = x0 - 1; x <= x0 + 3; x++) for (let y = 20; y <= 23; y++) for (let z = -3; z <= 2; z++) {
      const sh = x === x0 - 1 || x === x0 + 3 || z === -3 || z === 2;
      if (sh && !((x === x0 - 1 || x === x0 + 3) && (z === -3 || z === 2))) v.set(x, y, z, y === 20 ? FR : W);
    }
    for (let y = 12; y <= 19; y++) for (let x = x0; x < x0 + 3; x++) for (let z = -1; z <= 0; z++) v.set(x, y, z, SKIN);
  });
  return { torso: t, ...legs, armL: arm(-8), armR: arm(5), armX: 6.5, spread: 0.12 };
};

/** 室友姐：奶油色开衫（口袋里露出薄荷糖）+ 焦糖色百褶裙 + 裸腿 + 拖鞋 */
const cardigan = (): Outfit => {
  const C = 0xf6e4c4, CS = 0xe4cca2, SHIRT = 0xfffaf0, BTN = 0xa8794e, SK = 0xcfa57a, SK2 = 0xbd9166;
  const t = torsoBox(C);
  for (let y = 19; y <= 24; y++) { const w = Math.floor((y - 19) / 2); for (let x = -1 - w; x <= w; x++) t.set(x, y, 2, (x === -1 - w || x === w) && w > 0 ? CS : SHIRT); }
  for (let y = 14; y <= 18; y++) t.set(-1, y, 2, CS);
  for (const y of [15, 17]) t.set(0, y, 2, BTN);
  for (let x = -4; x <= -2; x++) for (let y = 15; y <= 17; y++) t.set(x, y, 3, y === 17 ? CS : C);
  t.set(-3, 18, 3, 0x8fe0c0); // 薄荷糖
  t.paint(-5, 14, -3, 4, 14, 2, (x) => (x % 2 ? CS : 0xdcc397));
  const extra = new Vox();
  for (let x = -6; x <= 5; x++) for (let y = 9; y <= 13; y++) for (let z = -4; z <= 3; z++) {
    const sh = x === -6 || x === 5 || z === -4 || z === 3 || y === 13;
    if (sh) extra.set(x, y, z, y === 9 ? SK2 : Math.floor((x + z + 20) / 2) % 2 ? SK : SK2);
  }
  const legs = buildLegs({
    paint: (_lx, y) => (y === 0 ? 0xf3e4cc : y <= 1 ? 0x8a5a3c : SKIN),
    extra: (v, x0) => { for (let x = x0; x <= x0 + 2; x++) { v.set(x, 0, 2, 0xf3e4cc); v.set(x, 1, 2, 0x8a5a3c); v.set(x, 2, 2, 0xfff1dc); } },
  });
  const arm = (x0: number) => buildArm({ x0, w: 3, sleeve: C, sleeveFrom: 15, cuff: CS, skinFrom: 13 });
  return { torso: t, ...legs, armL: arm(-8), armR: arm(5), armX: 6.5, extra };
};

/** 悠亚：水手服 + 百褶裙 + 白色过膝袜 */
const sailor = (): Outfit => {
  const TOP = 0x8ec0d8, TOP_S = 0x78aac4, NAVY = 0x34507a, SK = 0x4f6f9e, SK2 = 0x45628c;
  const t = torsoBox(TOP);
  t.paint(-5, 14, -3, 4, 14, 2, TOP_S);
  for (let y = 18; y <= 24; y++) { const d = (y - 18) * 0.75; for (let x = -5; x <= 4; x++) { const a = Math.abs(x + 0.5); if (a >= d - 0.5 && a <= d + 1.5) t.set(x, y, 2, WHITE); } }
  for (let x = -4; x <= 3; x++) for (let y = 20; y <= 24; y++) t.set(x, y, -3, y === 21 ? NAVY : WHITE);
  t.set(-1, 19, 3, NAVY); t.set(0, 19, 3, NAVY); t.set(-2, 20, 3, NAVY); t.set(1, 20, 3, NAVY); t.set(-1, 18, 3, NAVY); t.set(0, 17, 3, NAVY);
  t.set(2, 16, 3, 0x1e2433); t.set(3, 16, 3, 0x1e2433); t.set(2, 17, 3, 0x1e2433); t.set(3, 17, 3, WHITE); t.set(3, 15, 3, 0xf28a3c);
  const extra = new Vox();
  for (let x = -6; x <= 5; x++) for (let y = 9; y <= 14; y++) for (let z = -4; z <= 3; z++) {
    const sh = x === -6 || x === 5 || z === -4 || z === 3 || y === 14;
    if (sh) extra.set(x, y, z, y === 9 ? NAVY : (Math.floor((x + z + 20) / 2) % 2 ? SK : SK2));
  }
  const legs = buildLegs({
    paint: (lx, y) => (y === 0 ? 0x1a2030 : y <= 1 ? 0x2a3245 : y <= 11 ? (lx % 2 ? WHITE : OFF) : SKIN),
    extra: (v, x0) => { for (let x = x0; x <= x0 + 2; x++) { v.set(x, 0, 2, 0x1a2030); v.set(x, 1, 2, 0x2a3245); } },
  });
  const arm = (x0: number) => buildArm({ x0, w: 3, sleeve: TOP, sleeveFrom: 15, cuff: WHITE, skinFrom: 13 });
  return { torso: t, ...legs, armL: arm(-8), armR: arm(5), armX: 6.5, extra };
};

/** 怀里（右手臂弯）抱着的熊猫玩偶：穿着带猫耳的蓝色连帽斗篷 */
const plush = () => {
  const p = new Vox(), B = 0x24252e, HOOD = 0xa9c8ec, HOOD_S = 0x93b6e2, PAD = 0xb9696e;
  // 斗篷身体
  for (let x = -10; x <= -4; x++) for (let y = 14; y <= 18; y++) for (let z = 4; z <= 8; z++) {
    const front = z === 8 && x > -9 && x < -5;
    p.set(x, y, z, front ? WHITE : (x + y) % 4 ? HOOD : HOOD_S);
  }
  p.set(-7, 16, 9, 0xd7dfeb); p.set(-7, 15, 9, WHITE);
  // 黑色的脚（粉色肉垫）
  for (const x0 of [-9, -6]) { p.box(x0, 12, 7, x0 + 1, 13, 9, B); p.set(x0, 13, 10, PAD); p.set(x0 + 1, 13, 10, PAD); }
  p.box(-11, 15, 5, -11, 17, 7, B); p.box(-3, 15, 5, -3, 17, 7, B);
  // 头：白脸 + 蓝色兜帽
  for (let x = -11; x <= -3; x++) for (let y = 18; y <= 24; y++) for (let z = 4; z <= 9; z++) {
    const hoodShell = x === -11 || x === -3 || y === 24 || z === 4;
    if (hoodShell) p.set(x, y, z, (x + z) % 3 ? HOOD : HOOD_S);
    else if (z === 9) p.set(x, y, z, WHITE);
  }
  // 熊猫眼圈 + 高光、鼻子、腮红
  for (const x0 of [-10, -5]) { p.set(x0, 20, 9, B); p.set(x0 + 1, 20, 9, B); p.set(x0, 21, 9, B); p.set(x0 + 1, 21, 9, B); p.set(x0 + (x0 < -7 ? 1 : 0), 21, 9, WHITE); }
  p.set(-7, 19, 9, B); p.set(-10, 19, 9, 0xf2a6ae); p.set(-4, 19, 9, 0xf2a6ae);
  // 兜帽上的猫耳
  for (const x0 of [-11, -5]) { for (let x = x0; x <= x0 + 2; x++) p.set(x, 25, 6, HOOD); p.set(x0 + 1, 26, 6, HOOD); p.set(x0 + 1, 25, 7, 0xf2b4bc); }
  return p;
};

// ---------------- 组装 ----------------
/** 上半身按原坐标建模，组装时整体抬高 DY（腿变长了） */
const lift = (v: Vox) => { const o = new Vox(); o.merge(v, 0, DY, 0); return o; };
const assemble = (out: Outfit, head: Vox, opts: { glow?: Vox; plush?: boolean; name: string }): CharacterRig => {
  const group = new THREE.Group(), body = new THREE.Group();
  group.add(body);
  body.add(toMesh(lift(out.torso), [0, 0, 0], charMat, VX));
  if (out.extra) body.add(toMesh(lift(out.extra), [0, 0, 0], charMat, VX));
  const legL = joint(body, out.legL, [LX + 1.5, LEG_TOP + 1, 0]);
  const legR = joint(body, out.legR, [RX + 1.5, LEG_TOP + 1, 0]);
  const armL = joint(body, lift(out.armL), [-out.armX, 24 + DY, 0]);
  const armR = joint(body, lift(out.armR), [out.armX, 24 + DY, 0]);
  if (out.spread) { armL.rotation.z = -out.spread; armR.rotation.z = out.spread; }
  const headG = joint(body, lift(head), [0, 25 + DY, 0]);
  if (opts.glow) headG.add(toMesh(lift(opts.glow), [0, 25 + DY, 0], glowMat, VX));
  if (opts.plush) {
    body.add(toMesh(lift(plush()), [0, 0, 0], charMat, VX));
    // 右手臂弯起来托着玩偶，另一只手自然垂着
    armL.rotation.x = -0.85; armL.rotation.z = 0.45;
  }
  group.name = `character:${opts.name}:voxel`;
  return { group, body, head: headG, legL, legR, armL, armR };
};

export function buildVoxelCharacter(id: SkinId | 'yua'): CharacterRig {
  switch (id) {
    case 'skin1': return assemble(fluffy(), buildHead({ hair: SILVER_BLUE, style: 'bob', eyes: EYE_BLUE, beanie: true, tufts: true, starMark: true }), { plush: true, name: id });
    case 'skin2': { const tv = buildTvHead(); return assemble(fluffy(), tv.h, { glow: tv.glow, plush: true, name: id }); }
    case 'skin3': return assemble(pandaJacket(), buildHead({ hair: SILVER_BLUE, style: 'long', eyes: EYE_BLUE, ears: 'panda', earColor: 0x2b2422, sunglasses: true, braid: true, streak: true, ahoge: true, starMark: true, smile: true }), { name: id });
    case 'skin4': return assemble(blouse(), buildHead({ hair: SILVER_BLUE, style: 'bob', eyes: EYE_BLUE, patch: true, ears: 'panda', tufts: true, ahoge: true, starMark: true }), { name: id });
    case 'skinNovus': return assemble(cardigan(), buildHead({ hair: ORANGE, style: 'long', eyes: EYE_AMBER, ears: 'cat' }), { name: id });
    case 'yua': return assemble(sailor(), buildHead({ hair: SILVER, style: 'long', eyes: EYE_GREY, glasses: 0x8a7350, starPin: true }), { name: id });
  }
}

// ============================================================
// 吉祥物：存档点熊猫（Kimo 熊）/ 企鹅 / 魔法熊猫
// 坐姿，约 28 格高；围巾单独一块（激活时整体染成粉色，头顶亮星）
// ============================================================
/** 削掉棱边的长方体：看起来圆一点，但仍然是方块 */
const roundBox = (v: Vox, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, c: number | ((x: number, y: number, z: number) => number)) => {
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) {
    const ex = x === x0 || x === x1, ey = y === y0 || y === y1, ez = z === z0 || z === z1;
    if ((ex ? 1 : 0) + (ey ? 1 : 0) + (ez ? 1 : 0) >= 2) continue;
    v.set(x, y, z, typeof c === 'number' ? c : c(x, y, z));
  }
};

export function buildVoxelMascot(kind: 'panda' | 'penguin' | 'witch') {
  const penguin = kind === 'penguin';
  const B = penguin ? 0x262e48 : 0x24252e, W = 0xf7f6f1, BEAK = 0xeea446;
  const group = new THREE.Group(), body = new THREE.Group();
  group.add(body);

  // 身体
  const t = new Vox();
  roundBox(t, -7, 2, -6, 6, 13, 5, penguin ? B : W);
  for (let x = -4; x <= 3; x++) for (let y = 3; y <= 11; y++) if (!((x === -4 || x === 3) && (y === 3 || y === 11))) t.set(x, y, 6, penguin ? W : 0xfdfbf5);
  if (!penguin) { t.box(-7, 10, -5, 6, 13, -5, B); t.paint(-7, 10, -6, 6, 13, 5, (x, _y, z) => (z <= -3 || x <= -6 || x >= 5 ? B : W)); }
  body.add(toMesh(t, [0, 0, 0], charMat, MV));

  // 腿（坐着，脚伸向前）
  const leg = (x0: number) => {
    const v = new Vox();
    roundBox(v, x0, 0, 1, x0 + 3, 3, 7, penguin ? BEAK : B);
    if (!penguin) { v.set(x0 + 1, 1, 8, 0xf2b4bc); v.set(x0 + 2, 1, 8, 0xf2b4bc); v.set(x0 + 1, 2, 8, 0xf2b4bc); v.set(x0 + 2, 2, 8, 0xf2b4bc); }
    return v;
  };
  const legL = joint(body, leg(-6), [-4.5, 3, 3], MV);
  const legR = joint(body, leg(2), [3.5, 3, 3], MV);
  // 手臂 / 翅膀
  const arm = (x0: number) => { const v = new Vox(); roundBox(v, x0, 5, -1, x0 + 2, 12, 2, B); return v; };
  const armL = joint(body, arm(-10), [-8.5, 12, 0.5], MV);
  const armR = joint(body, arm(7), [8.5, 12, 0.5], MV);

  // 头
  const h = new Vox();
  roundBox(h, -8, 13, -7, 7, 26, 6, penguin ? B : W);
  if (penguin) {
    // 白色脸盘：两片包住眼睛
    for (const x0 of [-7, 0]) for (let x = x0; x <= x0 + 6; x++) for (let y = 14; y <= 22; y++) {
      if ((x === x0 || x === x0 + 6) && (y === 14 || y === 22)) continue;
      h.set(x, y, 6, W);
    }
    for (let y = 14; y <= 17; y++) for (let x = -2; x <= 1; x++) h.set(x, y, 6, W);
  } else {
    // 熊猫眼圈（向外下垂）
    for (const [x0, s] of [[-6, -1], [2, 1]] as const) for (let x = x0; x <= x0 + 3; x++) for (let y = 17; y <= 21; y++) {
      const outerLow = s < 0 ? x === x0 : x === x0 + 3;
      if (y === 21 && (s < 0 ? x === x0 : x === x0 + 3)) continue;
      if (y === 17 && !outerLow && (s < 0 ? x === x0 + 3 : x === x0)) continue;
      h.set(x, y, 6, B);
    }
    // 耳朵
    for (const x0 of [-9, 4]) roundBox(h, x0, 24, -3, x0 + 4, 28, 1, B);
    h.set(-1, 16, 7, B); h.set(0, 16, 7, B); h.set(-1, 15, 6, 0x5a5c68); h.set(0, 15, 6, 0x5a5c68);
  }
  // 眼睛
  for (const x0 of [-5, 3]) {
    if (penguin) { h.set(x0, 18, 6, INK); h.set(x0, 19, 6, INK); h.set(x0, 20, 6, INK); }
    else { h.set(x0, 18, 6, 0x4a4d5e); h.set(x0, 19, 6, WHITE); }
  }
  for (const x of [-7, 6]) h.set(x, 16, 7, 0xf2b4bc); // 腮红
  if (penguin) { h.box(-1, 16, 7, 0, 17, 8, BEAK); h.set(-1, 16, 9, BEAK); h.set(0, 16, 9, BEAK); }
  if (kind === 'witch') {
    // 蓝星脸颊
    for (const [x, y] of [[-6, 15], [-5, 15], [-7, 15], [-6, 14], [-6, 16]] as const) h.set(x, y, 7, 0x8db8f5);
    // 巫师帽：阶梯锥形，尖往后弯
    const HAT = 0x2b3164, BAND = 0x8da8e4;
    for (let k = 0; k < 12; k++) {
      const r = k === 0 ? 11 : Math.max(1, 7 - Math.floor(k * 0.6));
      const dz = k > 7 ? -(k - 7) : 0;
      for (let x = -r; x <= r - 1; x++) for (let z = -r + dz; z <= r - 1 + dz; z++) {
        if (k === 0 && (Math.abs(x + 0.5) + Math.abs(z + 0.5) > r * 1.45)) continue;
        h.set(x, 27 + k, z, k === 1 ? BAND : HAT);
      }
    }
    h.set(-1, 30, 7, 0xf6d06b); h.set(0, 30, 7, 0xf6d06b); h.set(-1, 31, 7, 0xf6d06b); h.set(0, 29, 7, 0xf6d06b);
  }
  const head = joint(body, h, [0, 13, 0], MV);

  // 围巾（单独材质：激活时染色）
  const scarf = new Vox();
  for (let x = -8; x <= 7; x++) for (let z = -7; z <= 6; z++) {
    if (x > -8 && x < 7 && z > -7 && z < 6) continue;
    scarf.set(x, 12, z, 0xffffff); scarf.set(x, 13, z, 0xffffff);
  }
  for (let y = 8; y <= 11; y++) { scarf.set(2, y, 6, 0xffffff); scarf.set(3, y, 6, 0xffffff); }
  scarf.set(2, 7, 6, 0xe8ecf5); scarf.set(3, 7, 6, 0xe8ecf5);
  const scarfMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, color: 0x91adc9 });
  body.add(toMesh(scarf, [0, 0, 0], scarfMat, MV));

  const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.075), new THREE.MeshStandardMaterial({ color: 0xffd789, emissive: 0xe79f43, emissiveIntensity: 0.5, flatShading: true }));
  star.position.y = (kind === 'witch' ? 41 : 31) * MV; star.visible = false;
  group.add(star);

  if (kind === 'witch') {
    // 扫帚：身体跨坐在上面，手往前握
    const broom = new Vox();
    broom.box(0, 0, -20, 1, 1, 20, 0x8a6446);
    broom.box(-2, -2, -29, 3, 3, -21, 0xd7b06e);
    broom.box(-3, -3, -27, 4, 4, -23, 0xc79a52);
    broom.box(-2, -2, -21, 3, 3, -20, 0xf3d268);
    const bm = toMesh(broom, [0.5, 0.5, 0], charMat, MV);
    bm.position.set(0, 4 * MV, 0);
    body.add(bm);
    armL.rotation.x = -0.9; armR.rotation.x = -0.9;
    scarfMat.color.setHex(0x8da8e4);
  }
  group.name = kind === 'witch' ? 'mascot:witch:voxel' : `checkpoint:${kind}`;
  return {
    group, body, head, armL, legL, armR, legR,
    setActivated: () => { scarfMat.color.setHex(0xe997b6); star.visible = true; },
    reset: () => { scarfMat.color.setHex(kind === 'witch' ? 0x8da8e4 : 0x91adc9); star.visible = false; },
  };
}
