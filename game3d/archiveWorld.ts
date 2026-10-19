// ============================================================
// 隐藏系统的「世界尽头」：星空、机房、系统世界树
//  · 宇宙：会闪的星星、一条斜挂的银河、几团星云、远处一道淡金色的光环
//  · 地面：漂在虚空里的一块圆形金属台，边缘碎成方块慢慢飘走
//  · 机房：一圈服务器机柜，指示灯在闪；线缆贴着地面流向中心
//  · 世界树：线缆拧成的树干，光从根部往上流；树冠是一片闪烁的数据，
//    枝头挂着三个小世界（漫画 / 低模 / 还没上色的那一个）
// ============================================================
import * as THREE from 'three';
import { Vox } from './voxel';

export interface Collider { x: number; z: number; r: number }

const rnd = (seed: number) => { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };

// ---------------- 星空 ----------------
const starMat = () => new THREE.ShaderMaterial({
  uniforms: { time: { value: 0 }, pr: { value: Math.min(window.devicePixelRatio, 2) } },
  vertexShader: `
    attribute float size; attribute float phase; attribute vec3 color;
    uniform float time; uniform float pr;
    varying vec3 vC; varying float vA;
    void main() {
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mv;
      vA = 0.55 + 0.45 * sin(time * (0.6 + fract(phase) * 2.2) + phase * 6.28);
      gl_PointSize = size * pr * (0.85 + 0.3 * vA);
      vC = color;
    }`,
  fragmentShader: `
    varying vec3 vC; varying float vA;
    void main() {
      vec2 d = gl_PointCoord - 0.5;
      float r = length(d);
      float core = smoothstep(0.5, 0.0, r);
      float a = pow(core, 2.2) + 0.25 * smoothstep(0.08, 0.0, abs(d.x)) * smoothstep(0.5, 0.0, abs(d.y)) + 0.25 * smoothstep(0.08, 0.0, abs(d.y)) * smoothstep(0.5, 0.0, abs(d.x));
      gl_FragColor = vec4(vC * vA, a * vA);
    }`,
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
});

let gTex: THREE.Texture | null = null;
export const softSprite = (color: number, size: number, opacity: number) => {
  if (!gTex) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d')!;
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    gTex = new THREE.CanvasTexture(c);
  }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: gTex, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  s.scale.setScalar(size);
  return s;
};

