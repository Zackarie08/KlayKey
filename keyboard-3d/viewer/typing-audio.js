import {synthesize,keyPitch} from './sound-synthesis.js';

export class TypingAudio {
  constructor(profiles){this.profiles=profiles;this.context=null;this.buffers=new Map();this.voices=[];this.roundRobin=0;this.played=0;this.state={volume:.45,muted:false,soundEnabled:true};this.sampleErrors=[];}
  async unlock(){
    if(!this.context){
      this.context=new AudioContext({latencyHint:'interactive'});
      this.master=this.context.createGain();const compressor=this.context.createDynamicsCompressor();
      compressor.threshold.value=-18;compressor.knee.value=8;compressor.ratio.value=8;compressor.attack.value=.001;compressor.release.value=.06;
      const limiter=this.context.createWaveShaper();const curve=new Float32Array(2048);
      for(let i=0;i<curve.length;i++){const x=i/(curve.length-1)*2-1;curve[i]=.92*Math.tanh(x/.92);}
      limiter.curve=curve;limiter.oversample='2x';compressor.connect(limiter);limiter.connect(this.master);this.master.connect(this.context.destination);this.input=compressor;
      for(const sw of Object.keys(this.profiles.switches))for(const cap of Object.keys(this.profiles.keycaps)){
        const variants=[];for(let i=0;i<this.profiles.variations;i++){
          const pcm=synthesize(this.profiles,sw,cap,i,this.context.sampleRate),b=this.context.createBuffer(1,pcm.length,this.context.sampleRate);b.copyToChannel(pcm,0);variants.push(b);
        }this.buffers.set(sw+'+'+cap,variants);
      }
      // Optional replacement recordings are opt-in and loaded once. Synthesis is always ready.
      this.loadSamples();
    }
    await this.context.resume();this.setState(this.state);return this.context.state;
  }
  async loadSamples(){
    for(const [id,urls] of Object.entries(this.profiles.sampleOverrides||{})){
      try{const buffers=await Promise.all(urls.map(async url=>{const r=await fetch(new URL(url,import.meta.url));if(!r.ok)throw Error('Sample HTTP '+r.status);return this.context.decodeAudioData(await r.arrayBuffer());}));
        if(buffers.length>=3){for(const b of buffers){let peak=0;for(let c=0;c<b.numberOfChannels;c++)for(const value of b.getChannelData(c))peak=Math.max(peak,Math.abs(value));for(let c=0;c<b.numberOfChannels;c++){const samples=b.getChannelData(c);for(let i=0;i<samples.length;i++)samples[i]*=this.profiles.master.peakPerVoice/Math.max(peak,1e-6);}}this.buffers.set(id,buffers);}
      }catch(e){this.sampleErrors.push({profile:id,message:e.message});}
    }
  }
  setState(state){this.state={...state};if(this.master){this.master.gain.setTargetAtTime(state.muted||!state.soundEnabled?0:Math.max(0,Math.min(1,state.volume)),this.context.currentTime,.008);}}
  play(state,code){
    this.setState(state);if(!this.context||this.context.state!=='running'||state.muted||!state.soundEnabled||state.volume<=0)return false;
    const variants=this.buffers.get(state.switch+'+'+state.keycapMaterial);if(!variants)return false;
    const now=this.context.currentTime;this.voices=this.voices.filter(v=>v.end>now);
    if(this.voices.length>=this.profiles.master.maxVoices){const oldest=this.voices.shift();oldest.source.stop();}
    const source=this.context.createBufferSource(),gain=this.context.createGain();source.buffer=variants[this.roundRobin++%variants.length];
    source.playbackRate.value=keyPitch(code)*(1+(Math.random()-.5)*.035);gain.gain.value=.92+Math.random()*.08;
    source.connect(gain);gain.connect(this.input);source.onended=()=>{source.disconnect();gain.disconnect();};source.start();
    this.voices.push({source,end:now+source.buffer.duration/source.playbackRate.value});this.played++;return true;
  }
}
