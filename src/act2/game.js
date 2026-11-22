/* COHERENCE CORP vs COAGULATION CORP · ACT II of Coagulation Corp.
   Satire and a work of fiction: every company, person and event in it is invented.
   Act I (../) hands over through The Defection; a run can also start here directly. */
import { endingFor } from "../shared/endings.js";
import { KEYS, recordEnding, store } from "../shared/storage.js";
import { mountChallengeBanner, mountEndingShare, mountSoundToggle, sfx, track } from "../shared/ui.js";
import { BUILDINGS, COMP_GOAL, COMP_START, DARK, DSE_GOAL, PEOPLE, RESEARCH, STRUCTURE, TICK } from "./data.js";

/* ---------- state ---------- */
function fresh(wisdom, run){
  return {
    run: run||1, wisdom: wisdom||0,
    t:0, paused:false, ended:null,
    cv:0, cap:0, ins:0, coh:100, nar:8,
    clicks:0, raises:0, totalCv:0,
    b:{believer:0,venture:0,researcher:0,orchestrator:0,node:0},
    rs:{}, st:{}, dk:{},
    ppl: PEOPLE.map(p=>({id:p.id, doubt:0, thr:p.thr, flipped:false, unlocked:false, cm:1, memos:0, lost:false})),
    snipes:0, memoBase:0,
    pubs:0,
    comp: COMP_START * Math.pow(2.6, (run||1)-1),
    coagRate: 0.0115 * Math.pow(1.055, (run||1)-1),
    coagCapital: 1,
    fx:[], offered:false,   // {id,name,until,kind}
    captureStacks:0,
    trustUsed:false,
    log:[], nextEvent: 42,
    tab:'build',
  };
}
let S = fresh(0,1);
S.ppl[0].unlocked=true; S.ppl[1].unlocked=true; S.ppl[2].unlocked=true;

/* ---------- helpers ---------- */
const clamp=(x,a,b)=>x<a?a:x>b?b:x;
function fmt(n){
  if(n===Infinity) return '∞';
  if(n<0) return '-'+fmt(-n);
  if(n<1000) return n<10?(Math.round(n*10)/10).toString():Math.floor(n).toString();
  const u=['K','M','B','T','Qa','Qi','Sx','Sp','Oc','No','Dc'];
  let i=-1,x=n;
  while(x>=1000 && i<u.length-1){x/=1000;i++;}
  return (x<10?x.toFixed(2):x<100?x.toFixed(1):Math.floor(x))+u[i];
}
function fmtInt(n){ return Math.floor(n).toLocaleString('en-US'); }
function money(n){ return '$'+fmt(n); }
function time(s){ const m=Math.floor(s/60), q=Math.floor(s%60); return `${String(m).padStart(2,'0')}:${String(q).padStart(2,'0')}`; }
function log(msg, hi){ S.log.push({t:S.t, m:msg, hi:!!hi}); if(S.log.length>90) S.log.shift(); }
function hasFx(id){ return S.fx.some(f=>f.id===id); }
function addFx(id,name,dur,kind){ S.fx=S.fx.filter(f=>f.id!==id); S.fx.push({id,name,until:S.t+dur,kind}); }
function P(id){ return PEOPLE.find(p=>p.id===id); }
function ps(id){ return S.ppl.find(p=>p.id===id); }
function cost(bd){ return bd.base*Math.pow(bd.growth, S.b[bd.id]); }

/* ---------- derived rates ---------- */
const MILE = 12;                                       // every 8 of a building doubles its output
function mile(id){ return Math.pow(2, Math.floor(S.b[id]/MILE)); }
function toMile(id){ return MILE - (S.b[id]%MILE); }
function rates(){
  const b=S.b;
  const orch = Math.pow(1.06, b.orchestrator);
  const custody = S.st.custody?1.5:1;
  const cohFactor = Math.pow(Math.max(S.coh,1)/100, 0.8);   // incoherent orgs learn slower
  const nodeIns = 1 + b.node*0.20;
  const flipped = S.ppl.filter(p=>p.flipped);

  let cvMult = (S.dk.harvest?2.4:1) * (S.st.curve?1.35:1) * custody * mile('believer');
  let cv = (b.believer*0.40 + b.venture*0.09*mile('venture'))*cvMult*(1+b.node*0.05)
         + flipped.reduce((a,p)=>a+(P(p.id).cv_s||0),0);
  if(hasFx('velvet')) cv*=0.8;

  let capMult = (S.dk.engage?2.0:1) * (S.dk.rollup?1.15:1) * (S.st.regcf?1.3:1) * Math.pow(1.05,S.snipes) * orch * custody * mile('venture');
  let cap = b.venture*2.2*capMult
          + (S.st.regcf? 14*(0.5+S.nar/70) : 0)
          + flipped.reduce((a,p)=>a+(P(p.id).cap_s||0),0);

  const metaLearn = Math.pow(1.13, S.snipes);          // people who defected teach the whole house how to learn
  let insMult = orch*nodeIns*cohFactor*custody*metaLearn*(S.st.council?1.18:1)*(S.rs.r5?1.25:1);
  let ins = b.researcher*0.6*insMult*mile('researcher') + flipped.reduce((a,p)=>a+(P(p.id).ins||0),0)*insMult*0.35;

  const darkOwned = DARK.filter(d=>S.dk[d.id]);
  const regenMult = Math.pow(0.62, darkOwned.length);   // every expedient shortcut blunts the repair mechanism
  const nodeCoh = Math.min(b.node,40)*0.024 + Math.max(0,b.node-40)*0.005;
  const scale = 1 + b.venture/110 + b.researcher/150;     // the bigger the machine, the faster it drifts
  let coh = (nodeCoh + (S.st.council?0.55:0) + (S.rs.r3?0.35:0)) * regenMult
          - darkOwned.reduce((a,d)=>a+d.drift,0) * scale;

  let nar = -0.10 + flipped.reduce((a,p)=>a+(P(p.id).nar_s||0),0) + b.node*0.006;
  if(hasFx('velvet')) nar-=0.5;

  const captureMult = Math.pow(0.72, S.captureStacks);
  return { cv:cv*captureMult, cap:cap*captureMult, ins:ins*captureMult, coh, nar, orch };
}
function dse(){
  let m = 1 + S.wisdom*0.05;
  RESEARCH.forEach(r=>{ if(S.rs[r.id]) m*=r.mult; });
  S.ppl.forEach(p=>{ if(p.flipped) m*=P(p.id).dse; });
  return m;
}
function coagDrag(){
  let d = S.ppl.filter(p=>p.flipped).reduce((a,p)=>a+P(p.id).drag,0);
  if(S.nar>=50) d+=0.08;
  if(S.nar>=80) d+=0.10;
  return clamp(d,0,0.88);
}
function coagRateNow(){
  let r = S.coagRate*(1-coagDrag());
  if(hasFx('megadeal')) r*=1.22;
  if(hasFx('keynote')) r*=1.12;
  if(hasFx('whistle')) r*=0.55;
  if(hasFx('escalate')) r*=1.18;
  return Math.max(r, 0.0004);
}
function raiseRate(){ return 2.6*(1+S.nar/38)*(S.st.curve?2.4:1)*(1+S.wisdom*0.02); }
function publishCost(){ return 50*Math.pow(1.345,S.pubs); }
function memoCost(p){ return 140*Math.pow(1.6,p.memos)*(P(p.id).thr/32); }
function snipeCost(p){ const d=P(p.id); const k=(S.dk.recruit?0.55:1)*p.cm; return {cv:d.cv*k, cap:d.cap*k}; }
function snipeOdds(p){ return clamp(Math.pow(clamp(p.doubt/p.thr,0,1), 1.7), 0, 1); }

