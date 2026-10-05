export class ScoringEngine{
  constructor({baselineHz=130,corridor=250,strictness=1,theatricalRisk=0}){
    this.baselineHz=baselineHz;
    this.corridor=corridor/strictness;
    this.strictness=strictness;
    this.theatricalRisk=theatricalRisk;
    this.samples=[];this.combo=0;this.longestCombo=0;this.score=0;this.lastFeedback='READY';
  }
  add({pitch,targetCents,observedCents=null,rms,voiced,phase}){
    let pitchScore=0,timingScore=100;
    if(voiced&&pitch>0){
      if(phase?.pause){
        timingScore=45;this.lastFeedback='PAUSE';this.combo=Math.max(0,this.combo-1);
        this.samples.push({pitch,targetCents,observedCents,rms,voiced,pitchScore:75,timingScore,volumeScore:90,phase});
        return {pitchScore:75,timingScore,combo:this.combo,total:this.score,feedback:this.lastFeedback};
      }
      const absoluteCents=1200*Math.log2(pitch/this.baselineHz);
      const measured=observedCents==null?absoluteCents:observedCents;
      const diff=Math.abs(measured-targetCents);
      pitchScore=Math.max(0,100-(diff/this.corridor)*55);
      if(diff<this.corridor*.55){this.combo++;this.score+=Math.round(10*(1+Math.min(15,this.combo)/5));}
      else if(diff>this.corridor*1.45){this.combo=0;}
      this.longestCombo=Math.max(this.longestCombo,this.combo);
      if(absoluteCents<-500) this.lastFeedback='LESS FORCE';
      else if(diff<this.corridor*.38) this.lastFeedback='GOOD';
      else this.lastFeedback=measured>targetCents?'LOWER':'RAISE SLIGHTLY';
    }else{
      timingScore=phase?.pause?100:55;
      if(!phase?.pause)this.lastFeedback='SPEAK';
    }
    const volumeScore=rms<.018?65:rms>.22?68:100;
    if(rms>.23)this.lastFeedback='LESS FORCE';
    this.samples.push({pitch,targetCents,observedCents,rms,voiced,pitchScore,timingScore,volumeScore,phase});
    return {pitchScore,timingScore,combo:this.combo,total:this.score,feedback:this.lastFeedback};
  }
  finalize({transcriptSimilarity=null,fillers=0,baselineRange=[90,220]}={}){
    const voiced=this.samples.filter(s=>s.voiced&&s.pitch>0);
    const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0;
    const pitches=voiced.map(s=>s.pitchScore), rms=voiced.map(s=>s.rms);
    const pitchControl=Math.round(avg(pitches));
    const pitchHz=voiced.map(s=>s.pitch), meanPitch=avg(pitchHz)||this.baselineHz;
    const variance=avg(pitchHz.map(x=>(x-meanPitch)**2));
    const stability=Math.max(0,Math.round(100-Math.sqrt(variance)/(this.baselineHz*.32)*100));
    const timing=Math.round(avg(this.samples.map(s=>s.timingScore));
    const comfortable=meanPitch>=baselineRange[0]*.82 && meanPitch<=baselineRange[1]*1.08;
    const depth=Math.round(Math.max(45,100-Math.abs(Math.log2(meanPitch/this.baselineHz)*120)));
    const articulation=transcriptSimilarity==null?Math.round(78+Math.min(18,pitchControl*.12)):Math.round(55+45*transcriptSimilarity);
    const pronunciation=transcriptSimilarity==null?articulation-2:Math.round(50+50*transcriptSimilarity);
    const cadence=Math.round((timing*.65)+(stability*.35));
    const emphasis=Math.round(Math.min(100,70+avg(rms)*120));
    const inflection=Math.round(pitchControl*.92+stability*.08);
    const certainty=Math.round(Math.min(100,inflection*.52+stability*.48));
    const composure=Math.round(Math.min(100,stability*.55+timing*.25+(comfortable?20:5)));
    const precision=Math.max(40,Math.round(90-fillers*8+(transcriptSimilarity??.7)*8));
    const theatricalPenalty=Math.max(0,this.theatricalRisk*18 + (comfortable?0:12));
    const naturalness=Math.max(35,Math.round(composure*.55+cadence*.25+precision*.2-theatricalPenalty));
    const regality=Math.round(Math.min(100,certainty*.33+articulation*.25+inflection*.22+depth*.2));
    const scores={Naturalness:naturalness,Articulation:articulation,Pronunciation:pronunciation,'Pitch Control':pitchControl,'Vocal Depth':depth,'Pitch Stability':stability,Inflection:inflection,Cadence:cadence,Timing:timing,Emphasis:emphasis,Composure:composure,'Vocal Certainty':certainty,Precision:precision,Regality:regality};
    const overall=Math.round(Object.values(scores).reduce((a,b)=>a+b,0)/Object.keys(scores).length);
    return {scores,overall,longestCombo:this.longestCombo,meanPitch,comfortable,fillers,transcriptSimilarity};
  }
}
