import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Home, Camera } from 'lucide-react';
import { SkinId, buildCharacter } from '../game3d/characters3d';

interface SpecialCG3DProps {
  skin: SkinId;       // 玩家当前外观：合影里就是这一套
  onExit: () => void;
}

// 后编通关合影：夕阳下的世界接缝处，两个人的 3D 合照
const SpecialCG3D: React.FC<SpecialCG3DProps> = ({ skin, onExit }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const W = 760, H = 560;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(W, H, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffd9a8);
    scene.fog = new THREE.Fog(0xffe3bd, 14, 40);

    const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 100);

    // 夕阳光
    scene.add(new THREE.HemisphereLight(0xfff1dd, 0xd9a86b, 0.9));
    const sun = new THREE.DirectionalLight(0xffc37d, 2.2);
    sun.position.set(-6, 5, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    scene.add(sun);

    // 地面浮岛
    const isle = new THREE.Mesh(
      new THREE.CylinderGeometry(3.4, 4.2, 1.2, 8),
      new THREE.MeshStandardMaterial({ color: 0xf3c98b, flatShading: true, roughness: 1 })
    );
    isle.position.y = -0.62;
    isle.receiveShadow = true;
    scene.add(isle);
    const grass = new THREE.Mesh(
      new THREE.CylinderGeometry(3.4, 3.4, 0.12, 8),
      new THREE.MeshStandardMaterial({ color: 0xa7e0b0, flatShading: true, roughness: 1 })
    );
    grass.position.y = -0.02;
    grass.receiveShadow = true;
    scene.add(grass);

    // 背景：世界的接缝（发光竖缝）+ 远山剪影 + 云
    const seam = new THREE.Mesh(
      new THREE.PlaneGeometry(0.35, 16),
      new THREE.MeshBasicMaterial({ color: 0xfff6e0, transparent: true, opacity: 0.9 })
    );
    seam.position.set(5.5, 5, -14);
    scene.add(seam);
    const seamGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 16),
      new THREE.MeshBasicMaterial({ color: 0xffe9b8, transparent: true, opacity: 0.35 })
    );
    seamGlow.position.copy(seam.position);
    scene.add(seamGlow);

    const cloudMat = new THREE.MeshStandardMaterial({ color: 0xfff2df, flatShading: true, roughness: 1 });
    const clouds: THREE.Mesh[] = [];
    for (let i = 0; i < 7; i++) {
      const c = new THREE.Mesh(new THREE.DodecahedronGeometry(0.7 + (i % 3) * 0.5, 0), cloudMat);
      c.position.set(-8 + i * 2.8, 3.2 + (i % 3) * 1.4, -10 - (i % 4) * 3);
      c.scale.y = 0.45;
      scene.add(c);
      clouds.push(c);
    }

    // ---- 两个人：摆好合影姿势 ----
    const dousha = buildCharacter(skin === 'skinNovus' ? 'skin1' : skin); // 姐操作时，合影里豆沙换回1号
    dousha.group.position.set(-0.52, 0, 0);
    dousha.group.rotation.y = 0.12;
    dousha.group.rotation.z = 0.05;           // 微微向姐那边靠
    dousha.armR.rotation.x = -2.7;            // 举手比耶
    dousha.armR.rotation.z = -0.35;
    dousha.head.rotation.z = 0.1;
    scene.add(dousha.group);

    const novus = buildCharacter('skinNovus');
    novus.group.position.set(0.52, 0, 0);
    novus.group.rotation.y = -0.12;
    novus.group.rotation.z = -0.04;
    novus.armL.rotation.x = -2.3;             // 手搭向豆沙身后
    novus.armL.rotation.z = 0.65;
    novus.armR.rotation.x = -0.2;
    novus.head.rotation.z = -0.08;
    scene.add(novus.group);

    // 漂浮的爱心（八面体压扁近似）与光尘
    const hearts: THREE.Mesh[] = [];
    const heartMat = new THREE.MeshStandardMaterial({ color: 0xf472b6, emissive: 0x9d174d, emissiveIntensity: 0.4, flatShading: true });
    for (let i = 0; i < 6; i++) {
      const hm = new THREE.Mesh(new THREE.OctahedronGeometry(0.12), heartMat);
      hm.position.set(-1.4 + i * 0.55, 1.6 + (i % 3) * 0.5, 0.4 - (i % 2) * 0.8);
      scene.add(hm);
      hearts.push(hm);
    }

    let raf = 0;
    let t = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      t += dt;

      // 呼吸与轻微姿态浮动（像快门前的一瞬间）
      dousha.body.position.y = Math.sin(t * 2.2) * 0.02;
      novus.body.position.y = Math.sin(t * 2.2 + 0.8) * 0.02;
      dousha.head.rotation.x = Math.sin(t * 1.4) * 0.03;
      novus.head.rotation.x = Math.sin(t * 1.2 + 1) * 0.03;

      hearts.forEach((hm, i) => {
        hm.position.y += dt * 0.25;
        hm.rotation.y += dt * 2;
        if (hm.position.y > 3.6) hm.position.y = 1.3;
        hm.scale.setScalar(0.9 + Math.sin(t * 3 + i) * 0.15);
      });
      clouds.forEach((c, i) => { c.position.x += dt * 0.12 * ((i % 3) + 1) * 0.3; if (c.position.x > 12) c.position.x = -12; });

      // 相机极缓慢的呼吸式推拉
      const sway = Math.sin(t * 0.4) * 0.18;
      camera.position.set(sway, 1.25 + Math.sin(t * 0.3) * 0.05, 4.6 + Math.sin(t * 0.25) * 0.1);
      camera.lookAt(0, 0.95, 0);

      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      scene.traverse(obj => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const m = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(m)) m.forEach(mm => mm.dispose());
        else m?.dispose();
      });
      renderer.dispose();
    };
  }, [skin]);

  return (
    <div className="w-full min-h-screen py-8 flex flex-col items-center justify-center bg-zinc-900 font-pixel overflow-y-auto">
      {/* 拍立得相框 */}
      <div className="bg-white p-3 pb-16 shadow-[0_0_60px_rgba(244,114,182,0.35)] rotate-1 hover:rotate-0 transition-transform duration-500 relative max-w-[92vw]">
        <canvas ref={canvasRef} width={760} height={560} className="block w-full h-auto max-w-[760px]" />
        <div className="absolute bottom-4 left-0 right-0 text-center">
          <p className="text-zinc-700 font-bold text-lg tracking-wide">後編・完 —— 新世界的第一张合影</p>
          <p className="text-zinc-400 text-xs mt-1 flex items-center justify-center gap-1">
            <Camera size={12} /> 摄于：世界的接缝旁 · 作者的夕阳下
          </p>
        </div>
      </div>

      <button onClick={onExit}
        className="mt-8 flex items-center px-8 py-3 bg-pink-500 text-white font-bold text-lg border-4 border-pink-700 hover:bg-pink-400 retro-border shadow-[4px_4px_0_0_#9d174d] hover:translate-y-1 hover:shadow-none">
        <Home className="mr-2" size={20} /> 返回主菜单
      </button>
    </div>
  );
};

export default SpecialCG3D;
