import * as THREE from 'three';
import { buildCharacter, buildYua, buildPandaWitch, buildCheckpointPanda, buildCheckpointPenguin } from '../game3d/characters3d';
const q = new URLSearchParams(location.search);
const back = q.get('back') === '1';
const canvas = document.getElementById('c') as HTMLCanvasElement;
const r = new THREE.WebGLRenderer({ canvas, antialias: true });
r.toneMapping = THREE.NeutralToneMapping;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0xffffff);
scene.add(new THREE.HemisphereLight(0xffffff, 0xd8dce8, 1.6));
const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(3, 6, 8); scene.add(sun);
const cam = new THREE.OrthographicCamera(-7.2, 7.2, 4.5, -4.5, 0.1, 100);
cam.position.set(back ? -3 : 3, 2.2, back ? -10 : 10); cam.lookAt(0, 1.2, 0);
const items = [buildCharacter('skin1').group, buildCharacter('skin2').group, buildCharacter('skin3').group, buildCharacter('skin4').group,
  buildCharacter('skinNovus').group, buildYua().group, buildPandaWitch().group, buildCheckpointPanda().group, buildCheckpointPenguin().group];
items.forEach((g, i) => { g.position.set(-5.6 + (i % 5) * 2.8, i < 5 ? 1.2 : -2.6, 0); g.scale.setScalar(1.6); scene.add(g); });
r.render(scene, cam);
(window as any).__ready = true;
