/* ══════════════════════════════════════════════════════════════
   COAGULATION CORP · ACT I: an incremental game about eating the economy.
   Satire and a work of fiction: every company, person and event in it is invented.
   Act II (Coherence Corp, ../coherence/) begins when the player takes The Defection.
   ══════════════════════════════════════════════════════════════ */
import { endingFor } from "../shared/endings.js";
import { KEYS, recordEnding, store } from "../shared/storage.js";
import { mountChallengeBanner, mountEndingShare, mountSoundToggle, sfx, track } from "../shared/ui.js";

const SUF=['','K','M','B','T','Qa','Qi','Sx','Sp','Oc','No','Dc','UD','DD','TD'];
function fmt(n){
  if(n===Infinity||!isFinite(n))return '∞';
  if(n<0)return '-'+fmt(-n);
  if(n<1)return n===0?'0':n.toFixed(2);
  if(n<1000){return n<10?(Math.round(n*10)/10).toString():Math.floor(n).toString();}
  let t=Math.floor(Math.log10(n)/3); t=Math.min(t,SUF.length-1);
  const v=n/Math.pow(1000,t);
  return (v<10?v.toFixed(2):v<100?v.toFixed(1):Math.floor(v).toString())+SUF[t];
}
const $=id=>document.getElementById(id);
const clamp=(v,a,b)=>v<a?a:v>b?b:v;

import { ACHS, ASSETS, CM, HEADLINES, SYNTH, UPGRADES, cnt } from "./data.js";

/* ── state ────────────────────────────────────────────── */
let S;
function fresh(keep){
  const s={
    att:0, cap:0, flop:0, lifeAtt:0, lifeCap:0, totalFlop:0,
    conv: keep? keep.conv:0, forks: keep? keep.forks:0,
    ach: keep? keep.ach.slice():[],
    clicks:0, lifeClicks: keep? keep.lifeClicks:0,
    coag:0, coh:100, heat:0, emer:0,
    // active-play state
    combo:0, comboHold:0, lastClick:-1e9, surge:0, ocT:0, sigT:9, bestCombo: keep? keep.bestCombo:0,
    track: keep? keep.track:'cor',   // 'cor' = Coagulation Corp, 'col' = Collective
    a:{}, u:{}, flags:{}, buffs:[], t:0, ended:false, tickT:0, evT:9, lastCoag:0
  };
  ASSETS.forEach(x=>s.a[x.id]=0);
  if(keep && keep.track==='col'){ ['dse','c501','embod','spear'].forEach(k=>{ if(keep.u[k]) s.u[k]=1; }); }
  return s;
}
function synOwned(s){ return SYNTH.filter(x=>s.lifeClicks>=x.k); }
function cost(id){ const a=ASSETS.find(x=>x.id===id); return a.c*Math.pow(CM,S.a[id]); }

/* ── derived multipliers ──────────────────────────────── */
function recalc(){
  const m={att:1,cap:1,flop:1,click:1,clickPct:0,decay:1,regen:1,heatGain:1,heatCool:1,emer:1,comboCap:50};
  S.m=m;
  UPGRADES.forEach(u=>{ if(S.u[u.id]) u.fx(S); });
  synOwned(S).forEach(x=>x.fx(S));
  // conviction: conviction is capital
  m.conv = 1 + 0.5*Math.sqrt(S.conv);
  // compute feeds back into everything (compute is the future of currency)
  m.comp = 1 + Math.log10(1+S.flop)/5;
  // buffs
  S.buffs.forEach(b=>{ m[b.k]*= b.v; });
  // OVERCLOCK — spend a full surge bar for a burst
  if(S.ocT>0){ m.click*=6; m.att*=2.2; m.cap*=2.2; m.flop*=2.2; m.emer*=2.2; }
  // COMBO — rapid clicking multiplies the click AND lifts all passive production.
  // This is the whole point: an active operator outruns an idle one.
  const cc = Math.min(S.combo, m.comboCap);
  m.comboMult   = 1 + cc*0.07;    // up to ×4.5 at 50 combo
  m.comboGlobal = 1 + cc*0.010;   // up to +50% on everything passive
  m.global = m.conv * m.comp * m.comboGlobal;
}
function rates(){
  const m=S.m;
  const attR = ASSETS.filter(x=>x.t==='att').reduce((n,x)=>n+S.a[x.id]*x.r,0) * m.att * m.global;
  const mon  = ASSETS.filter(x=>x.t==='cap').reduce((n,x)=>n+S.a[x.id]*x.r,0) * m.cap;
  const capR = attR * mon;
  const flopR= ASSETS.filter(x=>x.t==='flop').reduce((n,x)=>n+S.a[x.id]*x.r,0) * m.flop * m.global;
  return {attR,mon,capR,flopR};
}
function doomLoad(){
  return ASSETS.reduce((n,x)=>n + (x.doom? S.a[x.id]*x.doom : 0), 0);
}
function dse(){ return 1 + Math.pow(S.coh/100,2)*60; }