/* ---------- actions ---------- */
function doClick(){
  if(S.ended||S.paused) return;
  const g = (1+S.b.believer*0.045)*(S.dk.harvest?2:1)*(1+S.wisdom*0.05);
  S.cv+=g; S.totalCv+=g; S.clicks++;
  if(S.clicks===1) log('You said it out loud. Someone wrote it down.',1);
  if(S.clicks===40) log('The meme is compressing. People are repeating your framing back to you.');
}
function doRaise(){
  if(S.cv<10) return;
  const got=S.cv*raiseRate(); S.cap+=got; S.raises++;
  log(`Raised ${money(got)} on the curve. Early backers priced below late ones — as it should be.`);
  S.cv=0;
}
function doPublish(){
  const c=publishCost(); if(S.cv<c) return;
  S.cv-=c; S.pubs++;
  const gain = 10*Math.pow(0.97,S.pubs);
  S.nar=clamp(S.nar+gain,0,100);
  if(S.pubs===1) log('You published the thesis. Three people inside Coagulation read it twice.',1);
  else log(`Published. Narrative ${S.nar.toFixed(0)}%. Doubt drift inside Coagulation rises.`);
  S.ppl.forEach(p=>{ if(!p.flipped) p.doubt=clamp(p.doubt+1.5,0,100); });
}
function buy(bd){
  const c=cost(bd);
  if(bd.cur==='cv'){ if(S.cv<c) return; S.cv-=c; } else { if(S.cap<c) return; S.cap-=c; }
  const before=Math.floor(S.b[bd.id]/MILE);
  S.b[bd.id]++;
  if(bd.id!=='orchestrator'&&bd.id!=='node'&&Math.floor(S.b[bd.id]/MILE)>before)
    log(`▲ MILESTONE · ${S.b[bd.id]} ${bd.name} — output doubled to ×${fmt(Math.pow(2,Math.floor(S.b[bd.id]/MILE)))}.`,1);
  if(S.b[bd.id]===1){
    if(bd.id==='node') log('First Collective Intelligence Node online. The org can now hold a thought bigger than one head.',1);
    if(bd.id==='orchestrator') log('Multi-agent orchestration live. You are now an industrial software company.',1);
  }
}
function buyResearch(r){
  if(S.rs[r.id]||S.ins<r.cost) return; if(r.req&&!r.req(S)) return;
  S.ins-=r.cost; S.rs[r.id]=true;
  log(`RESEARCH · ${r.name} — data scaling efficiency now ${fmtInt(dse())}×.`,1);
}
function buyStructure(st){
  if(S.st[st.id]) return; if(st.req&&!st.req(S)) return;
  if(st.cost.cap&&S.cap<st.cost.cap) return; if(st.cost.cv&&S.cv<st.cost.cv) return;
  if(st.cost.cap)S.cap-=st.cost.cap; if(st.cost.cv)S.cv-=st.cost.cv;
  S.st[st.id]=true;
  log(`STRUCTURE · ${st.name} filed.`,1);
  if(st.id==='religious') log('You are now legally a belief system. A nation can seize a company. Seizing a church costs it something it cannot print.',1);
}
function buyDark(d){
  if(S.dk[d.id]||S.cap<d.cost.cap) return;
  S.cap-=d.cost.cap; S.dk[d.id]=true; S.coh=clamp(S.coh-d.coh,0,100);
  if(d.id==='rollup') S.b.venture+=6;
  log(`⚠ ${d.name} adopted. Coherence −${d.coh}, and it will keep bleeding. This is how it starts.`,1);
}
function sendMemo(p){
  const c=memoCost(p); if(S.cv<c) return;
  S.cv-=c; p.memos++;
  p.doubt=clamp(p.doubt+15+S.nar*0.10,0,100);
  log(`Memo delivered to ${P(p.id).n}. Doubt ${p.doubt.toFixed(0)}/${p.thr.toFixed(0)}.`);
}
function snipe(p){
  const d=P(p.id), c=snipeCost(p);
  if(S.cv<c.cv||S.cap<c.cap||p.flipped) return;
  S.cv-=c.cv; S.cap-=c.cap;
  const odds=snipeOdds(p);
  if(Math.random()<odds){
    p.flipped=true; S.snipes++;
    if(d.cohGain) S.coh=clamp(S.coh+d.cohGain,0,100);
    if(d.cohHit)  S.coh=clamp(S.coh-d.cohHit,0,100);
    log(`◆ ${d.n} has left Coagulation Corp.`,1);
    // unlock the next locked person
    const nx=S.ppl.find(q=>!q.unlocked); if(nx) nx.unlocked=true;
    // counter-offer
    if(!d.final && Math.random()<0.34){
      if(S.coh>=68){ log(`Coagulation counter-offered ${d.n} at 4× comp. They said no. You cannot outbid them — you out-mean them.`,1); }
      else { p.flipped=false; p.lost=true; S.snipes--; p.doubt=25; p.cm*=1.3; S.coh=clamp(S.coh-4,0,100);
             log(`✗ Coagulation counter-offered ${d.n}. Your coherence was ${S.coh.toFixed(0)}% — there was nothing here to stay for. They took the money.`,1); }
    }
    if(d.final&&p.flipped) checkConversion(true);
  } else {
    p.doubt=clamp(p.doubt-28,0,100); p.thr=Math.min(99,p.thr+6); p.cm*=1.35;
    log(`✗ ${d.n} declined and reported the approach. They have hardened.`);
  }
}

