import * as THREE from 'three';
import { voxIsland } from '../game3d/voxworld';
import { THEMES, buildSky } from '../game3d/world3d';
import { buildDiorama } from '../game3d/dioramas';
const canvas = document.getElementById('c') as HTMLCanvasElement;
const r = new THREE.WebGLRenderer({ canvas, antialias: true });
r.toneMapping = THREE.NeutralToneMapping;
const P = new URLSearchParams(location.search);
const th = THEMES[+(P.get('t') ?? 3)];
const scene = new THREE.Scene();
scene.add(buildSky(th).mesh);
scene.fog = new THREE.Fog(th.fog, 40, 200);
scene.add(new THREE.HemisphereLight(th.hemiSky, th.hemiGround, 1.0));
const sun = new THREE.DirectionalLight(th.sunColor, th.sunIntensity); sun.position.set(5, 10, 6); scene.add(sun);
const q = P.get('m') ?? 'island';
const cam = new THREE.PerspectiveCamera(40, 16 / 9, 0.1, 800);
if (q === 'island') {
  scene.add(voxIsland(4, 0.6, 4, 0x8fe0c0, th, 7));
  cam.position.set(5, -2.5, 6); cam.lookAt(0, -1, 0);
} else {
  const d = buildDiorama(q, 5, th.grass[0], +(P.get('n') ?? 0.8));
  const bb = new THREE.Box3().setFromObject(d); const c = bb.getCenter(new THREE.Vector3()); const sz = bb.getSize(new THREE.Vector3());
  d.position.sub(c); scene.add(d);
  const dist = Math.max(sz.x, sz.y) * 1.25;
  cam.position.set(dist * 0.35, sz.y * 0.15, dist); cam.lookAt(0, sz.y * 0.1, 0);
}
r.render(scene, cam);
