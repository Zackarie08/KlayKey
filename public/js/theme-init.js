// Apply the saved preference before CSS paints. Night is the default.
(()=>{let theme='dark';try{if(localStorage.getItem('klaykey-theme')==='light')theme='light';}catch{}document.documentElement.dataset.theme=theme;})();
