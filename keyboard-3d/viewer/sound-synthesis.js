/** Original, deterministic impact synthesis. No recorded or third-party audio. */
export function synthesize(profiles,switchId,capId,variation=0,rate=48000){
  const sw=profiles.switches[switchId],cap=profiles.keycaps[capId];
  const duration=.18;const samples=new Float32Array(Math.ceil(duration*rate));
  let seed=9817+variation*739;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296*2-1;};
  let low=0;const fundamental=sw.bodyHz*cap.pitch*(1+(variation-1)*.018);
  for(let i=0;i<samples.length;i++){
    const t=i/rate;const noise=random();low+=.15*(noise-low);
    const attack=Math.min(1,t/.0008),decay=sw.decay*cap.decay;
    const body=Math.sin(2*Math.PI*fundamental*t)*Math.exp(-t/decay);
    const upper=.28*Math.sin(2*Math.PI*fundamental*2.71*t)*Math.exp(-t/(decay*.55));
    const impact=(noise-low)*sw.noise*cap.brightness*Math.exp(-t/.008);
    const click=sw.click*cap.brightness*(Math.sin(2*Math.PI*3200*t)+noise*.65)*Math.exp(-t/.003);
    const second=t>.008?sw.click*.35*Math.sin(2*Math.PI*4100*(t-.008))*Math.exp(-(t-.008)/.0025):0;
    const resonance=cap.resonance*Math.sin(2*Math.PI*fundamental*4.3*t)*Math.exp(-t/.065);
    samples[i]=attack*(body*.6+upper+impact+click+second+resonance)*Math.min(1,(duration-t)/.015);
  }
  const peak=Math.max(...samples.map(Math.abs));
  for(let i=0;i<samples.length;i++)samples[i]=samples[i]/Math.max(peak,1e-6)*profiles.master.peakPerVoice;
  samples[0]=0;samples[samples.length-1]=0;
  return samples;
}

export function keyPitch(code){return code==='Space'?.78:['Enter','NumpadEnter','Backspace','ShiftLeft','ShiftRight'].includes(code)?.9:1;}
