// Reproducible local album photographs; no external image service is needed at runtime.
import * as THREE from 'three';
import { buildCharacter, buildCheckpointPenguin, type SkinId } from '../game3d/characters3d';
const shot = Number(new URLSearchParams(location.search).get('shot') || 0);
const r = new THREE.WebGLRenderer({canvas:document.querySelector('canvas')!,antialias:true,preserveDrawingBuffer:true});
r.setSize(960,720);r.setPixelRatio(1);r.shadowMap.enabled=true;r.shadowMap.type=THREE.PCFSoftShadowMap;r.toneMapping=THREE.NeutralToneMapping;
const colors=[0xf2d4b4,0xcddde7,0xe2cfe2,0xbed9cb,0xc2cee8,0xf3d6cc,0xd9d2be,0xc9dfe2];
const scene=new THREE.Scene();scene.background=new THREE.Color(colors[shot]);scene.fog=new THREE.Fog(colors[shot],6,15);
scene.add(new THREE.HemisphereLight(0xffffff,0x657080,2));
const light=new THREE.DirectionalLight(0xffeed8,2.6);light.position.set(-3,6,4);light.castShadow=true;light.shadow.mapSize.set(1024,1024);scene.add(light);
const m=(geo:THREE.BufferGeometry,c:number,x:number,y:number,z:number)=>{const o=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:c,roughness:.85,flatShading:true}));o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;scene.add(o);return o;};
m(new THREE.BoxGeometry(20,.12,20),colors[shot],0,-.09,0);
const a=buildCharacter((['skin3','skin1','skin4','skin3','skin2','skin1','skin4','skin3'] as SkinId[])[shot]),b=buildCharacter('skinNovus');
a.group.position.x=-.3;b.group.position.x=.3;a.group.rotation.y=.12;b.group.rotation.y=-.18;
a.head.rotation.z=-.06;b.head.rotation.z=.09;scene.add(a.group,b.group);
if(shot%3===0){a.armL.rotation.x=-2.4;a.armL.rotation.z=-.3;b.armR.rotation.x=-2.1;}
if(shot%3===1){b.armL.rotation.z=-1;b.armL.rotation.x=-.6;a.head.rotation.z=-.1;}
if(shot===2||shot===6){a.armR.rotation.x=-1;b.armL.rotation.x=-1;}
if(shot===0||shot===3){ // A garden lane with flowering trees.
 for(const s of [-1,1]){m(new THREE.CylinderGeometry(.07,.1,2,6),0x8d715f,s*1.5,.9,-1.2);for(let i=0;i<5;i++)m(new THREE.IcosahedronGeometry(.52,0),shot===0?0xeab8ce:0x8db6a3,s*1.5+Math.sin(i*2)*.35,1.9+Math.cos(i)*.2,-1.2+Math.cos(i*2)*.25);}
 for(let i=0;i<15;i++)m(new THREE.IcosahedronGeometry(.035,0),0xfff1be,Math.sin(i*9)*2.5,.02,Math.cos(i*7)*2.2);
}else if(shot===1||shot===5){ // Sofa and a small reading lamp.
 m(new THREE.BoxGeometry(2.2,.35,.7),0xaebcd4,0,.16,-.65);m(new THREE.BoxGeometry(2.2,.65,.17),0xbac7df,0,.55,-1);
 m(new THREE.CylinderGeometry(.025,.025,1.5,6),0x7a7d91,1.25,.7,-.9);m(new THREE.ConeGeometry(.28,.28,6),0xffecc6,1.25,1.5,-.9);
}else if(shot===2||shot===7){ // Books and a desk.
 m(new THREE.BoxGeometry(2.1,.09,.5),0xc99d7a,0,.57,-1);for(const x of [-.9,.9])m(new THREE.BoxGeometry(.07,.6,.1),0xa57e60,x,.25,-1);
 for(let i=0;i<7;i++)m(new THREE.BoxGeometry(.12,.26+(i%3)*.04,.22),[0x788da9,0xd29891,0xdbbf78][i%3],-.8+i*.14,.75,-1);
}else if(shot===4){ // Neon archive doorway.
 for(const x of [-1.1,1.1])m(new THREE.BoxGeometry(.07,2,.1),0x829be1,x,.95,-1);
 m(new THREE.BoxGeometry(2.25,.07,.1),0x829be1,0,1.95,-1);
}else{const p=buildCheckpointPenguin();p.group.scale.setScalar(.65);p.group.position.set(.95,0,.1);scene.add(p.group);}
const camera=new THREE.PerspectiveCamera(33,4/3,.05,50);camera.position.set(shot%2?.65:-.35,1.25,3.2);camera.lookAt(0,.65,0);
r.render(scene,camera);(window as any).__ready=true;
