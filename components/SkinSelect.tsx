import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ArrowLeft, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { SKINS, SkinId, buildCharacter, buildPandaWitch } from '../game3d/characters3d';

interface SkinSelectProps {
  currentSkin: SkinId;
  novusUnlocked: boolean;
  recommendSkin2?: boolean;   // 二周目开局：推荐电视头小豆
  onConfirm: (skin: SkinId) => void;
  onBack: () => void;
}

const SkinSelect: React.FC<SkinSelectProps> = ({ currentSkin, novusUnlocked, recommendSkin2, onConfirm, onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pandaRevealed, setPandaRevealed] = useState(false);
  const PANDA_ENTRY = {
    id: 'panda' as const,
    name: '？？？ · 魔法熊猫',
    vibe: '？？？',
    features: ['？？？？？？', '在游戏中输入 shadow，即可变身为魔法熊猫', '来历不明——似乎与某种神秘的力量有关', '它不属于任何人，也无法被选择'],
  };
  const displayList = pandaRevealed ? [...SKINS, PANDA_ENTRY] : SKINS;
  const [index, setIndex] = useState(
    recommendSkin2
      ? Math.max(0, SKINS.findIndex(s => s.id === 'skin2'))
      : Math.max(0, SKINS.findIndex(s => s.id === currentSkin))
  );
  const skin = displayList[Math.min(index, displayList.length - 1)];
  const isLocked = skin.id === 'skinNovus' && !novusUnlocked;
  const isPanda = skin.id === 'panda';

  // 彩蛋：在外观界面输入 shadow，显现魔法熊猫的档案
  useEffect(() => {
    let typed = '';
    const onKey = (e: KeyboardEvent) => {
      if (!/^[a-z]$/i.test(e.key)) return;
      typed = (typed + e.key.toLowerCase()).slice(-6);
      if (typed === 'shadow') {
        typed = '';
        setPandaRevealed(true);
        setIndex(SKINS.length); // 直接翻到熊猫页
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // 实时 3D 预览：角色缓慢旋转 + 待机动画
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || isLocked) return;
    const isPandaPreview = skin.id === 'panda';

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(320, 380, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 320 / 380, 0.1, 50);
    camera.position.set(0, 1.15, 3.4);
    camera.lookAt(0, 0.75, 0);

    scene.add(new THREE.HemisphereLight(0xffffff, 0xcbd5e1, 1.0));
    const sun = new THREE.DirectionalLight(0xfff2d9, 1.6);
    sun.position.set(3, 6, 4);
    sun.castShadow = true;
    scene.add(sun);

    // 展示台
    const stand = new THREE.Mesh(
      new THREE.CylinderGeometry(1.0, 1.15, 0.25, 8),
      new THREE.MeshStandardMaterial({ color: 0xbfdbfe, flatShading: true, roughness: 1 })
    );
    stand.position.y = -0.13;
    stand.receiveShadow = true;
    scene.add(stand);

    const rig = isPandaPreview ? buildPandaWitch() : buildCharacter(skin.id as SkinId);
    if (isPandaPreview) rig.group.position.y = 0.35; // 骑扫帚悬浮展示
    scene.add(rig.group);

    let raf = 0;
    let t = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      t += dt;
      rig.group.rotation.y = t * 0.7;
      rig.body.position.y = Math.sin(t * 2.6) * 0.02;
      rig.armR.rotation.x = Math.sin(t * 2) * 0.08;
      if (skin.id !== 'skin1' && skin.id !== 'skin2') rig.armL.rotation.x = -Math.sin(t * 2) * 0.08;
      rig.head.rotation.z = Math.sin(t * 1.3) * 0.03;
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
  }, [skin.id, isLocked]);

  const prev = () => setIndex(i => (i - 1 + displayList.length) % displayList.length);
  const next = () => setIndex(i => (i + 1) % displayList.length);

  return (
    <div className="w-full h-screen flex flex-col items-center bg-[#FEF7CD] text-blue-900 font-pixel relative overflow-y-auto">
      <button onClick={onBack}
        className="absolute top-6 left-6 flex items-center text-blue-600 hover:text-blue-900 bg-white border-4 border-blue-200 px-4 py-2 hover:border-blue-500 shadow-md z-10">
        <ArrowLeft className="mr-2" size={18} /> 返回
      </button>

      <div className="my-auto flex flex-col items-center py-16">
      <h1 className="text-2xl md:text-3xl font-bold text-pink-500 drop-shadow-[2px_2px_0_#fff] mb-2">选择外观</h1>
      {recommendSkin2 && (
        <p className="mb-3 px-4 py-1.5 bg-white border-2 border-red-400 text-sm font-bold text-red-600 animate-pulse">
          ★ 推荐选择：<span className="font-extrabold underline">电视头小豆</span> —— 二周目的隐藏结局需要她
        </p>
      )}

      <div className="flex items-center gap-4 md:gap-8">
        <button onClick={prev}
          className="p-3 bg-white border-4 border-blue-300 hover:border-pink-400 hover:text-pink-500 shadow-[4px_4px_0_0_#93c5fd] active:translate-y-1 active:shadow-none">
          <ChevronLeft size={28} />
        </button>

        <div className="bg-white border-4 border-blue-300 retro-border shadow-[8px_8px_0_0_#93c5fd] p-4 flex flex-col items-center">
          {isLocked ? (
            <div className="bg-gradient-to-b from-[#2a2438] to-[#443a5c] flex flex-col items-center justify-center text-white/80" style={{ width: 'min(60vw, 34vh, 300px)', aspectRatio: '320/380' }}>
              <span className="text-7xl font-bold mb-4">???</span>
              <span className="text-sm px-6 text-center leading-relaxed">在「后编 · 多边形篇」中<br/>集齐全部薄荷糖（碎片）解锁</span>
            </div>
          ) : (
            <canvas ref={canvasRef} width={320} height={380} className="bg-gradient-to-b from-[#e8f4ff] to-[#FEF7CD] h-auto" style={{ width: 'min(60vw, 34vh, 300px)' }} />
          )}
          <div className="mt-3 text-xl font-bold text-blue-800">{isLocked ? '？？？' : skin.name}</div>
          <div className="text-sm text-pink-500 mb-2">{isLocked ? '？？？' : skin.vibe}</div>
          <ul className="text-xs text-blue-600 space-y-1 self-start min-h-[64px]">
            {(isLocked ? ['她好像一直在终点等着谁……'] : skin.features).map(f => <li key={f}>· {f}</li>)}
          </ul>
        </div>

        <button onClick={next}
          className="p-3 bg-white border-4 border-blue-300 hover:border-pink-400 hover:text-pink-500 shadow-[4px_4px_0_0_#93c5fd] active:translate-y-1 active:shadow-none">
          <ChevronRight size={28} />
        </button>
      </div>

      {/* 四格快速切换 */}
      <div className="flex gap-3 mt-4">
        {displayList.map((sm, i) => {
          const lockedCell = sm.id === 'skinNovus' && !novusUnlocked;
          return (
            <button key={sm.id} onClick={() => setIndex(i)}
              className={`w-10 h-10 border-4 font-bold ${
                i === index ? 'bg-pink-500 border-pink-700 text-white' : 'bg-white border-blue-200 text-blue-400 hover:border-blue-400'
              }`}>
              {lockedCell ? '🔒' : sm.id === 'skinNovus' ? '室' : sm.id === 'panda' ? '★' : i + 1}
            </button>
          );
        })}
      </div>

      <button onClick={() => !isLocked && !isPanda && onConfirm(skin.id as SkinId)} disabled={isLocked || isPanda}
        className={`mt-8 flex items-center px-8 py-3 font-bold text-xl border-4 retro-border ${
          isLocked || isPanda
            ? 'bg-gray-300 text-gray-500 border-gray-400 cursor-not-allowed'
            : 'bg-blue-500 text-white border-blue-700 hover:bg-blue-400 shadow-[4px_4px_0_0_#1e3a8a] hover:translate-y-1 hover:shadow-none'
        }`}>
        <Check className="mr-2" /> {isPanda ? '它不属于任何人' : isLocked ? '尚未解锁' : '就决定是你了！'}
      </button>
      </div>
    </div>
  );
};

export default SkinSelect;
