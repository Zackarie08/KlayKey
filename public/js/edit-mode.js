// Existing records begin read-only. Create/action forms remain immediately usable.
export function editMode(form,{onCancel=()=>location.reload(),label='Edit'}={}){
 if(!form||form.dataset.editMode)return;form.dataset.editMode='view';
 const controls=[...form.querySelectorAll('input,select,textarea,button')],original=new Map(controls.map(el=>[el,el.disabled]));
 const actions=document.createElement('div');actions.className='actions full record-edit-actions';
 const edit=document.createElement('button');edit.type='button';edit.className='button secondary';edit.textContent=label;
 const cancel=document.createElement('button');cancel.type='button';cancel.className='button secondary';cancel.textContent='Cancel editing';cancel.hidden=true;actions.append(edit,cancel);form.prepend(actions);
 const set=editing=>{form.dataset.editMode=editing?'edit':'view';for(const el of controls){el.disabled=editing?original.get(el):true;if(el.matches('button[type=submit]'))el.hidden=!editing;}edit.hidden=editing;cancel.hidden=!editing;};
 edit.onclick=()=>{set(true);form.querySelector('input:not(:disabled):not([type=hidden]),textarea:not(:disabled),select:not(:disabled)')?.focus();};cancel.onclick=onCancel;
 const observe=new MutationObserver(()=>{for(const el of form.querySelectorAll('input,select,textarea,button')){if(actions.contains(el)||original.has(el))continue;original.set(el,el.disabled);controls.push(el);if(form.dataset.editMode==='view'){el.disabled=true;if(el.matches('button[type=submit]'))el.hidden=true;}}});observe.observe(form,{childList:true,subtree:true});
 form.addEventListener('submit',e=>{if(form.dataset.editMode!=='edit'){e.preventDefault();e.stopImmediatePropagation();}},true);set(false);
}
export function installEditModes(){
 const scan=()=>{const params=new URLSearchParams(location.search);for(const id of ['profile','admin-product','event-editor','promo-form','access-form']){const form=document.getElementById(id);if(!form||form.dataset.editMode)continue;if(['admin-product','event-editor'].includes(id)&&params.get('id')==='new')continue;editMode(form);}};
 const observer=new MutationObserver(scan);observer.observe(document.body,{childList:true,subtree:true});scan();
}
