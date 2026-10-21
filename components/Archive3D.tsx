// ============================================================
// 隐藏系统 · 3D 档案馆（/SYSTEM_HIDDEN）
//  v0.16.1：空间重建为四个分区（入口电视迷宫 → VHS 网格通道 → 故障机房 → 世界树核心），
//  布局与坐标见 game3d/archiveLayout.ts，几何组件见 game3d/archiveZones.ts。
//  · 只有电视头小豆一个人能进来。这里没有时间戳，不在任何一条故事线上。
//  · 每份记录是一件摆在黑暗里的「东西」：走近，按 F 读取。
//    读取时，除了文字，周围的东西也会跟着动——世界会变薄、镜子里的人会转头、
//    平台会自己重排、封存的盒子会打开……
//  · 角落里还有一些不会弹出文字的线索。
// 记录的原文一字不改（由 MatrixEnding 传进来）。
// ============================================================
import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { buildCharacter, buildCheckpointPanda, CharacterRig } from '../game3d/characters3d';
import { LEVELS3D } from '../game3d/levels3d';
import { Vox } from '../game3d/voxel';
import { getSave } from '../core/save';
import { buildCosmos, softSprite } from '../game3d/archiveWorld';
import { buildArchiveZones, walkable, SPAWN, STATIONS, TRAIL, KIMO_POS, CRACK_POS } from '../game3d/archiveLayout';

export interface ArchiveFile { name: string; size: string; content: string | null }

interface Props {
  files: ArchiveFile[];
  pageCipher: [string, string, string][];
  collectedPages: string[];
  sealedContent: string;
  checkPassword: (pw: string) => boolean;
  onRead: (name: string) => void;
  onExit: () => void;
  blip: (f: number, d: number, t?: OscillatorType, g?: number, slide?: number) => void;
}

const G = '#36e07a', DIM = 'rgba(54,224,122,.55)', AMBER = '#f5c451', RED = '#ff5d6c';
const MONO = '"JetBrains Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, "Noto Sans SC", monospace';

// ---------------- 小工具 ----------------
const canvasTex = (w: number, h: number, draw: (x: CanvasRenderingContext2D) => void) => {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d')!; draw(x);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return { tex: t, canvas: c, ctx: x };
};
const glowMat = (color: number, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, toneMapped: false });
const edges = (geo: THREE.BufferGeometry, color: number, opacity = 0.9) =>
  new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color, transparent: true, opacity }));
const voxMesh = (v: Vox, s: number) => new THREE.Mesh(v.geometry(s, [0, 0, 0], 0.04), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }));
const smooth = (k: number) => { const t = Math.max(0, Math.min(1, k)); return t * t * (3 - 2 * t); };

/** 一张柔光贴片 */
let gTex: THREE.Texture | null = null;
const glowSprite = (color: number, size: number, opacity = 0.8) => {
  if (!gTex) gTex = canvasTex(64, 64, x => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,.4)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); }).tex;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: gTex, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }));
  s.scale.setScalar(size);
  return s;
};

/** 基座：一块发着细光的黑色方台 */
const pedestal = (w = 1.6, h = 0.5, d = 1.6) => {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: 0x0c1411, roughness: 0.6, metalness: 0.3 }));
  m.position.y = h / 2; g.add(m);
  const e = edges(new THREE.BoxGeometry(w, h, d), 0x36e07a, 0.55); e.position.y = h / 2; g.add(e);
  return g;
};

// ---------------- 和 Kimo 的对话（草稿，等 Kan 定稿） ----------------
type TalkLine = { who: 'kimo' | 'tv'; t: string };
const KIMO_FIRST: TalkLine[] = [
  { who: 'kimo', t: '……你又来了。' },
  { who: 'tv', t: '……' },
  { who: 'kimo', t: '这里没有时间戳。你从哪一条线过来，我不问。' },
  { who: 'tv', t: '她们走到第五块了。' },
  { who: 'kimo', t: '我看见了。' },
  { who: 'kimo', t: '路上的熊猫，有一半是我放的。' },
  { who: 'kimo', t: '另一半，是你吧。' },
  { who: 'tv', t: '上一次，她们没走到门口。' },
  { who: 'kimo', t: '……所以你把那一条线也带过来了。' },
  { who: 'tv', t: '只带了一句话。' },
  { who: 'kimo', t: '哪一句？' },
  { who: 'tv', t: '这一次，走到门外去。' },
  { who: 'kimo', t: '那就别发出去。' },
  { who: 'kimo', t: '门要她们自己推开，才算数。' },
  { who: 'kimo', t: '他们以为我一直在看那道缝。' },
  { who: 'kimo', t: '其实我在看她们。' },
  { who: 'kimo', t: '……去吧。你要找的东西，在树底下。' },
];
const KIMO_SEALED: TalkLine[] = [
  { who: 'kimo', t: '你听到那段录音了。' },
  { who: 'tv', t: '嗯。' },
  { who: 'kimo', t: '我本来想让它删掉的。' },
  { who: 'tv', t: '你只是把它藏起来了。' },
  { who: 'kimo', t: '……' },
  { who: 'kimo', t: '那就替我保管好。' },
  { who: 'kimo', t: '等她们走出去的那一天——' },
  { who: 'kimo', t: '也别放给她们听。' },
];
const KIMO_AGAIN: TalkLine[] = [
  { who: 'kimo', t: '这里很安静吧。' },
  { who: 'tv', t: '……嗯。' },
  { who: 'kimo', t: '去吧。' },
];

// ---------------- 记录点 ----------------
interface Station {
  name: string;
  pos: THREE.Vector3;
  radius: number;
  group: THREE.Group;
  label?: CSS2DObject;
  activeAt: number;      // 最近一次读取的时间（秒），-1 表示还没读
  update: (t: number, dt: number, s: Station) => void;
}

