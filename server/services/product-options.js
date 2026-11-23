import fs from 'node:fs';
import {requireValue} from '../validators.js';
const manifest=JSON.parse(fs.readFileSync(new URL('../../keyboard-3d/exports/keyboard_manifest.json',import.meta.url),'utf8'));
export const productOptions={keycapThemes:manifest.keycapThemes.map(({id,name})=>({id,name})),layouts:manifest.layouts.map(({id,name})=>({id,name})),connections:manifest.connectionTypes.map(({id,name})=>({id,name})),switches:manifest.switches.map(({id,name,type})=>({id,name,type})),switchTypes:[...new Set(manifest.switches.map(s=>s.type))].map(id=>({id,name:id[0].toUpperCase()+id.slice(1)}))};
const normalize=s=>String(s||'').trim().toLowerCase().replace(/[_\s]+/g,'-');
export function canonicalSpec(field,value){if(!value)return null;const key=normalize(value);let options=field==='layout'?productOptions.layouts:field==='connection_type'?productOptions.connections:[...productOptions.switchTypes,...productOptions.switches];const direct=options.find(o=>normalize(o.id)===key||normalize(o.name)===key);if(direct)return direct.id;
 if(field==='layout'){const v=key.replace(/^ansi-?/,'').replace('%','');if(productOptions.layouts.some(o=>o.id===v))return v;}
 if(field==='connection_type'){const aliases={'usb':'wired','usb-c':'wired','wired-usb-c':'wired','bluetooth-5.0':'bluetooth','bt':'bluetooth','2.4ghz':'wireless','2.4g':'wireless','2.4ghz-wireless':'wireless','trimode':'tri-mode','tri-mode-(wired-+-bluetooth-+-2.4ghz)':'tri-mode'};if(aliases[key])return aliases[key];}
 if(field==='switch_type'){const match=productOptions.switches.find(o=>normalize(o.name).replace('-','')===key.replace('-',''));if(match)return match.id;}
 return null;}
export function validatedSpec(field,value){const result=canonicalSpec(field,value);requireValue(!value||result,'Choose a supported '+field.replaceAll('_',' ')+' from the list.');return result;}
export function switchFilterValues(value){const canonical=canonicalSpec('switch_type',value);return productOptions.switchTypes.some(t=>t.id===canonical)?[canonical,...productOptions.switches.filter(s=>s.type===canonical).map(s=>s.id)]:canonical?[canonical]:[];}
