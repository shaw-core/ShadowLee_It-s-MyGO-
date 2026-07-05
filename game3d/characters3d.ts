// ============================================================
// 李豆沙的四套 3D 外观（程序化 lowpoly 建模，零外部资源）
// 依据设定图：
//   1号 睡衣+眼罩版：猫耳帽/银白短发/眼罩遮右眼/蓝白睡衣/抱熊猫玩偶/泡泡袜
//   2号 显示器头版：身体与1号相同/头部换成显示器/屏幕睡眼猫嘴/机械耳
//   3号 熊猫外套版：长白发/蓝色外套/熊猫耳/护目镜/白裙/活泼冒险
//   4号 独眼露目版：银白短发双侧扎/单眼眼罩/熊猫耳/白蓝居家服/腿部创可贴
// ============================================================
import * as THREE from 'three';

export type SkinId = 'skin1' | 'skin2' | 'skin3' | 'skin4';

export interface SkinMeta {
  id: SkinId;
  name: string;
  vibe: string;
  features: string[];
}

export const SKINS: SkinMeta[] = [
  { id: 'skin1', name: '1号 · 睡衣眼罩', vibe: '软萌 · 安静 · 治愈', features: ['猫耳睡帽 + 银白短发', '眼罩遮右眼', '蓝白睡衣风', '怀里抱着熊猫玩偶'] },
  { id: 'skin2', name: '2号 · 显示器头', vibe: 'AI · 机器人 · 电子吉祥物', features: ['身体与1号相同', '头部是一块显示器', '屏幕上是睡眼猫嘴表情', '顶部机械耳'] },
  { id: 'skin3', name: '3号 · 熊猫外套', vibe: '活泼 · 外向 · 冒险感', features: ['及腰长白发', '宽大蓝色外套', '熊猫耳 + 护目镜', '白色连衣裙'] },
  { id: 'skin4', name: '4号 · 独眼露目', vibe: '安静 · 病弱 · 神秘', features: ['银白短发双侧扎', '单眼眼罩 + 熊猫耳', '白蓝色居家服', '腿上贴着创可贴'] },
];

export interface CharacterRig {
  group: THREE.Group;   // 根节点，锚点在脚底
  body: THREE.Group;    // 身体（呼吸/跑动起伏）
  head: THREE.Group;    // 头（轻微摆动）
  legL: THREE.Group; legR: THREE.Group;
  armL: THREE.Group; armR: THREE.Group;
}

// ---- 通用配色 ----
const COL = {
  hair: 0xe8eaf0,
  hairShade: 0xcbd5e1,
  skin: 0xffe9d9,
  blush: 0xfda4af,
  eye: 0x3b82f6,
  blueLight: 0xcfe3ff,
  bluePale: 0xe8f1ff,
  blueDeep: 0x2563eb,
  white: 0xffffff,
  black: 0x14161c,
  patch: 0xf6f7f9,
  bandaid: 0xf5d7b8,
};

const mat = (c: number, opts: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({ color: c, flatShading: true, roughness: 0.92, ...opts });

const box = (w: number, h: number, d: number, c: number, m?: THREE.Material) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m ?? mat(c));
  mesh.castShadow = true;
  return mesh;
};
const ball = (r: number, c: number) => {
  const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), mat(c));
  mesh.castShadow = true;
  return mesh;
};
const cone = (r: number, h: number, c: number, seg = 4) => {
  const mesh = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), mat(c));
  mesh.castShadow = true;
  return mesh;
};

// 2号的显示器脸：canvas 贴图（睡眼 + 猫嘴 ω）
const makeMonitorFaceTexture = (): THREE.CanvasTexture => {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#15181f';
  g.fillRect(0, 0, 256, 256);
  g.fillStyle = '#7db4ff';
  // 睡眼：两条圆角横杠
  const eye = (x: number) => { g.beginPath(); (g as any).roundRect(x, 104, 62, 18, 9); g.fill(); };
  eye(38); eye(156);
  // 猫嘴 ω
  g.strokeStyle = '#7db4ff';
  g.lineWidth = 9;
  g.lineCap = 'round';
  g.beginPath();
  g.arc(112, 168, 15, Math.PI * 0.15, Math.PI * 0.85);
  g.stroke();
  g.beginPath();
  g.arc(144, 168, 15, Math.PI * 0.15, Math.PI * 0.85);
  g.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
};