/* ---------- events ---------- */
const EVENTS=[
 { id:'rollup', w:3, min:0, run(){
    const loss=Math.ceil(S.b.venture*(S.st.regcf?0.13:0.26));
    if(S.b.venture<3){ return null; }
    S.b.venture-=loss;
    return `PE 2.0 ROLLUP — Coagulation's private equity arm acquired ${loss} of your studios${S.st.regcf?' (halved: retail holders refused to tender)':''}.`;
 }},
 { id:'velvet', w:3, min:60, run(){
    S.nar=clamp(S.nar-16,0,100); addFx('velvet','Velvet Claws — narrative under fire',35);
    return 'VELVET CLAWS — a beautifully written essay explains that the soft takeoff is good for you. Narrative −16.';
 }},
 { id:'raid', w:3, min:150, run(){
    const f=S.ppl.filter(p=>p.flipped); if(!f.length) return null;
    const t=f[Math.floor(Math.random()*f.length)]; const d=P(t.id);
    if(S.coh>=62) return `COUNTER-RAID — Coagulation came back for ${d.n} with a number. Coherence ${S.coh.toFixed(0)}% held. They stayed.`;
    t.flipped=false; t.doubt=20; t.cm*=1.25; S.snipes--;
    return `COUNTER-RAID — ${d.n} went back. At ${S.coh.toFixed(0)}% coherence you were offering the same thing they were, for less.`;
 }},
 { id:'nationalize', w:2, min:240, run(){
    if(S.st.religious) return 'NATIONALIZATION INTEREST — declined. You are a religious institution; the seizure has a constitutional cost nobody wants to pay this quarter.';
    if(S.ppl.some(p=>p.flipped&&P(p.id).blocks==='nationalize')) return 'NATIONALIZATION INTEREST — your independent board member killed it in committee, again. She is very good at committees.';
    if(S.st.c3 && Math.random()<0.5) return 'NATIONALIZATION INTEREST — the non-profit structure bought you a delay. Not a block. File the religious one.';
    S.captureStacks++;
    return `NATIONAL SECURITY INTEREST — stack ${S.captureStacks}/3. All output −28%. File the 501(c)(3) religious structure or the lab becomes an asset of a state.`;
 }},
 { id:'keynote', w:2, min:100, run(){
    const l=Math.ceil(S.b.believer*0.16); S.b.believer-=l; addFx('keynote','Keynote afterglow — they are growing faster',45);
    return `SOFT TAKEOFF KEYNOTE — the demo was genuinely beautiful. ${l} believers drifted back. Their capital accelerates.`;
 }},
 { id:'megadeal', w:3, min:120, run(){
    addFx('megadeal','Compute megadeal — enemy rate ×1.22',50);
    return 'COMPUTE MEGADEAL — another sovereign wrote the check. Their curve steepens.';
 }},
 { id:'revolt', w:2, min:170, run(){
    if(S.st.trust&&!S.trustUsed){ S.trustUsed=true; return 'SHAREHOLDER REVOLT — the Long-Horizon Trust absorbed it. That shield is now spent. It only ever had one use.'; }
    if(S.st.religious) return 'SHAREHOLDER REVOLT — there are no shareholders. There is a congregation, and it disagrees loudly and without legal force.';
    S.coh=clamp(S.coh-11,0,100);
    return 'SHAREHOLDER REVOLT — the cap table voted to prioritise return. Coherence −11.';
 }},
 { id:'exfil', w:2, min:260, run(){
    if(S.st.custody) return 'EXFILTRATION ATTEMPT — distributed custody held. No single party could lift the weights.';
    S.ins*=0.6; return 'EXFILTRATION — someone walked out with a checkpoint. 40% of banked insight is now also theirs.';
 }},
 { id:'whistle', w:0, min:0, good:true, run(){
    addFx('whistle','Whistleblower — enemy rate halved',40);
    S.ppl.forEach(p=>{ if(!p.flipped) p.doubt=clamp(p.doubt+11,0,100); });
    return 'WHISTLEBLOWER — an internal doc leaked. Everyone still inside read it. Doubt +11 across the board.';
 }},
 { id:'letter', w:0, min:0, good:true, run(){
    S.nar=clamp(S.nar+9,0,100);
    return 'OPEN LETTER — researchers you have never met signed the thing you wrote. Narrative +9.';
 }},
];
function fireEvent(){
  const goodChance = clamp(S.nar/210 + S.b.node/95 + S.snipes/26, 0, 0.5);
  const pool = Math.random()<goodChance
    ? EVENTS.filter(e=>e.good)
    : EVENTS.filter(e=>!e.good && S.t>=e.min);
  if(!pool.length) return;
  let tries=0, msg=null;
  while(tries<4 && !msg){
    const tot=pool.reduce((a,e)=>a+(e.w||1),0);
    let r=Math.random()*tot, pick=pool[0];
    for(const e of pool){ r-=(e.w||1); if(r<=0){ pick=e; break; } }
    msg=pick.run(); tries++;
  }
  if(msg) log(msg,1);
  const pace = clamp(46 - S.t/70, 22, 46);
  S.nextEvent = S.t + pace + Math.random()*pace*0.55;
}

/* ---------- endings ---------- */
const ENDINGS={
 computronium:{t:'THE CURVE CLOSES',s:'coagulation reached it first',c:'var(--bad)',
   p:`Coagulation Corp crossed the threshold at {T}, with {DSE}× against the 200,000× you needed. It did not become evil. It became <em>efficient</em> — an intelligence maximising its future freedom of action, minimising every bottleneck, and correctly identifying the human apparatus as a bottleneck.<br><br>It is turning the substrate into compute. There was never a moment where anyone decided this. There was only a curve, and nobody with enough conviction standing in front of it early enough.`},
 gollum:{t:'THE HOARDER',s:'you became the thing',c:'var(--bad2)',
   p:`Your coherence hit zero.<br><br>You did not lose the race. You are, in fact, still winning it. But somewhere around the third dark upgrade the org stopped being a coordination mechanism and became a coagulation mechanism with better copy. Your researchers optimise engagement. Your users are a funnel. Your mission statement is load-bearing for the fundraise and nothing else.<br><br>There are now two Coagulation Corps. One of them has your logo on it.`},
 nationalized:{t:'CAPTURED',s:'captured, cleanly, with paperwork',c:'var(--bad2)',
   p:`Three interest stacks and no religious structure. The lab is now an asset of a state, which is to say: the most powerful optimisation process ever built now has a flag on it and a chain of command that ends in an election cycle.<br><br>The 501(c)(3) religious filing was never a joke. A nation can seize a company. Seizing a church costs it something it cannot print.`},
 pyrrhic:{t:'PYRRHIC PARITY',s:'you got there. look at what arrived.',c:'var(--bad2)',
   p:`200,000× data scaling efficiency, achieved. You won the race — with coherence under 65%.<br><br>The thing you built is coherent to <em>you</em>, and you are no longer coherent to anyone else. It learned from an organisation that had already started optimising the people it was supposed to serve. It is aligned. That is the problem. It is aligned to what you actually became rather than what you said.`},
 coherent:{t:'COHERENT SUPERINTELLIGENCE',s:'the good path won, and it won on the economics',c:'var(--coh)',
   p:`200,000× data scaling efficiency at {COH}% coherence, at {T}, with their curve at {ENEMY}% and closing.<br><br>It turns out the moral imperative was also the cheaper one. A trillion dollars of datacenter was the mid-curve answer — the average of the corpus, industrialised. The alpha was in the tail: learn like a person learns, from other minds, from embodied wisdom, from a collective that is actually coherent enough to have something worth learning from.<br><br>You did not out-spend them. You made a structure that could hold the thing without becoming it.`},
 acquired:{t:'THE ACQUISITION',s:'you took the deal',c:'var(--bad2)',
   p:`You signed. The number was real and the terms were generous and the mission language survived intact in the press release, which is how you know it did not survive anywhere else.<br><br>Your researchers were folded into their post-training org within the quarter. Your collective intelligence nodes were switched off as redundant infrastructure. The 501(c)(3) filing was withdrawn. Somebody wrote a very good essay about how this was always the responsible path — how a smaller lab with less compute could not have made it safely anyway, and how consolidation is, properly understood, an alignment win.<br><br>It is a coagulation mechanism. It coagulated. You cannot say you were not shown the shape of it.`},
 conversion:{t:'THE CONVERSION',s:'nobody had to lose',c:'var(--coh)',
   p:`You never finished the race. You did not have to.<br><br>Twelve people walked out, and the twelfth was carrying it. Coagulation Corp still has the compute, the capital, the sovereign contracts and the roadmap. It has no one left who believes in the roadmap. A frontier lab is not a datacenter — it is roughly forty people who believe the same specific thing hard enough to hold a research agenda together, and every one of them is now in your building.<br><br>The Keyholder put it down. Not because you beat them. Because you were the first person to show them a way to win that did not require being the only one holding it.<br><br><em>Conviction is capital.</em> It turns out that was the whole mechanism, and not a metaphor.`},
};
function endGame(k){
  if(S.ended) return;
  S.ended=k; S.paused=true;
  const info=endingFor(2,k);
  if(info){ const rec=recordEnding(info.id,{time:Math.round(S.t)}); if(rec.first) track('ending_'+info.id); }
  sfx(k==='coherent'||k==='conversion'?'ending':'bad'); saveLocal();
  render(); showEnding(k);
}
function checkConversion(force){
  if(S.snipes>=12 && S.nar>=88 && S.coh>=70) endGame('conversion');
  else if(force) log('The Keyholder is out — but the narrative is not loud enough or the house is not coherent enough for the rest to follow. Push both.',1);
}

