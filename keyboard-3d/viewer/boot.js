import {mountKeyboard} from './app.js?v=4';
try{window.keyboardLab=await mountKeyboard(document.querySelector('main'));}catch{document.querySelector('#loading').textContent='The 3D preview is unavailable. Please enable WebGL or try another browser.';}
