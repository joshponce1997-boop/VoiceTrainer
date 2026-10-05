import {AudioEngine} from './audio-engine.js';
import {hzToCents,PitchTracker} from './pitch-detector.js';
import {PROFILES,profileWithRegality} from './profiles.js';
import {SENTENCES,DRILLS,sentenceForDrill} from './exercises.js';
import {ScoringEngine} from './scoring-engine.js';
import {SpeechAnalyzer,wordSimilarity,fillerCount} from './speech-analysis.js';
import {GameRenderer} from './game-renderer.js';
import {loadState,saveState,recordResult} from './storage.js';

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let state=loadState(), audio=new AudioEngine(), speech=new SpeechAnalyzer(), game=null, currentMode='standard', installPrompt=null, lastSetup=null, dailyQueue=null, dailyPosition=0;
const renderer=new GameRenderer($('#gameCanvas'));

function show(id){$$('.screen').forEach(x=>x.classList.toggle('active',x.id===id));$$('.bottom-nav button').forEach(x=>x.classList.toggle('active',x.dataset.nav===id));window.scrollTo(0,0)}
function activeProfile(){return profileWithRegality(PROFILES[state.profile]||PROFILES.regal,state.regality)}
function calibration(){return state.calibration||{pitch:130,min:90,max:220,rms:.055}}
function fmtTime(s){return `${Math.floor(s/60)}:${String(Math.max(0,Math.ceil(s%60))).padStart(2,'0')}`}
function grade(n){return n>=95?'S':n>=90?'A':n>=82?'B':n>=74?'C':'D'}
function setFeedback(text){const p=$('#feedbackPill');p.textContent=text;p.style.borderColor=text==='GOOD'||text==='PERFECT'?'rgba(97,240,180,.65)':text==='LESS FORCE'?'rgba(255,123,123,.65)':'#3b4b60'}