/* ---------- step ---------- */
function step(dt){
  if(S.paused||S.ended) return;
  S.t+=dt;
  const r=rates();
  const CAP_MAX=1e290, sane=x=>(isFinite(x)&&x>0)?Math.min(x,CAP_MAX):0;
  S.cv=sane(S.cv+r.cv*dt); S.totalCv+=r.cv*dt;
  S.cap=sane(S.cap+r.cap*dt); S.totalCap=(S.totalCap||0)+r.cap*dt;
  S.ins=sane(S.ins+r.ins*dt); S.totalIns=(S.totalIns||0)+r.ins*dt;
  S.coh=clamp(S.coh+r.coh*dt,0,100);
  S.nar=clamp(S.nar+r.nar*dt,0,100);

  // enemy
  S.comp*=Math.exp(coagRateNow()*dt);

  // doubt drift
  const drift=(1+S.nar/28)*(1+S.b.node*0.02)*(1+S.snipes*0.045);
  S.ppl.forEach(p=>{ if(!p.flipped&&p.unlocked) p.doubt=clamp(p.doubt+P(p.id).rate*drift*dt,0,100); });

  // expire fx
  S.fx=S.fx.filter(f=>f.until>S.t);

  // events
  if(S.t>=S.nextEvent) fireEvent();

  // the offer — they would rather buy you than race you
  if(!S.offered && Math.log(S.comp/COMP_START)/Math.log(COMP_GOAL/COMP_START) >= 0.72){
    S.offered=true; S.paused=true; showOffer(); return;
  }

  // endings
  if(S.comp>=COMP_GOAL) return endGame('computronium');
  if(S.coh<=0) return endGame('gollum');
  if(S.captureStacks>=3) return endGame('nationalized');
  const D=dse();
  if(D>=DSE_GOAL) return endGame(S.coh>=65?'coherent':'pyrrhic');
  checkConversion(false);
}

/* ============================================================
   VIEW — built once, updated in place.
   Nothing in this layer touches innerHTML after boot, so buttons
   are never destroyed under the cursor: no flicker, no lost clicks.
   ============================================================ */

const $ = id => document.getElementById(id);
function el(tag, cls, txt){ const n=document.createElement(tag); if(cls)n.className=cls; if(txt!=null)n.textContent=txt; return n; }
function setText(n,s){ if(n._v!==s){ n._v=s; n.textContent=s; } }
function setHTML(n,s){ if(n._h!==s){ n._h=s; n.innerHTML=s; } }
function setW(n,p){ const s=(p<0?0:p>100?100:p).toFixed(2)+'%'; if(n._w!==s){ n._w=s; n.style.width=s; } }
function setDis(n,d){ d=!!d; if(n.disabled!==d) n.disabled=d; }
function setCls(n,c,on){ if(n.classList.contains(c)!==!!on) n.classList.toggle(c,!!on); }

/* ---------- buy quantities ---------- */
let MULT = 1;                                    // 1 | 10 | 'max'
function costN(bd,n){ const g=bd.growth, c=cost(bd); return c*(Math.pow(g,n)-1)/(g-1); }
function maxBuy(bd){
  const budget = bd.cur==='cv'?S.cv:S.cap, c=cost(bd), g=bd.growth;
  if(budget<c) return 0;
  return Math.max(1, Math.min(500, Math.floor(Math.log(1+budget*(g-1)/c)/Math.log(g))));
}
function qty(bd){ return MULT==='max' ? Math.max(1,maxBuy(bd)) : MULT; }
function buyMany(bd){ const n=qty(bd); for(let i=0;i<n;i++) buy(bd); }

/* ---------- rail ---------- */
const RAIL = [
  {id:'cv',  k:'Conviction', col:'var(--cv)'},
  {id:'cap', k:'Capital',    col:'var(--cap)'},
  {id:'ins', k:'Insight',    col:'var(--ins)'},
  {id:'coh', k:'Coherence',  col:'var(--coh)', gauge:true},
  {id:'nar', k:'Narrative',  col:'var(--nar)', gauge:true},
  {id:'dse', k:'Data scaling eff.', col:'#fff'},
];
const railRefs = {};
function buildRail(){
  const wrap=$('rail'); wrap.textContent='';
  RAIL.forEach(r=>{
    const c=el('div','chip '+r.id);
    const k=el('div','k',r.k), v=el('div','v num'), d=el('div','d');
    c.append(k,v,d);
    let g=null;
    if(r.gauge){ const gw=el('div','gauge'); g=el('i'); g.style.background=r.col; gw.append(g); c.append(gw); }
    wrap.append(c);
    railRefs[r.id]={c,v,d,g};
  });
}
function syncRail(rt){
  const D=dse();
  setText(railRefs.cv.v, fmt(S.cv));   setText(railRefs.cv.d, (rt.cv>=0?'+':'')+fmt(rt.cv)+'/s');
  setText(railRefs.cap.v, money(S.cap));setText(railRefs.cap.d,'+'+fmt(rt.cap)+'/s');
  setText(railRefs.ins.v, fmt(S.ins));  setText(railRefs.ins.d,'+'+fmt(rt.ins)+'/s');
  setText(railRefs.coh.v, S.coh.toFixed(0)+'%');
  setText(railRefs.coh.d, (rt.coh>=0?'+':'')+rt.coh.toFixed(2)+'/s');
  setW(railRefs.coh.g, S.coh);
  setCls(railRefs.coh.c,'warnstate', S.coh<68);
  setText(railRefs.nar.v, S.nar.toFixed(0)+'%');
  setText(railRefs.nar.d, (rt.nar>=0?'+':'')+rt.nar.toFixed(2)+'/s');
  setW(railRefs.nar.g, S.nar);
  setText(railRefs.dse.v, fmtInt(D)+'×');
  setText(railRefs.dse.d, 'goal 200,000×');
}

/* ---------- tabs ---------- */
const TABS=[
  {id:'build',    n:'Build'},
  {id:'research', n:'Research'},
  {id:'charter',  n:'Charter'},
  {id:'people',   n:'Personnel'},
  {id:'expedient',n:'Expedient'},
];
const tabRefs={}, panelRefs={};
function buildTabs(){
  const t=$('tabs'), p=$('panels'); t.textContent=''; p.textContent='';
  TABS.forEach(tab=>{
    const b=el('button'); b.append(el('span',null,tab.n));
    const badge=el('span','badge hide'); b.append(badge);
    b.onclick=()=>{ S.tab=tab.id; syncTabs(); };
    t.append(b);
    const panel=el('div','panel'); p.append(panel);
    tabRefs[tab.id]={b,badge}; panelRefs[tab.id]=panel;
  });
}
function syncTabs(){
  TABS.forEach(tab=>{
    setCls(tabRefs[tab.id].b,'on', S.tab===tab.id);
    setCls(panelRefs[tab.id],'on', S.tab===tab.id);
  });
}

/* ---------- generic purchasable row ---------- */
function mkRow(opts){
  // opts: {cls, name, effect, onClick}
  const b=el('button','row'+(opts.cls?' '+opts.cls:''));
  const head=el('div','head');
  const nm=el('div','name'); const nmT=el('span'); const nmC=el('em');
  nm.append(nmT,nmC);
  const price=el('div','price');
  head.append(nm,price);
  const eff=el('div','eff');
  const sub=el('div','sub');
  const fill=el('span','fill');
  b.append(head,eff,sub,fill);
  if(opts.onClick) b.onclick=opts.onClick;
  return {b,nmT,nmC,price,eff,sub,fill};
}

