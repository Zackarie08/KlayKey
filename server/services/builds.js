import fs from 'node:fs/promises';
import {root} from '../config.js';
import {normalize} from '../../keyboard-3d/viewer/configuration.js';
import {rows,json,pool} from '../database/connection.js';
import {HttpError,requireValue} from '../validators.js';
export const manifest=JSON.parse(await fs.readFile(root+'/keyboard-3d/exports/keyboard_manifest.json','utf8'));
export const fees={assembly:35000,connection:{wired:0,wireless:45000,'tri-mode':75000},material:{'thick-pbt':0,'thin-abs':-15000,polycarbonate:25000},finish:{anodized:0,satin:12000,soft:18000},rgb:25000};
const fields=['layout','caseColor','caseFinish','keycapTheme','keycapMaterial','switch','rgbMode','rgbColor','rgbIntensity','underglow','connection','controlModule','volume','muted','soundEnabled'];
export async function quote(input,db=pool){
 requireValue(input&&typeof input==='object'&&!Array.isArray(input),'Choose a keyboard configuration.');
 const clean=Object.fromEntries(fields.filter(k=>input[k]!==undefined).map(k=>[k,input[k]]));
 const normalized=normalize(manifest,clean);requireValue(!normalized.reasons.length,'This build contains an incompatible or unknown selection.');
 const s=normalized.state;
 if(input.caseVariant!==undefined)requireValue(input.caseVariant===s.caseVariant,'The chassis does not match the layout.');
 const products=await rows('SELECT * FROM products WHERE option_field IS NOT NULL AND is_active=1',[],db);
 const components=[];const layout=manifest.layouts.find(l=>l.id===s.layout);
 for(const field of ['layout','keycapTheme','switch','controlModule']){
  if(field==='controlModule'&&s[field]==='none')continue;
  const p=products.find(p=>p.option_field===field&&p.option_value===s[field]);
  requireValue(p,'A selected component is unavailable.');const c=json(p.compatibility);
  requireValue(c.layouts.includes(s.layout)&&(!c.mount||c.mount===layout.switchMount)&&c.connections.includes(s.connection),'A selected component is incompatible with this layout or connection.');
  if(field==='keycapTheme')requireValue(layout.requiredWidths.every(w=>c.widths.includes(w))&&layout.requiredHeights.every(h=>c.heights.includes(h)),'The keycap set is missing a required key size.');
  components.push({productId:p.id,name:p.name,quantity:field==='switch'?layout.keyCount:1,unitPrice:p.price_cents,stock:p.stock_quantity});
 }
 const lines=components.map(c=>({name:c.name,quantity:c.quantity,amount:c.unitPrice*c.quantity}));
 for(const [name,amount] of [['Keycap material: '+s.keycapMaterial,fees.material[s.keycapMaterial]],['Finish: '+s.caseFinish,fees.finish[s.caseFinish]],['Connection: '+s.connection,fees.connection[s.connection]],['RGB kit',s.rgbMode==='off'?0:fees.rgb],['Assembly & quality check',fees.assembly]])lines.push({name,quantity:1,amount});
 return {name:'Custom Form '+s.layout,configuration:s,components,lines,price_cents:lines.reduce((n,l)=>n+l.amount,0),image:`/assets/images/keyboard_${s.layout}.webp`,compatibilityVersion:manifest.schemaVersion,available:components.every(c=>c.stock>=c.quantity)};
}
export async function ownedBuild(id,userId,db=pool){const b=(await rows('SELECT * FROM custom_builds WHERE id=? AND user_id=?',[id,userId],db))[0];if(!b)throw new HttpError(404,'Build not found.');return {...b,configuration:json(b.configuration),snapshot:json(b.snapshot)};}
