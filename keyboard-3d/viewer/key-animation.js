import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

/** Keep exported KEY_code nodes while batching their render geometry by material.
 * One vertex-uniform translation per key makes 104 individually animated keys
 * cost five material submissions, without one animation loop per key.
 */
export class KeyAnimation {
  constructor(root, settings={downMS:45,upMS:95}) {
    this.root=root;this.settings=settings;this.keys=new Map();this.offsets=Array.from({length:128},()=>new THREE.Vector3());
    root.updateMatrixWorld(true);const buckets=new Map();let index=1;
    root.traverse(node=>{
      if(!node.name.startsWith('KEY_')||!node.userData.code)return;
      const rest=node.position.clone(), worldRest=node.getWorldPosition(new THREE.Vector3());
      const travel=(node.userData.travelMM||3.4)*.001;
      const direction=new THREE.Vector3(0,-travel,0).applyQuaternion(node.quaternion);
      const key={object:node,restPosition:rest,pressedPosition:rest.clone().add(direction),worldRest,
        direction,currentAmount:0,targetAmount:0,fromAmount:0,isPressed:false,started:0,index:index++,code:node.userData.code};
      this.keys.set(key.code,key);
      node.traverse(child=>{
        if(!child.isMesh)return;
        if(Array.isArray(child.material))throw Error('Expected split glTF primitives');
        let geometry=child.geometry.clone();if(geometry.index){const expanded=geometry.toNonIndexed();geometry.dispose();geometry=expanded;}
        geometry.applyMatrix4(child.matrixWorld);
        for(const name of Object.keys(geometry.attributes))if(!['position','normal','uv'].includes(name))geometry.deleteAttribute(name);
        if(!geometry.attributes.uv)geometry.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(geometry.attributes.position.count*2),2));
        geometry.setAttribute('keyIndex',new THREE.BufferAttribute(new Float32Array(geometry.attributes.position.count).fill(key.index),1));
        if(!buckets.has(child.material))buckets.set(child.material,[]);buckets.get(child.material).push(geometry);
        child.visible=false;
      });
    });
    if(index>128)throw Error('Keyboard exceeds 127 animated keys');
    this.batches=[];
    for(const [material,geometries] of buckets){
      const geometry=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());
      if(!geometry)throw Error('Failed to batch animated keys');
      material.onBeforeCompile=shader=>{
        shader.uniforms.keyOffsets={value:this.offsets};
        shader.vertexShader='attribute float keyIndex;\nuniform vec3 keyOffsets[128];\n'+shader.vertexShader;
        shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed += keyOffsets[int(keyIndex)];');
      };
      material.customProgramCacheKey=()=> 'klay-key-translation-v2';material.needsUpdate=true;
      const batch=new THREE.Mesh(geometry,material);batch.name='ANIMATED_BATCH_'+material.name;batch.frustumCulled=false;
      root.add(batch);this.batches.push(batch);
    }
  }
  press(code,now=performance.now()) {
    const k=this.keys.get(code);if(!k||k.isPressed)return false;
    k.isPressed=true;k.fromAmount=k.currentAmount;k.targetAmount=1;k.started=now;return true;
  }
  release(code,now=performance.now()) {
    const k=this.keys.get(code);if(!k||!k.isPressed)return;
    k.isPressed=false;k.fromAmount=k.currentAmount;k.targetAmount=0;k.started=now;
  }
  update(now=performance.now()) {
    for(const k of this.keys.values()){
      if(k.currentAmount===k.targetAmount)continue;
      const t=Math.min(1,Math.max(0,(now-k.started)/(k.targetAmount?this.settings.downMS:this.settings.upMS)));
      const eased=t*t*(3-2*t);k.currentAmount=t===1?k.targetAmount:THREE.MathUtils.lerp(k.fromAmount,k.targetAmount,eased);
      k.object.position.copy(k.restPosition).addScaledVector(k.direction,k.currentAmount);
      if(k.currentAmount===0)k.object.position.copy(k.restPosition);
      k.object.updateMatrixWorld(true);
      this.offsets[k.index].copy(k.object.getWorldPosition(new THREE.Vector3())).sub(k.worldRest);
    }
  }
  reset() {
    for(const k of this.keys.values()){
      k.object.position.copy(k.restPosition);k.currentAmount=k.targetAmount=k.fromAmount=0;k.isPressed=false;this.offsets[k.index].set(0,0,0);
    }
  }
}

export function isEditable(target){return !!(target?.isContentEditable||target?.closest?.('input,textarea,select,[role="textbox"]'));}
export function isBrowserShortcut(event){return event.ctrlKey||event.metaKey||event.altKey||['F5','F11','F12'].includes(event.code);}

/** Installed exactly once; bind() replaces the current key map, never listeners. */
export class TypingController {
  constructor(canvas,audio,getState,onStatus){
    Object.assign(this,{canvas,audio,getState,onStatus});this.active=false;this.map=null;this.soundCount=0;
    canvas.tabIndex=0;canvas.setAttribute('aria-label','Keyboard typing test canvas');
    this.down=e=>{
      if(!this.active||document.activeElement!==canvas||isEditable(e.target))return;
      if(e.code==='Escape'){this.stop();return;}
      if(isBrowserShortcut(e)||e.repeat)return;
      if(['Space','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.code))e.preventDefault();
      if(this.map?.press(e.code)){this.soundCount+=this.audio.play(this.getState(),e.code)?1:0;this.onStatus('Typing test active — '+e.code);}
      else if(!this.map?.keys.has(e.code))this.onStatus(e.code+' is unavailable on this layout.');
    };
    this.up=e=>this.map?.release(e.code);
    canvas.addEventListener('keydown',this.down);window.addEventListener('keyup',this.up);
    window.addEventListener('blur',()=>this.stop());canvas.addEventListener('blur',()=>this.stop());
    document.addEventListener('visibilitychange',()=>{if(document.hidden)this.stop();});
  }
  bind(map){this.map?.reset();this.map=map;}
  async start(){await this.audio.unlock();this.active=true;this.canvas.focus();this.onStatus('Typing test active — press any key. Escape exits.');}
  stop(){this.active=false;this.map?.reset();this.onStatus('Typing test stopped. Press Start Typing Test to resume.');}
}