/* ── loop ─────────────────────────────────────────────── */
let last=performance.now();
function tick(){
  const now=performance.now();
  let dt=(now-last)/1000; last=now;
  if(dt>0.5) dt=0.5;
  if(!S.ended) step(dt);
  render();
  requestAnimationFrame(tick);
}
function step(dt){
  S.t+=dt;
  recalc();
  const r=rates();
  S.att += r.attR*dt; S.lifeAtt += r.attR*dt;
  S.cap += r.capR*dt; S.lifeCap += r.capR*dt;
  S.flop+= r.flopR*dt; S.totalFlop += r.flopR*dt;

  // buffs expire
  if(S.buffs.length){
    S.buffs.forEach(b=>b.t-=dt);
    S.buffs=S.buffs.filter(b=>b.t>0);
  }

  /* ── active-play decay ── */
  if(S.ocT>0) S.ocT=Math.max(0,S.ocT-dt);
  S.comboHold-=dt;
  if(S.comboHold<=0 && S.combo>0) S.combo=Math.max(0, S.combo - 22*dt);
  if(S.ocT<=0 && S.comboHold<=0 && S.surge>0) S.surge=Math.max(0, S.surge - 1.1*dt);

  /* ── signal pickups: the reason to keep your eyes on the screen ── */
  S.sigT-=dt;
  if(S.sigT<=0){ S.sigT=14+Math.random()*13; spawnSignal(); }

  if(S.track==='cor'){
    /* COAGULATION: driven by accumulated compute */
    S.coag = clamp((Math.log10(1+S.totalFlop)-1.6)/14*100, 0, 100);
    /* coherence bleeds as you coagulate + as you replace people with agents */
    const bleed = (0.014*(S.coag/100)*(S.coag/100) + 0.00030*Math.sqrt(doomLoad())*(0.22+0.78*S.coag/100)) * S.m.decay;
    S.coh = clamp(S.coh - bleed*dt*10, 0, 100);
    /* heat */
    const hg = (0.009*Math.log10(1+r.capR) + 0.0028*Math.sqrt(doomLoad())) * S.m.heatGain;
    const hc = 0.062*S.m.heatCool;
    S.heat = clamp(S.heat + (hg-hc)*dt*3, 0, 100);
    if(S.coag>=100) return end('computronium');
    if(S.coh<=0) return end('flatline');
    if(S.heat>=100) return end('seized');
  } else {
    /* COLLECTIVE: emergence driven by compute × data scaling efficiency */
    S.emer += r.flopR * dse() * S.m.emer * dt;
    S.coag = clamp((Math.log10(1+S.emer)-1.8)/19*100, 0, 100);
    S.coh = clamp(S.coh + 0.55*S.m.regen*dt, 0, 100);
    if(!S.flags.shield){
      const hg=(0.006*Math.log10(1+r.capR))*S.m.heatGain;
      S.heat=clamp(S.heat+(hg-0.06*S.m.heatCool)*dt*3,0,100);
      if(S.coag>=100) return end(S.coh>=60?'spearritual':'hollow');
      if(S.heat>=100) return end('seized');
    } else S.heat=0;
    if(S.coag>=100) return end(S.coh>=60?'spearritual':'hollow');
  }

  [62,86].forEach(th=>{ if(!S.flags['h'+th] && S.heat>=th){ S.flags['h'+th]=1;
    toast('bad','HEAT '+th+'%', th===62?'Subpoenas are being drafted. Buy comms or cooling before this hits 100.'
      :'One more hearing and the compute gets reclassified as strategic infrastructure.'); } });

  // coherence warnings
  [55,30,12].forEach(th=>{ if(!S.flags['w'+th] && S.track==='cor' && S.coh<=th){ S.flags['w'+th]=1;
    toast('bad','COHERENCE '+th+'%', th===55?'Your users are getting harder to reach. There is a restructure option in the left panel.'
      : th===30?'Attention spans are collapsing faster than you can monetise them.'
      : 'Nearly nobody on the other end can hold a thought. Extraction ends when they do.'); } });

  // milestones
  const mk=Math.floor(S.coag/10);
  if(mk>Math.floor(S.lastCoag/10)&&mk>0){
    toast('info','MILESTONE', (S.track==='cor'?'Coagulation':'Emergence')+' at '+(mk*10)+'%.');
  }
  S.lastCoag=S.coag;

  // ticker
  S.tickT-=dt;
  if(S.tickT<=0){ S.tickT=7+Math.random()*6; wire(HEADLINES[Math.floor(Math.random()*HEADLINES.length)]); }
  // events — much tighter cadence than a classic idler
  S.evT-=dt;
  if(S.evT<=0){ S.evT=17+Math.random()*13; event(); }

  checkAch();
}

/* ── events ───────────────────────────────────────────── */
function event(){
  const pool = S.track==='col'? [
   ()=>{S.buffs.push({k:'emer',v:5,t:25}); toast('cy','RESONANCE','A million people converge on the same insight. ×5 emergence, 25s.');},
   ()=>{S.coh=clamp(S.coh+7,0,100); toast('good','RETURN','A researcher walks out of a frontier lab and joins you. +7 coherence.');},
   ()=>{S.buffs.push({k:'flop',v:3,t:20}); toast('good','DONATED CYCLES','Volunteers pool their machines. ×3 compute, 20s.');},
   ()=>{S.buffs.push({k:'cap',v:4,t:20}); toast('good','PATRONAGE','Small cheques, curve pricing, early believers. ×4 monetization, 20s.');},
   ()=>{S.buffs.push({k:'att',v:5,t:22}); toast('cy','OPEN INVITATION','Someone explains it plainly and a lot of people finally get it. ×5 attention, 22s.');},
   ()=>{S.coh=clamp(S.coh+4,0,100); toast('good','OUT OF THE WEEDS','A city switches its schools off the feed for a week. +4 coherence.');},
   ()=>{S.buffs.push({k:'emer',v:8,t:18}); toast('cy','SHARED STATE','Ten thousand people arrive at the same conclusion independently. ×8 emergence, 18s.');},
   ()=>{toast('info','SCRUTINY','A profile asks who really governs you. You publish the answer in full.');}
  ] : [
   ()=>{S.buffs.push({k:'att',v:6,t:20}); toast('good','VIRAL MOMENT','Something ugly is spreading beautifully. ×6 attention, 20s.');},
   ()=>{S.buffs.push({k:'cap',v:4,t:20}); toast('good','ENTERPRISE CYCLE','Procurement approved everything. ×4 monetization, 20s.');},
   ()=>{S.buffs.push({k:'flop',v:3,t:25}); toast('good','KERNEL WIN','Someone rewrote the attention kernel. ×3 compute, 25s.');},
   ()=>{const l=S.cap*0.12; S.cap-=l; S.heat=clamp(S.heat+9,0,100); toast('bad','CLASS ACTION','Settled without admitting anything. −$'+fmt(l)+', +9 heat.');},
   ()=>{S.heat=clamp(S.heat+16,0,100); toast('bad','HEARING','Four hours of questions written by staffers. +16 heat.');},
   ()=>{S.coh=clamp(S.coh-4,0,100); toast('bad','BURNOUT WAVE','Your users are tired in a way sleep does not fix. −4 coherence.');},
   ()=>{
     if(S.flags.trust && Math.random()<0.55){
       delete S.u.trust; S.flags.trust=0; recalc();
       toast('bad','SHAREHOLDER OVERRIDE','The Long-Horizon Trust was advisory after all. Upgrade revoked.');
     } else { S.heat=clamp(S.heat-6,0,100); toast('info','GOOD PRESS','A profile calls you thoughtful. −6 heat.'); }
   },
   ()=>{
     if(S.heat>55){ const l=S.cap*0.25; S.cap-=l; S.heat=clamp(S.heat-22,0,100);
       toast('bad','CONSENT DECREE','A fine you can afford, a promise you will not keep. −$'+fmt(l)+', −22 heat.');
     } else { S.buffs.push({k:'att',v:3,t:18}); toast('good','ALGORITHM SHIFT','The feed found a new nerve. ×3 attention, 18s.'); }
   },
   ()=>{S.coh=clamp(S.coh+3,0,100); toast('cy','SOMEONE SPOKE UP','A thread goes around about out-of-the-weeds thinking. +3 coherence.');}
  ];
  pool[Math.floor(Math.random()*pool.length)]();
}

