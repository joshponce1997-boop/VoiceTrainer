import {autoCorrelate} from './pitch-detector.js';
export class AudioEngine{
  constructor(){this.ctx=null;this.stream=null;this.analyser=null;this.data=null;this.running=false;this.onFrame=null;this.deviceId='';}
  async start(deviceId=''){
    await this.stop();
    const constraints={audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}};
    if(deviceId) constraints.audio.deviceId={exact:deviceId};
    this.stream=await navigator.mediaDevices.getUserMedia(constraints);
    this.ctx=new (window.AudioContext||window.webkitAudioContext)();
    await this.ctx.resume();
    const src=this.ctx.createMediaStreamSource(this.stream);
    this.analyser=this.ctx.createAnalyser();
    this.analyser.fftSize=2048;
    this.analyser.smoothingTimeConstant=.12;
    src.connect(this.analyser);
    this.data=new Float32Array(this.analyser.fftSize);
    this.running=true;
    this.loop();
    return this.stream;
  }
  loop(){
    if(!this.running||!this.analyser) return;
    this.analyser.getFloatTimeDomainData(this.data);
    const m=autoCorrelate(this.data,this.ctx.sampleRate);
    if(this.onFrame) this.onFrame({...m,time:performance.now()});
    requestAnimationFrame(()=>this.loop());
  }
  async stop(){
    this.running=false;
    if(this.stream){this.stream.getTracks().forEach(t=>t.stop());this.stream=null;}
    if(this.ctx){try{await this.ctx.close()}catch{}this.ctx=null;}
  }
  async enumerate(){
    try{return (await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='audioinput')}catch{return[]}
  }
}
