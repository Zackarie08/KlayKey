export const builderMarkup=()=>`
<nav class="builder-progress container" aria-label="Build steps">
${['Size & Case','Color & Keycaps','Switch & Sound','Lighting & Connection','Review'].map((name,i)=>`<a href="#build-step-${i+1}" data-step="${i+1}" ${i===0?'aria-current="step"':''}><span>0${i+1}</span>${name}</a>`).join('')}
</nav>
<section class="builder-layout container" id="keyboard-builder">
 <div class="builder-preview">
  <div class="preview-caption"><span class="eyebrow">YOUR KEYBOARD, IN 3D</span><strong id="model-name">Loading keyboard…</strong></div>
  <div id="viewport" aria-label="Interactive 3D keyboard"></div><p id="loading" role="status">Loading your keyboard…</p>
  <div class="viewer-toolbar" aria-label="Preview controls"><button type="button" class="button secondary" id="reset-camera">Reset view</button><button type="button" class="button secondary" id="fullscreen-preview">Fullscreen</button><button type="button" class="button secondary" id="preview-interact" aria-pressed="false">Rotate & zoom</button></div>
  <p class="preview-help">Drag to rotate · Scroll to zoom. On touch screens, select Rotate & zoom first.</p>
 </div>
 <div class="builder-options">
  <h2>Customize your keyboard</h2><p class="intro">Choose each component below. Your 3D preview, compatibility status, and price update automatically.</p>
  <form id="controls">
   <fieldset id="build-step-1"><legend><span>01</span> Size and chassis</legend><label>Keyboard size<select id="layout"></select></label><p class="hint">60% for a compact desk, 75% for function keys, or 100% for a full numpad.</p><label>Case color<select id="caseColor"></select></label><label>Case finish<select id="caseFinish"></select></label></fieldset>
   <fieldset id="build-step-2"><legend><span>02</span> Color and keycaps</legend><label>Keycap colorway<select id="keycapTheme"></select></label><label>Keycap material<select id="keycapMaterial"></select></label><p class="hint">Material changes the surface finish and the synthesized sound profile.</p></fieldset>
   <fieldset id="build-step-3"><legend><span>03</span> Switch and sound</legend><label>Switch type<select id="switch"></select></label><p id="switch-info" class="hint"></p>
    <div class="typing-panel"><h3>Typing test</h3><p>Start the test, then use your physical keyboard to animate the model and preview its sound.</p><button type="button" class="button secondary" id="start-typing" aria-pressed="false">Start typing test</button><p id="typing-status" role="status">Ready when you are. Press Escape to finish.</p><p id="sound-profile"></p><label class="check"><input type="checkbox" id="soundEnabled" checked>Typing sounds</label><label>Volume <output id="volume-value">45%</output><input id="volume" type="range" min="0" max="1" step="0.01" value="0.45"></label><label class="check"><input type="checkbox" id="muted">Mute sound</label><p class="hint">Synthesized previews, not product recordings. Actual sound varies with your setup.</p></div>
   </fieldset>
   <fieldset id="build-step-4"><legend><span>04</span> Lighting and connection</legend><label>Lighting effect<select id="rgbMode"></select></label><label>RGB color<input id="rgbColor" type="color" value="#a66aff"></label><label>Brightness<input id="rgbIntensity" type="range" min="0" max="5" step="0.1" value="2"></label><label class="check"><input id="underglow" type="checkbox" checked>Case underglow</label><label>Connection<select id="connection"></select></label><label>Additional control<select id="controlModule"></select></label><p id="compatibility" class="notice" role="status"></p></fieldset>
  </form><p id="status" class="sr-only" role="status"></p>
  <div id="review-mount"></div>
 </div>
</section>`;
