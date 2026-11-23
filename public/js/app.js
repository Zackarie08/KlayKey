import {installEditModes} from './edit-mode.js';
import {installInputLimits} from './input-limits.js';
import {session,errorState,brand} from './core.js';
import {shell} from './components.js';
const main=document.querySelector('#main');installInputLimits();installEditModes();
try{await session();document.title=brand+' - Shape your board.';shell();const p=location.pathname;
 if(p==='/account/notifications')await (await import('./notifications.js')).render(main);
 else if(p==='/delivery')await (await import('./pages/delivery.js')).render(main);
 else if(p==='/'){await (await import('./pages/home.js')).render(main);}
 else if(p==='/admin'||p.startsWith('/admin/'))await (await import('./pages/admin.js')).render(main);
 else if(p==='/shop'||p==='/parts'||p.startsWith('/shop/'))await (await import('./pages/catalog.js')).render(main);
 else if(['/login','/register','/account'].includes(p))await (await import('./pages/account.js')).render(main);
 else if(p==='/builder'||p==='/account/builds')await (await import('./pages/builder.js')).render(main);
 else if(p==='/cart'||p==='/checkout'||p==='/account/orders'||p.startsWith('/order-confirmation/'))await (await import('./pages/commerce.js')).render(main);
 else await (await import('./pages/info.js')).render(main);
 await (await import('./promotion.js')).showPromotion();
}catch(e){shell();errorState(e);}
