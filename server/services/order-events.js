import {getOffers,activePromotion,visibleCampaign} from './promotions.js';
import {rows,pool} from '../database/connection.js';
const labels={pending:'Awaiting confirmation',confirmed:'Confirmed',processing:'Preparing order','ready-to-ship':'Ready to ship',shipped:'On delivery',completed:'Delivered',cancelled:'Cancelled'};
export async function orderEvent(db,order,{actorId,status=order.status,message,kind='status',publicMessage=message}){
 await rows('INSERT INTO order_events(order_id,actor_id,status,kind,message) VALUES(?,?,?,?,?)',[order.id,actorId,status,kind,publicMessage||message],db);
 const label=order.delivery_method==='pickup'&&status==='completed'?'Collected':order.delivery_method==='pickup'&&status==='ready-to-ship'?'Ready for pickup':labels[status]||status;
 await rows('INSERT INTO order_notifications(user_id,order_id,title,message) VALUES(?,?,?,?)',[order.user_id,order.id,order.order_number+' · '+label,publicMessage||'Your order status has changed to '+label+'.'],db);
}
export async function customerTimeline(orderId,db=pool){return rows('SELECT status,kind,message,created_at FROM order_events WHERE order_id=? ORDER BY id',[orderId],db);}

export async function syncPromoNotifications(userId){const context=await getOffers(userId);for(const p of context.offers){if(!(p.display_type==='popup'?visibleCampaign(p):activePromotion(p)))continue;const active=activePromotion(p);const eventKey='promo:'+p.id+':'+p.revision+':'+(active?'live':'preview');const url='/shop?sale=promo-'+p.id;await rows('INSERT IGNORE INTO order_notifications(user_id,event_key,title,message,url) VALUES(?,?,?,?,?)',[userId,eventKey,(active?'Offer live: ':'Coming soon: ')+p.title,p.message,active?url:'/']);}}