export const buildCosmos = (scene: THREE.Scene) => {
  const r = rnd(7);
  const g = new THREE.Group();
  const mk = (n: number, place: (i: number) => [number, number, number], col: () => [number, number, number], size: () => number) => {
    const pos = new Float32Array(n * 3), cols = new Float32Array(n * 3), sz = new Float32Array(n), ph = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const p = place(i); pos.set(p, i * 3);
      cols.set(col(), i * 3); sz[i] = size(); ph[i] = r();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sz, 1));
    geo.setAttribute('phase', new THREE.BufferAttribute(ph, 1));
    const m = starMat();
    const pts = new THREE.Points(geo, m);
    pts.frustumCulled = false;
    g.add(pts);
    return m;
  };
  const onSphere = (R: number): [number, number, number] => {
    const u = r() * 2 - 1, a = r() * Math.PI * 2, s = Math.sqrt(1 - u * u);
    return [Math.cos(a) * s * R, u * R, Math.sin(a) * s * R];
  };
  const starCol = (): [number, number, number] => {
    const k = r();
    return k < 0.6 ? [0.85, 0.9, 1] : k < 0.8 ? [0.65, 0.78, 1] : k < 0.92 ? [1, 0.85, 0.75] : [1, 0.7, 0.9];
  };
  const mats = [
    mk(5000, () => onSphere(300), starCol, () => (r() < 0.97 ? 1.2 + r() * 2 : 3.5 + r() * 3)),
    // 银河：一条斜着的带子
    mk(6000, () => {
      const a = r() * Math.PI * 2, R = 280;
      const off = (r() + r() + r() - 1.5) * 26;
      const v = new THREE.Vector3(Math.cos(a) * R, off, Math.sin(a) * R).applyAxisAngle(new THREE.Vector3(1, 0, 0.4).normalize(), 1.05);
      return [v.x, v.y, v.z];
    }, () => { const k = r(); return k < 0.5 ? [0.75, 0.7, 1] : k < 0.8 ? [0.6, 0.85, 1] : [1, 0.75, 0.9]; }, () => 0.8 + r() * 1.6),
  ];
  // 星云
  for (const [c, x, y, z, s, o] of [
    [0x6a3fb8, -160, 70, -200, 220, 0.16], [0x1f7a9b, 180, 40, -150, 200, 0.14], [0xc04a8f, -60, 120, -240, 160, 0.12],
    [0x3b4fc4, 200, -40, 120, 240, 0.1], [0x2a8f7a, -220, -20, 90, 200, 0.1], [0xb8863b, 40, -110, -220, 180, 0.08],
  ] as const) { const sp = softSprite(c, s, o); sp.position.set(x, y, z); g.add(sp); }
  // 远处的光环：世界的尽头
  const halo = new THREE.Mesh(new THREE.TorusGeometry(200, 1.2, 8, 160), new THREE.MeshBasicMaterial({ color: 0xffd7a0, transparent: true, opacity: 0.18, fog: false, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.rotation.set(1.25, 0.2, 0.3); halo.position.y = -60; g.add(halo);
  const halo2 = new THREE.Mesh(new THREE.TorusGeometry(205, 4, 8, 160), new THREE.MeshBasicMaterial({ color: 0xff9fd0, transparent: true, opacity: 0.05, fog: false, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo2.rotation.copy(halo.rotation); halo2.position.copy(halo.position); g.add(halo2);
  scene.add(g);
  return (t: number) => { mats.forEach(m => { m.uniforms.time.value = t; }); g.rotation.y = t * 0.004; };
};

// ---------------- 地面 ----------------
export const buildFloor = (world: THREE.Group, R: number) => {
  const mat = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, R: { value: R } },
    vertexShader: `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      uniform float time; uniform float R; varying vec2 vP;
      void main(){
        float r = length(vP);
        float a = atan(vP.y, vP.x);
        vec3 base = mix(vec3(0.012,0.016,0.032), vec3(0.006,0.008,0.016), smoothstep(0.0, R, r));
        // 金属拉丝的同心细纹
        base += 0.004 * sin(r * 40.0);
        // 同心光环 + 放射线
        float dr = abs(fract(r / 2.0 + 0.5) - 0.5);
        float ring = 1.0 - smoothstep(0.0, 0.025, dr);
        float da = abs(fract(a / 6.28318 * 24.0 + 0.5) - 0.5) * r * 0.26;
        float spoke = (1.0 - smoothstep(0.0, 0.03, da)) * step(3.0, r);
        vec3 c = base + vec3(0.25,0.75,0.95) * (ring * 0.10 + spoke * 0.06);
        // 从中心往外扩散的一圈脉冲
        float pr = mod(time * 2.2, R + 6.0);
        c += vec3(0.4,0.95,1.0) * smoothstep(0.6, 0.0, abs(r - pr)) * 0.25 * (1.0 - r / R);
        // 树根附近亮一些
        c += vec3(0.2,0.7,0.9) * 0.08 * smoothstep(7.0, 0.0, r);
        // 边缘发一圈光
        c += vec3(0.5,0.85,1.0) * smoothstep(0.35, 0.0, abs(r - (R - 0.2))) * 0.6;
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(R, 96), mat);
  floor.rotation.x = -Math.PI / 2;
  world.add(floor);
  // 台子的侧面和底部（往下收的一圈）
  const side = new THREE.Mesh(new THREE.CylinderGeometry(R, R * 0.82, 1.6, 96, 1, true), new THREE.MeshStandardMaterial({ color: 0x0b0f1c, metalness: 0.7, roughness: 0.35, side: THREE.DoubleSide }));
  side.position.y = -0.8; world.add(side);
  // 边缘碎掉的方块，慢慢往外飘
  const N = 220;
  const frag = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x141a2c, metalness: 0.6, roughness: 0.4, emissive: 0x0a1a2a, emissiveIntensity: 0.6 }), N);
  const r = rnd(11);
  const seeds = Array.from({ length: N }, () => ({ a: r() * Math.PI * 2, d: R + 0.5 + r() * 14, y: -0.4 - r() * 10, s: 0.15 + r() * 0.7, sp: 0.2 + r() * 0.6, rot: r() * 6 }));
  world.add(frag);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  return (t: number) => {
    mat.uniforms.time.value = t;
    seeds.forEach((s, i) => {
      const drift = (t * 0.05 * s.sp) % 1;
      const d = s.d + drift * 6;
      v.set(Math.cos(s.a + t * 0.004) * d, s.y - drift * 3 + Math.sin(t * s.sp + i) * 0.15, Math.sin(s.a + t * 0.004) * d);
      e.set(s.rot + t * 0.1 * s.sp, s.rot * 2 + t * 0.07, 0); q.setFromEuler(e);
      sc.setScalar(s.s * (1 - drift * 0.6));
      m4.compose(v, q, sc); frag.setMatrixAt(i, m4);
    });
    frag.instanceMatrix.needsUpdate = true;
  };
};

// ---------------- 机房 ----------------
const flowMat = (base: number, hi: number, speed: number, rep: number) => new THREE.ShaderMaterial({
  uniforms: { time: { value: 0 }, base: { value: new THREE.Color(base) }, hi: { value: new THREE.Color(hi) } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform float time; uniform vec3 base; uniform vec3 hi; varying vec2 vUv;
    void main(){
      float p = fract(vUv.x * ${rep.toFixed(1)} - time * ${speed.toFixed(2)});
      float pulse = smoothstep(0.0, 0.06, p) * smoothstep(0.22, 0.06, p);
      vec3 c = base + hi * pulse * 1.6;
      c += hi * 0.15 * smoothstep(0.35, 0.0, abs(vUv.y - 0.5));
      gl_FragColor = vec4(c, 1.0);
    }`,
  toneMapped: false,
});

export const buildServerRoom = (world: THREE.Group, colliders: Collider[], gaps: number[]) => {
  const RING = 18.2;
  const racks: { x: number; z: number; a: number }[] = [];
  const COUNT = 40;
  for (let i = 0; i < COUNT; i++) {
    const a = (i / COUNT) * Math.PI * 2;
    const deg = ((a * 180) / Math.PI) % 360;
    if (gaps.some(gd => Math.abs(((deg - gd + 540) % 360) - 180) < 11)) continue;
    racks.push({ x: Math.sin(a) * RING, z: -Math.cos(a) * RING, a });
  }
  const rackGeo = new THREE.BoxGeometry(1.15, 3, 1.2);
  const rackMat = new THREE.MeshStandardMaterial({ color: 0x0a0e1a, metalness: 0.65, roughness: 0.38 });
  const rackMesh = new THREE.InstancedMesh(rackGeo, rackMat, racks.length);
  const edgeGeo = new THREE.EdgesGeometry(rackGeo);
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x2a5d8a, transparent: true, opacity: 0.55 });
  const LED_ROWS = 16, LED_COLS = 3;
  const leds = new THREE.InstancedMesh(new THREE.BoxGeometry(0.07, 0.035, 0.02), new THREE.MeshBasicMaterial({ toneMapped: false }), racks.length * LED_ROWS * LED_COLS);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  const ledCol = new THREE.Color();
  let li = 0;
  const r = rnd(3);
  racks.forEach((rk, i) => {
    const rot = Math.atan2(-rk.x, -rk.z); // 正面朝向中心
    q.setFromAxisAngle(up, rot);
    m4.compose(new THREE.Vector3(rk.x, 1.5, rk.z), q, new THREE.Vector3(1, 1, 1));
    rackMesh.setMatrixAt(i, m4);
    const e = new THREE.LineSegments(edgeGeo, edgeMat); e.position.set(rk.x, 1.5, rk.z); e.rotation.y = rot; world.add(e);
    colliders.push({ x: rk.x, z: rk.z, r: 0.95 });
    const fwd = new THREE.Vector3(Math.sin(rot), 0, Math.cos(rot));
    const right = new THREE.Vector3(Math.cos(rot), 0, -Math.sin(rot));
    for (let row = 0; row < LED_ROWS; row++) for (let col = 0; col < LED_COLS; col++) {
      const p = new THREE.Vector3(rk.x, 0.4 + row * 0.16, rk.z).addScaledVector(fwd, 0.61).addScaledVector(right, -0.35 + col * 0.12 + (row % 2) * 0.02);
      m4.compose(p, q, new THREE.Vector3(1, 1, 1));
      leds.setMatrixAt(li, m4);
      ledCol.setHex(r() < 0.75 ? 0x55e6ff : r() < 0.8 ? 0x36e07a : 0xffc46b).multiplyScalar(0.3 + r() * 0.9);
      leds.setColorAt(li, ledCol);
      li++;
    }
  });
  world.add(rackMesh, leds);
  // 机柜顶上的线槽（一整圈）

  // 地上的线缆：从机柜流向世界树的根
  const cableMats: THREE.ShaderMaterial[] = [];
  racks.forEach((rk, i) => {
    if (i % 2) return;
    const start = new THREE.Vector3(rk.x * 0.96, 0.06, rk.z * 0.96);
    const ang = Math.atan2(rk.z, rk.x) + (r() - 0.5) * 0.5;
    const end = new THREE.Vector3(Math.cos(ang) * 2.2, 0.08, Math.sin(ang) * 2.2);
    const mid = start.clone().lerp(end, 0.5).add(new THREE.Vector3((r() - 0.5) * 3, 0, (r() - 0.5) * 3));
    const curve = new THREE.CatmullRomCurve3([start, mid, end]);
    const m = flowMat(0x06202c, 0x63e8ff, 0.32 + r() * 0.2, 3);
    cableMats.push(m);
    world.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.05, 5, false), m));
  });
  let last = 0;
  return (t: number) => {
    cableMats.forEach(m => { m.uniforms.time.value = t; });
    if (t - last < 0.12) return;
    last = t;
    for (let k = 0; k < 40; k++) {
      const i = Math.floor(r() * li);
      ledCol.setHex(r() < 0.75 ? 0x55e6ff : r() < 0.85 ? 0x36e07a : r() < 0.97 ? 0xffc46b : 0xff5d6c).multiplyScalar(r() < 0.3 ? 0.15 : 0.5 + r() * 0.8);
      leds.setColorAt(i, ledCol);
    }
    leds.instanceColor!.needsUpdate = true;
  };
};