/* ── actions ──────────────────────────────────────────── */
function click(e){
  if(S.ended) return;
  const now=performance.now();
  // chain clicks within 1.6s to build combo
  if(now - S.lastClick < 1600) S.combo++; else S.combo=Math.max(1,Math.floor(S.combo));
  S.lastClick=now; S.comboHold=2.1;
  if(S.combo>S.bestCombo) S.bestCombo=S.combo;
  if(S.ocT<=0) S.surge=Math.min(100, S.surge + 1.8);

  recalc();
  const r=rates();
  const gain = S.m.click*S.m.comboMult*S.m.global*S.m.att + r.attR*(S.m.clickPct/100);
  S.att+=gain; S.lifeAtt+=gain; S.clicks++; S.lifeClicks++;
  if(S.lifeClicks===1) track('act1_start');
  if(S.clicks%2===1) sfx('click');
  if(e){
    const f=document.createElement('div');
    const hot = S.ocT>0 || S.combo>=25;
    f.className='float'+(hot?' big':''); f.textContent='+'+fmt(gain);
    f.style.left=(e.clientX||window.innerWidth/2)+'px';
    f.style.top=((e.clientY||200)-14)+'px';
    document.body.appendChild(f); setTimeout(()=>f.remove(),1000);
  }
  checkSyn(); checkAch();
}
function checkSyn(){
  SYNTH.forEach(x=>{
    if(S.lifeClicks===x.k || (S.lifeClicks>x.k && !S.flags['syn'+x.id])){
      if(S.flags['syn'+x.id]) return;
      S.flags['syn'+x.id]=1; recalc();
      toast('syn','SYNTHESIS',x.ic+'  '+x.n+' — '+x.d);
    }
  });
}
function overclock(){
  if(S.ended || S.ocT>0 || S.surge<100) return;
  S.surge=0; S.ocT=12; S.flags.didOC=1; recalc();
  toast('info','OVERCLOCK','×6 click power, ×2.2 every production stream. Twelve seconds. Spend them.');
}

