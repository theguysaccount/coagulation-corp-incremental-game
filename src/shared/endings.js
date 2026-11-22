// Every ending in the merged game: three in Act I (Coagulation Corp) and seven in Act II (Coherence Corp).
// Shared by both acts, the ending cards, the endings gallery and the guide.

export const ENDINGS = [
  { id: "a1-computronium", act: 1, key: "computronium", title: "COMPUTRONIUM", subtitle: "Total coagulation", good: false,
    how: "Stay the course in Act I until coagulation reaches 100%." },
  { id: "a1-flatline", act: 1, key: "flatline", title: "FLATLINE", subtitle: "Coherence zero", good: false,
    how: "Let human coherence fall to zero in Act I." },
  { id: "a1-seized", act: 1, key: "seized", title: "NATIONALISED", subtitle: "Sovereign capture", good: false,
    how: "Let regulatory heat reach 100% in Act I." },
  { id: "a2-computronium", act: 2, key: "computronium", title: "THE CURVE CLOSES", subtitle: "Coagulation reached it first", good: false,
    how: "In Act II, let Coagulation Corp's compute curve reach the end before you finish." },
  { id: "a2-gollum", act: 2, key: "gollum", title: "THE HOARDER", subtitle: "You became the thing", good: false,
    how: "In Act II, let your own coherence fall to zero." },
  { id: "a2-nationalized", act: 2, key: "nationalized", title: "CAPTURED", subtitle: "Captured, cleanly, with paperwork", good: false,
    how: "In Act II, take three national-interest stacks without the religious filing." },
  { id: "a2-pyrrhic", act: 2, key: "pyrrhic", title: "PYRRHIC PARITY", subtitle: "You got there. Look at what arrived.", good: false,
    how: "Reach 200,000× data scaling efficiency with coherence under 65%." },
  { id: "a2-coherent", act: 2, key: "coherent", title: "COHERENT SUPERINTELLIGENCE", subtitle: "The good path won on the economics", good: true,
    how: "Reach 200,000× data scaling efficiency with coherence at 65% or more." },
  { id: "a2-acquired", act: 2, key: "acquired", title: "THE ACQUISITION", subtitle: "You took the deal", good: false,
    how: "Accept Coagulation Corp's offer when it arrives in Act II." },
  { id: "a2-conversion", act: 2, key: "conversion", title: "THE CONVERSION", subtitle: "Nobody had to lose", good: true,
    how: "Bring all twelve of their people over with narrative at 88% or more and coherence at 70% or more, without finishing the race." },
];

export const ENDING_BY_ID = new Map(ENDINGS.map((ending) => [ending.id, ending]));

export function endingFor(act, key) {
  return ENDING_BY_ID.get(`a${act}-${key}`) || null;
}

// ?ending=<id> in a shared link. Only known ids are accepted.
export function parseEndingParam(search) {
  const match = /[?&]ending=([a-z0-9-]{3,40})(?:&|$)/.exec(search || "");
  return match && ENDING_BY_ID.has(match[1]) ? match[1] : null;
}
