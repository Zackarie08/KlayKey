import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {normalize} from './configuration.js';
import {KeyAnimation,TypingController} from './key-animation.js';
import {TypingAudio} from './typing-audio.js';
import {ControlModule} from './control-module.js';
import {runInteractionChecks} from './interaction-checks.js';

const $=id=>document.getElementById(id);
const manifestURL=new URL('../exports/keyboard_manifest.json',import.meta.url);
const loader=new GLTFLoader();
let manifest,state,model,layoutInfo,materials=new Map(),ticket=0,lastReport;
let animation,typing,audio,hardware,lastFrame=performance.now();
const runtimeErrors=[];
window.addEventListener('error',e=>runtimeErrors.push(e.message));
window.addEventListener('unhandledrejection',e=>runtimeErrors.push(String(e.reason)));
const originalConsoleError=console.error.bind(console);
console.error=(...args)=>{runtimeErrors.push(args.map(String).join(' '));originalConsoleError(...args);};
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(34,1,.005,8);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
$('viewport').appendChild(renderer.domElement);
const pmrem=new THREE.PMREMGenerator(renderer);const room=new RoomEnvironment();
const environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;
room.dispose();pmrem.dispose();scene.environmentIntensity=.7;
scene.add(new THREE.HemisphereLight(0xcdbce6,0x423646,1));
const key=new THREE.DirectionalLight(0xfff1e2,3);key.position.set(-.3,.6,.4);scene.add(key);
const fill=new THREE.DirectionalLight(0xa79cff,1.5);fill.position.set(.4,.3,-.4);scene.add(fill);
const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;controls.minDistance=.15;controls.maxDistance=1.5;
controls.maxPolarAngle=Math.PI*.9;controls.zoomToCursor=true;
controls.addEventListener('change',()=>controls.target.clamp(new THREE.Vector3(-.3,-.1,-.3),new THREE.Vector3(.3,.25,.3)));
const resize=()=>{const el=$('viewport');renderer.setSize(el.clientWidth,el.clientHeight);camera.aspect=el.clientWidth/el.clientHeight;camera.updateProjectionMatrix();resetCamera();};
new ResizeObserver(resize).observe($('viewport'));resize();
renderer.setAnimationLoop(now=>{const dt=Math.min(.05,(now-lastFrame)/1000);lastFrame=now;animation?.update(now);hardware?.update(dt);controls.update();renderer.render(scene,camera);});
function resetCamera(){if(!layoutInfo)return;const d=layoutInfo.camera.distance*Math.max(1,1.4/camera.aspect)*(state.connection==='wired'?1.15:1);controls.target.fromArray(layoutInfo.camera.target);camera.position.copy(controls.target).add(new THREE.Vector3(.65,.85,1).normalize().multiplyScalar(d));controls.update();}
$('reset-camera').addEventListener('click',resetCamera);
function dispose(root){const geometries=new Set(),mats=new Set(),textures=new Set();root.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>mats.add(m));}});geometries.forEach(g=>g.dispose());mats.forEach(m=>{for(const value of Object.values(m))if(value?.isTexture)textures.add(value);m.dispose();});textures.forEach(t=>{t.dispose();t.source?.data?.close?.();});}
function select(id,items){$(id).replaceChildren(...items.map(item=>new Option(item.name,item.id)));}
function visible(name,value){const obj=model.getObjectByName(name);if(obj)obj.visible=value;}
function syncControls(reasons=[]){
  for(const [id,value] of Object.entries(state)){const el=$(id);if(el){if(el.type==='checkbox')el.checked=value;else el.value=value;}}
  $('rgbColor').disabled=state.rgbMode!=='static';
  $('rgbIntensity').disabled=state.rgbMode==='off';
  $('compatibility').textContent=reasons.map(r=>r.message).join(' ')||
    'All layouts support the same modules. Knob and display share one bay.';
  const sw=manifest.switches.find(s=>s.id===state.switch);$('switch-info').textContent=sw.description;
  const cap=manifest.keycapMaterials.find(c=>c.id===state.keycapMaterial);
  $('sound-profile').textContent=sw.name+' + '+cap.name;$('volume-value').textContent=Math.round(state.volume*100)+'%';
}
function apply(){
  if(!model)return;
  const byId=(items,id)=>items.find(i=>i.id===id);
  const c=byId(manifest.caseColors,state.caseColor),f=byId(manifest.caseFinishes,state.caseFinish);
  for(const name of manifest.bindings.caseMaterial){const m=materials.get(name);m.color.set(c.color);m.metalness=c.metallic*f.metallicMultiplier;m.roughness=THREE.MathUtils.clamp(c.roughness+f.roughnessOffset,.12,.85);}
  const theme=byId(manifest.keycapThemes,state.keycapTheme);
  const cap=byId(manifest.keycapMaterials,state.keycapMaterial);
  for(const role of ['alpha','modifier','accent','legend']){
    const m=materials.get('MAT_KEYCAP_'+role.toUpperCase());m.color.set(theme[role]);
    if(role==='legend'){m.emissive.set(theme.legend);m.emissiveIntensity=state.rgbMode==='off'?0:theme.legendEmission;}
    else {const changed=(m.transmission>0)!==(cap.transmission>0);m.roughness=cap.roughness;m.metalness=cap.metalness;m.transmission=cap.transmission;m.ior=cap.ior;m.thickness=.0013;m.normalScale.setScalar(cap.normalScale);if(changed)m.needsUpdate=true;}
  }
  const sw=byId(manifest.switches,state.switch);materials.get('MAT_SWITCH_STEM').color.set(sw.visualColor);
  const palette=['#A66AFF','#51CDFF','#EF6BB2'];
  manifest.bindings.rgbMaterials.forEach((name,i)=>{const m=materials.get(name);const color=state.rgbMode==='white'?'#ffffff':state.rgbMode==='multi'?palette[i]:state.rgbColor;m.color.set(color);m.emissive.set(color);m.emissiveIntensity=state.rgbIntensity;});
  visible('GROUP_RGB',state.rgbMode!=='off');visible('RGB_UNDERGLOW',state.underglow);
  visible(manifest.bindings.connectionNode,manifest.compatibility.connectionVisibility[state.connection]);
  visible(manifest.bindings.knobNode,state.accessory==='knob');visible(manifest.bindings.displayNode,state.accessory==='display');
  audio?.setState(state);
  model.userData.configuration={...state};
  syncControls();renderer.render(scene,camera);
  $('status').textContent=`${layoutInfo.keyCount} keys · ${renderer.info.render.triangles.toLocaleString()} triangles · ${renderer.info.render.calls} draw calls`;
  if(window.parent!==window)window.parent.postMessage({type:'klay-state',configuration:{...state}},location.origin);
}
async function loadLayout(id){
  const request=++ticket;const next=manifest.layouts.find(l=>l.id===id);
  $('loading').hidden=false;$('loading').textContent=`Loading ${next.name}…`;
  try{
    const gltf=await loader.loadAsync(new URL(next.glb,manifestURL).href);
    if(request!==ticket){dispose(gltf.scene);return;}
    if(model){typing?.bind(null);scene.remove(model);dispose(model);}
    model=gltf.scene;layoutInfo=next;materials=new Map();
    const replacements=new Map();
    model.traverse(o=>{if(o.isMesh){
      if(/^MAT_KEYCAP_(ALPHA|MODIFIER|ACCENT)$/.test(o.material.name)&&!o.material.isMeshPhysicalMaterial){
        const original=o.material;if(!replacements.has(original)){const physical=new THREE.MeshPhysicalMaterial();THREE.MeshStandardMaterial.prototype.copy.call(physical,original);physical.defines={STANDARD:'',PHYSICAL:''};physical.name=original.name;replacements.set(original,physical);}o.material=replacements.get(original);
      }
      const list=Array.isArray(o.material)?o.material:[o.material];list.forEach(m=>materials.set(m.name,m));o.frustumCulled=false;
    }});replacements.forEach((_,old)=>old.dispose());
    scene.add(model);animation=new KeyAnimation(model,manifest.typing);typing.bind(animation);hardware.bind(model);
    resetCamera();apply();$('loading').hidden=true;
    $('model-name').textContent=`${next.name} · ${next.dimensionsMM.width.toFixed(0)} mm`;
  }catch(error){if(request!==ticket)return;$('loading').hidden=false;$('loading').textContent=`Could not load ${next.name}. Run the Blender generator and check the local server. ${error.message}`;throw error;}
}
async function configure(patch){
  if(patch.accessory!==undefined&&patch.controlModule===undefined)patch={...patch,controlModule:{none:'none',knob:'volume-knob',display:'mini-display'}[patch.accessory]||'none'};
  const previous=state?.layout;const result=normalize(manifest,{...state,...patch});state=result.state;
  if(previous!==state.layout||!model)await loadLayout(state.layout);else apply();
  syncControls(result.reasons);return result;
}
$('controls').addEventListener('input',async e=>{if(!e.target.id)return;try{await configure({[e.target.id]:e.target.type==='checkbox'?e.target.checked:e.target.value});}catch(error){$('status').textContent=error.message;}});
$('start-typing').addEventListener('click',async()=>{try{await typing.start();}catch(e){$('typing-status').textContent='Audio could not start: '+e.message;}});
$('stop-typing').addEventListener('click',()=>typing.stop());

