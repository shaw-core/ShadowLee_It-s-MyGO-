// ============================================================
// 第二章场景：天空穹顶、云海、远景浮岛、浮空小岛平台与装饰
// 风格：精致低模 + 柔光。所有模型程序化生成，零外部资源。
// ============================================================
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export interface Theme3D {
  skyTop: number; skyHorizon: number; skyBottom: number; sun: number;
  fog: number; grass: number[]; earth: number; rock: number; cloud: number;
  hemiSky: number; hemiGround: number; sunColor: number; sunIntensity: number;
  flower: number[];
}

// 原则：天空干净、平台颜色彼此分得开，一眼就能看出路在哪里
export const THEMES: Record<number, Theme3D> = {
  1: { skyTop: 0x4f9fec, skyHorizon: 0xc4e3ff, skyBottom: 0x9cc9f2, sun: 0xfff3c4, fog: 0xcfe6ff, grass: [0x7fd497, 0xffd36e, 0xf5a3cf, 0xb79cff], earth: 0xe4c6a2, rock: 0xa98d78, cloud: 0xffffff, hemiSky: 0xf4f8ff, hemiGround: 0xb9cbb0, sunColor: 0xfff4e0, sunIntensity: 2.4, flower: [0xffffff, 0xfde68a] },
  2: { skyTop: 0x4a96e6, skyHorizon: 0xc6e4ff, skyBottom: 0x93c2ee, sun: 0xffffff, fog: 0xcde5ff, grass: [0x6fd3a0, 0xffd36e, 0xf5a3cf, 0xb79cff], earth: 0xdcccb6, rock: 0x9eabbf, cloud: 0xffffff, hemiSky: 0xf2f8ff, hemiGround: 0xb3c8d4, sunColor: 0xffffff, sunIntensity: 2.4, flower: [0xffffff, 0xfbcfe8] },
  3: { skyTop: 0x1d2459, skyHorizon: 0x7173bd, skyBottom: 0x363c7c, sun: 0xe8ecff, fog: 0x5b60a6, grass: [0x8fe0c0, 0xffd36e, 0xf5a3cf, 0x8fc7f2], earth: 0xc9c2e6, rock: 0x7a74a8, cloud: 0xc7c9f0, hemiSky: 0xc4cbff, hemiGround: 0x5d6196, sunColor: 0xd2d9ff, sunIntensity: 1.6, flower: [0xffffff, 0xa5f3fc] },
  4: { skyTop: 0xe286bd, skyHorizon: 0xffd9c2, skyBottom: 0xeaaac6, sun: 0xfff1c9, fog: 0xffdccb, grass: [0x8fd8d2, 0xffc46e, 0xb79cff, 0x7fd497], earth: 0xf3dcc8, rock: 0xc89c9c, cloud: 0xfff7f2, hemiSky: 0xfff4f0, hemiGround: 0xd9b5c2, sunColor: 0xffecd6, sunIntensity: 2.3, flower: [0xffffff, 0xfde68a] },
  5: { skyTop: 0x2f3c7a, skyHorizon: 0xf6b48b, skyBottom: 0xb58aa8, sun: 0xffd29a, fog: 0xefbfa2, grass: [0x8fd8d2, 0xb79cff, 0xf7c873, 0x7fd497], earth: 0xf0d6b8, rock: 0xb38f7c, cloud: 0xffe9d6, hemiSky: 0xffe8d6, hemiGround: 0x9b84a6, sunColor: 0xffcc96, sunIntensity: 2.5, flower: [0xffffff, 0xfef3c7] },
};

export const hashStr = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
};
export const rand = (seed: number) => {
  let t = seed >>> 0 || 1;
  return () => { t ^= t << 13; t ^= t >>> 17; t ^= t << 5; return ((t >>> 0) % 1000003) / 1000003; };
};

