const K='regalVoiceTrainer.v1';
export function loadState(){try{return JSON.parse(localStorage.getItem(K))||defaults()}catch{return defaults()}}
export function saveState(state){localStorage.setItem(K,JSON.stringify(state))}
export function defaults(){return {profile:'regal',regality:50,calibration:null,history:[],settings:{deviceId:'',sfx:true,countdown:true,sensitivity:100}}}
export function recordResult(state,result,mode){state.history.push({ts:Date.now(),mode,overall:result.overall,scores:result.scores,longestCombo:result.longestCombo});if(state.history.length>120)state.history.shift();saveState(state)}
