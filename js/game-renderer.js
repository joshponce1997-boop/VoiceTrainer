export class GameRenderer{
  constructor(canvas){
    this.canvas=canvas;this.ctx=canvas.getContext('2d');this.actual=[];this.targetFn=null;
    this.corridor=250;this.sensitivity=1;
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(canvas);this.resize();
  }
  resize(){const r=this.canvas.getBoundingClientRect();const d=devicePixelRatio||1;this.canvas.width=Math.max(1,Math.floor(r.width*d));this.canvas.height=Math.max(1,Math.floor(r.height*d));this.ctx.setTransform(d,0,0,d,0,0)}
  setTarget(fn,corridor){this.targetFn=fn;this.corridor=corridor;this.actual=[]}
  addActual(t,cents){this.actual.push({t,cents});if(this.actual.length>900)this.actual.shift()}
  draw(progress){
    const ctx=this.ctx,w=this.canvas.clientWidth,h=this.canvas.clientHeight;
    ctx.clearRect(0,0,w,h);ctx.fillStyle='#081019';ctx.fillRect(0,0,w,h);
    ctx.strokeStyle='rgba(255,255,255,.055)';ctx.lineWidth=1;
    for(let i=1;i<7;i++){ctx.beginPath();ctx.moveTo(0,h*i/7);ctx.lineTo(w,h*i/7);ctx.stroke()}
    const cy=h/2,scale=h/1400*this.sensitivity;
    if(this.targetFn){
      ctx.beginPath();
      for(let x=0;x<=w;x+=4){const t=x/w,y=cy-(this.targetFn(t)-this.corridor)*scale;if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)}
      for(let x=w;x>=0;x-=4){const t=x/w,y=cy-(this.targetFn(t)+this.corridor)*scale;ctx.lineTo(x,y)}
      ctx.closePath();ctx.fillStyle='rgba(97,240,180,.13)';ctx.fill();
      ctx.beginPath();for(let x=0;x<=w;x+=4){const t=x/w,y=cy-this.targetFn(t)*scale;if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)}
      ctx.strokeStyle='#61f0b4';ctx.lineWidth=3;ctx.stroke();
    }
    if(this.actual.length){ctx.beginPath();let started=false;for(const p of this.actual){const x=p.t*w,y=cy-p.cents*scale;if(!started){ctx.moveTo(x,y);started=true}else ctx.lineTo(x,y)}ctx.strokeStyle='#7ac8ff';ctx.lineWidth=3;ctx.stroke()}
    const px=progress*w;ctx.strokeStyle='rgba(255,255,255,.85)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(px,0);ctx.lineTo(px,h);ctx.stroke();ctx.fillStyle='rgba(122,200,255,.08)';ctx.fillRect(Math.max(0,px-28),0,56,h);
  }
}
