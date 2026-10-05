export function autoCorrelate(buf, sampleRate){
  let size=buf.length, rms=0;
  for(let i=0;i<size;i++) rms+=buf[i]*buf[i];
  rms=Math.sqrt(rms/size);
  if(rms<0.012) return {pitch:-1,rms,clarity:0};
  let r1=0,r2=size-1,thres=.2;
  for(let i=0;i<size/2;i++){if(Math.abs(buf[i])<thres){r1=i;break}}
  for(let i=1;i<size/2;i++){if(Math.abs(buf[size-i])<thres){r2=size-i;break}}
  const arr=buf.slice(r1,r2); size=arr.length;
  const c=new Float32Array(size);
  for(let lag=0;lag<size;lag++){
    let sum=0;
    for(let i=0;i<size-lag;i++) sum+=arr[i]*arr[i+lag];
    c[lag]=sum;
  }
  let d=0; while(d+1<size && c[d]>c[d+1]) d++;
  let max=-1,pos=-1;
  for(let i=d;i<size;i++){if(c[i]>max){max=c[i];pos=i}}
  if(pos<=0) return {pitch:-1,rms,clarity:0};
  let T0=pos;
  if(pos>0&&pos<size-1){
    const x1=c[pos-1],x2=c[pos],x3=c[pos+1];
    const a=(x1+x3-2*x2)/2, b=(x3-x1)/2;
    if(a) T0=pos-b/(2*a);
  }
  const pitch=sampleRate/T0;
  const clarity=Math.max(0,Math.min(1,max/(c[0]||1)));
  if(pitch<55||pitch>700||clarity<.15) return {pitch:-1,rms,clarity};
  return {pitch,rms,clarity};
}

export const hzToCents=(hz,ref)=>1200*Math.log2(hz/ref);
export const centsToHz=(cents,ref)=>ref*Math.pow(2,cents/1200);

// Smooths short-term jitter and corrects common octave-doubling/halving errors.
// The correction is conservative: it only tries octave alternatives after a very
// large frame-to-frame jump, which is uncommon in ordinary connected speech.
export class PitchTracker{
  constructor({baselineHz=130,smoothing=.28}={}){
    this.baselineHz=baselineHz;
    this.smoothing=smoothing;
    this.reset();
  }
  reset(){this.lastHz=null;this.smoothedCents=null;}
  update(rawPitch,clarity=1){
    if(!(rawPitch>0)||clarity<.18) return {pitch:-1,cents:null,corrected:false};
    let candidate=rawPitch, corrected=false;
    const ref=this.lastHz||this.baselineHz;
    const ratio=rawPitch/ref;
    if(ratio>1.72||ratio<.58){
      const candidates=[rawPitch/2,rawPitch,rawPitch*2].filter(x=>x>=55&&x<=700);
      const distance=x=>Math.abs(1200*Math.log2(x/ref));
      const best=candidates.reduce((a,b)=>distance(a)<=distance(b)?a:b);
      if(Math.abs(1200*Math.log2(best/rawPitch))>700){candidate=best;corrected=true;}
    }
    const cents=hzToCents(candidate,this.baselineHz);
    if(this.smoothedCents==null) this.smoothedCents=cents;
    else {
      const delta=cents-this.smoothedCents;
      const alpha=Math.abs(delta)>220?Math.min(.42,this.smoothing+.08):this.smoothing;
      this.smoothedCents+=delta*alpha;
    }
    const pitch=centsToHz(this.smoothedCents,this.baselineHz);
    this.lastHz=pitch;
    return {pitch,cents:this.smoothedCents,corrected};
  }
}
