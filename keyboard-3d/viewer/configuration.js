/** Pure compatibility logic shared by the viewer and automated tests. */
export function normalize(manifest,input){
  if(input.accessory!==undefined&&input.controlModule===undefined)input={...input,controlModule:{none:'none',knob:'volume-knob',display:'mini-display'}[input.accessory]||'none'};
  const state={...manifest.defaults,...input}; const reasons=[];
  const fallback=(field,list)=>{
    if(!list.some(o=>o.id===state[field])){state[field]=list[0].id;reasons.push({code:'INVALID_'+field.toUpperCase(),message:`Replaced invalid ${field}.`});}
  };
  fallback('layout',manifest.layouts);
  const layout=manifest.layouts.find(l=>l.id===state.layout);
  state.caseVariant=layout.caseVariant;
  fallback('caseColor',manifest.caseColors); fallback('caseFinish',manifest.caseFinishes);
  const rules=manifest.compatibility;
  const themes=manifest.keycapThemes.filter(t=>layout.requiredWidths.every(w=>t.supportedWidths.includes(w))&&layout.requiredHeights.every(h=>t.supportedHeights.includes(h)));
  if(!themes.length) throw new Error('No keycap theme covers this layout.');
  fallback('keycapTheme',themes);
  const switches=manifest.switches.filter(s=>rules.switchMount.allowed.includes(s.mount)&&s.mount===layout.switchMount);
  if(!switches.length) throw new Error('No compatible switch mount.');
  fallback('switch',switches); fallback('rgbMode',manifest.rgbModes);
  fallback('connection',manifest.connectionTypes);fallback('keycapMaterial',manifest.keycapMaterials);
  fallback('controlModule',manifest.controlModules);
  state.accessory={'none':'none','volume-knob':'knob','mini-display':'display'}[state.controlModule];
  state.volume=Number.isFinite(Number(state.volume))?Math.max(0,Math.min(1,Number(state.volume))):.45;
  state.muted=!!state.muted;state.soundEnabled=!!state.soundEnabled;
  if(state.rgbMode!=='off'&&!layout[rules.rgb.requires]){
    state.rgbMode='off';reasons.push({code:rules.rgb.reason,message:rules.rgb.message});
  }
  if(!/^#[\da-f]{6}$/i.test(state.rgbColor))state.rgbColor=manifest.defaults.rgbColor;
  state.rgbIntensity=Number.isFinite(Number(state.rgbIntensity))?Math.max(0,Math.min(5,Number(state.rgbIntensity))):2;
  state.underglow=!!state.underglow;
  return {state,reasons,layout};
}
