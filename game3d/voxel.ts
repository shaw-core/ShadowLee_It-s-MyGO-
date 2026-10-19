// ============================================================
// 体素建模小库：在整数网格上「堆方块」，然后合并成一个网格。
//  · 只生成朝外的面；每个面带顶点色
//  · 顶点环境光遮蔽（AO）：方块缝隙、发丝之间自然变暗，看起来更精致
//  · 每个体素有轻微的明暗抖动，像手绘的像素块
// ============================================================
import * as THREE from 'three';

const K = (x: number, y: number, z: number) => ((x + 512) << 20) | ((y + 512) << 10) | (z + 512);

export type ColorFn = (x: number, y: number, z: number) => number | null;

export class Vox {
  m = new Map<number, number>();
  set(x: number, y: number, z: number, c: number) { this.m.set(K(x, y, z), c); }
  del(x: number, y: number, z: number) { this.m.delete(K(x, y, z)); }
  get(x: number, y: number, z: number) { return this.m.get(K(x, y, z)); }
  has(x: number, y: number, z: number) { return this.m.has(K(x, y, z)); }
  /** 包含两端的长方体；c 可以是函数（返回 null 表示跳过） */
  box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, c: number | ColorFn) {
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) {
      const v = typeof c === 'number' ? c : c(x, y, z);
      if (v !== null) this.set(x, y, z, v);
    }
  }
  /** 只给已存在的体素改色 */
  paint(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, c: number | ColorFn) {
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) {
      if (!this.has(x, y, z)) continue;
      const v = typeof c === 'number' ? c : c(x, y, z);
      if (v !== null) this.set(x, y, z, v);
    }
  }
  ellipsoid(cx: number, cy: number, cz: number, rx: number, ry: number, rz: number, c: number | ColorFn) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++)
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
        for (let z = Math.floor(cz - rz); z <= Math.ceil(cz + rz); z++) {
          const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, dz = (z + 0.5 - cz) / rz;
          if (dx * dx + dy * dy + dz * dz <= 1) {
            const v = typeof c === 'number' ? c : c(x, y, z);
            if (v !== null) this.set(x, y, z, v);
          }
        }
  }
  /** 合并另一个模型（可平移） */
  merge(o: Vox, dx = 0, dy = 0, dz = 0) {
    o.m.forEach((c, k) => {
      const x = ((k >> 20) & 1023) - 512, y = ((k >> 10) & 1023) - 512, z = (k & 1023) - 512;
      this.set(x + dx, y + dy, z + dz, c);
    });
  }
  get size() { return this.m.size; }

  /** 生成几何体：pivot 是体素坐标里的轴心，V 是每个体素的边长（米） */
  /** aoK：环境光遮蔽强度（1 = 原来的效果，0 = 关掉）；角色用小一点的值，色块更干净 */
  geometry(V: number, pivot: [number, number, number] = [0, 0, 0], jitter = 0.05, aoK = 1): THREE.BufferGeometry {
    const pos: number[] = [], nor: number[] = [], col: number[] = [];
    const idx: number[] = [];
    const tmp = new THREE.Color();
    const AO = [0.66, 0.8, 0.91, 1];
    const occ = (x: number, y: number, z: number) => (this.m.has(K(x, y, z)) ? 1 : 0);
    // 六个方向：法线轴、正负、两条切线轴
    const DIRS: { a: number; s: number; u: number; v: number }[] = [
      { a: 0, s: 1, u: 1, v: 2 }, { a: 0, s: -1, u: 1, v: 2 },
      { a: 1, s: 1, u: 0, v: 2 }, { a: 1, s: -1, u: 0, v: 2 },
      { a: 2, s: 1, u: 0, v: 1 }, { a: 2, s: -1, u: 0, v: 1 },
    ];
    this.m.forEach((c, k) => {
      const p = [((k >> 20) & 1023) - 512, ((k >> 10) & 1023) - 512, (k & 1023) - 512];
      // 体素级明暗抖动（哈希）
      let h = (p[0] * 73856093) ^ (p[1] * 19349663) ^ (p[2] * 83492791);
      h = ((h >>> 0) % 1000) / 1000;
      tmp.setHex(c);
      const jit = 1 + (h - 0.5) * 2 * jitter;
      for (const d of DIRS) {
        const n = [0, 0, 0]; n[d.a] = d.s;
        if (occ(p[0] + n[0], p[1] + n[1], p[2] + n[2])) continue;
        const base = pos.length / 3;
        const aos: number[] = [];
        // 四个角（切线坐标 0/1）
        const corners: [number, number][] = [[0, 0], [1, 0], [1, 1], [0, 1]];
        for (const [cu, cv] of corners) {
          const q = [p[0], p[1], p[2]];
          q[d.a] += d.s > 0 ? 1 : 0;
          q[d.u] += cu; q[d.v] += cv;
          pos.push((q[0] - pivot[0]) * V, (q[1] - pivot[1]) * V, (q[2] - pivot[2]) * V);
          nor.push(n[0], n[1], n[2]);
          // AO：面外一层里，两侧和对角是否有方块
          const o = [p[0] + n[0], p[1] + n[1], p[2] + n[2]];
          const su = cu ? 1 : -1, sv = cv ? 1 : -1;
          const s1o = [...o]; s1o[d.u] += su;
          const s2o = [...o]; s2o[d.v] += sv;
          const co = [...o]; co[d.u] += su; co[d.v] += sv;
          const s1 = occ(s1o[0], s1o[1], s1o[2]), s2 = occ(s2o[0], s2o[1], s2o[2]), cc = occ(co[0], co[1], co[2]);
          const ao = s1 && s2 ? 0 : 3 - (s1 + s2 + cc);
          aos.push(ao);
          const b = (1 - (1 - AO[ao]) * aoK) * jit;
          col.push(tmp.r * b, tmp.g * b, tmp.b * b);
        }
        // 绕序：按法线方向决定；AO 各向异性时翻转对角线
        const flip = aos[0] + aos[2] < aos[1] + aos[3];
        const outward = (d.a === 0 ? 1 : d.a === 1 ? -1 : 1) * d.s > 0;
        const tri = flip ? [[1, 2, 3], [1, 3, 0]] : [[0, 1, 2], [0, 2, 3]];
        for (const t of tri) {
          if (outward) idx.push(base + t[0], base + t[1], base + t[2]);
          else idx.push(base + t[0], base + t[2], base + t[1]);
        }
      }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeBoundingSphere();
    return g;
  }
}

const voxMats = new Map<string, THREE.MeshStandardMaterial>();
export const voxMaterial = (key = 'base') => {
  let m = voxMats.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 });
    voxMats.set(key, m);
  }
  return m;
};

/** 把一个体素模型做成网格（位置放在 pivot 处，几何以 pivot 为原点） */
export const voxMesh = (v: Vox, V: number, pivot: [number, number, number], mat?: THREE.Material) => {
  const mesh = new THREE.Mesh(v.geometry(V, pivot), mat ?? new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92 }));
  mesh.position.set(pivot[0] * V, pivot[1] * V, pivot[2] * V);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
};