// ---------------- 天空 ----------------
export const buildSky = (th: Theme3D) => {
  const uniforms = {
    top: { value: new THREE.Color(th.skyTop) },
    horizon: { value: new THREE.Color(th.skyHorizon) },
    bottom: { value: new THREE.Color(th.skyBottom) },
    sunCol: { value: new THREE.Color(th.sun) },
    sunDir: { value: new THREE.Vector3(0.45, 0.35, -0.82).normalize() },
    wire: { value: 0 },
    time: { value: 0 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      uniform vec3 top; uniform vec3 horizon; uniform vec3 bottom; uniform vec3 sunCol; uniform vec3 sunDir; uniform float wire; uniform float time;
      varying vec3 vDir;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
      void main(){
        float y = vDir.y;
        vec3 c = y > 0.0 ? mix(horizon, top, pow(clamp(y,0.0,1.0), 0.55)) : mix(horizon, bottom, pow(clamp(-y,0.0,1.0), 0.6));
        float s = max(dot(normalize(vDir), sunDir), 0.0);
        c += sunCol * (pow(s, 280.0) * 1.4 + pow(s, 12.0) * 0.18);
        // 高空的小星点（只在顶部，很淡）
        vec2 g = floor(vDir.xz / max(0.08, 1.0 - y) * 140.0);
        float st = step(0.996, hash(g)) * smoothstep(0.35, 0.9, y);
        c += vec3(st) * 0.35 * (0.6 + 0.4 * sin(time * 2.0 + hash(g) * 30.0));
        // 线框层：深色 + 网格
        vec3 wc = mix(vec3(0.035,0.04,0.06), vec3(0.08,0.09,0.13), smoothstep(-0.3, 0.6, y));
        vec2 uv = vec2(atan(vDir.z, vDir.x) * 12.0, y * 24.0);
        vec2 gl = abs(fract(uv) - 0.5);
        float line = smoothstep(0.47, 0.5, max(gl.x, gl.y));
        wc += vec3(line) * 0.05;
        gl_FragColor = vec4(mix(c, wc, wire), 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 18), mat);
  mesh.renderOrder = -10;
  return { mesh, uniforms };
};

// ---------------- 云 ----------------
const cloudGeo = new THREE.IcosahedronGeometry(1, 1);
export const buildCloud = (r: () => number, color: number, scale = 1) => {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true, emissive: color, emissiveIntensity: 0.18 });
  const n = 3 + Math.floor(r() * 4);
  for (let i = 0; i < n; i++) {
    const b = new THREE.Mesh(cloudGeo, m);
    const s = (0.8 + r() * 1.1) * scale;
    b.scale.set(s * 1.3, s * 0.8, s);
    b.position.set((i - n / 2) * 1.1 * scale + r() * 0.4, r() * 0.5 * scale, (r() - 0.5) * 1.2 * scale);
    g.add(b);
  }
  return g;
};

// ---------------- 浮岛平台 ----------------
const tint = (c: number, k: number) => {
  const col = new THREE.Color(c);
  col.multiplyScalar(k);
  return col;
};

