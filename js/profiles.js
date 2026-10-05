export const PROFILES = {
  regal: { id:'regal', name:'Regal Professional', pace:1.0, variation:1.0, depth:-0.5, certainty:0.85, emphasis:0.8, naturalness:1.0, description:'Balanced articulation, measured pacing and calm certainty.' },
  lelouch: { id:'lelouch', name:'Lelouch-inspired', pace:1.04, variation:1.28, depth:0, certainty:0.9, emphasis:1.15, naturalness:0.9, description:'Strategic pauses, strong clause contrast, intelligent energy and controlled intensity.' },
  gilgamesh: { id:'gilgamesh', name:'Gilgamesh-inspired', pace:0.88, variation:0.72, depth:-1.1, certainty:1.15, emphasis:0.85, naturalness:0.82, description:'Restrained pitch movement, slower pace, gravity and decisive conclusions.' },
  executive: { id:'executive', name:'Executive / Statesman', pace:1.02, variation:0.82, depth:-0.25, certainty:0.9, emphasis:0.72, naturalness:1.18, description:'Modern clarity, brevity, calm authority, polished pronunciation and realism.' }
};

export function profileWithRegality(base, regality=50){
  const r=(regality-50)/50;
  return {...base,
    variation:Math.max(.55,base.variation*(1+r*.22)),
    depth:base.depth-r*.35,
    certainty:base.certainty*(1+r*.18),
    emphasis:base.emphasis*(1+r*.2),
    theatricalRisk:Math.max(0,(regality-65)/35)
  };
}
