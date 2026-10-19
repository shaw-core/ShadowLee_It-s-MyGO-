// ============================================================
// 第二章美术风格工具
//  · toonify：把标准材质换成三阶卡通材质（柔和的动画质感）
//  · addOutline：反向外壳描边（每个部件按自身尺寸放大一点点）
//  · WireSkin：一键把一组模型切成「建模软件视图」——深色填充 + 白色边线
// ============================================================
import * as THREE from 'three';

let gradientTex: THREE.DataTexture | null = null;
const toonGradient = () => {
  if (gradientTex) return gradientTex;
  const data = new Uint8Array([90, 90, 90, 255, 175, 175, 175, 255, 255, 255, 255, 255]);
  gradientTex = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  gradientTex.minFilter = THREE.NearestFilter;
  gradientTex.magFilter = THREE.NearestFilter;
  gradientTex.needsUpdate = true;
  return gradientTex;
};

/** 标准材质 → 卡通材质（保留颜色、贴图、自发光、透明度） */
export const toonify = (root: THREE.Object3D) => {
  root.traverse(o => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || (m as any).__outline) return;
    const src = m.material as THREE.MeshStandardMaterial;
    if (!src || !(src as any).isMeshStandardMaterial) return;
    const t = new THREE.MeshToonMaterial({
      color: src.color, map: src.map ?? null, gradientMap: toonGradient(),
      emissive: src.emissive, emissiveIntensity: src.emissiveIntensity, emissiveMap: src.emissiveMap ?? null,
      transparent: src.transparent, opacity: src.opacity, side: src.side,
    });
    m.material = t;
    src.dispose();
  });
};

const outlineMats = new Map<number, THREE.MeshBasicMaterial>();
const outlineMat = (color: number) => {
  let m = outlineMats.get(color);
  if (!m) { m = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide }); outlineMats.set(color, m); }
  return m;
};

/** 反向外壳描边：适合盒子/球拼成的小人 */
export const addOutline = (root: THREE.Object3D, thickness = 0.022, color = 0x2a2440) => {
  const meshes: THREE.Mesh[] = [];
  root.traverse(o => { const m = o as THREE.Mesh; if (m.isMesh && !(m as any).__outline && !(m as any).__noOutline) meshes.push(m); });
  for (const m of meshes) {
    const mat = m.material as THREE.Material & { transparent?: boolean; opacity?: number };
    if (mat.transparent && (mat.opacity ?? 1) < 0.9) continue;
    if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
    const bb = m.geometry.boundingBox!;
    const sx = bb.max.x - bb.min.x, sy = bb.max.y - bb.min.y, sz = bb.max.z - bb.min.z;
    if (Math.min(sx, sy, sz) < 0.012) continue; // 贴片类（眼睛、腮红）不描边
    const shell = new THREE.Mesh(m.geometry, outlineMat(color));
    (shell as any).__outline = true;
    const cx = (bb.max.x + bb.min.x) / 2, cy = (bb.max.y + bb.min.y) / 2, cz = (bb.max.z + bb.min.z) / 2;
    const kx = 1 + (thickness * 2) / Math.max(sx, 0.02), ky = 1 + (thickness * 2) / Math.max(sy, 0.02), kz = 1 + (thickness * 2) / Math.max(sz, 0.02);
    shell.scale.set(kx, ky, kz);
    shell.position.set(cx * (1 - kx), cy * (1 - ky), cz * (1 - kz));
    shell.castShadow = false;
    shell.renderOrder = -1;
    m.add(shell);
  }
};

export const WIRE_COLOR = 0xf4f6ff;
const wireTri = new THREE.MeshBasicMaterial({ color: WIRE_COLOR, wireframe: true, transparent: true, opacity: 0.38, depthWrite: false });
const wireTriDim = new THREE.MeshBasicMaterial({ color: 0x8a90a8, wireframe: true, transparent: true, opacity: 0.25, depthWrite: false });
const wireFill = new THREE.MeshBasicMaterial({ color: 0x0f1119, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
/** 悠亚形态：线框层的东西出现在白天的世界里——半透明的深蓝填充，像建模软件里没渲染的物体，不会被看成黑洞 */
const wireFillHolo = new THREE.MeshBasicMaterial({ color: 0x24357e, transparent: true, opacity: 0.72, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });

/** 给一组模型准备线框外观（建模软件视图：深色填充 + 三角网格线），可随时切换 */
export class WireSkin {
  private items: { mesh: THREE.Mesh; mat: THREE.Material | THREE.Material[]; lines: THREE.Mesh | null; vis: boolean }[] = [];
  private on = false;
  private holo = false;
  /** fillOnly：只换成深色填充，不画三角网格（平台用干净的方框线代替） */
  constructor(root: THREE.Object3D, private dim = false, private fillOnly = false) {
    root.traverse(o => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || (m as any).__wire) return;
      this.items.push({ mesh: m, mat: m.material, lines: null, vis: m.visible });
    });
  }
  /** holo：悠亚形态下在现实世界里显示线框层物体（填充换成半透明深蓝） */
  set(on: boolean, holo = false) {
    if (on && this.on && holo !== this.holo) {
      this.holo = holo;
      for (const it of this.items) if (!(it as any).hid && it.mesh.material === (holo ? wireFill : wireFillHolo)) it.mesh.material = holo ? wireFillHolo : wireFill;
      return;
    }
    if (on === this.on) return;
    this.on = on;
    this.holo = holo;
    for (const it of this.items) {
      const outline = (it.mesh as any).__outline;
      if (on) {
        it.vis = it.mesh.visible;
        const m0 = it.mesh.material as THREE.Material & { transparent?: boolean; opacity?: number };
        if (outline || (!Array.isArray(m0) && m0.transparent && (m0.opacity ?? 1) < 0.6)) { (it as any).hid = true; it.mesh.visible = false; continue; }
        if (!it.lines && !this.fillOnly) {
          it.lines = new THREE.Mesh(it.mesh.geometry, this.dim ? wireTriDim : wireTri);
          (it.lines as any).__wire = true;
          it.lines.renderOrder = 2;
          it.mesh.add(it.lines);
        }
        if (it.lines) it.lines.visible = true;
        it.mat = it.mesh.material;
        it.mesh.material = holo ? wireFillHolo : wireFill;
      } else {
        if (outline || (it as any).hid) { (it as any).hid = false; it.mesh.visible = it.vis; continue; }
        if (it.lines) it.lines.visible = false;
        it.mesh.material = it.mat;
      }
    }
  }
  get active() { return this.on; }
}
