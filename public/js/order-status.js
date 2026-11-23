import {esc} from './core.js';

export function orderStatusLabel(status, delivery) {
 if (delivery === 'pickup' && status === 'ready-to-ship') return 'Ready for pickup';
 if (delivery === 'pickup' && status === 'completed') return 'Collected';
 return ({pending:'Awaiting confirmation',confirmed:'Confirmed',processing:'Preparing order','ready-to-ship':'Ready to ship',shipped:'On delivery',completed:'Delivered',cancelled:'Cancelled'})[status] || status;
}

export function orderProgress(order) {
 const steps=['pending','confirmed','processing','ready-to-ship',...(order.delivery_method==='pickup'?[]:['shipped']),'completed'];
 const current=steps.indexOf(order.status);
 const message=order.status==='cancelled'?'This order was cancelled.':({pending:'Waiting for the store to confirm your order.',confirmed:'Your order has been accepted.',processing:'Your items are being prepared.','ready-to-ship':order.delivery_method==='pickup'?'Your order is ready for collection.':'Your order is ready for courier handoff.',shipped:'Your order has been handed to the courier and is on delivery.',completed:order.delivery_method==='pickup'?'Your order has been collected.':'Your order has been marked as delivered.'})[order.status]||'Check back for updates.';
 return `<section class="panel order-progress" aria-label="Order progress"><h3>${esc(orderStatusLabel(order.status,order.delivery_method))}</h3><p>${esc(message)}</p>${order.status==='cancelled'?'':`<ol>${steps.map((s,i)=>`<li class="${i<current?'done':i===current?'current':''}" ${i===current?'aria-current="step"':''}><span aria-hidden="true">${i<current?'✓':i+1}</span>${esc(orderStatusLabel(s,order.delivery_method))}</li>`).join('')}</ol>`}<small class="muted">Follow your order progress here.</small></section>`;
}

export function orderActionLabel(status,delivery){
 return ({confirmed:'Confirm order',processing:'Start preparing order','ready-to-ship':delivery==='pickup'?'Mark ready for pickup':'Mark ready to ship',shipped:'Mark as on delivery',completed:delivery==='pickup'?'Mark as collected':'Mark as delivered',cancelled:'Cancel order'})[status]||orderStatusLabel(status,delivery);
}