async function runTests(){
  const saved={...state};const checks=[];const metrics=[];
  const assert=(name,condition)=>{checks.push({name,passed:!!condition});if(!condition)throw new Error(name);};
  const sameColor=(m,value)=>m.color.getHexString()===new THREE.Color(value).getHexString();
  $('run-tests').disabled=true;$('controls').inert=true;
  try{
    for(const layout of manifest.layouts){
      await configure({layout:layout.id});
      assert(`${layout.id}: GLB loaded`,model.getObjectByName('KEYBOARD_ROOT')?.userData.layout===layout.id);
      for(const c of manifest.caseColors){await configure({caseColor:c.id});assert(`${layout.id}: case ${c.id}`,sameColor(materials.get('MAT_CASE_ACTIVE'),c.color));}
      for(const f of manifest.caseFinishes){await configure({caseFinish:f.id});const c=manifest.caseColors.find(c=>c.id===state.caseColor);assert(`${layout.id}: finish ${f.id}`,Math.abs(materials.get('MAT_CASE_ACTIVE').metalness-c.metallic*f.metallicMultiplier)<1e-6);}
      for(const t of manifest.keycapThemes){await configure({keycapTheme:t.id});assert(`${layout.id}: theme ${t.id}`,['alpha','modifier','accent','legend'].every(role=>sameColor(materials.get('MAT_KEYCAP_'+role.toUpperCase()),t[role])));}
      for(const s of manifest.switches){await configure({switch:s.id});assert(`${layout.id}: switch ${s.id}`,sameColor(materials.get('MAT_SWITCH_STEM'),s.visualColor));}
      for(const r of manifest.rgbModes){await configure({rgbMode:r.id});assert(`${layout.id}: RGB ${r.id}`,model.getObjectByName('GROUP_RGB').visible===(r.id!=='off'));}
      await configure({rgbMode:'static',rgbColor:'#18cd82',rgbIntensity:3.1,underglow:false});
      assert(`${layout.id}: RGB color/intensity`,materials.get('MAT_RGB_EMISSIVE').emissive.getHexString()==='18cd82'&&materials.get('MAT_RGB_EMISSIVE').emissiveIntensity===3.1);
      assert(`${layout.id}: underglow off`,!model.getObjectByName('RGB_UNDERGLOW').visible);
      await configure({underglow:true});assert(`${layout.id}: underglow on`,model.getObjectByName('RGB_UNDERGLOW').visible);
      for(const c of manifest.connectionTypes){await configure({connection:c.id});assert(`${layout.id}: connection ${c.id}`,model.getObjectByName('OPTION_CABLE').visible===(c.id==='wired'));}
      for(const a of manifest.controlModules){await configure({controlModule:a.id});assert(`${layout.id}: module ${a.id}`,state.controlModule===a.id);assert(`${layout.id}: ${a.id} visibility`,model.getObjectByName('OPTION_KNOB').visible===(a.id==='volume-knob')&&model.getObjectByName('OPTION_DISPLAY').visible===(a.id==='mini-display'));}
      for(const cap of manifest.keycapMaterials){await configure({keycapMaterial:cap.id});assert(`${layout.id}: physical material ${cap.id}`,materials.get('MAT_KEYCAP_ALPHA').roughness===cap.roughness&&materials.get('MAT_KEYCAP_ALPHA').transmission===cap.transmission);}
      await runInteractionChecks({assert,animation,typing,audio,hardware,canvas:renderer.domElement,configure,state:()=>state,layout:layout.id});
      await configure({...manifest.defaults,layout:layout.id});renderer.render(scene,camera);
      metrics.push({layout:layout.id,triangles:renderer.info.render.triangles,drawCalls:renderer.info.render.calls,materials:materials.size});
    }
    await configure({layout:'75',accessory:'display',caseColor:'green'});await configure({layout:'60'});
    assert('Layout transition preserves control module',state.accessory==='display');
    assert('Layout transition preserves compatible case color',state.caseColor==='green');
    assert('Renderer has non-empty drawing buffer',renderer.domElement.width>0&&renderer.domElement.height>0);
    assert('No runtime/console errors',runtimeErrors.length===0);
  }catch(error){checks.push({name:error.message,passed:false});}
  finally{
    lastReport={timestamp:new Date().toISOString(),threeRevision:THREE.REVISION,audioUnlocked:audio.context?.state==='running',audioChecks:audio.context?.state==='running'?'executed':'skipped: click Start Typing Test first',checks,metrics,runtimeErrors:[...runtimeErrors],passed:checks.every(c=>c.passed)};
    try{const result=await fetch('/__qa/report',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(lastReport)});if(!result.ok)throw Error('Report endpoint unavailable');}
    catch{ /* Other static servers can still use the Save report download button. */ }
    $('test-results').textContent=`${checks.filter(c=>c.passed).length}/${checks.length} passed\n`+metrics.map(m=>`${m.layout}%: ${m.triangles} triangles / ${m.drawCalls} calls`).join('\n')+'\n'+checks.filter(c=>!c.passed).map(c=>c.name).join('\n');
    $('download-tests').disabled=false;$('run-tests').disabled=false;$('controls').inert=false;
    await configure(saved);
  }
  return lastReport;
}
$('run-tests').addEventListener('click',runTests);
$('download-tests').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(lastReport,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='viewer-validation.json';a.click();URL.revokeObjectURL(url);});
try{
  const response=await fetch(manifestURL);if(!response.ok)throw new Error(`Manifest HTTP ${response.status}`);manifest=await response.json();
  audio=new TypingAudio(manifest.soundProfiles);
  typing=new TypingController(renderer.domElement,audio,()=>state,message=>{$('typing-status').textContent=message;});
  hardware=new ControlModule(renderer.domElement,camera,controls,()=>model,()=>state,configure);
  for(const [id,key] of Object.entries({layout:'layouts',caseColor:'caseColors',caseFinish:'caseFinishes',keycapTheme:'keycapThemes',keycapMaterial:'keycapMaterials',switch:'switches',rgbMode:'rgbModes',connection:'connectionTypes',controlModule:'controlModules'}))select(id,manifest[key]);
  await configure(manifest.defaults);
  // Public integration API: configuration remains serializable; model assets stay modular.
  window.keyboardLab={configure,runTests,getState:()=>({...state}),getReport:()=>lastReport};
  if(window.parent!==window)window.parent.postMessage({type:'klay-ready'},location.origin);
  if(new URLSearchParams(location.search).has('test'))await runTests();
}catch(error){$('loading').hidden=false;$('loading').textContent=`Viewer startup failed: ${error.message}. Run npm install, generate the assets, then npm start.`;}
