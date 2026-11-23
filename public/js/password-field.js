import {esc} from './core.js';

const eye=visible=>`<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>${visible?'<path d="m3 3 18 18"/>':''}</svg>`;

export function passwordField(name,label,{autocomplete='current-password',minlength=0}={}){
 const id='password-'+name;
 return `<div class="password-control"><label for="${esc(id)}">${esc(label)}</label><div class="password-input-wrap"><input id="${esc(id)}" name="${esc(name)}" type="password" required maxlength="72" ${minlength?`minlength="${minlength}"`:''} autocomplete="${esc(autocomplete)}" aria-describedby="error-${esc(name)}"><button type="button" class="password-toggle" data-password-toggle="${esc(id)}" data-password-label="${esc(label.toLowerCase())}" aria-controls="${esc(id)}" aria-label="Show ${esc(label.toLowerCase())}" title="Show ${esc(label.toLowerCase())}" aria-pressed="false">${eye(false)}</button></div><small class="field-error" id="error-${esc(name)}" data-error="${esc(name)}"></small></div>`;
}

export function bindPasswordToggles(root){
 root.querySelectorAll('[data-password-toggle]').forEach(button=>{
  button.onclick=()=>{
   const input=root.querySelector('#'+CSS.escape(button.dataset.passwordToggle));
   const visible=input.type==='password';input.type=visible?'text':'password';
   const label=`${visible?'Hide':'Show'} ${button.dataset.passwordLabel}`;
   button.setAttribute('aria-label',label);button.title=label;button.setAttribute('aria-pressed',String(visible));button.innerHTML=eye(visible);
  };
 });
}
