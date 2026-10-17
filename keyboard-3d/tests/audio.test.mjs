import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {synthesize,keyPitch} from '../viewer/sound-synthesis.js';
const profiles=JSON.parse(fs.readFileSync(new URL('../config/sound_profiles.json',import.meta.url)));
test('Nine original sound profiles are finite, distinct and below the voice ceiling',()=>{
  const signatures=new Set();
  for(const sw of Object.keys(profiles.switches))for(const cap of Object.keys(profiles.keycaps)){
    const signal=synthesize(profiles,sw,cap);assert.ok(signal.every(Number.isFinite));
    assert.ok(Math.max(...signal.map(Math.abs))<=.070001);
    signatures.add(signal.slice(30,200).join(','));
  }
  assert.equal(signatures.size,9);
});
test('Three round-robin variants and broad-key pitch shifts are distinct',()=>{
  const variants=[0,1,2].map(v=>synthesize(profiles,'switch-brown','thick-pbt',v));
  assert.notDeepEqual(variants[0],variants[1]);assert.notDeepEqual(variants[1],variants[2]);
  assert.equal(keyPitch('KeyA'),1);assert.ok(keyPitch('Space')<keyPitch('Enter'));assert.ok(keyPitch('Enter')<1);
});
test('Synthesized signals start and end without a discontinuous endpoint',()=>{
  for(const sw of Object.keys(profiles.switches))for(const cap of Object.keys(profiles.keycaps)){
    const a=synthesize(profiles,sw,cap);assert.equal(a[0],0);assert.ok(Math.abs(a.at(-1))<.0001);
  }
});
