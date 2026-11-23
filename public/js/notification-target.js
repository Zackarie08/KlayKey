// Notifications have different destinations; rider assignments must not open the customer's order page.
export function notificationTarget(n){
 if(/^\/delivery(?:\?|$)/.test(n.url||''))return {href:n.url,label:'View delivery'};
 if(/^\/account\/support(?:\?|$)/.test(n.url||''))return {href:n.url,label:'Read support reply'};
 if(n.order_number)return {href:'/order-confirmation/'+encodeURIComponent(n.order_number),label:'View order'};
 if(n.url==='/'||/^\/shop(?:\?|$)/.test(n.url||''))return {href:n.url,label:'View offer'};
 return {href:'/account',label:'View account'};
}
