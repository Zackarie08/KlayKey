/** Deterministic animation and browser-event checks, used by the existing QA button.
 * Audio-specific checks run after a trusted Start Typing Test gesture.
 */
export async function runInteractionChecks({assert,animation,typing,audio,hardware,canvas,configure,state,layout}){
  animation.reset();const label=name=>`${layout}: ${name}`;
  for(const code of ['KeyA','Space','ShiftLeft','ShiftRight','Enter','Backspace']){
    const key=animation.keys.get(code);assert(label(code+' mapped'),!!key);
    animation.press(code,0);animation.update(45);
    assert(label(code+' 3.4 mm travel'),Math.abs(key.object.position.distanceTo(key.restPosition)-.0034)<1e-7);
    const other=code==='ShiftLeft'?animation.keys.get('ShiftRight'):null;
    if(other)assert(label('left Shift isolation'),other.currentAmount===0);
    assert(label(code+' repeat suppressed'),!animation.press(code,46));
    animation.release(code,50);animation.update(145);
    assert(label(code+' exact return'),key.object.position.equals(key.restPosition));
  }
  for(const code of ['KeyA','KeyS','KeyD'])animation.press(code,0);animation.update(45);
  assert(label('simultaneous keys'),['KeyA','KeyS','KeyD'].every(c=>animation.keys.get(c).currentAmount===1));animation.reset();
  for(let i=0;i<100;i++){animation.press('KeyA',i*15);animation.update(i*15+5);animation.release('KeyA',i*15+6);animation.update(i*15+10);}
  animation.update(2000);assert(label('fast typing resets exactly'),animation.keys.get('KeyA').currentAmount===0);
  assert(label('numpad availability'),animation.keys.has('Numpad0')===(layout==='100'));
  assert(label('numpad Enter availability'),animation.keys.has('NumpadEnter')===(layout==='100'));
  if(layout==='100')for(const code of ['Numpad0','NumpadEnter']){
    animation.press(code,0);animation.update(45);
    assert(label(code+' animates independently'),animation.keys.get(code).currentAmount===1&&animation.keys.get('Enter').currentAmount===0);
    animation.reset();
  }
  assert(label('unsupported key is safe'),!animation.press('UnmappedCode'));
  const event=(type,code,extra={})=>canvas.dispatchEvent(new KeyboardEvent(type,{code,bubbles:true,cancelable:true,...extra}));
  canvas.focus();typing.active=true;const before=audio.played;
  event('keydown','KeyA');event('keydown','KeyA',{repeat:true});
  assert(label('keyboard event reaches A'),animation.keys.get('KeyA').isPressed);
  if(audio.context?.state==='running'&&!state().muted&&state().soundEnabled)assert(label('one sound per keydown'),audio.played-before===1);
  event('keyup','KeyA');animation.update(performance.now()+150);
  const shortcut=event('keydown','KeyR',{ctrlKey:true});assert(label('browser shortcut not prevented'),shortcut&&!animation.keys.get('KeyR').isPressed);
  assert(label('Space scroll suppressed'),!event('keydown','Space'));event('keyup','Space');
  event('keydown','Escape');assert(label('Escape exits test'),!typing.active);
  typing.active=true;event('keydown','KeyA');canvas.blur();
  assert(label('focus loss releases keys'),!typing.active&&!animation.keys.get('KeyA').isPressed&&animation.keys.get('KeyA').currentAmount===0);
  await configure({volume:.73,muted:false});hardware.update(1);
  assert(label('slider rotates knob'),Math.abs(hardware.angle-(-135+270*.73)*Math.PI/180)<.001);
  hardware.toggleMute();assert(label('mute preserves volume'),state().muted&&state().volume===.73);
  hardware.toggleMute();assert(label('unmute restores volume'),!state().muted&&state().volume===.73);
  assert(label('orbit released'),hardware.orbit.enabled);
  if(audio.context?.state==='running'){
    for(const sw of ['switch-red','switch-brown','switch-blue'])for(const cap of ['thick-pbt','thin-abs','polycarbonate']){
      await configure({switch:sw,keycapMaterial:cap,soundEnabled:true,muted:false});
      assert(label('sound '+sw+'+'+cap),audio.play(state(),'KeyA'));
    }
    assert(label('space sound variation'),audio.play(state(),'Space'));
    assert(label('Enter sound variation'),audio.play(state(),'Enter'));
    for(let i=0;i<80;i++)audio.play(state(),'KeyA');assert(label('bounded polyphony'),audio.voices.length<=24);
    await configure({muted:true});assert(label('mute blocks voices'),!audio.play(state(),'KeyA'));
    await configure({muted:false,soundEnabled:false});assert(label('sound off blocks voices'),!audio.play(state(),'KeyA'));
  }
  typing.stop();animation.reset();
}
