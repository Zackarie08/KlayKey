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
  if(state.caseColorMode===undefined)state.caseColorMode='preset';
  if(!['preset','custom'].includes(state.caseColorMode)){state.caseColorMode='preset';reasons.push({code:'INVALID_CASE_COLOR',message:'Choose preset or custom case color.'});}
  const validCaseColor=typeof input.customCaseColor==='string'&&/^#[\da-f]{6}$/i.test(input.customCaseColor);
  if((input.customCaseColor!==undefined||state.caseColorMode==='custom')&&!validCaseColor)reasons.push({code:'INVALID_CASE_COLOR',message:'Use a six-digit hex color for your case.'});
  state.customCaseColor=validCaseColor?input.customCaseColor.toUpperCase():manifest.caseColors.find(c=>c.id===state.caseColor).color;
  const rules=manifest.compatibility;
  const themes=manifest.keycapThemes.filter(t=>layout.requiredWidths.every(w=>t.supportedWidths.includes(w))&&layout.requiredHeights.every(h=>t.supportedHeights.includes(h)));
  if(!themes.length) throw new Error('No keycap theme covers this layout.');
  fallback('keycapTheme',themes);
  const baseTheme=themes.find(t=>t.id===state.keycapTheme);
  if(state.keycapColorMode===undefined)state.keycapColorMode='preset';
  if(!['preset','custom'].includes(state.keycapColorMode)){state.keycapColorMode='preset';reasons.push({code:'INVALID_KEYCAP_COLORS',message:'Choose preset or custom keycap colors.'});}
  const colors=input.customKeycapColors;
  state.customKeycapColors=Object.fromEntries(['alpha','modifier','accent'].map(role=>{
    const color=colors?.[role];
    if(color!==undefined&&!/^#[\da-f]{6}$/i.test(color))reasons.push({code:'INVALID_KEYCAP_COLORS',message:'Use six-digit hex colors for your keycaps.'});
    return [role,typeof color==='string'&&/^#[\da-f]{6}$/i.test(color)?color.toUpperCase():baseTheme[role]];
  }));
  if(state.keycapColorMode==='custom'&&(!colors||typeof colors!=='object'||Array.isArray(colors)||['alpha','modifier','accent'].some(role=>typeof colors[role]!=='string'))){reasons.push({code:'INVALID_KEYCAP_COLORS',message:'Choose all three custom keycap colors.'});}
  const switches=manifest.switches.filter(s=>rules.switchMount.allowed.includes(s.mount)&&s.mount===layout.switchMount);
  if(!switches.length) throw new Error('No compatible switch mount.');
  fallback('switch',switches); fallback('rgbMode',manifest.rgbModes);
  fallback('connection',manifest.connectionTypes);fallback('keycapMaterial',manifest.keycapMaterials);
  fallback('controlModule',manifest.controlModules);
  if((state.controlModule==='volume-knob'&&!layout.knobSupported)||(state.controlModule==='mini-display'&&!layout.displaySupported)){
    const name=state.controlModule==='volume-knob'?'volume knob':'mini display';
    state.controlModule='none';reasons.push({code:'CONTROL_REMOVED',message:'The '+name+' was removed because it is not available for the '+state.layout+'% layout.'});
  }
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
