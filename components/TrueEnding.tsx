// ============================================================
// 真结局：回到她们的房间
//  · 第一章通关：2D 房间（漫画世界的像素画）
//  · 第二章通关：可以切换到 3D 房间（体素）
//  · 墙上挂满合影，桌上的电脑开着。走过去点电脑 → 桌面 → 双击小李 / 小室 → 真结局网页
//  · 网页内容沿用原来的真结局（文字与跳转链接不变），做成一张真正的网页的样子
// ============================================================
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Home, Box, Square, X, ExternalLink, Play, Power } from 'lucide-react';
import { PROPS } from '../game2d/props';
import { getSprites } from '../game2d/sprites';
import { portrait } from '../game2d/portraits';
import { buildCharacter, SkinId, CharacterRig } from '../game3d/characters3d';
import { Vox } from '../game3d/voxel';
import { SPECIAL_CG_URL } from '../constants';
import { sfx } from '../core/audio';

// ---------------- 真结局的原文（不改） ----------------
export const ENDING_LINES = {
  title: '你看到了她们真正的结局。',
  lead: '如果你想看看她们在现实里是怎样吵架、撒娇、和好——',
  videos: [
    { text: '【室豆沙】因为之前亲亲没报备被疯狂拷打变成了撒娇小狗了好可爱哦', link: 'https://www.bilibili.com/video/BV1DLjhzhEdN/' },
    { text: '【室豆沙】小室说可以接受我亲亲但是不能接受我不告诉她', link: 'https://www.bilibili.com/video/BV1ZijBzFEMM/' },
    { text: '【室豆沙】睡醒后的对豆沙宠溺的小室', link: 'https://www.bilibili.com/video/BV1413gzQESe/' },
  ],
  more: { text: '更多故事在这里：https://space.bilibili.com/1703797642/', link: 'https://space.bilibili.com/1703797642/' },
  thanks: '谢谢你愿意陪她们走到这里。',
};

// All room photographs are local images, captured from the character photo scenes.
const ROOM_PHOTOS = Array.from({ length: 8 }, (_, i) => new URL(`../assets/room-photos/memory-${i + 1}.jpg`, import.meta.url).href);
const drawContainedImage = (g: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, w: number, h: number) => {
  const scale = Math.min(w / image.naturalWidth, h / image.naturalHeight);
  const iw = image.naturalWidth * scale, ih = image.naturalHeight * scale;
  g.fillStyle = '#f6efe5'; g.fillRect(x, y, w, h);
  g.drawImage(image, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
};
const useRoomImages = () => {
  const [images, setImages] = useState<(HTMLImageElement | null)[]>([]);
  useEffect(() => {
    let cancelled = false;
    Promise.all(ROOM_PHOTOS.map(url => new Promise<HTMLImageElement | null>(resolve => {
      const image = new Image(); image.onload = () => resolve(image); image.onerror = () => resolve(null); image.src = url;
    }))).then(loaded => { if (!cancelled) setImages(loaded); });
    return () => { cancelled = true; };
  }, []);
  return images;
};

/** 墙上的照片布局（2D 像素坐标） */
const PHOTOS_2D: { x: number; y: number; w: number; h: number; frame: string; cg?: boolean }[] = [
  { x: 118, y: 36, w: 30, h: 24, frame: '#ffffff' }, { x: 156, y: 28, w: 24, h: 30, frame: '#c48f63' },
  { x: 188, y: 40, w: 34, h: 24, frame: '#f9a8d4' }, { x: 232, y: 30, w: 92, h: 62, frame: '#ffffff', cg: true },
  { x: 334, y: 36, w: 26, h: 32, frame: '#c48f63' }, { x: 120, y: 70, w: 26, h: 20, frame: '#93c5fd' },
  { x: 154, y: 66, w: 32, h: 26, frame: '#ffffff' }, { x: 194, y: 72, w: 26, h: 20, frame: '#fde68a' },
  { x: 236, y: 102, w: 30, h: 22, frame: '#c48f63' },
];

const useCgImage = () => {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => { const i = new Image(); i.onload = () => setImg(i); i.src = SPECIAL_CG_URL; return () => { i.onload = null; }; }, []);
  return img;
};

// ============================================================
// 2D 房间
// ============================================================
const VW = 640, VH = 360, FLOOR = 300;
const DESK = { x: 384, monitorX: 424, monitorY: 187 };

