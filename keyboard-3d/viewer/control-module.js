import * as THREE from 'three';

export class ControlModule {
  constructor(canvas,camera,orbit,getModel,getState,configure,signal){
    const listen=(target,type,fn,options={})=>target.addEventListener(type,fn,{...options,signal});
    Object.assign(this,{canvas,camera,orbit,getModel,getState,configure});this.ray=new THREE.Raycaster();this.pointer=new THREE.Vector2();this.angle=0;this.lastNonzero=.45;
    const over=e=>{
      if(this.getState()?.controlModule!=='volume-knob')return false;
      const knob=this.getModel()?.getObjectByName('OPTION_VOLUME_KNOB');if(!knob)return false;
      const rect=canvas.getBoundingClientRect();this.pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);
      this.ray.setFromCamera(this.pointer,camera);return this.ray.intersectObject(knob,true).length>0;
    };
    listen(canvas,'pointermove',e=>{canvas.style.cursor=over(e)?'pointer':'';});
    listen(canvas,'wheel',e=>{if(!over(e))return;e.preventDefault();e.stopImmediatePropagation();this.configure({volume:Math.max(0,Math.min(1,this.getState().volume+(e.deltaY<0?.04:-.04))),muted:false});},{capture:true,passive:false});
    listen(canvas,'pointerdown',e=>{if(e.button!==0||!over(e))return;e.preventDefault();e.stopImmediatePropagation();this.down={x:e.clientX,y:e.clientY};orbit.enabled=false;},{capture:true});
    listen(window,'pointerup',e=>{if(!this.down)return;e.stopImmediatePropagation();const delta=Math.hypot(e.clientX-this.down.x,e.clientY-this.down.y);this.down=null;orbit.enabled=true;if(delta<5&&over(e))this.toggleMute();},{capture:true});
    listen(window,'pointercancel',()=>this.release());listen(window,'blur',()=>this.release());
  }
  release(){this.down=null;this.orbit.enabled=true;}
  toggleMute(){const s=this.getState();this.configure({muted:!s.muted,volume:s.muted&&s.volume===0?this.lastNonzero:s.volume});}
  bind(root){
    this.release();this.knob=root.getObjectByName('VOLUME_KNOB_ROOT');this.baseQuaternion=this.knob?.quaternion.clone();
    this.texture?.dispose();this.screen=root.getObjectByName('MINI_DISPLAY_SCREEN');if(!this.screen)return;this.display=document.createElement('canvas');this.display.width=512;this.display.height=180;
    this.texture=new THREE.CanvasTexture(this.display);this.texture.colorSpace=THREE.SRGBColorSpace;
    const material=this.screen.material;material.map=this.texture;material.emissiveMap=this.texture;
    material.emissive.set('#ffffff');material.color.set('#ffffff');material.emissiveIntensity=.65;material.needsUpdate=true;
    this.signature='';this.angle=THREE.MathUtils.degToRad(-135+270*this.getState().volume);this.update(0);
  }
  update(dt){
    const state=this.getState();if(!state||!this.knob)return;
    if(state.volume>0)this.lastNonzero=state.volume;
    const desired=THREE.MathUtils.degToRad(-135+270*state.volume);this.angle=THREE.MathUtils.lerp(this.angle,desired,1-Math.exp(-dt*18));
    this.knob.quaternion.copy(this.baseQuaternion).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),this.angle));
    const signature=[state.volume,state.muted,state.soundEnabled,state.switch,state.rgbMode,state.rgbColor].join('|');if(signature===this.signature)return;this.signature=signature;
    const ctx=this.display.getContext('2d');ctx.fillStyle='#071014';ctx.fillRect(0,0,512,180);
    ctx.fillStyle=state.muted||!state.soundEnabled?'#ff9caa':'#d1f8ee';ctx.font='bold 54px system-ui';ctx.fillText(state.muted||!state.soundEnabled?'MUTED':'VOL '+Math.round(state.volume*100)+'%',20,70);
    ctx.fillStyle=state.rgbMode==='off'?'#53666c':state.rgbMode==='white'?'#ffffff':state.rgbColor;ctx.fillRect(20,90,472,4);
    ctx.fillStyle='#99b8c5';ctx.font='22px system-ui';ctx.fillText(state.switch.replace('switch-','').toUpperCase()+'  /  '+state.rgbMode.toUpperCase(),20,142);this.texture.needsUpdate=true;
  }
}