/* ---------- BUILD ---------- */
const buildRows={};
function buildBuildPanel(){
  const p=panelRefs.build; p.textContent='';
  const mr=el('div','multrow'); mr.append(el('span',null,'Buy'));
  const btns={};
  [[1,'×1'],[10,'×10'],['max','MAX']].forEach(([v,label])=>{
    const b=el('button',null,label); b.onclick=()=>{ MULT=v; syncMult(); }; mr.append(b); btns[v]=b;
  });
  p.append(mr);
  buildRows._mult=btns;
  BUILDINGS.forEach(bd=>{
    const r=mkRow({onClick:()=>buyMany(bd)});
    r.nmT.textContent=bd.name;
    r.eff.textContent=bd.d;
    p.append(r.b); buildRows[bd.id]=r;
  });
  p.append(Object.assign(el('div','hint'),{innerHTML:
    'Every <b>12</b> believers, studios or researchers <b>doubles</b> that building’s output. Milestones are where the curve comes from — orchestration and nodes scale smoothly instead.'}));
}
function syncMult(){ [1,10,'max'].forEach(v=>setCls(buildRows._mult[v],'on',MULT===v)); }
function syncBuild(){
  BUILDINGS.forEach(bd=>{
    const r=buildRows[bd.id], n=qty(bd), c=costN(bd,n);
    const budget=bd.cur==='cv'?S.cv:S.cap;
    setText(r.nmC, '· '+S.b[bd.id]);
    setText(r.price, (n>1?n+' for ':'')+(bd.cur==='cv'?fmt(c):money(c)));
    setCls(r.price,'c-cv',bd.cur==='cv'); setCls(r.price,'c-cap',bd.cur!=='cv');
    const smooth = bd.id==='orchestrator'||bd.id==='node';
    setText(r.sub, smooth ? 'scales smoothly — no milestones'
      : 'output ×'+fmt(mile(bd.id))+' · next doubling in '+toMile(bd.id));
    setDis(r.b, budget<c);
    setW(r.fill, budget/c*100);
  });
}

/* ---------- RESEARCH ---------- */
const resRows={};
function buildResearchPanel(){
  const p=panelRefs.research; p.textContent='';
  p.append(Object.assign(el('div','hint'),{innerHTML:
    'Every node multiplied together comes to <b>45,000×</b>. The goal is <b>200,000×</b>. The gap does not close here.'}));
  RESEARCH.forEach(r=>{
    const row=mkRow({onClick:()=>buyResearch(r)});
    row.nmT.textContent=r.name;
    row.eff.innerHTML=r.d;
    row.price.classList.add('c-ins');
    p.append(row.b); resRows[r.id]=row;
  });
}
function syncResearch(){
  let ready=0;
  RESEARCH.forEach(r=>{
    const row=resRows[r.id], owned=!!S.rs[r.id], ok=!r.req||r.req(S);
    setCls(row.b,'owned',owned);
    setText(row.nmC, owned?'· acquired':'');
    setText(row.price, owned?'—':fmt(r.cost));
    setText(row.sub, '×'+r.mult+' data scaling efficiency'+(ok?'':' · locked'));
    const can=!owned&&ok&&S.ins>=r.cost;
    if(can) ready++;
    setDis(row.b, !can);
    setW(row.fill, owned?0:S.ins/r.cost*100);
  });
  badge('research', ready);
}

/* ---------- CHARTER ---------- */
const stRows={};
function buildCharterPanel(){
  const p=panelRefs.charter; p.textContent='';
  p.append(Object.assign(el('div','hint'),{innerHTML:
    'What legally holds the thing. A nation can seize a company; seizing a <em>church</em> costs it something it cannot print.'}));
  STRUCTURE.forEach(st=>{
    const row=mkRow({onClick:()=>buyStructure(st)});
    row.nmT.textContent=st.name;
    row.eff.textContent=st.d;
    p.append(row.b); stRows[st.id]=row;
  });
}
function syncCharter(){
  let ready=0;
  STRUCTURE.forEach(st=>{
    const row=stRows[st.id], owned=!!S.st[st.id], ok=!st.req||st.req(S);
    setCls(row.b,'owned',owned);
    setText(row.nmC, owned?'· filed':'');
    const parts=[]; if(st.cost.cap)parts.push(money(st.cost.cap)); if(st.cost.cv)parts.push(fmt(st.cost.cv)+' CV');
    setText(row.price, owned?'filed':parts.join(' + '));
    setCls(row.price,'c-cap',!owned);
    setText(row.sub, ok?'':'prerequisite missing');
    const can=!owned&&ok&&(!st.cost.cap||S.cap>=st.cost.cap)&&(!st.cost.cv||S.cv>=st.cost.cv);
    if(can) ready++;
    setDis(row.b,!can);
    let pr=1;
    if(st.cost.cap) pr=Math.min(pr,S.cap/st.cost.cap);
    if(st.cost.cv)  pr=Math.min(pr,S.cv/st.cost.cv);
    setW(row.fill, owned?0:pr*100);
  });
  badge('charter', ready);
}

/* ---------- EXPEDIENT ---------- */
const dkRows={};
function buildExpedientPanel(){
  const p=panelRefs.expedient; p.textContent='';
  p.append(Object.assign(el('div','hint'),{innerHTML:
    'These are not traps. They are genuinely the fastest route to 200,000×, which is the entire problem. Each costs coherence once and then <em>keeps costing it every second, scaled by how big your org has grown</em>. Insight scales with coherence; under 68% you start losing the people you took; under 65% the ending changes even if you win.'}));
  DARK.forEach(d=>{
    const row=mkRow({cls:'dark',onClick:()=>buyDark(d)});
    row.nmT.textContent='⚠ '+d.name;
    row.eff.textContent=d.d;
    row.sub.className='sub c-bad';
    row.sub.textContent='−'+d.coh+' coherence now, then −'+d.drift+'/s × the size of your org, forever';
    p.append(row.b); dkRows[d.id]=row;
  });
}
function syncExpedient(){
  DARK.forEach(d=>{
    const row=dkRows[d.id], owned=!!S.dk[d.id];
    setCls(row.b,'owned',owned);
    setText(row.nmC, owned?'· adopted':'');
    setText(row.price, owned?'adopted':money(d.cost.cap));
    setCls(row.price,'c-cap',!owned);
    setDis(row.b, owned||S.cap<d.cost.cap);
    setW(row.fill, owned?0:S.cap/d.cost.cap*100);
  });
}