// ---- 部件工厂 ----

// 眼睛（可单独遮某一只）
const addFace = (head: THREE.Group, hz: number, opts: { patchRight?: boolean }) => {
  const mkEye = (x: number) => {
    const white = box(0.1, 0.11, 0.02, COL.white);
    white.position.set(x, 0.02, hz);
    const iris = box(0.055, 0.11, 0.022, COL.eye);
    iris.position.set(x + 0.015, 0.02, hz + 0.002);
    head.add(white, iris);
  };
  if (opts.patchRight) {
    mkEye(-0.11);
    // 眼罩：白色圆片 + 十字交叉绑带
    const patch = box(0.15, 0.14, 0.03, COL.patch);
    patch.position.set(0.11, 0.03, hz);
    const strap1 = box(0.5, 0.025, 0.02, COL.patch);
    strap1.position.set(0.0, 0.1, hz - 0.005);
    strap1.rotation.z = -0.35;
    const strap2 = box(0.5, 0.025, 0.02, COL.patch);
    strap2.position.set(0.0, -0.04, hz - 0.005);
    strap2.rotation.z = 0.3;
    head.add(patch, strap1, strap2);
  } else {
    mkEye(-0.11); mkEye(0.11);
  }
  // 腮红
  const b1 = box(0.07, 0.035, 0.02, COL.blush);
  b1.position.set(-0.17, -0.07, hz);
  const b2 = b1.clone();
  b2.position.x = 0.17;
  head.add(b1, b2);
  // 小嘴
  const mouth = box(0.045, 0.028, 0.02, 0xe36b7a);
  mouth.position.set(0, -0.11, hz);
  head.add(mouth);
};

// 熊猫玩偶（1、2号抱在怀里）
const buildPandaPlush = (): THREE.Group => {
  const g = new THREE.Group();
  const hood = box(0.2, 0.18, 0.18, COL.blueLight);
  hood.position.y = 0.14;
  const face = box(0.15, 0.12, 0.05, COL.white);
  face.position.set(0, 0.13, 0.09);
  const eL = box(0.045, 0.05, 0.02, COL.black);
  eL.position.set(-0.04, 0.14, 0.12);
  const eR = eL.clone(); eR.position.x = 0.04;
  const body = box(0.18, 0.16, 0.15, COL.blueLight);
  body.position.y = -0.02;
  const belly = box(0.12, 0.1, 0.03, COL.white);
  belly.position.set(0, -0.02, 0.08);
  const earL = ball(0.035, COL.black); earL.position.set(-0.08, 0.24, 0.02);
  const earR = earL.clone(); earR.position.x = 0.08;
  g.add(hood, face, eL, eR, body, belly, earL, earR);
  return g;
};

// 泡泡袜（宽松堆袜）
const addLooseSocks = (leg: THREE.Group, footY: number) => {
  const sock = box(0.19, 0.16, 0.21, COL.white);
  sock.position.y = footY + 0.1;
  leg.add(sock);
};

// 腿部创可贴（4号）
const addBandaid = (leg: THREE.Group, y: number, rot: number) => {
  const b1 = box(0.1, 0.03, 0.02, COL.bandaid);
  b1.position.set(0.02, y, 0.09);
  b1.rotation.z = rot;
  const b2 = box(0.1, 0.03, 0.02, COL.bandaid);
  b2.position.set(0.02, y, 0.095);
  b2.rotation.z = rot + Math.PI / 2.2;
  leg.add(b1, b2);
};