const Room2D: React.FC<{ onComputer: () => void; onPhoto: () => void }> = ({ onComputer, onPhoto }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const cg = useCgImage();
  const photos = useRoomImages();
  const [prompt, setPrompt] = useState(false);
  const goal = useRef<{ x: number; then?: () => void } | null>(null);
  const stateRef = useRef({ x: 300, face: 1, t: 0 });

  // 静态背景（只画一次）
  const bg = useMemo(() => {
    const c = document.createElement('canvas'); c.width = VW; c.height = VH;
    const g = c.getContext('2d')!; g.imageSmoothingEnabled = false;
    // 墙纸
    g.fillStyle = '#dfe8fb'; g.fillRect(0, 0, VW, FLOOR);
    g.fillStyle = '#d2def7'; for (let x = 0; x < VW; x += 16) g.fillRect(x, 0, 8, FLOOR);
    g.fillStyle = '#c9b08a'; g.fillRect(0, FLOOR - 10, VW, 10);
    // 地板
    for (let y = FLOOR; y < VH; y += 10) for (let x = -((y / 10) % 3) * 20; x < VW; x += 60) { g.fillStyle = (x / 60 + y / 10) % 2 ? '#d8a473' : '#cf9a69'; g.fillRect(x, y, 60, 10); g.fillStyle = '#b98654'; g.fillRect(x, y + 9, 60, 1); g.fillRect(x, y, 1, 10); }
    const put = (name: string, x: number, bottom: number) => { const p = PROPS[name].draw(); g.drawImage(p.toCanvas(), x, bottom - p.h); };
    put('window', 40, 160);
    put('bookshelf', 290, FLOOR);
    put('deskLegs', DESK.x, FLOOR);
    // The gameplay desk uses a platform as its top; this standalone room needs its own.
    g.fillStyle = '#65452f'; g.fillRect(DESK.x - 4, FLOOR - 64, 232, 10);
    g.fillStyle = '#dab185'; g.fillRect(DESK.x - 4, FLOOR - 64, 232, 3);
    put('monitor', DESK.monitorX, DESK.monitorY + 54);
    put('chair', 470, FLOOR);
    put('lamp', 612, FLOOR);
    put('bed', 10, FLOOR);
    put('plant', 350, FLOOR);

    put('rug', 230, FLOOR + 4);
    // 串灯
    for (let x = 6; x < VW; x += 14) { const y = 10 + Math.sin(x / 40) * 4; g.fillStyle = '#6b7182'; g.fillRect(x, y - 1, 14, 1); g.fillStyle = ['#fde68a', '#fbcfe8', '#bfdbfe'][(x / 14 | 0) % 3]; g.fillRect(x + 6, y, 3, 3); }
    // 照片墙（大的那张留给特别回顾的插画）
    PHOTOS_2D.forEach((f, i) => {
      g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(f.x + 2, f.y + 2, f.w, f.h);
      g.fillStyle = '#1c1f3b'; g.fillRect(f.x - 1, f.y - 1, f.w + 2, f.h + 2);
      g.fillStyle = f.frame; g.fillRect(f.x, f.y, f.w, f.h);
      g.fillStyle = '#f6efe5'; g.fillRect(f.x + 2, f.y + 2, f.w - 4, f.h - 4);
      g.fillStyle = '#8b90a8'; g.fillRect(f.x + f.w / 2 - 1, f.y - 4, 2, 3); // 钉子
    });
    return c;
  }, []);

  useEffect(() => {
    const cv = ref.current!; const g = cv.getContext('2d')!; g.imageSmoothingEnabled = false;
    const keys = { l: false, r: false };
    const kd = (e: KeyboardEvent) => {
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') keys.l = true;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') keys.r = true;
      if ((e.code === 'KeyE' || e.code === 'KeyF' || e.code === 'Enter') && Math.abs(stateRef.current.x - (DESK.monitorX + 30)) < 60) onComputer();
      if (keys.l || keys.r) goal.current = null;
    };
    const ku = (e: KeyboardEvent) => { if (e.code === 'KeyA' || e.code === 'ArrowLeft') keys.l = false; if (e.code === 'KeyD' || e.code === 'ArrowRight') keys.r = false; };
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
    const dSet = getSprites('dousha', false), nSet = getSprites('novus', false);
    let raf = 0, last = performance.now(), wasNear = false;
    const loop = (now: number) => {
      const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now;
      const S = stateRef.current; S.t += dt;
      let v = (keys.r ? 1 : 0) - (keys.l ? 1 : 0);
      if (!v && goal.current) { const d = goal.current.x - S.x; if (Math.abs(d) < 3) { const f = goal.current.then; goal.current = null; f?.(); } else v = Math.sign(d); }
      S.x = Math.max(24, Math.min(VW - 40, S.x + v * 110 * dt));
      if (v) S.face = v;
      g.drawImage(bg, 0, 0);
      PHOTOS_2D.forEach((f, i) => {
        const image = f.cg ? cg : photos[i > 3 ? i - 1 : i];
        if (image) drawContainedImage(g, image, f.x + 2, f.y + 2, f.w - 4, f.h - 4);
      });
      // 屏幕微微发光
      g.fillStyle = `rgba(190,225,255,${0.12 + Math.sin(S.t * 2) * 0.04})`; g.beginPath(); g.ellipse(DESK.monitorX + 42, DESK.monitorY + 24, 70, 40, 0, 0, 7); g.fill();
      // 室友姐坐在床边
      const nImg = nSet.frames.idle[Math.floor(S.t * 1.6) % nSet.frames.idle.length][S.x < 200 ? 1 : 0];
      g.drawImage(nImg, 200 - 13, FLOOR - 38 + 2);
      // 豆沙
      const anim = v ? dSet.frames.run : dSet.frames.idle;
      const img = anim[Math.floor(S.t * (v ? 10 : 1.6)) % anim.length][S.face > 0 ? 0 : 1];
      g.drawImage(img, S.x - 13, FLOOR - 38 + 2);
      const near = Math.abs(S.x - (DESK.monitorX + 30)) < 60;
      if (near !== wasNear) { wasNear = near; setPrompt(near); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); };
  }, [bg, cg, photos, onComputer]);

  const onClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * VW, y = ((e.clientY - r.top) / r.height) * VH;
    const m = { x: DESK.monitorX, y: DESK.monitorY, w: 84, h: 46 };
    if (x > m.x && x < m.x + m.w && y > m.y && y < m.y + m.h) {
      // 点电脑：走过去再打开
      if (Math.abs(stateRef.current.x - (DESK.monitorX + 30)) < 60) onComputer();
      else goal.current = { x: DESK.monitorX + 30, then: onComputer };
      return;
    }
    const cgF = PHOTOS_2D.find(p => p.cg)!;
    if (x > cgF.x && x < cgF.x + cgF.w && y > cgF.y && y < cgF.y + cgF.h) { onPhoto(); return; }
    if (y > FLOOR - 60) goal.current = { x };
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#1b1c2a]">
      <div className="relative" style={{ width: 'min(100vw, 177.8vh)', aspectRatio: '16 / 9' }}>
        <canvas ref={ref} width={VW} height={VH} onClick={onClick} className="w-full h-full cursor-pointer" style={{ imageRendering: 'pixelated' }} />
        {prompt && (
          <div className="absolute px-3 py-1 bg-white border-2 border-ink text-ink text-sm font-bold pointer-events-none anim-pop"
               style={{ left: `${((DESK.monitorX + 42) / VW) * 100}%`, top: `${((DESK.monitorY - 18) / VH) * 100}%`, transform: 'translate(-50%,-100%)' }}>
            点电脑 / E
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================
// 3D 房间（体素，剖面视角）
// ============================================================
const Room3D: React.FC<{ skin: SkinId; onComputer: () => void; onPhoto: () => void }> = ({ skin, onComputer, onPhoto }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [prompt, setPrompt] = useState(false);
  const cb = useRef({ onComputer, onPhoto }); cb.current = { onComputer, onPhoto };

  useEffect(() => {
    const mount = mountRef.current!;
    const W = () => mount.clientWidth, H = () => mount.clientHeight;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true }); } catch { return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setSize(W(), H());
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
    mount.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1b1c2a);
    const camera = new THREE.PerspectiveCamera(42, W() / H(), 0.05, 100);

    // 房间：6m × 5m，层高 3m（前墙拿掉，像娃娃屋）
    const S = 0.1;
    const v = new Vox(), gl = new Vox();
    const RW = 60, RD = 50, RH = 30;
    v.box(0, -1, 0, RW - 1, -1, RD - 1, (x, y, z) => ((x + Math.floor(z / 4) * 7) % 12 === 0 ? 0xc48f63 : (z % 4 === 0 ? 0xcf9a69 : 0xd8a473)));
    v.box(0, 0, 0, RW - 1, RH, 0, (x, y) => (y < 3 ? 0xc9b08a : Math.floor(x / 4) % 2 ? 0xdfe8fb : 0xd2def7));
    v.box(0, 0, 0, 0, RH, RD - 1, (x, y, z) => (y < 3 ? 0xc9b08a : Math.floor(z / 4) % 2 ? 0xd9e3f8 : 0xcdd9f3));
    v.box(RW - 1, 0, 0, RW - 1, RH, RD - 1, (x, y, z) => (y < 3 ? 0xc9b08a : Math.floor(z / 4) % 2 ? 0xd9e3f8 : 0xcdd9f3));
    // 窗（左墙）
    for (let z = 8; z <= 20; z++) for (let y = 12; y <= 22; y++) { v.del(0, y, z); gl.set(0, y, z, y > 19 && z > 16 ? 0xfff4c8 : (z * 3 + y) % 11 === 0 ? 0xffd98a : 0x1c2a5c); }
    v.box(1, 11, 7, 1, 23, 7, 0xbcd4f6); v.box(1, 11, 21, 1, 23, 21, 0xbcd4f6);
    // 床（左下角）+ 熊猫玩偶
    v.box(2, 0, 26, 20, 3, RD - 3, 0x8a6a4a);
    v.box(2, 4, 26, 20, 5, RD - 3, (x, y, z) => (z < 30 ? 0xffffff : (x + z) % 5 === 0 ? 0x86b4ee : 0x9cc4f5));
    v.box(2, 4, 26, 2, 10, RD - 3, 0xa8754f);
    v.box(5, 6, 27, 9, 8, 29, 0xffffff);
    v.ellipsoid(14, 8, 30, 2.2, 2, 2, 0xffffff); v.set(13, 10, 30, 0x2a2a35); v.set(15, 10, 30, 0x2a2a35); v.set(13, 8, 32, 0x2a2a35); v.set(15, 8, 32, 0x2a2a35);
    // 书桌（后墙右边）+ 显示器 + 椅子 + 台灯
    v.box(32, 0, 2, 54, 7, 10, (x, y) => (y === 7 ? 0xb07a4c : x === 32 || x === 54 ? 0x8a5a3b : null));
    v.box(36, 8, 3, 45, 15, 4, 0x2a2f45); v.box(40, 8, 5, 41, 8, 6, 0x2a2f45);
    v.box(38, 8, 6, 46, 8, 7, 0xe5e7eb);                     // 键盘
    v.box(40, 0, 13, 46, 4, 18, 0xf472b6); v.box(40, 5, 18, 46, 12, 19, 0xec4899);
    v.box(50, 8, 4, 50, 13, 4, 0x64748b); v.box(48, 14, 3, 52, 15, 6, 0xfde68a); gl.set(50, 13, 5, 0xfff1c8);
    // 书架（右墙）
    v.box(RW - 6, 0, 22, RW - 2, 20, 34, 0x8a6a4a);
    for (const y of [5, 10, 15]) for (let z = 23; z <= 33; z++) v.set(RW - 7, y, z, [0xef4444, 0x3b82f6, 0xfbbf24, 0x10b981, 0xf472b6, 0xffffff][z % 6]);
    // 地毯 + 盆栽
    v.box(22, 0, 24, 40, 0, 40, (x, y, z) => ((x + z) % 3 ? 0xddd6fe : 0xc4b5fd));
    v.box(26, 0, 6, 28, 3, 8, 0xe2885b); v.ellipsoid(27.5, 6, 7.5, 2.4, 3, 2.4, 0x4ade80);
    // 串灯
    for (let x = 2; x < RW - 2; x += 3) gl.set(x, RH - 2 - (x % 6 === 2 ? 1 : 0), 1, [0xfde68a, 0xfbcfe8, 0xbfdbfe][Math.floor(x / 3) % 3]);
    const room = new THREE.Mesh(v.geometry(S, [0, 0, 0], 0.04), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }));
    room.receiveShadow = true; room.castShadow = true;
    const glow = new THREE.Mesh(gl.geometry(S, [0, 0, 0], 0.02), new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }));
    const roomG = new THREE.Group(); roomG.add(room, glow); roomG.position.set(-RW * S / 2, 0, -RD * S / 2);
    scene.add(roomG);
    const toWorld = (x: number, y: number, z: number) => new THREE.Vector3(x * S - RW * S / 2, y * S, z * S - RD * S / 2);

    // 显示器屏幕（画着桌面）
    const scrC = document.createElement('canvas'); scrC.width = 180; scrC.height = 128;
    const sx = scrC.getContext('2d')!;
    const grd = sx.createLinearGradient(0, 0, 180, 128); grd.addColorStop(0, '#bfdbfe'); grd.addColorStop(1, '#fbcfe8');
    sx.fillStyle = grd; sx.fillRect(0, 0, 180, 128);
    sx.drawImage(portrait('dousha', 'smile'), 16, 18, 44, 44); sx.drawImage(portrait('novus', 'smile'), 70, 18, 44, 44);
    sx.fillStyle = '#1e3a8a'; sx.font = 'bold 12px sans-serif'; sx.fillText('小李', 26, 76); sx.fillText('小室', 80, 76);
    sx.fillStyle = 'rgba(30,58,138,.85)'; sx.fillRect(0, 114, 180, 14);
    const scrTex = new THREE.CanvasTexture(scrC); scrTex.colorSpace = THREE.SRGBColorSpace;
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.6), new THREE.MeshBasicMaterial({ map: scrTex, toneMapped: false }));
    screen.position.copy(toWorld(41, 11.6, 5.06)); scene.add(screen);
    const screenLight = new THREE.PointLight(0xcfe3ff, 3, 3.5); screenLight.position.copy(toWorld(40.5, 12, 8)); scene.add(screenLight);

    // 照片墙（后墙左半 + 一张大的特别回顾）
    const textureLoader = new THREE.TextureLoader();
    const ownedTextures: THREE.Texture[] = [];
    let disposed = false;
    const addPhoto = (x: number, y: number, w: number, h: number, frame: number, url: string) => {
      const g = new THREE.Group();
      const backing = new THREE.Mesh(new THREE.BoxGeometry(w + 0.06, h + 0.06, 0.05), new THREE.MeshStandardMaterial({ color: frame, roughness: 0.8 }));
      g.add(backing);
      // Separate depth planes and non-overlapping frames prevent z-fighting.
      const ph = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: 0xf6efe5, toneMapped: false }));
      ph.position.z = 0.04; g.add(ph);
      const t = textureLoader.load(url, texture => {
        if (disposed) { texture.dispose(); return; }
        const aspect = texture.image.width / texture.image.height;
        ph.scale.set(Math.min(1, h * aspect / w), Math.min(1, w / aspect / h), 1);
        ph.material.map = texture; ph.material.color.setHex(0xffffff); ph.material.needsUpdate = true;
      });
      t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
      ownedTextures.push(t);
      g.position.copy(toWorld(x, y, 1.5));
      scene.add(g);
      return ph;
    };
    // Left album columns and a separate centrepiece; no rectangles intersect.
    const layout = [[4,24,.48,.36], [11,24,.48,.36], [4,18,.48,.36], [11,18,.48,.36],
      [4,12,.48,.36], [11,12,.48,.36], [20,12,.55,.4], [28,12,.55,.4]];
    layout.forEach(([x,y,w,h],i) => addPhoto(x,y,w,h,[0xffffff,0xc48f63,0xf9a8d4,0x93c5fd][i%4],ROOM_PHOTOS[i]));
    const cgPhoto = addPhoto(23, 22, 1.12, 1.12, 0xffffff, SPECIAL_CG_URL);

    // 灯光
    scene.add(new THREE.HemisphereLight(0xfff4e6, 0x6b5a7a, 1.1));
    const lamp = new THREE.PointLight(0xffd59a, 6, 8, 1.5); lamp.position.copy(toWorld(30, 26, 25)); lamp.castShadow = true; scene.add(lamp);
    const win = new THREE.DirectionalLight(0x9fb8ff, 0.6); win.position.set(-6, 4, 0); scene.add(win);

    // 角色
    const dSkin: SkinId = skin === 'skinNovus' ? 'skin1' : skin;
    const me: CharacterRig = buildCharacter(dSkin);
    const her: CharacterRig = buildCharacter('skinNovus');
    me.group.traverse(o => { o.castShadow = true; }); her.group.traverse(o => { o.castShadow = true; });
    scene.add(me.group, her.group);
    const herPos = toWorld(24, 0, 34);
    her.group.position.copy(herPos);
    const P = { x: 0.2, z: 0.6, face: Math.PI };
    const deskSpot = toWorld(40.5, 0, 12);

    // 输入
    const keys = { f: false, b: false, l: false, r: false };
    let goal: THREE.Vector3 | null = null; let goalThen: (() => void) | null = null;
    const near = () => Math.hypot(P.x - deskSpot.x, P.z - deskSpot.z) < 1.0;
    const kd = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW': case 'ArrowUp': keys.f = true; break; case 'KeyS': case 'ArrowDown': keys.b = true; break;
        case 'KeyA': case 'ArrowLeft': keys.l = true; break; case 'KeyD': case 'ArrowRight': keys.r = true; break;
        case 'KeyE': case 'KeyF': case 'Enter': if (near()) cb.current.onComputer(); break;
      }
      goal = null;
    };
    const ku = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW': case 'ArrowUp': keys.f = false; break; case 'KeyS': case 'ArrowDown': keys.b = false; break;
        case 'KeyA': case 'ArrowLeft': keys.l = false; break; case 'KeyD': case 'ArrowRight': keys.r = false; break;
      }
    };
    const ray = new THREE.Raycaster(); const mouse = new THREE.Vector2();
    const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const click = (e: MouseEvent) => {
      const rc = renderer.domElement.getBoundingClientRect();
      mouse.set(((e.clientX - rc.left) / rc.width) * 2 - 1, -((e.clientY - rc.top) / rc.height) * 2 + 1);
      ray.setFromCamera(mouse, camera);
      if (ray.intersectObject(screen).length) {
        if (near()) cb.current.onComputer(); else { goal = deskSpot.clone(); goalThen = () => cb.current.onComputer(); }
        return;
      }
      if (ray.intersectObject(cgPhoto).length) { cb.current.onPhoto(); return; }
      const hit = new THREE.Vector3();
      if (ray.ray.intersectPlane(floorPlane, hit)) { goal = hit; goalThen = null; }
    };
    renderer.domElement.addEventListener('click', click);
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);

    let raf = 0, last = performance.now(), t = 0, wasNear = false;
    const camPos = new THREE.Vector3(), look = new THREE.Vector3(0, 1, 0);
    const loop = (now: number) => {
      const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now; t += dt;
      let mx = (keys.r ? 1 : 0) - (keys.l ? 1 : 0), mz = (keys.b ? 1 : 0) - (keys.f ? 1 : 0);
      if (!mx && !mz && goal) {
        const dx = goal.x - P.x, dz = goal.z - P.z, d = Math.hypot(dx, dz);
        if (d < 0.08) { goal = null; const f = goalThen; goalThen = null; f?.(); } else { mx = dx / d; mz = dz / d; }
      }
      const ml = Math.hypot(mx, mz);
      if (ml > 0.01) {
        mx /= ml; mz /= ml;
        P.x += mx * 2 * dt; P.z += mz * 2 * dt;
        let na = Math.atan2(mx, mz) - P.face; while (na > Math.PI) na -= Math.PI * 2; while (na < -Math.PI) na += Math.PI * 2;
        P.face += na * Math.min(1, dt * 10);
      }
      // 不穿墙、不穿家具（粗略的几个方块）
      P.x = Math.max(-2.7, Math.min(2.7, P.x)); P.z = Math.max(-1.6, Math.min(2.3, P.z));
      const block = (x0: number, z0: number, x1: number, z1: number) => {
        if (P.x > x0 && P.x < x1 && P.z > z0 && P.z < z1) {
          const d = [P.x - x0, x1 - P.x, P.z - z0, z1 - P.z]; const m = Math.min(...d);
          if (m === d[0]) P.x = x0; else if (m === d[1]) P.x = x1; else if (m === d[2]) P.z = z0; else P.z = z1;
        }
      };
      const a = toWorld(1, 0, 25), b = toWorld(21, 0, RD); block(a.x, a.z, b.x, b.z);           // 床
      const c = toWorld(31, 0, 0), d = toWorld(55, 0, 11); block(c.x, c.z, d.x, d.z);           // 书桌
      const e2 = toWorld(RW - 8, 0, 21), f = toWorld(RW, 0, 35); block(e2.x, e2.z, f.x, f.z);   // 书架
      me.group.position.set(P.x, 0, P.z); me.group.rotation.y = P.face;
      const sw = ml > 0.01 ? Math.sin(t * 11) : 0;
      me.legL.rotation.x = sw * 0.6; me.legR.rotation.x = -sw * 0.6;
      if (dSkin !== 'skin1' && dSkin !== 'skin2') { me.armL.rotation.x = -sw * 0.45; me.armR.rotation.x = sw * 0.45; }
      me.body.position.y = ml > 0.01 ? Math.abs(Math.cos(t * 11)) * 0.03 : Math.sin(t * 2) * 0.01;
      // 室友姐：看着你
      const want = Math.atan2(P.x - herPos.x, P.z - herPos.z);
      let dd = want - her.group.rotation.y; while (dd > Math.PI) dd -= Math.PI * 2; while (dd < -Math.PI) dd += Math.PI * 2;
      her.group.rotation.y += dd * Math.min(1, dt * 3);
      her.body.position.y = Math.sin(t * 2) * 0.01;
      const n = near();
      if (n !== wasNear) { wasNear = n; setPrompt(n); }
      screenLight.intensity = 2.6 + Math.sin(t * 2) * 0.4;
      // 镜头：从拿掉的前墙那边看进去，跟着人轻轻移动
      camPos.set(P.x * 0.45, 3.2, 5.6 + P.z * 0.25);
      camera.position.lerp(camPos, 0.08);
      look.lerp(new THREE.Vector3(P.x * 0.6, 1.0, P.z * 0.5 - 0.3), 0.08);
      camera.lookAt(look);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    camera.position.set(0, 3.2, 6);
    raf = requestAnimationFrame(loop);
    const onResize = () => { renderer.setSize(W(), H()); camera.aspect = W() / H(); camera.updateProjectionMatrix(); };
    window.addEventListener('resize', onResize);
    return () => {
      disposed = true;
      ownedTextures.forEach(t => t.dispose());
      cancelAnimationFrame(raf);
      renderer.domElement.removeEventListener('click', click);
      window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); window.removeEventListener('resize', onResize);
      const materials = new Set<THREE.Material>();
      scene.traverse(o => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        if (m.material) (Array.isArray(m.material) ? m.material : [m.material]).forEach(mat => materials.add(mat));
      });
      materials.forEach(m => m.dispose());
      scrTex.dispose();
      renderer.dispose(); renderer.domElement.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skin]);

  return (
    <div className="absolute inset-0">
      <div ref={mountRef} className="absolute inset-0" />
      {prompt && <div className="absolute left-1/2 bottom-24 -translate-x-1/2 px-3 py-1 bg-white border-2 border-ink text-ink text-sm font-bold pointer-events-none anim-pop">点屏幕 / E 打开电脑</div>}
    </div>
  );
};