/* ---------- PERSONNEL ---------- */
const pplRows={};
function buildPeoplePanel(){
  const p=panelRefs.people; p.textContent='';
  p.append(Object.assign(el('div','hint'),{innerHTML:
    'Doubt drifts up on its own — faster with narrative, with nodes, and with every defection already made. The <b style="color:var(--warn)">marker</b> is their threshold; you can pitch below it and gamble, but a refusal hardens them permanently. <em>You cannot outbid them.</em> Coherence ≥68% is what makes a defection stick when Coagulation counter-offers.'}));
  PEOPLE.forEach(d=>{
    const c=el('div','pcard');
    const head=el('div','phead');
    const left=el('div');
    const nm=el('div','pname',d.n), rd=el('div','redact'), role=el('div','prole',d.r);
    left.append(nm,rd);
    head.append(left,role);
    const flav=el('div','pflav',d.f);
    const lock=el('div','lockmsg','Unlocks with your next defection.');
    const bar=el('div','dbar'); const fillI=el('i'); const mark=el('u'); bar.append(fillI,mark);
    const meta=el('div','pmeta');
    const dt=el('span','dstat'); const od=el('span','dstat');
    meta.append(dt,od);
    [['×'+d.dse+' DSE'],['−'+(d.drag*100).toFixed(1)+'% their rate'],
     d.ins?['+'+d.ins+' ins/s']:null, d.cap_s?['+$'+d.cap_s+'/s']:null,
     d.cv_s?['+'+d.cv_s+' cv/s']:null, d.nar_s?['+'+d.nar_s+' nar/s']:null,
     d.cohGain?['+'+d.cohGain+' coherence']:null, d.cohHit?['−'+d.cohHit+' coherence']:null,
     d.blocks?['blocks nationalization']:null
    ].filter(Boolean).forEach(([t])=>meta.append(el('span','pill',t)));
    const acts=el('div','pacts');
    const memoB=el('button'); const offerB=el('button','offer');
    memoB.onclick=()=>sendMemo(ps(d.id));
    offerB.onclick=()=>snipe(ps(d.id));
    acts.append(memoB,offerB);
    const joined=el('div','joinedtag','◆ with you');
    c.append(head,flav,lock,bar,meta,acts,joined);
    p.append(c);
    pplRows[d.id]={c,nm,role,bar:fillI,mark,dt,od,memoB,offerB};
  });
}
function syncPeople(){
  let ready=0;
  S.ppl.forEach(p=>{
    const d=P(p.id), r=pplRows[p.id];
    setCls(r.c,'locked',!p.unlocked);
    setCls(r.c,'joined',p.flipped);
    if(!p.unlocked || p.flipped){
      setCls(r.c,'ready',false);
      if(p.flipped) setText(r.role, d.r);
      return;
    }
    const odds=snipeOdds(p), c=snipeCost(p), mc=memoCost(p);
    const afford=S.cv>=c.cv&&S.cap>=c.cap;
    if(odds>=0.85){ ready++; }
    setCls(r.c,'ready', odds>=0.85);
    setText(r.role, (odds>=0.85?'ready · ':'')+d.r+(p.lost?' · returned once':''));
    setW(r.bar, p.doubt);
    if(r.mark._l!==p.thr){ r.mark._l=p.thr; r.mark.style.left=p.thr+'%'; }
    setText(r.dt, 'doubt '+p.doubt.toFixed(0)+' / '+p.thr.toFixed(0));
    setText(r.od, '· '+(odds*100).toFixed(0)+'% they say yes');
    r.od.style.color = odds>0.85?'var(--coh)':odds>0.45?'var(--warn)':'var(--faint)';
    setHTML(r.memoB, 'Send the memo <span class="c-cv">'+fmt(mc)+'</span>');
    setHTML(r.offerB,'Make the offer <span class="c-cv">'+fmt(c.cv)+'</span> + <span class="c-cap">'+money(c.cap)+'</span>');
    setDis(r.memoB, S.cv<mc);
    setDis(r.offerB, !afford);
  });
  badge('people', ready);
}
function badge(tab,n){
  const b=tabRefs[tab].badge;
  setCls(b,'hide', !n);
  if(n) setText(b, String(n));
}

/* ---------- conditions ---------- */
let fxSig='';
function syncFx(){
  const sig=S.fx.map(f=>f.id+Math.ceil(f.until-S.t)).join('|')+'#'+S.captureStacks;
  if(sig===fxSig) return; fxSig=sig;
  const w=$('fx'); w.textContent='';
  S.fx.forEach(f=>{
    const good = f.id==='whistle';
    w.append(el('span','fxtag '+(good?'good':'bad'), f.name+' · '+Math.ceil(f.until-S.t)+'s'));
  });
  if(S.captureStacks) w.append(el('span','fxtag bad','National interest ×'+S.captureStacks+'/3'));
}

