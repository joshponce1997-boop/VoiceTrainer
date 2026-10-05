const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
export class SpeechAnalyzer{
  constructor(){this.rec=null;this.final='';this.partial='';this.available=!!SR;this.onText=null;}
  start(){
    if(!this.available) return false;
    this.stop(); this.final=''; this.partial='';
    const r=this.rec=new SR(); r.continuous=true; r.interimResults=true; r.lang='en-US';
    r.onresult=e=>{let i='';for(let n=e.resultIndex;n<e.results.length;n++){const t=e.results[n][0].transcript;if(e.results[n].isFinal)this.final+=' '+t;else i+=t;}this.partial=i;if(this.onText)this.onText((this.final+' '+this.partial).trim());};
    r.onerror=()=>{}; try{r.start();return true}catch{return false}
  }
  stop(){if(this.rec){try{this.rec.stop()}catch{}this.rec=null}}
  text(){return (this.final+' '+this.partial).trim()}
}
export function wordSimilarity(expected,actual){
  const norm=s=>s.toLowerCase().replace(/[^a-z0-9' ]/g,' ').split(/\s+/).filter(Boolean);
  const a=norm(expected),b=norm(actual); if(!a.length||!b.length)return 0;
  const matches=a.filter(w=>b.includes(w)).length; return Math.min(1,matches/a.length);
}
export function fillerCount(text){return (text.toLowerCase().match(/\b(um+|uh+|like|you know|basically|i guess)\b/g)||[]).length}
