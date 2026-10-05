export const SENTENCES = [
  {text:'There is only one reasonable conclusion.', emphasis:['one','reasonable'], shape:'resolve'},
  {text:'That will not be necessary.', emphasis:['not'], shape:'flatResolve'},
  {text:'I understand the concern, but the evidence points elsewhere.', emphasis:['evidence','elsewhere'], shape:'contrast'},
  {text:'The distinction is simple: we need a reliable answer, not a convenient one.', emphasis:['reliable','not'], shape:'contrast'},
  {text:'I recommend another approach.', emphasis:['recommend'], shape:'resolve'},
  {text:'The premise is reasonable, nevertheless the conclusion does not follow.', emphasis:['nevertheless','not'], shape:'contrast'},
  {text:'We already considered that possibility.', emphasis:['already'], shape:'emphasis'},
  {text:'This result is sufficient for the decision in front of us.', emphasis:['sufficient','decision'], shape:'resolve'},
  {text:'The preferable option is the one we can explain and defend.', emphasis:['preferable','explain','defend'], shape:'buildResolve'},
  {text:'I can be precise without becoming rigid.', emphasis:['precise','without'], shape:'natural'},
  {text:'Let me state the important point clearly.', emphasis:['important','clearly'], shape:'buildResolve'},
  {text:'We can move quickly without sacrificing judgment.', emphasis:['quickly','without','judgment'], shape:'contrast'},
  {text:'I disagree with that conclusion, and here is why.', emphasis:['disagree','why'], shape:'contrast'},
  {text:'The answer is not complicated; it simply requires discipline.', emphasis:['not','discipline'], shape:'resolve'},
  {text:'My goal is to make the reasoning easy to follow.', emphasis:['reasoning','easy'], shape:'natural'},
  {text:'I am confident in the recommendation because the evidence supports it.', emphasis:['confident','evidence','supports'], shape:'buildResolve'}
];

export const DRILLS = [
  {id:'pronunciation',name:'Pronunciation',focus:'articulation'},
  {id:'fillers',name:'Filler Elimination',focus:'precision'},
  {id:'certainty',name:'Command / Certainty',focus:'certainty'},
  {id:'vocabulary',name:'Vocabulary',focus:'precision'},
  {id:'ending',name:'Sentence Endings',focus:'inflection'},
  {id:'pitch',name:'Pitch Control',focus:'pitch'},
  {id:'depth',name:'Depth',focus:'depth'},
  {id:'inflection',name:'Inflection',focus:'inflection'},
  {id:'emphasis',name:'Emphasis',focus:'emphasis'},
  {id:'cadence',name:'Pause / Cadence',focus:'cadence'},
  {id:'composure',name:'Composure',focus:'composure'},
  {id:'naturalness',name:'Naturalness',focus:'naturalness'}
];

export const SCENARIOS = [
  'Your manager says: “I’m not convinced this project is worth the cost.” Respond in two or three concise sentences.',
  'Introduce yourself to a new technical team in a calm, concise way.',
  'Explain a technical idea to someone who is intelligent but unfamiliar with the topic.',
  'Disagree with a proposal while sounding composed and definite.',
  'Make a reasonable request without sounding apologetic or demanding.',
  'Answer an unexpected interview question while keeping your pace controlled.'
];

export function sentenceForDrill(drillId, index=0){
  if(drillId==='certainty') return {text:'I recommend another approach.',emphasis:['recommend'],shape:'resolve'};
  if(drillId==='ending') return {text:'The evidence supports this conclusion.',emphasis:['supports','conclusion'],shape:'resolve'};
  if(drillId==='emphasis') return {text:'We already considered that possibility.',emphasis:['already'],shape:'emphasis'};
  if(drillId==='cadence') return {text:'I understand your concern | but the evidence points elsewhere.',emphasis:['evidence'],shape:'contrast'};
  if(drillId==='naturalness') return {text:'I had a busy day, but overall it went pretty well.',emphasis:['overall'],shape:'natural'};
  if(drillId==='depth') return {text:'I can speak with relaxed weight without forcing my voice lower.',emphasis:['relaxed','without'],shape:'flatResolve'};
  if(drillId==='pitch') return {text:'I can raise the thought, then settle it with control.',emphasis:['raise','settle'],shape:'buildResolve'};
  if(drillId==='inflection') return {text:'The idea develops, reaches its point, and then resolves.',emphasis:['point','resolves'],shape:'buildResolve'};
  if(drillId==='composure') return {text:'Even under pressure, I can answer at a deliberate pace.',emphasis:['pressure','deliberate'],shape:'natural'};
  if(drillId==='fillers') return {text:'I can pause, choose the next phrase, and continue clearly.',emphasis:['pause','clearly'],shape:'natural'};
  if(drillId==='vocabulary') return {text:'The distinction is evident, and the alternative is preferable.',emphasis:['evident','preferable'],shape:'contrast'};
  if(drillId==='pronunciation') return {text:'The deliberate distinction is both precise and practically useful.',emphasis:['deliberate','precise','useful'],shape:'natural'};
  return SENTENCES[index%SENTENCES.length];
}