function initUI(){
  $('#regalitySlider').value=state.regality;$('#regalityValue').textContent=state.regality;
  Object.values(PROFILES).forEach(p=>{
    const b=document.createElement('button');b.className='chip'+(state.profile===p.id?' active':'');b.textContent=p.name;
    b.onclick=()=>{state.profile=p.id;saveState(state);refreshHome()};$('#profileChips').appendChild(b);
    const o=document.createElement('option');o.value=p.id;o.textContent=p.name;$('#modeSelect').appendChild(o);
  });
  DRILLS.slice(0,6).forEach(d=>{const b=document.createElement('button');b.className='drill';b.textContent=d.name;b.onclick=()=>startDrill(d.id);$('#drillGrid').appendChild(b)});
  $('#modeSelect').value=state.profile;refreshHome();loadMics();
}
function refreshHome(){
  const p=PROFILES[state.profile];$('#profileTitle').textContent=p.name;
  $('#calibrationState').textContent=state.calibration?`Calibrated · ${Math.round(state.calibration.pitch)} Hz center`:'Not calibrated';
  $$('#profileChips .chip').forEach((x,i)=>x.classList.toggle('active',Object.values(PROFILES)[i].id===state.profile));
  $('#regalityWarning').classList.toggle('hidden',state.regality<70);
  const h=state.history,avg=k=>h.length?Math.round(h.slice(-12).reduce((a,r)=>a+(r.scores?.[k]??0),0)/Math.min(12,h.length)):'--';$('#homeNaturalness').textContent=avg('Naturalness');
  const stats=[['Best Score',h.length?Math.max(...h.map(x=>x.overall)):'--'],['Longest Combo',h.length?Math.max(...h.map(x=>x.longestCombo||0)):'--'],['Naturalness',avg('Naturalness')],['Articulation',avg('Articulation')]];
  $('#progressStats').innerHTML=stats.map(([a,b])=>`<div class="stat"><b>${b}</b><span>${a}</span></div>`).join('');drawProgress();recommendWeakest();
}
function drawProgress(){const c=$('#progressChart'),ctx=c.getContext('2d'),w=c.width,h=c.height;ctx.clearRect(0,0,w,h);ctx.fillStyle='#0a1119';ctx.fillRect(0,0,w,h);ctx.strokeStyle='#273244';for(let y=40;y<h;y+=50){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()}const data=state.history.slice(-24);if(data.length<2){ctx.fillStyle='#8e9aae';ctx.font='28px system-ui';ctx.fillText('Your score history will appear here.',32,h/2);return}ctx.beginPath();data.forEach((r,i)=>{const x=i/(data.length-1)*(w-60)+30,y=h-30-(r.overall/100)*(h-60);i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.strokeStyle='#61f0b4';ctx.lineWidth=5;ctx.stroke()}
function recommendWeakest(){const recent=state.history.slice(-10);if(!recent.length)return;const keys=Object.keys(recent[0].scores||{});let weak=keys[0],val=999;for(const k of keys){const a=recent.reduce((s,r)=>s+(r.scores[k]||0),0)/recent.length;if(a<val){val=a;weak=k}}$('#weakestSkill').textContent=`Current weakest skill: ${weak} (${Math.round(val)} avg). Daily Training will bias toward drills that target it.`}
async function loadMics(){if(!navigator.mediaDevices)return;const dev=await audio.enumerate();const sel=$('#micSelect');dev.forEach((d,i)=>{const o=document.createElement('option');o.value=d.deviceId;o.textContent=d.label||`Microphone ${i+1}`;sel.appendChild(o)});sel.value=state.settings.deviceId||''}

function targetContour(t,profile,shape='resolve'){
  const varC=150*profile.variation;let c=profile.depth*80;
  if(shape==='flatResolve') c+=Math.sin(t*Math.PI)*varC*.22-Math.max(0,(t-.68)/.32)*120*profile.certainty;
  else if(shape==='contrast') c+=Math.sin(t*Math.PI*2.2)*varC*.48+(t>.48&&t<.72?varC*.34:0)-Math.max(0,(t-.78)/.22)*110*profile.certainty;
  else if(shape==='emphasis') c+=Math.exp(-Math.pow((t-.45)/.1,2))*varC*.8-Math.max(0,(t-.75)/.25)*80;
  else if(shape==='natural') c+=Math.sin(t*Math.PI*1.6)*varC*.35-Math.max(0,(t-.8)/.2)*65;
  else if(shape==='buildResolve') c+=t*varC*.45+Math.exp(-Math.pow((t-.62)/.13,2))*varC*.5-Math.max(0,(t-.74)/.26)*150;
  else c+=Math.sin(t*Math.PI)*varC*.5+Math.exp(-Math.pow((t-.48)/.14,2))*varC*.35-Math.max(0,(t-.72)/.28)*120*profile.certainty;
  return c;
}
function relativeTarget(t,profile,shape){return targetContour(t,profile,shape)-targetContour(0,profile,shape)}
function setPitchGuide(depthMode=false){
  $('#pitchGuideTitle').textContent=depthMode?'DEPTH / COMFORTABLE PITCH':'PITCH / INFLECTION';
  $('#pitchGuideText').textContent=depthMode?'Match a slightly lower comfortable zone. Never force your voice down.':'Follow the SHAPE, not an exact musical note. Green = target; blue = your relative pitch contour.';
}

async function ensureCalibrated(){if(state.calibration)return true;show('calibrationScreen');return false}
async function doCalibration(){
  $('#beginCalibrationBtn').disabled=true;let vals=[],rmsVals=[],start=performance.now();
  try{await audio.start(state.settings.deviceId)}catch(e){alert('Microphone access failed. Use HTTPS (or localhost on desktop), allow microphone permission, then retry.');$('#beginCalibrationBtn').disabled=false;return}
  audio.onFrame=f=>{const elapsed=(performance.now()-start)/12000;$('#calibrationMeter').style.width=`${Math.min(100,elapsed*100)}%`;$('#calPitch').textContent=f.pitch>0?Math.round(f.pitch):'--';$('#calVolume').textContent=Math.round(f.rms*1000);if(f.pitch>0&&f.clarity>.28){vals.push(f.pitch);rmsVals.push(f.rms)}if(elapsed>=1)finishCalibration(vals,rmsVals)};
}
async function finishCalibration(vals,rmsVals){audio.onFrame=null;await audio.stop();if(vals.length<30){alert('Not enough clear voiced audio was detected. Try again in a quiet room and speak continuously.');$('#beginCalibrationBtn').disabled=false;return}vals.sort((a,b)=>a-b);const q=p=>vals[Math.min(vals.length-1,Math.floor(vals.length*p))];const avg=a=>a.reduce((x,y)=>x+y,0)/a.length;state.calibration={pitch:q(.5),min:q(.08),max:q(.92),rms:avg(rmsVals),at:Date.now()};saveState(state);$('#beginCalibrationBtn').disabled=false;$('#calibrationMeter').style.width='100%';refreshHome();alert(`Calibration saved. Comfortable pitch center: ${Math.round(state.calibration.pitch)} Hz.`)}

async function startExercise(opts={}){
  if(!await ensureCalibrated())return;
  const profileId=opts.profileId||$('#modeSelect').value||state.profile, profile=profileWithRegality(PROFILES[profileId],state.regality);
  const difficulty=opts.difficulty||$('#difficultySelect').value||'Medium';
  const diffMap={Easy:{corridor:350,strictness:.82},Medium:{corridor:250,strictness:1},Hard:{corridor:150,strictness:1.16},Expert:{corridor:90,strictness:1.3}};
  const corridorChoice=$('#corridorSelect').value;
  const duration=opts.duration||Number($('#lengthSelect').value||45);
  const corridor=opts.corridor||Number(corridorChoice||diffMap[difficulty].corridor);
  const strictness=opts.strictness||Number($('#strictnessSelect').value||diffMap[difficulty].strictness);
  const drillId=opts.drillId||null, depthMode=drillId==='depth';
  currentMode=drillId||profileId;lastSetup={profileId,duration,corridor,strictness,drillId,difficulty,dailyIndex:opts.dailyIndex||null,dailyTotal:opts.dailyTotal||null};
  const segmentLength=difficulty==='Expert'?6.5:7.5,count=Math.max(4,Math.ceil(duration/segmentLength)),sequence=[];
  for(let i=0;i<count;i++) sequence.push(drillId?sentenceForDrill(drillId,i):SENTENCES[(Math.floor(Math.random()*SENTENCES.length)+i)%SENTENCES.length]);
  const expectedText=sequence.map(x=>x.text.replace('|','')).join(' ');
  const localInfo=t=>{const z=Math.min(.999999,t)*count,idx=Math.min(count-1,Math.floor(z)),local=z-idx,pause=local>.84;return {idx,local:Math.min(1,local/.84),pause,sentence:sequence[idx]}};
  const globalTarget=t=>{const x=localInfo(t);return depthMode?targetContour(x.local,profile,x.sentence.shape):relativeTarget(x.local,profile,x.sentence.shape)};
  $('#currentSentence').textContent=sequence[0].text;const dailyTag=opts.dailyIndex?` · Daily ${opts.dailyIndex}/${opts.dailyTotal}`:'';
  $('#gameModeLabel').textContent=(drillId?`${DRILLS.find(x=>x.id===drillId)?.name||'Drill'} · ${PROFILES[profileId].name}`:`${PROFILES[profileId].name} · ${difficulty}`)+dailyTag;
  setPitchGuide(depthMode);$('#liveHz').textContent='-- Hz';show('gameScreen');
  const score=new ScoringEngine({baselineHz:calibration().pitch,corridor,strictness,theatricalRisk:profile.theatricalRisk});
  renderer.setTarget(globalTarget,corridor);renderer.sensitivity=(state.settings.sensitivity||100)/100;setFeedback('READY');
  const tracker=new PitchTracker({baselineHz:calibration().pitch,smoothing:.26});
  let start=0, transcriptStarted=speech.start(), raf, stopped=false,lastActual=0,lastSentence=-1,sentenceAnchorCents=null;
  try{await audio.start(state.settings.deviceId)}catch(e){show('homeScreen');alert('Microphone access failed. Android Chrome requires a secure HTTPS page.');return}
  start=performance.now();$('#micDot').classList.add('on');$('#micText').textContent='Mic active';
  audio.onFrame=f=>{
    if(stopped)return;
    const now=performance.now(),p=Math.min(1,(now-start)/(duration*1000)),phase=localInfo(p),target=globalTarget(p);
    if(phase.idx!==lastSentence){lastSentence=phase.idx;sentenceAnchorCents=null;tracker.reset();$('#currentSentence').textContent=phase.sentence.text}
    if(phase.pause)$('#currentSentence').textContent='PAUSE';
    const tracked=tracker.update(f.pitch,f.clarity),voiced=tracked.pitch>0;
    let observedCents=null;
    if(voiced){
      const absoluteCents=hzToCents(tracked.pitch,calibration().pitch);
      if(depthMode) observedCents=absoluteCents;
      else {if(sentenceAnchorCents==null) sentenceAnchorCents=absoluteCents;observedCents=absoluteCents-sentenceAnchorCents;}
      $('#liveHz').textContent=`${Math.round(tracked.pitch)} Hz`;
      if(now-lastActual>40){renderer.addActual(p,observedCents);lastActual=now}
    }
    const live=score.add({pitch:tracked.pitch,targetCents:target,observedCents,rms:f.rms,voiced,phase});
    $('#comboValue').textContent='x'+live.combo;$('#pitchLive').textContent=Math.round(live.pitchScore||0);$('#timingLive').textContent=Math.round(live.timingScore||0);$('#naturalLive').textContent=Math.round(Math.min(100,70+(live.pitchScore||0)*.28-(f.rms>.23?18:0)));$('#totalLive').textContent=live.total;setFeedback(live.feedback);
  };
  function frame(){if(stopped)return;const p=Math.min(1,(performance.now()-start)/(duration*1000));renderer.draw(p);$('#gameTimer').textContent=fmtTime(duration*(1-p));if(p>=1)stop();else raf=requestAnimationFrame(frame)}
  async function stop(){if(stopped)return;stopped=true;cancelAnimationFrame(raf);audio.onFrame=null;await audio.stop();speech.stop();$('#micDot').classList.remove('on');$('#micText').textContent='Mic idle';const txt=speech.text(),sim=transcriptStarted&&txt?wordSimilarity(expectedText,txt):null,fill=txt?fillerCount(txt):0;const result=score.finalize({transcriptSimilarity:sim,fillers:fill,baselineRange:[calibration().min,calibration().max]});recordResult(state,result,currentMode);showResult(result,txt)}
  game={stop};frame();
}

function showResult(result,transcript=''){
  $('#againBtn').textContent=(dailyQueue&&lastSetup?.dailyIndex)?`Continue Daily (${Math.min(dailyQueue.length,dailyPosition+2)}/${dailyQueue.length})`:'Train Again';
  $('#overallScore').textContent=result.overall;$('#overallGrade').textContent=grade(result.overall);$('#scoreRows').innerHTML=Object.entries(result.scores).map(([k,v])=>`<div class="score-row"><span>${k}</span><b>${v}</b></div>`).join('');
  let fb=[];if(result.scores.Naturalness<75)fb.push('Your delivery is becoming less natural. Reduce emphasis and return closer to your normal conversational voice.');if(!result.comfortable)fb.push('Do not force the pitch lower. Return to a comfortable voice.');if(result.scores.Inflection<78)fb.push('Your contour missed the target shape frequently. Focus on the direction of the rises and falls rather than chasing an exact note.');if(result.scores.Articulation>=90)fb.push('Articulation was a strength in this round.');if(result.fillers)fb.push(`Detected ${result.fillers} filler word${result.fillers===1?'':'s'} in the browser transcript.`);if(result.transcriptSimilarity==null)fb.push('Pronunciation and articulation are estimated because browser speech recognition was unavailable for this round.');$('#resultFeedback').textContent=fb.join(' ')||'Strong balanced round. Increase difficulty when this becomes comfortable.';show('resultScreen');refreshHome();
}

async function startDrill(id){if(!state.calibration){show('calibrationScreen');return}startExercise({drillId:id,profileId:state.profile,duration:30,corridor:250,strictness:1})}
function weakestDrill(){const recent=state.history.slice(-8);let drill='naturalness';if(recent.length){const keys=['Naturalness','Articulation','Pitch Control','Inflection','Cadence','Vocal Certainty'];let wk=keys[0],v=999;for(const k of keys){const a=recent.reduce((s,r)=>s+(r.scores[k]||0),0)/recent.length;if(a<v){v=a;wk=k}}drill=({'Naturalness':'naturalness','Articulation':'pronunciation','Pitch Control':'pitch','Inflection':'ending','Cadence':'cadence','Vocal Certainty':'certainty'})[wk]}return drill}
function dailyTraining(){if(!state.calibration){show('calibrationScreen');return}const weak=weakestDrill();dailyQueue=[weak,'naturalness','ending','emphasis','cadence','pronunciation','certainty','inflection','depth','composure'];dailyPosition=0;startDailyRound()}
function startDailyRound(){if(!dailyQueue||dailyPosition>=dailyQueue.length){dailyQueue=null;dailyPosition=0;show('homeScreen');alert('Daily Training complete. Your progress history has been updated.');return}const drill=dailyQueue[dailyPosition];startExercise({drillId:drill,profileId:state.profile,duration:60,corridor:250,strictness:1,dailyIndex:dailyPosition+1,dailyTotal:dailyQueue.length})}

let mimicSentence=SENTENCES[0],mimicActual=[];
function chooseMimic(){mimicSentence=SENTENCES[Math.floor(Math.random()*SENTENCES.length)];$('#mimicSentence').textContent=mimicSentence.text;drawMimic([],false);$('#mimicResult').classList.add('hidden')}
function playReference(){if(!('speechSynthesis'in window))return alert('Speech synthesis is unavailable in this browser.');speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(mimicSentence.text),p=activeProfile();u.rate=Math.max(.72,Math.min(1.15,p.pace*.9));u.pitch=Math.max(.75,1+p.depth*.08);u.volume=.95;speechSynthesis.speak(u)}
async function startMimic(){
  if(!await ensureCalibrated())return;
  const btn=$('#startMimicBtn');btn.disabled=true;
  speechSynthesis?.cancel?.();
  const profile=activeProfile(),dur=Math.max(4000,mimicSentence.text.split(' ').length*520),score=new ScoringEngine({baselineHz:calibration().pitch,corridor:250,strictness:1,theatricalRisk:profile.theatricalRisk}),tracker=new PitchTracker({baselineHz:calibration().pitch,smoothing:.24});
  try{await audio.start(state.settings.deviceId)}catch{btn.disabled=false;btn.textContent='3 · 2 · 1 · Repeat';return alert('Microphone access failed.')}
  if(state.settings.countdown){for(const n of [3,2,1]){btn.textContent=n;await new Promise(r=>setTimeout(r,650))}}
  btn.textContent='Speak now…';mimicActual=[];drawMimic([],true);speech.start();
  const armedAt=performance.now();let voiceStart=null,anchorCents=null,noVoice=false;
  audio.onFrame=f=>{
    const now=performance.now(),tracked=tracker.update(f.pitch,f.clarity),voiced=tracked.pitch>0;
    if(voiced&&voiceStart==null){voiceStart=now;anchorCents=hzToCents(tracked.pitch,calibration().pitch)}
    if(voiceStart==null)return;
    const p=Math.min(1,(now-voiceStart)/dur),target=relativeTarget(p,profile,mimicSentence.shape);
    let observedCents=null;
    if(voiced){observedCents=hzToCents(tracked.pitch,calibration().pitch)-anchorCents;mimicActual.push({t:p,cents:observedCents});}
    score.add({pitch:tracked.pitch,targetCents:target,observedCents,rms:f.rms,voiced,phase:{pause:false}});drawMimic(mimicActual,true);
  };
  await new Promise(resolve=>{const timer=setInterval(()=>{const now=performance.now();if(voiceStart&&now-voiceStart>=dur){clearInterval(timer);resolve()}else if(!voiceStart&&now-armedAt>4000){noVoice=true;clearInterval(timer);resolve()}},50)});
  audio.onFrame=null;await audio.stop();speech.stop();
  if(noVoice){btn.disabled=false;btn.textContent='3 · 2 · 1 · Repeat';return alert('No clear voice was detected. Try again and begin speaking after the countdown.')}
  const txt=speech.text(),sim=txt?wordSimilarity(mimicSentence.text,txt):null,res=score.finalize({transcriptSimilarity:sim,fillers:fillerCount(txt),baselineRange:[calibration().min,calibration().max]});
  const match=Math.round(res.scores['Pitch Control']*.45+res.scores.Timing*.15+res.scores.Inflection*.2+res.scores.Pronunciation*.2);
  $('#mimicResult').innerHTML=`<div class="grade"><span>${match}%</span><small>MATCH</small></div><div class="score-rows"><div class="score-row"><span>Pitch contour</span><b>${res.scores['Pitch Control']}%</b></div><div class="score-row"><span>Timing</span><b>${res.scores.Timing}%</b></div><div class="score-row"><span>Inflection</span><b>${res.scores.Inflection}%</b></div><div class="score-row"><span>Pronunciation${sim==null?' (estimated)':''}</span><b>${res.scores.Pronunciation}%</b></div><div class="score-row"><span>Emphasis</span><b>${res.scores.Emphasis}%</b></div></div>`;
  $('#mimicResult').classList.remove('hidden');btn.disabled=false;btn.textContent='3 · 2 · 1 · Repeat';recordResult(state,res,'mimic');refreshHome();
}
function drawMimic(actual=[],showActual=true){
  const c=$('#mimicCanvas'),ctx=c.getContext('2d'),w=c.width,h=c.height,p=activeProfile(),cy=h/2,scale=h/1100;
  ctx.clearRect(0,0,w,h);ctx.fillStyle='#080d13';ctx.fillRect(0,0,w,h);
  ctx.beginPath();for(let x=0;x<=w;x+=5){const t=x/w,y=cy-relativeTarget(t,p,mimicSentence.shape)*scale;x?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.strokeStyle='#61f0b4';ctx.lineWidth=6;ctx.stroke();
  if(showActual&&actual.length){ctx.beginPath();actual.forEach((a,i)=>{const x=a.t*w,y=cy-a.cents*scale;i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.strokeStyle='#7ac8ff';ctx.lineWidth=5;ctx.stroke()}
  ctx.fillStyle='#9eb0c5';ctx.font='28px system-ui';ctx.fillText('TARGET SHAPE',24,36);if(showActual)ctx.fillText('YOUR RELATIVE CONTOUR',24,h-20);
}

$('#regalitySlider').oninput=e=>{$('#regalityValue').textContent=e.target.value;state.regality=Number(e.target.value);saveState(state);refreshHome()};
$('#quickBtn').onclick=()=>show('setupScreen');$('#dailyBtn').onclick=dailyTraining;$('#mimicBtn').onclick=()=>{chooseMimic();show('mimicScreen')};$('#calibrateBtn').onclick=()=>show('calibrationScreen');$('#beginCalibrationBtn').onclick=doCalibration;$('#startExerciseBtn').onclick=()=>startExercise();$('#playReferenceBtn').onclick=playReference;$('#newMimicBtn').onclick=chooseMimic;$('#startMimicBtn').onclick=startMimic;$('#exitGameBtn').onclick=()=>game?.stop();$('#againBtn').onclick=()=>{if(dailyQueue&&lastSetup?.dailyIndex){dailyPosition++;startDailyRound()}else lastSetup?startExercise(lastSetup):show('setupScreen')};$('#homeBtn').onclick=()=>show('homeScreen');$('#profilesBtn').onclick=()=>document.querySelector('#profileChips').scrollIntoView({behavior:'smooth'});$('#allDrillsBtn').onclick=()=>{const g=$('#drillGrid');g.innerHTML='';DRILLS.forEach(d=>{const b=document.createElement('button');b.className='drill';b.textContent=d.name;b.onclick=()=>startDrill(d.id);g.appendChild(b)})};$('#resetProgressBtn').onclick=()=>{if(confirm('Delete score history? Calibration and settings will remain.')){state.history=[];saveState(state);refreshHome()}};
$$('[data-nav]').forEach(b=>b.onclick=()=>show(b.dataset.nav));$$('[data-back]').forEach(b=>b.onclick=()=>show('homeScreen'));$('#micSelect').onchange=e=>{state.settings.deviceId=e.target.value;saveState(state)};$('#sfxToggle').checked=state.settings.sfx;$('#countdownToggle').checked=state.settings.countdown;$('#visualSensitivity').value=state.settings.sensitivity||100;$('#sfxToggle').onchange=e=>{state.settings.sfx=e.target.checked;saveState(state)};$('#countdownToggle').onchange=e=>{state.settings.countdown=e.target.checked;saveState(state)};$('#visualSensitivity').oninput=e=>{state.settings.sensitivity=Number(e.target.value);saveState(state)};
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('#installBtn').classList.remove('hidden')});$('#installBtn').onclick=async()=>{if(installPrompt){installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;$('#installBtn').classList.add('hidden')}};
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(()=>{}));
initUI();chooseMimic();