// ============ 主构建函数 ============
export const buildCharacter = (skin: SkinId): CharacterRig => {
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);

  const isPajama = skin === 'skin1' || skin === 'skin2';
  const topColor = isPajama ? COL.blueLight : skin === 'skin3' ? COL.blueDeep : COL.white;

  // ---- 腿（髋部为轴心） ----
  const makeLeg = (x: number) => {
    const leg = new THREE.Group();
    leg.position.set(x, 0.46, 0);
    const thigh = box(0.13, 0.3, 0.15, COL.skin);
    thigh.position.y = -0.15;
    const shoe = box(0.16, 0.12, 0.2, skin === 'skin3' ? COL.black : 0x3a2e2a);
    shoe.position.set(0, -0.4, 0.02);
    leg.add(thigh, shoe);
    if (skin !== 'skin3') addLooseSocks(leg, -0.4);
    return leg;
  };
  const legL = makeLeg(-0.11);
  const legR = makeLeg(0.11);
  body.add(legL, legR);
  if (skin === 'skin4') {
    addBandaid(legL, -0.14, -0.5);
    addBandaid(legR, -0.28, 0.4);
  }

  // ---- 躯干 ----
  if (isPajama) {
    // 蓝白睡衣：宽松上衣 + 白色荷叶边前襟 + 泡泡短裤
    const shirt = box(0.5, 0.4, 0.32, topColor);
    shirt.position.y = 0.68;
    const frill = box(0.2, 0.4, 0.03, COL.white);
    frill.position.set(0, 0.68, 0.17);
    const shorts = box(0.44, 0.16, 0.3, COL.bluePale);
    shorts.position.y = 0.46;
    body.add(shirt, frill, shorts);
  } else if (skin === 'skin3') {
    // 白裙 + 宽大蓝外套（外套更宽更长）
    const dress = box(0.4, 0.44, 0.26, COL.white);
    dress.position.y = 0.66;
    const dressHem = box(0.46, 0.1, 0.3, 0xf1f5f9);
    dressHem.position.y = 0.46;
    const jacket = box(0.6, 0.46, 0.4, topColor);
    jacket.position.set(0, 0.7, -0.03);
    // 白色毛绒围巾
    const scarf = box(0.4, 0.12, 0.3, COL.white);
    scarf.position.y = 0.95;
    body.add(dress, dressHem, jacket, scarf);
  } else {
    // 4号：白蓝居家服，蓝色小披领 + 泡泡短裤
    const top = box(0.48, 0.4, 0.3, COL.white);
    top.position.y = 0.68;
    const collar = box(0.5, 0.08, 0.32, COL.blueLight);
    collar.position.y = 0.9;
    const shorts = box(0.44, 0.16, 0.3, COL.blueLight);
    shorts.position.y = 0.46;
    body.add(top, collar, shorts);
  }

  // ---- 手臂（肩部为轴心） ----
  const armW = skin === 'skin3' ? 0.16 : 0.13;
  const sleeveColor = skin === 'skin3' ? topColor : isPajama ? topColor : COL.white;
  const makeArm = (x: number) => {
    const arm = new THREE.Group();
    arm.position.set(x, 0.86, 0);
    const sleeve = box(armW, 0.3, armW + 0.02, sleeveColor);
    sleeve.position.y = -0.14;
    const hand = box(0.1, 0.09, 0.1, COL.skin);
    hand.position.y = -0.33;
    arm.add(sleeve, hand);
    return arm;
  };
  const armL = makeArm(-(0.3 + (skin === 'skin3' ? 0.04 : 0)));
  const armR = makeArm(0.3 + (skin === 'skin3' ? 0.04 : 0));
  body.add(armL, armR);

  // 1、2号：怀里的熊猫玩偶（挂在身前，左臂微收）
  if (isPajama) {
    const plush = buildPandaPlush();
    plush.position.set(-0.08, 0.62, 0.22);
    plush.rotation.x = -0.15;
    body.add(plush);
    armL.rotation.x = -0.9;
    armL.rotation.z = 0.3;
  }

  // ---- 头 ----
  const head = new THREE.Group();
  head.position.y = 1.08;
  body.add(head);

  if (skin === 'skin2') {
    // ===== 2号：显示器头 =====
    const frame = box(0.62, 0.5, 0.16, 0xdfe3ea);
    const screenMat = new THREE.MeshBasicMaterial({ map: makeMonitorFaceTexture() });
    const screen = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.42, 0.02), screenMat);
    screen.position.z = 0.08;
    // 顶部机械耳：银色短柱 + 蓝色圆点
    const mkRoboEar = (x: number) => {
      const stem = box(0.07, 0.1, 0.07, 0xb9c0cc);
      stem.position.set(x, 0.3, 0);
      const dot = ball(0.055, 0x7db4ff);
      dot.position.set(x, 0.38, 0);
      head.add(stem, dot);
    };
    mkRoboEar(-0.22); mkRoboEar(0.22);
    head.add(frame, screen);
    head.position.y = 1.14;
  } else {
    // ===== 人形头：脸 + 发型 =====
    const face = box(0.44, 0.38, 0.36, COL.skin);
    head.add(face);
    addFace(head, 0.185, { patchRight: skin === 'skin1' || skin === 'skin4' });

    // 刘海 + 顶发
    const bangs = box(0.46, 0.14, 0.1, COL.hair);
    bangs.position.set(0, 0.17, 0.15);
    const top = box(0.48, 0.16, 0.42, COL.hair);
    top.position.y = 0.22;
    const back = box(0.46, 0.34, 0.12, COL.hair);
    back.position.set(0, 0.02, -0.16);
    head.add(bangs, top, back);
    // 侧发（蓝色内层挑染）
    const mkSide = (x: number) => {
      const s = box(0.09, 0.36, 0.3, COL.hair);
      s.position.set(x, -0.02, -0.02);
      const inner = box(0.03, 0.2, 0.2, 0x93c5fd);
      inner.position.set(x, -0.14, 0.02);
      head.add(s, inner);
    };
    mkSide(-0.245); mkSide(0.245);

    if (skin === 'skin3') {
      // 及腰长发（挂在身体上，不随头摆动，垂到裙摆）
      const longHair = box(0.4, 0.62, 0.1, COL.hair);
      longHair.position.set(0, 0.66, -0.22);
      const hairTip = box(0.32, 0.14, 0.09, COL.hairShade);
      hairTip.position.set(0, 0.32, -0.22);
      body.add(longHair, hairTip);
      // 呆毛
      const ahoge = box(0.04, 0.16, 0.04, COL.hair);
      ahoge.position.set(0.03, 0.36, 0);
      ahoge.rotation.z = 0.35;
      head.add(ahoge);
      // 护目镜：黑色头带 + 两片深色镜片，架在额头上
      const band = box(0.5, 0.055, 0.44, COL.black);
      band.position.y = 0.16;
      const mkLens = (x: number) => {
        const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.05, 8), mat(0x2b3340, { roughness: 0.4, metalness: 0.3 }));
        lens.rotation.x = Math.PI / 2;
        lens.position.set(x, 0.18, 0.2);
        lens.castShadow = true;
        head.add(lens);
      };
      mkLens(-0.1); mkLens(0.1);
      head.add(band);
    }

    if (skin === 'skin1') {
      // 猫耳睡帽：浅蓝帽体 + 深蓝帽带 + 白色猫耳
      const hat = box(0.52, 0.18, 0.46, COL.blueLight);
      hat.position.y = 0.28;
      const bandana = box(0.54, 0.08, 0.48, 0x93c5fd);
      bandana.position.y = 0.18;
      const earL2 = cone(0.09, 0.18, COL.white);
      earL2.position.set(-0.18, 0.44, 0);
      const earR2 = earL2.clone();
      earR2.position.x = 0.18;
      head.add(hat, bandana, earL2, earR2);
    }

    if (skin === 'skin3' || skin === 'skin4') {
      // 熊猫耳
      const pe1 = ball(0.1, COL.black);
      pe1.position.set(-0.2, 0.32, -0.02);
      const pe2 = pe1.clone();
      pe2.position.x = 0.2;
      head.add(pe1, pe2);
    }

    if (skin === 'skin4') {
      // 双侧低扎小发束 + 蓝色发饰
      const mkTie = (x: number) => {
        const tuft = box(0.08, 0.22, 0.09, COL.hair);
        tuft.position.set(x, -0.16, -0.08);
        tuft.rotation.z = x > 0 ? -0.25 : 0.25;
        const bead = ball(0.045, 0x93c5fd);
        bead.position.set(x * 0.92, -0.05, -0.06);
        head.add(tuft, bead);
      };
      mkTie(-0.28); mkTie(0.28);
    }
  }

  return { group, body, head, legL, legR, armL, armR };
};