/** 顶面草皮 + 侧面土层的圆角板，带顶点色 */
export const islandSlab = (w: number, h: number, d: number, grass: number, earth: number, seed: number) => {
  const r = Math.min(0.22, h * 0.4, w * 0.2, d * 0.2);
  const geo = new RoundedBoxGeometry(w, h, d, 3, r);
  const pos = geo.attributes.position, nor = geo.attributes.normal;
  const cols = new Float32Array(pos.count * 3);
  const gC = new THREE.Color(grass), gD = tint(grass, 0.94), eC = tint(earth, 0.92), eD = tint(earth, 0.7);
  const rr = rand(seed);
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const ny = nor.getY(i), y = pos.getY(i);
    const lip = h / 2 - Math.min(0.16, h * 0.35); // 草皮垂下来的边
    if (ny > 0.55 || y > lip) tmp.copy(gC).lerp(gD, rr());
    else tmp.copy(eC).lerp(eD, Math.min(1, (h / 2 - y) / Math.max(0.3, h)) * 0.8);
    cols[i * 3] = tmp.r; cols[i * 3 + 1] = tmp.g; cols[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  return geo;
};

/** 平台下方的倒锥形岩块 */
export const islandRock = (radius: number, height: number, color: number, seed: number) => {
  const geo = new THREE.ConeGeometry(radius, height, 7, 3);
  geo.rotateX(Math.PI);
  const pos = geo.attributes.position;
  const rr = rand(seed);
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y < height / 2 - 0.01) {
      const k = 0.82 + rr() * 0.32;
      pos.setX(i, pos.getX(i) * k); pos.setZ(i, pos.getZ(i) * k);
      pos.setY(i, y + (rr() - 0.5) * 0.12);
    }
  }
  geo.computeVertexNormals();
  const cols = new Float32Array(pos.count * 3);
  const top = tint(color, 1.0), bot = tint(color, 0.68);
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const k = (height / 2 - pos.getY(i)) / height;
    tmp.copy(top).lerp(bot, k);
    cols[i * 3] = tmp.r; cols[i * 3 + 1] = tmp.g; cols[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  return geo;
};

const tuftGeo = new THREE.ConeGeometry(0.05, 0.22, 4);
const flowerHead = new THREE.IcosahedronGeometry(0.06, 0);

/** 平台顶面的小装饰（不参与碰撞） */
export const decorate = (w: number, d: number, topY: number, th: Theme3D, seed: number, dense = 1) => {
  const g = new THREE.Group();
  const rr = rand(seed);
  const area = w * d;
  if (area < 12) return g;
  const grassMat = new THREE.MeshStandardMaterial({ color: tint(th.grass[0], 0.82), roughness: 1, flatShading: true });
  const n = Math.min(7, Math.floor(area * 0.07 * dense));
  for (let i = 0; i < n; i++) {
    const x = (rr() - 0.5) * (w - 0.6), z = (rr() - 0.5) * (d - 0.6);
    const kind = rr();
    if (kind < 0.7) {
      const tuft = new THREE.Group();
      for (let k = 0; k < 3; k++) {
        const b = new THREE.Mesh(tuftGeo, grassMat);
        b.position.set((k - 1) * 0.05, 0.1, (rr() - 0.5) * 0.05);
        b.rotation.z = (k - 1) * 0.35; b.rotation.x = (rr() - 0.5) * 0.3;
        tuft.add(b);
      }
      tuft.position.set(x, topY, z);
      g.add(tuft);
    } else {
      const fl = new THREE.Mesh(flowerHead, new THREE.MeshStandardMaterial({ color: th.flower[Math.floor(rr() * th.flower.length)], roughness: 0.7, emissive: 0xffffff, emissiveIntensity: 0.06 }));
      fl.position.set(x, topY + 0.12, z);
      const stem = new THREE.Mesh(tuftGeo, grassMat);
      stem.scale.set(0.5, 0.6, 0.5);
      stem.position.set(x, topY + 0.05, z);
      g.add(fl, stem);
    }
  }
  return g;
};

/** 远景浮岛（只是背景） */
export const farIsland = (r: () => number, th: Theme3D) => {
  const g = new THREE.Group();
  const size = 2 + r() * 4;
  const slab = new THREE.Mesh(islandSlab(size * 2, 0.8, size * 1.6, th.grass[1], th.earth, Math.floor(r() * 1e6)),
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
  const rock = new THREE.Mesh(islandRock(size * 0.85, size * 1.6, th.rock, Math.floor(r() * 1e6)),
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }));
  rock.position.y = -0.4 - size * 0.8;
  g.add(slab, rock);
  // 一棵小树
  if (r() > 0.4) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 1.2, 5), new THREE.MeshStandardMaterial({ color: 0xb08968, roughness: 1 }));
    trunk.position.y = 1;
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9, 0), new THREE.MeshStandardMaterial({ color: th.grass[2], roughness: 1, flatShading: true }));
    crown.position.y = 2;
    g.add(trunk, crown);
  }
  return g;
};