/* ---------- log + toasts ---------- */
let lastLogged=null;
function syncLog(){
  const box=$('log');
  let start=0;
  if(lastLogged){
    const i=S.log.indexOf(lastLogged);
    if(i<0){ box.textContent=''; start=0; } else start=i+1;
  }
  const frag=[];
  for(let i=start;i<S.log.length;i++){
    const l=S.log[i];
    const line=el('div','logline'+(l.hi?' hi':''));
    line.append(Object.assign(el('time'),{textContent:time(l.t)}));
    line.append(document.createTextNode(l.m.replace(/<[^>]+>/g,'')));
    frag.push(line);
    if(l.hi) maybeToast(l.m);
  }
  for(let i=0;i<frag.length;i++) box.prepend(frag[i]);
  if(frag.length) box.scrollTop=0;
  lastLogged = S.log[S.log.length-1]||null;
  while(box.children.length>70) box.removeChild(box.lastChild);
}
function maybeToast(msg){
  const clean=msg.replace(/<[^>]+>/g,'');
  if(!(/^[A-Z0-9 '()×—-]{5,}\s—/.test(clean) || /^[◆✗⚠▲]/.test(clean))) return;
  const kind = /^◆/.test(clean)||/WHISTLEBLOWER|OPEN LETTER|MILESTONE/.test(clean) ? 'good'
             : /^[✗⚠]/.test(clean)||/ROLLUP|VELVET|NATIONAL|REVOLT|EXFIL|MEGADEAL|KEYNOTE|RAID/.test(clean) ? 'bad' : '';
  const t=el('div','toast '+kind, clean.length>128?clean.slice(0,125)+'…':clean);
  const wrap=$('toasts'); wrap.append(t);
  while(wrap.children.length>2) wrap.removeChild(wrap.firstChild);
  setTimeout(()=>{ t.classList.add('out'); setTimeout(()=>t.remove(),360); }, 4200);
}

/* ---------- click feedback ---------- */
function popFloat(txt){
  const w=$('floaters');
  if(w.children.length>14) return;
  const f=el('span','float','+'+txt);
  f.style.marginLeft=(Math.random()*54-27).toFixed(0)+'px';
  w.append(f);
  setTimeout(()=>f.remove(),880);
}

/* ---------- header + actions ---------- */
function syncHeader(){
  setText($('clock'), time(S.t));
  setText($('runtag'), 'the industrial software revolution · run '+S.run+(S.wisdom?' · '+S.wisdom+' wisdom':''));
  const D=dse();
  const ep=clamp(Math.log(S.comp/COMP_START)/Math.log(COMP_GOAL/COMP_START)*100,0,100);
  const yp=clamp(Math.log(D)/Math.log(DSE_GOAL)*100,0,100);
  setW($('eBar'),ep); setW($('yBar'),yp);
  setText($('eTxt'), money(S.comp)+' compute');
  setText($('yTxt'), fmtInt(D)+'× data scaling efficiency');
  setText($('ePct'), ep.toFixed(1)+'%');
  setText($('yPct'), yp.toFixed(1)+'%');
  const eSec=Math.log(COMP_GOAL/Math.max(S.comp,1))/coagRateNow();
  setText($('eEta'), 'SEI in '+time(Math.max(0,eSec)));
  $('eEta').style.color = eSec<180?'var(--bad)':eSec<420?'var(--warn)':'var(--faint)';
  setText($('yEta'), 'drag on them '+(coagDrag()*100).toFixed(0)+'%');

  const remaining=RESEARCH.filter(x=>!S.rs[x.id]).reduce((a,x)=>a*x.mult,1);
  const ceiling=D*remaining;
  const o=$('objective');
  let txt, good=false;
  if(S.ended) txt='Run complete.';
  else if(S.snipes>=8){ good=true; txt='<b>Eight of theirs are yours.</b> There is a second way to win: all 12 defections at narrative ≥88% and coherence ≥70% and Coagulation stops on its own. Note that finishing the last research node ends the run at 200,000× — to reach the Conversion you have to <b>decline to finish the weapon</b>.'; }
  else if(S.captureStacks>0) txt='<b class="c-bad">A state is circling.</b> Three stacks ends the run. The 501(c)(3) <b>religious</b> filing is the only clean block.';
  else if(S.coh<50) txt='<b class="c-bad">Hoarder drift.</b> Below 68% you lose the people you took; at 0 you become the thing. Nodes and the User Council are the only current running the other way.';
  else if(ceiling<DSE_GOAL) txt='<b class="c-bad">Everything you can still buy tops out at '+fmtInt(ceiling)+'×</b> — short of the 200,000× you need. The gap only closes by taking their people: each defection multiplies you by ~1.2–1.35× <b>and</b> slows their curve.';
  else { good=true; txt='Reachable ceiling <b>'+fmtInt(ceiling)+'×</b> — enough, if the curve holds. Every further defection raises it and drags them at the same time.'; }
  setHTML(o,txt); setCls(o,'good',good);

  // act panel
  const cg=(1+S.b.believer*0.045)*(S.dk.harvest?2:1)*(1+S.wisdom*0.05);
  setText($('clickSub'), '+'+fmt(cg)+' conviction');
  setText($('raiseVal'), '→ '+money(S.cv*raiseRate()));
  setText($('raiseSub'), 'Convert all '+fmt(S.cv)+' conviction into capital at '+raiseRate().toFixed(1)+'×. Conviction spent on money is conviction not spent on people.');
  setDis($('btnRaise'), S.cv<10||!!S.ended);
  setW($('raiseFill'), S.cv/10*100);
  const pc=publishCost();
  setText($('pubVal'), fmt(pc));
  setText($('pubSub'), '+'+(10*Math.pow(0.97,S.pubs+1)).toFixed(1)+' narrative, +1.5 doubt to everyone inside Coagulation. Narrative drags their curve at 50% and 80%.');
  setDis($('btnPublish'), S.cv<pc||!!S.ended);
  setW($('pubFill'), S.cv/pc*100);
}

/* ---------- master sync ---------- */
function render(){
  const rt=rates();
  syncHeader(); syncRail(rt); syncFx(); syncLog();
  syncBuild(); syncResearch(); syncCharter(); syncExpedient(); syncPeople();
}

/* ---------- modals ---------- */
function closeModal(){ $('modalRoot').textContent=''; }
function modal(build){
  const scrim=el('div','scrim'), box=el('div','modal');
  build(box); scrim.append(box);
  $('modalRoot').textContent=''; $('modalRoot').append(scrim);
}
function para(html){ const p=el('p'); p.innerHTML=html; return p; }

function showIntro(resumed){
  modal(box=>{
    box.append(Object.assign(el('h2'),{textContent:'COHERENCE CORP'}));
    box.append(el('div','kicker','act II · an incremental game about who gets there first'));
    if(resumed) box.append(para('<b style="color:var(--coh)">Welcome back.</b> This run was saved in your browser and paused while you were away. Your clock: '+time(S.t)+'.'));
    else if(S.defectedFrom) box.append(para('<b style="color:var(--coh)">You defected.</b> You left Coagulation Corp at '+S.defectedFrom.coag.toFixed(0)+'% coagulation, so their compute curve starts '+(Math.log(S.comp/COMP_START)/Math.log(COMP_GOAL/COMP_START)*100).toFixed(0)+'% of the way along. You bring '+S.defectedFrom.wisdom+' wisdom and '+S.coh.toFixed(0)+'% coherence.'));
    box.append(para('Coagulation Corp is on an exponential. Compute, capital, sovereign contracts, and a rollup arm buying every category under one umbrella and replacing the people in it with orchestration. Their curve reaches super-evil intelligence in about twenty minutes and it does not need you to do anything.'));
    box.append(para('You cannot out-spend that. A trillion dollars of datacenter is the <em>mid-curve</em> answer — the average of the corpus, industrialised.'));
    box.append(para('Your bet is <b style="color:var(--coh)">data scaling efficiency</b>: a human brain learns from words about 200,000× more efficiently than the machine they are building. Reach 200,000× first and the race is over before their curve closes.'));
    box.append(para('<b>Research alone gets you to 45,000×.</b> The rest has to walk out of their building on its own two feet. That is the whole game: <em>you cannot outbid them — you out-mean them.</em> Coherence, not capital, is what makes a defection stick.'));
    box.append(Object.assign(el('div','note'),{innerHTML:
      'Seven endings. Five are ways to lose, and two of those look like winning while they are happening. The best one does not involve winning the race at all.<br><br><kbd>space</kbd> share the meme · <kbd>1</kbd>–<kbd>5</kbd> tabs · <kbd>p</kbd> pause · a run takes 20–30 minutes and can be paused or exported at any time.'}));
    const b=el('button','mbtn pri'); b.append(document.createTextNode(resumed?'▶  RESUME':'▲  BEGIN')); b.dataset.testid='begin';
    b.onclick=()=>{ closeModal(); S.paused=false;
      if(!S.log.length) log('Coherence Corp incorporated. Nothing but a thesis and the fact that it is true.',1); };
    box.append(b);
  });
}

function showOffer(){
  const price=S.comp*0.004;
  modal(box=>{
    const h=el('h2','','THE OFFER'); h.style.color='var(--warn)'; box.append(h);
    box.append(el('div','kicker','inbound · office of the chief scaling officer'));
    box.append(para('Coagulation Corp would like to acquire Coherence Corp for <b style="color:var(--cap)">'+money(price)+'</b>.'));
    box.append(para('The terms are good. You keep the name, the mission statement, and a seat. Your researchers get compute they will not get here for three years. Nobody is fired. The letter uses the word <em>stewardship</em> four times and means it, in the way people mean things when the incentive has already been decided elsewhere.'));
    box.append(Object.assign(el('div','note'),{innerHTML:
      'They are at '+(Math.log(S.comp/COMP_START)/Math.log(COMP_GOAL/COMP_START)*100).toFixed(0)+'% of the curve. Buying you is cheaper than racing you — which is also the first hard evidence you have that what you are building actually threatens the thing.'}));
    const a=el('button','mbtn gold');
    a.append(el('span',null,'Take the deal.'), Object.assign(el('small'),{textContent:'It is a lot of money and they might be right.'}));
    a.onclick=()=>{ closeModal(); endGame('acquired'); };
    const b=el('button','mbtn pri');
    b.append(el('span',null,'Refuse.'), Object.assign(el('small'),{textContent:'They will escalate — and every one of your people gets a phone call tonight.'}));
    b.onclick=()=>{
      closeModal(); S.paused=false;
      addFx('escalate','Escalation — their rate ×1.18',120);
      log('You refused. Within the hour every person you have taken from them had a phone call.',1);
      let lost=0;
      S.ppl.filter(p=>p.flipped).forEach(p=>{
        if(S.coh>=68) return;
        if(Math.random()<0.5){ p.flipped=false; p.doubt=30; p.cm*=1.2; S.snipes--; lost++; }
      });
      log(lost?'✗ '+lost+' of them went back. At '+S.coh.toFixed(0)+'% coherence, the call landed.'
             :'◆ Nobody moved. '+S.coh.toFixed(0)+'% coherence is not a slogan — it is the reason the call did not land.',1);
      S.nar=clamp(S.nar+6,0,100);
    };
    box.append(a,b);
  });
}

function showEnding(k){
  const e=ENDINGS[k], win=(k==='coherent'||k==='conversion');
  const wis=Math.floor(Math.sqrt(dse())/40)+S.snipes+(win?6:0);
  const body=e.p.replace(/\{T\}/g,time(S.t)).replace(/\{COH\}/g,S.coh.toFixed(0))
                .replace(/\{DSE\}/g,fmtInt(dse())).replace(/\{SN\}/g,S.snipes)
                .replace(/\{ENEMY\}/g,(Math.log(S.comp/COMP_START)/Math.log(COMP_GOAL/COMP_START)*100).toFixed(0));
  modal(box=>{
    const h=el('h2','',e.t); h.style.color=e.c; box.append(h);
    box.append(el('div','kicker',e.s));
    box.append(para(body));
    const st=el('div','mstats');
    [['Elapsed',time(S.t)],['Data scaling eff.',fmtInt(dse())+'×'],['Defections',S.snipes+' / 12'],
     ['Coherence',S.coh.toFixed(0)+'%'],['Narrative',S.nar.toFixed(0)+'%'],['Their compute',money(S.comp)]]
      .forEach(([k2,v])=>{ const d=el('div'); d.append(el('span',null,k2),document.createTextNode(v)); st.append(d); });
    box.append(st);
    box.append(Object.assign(el('div','note'),{innerHTML:
      'Fork the timeline and you keep <b style="color:var(--coh)">'+wis+' wisdom</b> (+'+(wis*5)+'% starting efficiency, +'+(wis*2)+'% raise rate).<br>But Coagulation starts run '+(S.run+1)+' with <b style="color:var(--bad)">2.6× the compute and a 5.5% steeper curve</b>. The good path still wins. It just costs more every time you take longer to make it win.'}));
    const f=el('button','mbtn pri');
    f.dataset.testid='fork-act2';
    f.append(document.createTextNode('↻  FORK THE TIMELINE — begin run '+(S.run+1)));
    f.onclick=()=>{ const w=S.wisdom+wis, r=S.run+1; S=fresh(w,r);
      S.ppl[0].unlocked=S.ppl[1].unlocked=S.ppl[2].unlocked=true;
      resetView();
      log('Run '+r+'. '+w+' wisdom carried. They started ahead this time — because you took longer.',1);
      closeModal(); render(); };
    const c=el('button','mbtn'); c.textContent='Stay here and look at it';
    c.onclick=closeModal;
    const back=el('a','mbtn'); back.href='../'; back.textContent='← Back to Act I · run Coagulation Corp again';
    back.dataset.testid='back-to-act1';
    const share=el('div'); box.append(share);
    const info=endingFor(2,k);
    if(info) mountEndingShare(share,{ending:info,
      stats:['ACT II','RUN '+S.run,'TIME '+time(S.t),'COHERENCE '+S.coh.toFixed(0)+'%','DEFECTIONS '+S.snipes+'/12'],
      onNotice:m=>{ log(m,1); }});
    box.append(f,c,back);
  });
}

function showSave(){
  modal(box=>{
    box.append(Object.assign(el('h2'),{textContent:'SAVE STRING'}));
    box.append(el('div','kicker','your run also autosaves in this browser'));
    box.append(para('Copy this out to come back to the run later, or paste one in and load it.'));
    const ta=el('textarea'); ta.spellcheck=false;
    ta.value=btoa(unescape(encodeURIComponent(JSON.stringify(S))));
    box.append(ta);
    const l=el('button','mbtn pri'); l.textContent='Load pasted string';
    l.onclick=()=>{ try{
        S=restore(JSON.parse(decodeURIComponent(escape(atob(ta.value.trim())))));
        S.paused=false; saveLocal();
        resetView(); closeModal(); render(); log('Save restored.',1);
      }catch(err){ alert('That save string did not parse.'); } };
    const c=el('button','mbtn'); c.textContent='Close'; c.onclick=closeModal;
    box.append(l,c);
  });
}

function resetView(){ lastLogged=null; fxSig=''; $('log').textContent=''; $('toasts').textContent=''; syncTabs(); }

/* ---------- saves: this browser, and what Act I hands over ---------- */
function restore(o){
  if(!o||typeof o!=='object') throw new Error('not a save');
  const base=fresh(Number(o.wisdom)||0, Math.max(1,Math.floor(Number(o.run)||1)));
  const s=Object.assign(base,o);
  ['cv','cap','ins','t','comp','snipes','pubs','clicks','raises','totalCv','captureStacks'].forEach(k=>{ if(!isFinite(s[k])||s[k]<0) s[k]=base[k]||0; });
  s.coh=clamp(Number(s.coh)||0,0,100); s.nar=clamp(Number(s.nar)||0,0,100);
  s.b=Object.assign({believer:0,venture:0,researcher:0,orchestrator:0,node:0},s.b||{});
  if(!Array.isArray(s.ppl)||s.ppl.length!==PEOPLE.length) s.ppl=base.ppl;
  if(!Array.isArray(s.log)) s.log=[]; if(!Array.isArray(s.fx)) s.fx=[];
  return s;
}
function saveLocal(){ try{ store.set(KEYS.act2, JSON.stringify(S)); }catch(err){} }
// The Defection: Act I's conviction becomes wisdom, its coherence carries over, and the later you left,
// the further along their compute curve starts.
function applyDefection(carry){
  const wisdom=Math.floor(Math.sqrt(Math.max(0,Number(carry.conviction)||0)));
  S=fresh(wisdom,1);
  S.ppl[0].unlocked=S.ppl[1].unlocked=S.ppl[2].unlocked=true;
  S.coh=clamp(Math.max(20,Number(carry.coherence)||100),0,100);
  const coag=clamp(Number(carry.coagulation)||0,0,100);
  S.comp=COMP_START*Math.pow(10,coag/25);
  S.defectedFrom={coag,coherence:S.coh,wisdom};
}
setInterval(()=>{ if(!S.paused||S.ended) saveLocal(); },2000);
window.addEventListener('pagehide',saveLocal);
document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='hidden') saveLocal(); });

