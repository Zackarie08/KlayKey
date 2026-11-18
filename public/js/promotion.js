import {api,esc,money} from './core.js';
export async function showPromotion(){
 if(location.pathname!=='/')return;
 try{const p=await api('/promotion');if(!p)return;const key='klay-sale-'+p.id+'-'+p.revision;let minimized=false;try{minimized=sessionStorage.getItem(key)==='minimized';}catch{}
 const host=document.createElement('aside');host.setAttribute('aria-label','Opening sale');document.body.append(host);
 const amount=p.discount_type==='percent'?p.discount_value+'% OFF':money(p.discount_value)+' OFF';
 const render=()=>{host.innerHTML=minimized?`<button class="sale-tab" aria-label="Open sale details">${esc(amount)} · View sale</button>`:`<section class="sale-card" aria-labelledby="sale-title"><button class="sale-close" aria-label="Minimize sale">×</button><span class="eyebrow">A LITTLE OPENING GIFT</span><div class="sale-amount">${esc(amount)}</div><h2 id="sale-title">${esc(p.title)}</h2><p>${esc(p.message)}</p><a class="button" href="/shop?sale=1">Shop eligible items ↗</a><small>Eligible products only. No code needed. Excludes custom builds and shipping.${p.ends_at?' Ends '+esc(new Date(p.ends_at.replace(' ','T')+'Z').toLocaleString('en-PH',{timeZone:'Asia/Manila'}))+' (Philippine time).':''}</small></section>`;const b=host.querySelector('button');b.onclick=()=>{minimized=!minimized;try{sessionStorage.setItem(key,minimized?'minimized':'open');}catch{}render();host.querySelector('button').focus();};};render();
 if(p.ends_at){const remaining=Date.parse(p.ends_at.replace(' ','T')+'Z')-Date.now();if(remaining>0&&remaining<2147483647)setTimeout(()=>host.remove(),remaining);}
 }catch{/* Promotions must never prevent the storefront from loading. */}
}
