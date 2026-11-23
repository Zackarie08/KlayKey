// Preserve stored payment identifiers while presenting readable labels.
export const paymentMethod=value=>({cod:'Cash on Delivery','gcash-demo':'GCash','card-demo':'Card'})[value]||value;
export const paymentStatus=value=>({'collected-cod':'Cash collected','pending-cod':'Awaiting collection','simulated-paid':'Recorded'})[value]||value;
export const paymentReference=value=>String(value??'').replace(/^DEMO-/,'');
// Remove only the known legacy seed sentence; retain merchant-authored copy.
export const productCopy=value=>String(value??'').replace(/Demo catalog pricing; no real purchase or shipment is made\./g,'').replace(/modular modular collection/g,'modular collection').trim();
