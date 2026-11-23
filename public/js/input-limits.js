// Shared text-field limits; fixed-format values (hex colors/postcodes/IDs) retain their format rules.
export function inputLimit(name,{type='text',multiline=false,existing=0}={}){
 if(type==='password')return 72;
 if(type==='url')return 2048;
 if(type==='email'||name==='email')return 254;
 if(['first_name','last_name','recipient_name','name','title','subject','build-name','material','mount','family'].includes(name))return 50;
 if(['description','short_description','notes'].includes(name))return 500;
 if(['q','find','product_search','product-search'].includes(name)||type==='search')return 100;
 if(name==='phone')return 50;
 if(name==='street')return 180;
 if(['barangay','city','province'].includes(name))return 100;
 if(name==='postal_code')return 4;
 if(name==='sku')return 50;
 if(name==='slug')return 100;
 if(name==='id'||name==='category_id')return 50;
 if(/^(cap-hex-|case-color-hex)/.test(name))return 7;
 if(['widths','heights'].includes(name))return 500;
 return existing>0?existing:multiline?500:50;
}
export function installInputLimits(root=document){
 function apply(el){if(!el.matches('textarea,input'))return;const type=el.tagName==='TEXTAREA'?'text':el.type;if(!['text','search','email','tel','url','password'].includes(type))return;
 const max=inputLimit(el.name||el.id,{type,multiline:el.tagName==='TEXTAREA',existing:el.maxLength});el.maxLength=max;
 const validate=()=>{if(el.value.length>max){el.setCustomValidity('Use no more than '+max+' characters.');el.dataset.lengthError='true';}else if(el.dataset.lengthError){el.setCustomValidity('');delete el.dataset.lengthError;}};
 validate();if(!el.dataset.lengthBound){el.addEventListener('input',validate);el.dataset.lengthBound='true';}
 }
 const scan=node=>{if(node.nodeType!==1&&node!==root)return;if(node.matches?.('textarea,input'))apply(node);node.querySelectorAll?.('input,textarea').forEach(apply);};scan(root);
 const observer=new MutationObserver(changes=>changes.forEach(c=>c.addedNodes.forEach(scan)));observer.observe(root===document?document.body:root,{childList:true,subtree:true});return ()=>observer.disconnect();
}
