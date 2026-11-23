import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';

// A display-only edition of the existing 75% asset; purchasing still uses the product API.
export async function mountNoelPreview(host){
 let renderer,controls,observer,model,environment,disposed=false;
 const fallback=host.querySelector('img');
 const cleanup=()=>{if(disposed)return;disposed=true;observer?.disconnect();controls?.dispose();window.removeEventListener('pagehide',cleanup);if(model){const geometries=new Set(),materials=new Set();model.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[])materials.add(m);});geometries.forEach(g=>g.dispose());materials.forEach(m=>{for(const v of Object.values(m))if(v?.isTexture)v.dispose();m.dispose();});}environment?.dispose();renderer?.dispose();renderer?.domElement.remove();if(fallback)fallback.hidden=false;};
 try{
 renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
 renderer.domElement.setAttribute('aria-label','Noël 75 Christmas keyboard in 3D. Drag to rotate; use arrow keys to rotate.');renderer.domElement.tabIndex=0;
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(34,1,.001,10);
 const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;room.dispose();pmrem.dispose();
 scene.add(new THREE.HemisphereLight(0xfff0ce,0x14352a,2));const light=new THREE.DirectionalLight(0xffefd1,3);light.position.set(1,2,2);scene.add(light);
 model=(await new GLTFLoader().loadAsync('/keyboard-3d/exports/keyboard_75.glb')).scene;
 if(!host.isConnected){cleanup();return cleanup;}
 const colors={MAT_CASE_ACTIVE:'#164D39',MAT_KEYCAP_ALPHA:'#F4E8CC',MAT_KEYCAP_MODIFIER:'#A42235',MAT_KEYCAP_ACCENT:'#287254',MAT_KNOB:'#D9B66F',MAT_HARDWARE:'#C8A467',MAT_KEYCAP_LEGEND:'#29261E'};
 model.traverse(o=>{if(!o.isMesh)return;for(const m of Array.isArray(o.material)?o.material:[o.material]){if(colors[m.name])m.color.set(colors[m.name]);if(m.name==='MAT_KNOB'){m.metalness=.8;m.roughness=.27;}if(m.name.startsWith('MAT_RGB_')){m.color.set('#FFE1A1');m.emissive.set('#FFE1A1');m.emissiveIntensity=1.1;}}});
 if(model.getObjectByName('OPTION_DISPLAY'))model.getObjectByName('OPTION_DISPLAY').visible=false;
 if(model.getObjectByName('OPTION_KNOB'))model.getObjectByName('OPTION_KNOB').visible=true;
 if(model.getObjectByName('OPTION_CABLE'))model.getObjectByName('OPTION_CABLE').visible=true;
 model.updateMatrixWorld(true);
 const chassis=new THREE.Box3().setFromObject(model.getObjectByName('GROUP_CASE'));
 const label=document.createElement('canvas');label.width=512;label.height=96;const ctx=label.getContext('2d');ctx.fillStyle='#164D39';ctx.fillRect(0,0,512,96);ctx.strokeStyle='#D9B66F';ctx.lineWidth=4;ctx.strokeRect(4,4,504,88);ctx.fillStyle='#F9DF9D';ctx.font='bold 42px Georgia';ctx.textAlign='center';ctx.fillText('✦  NOËL 75  ✦',256,62);
 const texture=new THREE.CanvasTexture(label);texture.colorSpace=THREE.SRGBColorSpace;
 const badge=new THREE.Mesh(new THREE.PlaneGeometry(.065,.012),new THREE.MeshStandardMaterial({map:texture,roughness:.4,metalness:.25}));badge.position.set(chassis.getCenter(new THREE.Vector3()).x,(chassis.min.y+chassis.max.y)/2,chassis.max.z+.0004);model.add(badge);scene.add(model);
 const box=chassis.clone();box.expandByObject(model.getObjectByName('OPTION_CABLE'));const center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
 controls=new OrbitControls(camera,renderer.domElement);controls.enablePan=false;controls.enableZoom=false;controls.target.copy(center);controls.minPolarAngle=.15;controls.maxPolarAngle=Math.PI*.65;
 const draw=()=>{if(!disposed&&host.clientWidth&&host.clientHeight)renderer.render(scene,camera);};controls.addEventListener('change',draw);
 const resize=()=>{if(disposed||!host.clientWidth||!host.clientHeight)return;const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();const distance=Math.max(size.x/camera.aspect,size.z+size.y)*.85/Math.tan(THREE.MathUtils.degToRad(17));camera.position.copy(center).addScaledVector(new THREE.Vector3(.25,.95,1).normalize(),distance);controls.update();draw();};
 renderer.domElement.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();model.rotation.y+=e.key==='ArrowLeft'?-.12:e.key==='ArrowRight'?.12:0;model.rotation.x+=e.key==='ArrowUp'?-.08:e.key==='ArrowDown'?.08:0;draw();});
 host.append(renderer.domElement);if(fallback)fallback.hidden=true;observer=new ResizeObserver(resize);observer.observe(host);resize();window.addEventListener('pagehide',cleanup,{once:true});
 return cleanup;
 }catch{cleanup();return ()=>{};}
}