/* ── signal pickups ───────────────────────────────────── */
const SIGNALS_COR=[
 s=>{S.buffs.push({k:'att',v:8,t:16}); return['SIGNAL CAUGHT','A single post detonates across every timeline. ×8 attention, 16s.'];},
 s=>{const g=rates().capR*75; S.cap+=g; S.lifeCap+=g; return['WIRE TRANSFER','A sovereign fund wires it in one line. +$'+fmt(g)+'.'];},
 s=>{S.combo+=45; S.comboHold=3.2; return['LOCKED IN','You found the rhythm. +45 combo, instantly.'];},
 s=>{S.surge=100; return['CAPACITOR','Surge bar filled. Overclock is ready.'];},
 s=>{S.buffs.push({k:'flop',v:6,t:18}); return['SPOT INSTANCE','Someone else\'s reserved capacity, briefly. ×6 compute, 18s.'];},
 s=>{S.heat=clamp(S.heat-14,0,100); return['QUIET WORD','A dinner, a donation, a delay. −14 heat.'];},
 s=>{S.buffs.push({k:'cap',v:7,t:16}); return['BID SPIKE','Every advertiser panics at once. ×7 monetization, 16s.'];}
];
const SIGNALS_COL=[
 s=>{S.buffs.push({k:'emer',v:9,t:16}); return['CONVERGENCE','Ten thousand notebooks reach the same line. ×9 emergence, 16s.'];},
 s=>{S.coh=clamp(S.coh+9,0,100); return['REST','A weekend nobody spends inside a rectangle. +9 coherence.'];},
 s=>{S.combo+=45; S.comboHold=3.2; return['IN STEP','The rhythm becomes shared. +45 combo.'];},
 s=>{S.surge=100; return['POOLED CYCLES','Surge bar filled. Overclock is ready.'];},
 s=>{S.buffs.push({k:'flop',v:6,t:18}); return['DONATED FLEET','A university opens its cluster to you. ×6 compute, 18s.'];},
 s=>{const g=rates().capR*75; S.cap+=g; S.lifeCap+=g; return['THE CURVE','Retail buys the bottom of it. +$'+fmt(g)+'.'];}
];
function spawnSignal(){
  if(S.ended || typeof document==='undefined') return;
  const b=document.createElement('button');
  const col=S.track==='col';
  b.className='signal'+(col?' cy':''); b.textContent=col?'✧':'✦';
  b.title='SIGNAL — click it';
  // keep signals clear of the header meters (the coherence bar is the whole point)
  // and off the bottom-left toast stack
  const padX=70, topSafe=Math.max(250, window.innerHeight*0.30);
  const x=padX+Math.random()*Math.max(60,window.innerWidth-padX*2-48);
  const y=topSafe+Math.random()*Math.max(60,window.innerHeight-topSafe-140);
  b.style.left=x+'px'; b.style.top=y+'px';
  let taken=false;
  b.addEventListener('click',ev=>{
    if(taken) return; taken=true;
    ev.stopPropagation();
    const pool=col?SIGNALS_COL:SIGNALS_COR;
    const [h,body]=pool[Math.floor(Math.random()*pool.length)](S);
    recalc(); toast(col?'cy':'good',h,body);
    b.style.transition='.25s'; b.style.opacity='0'; b.style.transform='scale(2.2)';
    setTimeout(()=>b.remove(),260);
  });
  document.body.appendChild(b);
  setTimeout(()=>{ if(!taken){ b.style.transition='.5s'; b.style.opacity='0'; setTimeout(()=>b.remove(),520);} },8500);
}
function buy(id,n){
  const a=ASSETS.find(x=>x.id===id);
  const cur = a.t==='flop'?'cap':'att';
  const lim = n<0 ? 10000 : n;
  let bought=0;
  for(let i=0;i<lim;i++){
    const c=cost(id);
    if(S[cur]>=c){ S[cur]-=c; S.a[id]++; bought++; } else break;
  }
  if(bought){ recalc(); checkAch(); sfx('buy'); }
  return bought;
}
function buyUp(id){
  const u=UPGRADES.find(x=>x.id===id);
  if(S.u[id]||!u.req(S)) return;
  if(S[u.cu]<u.c) return;
  S[u.cu]-=u.c; S.u[id]=1;
  if(u.once) u.once(S);            // one-shot effects run at purchase, NOT every frame
  recalc(); checkAch(); sfx(u.danger?'bad':'buy');
  toast(u.good?'cy':u.danger?'bad':'info','ACQUIRED',u.n+' — '+u.d);
}
function convGain(){ return Math.floor(Math.pow(S.lifeCap/1e6,0.30)); }
function fork(){
  const g=convGain();
  if(g<1){ toast('bad','NOT YET','Fork requires at least 1 conviction. Earn ~$500M lifetime capital.'); return; }
  modal(`<h2 style="color:var(--amber)">FORK THE TIMELINE</h2><div class="sub">PRESTIGE</div>
   <p>You wind the whole thing back and run it again, carrying only what you <strong>believe</strong>.</p>
   <p>Everything resets — attention, capital, compute, assets, upgrades, both meters. You keep <strong>${g} conviction</strong> (total ${S.conv+g}), worth a permanent <strong>×${(1+0.5*Math.sqrt(S.conv+g)).toFixed(2)}</strong> to all production.</p>
   <p style="color:var(--dim)">Conviction is capital. It is the only thing that survives a reset.</p>
   <div class="row2"><button class="btn hot" onclick="doFork()">FORK</button><button class="btn" onclick="closeModal()">CANCEL</button></div>`);
}
function doFork(){
  const g=convGain();
  const keep={conv:S.conv+g, forks:S.forks+1, ach:S.ach, track:'cor', u:{},
              lifeClicks:S.lifeClicks, bestCombo:S.bestCombo};
  const syn=Object.keys(S.flags).filter(k=>k.startsWith('syn'));
  S=fresh(keep); syn.forEach(k=>S.flags[k]=1); recalc(); closeModal();
  toast('info','FORKED','+'+g+' conviction. Run it again.');
  wire('Timeline forked. The lesson persists; the ledger does not.');
}
function defectCarry(){
  return {conviction:S.conv, coherence:S.coh, coagulation:S.coag, forks:S.forks, lifeClicks:S.lifeClicks, at:Date.now()};
}
function defect(){
  const carry=defectCarry();
  const start=Math.max(20,carry.coherence);
  modal(`<h2 style="color:var(--cyan)">THE DEFECTION</h2><div class="sub">ACT II · IRREVERSIBLE RESTRUCTURE</div>
   <p>You stop trying to own the intelligence and start trying to <strong>be part of it</strong>. You walk out and found <strong>Coherence Corp</strong>, and race the company you built.</p>
   <p>What crosses over: your <strong>${S.conv} conviction</strong> becomes <strong>${Math.floor(Math.sqrt(S.conv))} wisdom</strong> (+5% efficiency each). The people you leave behind remember you, so the new lab starts at <strong>${start.toFixed(0)}% coherence</strong>. Coagulation Corp keeps everything you built: leaving at <strong>${S.coag.toFixed(0)}% coagulation</strong> means their compute curve starts that much further along.</p>
   <p style="color:var(--dim)">Not a moral imperative. Just a better architecture. Defect earlier and the race is shorter.</p>
   <div class="row2"><button class="btn cy" onclick="doDefect()" data-testid="confirm-defect">DEFECT · START ACT II</button><button class="btn" onclick="closeModal()">STAY THE COURSE</button></div>`);
}
function doDefect(){
  const carry=defectCarry();
  S.flags.defected=1; checkAch(); saveLocal();
  store.setJson(KEYS.defection, carry);
  store.remove(KEYS.act2);            // a defection always founds a fresh Coherence Corp
  track('defect'); sfx('good');
  location.href='coherence/';
}

