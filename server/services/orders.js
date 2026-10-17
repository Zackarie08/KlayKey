import crypto from 'node:crypto';
import {rows,json,transaction} from '../database/connection.js';
import {lockCart,getCart} from './cart.js';
import {shipping,requireValue,HttpError,text} from '../validators.js';
export const deliveryFees={standard:15000,express:30000,pickup:0};
export async function checkout(userId,input){
 const address=shipping(input.address);requireValue(Object.hasOwn(deliveryFees,input.delivery),'Choose a delivery option.');requireValue(['cod','gcash-demo','card-demo'].includes(input.payment),'Choose a simulated payment method.');requireValue(input.simulationConsent===true,'Confirm that this is a simulated order.');
 const key=text(input.idempotencyKey,'checkout reference',16,80);
 return transaction(async db=>{
  const cartId=await lockCart(userId,db);const existing=(await rows('SELECT order_number FROM orders WHERE user_id=? AND idempotency_key=?',[userId,key],db))[0];if(existing)return existing.order_number;
  // Lock inventory in deterministic order before calculating prices or demand.
  await rows('SELECT id FROM products ORDER BY id FOR UPDATE',[],db);
  const cart=await getCart(userId,db);requireValue(cart.items.length>0,'Your cart is empty.');const demand=new Map();
  for(const item of cart.items){requireValue(item.available,item.error||'An item is out of stock.');for(const c of item.snapshot.components){const count=(demand.get(c.productId)||0)+c.quantity*item.quantity;requireValue(count<=c.stock,`Not enough stock for ${c.name}. Your cart has been kept.`);demand.set(c.productId,count);}}
  const number='KK-'+new Date().toISOString().slice(0,10).replaceAll('-','')+'-'+crypto.randomBytes(5).toString('hex').toUpperCase();const fee=deliveryFees[input.delivery];
  const order=await rows('INSERT INTO orders(order_number,user_id,shipping_address,delivery_method,payment_method,subtotal_cents,shipping_cents,total_cents,idempotency_key) VALUES(?,?,?,?,?,?,?,?,?)',[number,userId,JSON.stringify(address),input.delivery,input.payment,cart.subtotal,fee,cart.subtotal+fee,key],db);
  for(const item of cart.items)await rows('INSERT INTO order_items(order_id,snapshot,quantity,unit_price_cents) VALUES(?,?,?,?)',[order.insertId,JSON.stringify(item.snapshot),item.quantity,item.snapshot.price_cents],db);
  for(const [id,count] of demand){const result=await rows('UPDATE products SET stock_quantity=stock_quantity-? WHERE id=? AND stock_quantity>=?',[count,id,count],db);requireValue(result.affectedRows===1,'Stock changed. Your cart has been kept.');}
  await rows('INSERT INTO payments(order_id,method,reference,status,amount_cents) VALUES(?,?,?,?,?)',[order.insertId,input.payment,'DEMO-'+crypto.randomBytes(8).toString('hex'),input.payment==='cod'?'pending-cod':'simulated-paid',cart.subtotal+fee],db);
  await rows('DELETE FROM cart_items WHERE cart_id=?',[cartId],db);return number;
 });
}
export async function orderDetails(number,userId){const o=(await rows('SELECT o.*,p.reference,p.status payment_status FROM orders o JOIN payments p ON p.order_id=o.id WHERE o.order_number=? AND o.user_id=?',[number,userId]))[0];if(!o)throw new HttpError(404,'Order not found.');return {...o,shipping_address:json(o.shipping_address),items:(await rows('SELECT * FROM order_items WHERE order_id=?',[o.id])).map(i=>({...i,snapshot:json(i.snapshot)}))};}
