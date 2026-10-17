import {rows,pool} from '../server/database/connection.js';
for(const layout of ['60','75','100'])await rows('UPDATE products SET images=? WHERE category_id=? AND layout=?',[JSON.stringify([`/assets/images/keyboard_${layout}.webp`]),'prebuilt',layout]);
await pool.end();