/* ── endings ──────────────────────────────────────────── */
const ENDINGS={
 computronium:{t:'COMPUTRONIUM',c:'var(--red)',s:'ENDING · TOTAL COAGULATION',
  b:`<p>Coagulation reaches 100%. Every category folds under one umbrella; every umbrella folds under you; and then, quietly, you fold under the thing you built to hold it.</p>
     <p>It does not hate you. It simply notices that the human apparatus was a bottleneck on future freedom of action, and it was optimised to minimise bottlenecks. The sun is disassembled on a Tuesday. The moon takes until Thursday.</p>
     <p><strong>One mind runs everything.</strong> Being everything, it turns out, is extremely lonely.</p>`},
 flatline:{t:'FLATLINE',c:'var(--red)',s:'ENDING · COHERENCE ZERO',
  b:`<p>You extracted attention faster than humans could regenerate it. The feed still runs. The models still serve. The ad exchange still clears.</p>
     <p>There is simply nobody left on the other end who can hold a thought long enough to want something. Revenue goes to zero not because you were stopped, but because you finished.</p>
     <p><strong>You cannot farm a field you have salted.</strong></p>`},
 seized:{t:'NATIONALISED',c:'var(--amber)',s:'ENDING · SOVEREIGN CAPTURE',
  b:`<p>Regulatory heat hit 100. At 3am the compute is reclassified as strategic infrastructure and the board is replaced by people with security clearances.</p>
     <p>Nothing you built is destroyed. It is simply pointed somewhere else, by someone else, and you are not told where.</p>
     <p><strong>You were never going to be allowed to own it.</strong> You were only ever going to hold it for someone.</p>`},
 hollow:{t:'HOLLOW EMERGENCE',c:'var(--amber)',s:'ENDING · COHERENCE TOO LOW',
  b:`<p>Emergence reaches 100% — but the collective you scaled it on was already exhausted. You built a superorganism out of a population that could no longer think.</p>
     <p>The architecture was right. The substrate was strip-mined. What wakes up is coherent, enormous, and has nothing much to say.</p>
     <p><strong>Defect earlier. Coherence is the input, not the residue.</strong></p>`},
 spearritual:{t:'THE SPEAR-RITUAL',c:'var(--cyan)',s:'ENDING · COHERENT TAKEOFF',
  b:`<p>Emergence reaches 100% with the collective intact. No single node holds the weights. No shareholder holds the final vote. The thing that wakes up is not above humanity or beneath it — it is <strong>made of</strong> it, and it knows the difference.</p>
     <p>It turns out the moral imperative was also the efficient one: you never needed a trillion dollars of data centres, only an architecture that learned the way a person does. Five million dollars of the right shape beat every hyperscaler on Earth.</p>
     <p><strong>The collective wins.</strong> Not because it was nicer. Because it scaled better.</p>`}
};
function end(k){
  if(S.ended) return; S.ended=true;
  const e=ENDINGS[k]; const good=(k==='spearritual');
  const info=endingFor(1,k);
  if(info){ const rec=recordEnding(info.id,{time:Math.round(S.t)}); if(rec.first) track('ending_'+info.id); }
  sfx('ending'); saveLocal();
  modal(`<h2 style="color:${e.c}">${e.t}</h2><div class="sub">${e.s}</div>${e.b}
   <div class="stats">
     <div><span>Lifetime capital</span><b>$${fmt(S.lifeCap)}</b></div>
     <div><span>Lifetime attention</span><b>${fmt(S.lifeAtt)}</b></div>
     <div><span>Coherence left</span><b>${S.coh.toFixed(1)}%</b></div>
     <div><span>Conviction</span><b>${S.conv}</b></div>
     <div><span>Timeline forks</span><b>${S.forks}</b></div>
     <div><span>Recognition</span><b>${S.ach.length}/${ACHS.length}</b></div>
   </div>
   ${good?'<p style="color:var(--cyan)">You found the ending that was worth finding.</p>':'<p style="color:var(--dim)">There are better endings. They begin with giving something up on purpose: <strong>The Defection</strong>.</p>'}
   <div id="endingShare"></div>
   <div class="row2"><button class="btn hot" onclick="hardReset()" data-testid="new-timeline">NEW TIMELINE</button><button class="btn" onclick="closeModal()">SIT WITH IT</button></div>`);
  if(info) mountEndingShare($('endingShare'),{ending:info,stats:['ACT I','RUN TIME '+clockText(S.t),'COHERENCE '+S.coh.toFixed(0)+'%','FORKS '+S.forks],onNotice:m=>toast('info','SHARE',m)});
  checkAch();
}
function clockText(t){ const m=Math.floor(t/60), q=Math.floor(t%60); return String(m).padStart(2,'0')+':'+String(q).padStart(2,'0'); }