// ============================================================
// 电脑桌面
// ============================================================
const Clock: React.FC = () => {
  const [d, setD] = useState(new Date());
  useEffect(() => { const i = setInterval(() => setD(new Date()), 10000); return () => clearInterval(i); }, []);
  return <span className="tabular-nums">{`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`}</span>;
};

const Desktop: React.FC<{ onOpen: (who: 'dousha' | 'novus') => void; onClose: () => void; children?: React.ReactNode }> = ({ onOpen, onClose, children }) => {
  const [sel, setSel] = useState<string | null>(null);
  const [tip, setTip] = useState<string | null>(null);
  const icons = useMemo(() => ({ dousha: portrait('dousha', 'smile').toDataURL(), novus: portrait('novus', 'smile').toDataURL() }), []);
  const Icon: React.FC<{ id: string; label: string; img?: string; glyph?: string; onDouble: () => void }> = ({ id, label, img, glyph, onDouble }) => (
    <button onClick={e => { e.stopPropagation(); setSel(id); sfx('click'); }} onDoubleClick={e => { e.stopPropagation(); onDouble(); }}
            className="w-24 flex flex-col items-center gap-1 p-2 rounded-lg outline-none"
            style={{ background: sel === id ? 'rgba(30,58,138,.18)' : 'transparent', boxShadow: sel === id ? 'inset 0 0 0 1px rgba(30,58,138,.35)' : 'none' }}>
      {img ? <img src={img} alt="" className="w-16 h-16 rounded-xl bg-white/80 border-2 border-white shadow" style={{ imageRendering: 'pixelated' }} />
        : <span className="w-16 h-16 grid place-items-center rounded-xl bg-white/60 border-2 border-white text-3xl shadow">{glyph}</span>}
      <span className="text-[13px] font-bold text-ink px-1 rounded" style={{ background: sel === id ? '#1e3a8a' : 'transparent', color: sel === id ? '#fff' : undefined }}>{label}</span>
    </button>
  );
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center p-3 md:p-8 bg-[#0d0f1c]/80 anim-fade" onClick={() => setSel(null)}>
      {/* 显示器边框 */}
      <div className="relative w-full max-w-5xl aspect-[16/10] max-h-[90vh] rounded-[18px] border-[10px] border-[#2a2f45] shadow-2xl overflow-hidden"
           style={{ background: 'linear-gradient(135deg, #cfe3ff 0%, #e9e4ff 45%, #fde2f0 100%)' }}>
        {/* 壁纸上的小星星 */}
        <div className="absolute inset-0 pointer-events-none opacity-60" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,.9) 1.5px, transparent 2px)', backgroundSize: '46px 46px' }} />
        <div className="absolute right-8 bottom-16 font-display text-5xl md:text-7xl text-white/70 select-none pointer-events-none" style={{ WebkitTextStroke: '2px rgba(30,58,138,.15)' }}>♥</div>
        {/* 图标 */}
        <div className="absolute left-4 top-4 grid gap-1">
          <Icon id="dousha" label="小李" img={icons.dousha} onDouble={() => onOpen('dousha')} />
          <Icon id="novus" label="小室" img={icons.novus} onDouble={() => onOpen('novus')} />
          <Icon id="bin" label="回收站" glyph="🗑" onDouble={() => { setTip('回收站是空的。'); setTimeout(() => setTip(null), 1800); }} />
        </div>
        {!children && <div className="absolute left-1/2 top-6 -translate-x-1/2 text-xs font-bold text-ink/60 bg-white/60 px-3 py-1 rounded-full">双击图标打开</div>}
        {tip && <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white border-2 border-ink px-4 py-2 text-sm font-bold text-ink rounded-lg shadow">{tip}</div>}
        {children}
        {/* 任务栏 */}
        <div className="absolute inset-x-0 bottom-0 h-10 flex items-center gap-2 px-3 text-white text-xs" style={{ background: 'rgba(30,58,138,.85)', backdropFilter: 'blur(6px)' }}>
          <span className="w-7 h-7 grid place-items-center rounded-md bg-white/15 font-bold">♥</span>
          <span className="opacity-80">我们的电脑</span>
          <span className="ml-auto"><Clock /></span>
          <button onClick={e => { e.stopPropagation(); sfx('back'); onClose(); }} className="ml-2 w-7 h-7 grid place-items-center rounded-md hover:bg-white/20" title="关机" aria-label="关机"><Power size={14} /></button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// 真结局网页（浏览器窗口里）
// ============================================================
const EndingPage: React.FC<{ who: 'dousha' | 'novus'; onClose: () => void }> = ({ who, onClose }) => {
  const [step, setStep] = useState(0);
  useEffect(() => { const ts = [0, 1, 2, 3, 4, 5, 6].map(i => setTimeout(() => setStep(i + 1), 300 + i * 700)); return () => ts.forEach(clearTimeout); }, []);
  const accent = who === 'dousha' ? '#2563eb' : '#ea580c';
  const faces = useMemo(() => ({ d: portrait('dousha', 'smile').toDataURL(), n: portrait('novus', 'smile').toDataURL() }), []);
  const show = (n: number): React.CSSProperties => ({ opacity: step >= n ? 1 : 0, transform: step >= n ? 'none' : 'translateY(10px)', transition: 'opacity .6s, transform .6s' });
  const thumbs = ROOM_PHOTOS.slice(0, 3);
  return (
    <div className="absolute inset-x-2 md:inset-x-10 top-3 md:top-6 bottom-12 bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col anim-pop" onClick={e => e.stopPropagation()}>
      {/* 浏览器顶栏 */}
      <div className="flex items-center gap-2 px-3 h-9 bg-[#eef1f8] border-b border-[#d7dcea] shrink-0">
        <span className="flex gap-1.5"><i className="w-3 h-3 rounded-full bg-[#ff5f57]" /><i className="w-3 h-3 rounded-full bg-[#febc2e]" /><i className="w-3 h-3 rounded-full bg-[#28c840]" /></span>
        <span className="ml-2 px-3 py-1 bg-white rounded-t-md text-[12px] font-bold text-ink border border-b-0 border-[#d7dcea] truncate max-w-[40%]">♥ 我们的房间</span>
        <span className="flex-1 mx-2 px-3 py-1 bg-white rounded-full text-[12px] text-ink/60 border border-[#d7dcea] truncate">dousha://our-room/ending</span>
        <button onClick={onClose} className="w-7 h-7 grid place-items-center rounded-md hover:bg-black/5 text-ink" aria-label="关闭网页"><X size={15} /></button>
      </div>
      {/* 页面 */}
      <div className="flex-1 overflow-y-auto" style={{ background: '#FEF7CD' }}>
        {/* 头图 */}
        <header className="relative px-6 md:px-12 pt-10 pb-12 overflow-hidden" style={{ background: 'linear-gradient(120deg, #cfe3ff, #fde2f0)' }}>
          <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(rgba(30,58,138,.18) 1.2px, transparent 1.4px)', backgroundSize: '14px 14px' }} />
          <div className="relative flex items-end gap-3" style={show(1)}>
            <img src={faces.d} alt="小李" className="w-20 h-20 md:w-28 md:h-28 rounded-2xl bg-white border-4 border-white shadow-lg" style={{ imageRendering: 'pixelated' }} />
            <img src={faces.n} alt="小室" className="w-20 h-20 md:w-28 md:h-28 rounded-2xl bg-white border-4 border-white shadow-lg -ml-6 rotate-3" style={{ imageRendering: 'pixelated' }} />
          </div>
          <h1 className="relative mt-6 font-display text-3xl md:text-5xl leading-tight" style={{ ...show(1), color: '#1e3a8a', textShadow: '3px 3px 0 #fff' }}>{ENDING_LINES.title}</h1>
          <p className="relative mt-4 text-base md:text-lg text-ink/80 max-w-2xl" style={show(2)}>{ENDING_LINES.lead}</p>
        </header>
        {/* 视频卡片 */}
        <section className="px-6 md:px-12 py-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {ENDING_LINES.videos.map((v, i) => (
              <a key={v.link} href={v.link} target="_blank" rel="noopener noreferrer"
                 className="group block bg-white rounded-xl border-2 border-ink/15 hover:border-ink overflow-hidden shadow-sm hover:shadow-[4px_4px_0_0_#1e3a8a] transition-all"
                 style={show(3 + i)}>
                <div className="relative aspect-video bg-[#cfe3ff]">
                  <img src={thumbs[i]} alt="" className="w-full h-full object-cover" style={{ imageRendering: 'pixelated' }} />
                  <span className="absolute inset-0 grid place-items-center"><span className="w-12 h-12 rounded-full bg-white/90 grid place-items-center shadow group-hover:scale-110 transition-transform"><Play size={20} style={{ color: accent }} className="translate-x-[1px]" /></span></span>
                  <span className="absolute left-2 bottom-2 text-[10px] font-bold text-white bg-black/50 px-1.5 py-0.5 rounded">bilibili</span>
                </div>
                <div className="p-3">
                  <p className="text-sm font-bold text-ink leading-snug group-hover:underline">{v.text}</p>
                  <p className="mt-2 text-[11px] text-ink/50 flex items-center gap-1 truncate"><ExternalLink size={11} />{v.link.replace('https://', '')}</p>
                </div>
              </a>
            ))}
          </div>
          {/* 更多故事 */}
          <a href={ENDING_LINES.more.link} target="_blank" rel="noopener noreferrer"
             className="mt-6 flex items-center gap-4 bg-white rounded-xl border-2 border-ink/15 hover:border-ink p-4 transition-colors" style={show(6)}>
            <span className="flex -space-x-3 shrink-0">
              <img src={faces.d} alt="" className="w-11 h-11 rounded-full bg-[#cfe3ff] border-2 border-white" style={{ imageRendering: 'pixelated' }} />
              <img src={faces.n} alt="" className="w-11 h-11 rounded-full bg-[#ffe1cc] border-2 border-white" style={{ imageRendering: 'pixelated' }} />
            </span>
            <span className="text-sm md:text-base font-bold text-ink break-all">{ENDING_LINES.more.text}</span>
            <ExternalLink size={16} className="ml-auto shrink-0 text-ink/50" />
          </a>
        </section>
        <footer className="px-6 md:px-12 pb-14 pt-4 text-center" style={show(7)}>
          <p className="font-display text-2xl md:text-3xl text-sakura">{ENDING_LINES.thanks}</p>
        </footer>
      </div>
    </div>
  );
};

