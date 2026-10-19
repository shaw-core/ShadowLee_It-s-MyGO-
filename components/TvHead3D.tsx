// 标题页演出里亮起来的那颗电视头：直接用第二章的体素模型
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { buildCharacter } from '../game3d/characters3d';

const TvHead3D: React.FC<{ size?: number }> = ({ size = 260 }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); } catch { return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(size, size, false);
    renderer.toneMapping = THREE.NeutralToneMapping;
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
    cam.position.set(0, 0.05, 2.1);
    scene.add(new THREE.AmbientLight(0x6f86b8, 0.6));
    const key = new THREE.PointLight(0x7db4ff, 6, 6);
    key.position.set(0, 0.2, 1.2);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x9cc6ff, 1.2);
    rim.position.set(-2, 1, -1);
    scene.add(rim);

    const rig = buildCharacter('skin2');
    const head = rig.head;
    head.removeFromParent();
    const box = new THREE.Box3().setFromObject(head);
    const c = box.getCenter(new THREE.Vector3());
    const holder = new THREE.Group();
    head.position.sub(c);
    holder.add(head);
    holder.scale.setScalar(1.25);
    scene.add(holder);

    let raf = 0;
    const t0 = performance.now();
    const loop = (now: number) => {
      const t = (now - t0) / 1000;
      const on = Math.min(1, t / 0.7);
      holder.rotation.y = Math.sin(t * 0.6) * 0.22;
      holder.rotation.x = Math.sin(t * 0.45) * 0.05;
      holder.position.y = Math.sin(t * 1.1) * 0.015;
      key.intensity = (5 + Math.sin(t * 2) * 1.5) * on;
      renderer.render(scene, cam);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      scene.traverse(o => { const m = o as THREE.Mesh; m.geometry?.dispose(); });
      renderer.dispose();
    };
  }, [size]);
  return <canvas ref={ref} width={size} height={size} style={{ width: size, height: size }} />;
};

export default TvHead3D;