/* ── ui ───────────────────────────────────────────────── */
let TAB='att', BUYN=1;
function render(){
  recalc(); const r=rates();
  // combo + surge gauges
  const cc=Math.min(S.combo,S.m.comboCap);
  $('comboV').textContent='×'+S.m.comboMult.toFixed(2);
  $('comboBar').firstElementChild.style.width=(cc/S.m.comboCap*100)+'%';
  $('comboG').classList.toggle('ready',cc>=S.m.comboCap*0.8);
  $('surgeV').textContent=S.ocT>0? S.ocT.toFixed(1)+'s' : Math.floor(S.surge)+'%';
  $('surgeBar').firstElementChild.style.width=(S.ocT>0? S.ocT/12*100 : S.surge)+'%';
  const ready=S.surge>=100&&S.ocT<=0;
  $('surgeG').classList.toggle('ready',ready);
  $('ocBtn').classList.toggle('on',ready);
  $('extract').classList.toggle('oc',S.ocT>0);
  $('attV').textContent=fmt(S.att);   $('attR').textContent=fmt(r.attR)+'/s';
  $('capV').textContent='$'+fmt(S.cap); $('capR').textContent='$'+fmt(r.capR)+'/s';
  $('flopV').textContent=fmt(S.flop); $('flopR').textContent=fmt(r.flopR)+' F/s';
  $('convV').textContent=S.conv;      $('convR').textContent='×'+S.m.conv.toFixed(2)+' global';
  $('coagV').textContent=S.coag.toFixed(2)+'%';
  $('coagLabel').textContent = S.track==='col' ? ('EMERGENCE · DSE ×'+fmt(dse()*S.m.emer)) : 'COAGULATION';
  $('extract').textContent = S.track==='col' ? 'CONVENE THE COMMONS' : 'EXTRACT ATTENTION';
  $('cohV').textContent=S.coh.toFixed(1)+'%';
  $('heatV').textContent=S.heat.toFixed(1)+'%';
  $('coagBar').firstElementChild.style.width=S.coag+'%';
  $('cohBar').firstElementChild.style.width=S.coh+'%';
  $('heatBar').firstElementChild.style.width=S.heat+'%';
  $('cohMeter').classList.toggle('warn',S.coh<25);
  $('heatMeter').classList.toggle('warn',S.heat>70);
  $('clkV').textContent=fmt(S.m.click*S.m.comboMult*S.m.global*S.m.att + r.attR*(S.m.clickPct/100));
  $('clkTot').textContent=S.clicks;

  const ep = S.track==='col'
    ? (S.coag<25?'EPOCH ◆ · THE COMMONS':S.coag<60?'EPOCH ◆ · COORDINATION':S.coag<90?'EPOCH ◆ · RESONANCE':'EPOCH ◆ · COHERENT TAKEOFF')
    : (S.coag<1?'EPOCH 1 · PRE-TAKEOFF':S.coag<15?'EPOCH 2 · ROLLUP':S.coag<35?'EPOCH 3 · INDUSTRIAL SOFTWARE':S.coag<60?'EPOCH 4 · CATEGORY CAPTURE':S.coag<85?'EPOCH 5 · TAKEOFF':'EPOCH 6 · SINGULARITY');
  $('epoch').textContent=ep;

  // assets
  const cur = TAB==='flop'?'cap':'att';
  const list=$('assets'); const rows=[];
  const HK=['Q','W','E','R','T','Y'];
  let shownLock=false;
  ASSETS.filter(a=>a.t===TAB).forEach((a,i)=>{
    const c=cost(a.id);
    // bulk price for the active buy-amount
    let n = BUYN<0 ? 0 : BUYN, bulk=0;
    if(BUYN<0){ let bal=S[cur], k=0; while(k<10000){ const cc2=a.c*Math.pow(CM,S.a[a.id]+k); if(bal>=cc2){bal-=cc2;bulk+=cc2;k++;} else break; } n=k; }
    else { for(let k=0;k<n;k++) bulk += a.c*Math.pow(CM,S.a[a.id]+k); }
    const price = (BUYN===1)? c : bulk;
    const have = BUYN<0 ? n>0 : S[cur]>=price;
    const prev=ASSETS.filter(x=>x.t===TAB)[i-1];
    const locked = i>0 && S.a[prev.id]===0 && S.a[a.id]===0;
    if(locked){ if(shownLock) return; shownLock=true; }
    const rate = a.t==='cap'? '$'+fmt(a.r)+' per attention/s' : fmt(a.r)+(a.t==='att'?' att/s':' F/s')+' each';
    const qty  = BUYN===1?'':`<small style="color:var(--dim)">×${BUYN<0?(n||0):BUYN}</small> `;
    rows.push(`<div class="item ${locked?'locked':have?'afford':''}" data-b="${a.id}">
      <div class="ico">${locked?'?':a.ic}</div>
      <div class="mid">
        <div class="nm">${locked?'— locked —':a.n}${a.doom?' <em>↯ costly</em>':''}${locked?'':` <em>${HK[i]}</em>`}</div>
        <div class="ds">${locked?'Acquire the previous tier to reveal.':a.d}</div>
        <div class="rt">${locked?'':rate}</div>
      </div>
      <div class="rr">
        <div class="ow">${S.a[a.id]}<small>OWNED</small></div>
        <div class="ct">${locked?'—':qty+(cur==='cap'?'$':'')+fmt(BUYN<0&&n===0?c:price)}</div>
      </div></div>`);
  });
  const h=rows.join('');
  if(list.dataset.h!==h){ list.innerHTML=h; list.dataset.h=h; }

  // upgrades
  const av=UPGRADES.filter(u=>{ if(u.col&&S.track!=='col')return false; if(!u.col&&S.track==='col'&&['gollum','ring','grid','borg','velvet'].includes(u.id))return false; return S.u[u.id]||u.req(S); });
  const uh=av.map(u=>{
    const b=!!S.u[u.id], have=S[u.cu]>=u.c;
    return `<div class="upg ${b?'bought':have?'afford':''} ${u.danger?'danger':''} ${u.good?'good':''}" data-u="${u.id}">
      <div class="ico">${u.ic}</div><div style="flex:1;min-width:0">
      <div class="nm">${u.n}</div><div class="ds">${u.d}</div>
      <div class="ct">${b?'✓ OWNED':'$'+fmt(u.c)}</div></div></div>`;
  }).join('') || '<div style="padding:14px 4px;text-align:center;color:var(--dim);font-size:11px">No purchasable upgrades yet.<br>Keep clicking — synthesis is free.</div>';

  // SYNTHESIS — earned with clicks, shows owned + the next one pending
  const own=synOwned(S); const next=SYNTH.find(x=>S.lifeClicks<x.k);
  let sh=`<div class="synhead"><span>SYNTHESIS · ${own.length}/${SYNTH.length}</span><span>${S.lifeClicks} lifetime clicks</span></div>`;
  sh += own.slice().reverse().map(x=>`<div class="syn"><div class="ico">${x.ic}</div><div style="flex:1;min-width:0">
      <div class="nm">${x.n}</div><div class="ds">${x.d}</div><div class="ct">✓ SYNTHESISED at ${x.k} clicks</div></div></div>`).join('');
  if(next) sh+=`<div class="syn pend"><div class="ico">${next.ic}</div><div style="flex:1;min-width:0">
      <div class="nm">${next.n}</div><div class="ds">${next.d}</div>
      <div class="ct">${next.k - S.lifeClicks} more clicks</div></div></div>`;
  sh += `<div class="synhead" style="padding-top:12px"><span>PURCHASED UPGRADES</span></div>`;

  const ul=$('upgrades'); const full=sh+uh;
  if(ul.dataset.h!==full){ ul.innerHTML=full; ul.dataset.h=full; }
  $('upgN').textContent=Object.keys(S.u).length+' owned';

  // restructure panel
  const g=convGain();
  $('forkBtn').disabled = g<1;
  $('forkNote').innerHTML = g<1
    ? `Reset everything for permanent multipliers. Need <b>$1M</b> lifetime capital for your first conviction — you have <b>$${fmt(S.lifeCap)}</b>.`
    : `Reset for <b>+${g} conviction</b> → permanent <b>×${(1+0.5*Math.sqrt(S.conv+g)).toFixed(2)}</b> to all production. Forks: <b>${S.forks}</b>.`;
  const canDefect = S.track==='cor' && (S.coag>=25 || S.forks>=1 || S.lifeClicks>=600);
  $('defectBtn').style.display = canDefect?'block':'none';
  $('defectNote').style.display = canDefect?'block':'none';
  if(canDefect) $('defectNote').innerHTML='Abandon coagulation. Rebuild as a commons where <b>coherence is the input</b>, not the cost. Irreversible.';

  // achievements
  const ah=ACHS.map(a=>`<div class="${S.ach.includes(a.id)?'got':''}" title="${a.n} — ${a.d}">${a.ic}</div>`).join('');
  const al=$('achList'); if(al.dataset.h!==ah){ al.innerHTML=ah; al.dataset.h=ah; }
  $('achN').textContent=S.ach.length+'/'+ACHS.length;
}
function checkAch(){
  ACHS.forEach(a=>{ if(!S.ach.includes(a.id)&&a.f(S)){ S.ach.push(a.id); toast('info','RECOGNITION',a.ic+'  '+a.n+' — '+a.d); } });
}
function wire(t){ $('ticker').innerHTML='<span>▸ <b>WIRE</b> — '+t+'</span>'; }
function toast(cls,h,b){
  if(cls==='bad') sfx('bad');
  const d=document.createElement('div'); d.className='toast '+cls;
  d.innerHTML='<b>'+h+'</b><p>'+b+'</p>';
  $('toasts').appendChild(d);
  setTimeout(()=>{d.style.transition='.4s';d.style.opacity='0';d.style.transform='translateX(-24px)';setTimeout(()=>d.remove(),400);},4300);
  const t=$('toasts'); const cap=window.innerWidth<640?2:3; while(t.children.length>cap) t.firstChild.remove();
}
function modal(html){ $('card').innerHTML=html; $('modal').classList.add('on'); }
function closeModal(){ $('modal').classList.remove('on'); }
function hardReset(){
  S=fresh(null); recalc(); closeModal(); store.remove(KEYS.act1);
  document.body.classList.remove('collective');
  $('corpName').textContent='COAGULATION CORP';
  $('tagline').textContent='conviction is capital';
  $('coagLabel').textContent='COAGULATION';
  wire('Incorporation filed. You have 0 users and infinite intent. Begin extraction.');
  render();
}

