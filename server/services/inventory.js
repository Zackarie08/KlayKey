import {rows} from '../database/connection.js';
export async function recordCheckoutStock(db,productId,quantity,number){
 // The storefront still operates before the owner applies the optional admin SQL.
 try{await rows('INSERT INTO stock_movements(product_id,actor_id,delta,balance,reason) SELECT id,NULL,?,stock_quantity,? FROM products WHERE id=?',[-quantity,'Checkout '+number,productId],db);}catch(e){if(e.code!=='ER_NO_SUCH_TABLE')throw e;}
}
