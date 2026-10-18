import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {normalize} from '../viewer/configuration.js';
const m=JSON.parse(fs.readFileSync(new URL('../exports/keyboard_manifest.json',import.meta.url)));
test('Every supported combination normalizes without changing compatible choices',()=>{
  for(const l of m.layouts)for(const c of m.caseColors)for(const t of m.keycapThemes)for(const s of m.switches)for(const r of m.rgbModes)for(const connection of m.connectionTypes){
    const input={layout:l.id,caseColor:c.id,keycapTheme:t.id,switch:s.id,rgbMode:r.id,connection:connection.id,accessory:'none'};
    const {state,reasons}=normalize(m,input);assert.equal(reasons.length,0);for(const [k,v] of Object.entries(input))assert.equal(state[k],v);
    assert.equal(state.caseVariant,`case-${l.id}`);
  }
});
test('Compact layout removes the control bay but preserves other selections',()=>{
  const {state,reasons}=normalize(m,{layout:'60',accessory:'display',caseColor:'green',connection:'wired'});
  assert.equal(state.accessory,'none');assert.equal(state.controlModule,'none');assert.equal(state.caseColor,'green');assert.equal(state.connection,'wired');assert.equal(reasons[0].code,'CONTROL_REMOVED');
});
test('Modules follow layout support while acoustic materials remain compatible',()=>{
  for(const layout of m.layouts)for(const module of m.controlModules)for(const cap of m.keycapMaterials){
    const {state,reasons}=normalize(m,{layout:layout.id,controlModule:module.id,keycapMaterial:cap.id,volume:.73,muted:true});
    assert.equal(state.controlModule,layout.id==='60'?'none':module.id);assert.equal(state.keycapMaterial,cap.id);assert.equal(state.volume,.73);assert.equal(state.muted,true);assert.equal(reasons.length,layout.id==='60'&&module.id!=='none'?1:0);
  }
});
test('Unsupported sizes, mounts and RGB metadata produce compatible fallbacks',()=>{
  const custom=structuredClone(m);custom.keycapThemes[0].supportedWidths=[1];custom.switches[0].mount='optical';custom.layouts[1].rgbCapable=false;
  const {state,reasons}=normalize(custom,{});assert.equal(state.keycapTheme,'forest');assert.equal(state.switch,'switch-brown');assert.equal(state.rgbMode,'off');assert.ok(reasons.some(r=>r.code==='RGB_UNSUPPORTED'));
});
test('Malformed selections normalize safely',()=>{
  const {state}=normalize(m,{layout:'invalid',accessory:'both',rgbIntensity:Infinity,rgbColor:'red'});
  assert.equal(state.layout,'60');assert.equal(state.accessory,'none');assert.equal(state.rgbIntensity,2);assert.equal(state.rgbColor,m.defaults.rgbColor);
});
test('Saved layout data has no overlapping rectangles and exact key counts',()=>{
  for(const [id,count] of [['60',61],['75',81],['100',104]]){
    const l=JSON.parse(fs.readFileSync(new URL(`../exports/layout_${id}.json`,import.meta.url)));
    assert.equal(l.keys.length,count);
    for(let i=0;i<l.keys.length;i++)for(const b of l.keys.slice(i+1)){
      const a=l.keys[i];assert.ok(Math.min(a.x+a.width,b.x+b.width)<=Math.max(a.x,b.x)||Math.min(a.y+a.height,b.y+b.height)<=Math.max(a.y,b.y));
    }
  }
});

test('Compact geometry has no bay; larger layouts retain their controls',()=>{
 for(const id of ['60','75','100']){
  const bytes=fs.readFileSync(new URL('../exports/keyboard_'+id+'.glb',import.meta.url));const doc=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)));const names=doc.nodes.map(n=>n.name);
  for(const name of ['ACCESSORY_BAY','CONTROL_MODULE','OPTION_KNOB','VOLUME_KNOB_ROOT','OPTION_DISPLAY'])assert.equal(names.includes(name),id!=='60',id+': '+name);
 }
 const compact=m.layouts.find(l=>l.id==='60');assert.equal(compact.dimensionsMM.width,300.75);assert.equal(compact.dimensionsMM.depth,110.25);assert.equal(compact.knobSupported,false);assert.equal(compact.displaySupported,false);
});