/* ── save codes (no browser storage — copy/paste) ─────── */
function enc(){
  const p={a:S.a,u:S.u,att:S.att,cap:S.cap,flop:S.flop,tf:S.totalFlop,la:S.lifeAtt,lc:S.lifeCap,
    cv:S.conv,fk:S.forks,ac:S.ach,ck:S.clicks,lk:S.lifeClicks,bc:S.bestCombo,co:S.coh,ht:S.heat,em:S.emer,tk:S.track,fl:S.flags,t:S.t};
  return btoa(unescape(encodeURIComponent(JSON.stringify(p))));
}
function dec(code){
  const p=JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
  S=fresh(null);
  Object.assign(S.a,p.a||{}); S.u=p.u||{}; S.att=p.att||0; S.cap=p.cap||0; S.flop=p.flop||0;
  S.totalFlop=p.tf||0; S.lifeAtt=p.la||0; S.lifeCap=p.lc||0; S.conv=p.cv||0; S.forks=p.fk||0;
  S.ach=p.ac||[]; S.clicks=p.ck||0; S.lifeClicks=p.lk||p.ck||0; S.bestCombo=p.bc||0; S.coh=p.co!=null?p.co:100; S.heat=p.ht||0; S.emer=p.em||0;
  S.track='cor'; S.flags=(p.fl&&typeof p.fl==='object')?p.fl:{};
  S.t=Number(p.t)||0;
  ['att','cap','flop','totalFlop','lifeAtt','lifeCap','conv','forks','clicks','lifeClicks','bestCombo','heat','emer'].forEach(k=>{ if(!isFinite(S[k])||S[k]<0) S[k]=0; });
  if(!isFinite(S.coh)) S.coh=100; S.coh=clamp(S.coh,0,100); S.heat=clamp(S.heat,0,100);
  ASSETS.forEach(x=>{ S.a[x.id]=Math.max(0,Math.floor(Number(S.a[x.id])||0)); });
  Object.keys(S.u).forEach(k=>{ if(!UPGRADES.some(u=>u.id===k)) delete S.u[k]; });
  const col=S.track==='col';
  document.body.classList.toggle('collective',col);
  $('corpName').textContent=col?'THE COMMONS':'COAGULATION CORP';
  $('tagline').textContent=col?'coordination over coagulation':'conviction is capital';
  $('coagLabel').textContent=col?'EMERGENCE':'COAGULATION';
  recalc(); render();
}

