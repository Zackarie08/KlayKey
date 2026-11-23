import {api,esc,money,state} from './core.js';
const utc=v=>Date.parse(v.replace(' ','T')+'Z');
const date=v=>new Intl.DateTimeFormat('en-PH',{month:'short',day:'numeric',year:'numeric',timeZone:'Asia/Manila'}).format(new Date(v));
const read=k=>{try{return sessionStorage.getItem(k);}catch{return null;}};
const write=(k,v)=>{try{sessionStorage.setItem(k,v);}catch{/* Optional dismissal persistence. */}};
export async function showPromotion(){
 if(!['/','/shop','/parts','/builder'].includes(location.pathname)&&!location.pathname.startsWith('/shop/'))return;
 await Promise.allSettled([welcome(),christmas()]);
}
async function welcome(){
 const p=await api('/promotion');if(!p)return;const key='klay-first-'+p.revision;let minimized=read(key)==='minimized';
 const host=document.createElement('aside');host.setAttribute('aria-label','First-purchase offer');document.body.append(host);
 const render=()=>{host.innerHTML=minimized?'<button class="sale-tab" aria-label="Open first-purchase offer">10% OFF · First order</button>':
 '<section class="sale-card" aria-labelledby="sale-title"><button class="sale-close" aria-label="Minimize first-purchase offer">×</button><span class="eyebrow">YOUR FIRST ORDER, A LITTLE SWEETER</span><div class="sale-amount">10% OFF</div><h2 id="sale-title">'+esc(p.title)+'</h2><p>'+esc(p.message)+'</p><a class="button" href="'+(state.user?'/shop?sale=1':'/login?returnTo=%2Fshop%3Fsale%3D1')+'">'+(state.user?'Explore eligible items ↗':'Sign in to claim ↗')+'</a><small>First successful purchase per account. Eligible products only; excludes custom builds and shipping. The best offer applies per item.</small></section>';
 host.querySelector('button').onclick=()=>{minimized=!minimized;write(key,minimized?'minimized':'open');render();host.querySelector('button').focus();};};render();
 if(p.ends_at){const remaining=utc(p.ends_at)-Date.now();if(remaining>0&&remaining<2147483647)setTimeout(()=>host.remove(),remaining);}
}
async function christmas(){
 let campaign=await api('/campaign');if(!campaign)return;
 const launcher=document.createElement('button');launcher.className='christmas-launcher';launcher.setAttribute('aria-label','Open Christmas sale');launcher.setAttribute('aria-haspopup','dialog');launcher.innerHTML='<span aria-hidden="true">🎁</span><span>Christmas<br>at KlayKey</span>';
 const dialog=document.createElement('dialog');dialog.className='christmas-dialog';dialog.setAttribute('aria-labelledby','christmas-title');document.body.append(launcher,dialog);
 let key='klay-christmas-'+campaign.revision,previewDispose=null;
 function fit(){if(!dialog.open)return;const scene=dialog.querySelector('.christmas-scene');scene.style.transform='none';dialog.style.height='auto';const height=scene.getBoundingClientRect().height,available=(window.visualViewport?.height||innerHeight)-24;const scale=Math.min(1,available/height);scene.style.transformOrigin='top center';scene.style.transform='scale('+scale+')';dialog.style.height=(height*scale)+'px';}
 window.addEventListener('resize',fit);window.visualViewport?.addEventListener('resize',fit);
 const dismiss=()=>{write(key,'dismissed');dialog.close();};
 function render(){previewDispose?.();previewDispose=null;const p=campaign,f=p.featured,range=date(utc(p.starts_at))+' – '+date(utc(p.ends_at)-1);
 dialog.innerHTML='<section class="christmas-scene"><button type="button" class="christmas-close" aria-label="Close Christmas sale" autofocus>×</button><div class="christmas-copy"><span class="christmas-kicker">THE KLAYKEY HOLIDAY COLLECTION</span><p class="christmas-dates">'+esc(range)+' · Philippine time</p><h2 id="christmas-title">'+esc(p.title)+'</h2><div class="christmas-offer">'+esc(p.discount_value)+'<span>%<small>OFF</small></span></div><p class="christmas-message">'+esc(p.message)+'</p><p class="christmas-state">'+(p.active?'The holiday sale is here.':'A little preview. Offers begin '+esc(date(utc(p.starts_at)))+'.')+'</p></div>'+(f?'<div class="christmas-product"><span class="christmas-ribbon">LIMITED CHRISTMAS EDITION</span><div class="christmas-model"><img src="'+esc(f.images[0])+'" alt="'+esc(f.name)+'" width="900" height="550"></div><div><h3>'+esc(f.name)+'</h3><p>'+esc(f.short_description)+'</p><strong>'+money(f.price_cents)+'</strong>'+(f.original_price_cents?'<del>'+money(f.original_price_cents)+'</del>':'')+'<small>'+esc(f.availability_message)+'</small></div></div>':'')+'<div class="christmas-actions">'+(f?'<a class="button" href="/shop/'+esc(f.slug)+'">'+(p.active&&f.purchasable?'Discover Noël 75':'Preview Noël 75')+' ↗</a>':'')+(p.active?'<a class="button secondary" href="/shop?sale=christmas">Shop the sale</a>':'')+(p.include_builds?'<a class="christmas-build" href="/builder">Create your own holiday board →</a>':'')+'</div><p class="christmas-terms">Selected products'+(p.include_builds?' & builds':'')+'. Excludes assembly and shipping. No stacking. December only, while stocks last.</p></section>';
 dialog.querySelector('.christmas-close').onclick=dismiss;
 const host=dialog.querySelector('.christmas-model');if(host)import('./noel-preview.js').then(async({mountNoelPreview})=>{if(!host.isConnected)return;const dispose=await mountNoelPreview(host);if(!host.isConnected)dispose();else previewDispose=dispose;}).catch(()=>{});
 }
 // Persist before navigation, including opening a promo link in another tab.
 dialog.addEventListener('click',e=>{if(e.target.closest('a[href]'))dismiss();});
 dialog.addEventListener('auxclick',e=>{if(e.target.closest('a[href]'))dismiss();});
 render();launcher.onclick=()=>{dialog.showModal();fit();};dialog.addEventListener('close',()=>{write(key,'dismissed');launcher.focus();});dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
 if(read(key)!=='dismissed'&&!location.pathname.startsWith('/shop/')){write(key,'dismissed');dialog.showModal();fit();}
 // Recheck server dates and stock when returning to an open tab and across sale boundaries.
 let refreshing=false;async function refresh(){if(refreshing||document.hidden)return;refreshing=true;try{const p=await api('/campaign');if(!p){clearInterval(timer);document.removeEventListener('visibilitychange',refresh);window.removeEventListener('resize',fit);window.visualViewport?.removeEventListener('resize',fit);previewDispose?.();dialog.close();dialog.remove();launcher.remove();return;}const open=dialog.open,focusClose=dialog.querySelector('.christmas-close')===document.activeElement;campaign=p;key='klay-christmas-'+p.revision;render();fit();if(open&&focusClose)dialog.querySelector('.christmas-close').focus();}catch{/* Preserve usable storefront during transient outages. */}finally{refreshing=false;}}
 const timer=setInterval(refresh,60000);document.addEventListener('visibilitychange',refresh);
}