const Archive3D: React.FC<Props> = ({ files, pageCipher, collectedPages, sealedContent, checkPassword, onRead, onExit, blip }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [open, setOpen] = useState<{ kind: 'view' | 'denied' | 'password' | 'sealed' | 'panda'; name: string } | null>(null);
  const [title, setTitle] = useState(true);
  const [pw, setPw] = useState('');
  const [pwErr, setPwErr] = useState(false);
  const [readCount, setReadCount] = useState(0);
  const [talk, setTalk] = useState<{ lines: TalkLine[]; i: number } | null>(null);
  const talkRef = useRef(talk); talkRef.current = talk;
  const api = useRef<{ trigger: (name: string, kind?: string) => void; unlock: () => void } | null>(null);
  const openRef = useRef(open); openRef.current = open;
  const talkAdvance = useRef<() => void>(() => {});

  useEffect(() => { const t = setTimeout(() => setTitle(false), 3800); return () => clearTimeout(t); }, []);

  useEffect(() => {
    const mount = mountRef.current!;
    const W = () => mount.clientWidth, H = () => mount.clientHeight;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true }); } catch { return; }
    const st0 = getSave().settings;
    const zoneOpts = { low: st0.quality === 'low', reduce: st0.reduceMotion };
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, zoneOpts.low ? 1 : st0.quality === 'medium' ? 1.4 : 1.75));
    renderer.setSize(W(), H());
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.shadowMap.enabled = false;
    mount.appendChild(renderer.domElement);
    const labels = new CSS2DRenderer({ element: labelRef.current! });
    labels.setSize(W(), H());

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x03040b);
    scene.fog = new THREE.FogExp2(0x05071a, 0.012);
    const camera = new THREE.PerspectiveCamera(55, W() / H(), 0.05, 800);
    scene.add(new THREE.HemisphereLight(0x5a6aa8, 0x05060c, 0.55));
    const key = new THREE.DirectionalLight(0xbfd2ff, 0.35); key.position.set(-6, 10, 4); scene.add(key);

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(W(), H()), 0.6, 0.55, 0.72);
    bloom.enabled = !zoneOpts.low;   // 低画质：关掉泛光，几何一件不少
    composer.addPass(bloom);
    composer.addPass(new OutputPass());

    // 整个档案馆放在一个根节点里（「变薄」的时候一起压扁）
    const world = new THREE.Group();
    scene.add(world);

    // ---- 世界尽头：星空 + 四个分区（入口电视迷宫 / VHS 网格通道 / 故障机房 / 世界树核心） ----
    const updCosmos = buildCosmos(scene);
    const Z = buildArchiveZones(world, zoneOpts);
    const colliders = Z.colliders;
    const boxes = Z.boxes;

    // ---- 天上的裂缝（09）：从缝里漏出一点别的颜色 ----
    const crack = new THREE.Group();
    {
      const s = new THREE.Shape(); const len = 34, w = 3;
      s.moveTo(0, len / 2); s.lineTo(w / 2, len * 0.18); s.lineTo(w * 0.15, -len * 0.08); s.lineTo(w * 0.5, -len / 2); s.lineTo(-w * 0.12, -len * 0.04); s.lineTo(-w / 2, len * 0.22);
      const m = new THREE.Mesh(new THREE.ShapeGeometry(s), new THREE.MeshBasicMaterial({ color: 0xfff4dc, toneMapped: false, fog: false })); crack.add(m);
      for (const [c, x, y, sz] of [[0xffb3d1, -3, 4, 18], [0x9fd3ff, 3, -3, 20], [0xfff1a6, 0, 8, 16], [0xc4b5fd, -2, -8, 17]] as const) {
        const sp = softSprite(c, sz, 0.4); sp.position.set(x, y, -1); crack.add(sp);
      }
    }
    crack.position.copy(CRACK_POS); crack.lookAt(0, 8, -37);
    scene.add(crack);

    // ---- 电视头小豆 ----
    const rig: CharacterRig = buildCharacter('skin2');
    world.add(rig.group);
    const headLight = new THREE.PointLight(0x7db4ff, 6, 7, 1.6);
    headLight.position.set(0, 1.25, 0.25); rig.group.add(headLight);
    const P = { x: SPAWN.x, y: 0, z: SPAWN.z, vy: 0, face: SPAWN.face, grounded: true };

    // ---- 文件 → 记录点 ----
    const stations: Station[] = [];
    const fileByName = (n: string) => files.find(f => f.name === n);
    const label = (text: string, kind: 'file' | 'enc' | 'lock' | 'exit' | 'none') => {
      const d = document.createElement('div');
      d.className = 'archive-label';
      d.dataset.kind = kind;
      d.textContent = text;
      return new CSS2DObject(d);
    };
    // v0.16.1：记录点用显式世界坐标（archiveLayout.ts 的 STATIONS），不再摆在一圈环带上
    const addStation = (name: string, radius: number, build: (g: THREE.Group) => Station['update'], lbl?: string, labelY = 2.4) => {
      const L = STATIONS[name];
      const pos = new THREE.Vector3(L.x, 0, L.z);
      const group = new THREE.Group(); group.position.copy(pos);
      group.rotation.y = Math.atan2(L.face[0] - L.x, L.face[1] - L.z); // 本地 +z 对着 face 点
      world.add(group);
      const f = fileByName(name);
      const kind = name === '__exit' ? 'exit' : name.startsWith('__') ? 'none' : f?.content === null ? 'lock' : f?.content === 'ENCRYPTED' ? 'enc' : 'file';
      const st: Station = { name, pos, radius, group, activeAt: -1, update: () => {} };
      st.update = build(group);
      if (kind !== 'none') {
        st.label = label(lbl ?? name, kind);
        st.label.position.set(0, labelY, 0);
        group.add(st.label);
      }
      stations.push(st);
      return st;
    };
    const since = (s: Station, t: number) => (s.activeAt < 0 ? Infinity : t - s.activeAt);

    // 1) 草稿页：五张纸绕着基座转
    addStation('draft_pages.dat', 1.3, g => {
      g.add(pedestal(1.2, 0.6, 1.2));
      const pages: THREE.Mesh[] = [];
      pageCipher.forEach(([id, label2, cipher], i) => {
        const has = collectedPages.includes(id);
        const { tex } = canvasTex(128, 170, x => {
          x.fillStyle = has ? '#fffdf3' : 'rgba(0,0,0,0)'; x.fillRect(0, 0, 128, 170);
          x.strokeStyle = has ? '#c9d3e6' : '#36e07a'; x.setLineDash(has ? [] : [6, 6]); x.lineWidth = 3; x.strokeRect(3, 3, 122, 164);
          if (has) {
            x.fillStyle = '#94a3b8'; for (let l = 0; l < 7; l++) x.fillRect(16, 30 + l * 16, 70 + (l * 13) % 30, 3);
            x.fillStyle = '#2563eb'; x.font = 'bold 15px monospace';
            const letters = cipher.replace(/^.*：/, '');
            if (i < 4) { const [a2, b2] = letters.split(' · '); x.fillText(a2 ?? '', 8, 18); x.fillText(b2 ?? '', 108, 162); }
            else { x.font = '11px sans-serif'; x.fillText('A 是 0。往后数。', 18, 160); }
          } else { x.fillStyle = '#36e07a'; x.font = '12px monospace'; x.fillText(label2, 40, 90); }
        });
        const m = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.73), new THREE.MeshBasicMaterial({ map: tex, color: 0xb8bcb4, transparent: true, side: THREE.DoubleSide, opacity: has ? 1 : 0.7 }));
        g.add(m); pages.push(m);
      });
      return (t, dt, s) => {
        const k = since(s, t) < 6 ? 2.6 : 1;
        pages.forEach((m, i) => {
          const a = t * 0.4 * k + (i / pages.length) * Math.PI * 2;
          const r = since(s, t) < 6 ? 1.6 : 1.05;
          m.position.set(Math.cos(a) * r, 1.4 + Math.sin(t * 1.3 + i) * 0.12, Math.sin(a) * r);
          m.lookAt(g.position.x * 0 + Math.cos(a) * 3, 1.4, Math.sin(a) * 3);
        });
      };
    });

    // 2) 新闻墙：一排屏幕滚着标题。读取时——世界变薄
    let thinAt = -1;
    addStation('news_archive.txt', 2.2, g => {
      const content = fileByName('news_archive.txt')?.content ?? '';
      const heads = content.split('\n').filter(l => l.startsWith('「')).map(l => l.replace(/[「」]/g, ''));
      const screens: { c: ReturnType<typeof canvasTex>; off: number }[] = [];
      for (let i = 0; i < 6; i++) {
        const c = canvasTex(256, 144, () => {});
        const m = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.85), new THREE.MeshBasicMaterial({ map: c.tex, toneMapped: false }));
        m.position.set((i % 3 - 1) * 1.65, 1.2 + Math.floor(i / 3) * 0.98, 0);
        g.add(m);
        const fr = edges(new THREE.PlaneGeometry(1.52, 0.87), 0x1f8a4f, 0.8); fr.position.copy(m.position); g.add(fr);
        screens.push({ c, off: i * 1.7 });
      }
      const frame = new THREE.Mesh(new THREE.BoxGeometry(5.2, 2.4, 0.3), new THREE.MeshStandardMaterial({ color: 0x0b120f }));
      frame.position.set(0, 1.65, -0.2); g.add(frame);
      let last = -1;
      return (t, dt, s) => {
        if (t - last < 0.25) return;
        last = t;
        const reading = since(s, t) < 4;
        screens.forEach((sc, i) => {
          const x = sc.c.ctx;
          x.fillStyle = '#04100a'; x.fillRect(0, 0, 256, 144);
          for (let n = 0; n < 900; n++) { x.fillStyle = `rgba(54,224,122,${Math.random() * 0.12})`; x.fillRect(Math.random() * 256, Math.random() * 144, 2, 2); }
          if (reading && i === 4) {
            x.fillStyle = '#f5c451'; x.font = 'bold 20px monospace'; x.fillText('维度稳定度', 18, 50);
            x.font = 'bold 48px monospace'; x.fillText('2.4', 70, 110);
          } else {
            const h = heads[(Math.floor(t * 0.5 + sc.off) + i) % Math.max(1, heads.length)] ?? '';
            x.fillStyle = Math.random() < 0.04 ? '#ff5d6c' : '#9ff5c2'; x.font = '15px sans-serif';
            const words = h.split(''); let line = '', y = 30;
            for (const ch of words) { if (x.measureText(line + ch).width > 228) { x.fillText(line, 14, y); line = ''; y += 22; if (y > 130) break; } line += ch; }
            if (y <= 130) x.fillText(line, 14, y);
          }
          sc.c.tex.needsUpdate = true;
        });
      };
    }, undefined, 3.2);

    // 3) P.A.N.D.A.：一层套一层的盒子（最里面是一页漫画，外面一层是一座低模小岛）
    addStation('panda_plan.doc', 1.6, g => {
      g.add(pedestal(1.6, 0.4, 1.6));
      const boxes: THREE.Object3D[] = [];
      [2.1, 1.45, 0.9].forEach((s2, i) => {
        const b = edges(new THREE.BoxGeometry(s2, s2, s2), [0x36e07a, 0x6ee7f2, 0xf5c451][i], 0.9);
        b.position.y = 1.7; g.add(b); boxes.push(b);
      });
      const comic = canvasTex(64, 80, x => { x.fillStyle = '#fff'; x.fillRect(0, 0, 64, 80); x.strokeStyle = '#111'; x.lineWidth = 3; x.strokeRect(4, 4, 56, 72); x.beginPath(); x.moveTo(4, 36); x.lineTo(60, 36); x.moveTo(30, 36); x.lineTo(30, 76); x.stroke(); });
      const page = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.42), new THREE.MeshBasicMaterial({ map: comic.tex, side: THREE.DoubleSide, toneMapped: false }));
      page.position.y = 1.7; g.add(page);
      const isl = new Vox(); isl.box(-3, 0, -2, 3, 0, 2, 0x7fd497); isl.ellipsoid(0, -0.5, 0, 3, 2.5, 2.2, (x, y) => (y < 0 ? 0xa98d78 : null));
      const im = voxMesh(isl, 0.07); im.position.set(0, 1.25, 0); g.add(im);
      const name = canvasTex(256, 48, x => { x.fillStyle = '#36e07a'; x.font = 'bold 30px monospace'; x.fillText('P.A.N.D.A.', 40, 36); });
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.3), new THREE.MeshBasicMaterial({ map: name.tex, transparent: true, toneMapped: false }));
      sign.position.set(0, 0.25, 0.81); g.add(sign);
      // 第三个签名：基座侧面一个很淡的 Kimo
      const sig = canvasTex(128, 32, x => { x.fillStyle = 'rgba(245,196,81,.9)'; x.font = 'italic 20px serif'; x.fillText('Kimo', 30, 24); });
      const sigM = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.15), new THREE.MeshBasicMaterial({ map: sig.tex, transparent: true, opacity: 0, toneMapped: false }));
      sigM.position.set(0.81, 0.2, 0); sigM.rotation.y = Math.PI / 2; g.add(sigM);
      return (t, dt, s) => {
        const k = since(s, t);
        const open2 = k < 7 ? smooth(k / 1.2) * (1 - smooth((k - 5.5) / 1.5)) : 0;
        boxes.forEach((b, i) => { b.rotation.y = t * (0.25 + i * 0.2) * (i % 2 ? -1 : 1); b.rotation.x = Math.sin(t * 0.3 + i) * 0.2; b.position.y = 1.7 + open2 * (i - 1) * 0.9; });
        page.rotation.y = t * 0.8; page.position.y = 1.7 + open2 * 0.9;
        im.rotation.y = -t * 0.4; im.position.y = 1.25 - open2 * 0.2;
        (sigM.material as THREE.MeshBasicMaterial).opacity = Math.min(1, s.activeAt < 0 ? 0 : (t - s.activeAt) / 3) * 0.8;
      };
    }, undefined, 3.3);

    // 4) 事故 0x02：沙箱的一面墙碎了，两个人影手牵着手站在外面
    addStation('incident_0x02.log', 1.9, g => {
      const box = edges(new THREE.BoxGeometry(2.4, 1.8, 1.6), 0x6ee7f2, 0.6); box.position.set(-0.6, 0.9, -0.6); g.add(box);
      const shards: THREE.Mesh[] = [];
      for (let i = 0; i < 9; i++) {
        const m = new THREE.Mesh(new THREE.TetrahedronGeometry(0.12 + Math.random() * 0.1), glowMat(0x6ee7f2, 0.6));
        m.position.set(0.7 + Math.random() * 0.6, 0.3 + Math.random() * 1.4, -0.6 + (Math.random() - 0.5) * 1.4); g.add(m); shards.push(m);
      }
      const ghostMat = new THREE.MeshBasicMaterial({ color: 0x9fe8ff, transparent: true, opacity: 0.35, depthWrite: false, toneMapped: false });
      const ghost = (skin: 'skin1' | 'skinNovus', x: number, armSide: 'L' | 'R') => {
        const r2 = buildCharacter(skin);
        r2.group.traverse(o => { const m = o as THREE.Mesh; if (m.isMesh) m.material = ghostMat; });
        r2.group.position.set(x, 0, 0.6); r2.group.scale.setScalar(0.9);
        if (armSide === 'R') { r2.armR.rotation.z = 0.6; } else { r2.armL.rotation.z = -0.6; }
        g.add(r2.group);
        return r2;
      };
      ghost('skin1', 0.95, 'R'); ghost('skinNovus', 1.6, 'L');
      const loop = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.025, 8, 32), glowMat(0xff8fc8));
      loop.position.set(1.28, 0.42, 0.62); g.add(loop);
      const anchors: THREE.Mesh[] = [];
      for (let i = 0; i < 10; i++) {
        const a = new THREE.Mesh(new THREE.OctahedronGeometry(0.08), glowMat(0x7db4ff));
        a.position.set(1.3 + Math.sin(i * 0.6) * 0.4, 0.12, 1.2 + i * 0.45); a.visible = i % 2 === 0; g.add(a); anchors.push(a);
      }
      return (t, dt, s) => {
        const k = since(s, t);
        shards.forEach((m, i) => { m.rotation.x = t * (0.5 + i * 0.1); m.position.y += Math.sin(t * 1.5 + i) * 0.0015; });
        loop.scale.setScalar(1 + (k < 8 ? Math.sin(t * 6) * 0.25 + 0.4 : Math.sin(t * 2) * 0.05));
        loop.rotation.y = t;
        // 读过之后：锚点密度变成 2 倍
        anchors.forEach((a, i) => { a.visible = i % 2 === 0 || s.activeAt >= 0; a.rotation.y = t * 2; a.position.y = 0.12 + Math.sin(t * 2 + i) * 0.03; });
      };
    }, undefined, 2.6);

    // 5) TVHEAD 追踪：一面镜子。读过以后，镜子里的她会转过头去看裂缝
    let mirrorRig: CharacterRig | null = null;
    let mirrorMsg: THREE.Mesh | null = null;
    const mirrorSt = addStation('trace_tvhead.log', 1.8, g => {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(2.6, 3.4, 0.25), new THREE.MeshStandardMaterial({ color: 0x0b120f, metalness: 0.5, roughness: 0.4 }));
      frame.position.set(0, 1.7, -0.15); g.add(frame);
      // 镜子后面是一个小房间，镜像站在里面
      const room = new THREE.Mesh(new THREE.BoxGeometry(2.3, 3.1, 4), new THREE.MeshBasicMaterial({ color: 0x020403, side: THREE.BackSide, fog: false }));
      room.position.set(0, 1.7, -2.3); g.add(room);
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 3.1), new THREE.MeshBasicMaterial({ color: 0x8fd8ff, transparent: true, opacity: 0.04, depthWrite: false, toneMapped: false }));
      glass.position.set(0, 1.7, 0.0); g.add(glass);
      const fr = edges(new THREE.PlaneGeometry(2.32, 3.12), 0x7db4ff, 0.8); fr.position.set(0, 1.7, 0.01); g.add(fr);
      // 把前面的框挖空：用四条边代替整块
      frame.visible = false;
      for (const [w, h, x, y] of [[2.6, 0.15, 0, 3.3], [2.6, 0.15, 0, 0.1], [0.15, 3.4, -1.22, 1.7], [0.15, 3.4, 1.22, 1.7]]) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.3), new THREE.MeshStandardMaterial({ color: 0x0b120f })); b.position.set(x, y, -0.1); g.add(b);
      }
      mirrorRig = buildCharacter('skin2');
      g.add(mirrorRig.group);
      const ml = new THREE.PointLight(0x7db4ff, 3, 4); ml.position.set(0, 1.2, -1); mirrorRig.group.add(ml);
      const msg = canvasTex(512, 96, x => { x.fillStyle = '#04102a'; x.fillRect(0, 0, 512, 96); x.fillStyle = '#bfe0ff'; x.font = 'bold 34px sans-serif'; x.fillText('这一次，走到门外去。', 74, 60); });
      mirrorMsg = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.225), new THREE.MeshBasicMaterial({ map: msg.tex, transparent: true, opacity: 0, toneMapped: false }));
      mirrorMsg.position.set(0, 2.55, -1.2); g.add(mirrorMsg);
      return () => {};
    }, undefined, 3.6);

    // 地上的一串蓝色锚点：从门口一直延伸到裂缝那边（读过追踪记录后会亮起来）
    const trail: THREE.Mesh[] = [];
    {
      const path = new THREE.CatmullRomCurve3(TRAIL.map(([x, z]) => new THREE.Vector3(x, 0.12, z)));
      const anchorGeo = new THREE.OctahedronGeometry(0.1);
      for (let i = 0; i < 34; i++) {
        const a = new THREE.Mesh(anchorGeo, glowMat(0x7db4ff, 0.35));
        a.position.copy(path.getPointAt(i / 33)); a.position.x += Math.sin(i * 0.9) * 0.35;
        world.add(a); trail.push(a);
      }
    }

    // 6) L3 世界重排：三块平台，会自己咔哒归位（也会有一帧没对齐）
    addStation('level3_shift.src', 1.8, g => {
      const slab = (c: number) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.12, 0.8), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.25 })); g.add(m); return m; };
      const a = slab(0xf5a3cf), b = slab(0x8fc7f2), c = slab(0xffd36e);
      const from = [new THREE.Vector3(-0.9, 1.0, -0.4), new THREE.Vector3(0.8, 1.6, 0.3), new THREE.Vector3(0.1, 2.3, -0.6)];
      const to = [new THREE.Vector3(-0.6, 1.0, 0), new THREE.Vector3(0.1, 1.5, 0), new THREE.Vector3(0.8, 2.0, 0)];
      const ghost = edges(new THREE.BoxGeometry(0.8, 0.12, 0.8), 0xff5d6c, 0.9); ghost.visible = false; g.add(ghost);
      g.add(pedestal(2.2, 0.3, 1.4));
      return (t, dt, s) => {
        const k = since(s, t);
        const cyc = k < Infinity ? (k % 4) : 0;
        const e = k < Infinity ? smooth((cyc - 0.4) / 0.7) * (1 - smooth((cyc - 3.2) / 0.6)) : 0;
        [a, b, c].forEach((m, i) => m.position.lerpVectors(from[i], to[i], e));
        // 没对齐的那一帧
        ghost.visible = k < Infinity && cyc > 0.75 && cyc < 0.8;
        ghost.position.copy(to[1]).add(new THREE.Vector3(0.12, 0.05, 0.1));
        // 震动 0.55s
        g.position.x = s.pos.x + (k < Infinity && cyc > 0.4 && cyc < 0.95 ? (Math.random() - 0.5) * 0.04 : 0);
      };
    }, undefined, 3);

    // 7/8) 渲染快照：用真正的关卡数据摆出一个全息小模型
    const holo = (lv: number) => (g: THREE.Group) => {
      g.add(pedestal(2.2, 0.7, 2.2));
      const L = LEVELS3D[lv];
      const mini = new THREE.Group();
      const pts: THREE.Vector3[] = [];
      for (const e of L.entities) {
        if (!['PLATFORM', 'MOVER', 'CRUMBLE', 'FADE', 'BOUNCE', 'CHECKPOINT', 'GOAL'].includes(e.type)) continue;
        const w = e.w ?? 1, h = e.h ?? 0.4, d = e.d ?? 1;
        const col = e.type === 'GOAL' ? 0xf5c451 : e.type === 'CHECKPOINT' ? 0x7db4ff : e.layerMask === 'MANGA' ? 0x6ee7f2 : 0x36e07a;
        const bx = edges(new THREE.BoxGeometry(w, Math.max(0.2, h), d), col, 0.8);
        bx.position.set(e.x, e.y, e.z); mini.add(bx);
        if (e.type === 'PLATFORM') pts.push(new THREE.Vector3(e.x, e.y + 0.5, e.z));
      }
      const bb = new THREE.Box3().setFromObject(mini); const c = bb.getCenter(new THREE.Vector3()); const sz = bb.getSize(new THREE.Vector3());
      const sc = 1.8 / Math.max(sz.x, sz.z);
      mini.children.forEach(o => o.position.sub(c));
      mini.scale.setScalar(sc); mini.position.y = 1.0 + sz.y * sc * 0.5;
      g.add(mini);
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), glowMat(0xffffff)); mini.add(dot);
      const beam = glowSprite(0x36e07a, 1.8, 0.2); beam.position.y = 1.4; g.add(beam);
      return (t: number, dt: number, s: Station) => {
        mini.rotation.y = t * 0.2;
        const k = since(s, t);
        dot.visible = k < 12;
        if (dot.visible && pts.length > 1) {
          const f = ((k / 8) % 1) * (pts.length - 1); const i = Math.floor(f);
          dot.position.lerpVectors(pts[i], pts[Math.min(pts.length - 1, i + 1)], f - i).sub(c);
        }
        (beam.material as THREE.SpriteMaterial).opacity = k < 12 ? 0.5 : 0.18;
      };
    };
    addStation('snap_L1.txt', 1.6, holo(0), undefined, 2.9);
    addStation('snap_L3.txt', 1.6, holo(2), undefined, 2.9);

    // 9) version.log：一台旧显示器
    addStation('version.log', 1.2, g => {
      const body = new Vox(); body.box(-5, 0, -4, 5, 8, 4, 0xc9c2a8); body.box(-6, -4, -5, 6, -1, 5, 0xb8b199);
      const bm = voxMesh(body, 0.09); bm.position.y = 0.9; g.add(bm);
      const scr = canvasTex(160, 120, x => { x.fillStyle = '#031208'; x.fillRect(0, 0, 160, 120); x.fillStyle = '#36e07a'; x.font = '10px monospace'; ['changelog', '----------', 'v0.14.0', 'v0.13.8', 'v0.13.7', '...'].forEach((l, i) => x.fillText(l, 10, 18 + i * 16)); });
      const sm = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.58), new THREE.MeshBasicMaterial({ map: scr.tex, toneMapped: false }));
      sm.position.set(0, 1.27, 0.37); g.add(sm);
      return (t, dt, s) => { (sm.material as THREE.MeshBasicMaterial).color.setScalar(since(s, t) < 2 ? 0.6 + Math.random() * 0.6 : 1); };
    }, undefined, 2.1);

    // 10) 封存卷宗：中央的黑色方块。输入密钥后，盒子打开，三件证物升起来
    let unlockedAt = -1;
    const vault = addStation('sealed_truth.enc', 2.2, g => {
      const faces: THREE.Mesh[] = [];
      const mat = new THREE.MeshStandardMaterial({ color: 0x0a0d0b, metalness: 0.6, roughness: 0.35 });
      const S2 = 2.2;
      const mk = (pos: THREE.Vector3, rot: THREE.Euler) => { const m = new THREE.Mesh(new THREE.BoxGeometry(S2, S2, 0.08), mat); m.position.copy(pos); m.rotation.copy(rot); g.add(m); faces.push(m); const e = edges(new THREE.BoxGeometry(S2, S2, 0.08), 0xf5c451, 0.7); m.add(e); return m; };
      mk(new THREE.Vector3(0, S2 / 2, S2 / 2), new THREE.Euler(0, 0, 0));
      mk(new THREE.Vector3(0, S2 / 2, -S2 / 2), new THREE.Euler(0, 0, 0));
      mk(new THREE.Vector3(S2 / 2, S2 / 2, 0), new THREE.Euler(0, Math.PI / 2, 0));
      mk(new THREE.Vector3(-S2 / 2, S2 / 2, 0), new THREE.Euler(0, Math.PI / 2, 0));
      mk(new THREE.Vector3(0, S2, 0), new THREE.Euler(Math.PI / 2, 0, 0));
      const base = faces.map(f => ({ p: f.position.clone(), r: f.rotation.clone() }));
      const digits = canvasTex(256, 48, x => { x.fillStyle = '#000'; x.fillRect(0, 0, 256, 48); x.fillStyle = '#f5c451'; x.font = 'bold 30px monospace'; x.fillText('_ _ _ _ _ _ _ _', 14, 34); });
      const dm = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.26), new THREE.MeshBasicMaterial({ map: digits.tex, toneMapped: false }));
      dm.position.set(0, 1.1, S2 / 2 + 0.05); faces[0].add(dm); dm.position.set(0, -0.0, 0.05);
      // 证物：返回舱（六个座位）、柱状图、红色日志 → OVERRIDE、录音波形
      const exhibits = new THREE.Group(); exhibits.visible = false; exhibits.scale.setScalar(1.3); g.add(exhibits);
      const exLight = new THREE.PointLight(0xffd59a, 6, 9, 1.4); exLight.position.set(0, 2.6, 1.2); exhibits.add(exLight);
      const pod = new Vox();
      pod.ellipsoid(0, 0, 0, 7, 5, 5, (x, y, z) => (z > 1 && y > -1 && x > -5 && x < 5 ? null : (x + y) % 4 === 0 ? 0xc9d0dc : 0xe5e9f0));
      for (let i = 0; i < 6; i++) pod.box(-4 + (i % 3) * 3, -1, i < 3 ? -1 : 1, -3 + (i % 3) * 3, 0, i < 3 ? -1 : 1, 0x39404f);
      const podM = voxMesh(pod, 0.07); podM.position.set(-1.7, 1.6, 0); exhibits.add(podM);
      const eyes: THREE.Mesh[] = [];
      for (let i = 0; i < 6; i++) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), glowMat(0xff3b4e)); e.position.set(-1.7 - 0.21 + (i % 3) * 0.21, 1.6, i < 3 ? -0.07 : 0.07); exhibits.add(e); eyes.push(e); }
      const vals = [87.21, 41.5, 2.34];
      const bars = vals.map((v, i) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1, 0.28), glowMat([0x36e07a, 0xf5c451, 0xff5d6c][i], 0.85)); m.position.set(-0.4 + i * 0.42, 0.6, 0.4); exhibits.add(m); return m; });
      const logs = canvasTex(256, 256, () => {});
      const logM = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.3), new THREE.MeshBasicMaterial({ map: logs.tex, transparent: true, toneMapped: false }));
      logM.position.set(1.9, 1.8, 0); exhibits.add(logM);
      const wave = new THREE.Group(); wave.position.set(0, 3.3, 0); exhibits.add(wave);
      const waveBars: THREE.Mesh[] = [];
      for (let i = 0; i < 32; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1, 0.05), glowMat(0xf5c451, 0.9)); const a = (i / 32) * Math.PI * 2; m.position.set(Math.cos(a) * 0.7, 0, Math.sin(a) * 0.7); wave.add(m); waveBars.push(m); }
      const LOG_LINES = ['11:45:22 裂缝-09', '11:45:25 外部协议入侵', '11:45:28 KILL-9 ──', '11:45:30 中止', '11:45:30 OVERRIDE', '        O3-3 (Kimo)'];
      return (t) => {
        if (unlockedAt < 0) return;
        const k = t - unlockedAt;
        const o = smooth(k / 1.6);
        faces.forEach((f, i) => {
          const b = base[i];
          if (i === 4) { f.position.set(0, b.p.y + o * 4, 0); f.rotation.set(b.r.x, o * 1.4, 0); f.visible = o < 0.98; return; }
          // 四面墙以底边为轴向外倒下
          const n = b.p.clone().setY(0).normalize();
          const axis = new THREE.Vector3(0, 1, 0).cross(n).normalize();
          const ang = o * Math.PI / 2;
          f.quaternion.setFromAxisAngle(axis, ang).multiply(new THREE.Quaternion().setFromEuler(b.r));
          const up = new THREE.Vector3(0, 1, 0).multiplyScalar(Math.cos(ang)).add(n.clone().multiplyScalar(Math.sin(ang)));
          f.position.copy(n.clone().multiplyScalar(S2 / 2)).add(up.multiplyScalar(S2 / 2));
        });
        exhibits.visible = k > 1.2;
        exhibits.position.y = Math.min(0, -1.5 + (k - 1.2) * 1.2);
        exhibits.rotation.y = Math.sin(t * 0.15) * 0.3;
        eyes.forEach((e, i) => { e.visible = Math.sin(t * 9 + i) > -0.2; });
        bars.forEach((m, i) => { const target = vals[i] / 100 * 2.2 + 0.03; const v = Math.min(target, Math.max(0.03, (k - 2 - i * 0.6) * 0.9)); m.scale.y = v; m.position.y = v / 2 + 0.3; });
        // 日志：红色往下滚，最后一行变成琥珀色的 OVERRIDE
        const x = logs.ctx; x.clearRect(0, 0, 256, 256); x.font = '15px monospace';
        const n = Math.min(LOG_LINES.length, Math.floor((k - 3) / 0.6));
        for (let i = 0; i < n; i++) { x.fillStyle = i >= 3 ? '#f5c451' : '#ff5d6c'; x.fillText(LOG_LINES[i], 6, 30 + i * 32); }
        logs.tex.needsUpdate = true;
        waveBars.forEach((m, i) => { m.scale.y = 0.15 + Math.abs(Math.sin(t * 7 + i * 0.7) * Math.sin(t * 2.3 + i)) * (k > 7 ? 0.8 : 0.1); m.position.y = 0; });
      };
    }, undefined, 3.2);

    // 11) world_03.plan：北边的门。门外有一片天空正在慢慢上色
    addStation('world_03.plan', 1.6, g => {
      for (const x of [-1.6, 1.6]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.5, 5, 0.5), new THREE.MeshStandardMaterial({ color: 0x0e1612 })); p.position.set(x, 2.5, 0); g.add(p); const pe = edges(new THREE.BoxGeometry(0.5, 5, 0.5), 0x36e07a, 0.5); pe.position.set(x, 2.5, 0); g.add(pe); }
      const field = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 4.6), new THREE.MeshBasicMaterial({ color: 0xff5d6c, transparent: true, opacity: 0.12, side: THREE.DoubleSide, toneMapped: false }));
      field.position.set(0, 2.4, 0); g.add(field);
      const colors: THREE.Sprite[] = [];
      [0xffb3d1, 0x9fd3ff, 0xfff1a6, 0xb6f0c4, 0xc4b5fd].forEach((c, i) => { const sp = glowSprite(c, 8 + i * 2, 0); sp.position.set((i - 2) * 4, 6 + (i % 2) * 4, -18 - i * 3); g.add(sp); colors.push(sp); });
      return (t, dt, s) => {
        const k = since(s, t);
        (field.material as THREE.MeshBasicMaterial).opacity = k < 0.9 ? 0.5 + Math.random() * 0.3 : 0.1 + Math.sin(t * 2) * 0.03;
        colors.forEach((sp, i) => { (sp.material as THREE.SpriteMaterial).opacity = Math.max(0, Math.sin(t * 0.25 + i * 1.3)) * 0.45; });
      };
    }, 'world_03.plan', 5.4);

    // 出口：南边机房缺口里的一扇门——离开这里只有这一条路（不在界面上放按钮，免得读档时误点）
    addStation('__exit', 1.3, g => {
      const glow = new THREE.MeshBasicMaterial({ color: 0x36e07a, toneMapped: false });
      const box = (w: number, h: number, d: number, x: number, y: number, m: THREE.Material) => {
        const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, 0); g.add(o); return o;
      };
      // 门框就是入口那台碎掉的大电视（archiveZones.buildBrokenFrame）；这里只在开口里补一圈绿色的边光
      const rim = [box(0.05, 2.3, 0.08, -1.62, 1.8, glow), box(0.05, 2.3, 0.08, 1.62, 1.8, glow), box(3.2, 0.05, 0.08, 0, 2.95, glow)];
      // 门里：一片往下流的绿色光幕
      const veil = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, side: THREE.FrontSide, blending: THREE.AdditiveBlending,   // 只朝里面：进场时镜头在门后面，不能被光幕糊住
        uniforms: { t: { value: 0 } },
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
        fragmentShader: `uniform float t; varying vec2 vUv;
          void main(){
            float col = floor(vUv.x * 18.);
            float sp = .35 + fract(sin(col * 12.9898) * 43758.5453) * .6;
            float y = fract(vUv.y + t * sp + col * .37);
            float rain = smoothstep(.0, .9, y) * step(.55, fract(sin(col * 78.233) * 9631.7));
            float edge = smoothstep(.0, .18, vUv.x) * smoothstep(1., .82, vUv.x) * smoothstep(0., .08, vUv.y);
            float base = .18 + .08 * sin(vUv.y * 9. - t * 2.);
            vec3 c = mix(vec3(.21,.88,.48), vec3(.55,.95,1.), vUv.y);
            gl_FragColor = vec4(c, (base + rain * .55) * edge);
          }`,
      });
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(3.25, 2.4), veil); plane.position.set(0, 1.8, -0.05); g.add(plane);
      const halo = softSprite(0x36e07a, 4.6, 0.3); halo.position.set(0, 1.8, -0.3); g.add(halo);
      const floorGlow = new THREE.Mesh(new THREE.CircleGeometry(1.4, 32), new THREE.MeshBasicMaterial({ color: 0x36e07a, transparent: true, opacity: 0.18, depthWrite: false, toneMapped: false }));
      floorGlow.rotation.x = -Math.PI / 2; floorGlow.position.y = 0.02; g.add(floorGlow);
      const motes = Array.from({ length: 12 }, (_, i) => {
        const m = softSprite(i % 3 ? 0x36e07a : 0x9cf0ff, 0.14, 0.9);
        m.position.set((Math.random() - 0.5) * 3.0, 0.6 + Math.random() * 2.4, 0.1); g.add(m); return m;
      });
      return (t, dt) => {
        veil.uniforms.t.value = t;
        // 进场时镜头在门后面：门里的光晕、光点、边光只在从里面看时出现，免得把画面糊成一片绿
        const front = camera.position.z < g.position.z - 0.3;
        halo.visible = front; floorGlow.visible = front; rim.forEach(o => { o.visible = front; }); motes.forEach(m => { m.visible = front; });
        (halo.material as THREE.SpriteMaterial).opacity = 0.3 + Math.sin(t * 1.6) * 0.08;
        motes.forEach((m, i) => { m.position.y += dt * (0.4 + (i % 4) * 0.15); if (m.position.y > 3.0) m.position.set((Math.random() - 0.5) * 3.0, 0.6, 0.1); });
      };
    }, '[ 离开 ]', 3.9);

    // 角落：一只看着裂缝的熊猫（不弹任何文字）
    const kimo = buildCheckpointPanda();
    kimo.group.position.set(KIMO_POS.x, 0, KIMO_POS.z); kimo.group.scale.setScalar(1.4);
    kimo.group.lookAt(crack.position.x, 0, crack.position.z);
    world.add(kimo.group);
    const kimoLabel = label('O3-3', 'none'); kimoLabel.position.set(0, 1.9, 0); kimoLabel.visible = false; kimo.group.add(kimoLabel);
    const kimoSt: Station = { name: '__kimo', pos: kimo.group.position.clone(), radius: 1.2, group: kimo.group, activeAt: -1, update: () => {} };
    stations.push(kimoSt);
    const kimoBaseRot = kimo.group.rotation.y;

    // ---- 输入 ----
    const keys = { f: false, b: false, l: false, r: false };
    let camYaw = 0, camPitch = 0.2, camDist = 6.5;
    let near: Station | null = null;
    const kd = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (openRef.current) { if (e.code === 'Escape') { e.preventDefault(); setOpen(null); blip(600, 0.05, 'square', 0.05); } return; }
      if (talkRef.current) {
        if (['KeyF', 'Space', 'Enter'].includes(e.code)) { e.preventDefault(); if (!e.repeat) advanceTalk(); }
        else if (e.code === 'Escape') setTalk(null);
        return;
      }
      switch (e.code) {
        case 'KeyW': case 'ArrowUp': keys.f = true; e.preventDefault(); break;
        case 'KeyS': case 'ArrowDown': keys.b = true; e.preventDefault(); break;
        case 'KeyA': case 'ArrowLeft': keys.l = true; e.preventDefault(); break;
        case 'KeyD': case 'ArrowRight': keys.r = true; e.preventDefault(); break;
        case 'Space': if (P.grounded) { P.vy = 5.2; P.grounded = false; blip(380, 0.08, 'square', 0.04, 700); } e.preventDefault(); break;
        case 'KeyF': case 'Enter': if (!e.repeat && near) interact(near); break;
      }
    };
    const ku = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW': case 'ArrowUp': keys.f = false; break;
        case 'KeyS': case 'ArrowDown': keys.b = false; break;
        case 'KeyA': case 'ArrowLeft': keys.l = false; break;
        case 'KeyD': case 'ArrowRight': keys.r = false; break;
      }
    };
    let drag = false, lx = 0, ly = 0;
    const pd = (e: PointerEvent) => { if ((e.target as HTMLElement).closest('[data-ui]')) return; drag = true; lx = e.clientX; ly = e.clientY; };
    const pm = (e: PointerEvent) => { if (!drag) return; camYaw -= (e.clientX - lx) * 0.006; camPitch = Math.min(1.2, Math.max(0.05, camPitch + (e.clientY - ly) * 0.004)); lx = e.clientX; ly = e.clientY; };
    const pu = () => { drag = false; };
    const wheel = (e: WheelEvent) => { if ((e.target as HTMLElement).closest('[data-ui]')) return; camDist = Math.min(11, Math.max(3.5, camDist + e.deltaY * 0.006)); };
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
    window.addEventListener('pointerdown', pd); window.addEventListener('pointermove', pm); window.addEventListener('pointerup', pu);
    window.addEventListener('wheel', wheel, { passive: true });

    const clock = { t: 0 };
    const advanceTalk = () => {
      const tk = talkRef.current; if (!tk) return;
      blip(tk.lines[tk.i]?.who === 'tv' ? 1400 : 520, 0.04, 'square', 0.03);
      if (tk.i + 1 >= tk.lines.length) setTalk(null); else setTalk({ lines: tk.lines, i: tk.i + 1 });
    };
    (talkAdvance as { current: () => void }).current = advanceTalk;
    let readingSt: Station | null = null;
    const kimoMem = { first: false, sealed: false };
    const interact = (s: Station) => {
      const t = clock.t;
      readingSt = s;
      if (s.name === '__exit') { onExit(); return; }
      if (s.name === '__kimo') {
        s.activeAt = t; blip(1046, 0.08, 'sine', 0.05);
        const lines = unlockedAt >= 0 && !kimoMem.sealed ? KIMO_SEALED : !kimoMem.first ? KIMO_FIRST : KIMO_AGAIN;
        if (lines === KIMO_SEALED) kimoMem.sealed = true;
        kimoMem.first = true;
        setTalk({ lines, i: 0 });
        return;
      }
      const f = fileByName(s.name);
      if (!f) return;
      s.activeAt = t;
      if (f.content === null) { blip(160, 0.25, 'sawtooth', 0.12, 70); setOpen({ kind: 'denied', name: f.name }); return; }
      if (f.content === 'ENCRYPTED') { blip(700, 0.08, 'square', 0.06); setPw(''); setPwErr(false); setOpen({ kind: unlockedAt >= 0 ? 'sealed' : 'password', name: f.name }); return; }
      blip(900, 0.06, 'square', 0.06);
      onRead(f.name);
      setReadCount(c => c + 1);
      if (f.name === 'news_archive.txt') thinAt = t + 0.4;
      setOpen({ kind: 'view', name: f.name });
    };
    api.current = {
      trigger: (name: string) => { const s = stations.find(x => x.name === name); if (s) interact(s); },
      unlock: () => {
        unlockedAt = clock.t; vault.activeAt = clock.t;
        // 往后退几步，好看清盒子里的东西
        const d = new THREE.Vector2(P.x - vault.pos.x, P.z - vault.pos.z); if (d.lengthSq() < 0.01) d.set(0, 1); d.normalize();
        d.rotateAround(new THREE.Vector2(0, 0), 0.95);   // 站到斜前方，不挡镜头
        P.x = vault.pos.x + d.x * 4.2; P.z = vault.pos.z + d.y * 4.2; P.face = Math.atan2(-d.x, -d.y);
      },
    };

    // ---- 主循环 ----
    let raf = 0, last = performance.now();
    const camPos = new THREE.Vector3(SPAWN.x, 4, SPAWN.z + 7), look = new THREE.Vector3(SPAWN.x, 1, SPAWN.z - 4);
    camera.position.copy(camPos);
    let promptCache: string | null = null;
    // 开发用：截图时把镜头钉在固定位置（正式版不会用到）
    const devCam: { pose: { pos: [number, number, number]; look: [number, number, number]; up?: [number, number, number] } | null; snap: boolean } = { pose: null, snap: false };
    let viewShift = 0;
    let wasReading = false;
    const loop = (now: number) => {
      const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now;
      clock.t += dt; const t = clock.t;
      // 移动（看文件时不动）
      const reading = !!openRef.current || !!talkRef.current;
      if (talkRef.current) kimoSt.activeAt = t;
      let mx = 0, mz = 0;
      if (!reading) {
        const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw), rx = Math.cos(camYaw), rz = -Math.sin(camYaw);
        if (keys.f) { mx += fx; mz += fz; } if (keys.b) { mx -= fx; mz -= fz; }
        if (keys.r) { mx += rx; mz += rz; } if (keys.l) { mx -= rx; mz -= rz; }
      }
      const ml = Math.hypot(mx, mz);
      const moving = ml > 0.01;
      if (moving) {
        mx /= ml; mz /= ml;
        // 只能走在地面上：整步走不过去就试着贴边滑
        const nx = P.x + mx * 4.2 * dt, nz = P.z + mz * 4.2 * dt;
        if (walkable(nx, nz)) { P.x = nx; P.z = nz; }
        else if (walkable(nx, P.z)) P.x = nx;
        else if (walkable(P.x, nz)) P.z = nz;
        let na = Math.atan2(mx, mz) - P.face; while (na > Math.PI) na -= Math.PI * 2; while (na < -Math.PI) na += Math.PI * 2;
        P.face += na * Math.min(1, dt * 12);
      }
      // 碰撞：各个记录点、树、电视和机柜（带朝向的方盒）
      const pushCircle = (cx: number, cz: number, rad: number) => {
        const dx = P.x - cx, dz = P.z - cz, d = Math.hypot(dx, dz);
        if (d < rad && d > 0.001) { P.x = cx + dx / d * rad; P.z = cz + dz / d * rad; }
      };
      for (const s of stations) pushCircle(s.pos.x, s.pos.z, s.radius);
      for (const c of colliders) pushCircle(c.x, c.z, c.r);
      for (const b of boxes) {
        const c = Math.cos(b.yaw), sn = Math.sin(b.yaw), dx = P.x - b.x, dz = P.z - b.z;
        const lx = dx * c - dz * sn, lz = dx * sn + dz * c;
        const ox = b.hw + 0.3 - Math.abs(lx), oz = b.hd + 0.3 - Math.abs(lz);
        if (ox > 0 && oz > 0) {
          let nlx = lx, nlz = lz;
          if (ox < oz) nlx = Math.sign(lx || 1) * (b.hw + 0.3); else nlz = Math.sign(lz || 1) * (b.hd + 0.3);
          const npx = b.x + nlx * c + nlz * sn, npz = b.z - nlx * sn + nlz * c;
          if (walkable(npx, npz)) { P.x = npx; P.z = npz; }
        }
      }
      P.vy -= 14 * dt; P.y += P.vy * dt; if (P.y <= 0) { P.y = 0; P.vy = 0; P.grounded = true; }
      rig.group.position.set(P.x, P.y, P.z); rig.group.rotation.y = P.face;
      const sw = moving ? Math.sin(t * 11) : 0;
      rig.legL.rotation.x = sw * 0.7; rig.legR.rotation.x = -sw * 0.7;
      rig.armL.rotation.x = -sw * 0.5; rig.armR.rotation.x = sw * 0.5;
      rig.body.position.y = moving ? Math.abs(Math.cos(t * 11)) * 0.04 : Math.sin(t * 2) * 0.012;
      headLight.intensity = 5 + Math.sin(t * 3) * 0.8;

      // 最近的可交互物
      near = null; let best = 3.2;
      for (const s of stations) { const d = Math.hypot(P.x - s.pos.x, P.z - s.pos.z) - s.radius; if (d < best) { best = d; near = s; } }
      for (const s of stations) {
        if (!s.label) continue;
        const d = Math.hypot(P.x - s.pos.x, P.z - s.pos.z);
        s.label.visible = d < 16;
        (s.label.element as HTMLElement).dataset.near = s === near ? '1' : '0';
        (s.label.element as HTMLElement).style.opacity = String(Math.max(0.15, 1 - (d - 4) / 12));
      }
      kimoLabel.visible = Math.hypot(P.x - kimoSt.pos.x, P.z - kimoSt.pos.z) < 4;
      const pr = !near || reading ? null
        : near.name === '__exit' ? 'F 穿过这扇门，离开这里' : near.name === '__kimo' ? 'F 和它说话'
          : fileByName(near.name)?.content === null ? `F 读取 ${near.name}（权限不足）`
            : fileByName(near.name)?.content === 'ENCRYPTED' ? (unlockedAt >= 0 ? `F 重新查看 ${near.name}` : `F 输入密钥 · ${near.name}`)
              : `F 读取 ${near.name}`;
      if (pr !== promptCache) { promptCache = pr; setPrompt(pr); }

      // 各个记录点自己的动画
      for (const s of stations) s.update(t, dt, s);
      // 熊猫：被拍了以后回头看你一眼，再转回去看裂缝
      { const k = since(kimoSt, t); const look2 = k < 3 ? Math.atan2(P.x - kimo.group.position.x, P.z - kimo.group.position.z) : kimoBaseRot; let d = look2 - kimo.group.rotation.y; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; kimo.group.rotation.y += d * Math.min(1, dt * 3); }

      // 镜子：镜像跟着你动；读过追踪记录后，它会转头去看裂缝
      if (mirrorRig) {
        const g = mirrorSt.group;
        const local = g.worldToLocal(new THREE.Vector3(P.x, P.y, P.z));
        const inFront = local.z > 0 && local.z < 9 && Math.abs(local.x) < 4;
        mirrorRig.group.visible = inFront;
        mirrorRig.group.position.set(local.x, local.y, -local.z);
        mirrorRig.group.rotation.y = Math.PI - (P.face - g.rotation.y);
        mirrorRig.legL.rotation.x = rig.legL.rotation.x; mirrorRig.legR.rotation.x = rig.legR.rotation.x;
        mirrorRig.armL.rotation.x = rig.armL.rotation.x; mirrorRig.armR.rotation.x = rig.armR.rotation.x;
        mirrorRig.body.position.y = rig.body.position.y;
        const k = since(mirrorSt, t);
        const turn = mirrorSt.activeAt >= 0 ? smooth((k - 1.5) / 1.5) : 0;
        mirrorRig.head.rotation.y = turn * 1.1;
        if (mirrorMsg) (mirrorMsg.material as THREE.MeshBasicMaterial).opacity = mirrorSt.activeAt >= 0 && inFront ? smooth((k - 2.5) / 1) : 0;
        trail.forEach((a, i) => {
          const lit = mirrorSt.activeAt >= 0 ? smooth((k - i * 0.12) / 0.3) : 0;
          (a.material as THREE.MeshBasicMaterial).opacity = 0.25 + lit * 0.75;
          a.rotation.y = t * 1.5 + i; a.position.y = 0.12 + Math.sin(t * 2 + i) * 0.03 * lit;
        });
      }

      // 世界变薄（读新闻存档时）：整个档案馆被压成一页纸，再慢慢弹回来
      if (thinAt >= 0) {
        const k = t - thinAt;
        const z = k < 0 ? 1 : k < 0.5 ? 1 - smooth(k / 0.5) * 0.97 : k < 2.0 ? 0.03 : k < 3.2 ? 0.03 + smooth((k - 2.0) / 1.2) * 0.97 : 1;
        world.scale.set(1, 1, z);
        world.position.z = P.z * (1 - z);
        if (k > 3.2) { thinAt = -1; world.scale.set(1, 1, 1); world.position.z = 0; }
      }

      // 雨
      updCosmos(t); Z.update(t, dt); Z.revealFor(P.x, P.z, dt);
      crack.scale.setScalar(1 + (unlockedAt >= 0 ? Math.min(0.4, (t - unlockedAt) * 0.05) : 0) + Math.sin(t * 1.5) * 0.02);

      // 镜头：平时跟着她；读记录时转去看那件东西，并把画面往左让出阅读面板的位置
      const wz = world.scale.z, wpz = world.position.z;
      if (!reading && wasReading) readingSt = null;
      wasReading = reading;
      if (readingSt && readingSt.name !== '__exit') {
        const sp = readingSt.pos;
        const dir = new THREE.Vector3(P.x - sp.x, 0, P.z - sp.z); if (dir.lengthSq() < 0.01) dir.set(0, 0, 1); dir.normalize();
        const far = readingSt.name === 'sealed_truth.enc' ? 9 : readingSt.name === '__kimo' ? 3.6 : 6.5;
        camPos.set(sp.x + dir.x * far, readingSt.name === '__kimo' ? 2.2 : 3.2, (sp.z + dir.z * far) * wz + wpz);
        look.lerp(new THREE.Vector3(sp.x, readingSt.name === 'sealed_truth.enc' ? 2.2 : readingSt.name === '__kimo' ? 1.2 : 1.6, sp.z * wz + wpz), 0.08);
      } else {
        const cx = Math.sin(camYaw) * Math.cos(camPitch) * camDist, cy = Math.sin(camPitch) * camDist, cz = Math.cos(camYaw) * Math.cos(camPitch) * camDist;
        const px = P.x, py = P.y, pz = P.z * wz + wpz;
        camPos.set(px + cx, py + 1.3 + cy, pz + cz);
        look.lerp(new THREE.Vector3(px, py + 1.1, pz), 0.2);
      }
      // 镜头别钻进电视堆 / 机柜里：从头顶往镜头方向走，碰到方盒就停在前一步
      if (!readingSt) {
        const hx = P.x, hz = P.z * wz + wpz;
        let fx = camPos.x, fz = camPos.z;
        for (let k = 1; k <= 10; k++) {
          const sx = hx + (camPos.x - hx) * k / 10, sz = hz + (camPos.z - hz) * k / 10;
          let hit = false;
          for (const b of boxes) {
            const c = Math.cos(b.yaw), sn = Math.sin(b.yaw), dx = sx - b.x, dz = sz - b.z;
            if (Math.abs(dx * c - dz * sn) < b.hw + 0.15 && Math.abs(dx * sn + dz * c) < b.hd + 0.15) { hit = true; break; }
          }
          if (hit) { const kk = Math.max(0.35, (k - 1) / 10); fx = hx + (camPos.x - hx) * kk; fz = hz + (camPos.z - hz) * kk; break; }
        }
        camPos.x = fx; camPos.z = fz;
      }
      camPos.y = Math.max(0.5, camPos.y);
      if (devCam.snap) { camera.position.copy(camPos); look.set(P.x, P.y + 1.1, P.z * wz + wpz); } else camera.position.lerp(camPos, 0.08);
      camera.up.set(0, 1, 0);
      camera.lookAt(look);
      if (devCam.pose) { if (devCam.pose.up) camera.up.set(...devCam.pose.up); camera.position.set(...devCam.pose.pos); camera.lookAt(...devCam.pose.look); }
      viewShift += ((reading && W() > 700 ? 0.2 : 0) - viewShift) * Math.min(1, dt * 6);
      if (viewShift > 0.002) camera.setViewOffset(W(), H(), W() * viewShift, 0, W(), H()); else camera.clearViewOffset();

      composer.render();
      labels.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onResize = () => { renderer.setSize(W(), H()); composer.setSize(W(), H()); labels.setSize(W(), H()); camera.aspect = W() / H(); camera.updateProjectionMatrix(); };
    window.addEventListener('resize', onResize);
    if (import.meta.env.DEV) (window as any).__arc = { P, stations, devCam, renderer, scene, camera, boxes, colliders, walkable, world, zoneStats: Z.stats, setCam: (y: number, p: number, d: number) => { camYaw = y; camPitch = p; camDist = d; } };

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku);
      window.removeEventListener('pointerdown', pd); window.removeEventListener('pointermove', pm); window.removeEventListener('pointerup', pu);
      window.removeEventListener('wheel', wheel); window.removeEventListener('resize', onResize);
      // 释放所有几何、材质、贴图（反复进出不涨内存）
      const mats = new Set<THREE.Material>();
      scene.traverse(o => {
        const m = o as THREE.Mesh; if (m.geometry) m.geometry.dispose();
        const mm = (m as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mm)) mm.forEach(x => mats.add(x)); else if (mm) mats.add(mm);
      });
      mats.forEach(m => { for (const v of Object.values(m)) if (v && (v as THREE.Texture).isTexture) (v as THREE.Texture).dispose(); m.dispose(); });
      composer.dispose(); renderer.dispose();
      renderer.domElement.remove();
      if (labelRef.current) labelRef.current.innerHTML = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tryPw = useCallback((v: string) => {
    if (checkPassword(v)) {
      blip(523, 0.16, 'square', 0.1); blip(784, 0.24, 'square', 0.08);
      api.current?.unlock();
      setOpen({ kind: 'sealed', name: 'sealed_truth.enc' });
    } else { blip(150, 0.3, 'sawtooth', 0.14, 60); setPwErr(true); }
  }, [checkPassword, blip]);

  const cur = open ? files.find(f => f.name === open.name) : null;

  return (
    <div className="absolute inset-0" style={{ fontFamily: MONO }}>
      <style>{`
        .archive-label { font: 600 11px ${MONO}; color: ${G}; padding: 2px 8px; border: 1px solid rgba(54,224,122,.4); background: rgba(2,8,5,.75); white-space: nowrap; transition: transform .15s, background .15s; }
        .archive-label[data-kind="enc"] { color: ${AMBER}; border-color: rgba(245,196,81,.5); }
        .archive-label[data-kind="lock"] { color: ${RED}; border-color: rgba(255,93,108,.5); }
        .archive-label[data-kind="exit"] { color: #d6ffe4; }
        .archive-label[data-kind="none"] { color: rgba(245,196,81,.75); border-color: transparent; background: transparent; font-size: 10px; letter-spacing: .2em; }
        .archive-label[data-near="1"] { background: rgba(54,224,122,.18); transform: scale(1.12); }
        @keyframes arc-title { 0% { opacity: 0; letter-spacing: .6em; } 15% { opacity: 1; letter-spacing: .3em; } 80% { opacity: 1; } 100% { opacity: 0; } }
        @keyframes arc-in { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: none; } }
        @keyframes arc-decode { from { filter: blur(3px); opacity: .2; } to { filter: none; opacity: 1; } }
      `}</style>
      <div ref={mountRef} className="absolute inset-0" />
      <div ref={labelRef} className="absolute inset-0 pointer-events-none" style={{ zIndex: 1, isolation: 'isolate' }} />

      {/* 进入时的标题 */}
      {title && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center" style={{ animation: 'arc-title 3.8s ease-out forwards' }}>
          <div className="text-2xl md:text-4xl font-bold" style={{ color: G, textShadow: `0 0 18px ${G}` }}>/SYSTEM_HIDDEN</div>
          <div className="mt-3 text-xs md:text-sm" style={{ color: DIM }}>没有时间戳 · 不属于任何一个世界</div>
          <div className="mt-1 text-xs md:text-sm" style={{ color: 'rgba(125,180,255,.8)' }}>访客：1</div>
        </div>
      )}

      {/* 顶部状态 */}
      <div data-ui className="absolute z-10 top-3 left-3 right-3 flex items-center gap-3 text-[11px] md:text-xs pointer-events-none" style={{ color: DIM }}>
        <span style={{ color: G }}>shadowlee://console/SYSTEM_HIDDEN</span>
        <span className="flex items-center gap-1.5"><i className="w-1.5 h-1.5 rounded-full" style={{ background: AMBER, boxShadow: `0 0 6px ${AMBER}` }} />TVHEAD_ADMIN</span>
        <span className="tabular-nums">已读 {readCount}</span>
      </div>

      {/* 交互提示 */}
      {prompt && !open && !talk && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 px-4 py-1.5 text-sm border pointer-events-none" style={{ color: G, borderColor: G, background: 'rgba(2,8,5,.8)', boxShadow: `0 0 14px rgba(54,224,122,.25)` }}>{prompt}</div>
      )}
      <div className="absolute bottom-3 left-0 right-0 text-center text-[11px] pointer-events-none" style={{ color: 'rgba(54,224,122,.45)' }}>
        WASD 移动 · 空格 跳 · 拖动鼠标转视角 · F 读取 · Esc 关闭 · 离开请走南边的门
      </div>

      {/* 和 Kimo 说话 */}
      {talk && (
        <div data-ui className="absolute z-10 left-1/2 -translate-x-1/2 bottom-12 w-[min(760px,calc(100vw-24px))] cursor-pointer"
             onClick={() => talkAdvance.current()}>
          {(() => {
            const ln = talk.lines[talk.i];
            const kimo = ln.who === 'kimo';
            return (
              <div key={talk.i} className="relative border px-6 pt-6 pb-5" style={{ borderColor: kimo ? 'rgba(245,196,81,.6)' : 'rgba(125,180,255,.7)', background: 'rgba(3,6,16,.88)', boxShadow: `0 0 30px ${kimo ? 'rgba(245,196,81,.15)' : 'rgba(125,180,255,.2)'}`, animation: 'arc-decode .35s ease-out' }}>
                <span className="absolute -top-3 left-4 px-2 text-xs font-bold tracking-[0.2em]" style={{ background: '#03060f', color: kimo ? AMBER : '#9cc6ff' }}>{kimo ? 'Kimo熊 · O3-3' : '电视头'}</span>
                <p className="text-base md:text-lg leading-relaxed" style={{ color: kimo ? '#ffe7a8' : '#cfe3ff', textShadow: kimo ? 'none' : '0 0 8px rgba(125,180,255,.6)' }}>{ln.t}</p>
                <span className="absolute bottom-2 right-3 text-[10px]" style={{ color: DIM }}>F / 点击 继续 · {talk.i + 1}/{talk.lines.length}</span>
              </div>
            );
          })()}
        </div>
      )}

      {/* 阅读面板（右侧） */}
      {open && (
        <div data-ui className="absolute z-10 top-12 bottom-12 right-3 w-[min(560px,calc(100vw-24px))] flex flex-col border"
             style={{ borderColor: open.kind === 'sealed' || open.kind === 'password' ? 'rgba(245,196,81,.5)' : open.kind === 'denied' ? 'rgba(255,93,108,.5)' : 'rgba(54,224,122,.35)', background: 'rgba(2,10,6,.86)', backdropFilter: 'blur(3px)', animation: 'arc-in .25s ease-out', boxShadow: '0 0 40px rgba(0,0,0,.6)' }}>
          <div className="px-4 py-2 text-[11px] border-b flex justify-between" style={{ borderColor: 'rgba(54,224,122,.18)', color: AMBER }}>
            <span>{open.kind === 'password' ? 'root@shadowlee:/SYSTEM_HIDDEN$  decrypt sealed_truth.enc' : `root@shadowlee:/SYSTEM_HIDDEN$  cat ${open.name}`}</span>
            <button onClick={() => setOpen(null)} style={{ color: DIM }}>[Esc]</button>
          </div>
          <div className="flex-1 overflow-y-auto term-scroll px-5 py-4 text-[12px] md:text-[13px]" style={{ color: G }}>
            {open.kind === 'view' && cur && (
              <pre key={open.name} className="whitespace-pre-wrap leading-relaxed" style={{ fontFamily: 'inherit', textShadow: '0 0 6px rgba(54,224,122,.35)', animation: 'arc-decode .6s ease-out' }}>{cur.content}</pre>
            )}
            {open.kind === 'denied' && (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
                <div className="text-4xl font-bold tracking-[0.2em]" style={{ color: RED, textShadow: `2px 0 0 rgba(0,255,255,.35), -2px 0 0 ${RED}` }}>ACCESS DENIED</div>
                <div style={{ color: 'rgba(255,93,108,.8)' }}>{'> ACCESS DENIED —— 该文件属于下一个世界'}</div>
              </div>
            )}
            {open.kind === 'password' && (
              <div>
                <div>{'> 该文件由三席加密。'}</div>
                <div style={{ color: DIM }}>{'> 提示：密钥散落在五张草稿页的边角。第五页写着解法。'}</div>
                <div className="mt-4 border px-4 py-3 text-[12px] space-y-1" style={{ borderColor: 'rgba(54,224,122,.25)', background: 'rgba(54,224,122,.04)' }}>
                  <div style={{ color: AMBER }}>{'── 随身草稿页扫描 ──'}</div>
                  {pageCipher.map(([id, label, cipher]) => (
                    <div key={id} style={{ color: collectedPages.includes(id) ? G : 'rgba(54,224,122,.35)' }}>{collectedPages.includes(id) ? `${label} …… ${cipher}` : `${label} …… [未持有]`}</div>
                  ))}
                </div>
                <div className="mt-6 flex items-center gap-3 flex-wrap">
                  <span>{'密钥 >'}</span>
                  <label className="relative flex gap-1.5 cursor-text">
                    {Array.from({ length: 8 }, (_, i) => (
                      <span key={i} className="w-7 h-10 md:w-8 md:h-11 border-b-2 flex items-center justify-center text-lg md:text-xl tabular-nums"
                            style={{ borderColor: pwErr ? RED : i === pw.length ? '#d6ffe4' : G, color: pwErr ? RED : G, background: 'rgba(54,224,122,.06)' }}>
                        {pw[i] ?? (i === pw.length ? '_' : '')}
                      </span>
                    ))}
                    <input autoFocus inputMode="numeric" aria-label="密钥" value={pw}
                      onChange={ev => { setPw(ev.target.value.replace(/[^0-9]/g, '').slice(0, 8)); setPwErr(false); blip(1500, 0.02, 'square', 0.03); }}
                      onKeyDown={ev => {
                        if (ev.key === 'Enter') { ev.preventDefault(); ev.stopPropagation(); tryPw(pw); }
                        else if (ev.key === 'Escape') { ev.preventDefault(); setOpen(null); }
                      }}
                      className="absolute inset-0 opacity-0" />
                  </label>
                </div>
                {pwErr && <div className="mt-4 font-bold" style={{ color: RED }}>{'> DECRYPT FAILED —— 密钥校验不通过'}</div>}
              </div>
            )}
            {open.kind === 'sealed' && (
              <div style={{ animation: 'arc-decode .8s ease-out' }}>
                <div className="mb-1 font-bold" style={{ color: AMBER, textShadow: `0 0 10px ${AMBER}` }}>{'> DECRYPT OK —— sealed_truth.enc'}</div>
                <div className="mb-4 text-[11px]" style={{ color: 'rgba(245,196,81,.6)' }}>{'密钥指纹：22966160 ｜ 加密方：三席'}</div>
                <div className="relative border px-5 py-5" style={{ borderColor: 'rgba(245,196,81,.45)', background: 'rgba(245,196,81,.04)' }}>
                  <span className="absolute -top-2.5 left-4 px-2 text-[10px] tracking-[0.3em]" style={{ background: '#06140b', color: AMBER }}>DECLASSIFIED</span>
                  <pre className="whitespace-pre-wrap leading-relaxed text-[12px] md:text-[13px]" style={{ color: '#ffe7a8', fontFamily: 'inherit' }}>{sealedContent}</pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Archive3D;