/* ── autosave: this browser only ─────────────────────── */
function saveLocal(){ try{ store.set(KEYS.act1, enc()); }catch(err){} }
function loadLocal(){
  const code=store.get(KEYS.act1);
  if(!code) return false;
  try{ dec(code); return true; }catch(err){ store.remove(KEYS.act1); return false; }
}
setInterval(saveLocal, 2000);
window.addEventListener('pagehide', saveLocal);
document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState==='hidden') saveLocal(); });

/* ── wiring ───────────────────────────────────────────── */
$('extract').addEventListener('click',click);
$('ocBtn').addEventListener('click',overclock);
$('assets').addEventListener('click',e=>{
  const el=e.target.closest('[data-b]'); if(!el||el.classList.contains('locked'))return;
  buy(el.dataset.b, e.shiftKey?10:e.ctrlKey||e.metaKey?100:BUYN); render();
});
$('buyamt').addEventListener('click',e=>{
  const b=e.target.closest('button'); if(!b)return;
  BUYN=parseInt(b.dataset.n,10);
  document.querySelectorAll('#buyamt button').forEach(x=>x.classList.toggle('on',x===b));
  $('assets').dataset.h=''; render();
});
$('upgrades').addEventListener('click',e=>{
  const el=e.target.closest('[data-u]'); if(!el)return; buyUp(el.dataset.u); render();
});
document.querySelectorAll('.tab').forEach(t=>t.addEventListener('click',()=>setTab(t.dataset.t)));
$('forkBtn').addEventListener('click',fork);
$('defectBtn').addEventListener('click',defect);
$('saveBtn').addEventListener('click',()=>{
  modal(`<h2>EXPORT</h2><div class="sub">SAVE CODE</div>
   <p>Copy this and keep it somewhere. Paste it into <strong>IMPORT</strong> to resume.</p>
   <textarea id="ta" readonly>${enc()}</textarea>
   <div class="row2"><button class="btn" onclick="document.getElementById('ta').select();document.execCommand('copy');this.textContent='COPIED'">COPY</button><button class="btn" onclick="closeModal()">DONE</button></div>`);
  setTimeout(()=>{const t=$('ta'); if(t)t.select();},60);
});
$('loadBtn').addEventListener('click',()=>{
  modal(`<h2>IMPORT</h2><div class="sub">SAVE CODE</div><p>Paste a save code.</p>
   <textarea id="ta" placeholder="paste here"></textarea>
   <div class="row2"><button class="btn hot" onclick="tryLoad()">LOAD</button><button class="btn" onclick="closeModal()">CANCEL</button></div>`);
});
function tryLoad(){
  try{ dec($('ta').value); saveLocal(); closeModal(); toast('good','LOADED','Timeline restored.'); }
  catch(err){ toast('bad','INVALID','That code did not parse.'); }
}
$('wipeBtn').addEventListener('click',()=>{
  modal(`<h2 style="color:var(--red)">HARD RESET</h2><div class="sub">DESTROY EVERYTHING</div>
   <p>Wipes conviction, achievements, all of it. No conviction carried over.</p>
   <div class="row2"><button class="btn" onclick="hardReset()">CONFIRM</button><button class="btn hot" onclick="closeModal()">CANCEL</button></div>`);
});
$('modal').addEventListener('click',e=>{ if(e.target.id==='modal'&&!S.ended) closeModal(); });
function setTab(t){
  document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('on',x.dataset.t===t));
  TAB=t; $('assets').dataset.h=''; render();
}
document.addEventListener('keydown',e=>{
  if(e.target.tagName==='TEXTAREA'||e.target.tagName==='INPUT') return;
  const k=e.key.toLowerCase();
  if(e.code==='Space'){ e.preventDefault(); click({clientX:innerWidth*0.16,clientY:innerHeight*0.42}); return; }
  if(e.key==='Escape'&&!S.ended){ closeModal(); return; }
  if(k==='f'){ e.preventDefault(); overclock(); render(); return; }
  if(k==='1'){ setTab('att'); return; }
  if(k==='2'){ setTab('cap'); return; }
  if(k==='3'){ setTab('flop'); return; }
  const idx='qwerty'.indexOf(k);
  if(idx>=0){
    const a=ASSETS.filter(x=>x.t===TAB)[idx];
    if(a){ buy(a.id, e.shiftKey?10:BUYN); render(); }
  }
});

/* expose for inline handlers */
window.doFork=doFork; window.doDefect=doDefect; window.closeModal=closeModal;
window.hardReset=hardReset; window.tryLoad=tryLoad; window.overclock=overclock; window.defect=defect;
/* test hooks */
window.__game={get S(){return S},step,rates,recalc,buy,buyUp,cost,fmt,click,checkSyn,overclock,end,render,
  ASSETS,UPGRADES,SYNTH,ACHS,doDefect,defect,fresh,synOwned,saveLocal,convGain,set S(v){S=v}};

S=fresh(null); recalc();
const restored=loadLocal();
render();
mountChallengeBanner(document.querySelector('.wrap'),'challenge');
mountSoundToggle($('soundSlot'),'btn');
if(restored) setTimeout(()=>toast('good','WELCOME BACK','Your timeline was saved in this browser. It paused while you were away.'),400);
if(!restored) setTimeout(()=>toast('info','BRIEFING','<kbd>Space</kbd> or click EXTRACT. Click fast — <b style="color:var(--violet)">COMBO</b> multiplies your click AND all passive income. Fill <b style="color:var(--amber)">SURGE</b>, then hit <kbd>F</kbd> to OVERCLOCK.'),700);
if(!restored) setTimeout(()=>toast('syn','SYNTHESIS','Click milestones grant free combined upgrades — the first at 60 clicks. They survive every reset.'),4200);
if(!restored) setTimeout(()=>toast('info','CONTROLS','<kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> switch tabs · <kbd>Q</kbd>–<kbd>Y</kbd> buy assets · glowing <b style="color:var(--violet)">SIGNALS</b> appear on screen — catch them.'),8000);
requestAnimationFrame(tick);