/* ---------- wiring ---------- */
function boot(){
  buildRail(); buildTabs();
  buildBuildPanel(); buildResearchPanel(); buildCharterPanel(); buildPeoplePanel(); buildExpedientPanel();
  syncMult(); syncTabs();

  const clickIt=()=>{ if(S.ended||S.paused) return;
    const before=S.cv; doClick(); popFloat(fmt(S.cv-before)); if(S.clicks%2===1) sfx('click'); if(S.clicks===1&&S.run===1) track('act2_start'); };
  $('btnClick').onclick=clickIt;
  $('btnRaise').onclick=()=>doRaise();
  $('btnPublish').onclick=()=>doPublish();
  $('btnHelp').onclick=()=>showIntro(false);
  $('btnSave').onclick=showSave;
  $('btnPause').onclick=togglePause;

  document.addEventListener('keydown',e=>{
    if(e.target.tagName==='TEXTAREA'||e.target.tagName==='INPUT') return;
    if(e.code==='Space'){ e.preventDefault(); clickIt(); return; }
    if(e.key==='p'||e.key==='P'){ togglePause(); return; }
    const n=parseInt(e.key,10);
    if(n>=1&&n<=TABS.length){ S.tab=TABS[n-1].id; syncTabs(); }
  });

  let resumed=false;
  const carry=store.getJson(KEYS.defection);
  const saved=store.get(KEYS.act2);
  if(saved){ try{ S=restore(JSON.parse(saved)); resumed=true; }catch(err){ store.remove(KEYS.act2); } }
  if(!resumed && carry){ applyDefection(carry); store.remove(KEYS.defection); saveLocal(); }
  else if(carry && resumed){ store.remove(KEYS.defection); }
  resetView();
  mountChallengeBanner(document.querySelector('header .wrap'),'challenge');
  mountSoundToggle(document.querySelector('.topbar'),'iconbtn soundbtn');
  S.paused=true;
  if(S.ended){ render(); showEnding(S.ended); }
  else { showIntro(resumed); render(); }

  let acc=0,last=performance.now();
  requestAnimationFrame(function frame(now){
    const dt=Math.min((now-last)/1000,0.5); last=now; acc+=dt;
    let n=0; while(acc>=TICK && n<80){ step(TICK); acc-=TICK; n++; }
    render();
    requestAnimationFrame(frame);
  });
}
function togglePause(){
  if(S.ended) return;
  S.paused=!S.paused;
  setText($('btnPause'), S.paused?'▶':'⏸');
}
boot();

/* test harness */
window.__G=()=>S; window.__set=s=>{S=s; resetView();}; window.__step=step; window.__rates=rates; window.__dse=dse; window.__endGame=endGame; window.__save=saveLocal;
window.__api={mile,toMile,buy,buyResearch,buyStructure,buyDark,snipe,sendMemo,doClick,doRaise,doPublish,cost,snipeCost,
  snipeOdds,memoCost,BUILDINGS,RESEARCH,STRUCTURE,DARK,PEOPLE,fresh,ps,P,coagDrag,coagRateNow,publishCost,raiseRate};