// ---------------- 世界树 ----------------
export const buildWorldTree = (world: THREE.Group, colliders: Collider[]) => {
  const r = rnd(42);
  const tree = new THREE.Group();
  tree.scale.setScalar(1.55);
  world.add(tree);
  const trunkMat = flowMat(0x07303a, 0x7ff5ff, 0.45, 2);
  const branchMat = flowMat(0x0a2f3d, 0xa8f8ff, 0.55, 3);
  const goldMat = flowMat(0x2a2208, 0xffd889, 0.5, 2);
  const mats = [trunkMat, branchMat, goldMat];
  const tips: THREE.Vector3[] = [];
  const bigTips: THREE.Vector3[] = [];

  // 树干：几股线缆拧在一起
  for (let s = 0; s < 6; s++) {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 12; i++) {
      const y = i * 0.6;
      const a = s / 6 * Math.PI * 2 + y * 0.35;
      const rad = 0.75 - i * 0.025 + (i < 2 ? (2 - i) * 0.35 : 0);
      pts.push(new THREE.Vector3(Math.cos(a) * rad, y, Math.sin(a) * rad));
    }
    tree.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.2 - s * 0.012, 6, false), s % 3 === 2 ? goldMat : trunkMat));
  }
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 7.2, 12), new THREE.MeshBasicMaterial({ color: 0x0b4a5a }));
  core.position.y = 3.6; tree.add(core);
  colliders.push({ x: 0, z: 0, r: 2.2 });

  // 树根：贴着地面散开
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + r() * 0.3;
    const len = 3.5 + r() * 3;
    const pts = [new THREE.Vector3(Math.cos(a) * 0.5, 1.0, Math.sin(a) * 0.5), new THREE.Vector3(Math.cos(a) * 1.4, 0.25, Math.sin(a) * 1.4),
      new THREE.Vector3(Math.cos(a + 0.2) * len * 0.6, 0.08, Math.sin(a + 0.2) * len * 0.6), new THREE.Vector3(Math.cos(a - 0.1) * len, 0.05, Math.sin(a - 0.1) * len)];
    tree.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, 0.12, 5, false), trunkMat));
  }

  // 树枝：递归分叉
  const grow = (start: THREE.Vector3, dir: THREE.Vector3, len: number, rad: number, depth: number) => {
    const end = start.clone().addScaledVector(dir, len);
    const mid = start.clone().lerp(end, 0.5).add(new THREE.Vector3((r() - 0.5) * len * 0.3, (r() - 0.2) * len * 0.15, (r() - 0.5) * len * 0.3));
    tree.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([start, mid, end]), 16, rad, 5, false), depth >= 2 && r() < 0.25 ? goldMat : branchMat));
    if (depth === 1) bigTips.push(end.clone());
    if (depth >= 3) { tips.push(end); return; }
    const n = depth === 0 ? 4 : 3;
    for (let i = 0; i < n; i++) {
      const az = (i / n) * Math.PI * 2 + r() * 0.8;
      const tilt = (depth === 0 ? 0.75 : 0.55) + r() * 0.3;
      const nd = dir.clone().applyAxisAngle(new THREE.Vector3(Math.cos(az), 0, Math.sin(az)), tilt).add(new THREE.Vector3(0, 0.25, 0)).normalize();
      grow(end, nd, len * (0.62 + r() * 0.12), rad * 0.6, depth + 1);
    }
  };
  grow(new THREE.Vector3(0, 7, 0), new THREE.Vector3(0, 1, 0), 3.2, 0.26, 0);

  // 树冠：一大片闪烁的数据点
  const N = 2600;
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), sz = new Float32Array(N), ph = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    let p: THREE.Vector3;
    if (i < tips.length * 30) {
      const tp = tips[i % tips.length];
      p = tp.clone().add(new THREE.Vector3((r() - 0.5) * 1.6, (r() - 0.5) * 1.2, (r() - 0.5) * 1.6));
    } else {
      const u = r() * 2 - 1, a = r() * Math.PI * 2, s = Math.sqrt(1 - u * u), k = Math.cbrt(r());
      p = new THREE.Vector3(Math.cos(a) * s * 7.5 * k, 12.5 + u * 3.6 * k, Math.sin(a) * s * 7.5 * k);
    }
    pos.set([p.x, p.y, p.z], i * 3);
    const c = r() < 0.7 ? [0.55, 0.95, 1] : r() < 0.7 ? [1, 0.88, 0.55] : [1, 0.7, 0.9];
    col.set(c, i * 3);
    sz[i] = 2 + r() * 5; ph[i] = r();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('size', new THREE.BufferAttribute(sz, 1));
  geo.setAttribute('phase', new THREE.BufferAttribute(ph, 1));
  const leafMat = starMat();
  leafMat.fog = false;
  const leaves = new THREE.Points(geo, leafMat);
  tree.add(leaves);

  // 往上飘的光点（从根部沿着树干升到树冠）
  const M = 260;
  const up = new Float32Array(M * 3), upC = new Float32Array(M * 3), upS = new Float32Array(M), upP = new Float32Array(M);
  const upSeed = Array.from({ length: M }, () => ({ a: r() * Math.PI * 2, rr: 0.4 + r() * 1.2, sp: 0.6 + r() * 1.4, o: r() * 20 }));
  for (let i = 0; i < M; i++) { upC.set([0.6, 1, 1], i * 3); upS[i] = 2 + r() * 3; upP[i] = r(); }
  const upGeo = new THREE.BufferGeometry();
  upGeo.setAttribute('position', new THREE.BufferAttribute(up, 3));
  upGeo.setAttribute('color', new THREE.BufferAttribute(upC, 3));
  upGeo.setAttribute('size', new THREE.BufferAttribute(upS, 1));
  upGeo.setAttribute('phase', new THREE.BufferAttribute(upP, 1));
  const upMat = starMat();
  const rising = new THREE.Points(upGeo, upMat); rising.frustumCulled = false;
  tree.add(rising);

  // 光晕：根部和树冠
  const rootGlow = softSprite(0x5fe6ff, 9, 0.5); rootGlow.position.y = 0.6; tree.add(rootGlow);
  const crownGlow = softSprite(0x9fd8ff, 22, 0.22); crownGlow.position.y = 12.5; tree.add(crownGlow);
  const ringGlow = new THREE.Mesh(new THREE.RingGeometry(1.8, 2.3, 64), new THREE.MeshBasicMaterial({ color: 0x7ff5ff, transparent: true, opacity: 0.35, side: THREE.DoubleSide, toneMapped: false, depthWrite: false }));
  ringGlow.rotation.x = -Math.PI / 2; ringGlow.position.y = 0.03; tree.add(ringGlow);
  const treeLight = new THREE.PointLight(0x6fe8ff, 40, 34, 1.4); treeLight.position.y = 5; tree.add(treeLight);
  const crownLight = new THREE.PointLight(0xffd59a, 16, 26, 1.5); crownLight.position.y = 12; tree.add(crownLight);

  // 枝头挂着的三个小世界
  bigTips.sort((a, b) => a.x - b.x);
  const pick = [bigTips[0], bigTips[Math.floor(bigTips.length / 2)], bigTips[bigTips.length - 1]];
  const worlds: THREE.Group[] = [];
  pick.forEach((p, i) => {
    const g = new THREE.Group(); g.position.copy(p).add(new THREE.Vector3(0, -0.9, 0));
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.85, 24, 16), new THREE.MeshBasicMaterial({ color: [0xffffff, 0x9fe8ff, 0xffc7e6][i], transparent: true, opacity: 0.1, depthWrite: false, blending: THREE.AdditiveBlending }));
    g.add(shell);
    g.add(new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(0.86, 1)), new THREE.LineBasicMaterial({ color: [0xffffff, 0x6ee7f2, 0xff9fd0][i], transparent: true, opacity: 0.35 })));
    if (i === 0) {
      // 第一期：一页漫画
      const c = document.createElement('canvas'); c.width = 64; c.height = 80; const x = c.getContext('2d')!;
      x.fillStyle = '#fff'; x.fillRect(0, 0, 64, 80); x.strokeStyle = '#111'; x.lineWidth = 3; x.strokeRect(4, 4, 56, 72);
      x.beginPath(); x.moveTo(4, 36); x.lineTo(60, 36); x.moveTo(30, 36); x.lineTo(30, 76); x.stroke();
      const pg = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.75), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), side: THREE.DoubleSide, toneMapped: false }));
      g.add(pg);
    } else if (i === 1) {
      // 第二期：一座低模小岛
      const v = new Vox(); v.box(-4, 0, -3, 4, 0, 3, 0x7fd497); v.ellipsoid(0, -0.5, 0, 4, 3, 3, (xx, yy) => (yy < 0 ? 0xa98d78 : null));
      v.box(-1, 1, 0, -1, 3, 0, 0x8a6a4a); v.ellipsoid(-0.5, 4, 0.5, 1.8, 1.4, 1.8, 0x5fae7a);
      const m = new THREE.Mesh(v.geometry(0.08, [0, 0, 0], 0.04), new THREE.MeshStandardMaterial({ vertexColors: true, emissive: 0x223322, emissiveIntensity: 0.6 }));
      m.position.y = -0.1; g.add(m);
    } else {
      // 还没上色的那一个：一团线框，慢慢有了颜色
      const seed = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 0), new THREE.MeshBasicMaterial({ color: 0x222233, wireframe: true }));
      seed.name = 'w3'; g.add(seed);
    }
    tree.add(g); worlds.push(g);
  });

  return (t: number) => {
    mats.forEach(m => { m.uniforms.time.value = t; });
    leafMat.uniforms.time.value = t; upMat.uniforms.time.value = t;
    // 上升的光点
    for (let i = 0; i < M; i++) {
      const s = upSeed[i];
      const k = ((t * s.sp * 0.12 + s.o) % 1);
      const y = k * 13;
      const rad = s.rr * (1 - k * 0.6) + (y > 7 ? (y - 7) * 0.6 : 0);
      up[i * 3] = Math.cos(s.a + t * 0.3 + y * 0.3) * rad; up[i * 3 + 1] = y; up[i * 3 + 2] = Math.sin(s.a + t * 0.3 + y * 0.3) * rad;
    }
    (upGeo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    leaves.rotation.y = t * 0.02;
    worlds.forEach((g, i) => {
      g.rotation.y = t * (0.3 + i * 0.1);
      g.position.y += Math.sin(t * 0.8 + i * 2) * 0.002;
      const w3 = g.getObjectByName('w3') as THREE.Mesh | undefined;
      if (w3) (w3.material as THREE.MeshBasicMaterial).color.setHSL((t * 0.03) % 1, 0.6, 0.35 + Math.sin(t * 0.5) * 0.15);
    });
    (rootGlow.material as THREE.SpriteMaterial).opacity = 0.45 + Math.sin(t * 1.4) * 0.1;
    (ringGlow.material as THREE.MeshBasicMaterial).opacity = 0.25 + Math.sin(t * 1.4) * 0.1;
    ringGlow.scale.setScalar(1 + ((t * 0.4) % 1) * 0.15);
  };
};
