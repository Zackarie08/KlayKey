import test from 'node:test';
import assert from 'node:assert/strict';
import {SALE_THEMES,saleTheme,themeIcon,themeDecorations} from '../public/js/sale-themes.js';
import {eventInput} from '../server/services/admin-rules.js';
const base={title:'Seasonal offer',message:'Save on selected items.',discount_type:'percent',discount_value:10,enabled:true,product_ids:[1],category_ids:[],display_type:'popup',audience:'everyone',starts_at:'2027-01-01T00:00:00Z',ends_at:'2027-02-01T00:00:00Z',priority:0};
test('All five seasonal designs and Default can be saved for both promotion types',()=>{
 assert.deepEqual(SALE_THEMES.map(t=>t.id),['standard','christmas','summer','halloween','new-year','valentines']);
 for(const theme of SALE_THEMES)for(const display_type of ['popup','floating'])assert.equal(eventInput({...base,display_type,theme:theme.id}).theme,theme.id);
 for(const theme of ['other','<script>','Christmas',null])assert.throws(()=>eventInput({...base,theme}));
});
test('Themes have separate decorative artwork, safe fallbacks and accessible decorative SVGs',()=>{
 const designs=SALE_THEMES.filter(t=>t.id!=='standard').map(t=>themeDecorations(t.id));assert.equal(new Set(designs).size,5);
 for(const t of SALE_THEMES){assert.match(themeIcon(t.id),/aria-hidden="true"/);assert.doesNotMatch(themeIcon(t.id),/script|onload|https?:/);}
 assert.equal(saleTheme('unknown').id,'standard');assert.equal(themeDecorations('unknown'),'');assert.equal(themeDecorations('standard'),'');
});