// ============================================================
// 总控
// ============================================================
interface Props { cleared2: boolean; skin: SkinId; onExit: () => void }

const TrueEnding: React.FC<Props> = ({ cleared2, skin, onExit }) => {
  const [mode, setMode] = useState<'2d' | '3d'>(cleared2 ? '3d' : '2d');
  const [view, setView] = useState<'room' | 'pc'>('room');
  const [page, setPage] = useState<'dousha' | 'novus' | null>(null);
  const [cg, setCg] = useState(false);
  const openPc = useCallback(() => { sfx('confirm'); setView('pc'); }, []);
  const openPhoto = useCallback(() => { sfx('page'); setCg(true); }, []);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.code !== 'Escape') return;
      if (cg) setCg(false); else if (page) setPage(null); else if (view === 'pc') setView('room');
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [cg, page, view]);

  return (
    <div className="fixed inset-0 z-50 bg-[#1b1c2a] overflow-hidden select-none">
      {mode === '2d' ? <Room2D onComputer={openPc} onPhoto={openPhoto} /> : <Room3D skin={skin} onComputer={openPc} onPhoto={openPhoto} />}

      {/* 顶栏：返回 + 2D/3D 切换 */}
      {view === 'room' && (
        <div className="absolute top-3 inset-x-3 flex items-center gap-2 z-10">
          <button className="btn px-3 py-1.5 text-sm" onClick={() => { sfx('back'); onExit(); }}><Home size={15} />回到标题</button>
          <span className="hidden md:inline text-xs font-bold text-white/80 ml-2 px-2 py-0.5 bg-black/30 rounded">她们的房间 · 走到桌前，点一下电脑</span>
          <div className="ml-auto flex items-center bg-white border-[3px] border-ink" style={{ boxShadow: '3px 3px 0 0 #1e3a8a' }}>
            <button className={`px-3 py-1 text-sm font-bold flex items-center gap-1 ${mode === '2d' ? 'bg-ink text-white' : 'text-ink'}`} onClick={() => { setMode('2d'); sfx('click'); }}><Square size={13} />2D</button>
            <button disabled={!cleared2} title={cleared2 ? '' : '通关第二章后可以切换到 3D'}
                    className={`px-3 py-1 text-sm font-bold flex items-center gap-1 ${mode === '3d' ? 'bg-ink text-white' : cleared2 ? 'text-ink' : 'text-ink/30 cursor-not-allowed'}`}
                    onClick={() => { if (cleared2) { setMode('3d'); sfx('click'); } }}><Box size={13} />3D</button>
          </div>
        </div>
      )}
      {view === 'room' && <div className="absolute bottom-3 inset-x-0 text-center text-[11px] text-white/50 pointer-events-none z-10">{mode === '2d' ? 'A / D 走动 · 点地板走过去 · E 打开电脑' : 'WASD 走动 · 点地板走过去 · E 打开电脑 · 点大照片看看'}</div>}

      {view === 'pc' && (
        <Desktop onOpen={w => { sfx('confirm'); setPage(w); }} onClose={() => { setPage(null); setView('room'); }}>
          {page && <EndingPage who={page} onClose={() => { sfx('back'); setPage(null); }} />}
        </Desktop>
      )}

      {cg && (
        <div className="absolute inset-0 z-30 bg-black/80 flex items-center justify-center p-6 anim-fade" onClick={() => setCg(false)}>
          <img src={SPECIAL_CG_URL} alt="合影" className="max-h-[80vh] max-w-[92vw] border-[6px] border-white" style={{ imageRendering: 'pixelated' }} />
        </div>
      )}
    </div>
  );
};

export default TrueEnding;
