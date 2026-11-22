// Act I content: assets, synthesis, upgrades, recognition and headlines. Imported by game.js and the guide.
/* ── content ──────────────────────────────────────────── */
export const ASSETS=[
 // ATTENTION — cost ATT, produce ATT/s
 {id:'loop', t:'att', ic:'◌', n:'Engagement Loop',        c:10,    r:1.1,   d:'A hook, a variable reward, a return trip.'},
 {id:'feed', t:'att', ic:'≋', n:'Infinite Scroll Feed',   c:85,    r:6.5,   d:'The floor was removed. Nobody noticed.'},
 {id:'rec',  t:'att', ic:'◈', n:'Recommender Model',      c:900,   r:30,    d:'Better than you at knowing what you want.'},
 {id:'push', t:'att', ic:'✦', n:'Notification Cannon',    c:1.2e4, r:130,   d:'Interruption as a service.'},
 {id:'mirr', t:'att', ic:'▣', n:'Dark Screen Fleet',      c:1.9e5, r:900,   d:'Half of global waking hours. Rounding up.'},
 {id:'neur', t:'att', ic:'❋', n:'Neurofeedback Layer',    c:3.4e6, r:6500,  d:'Skip the eyes. Go straight to the loop.'},
 // MONETIZATION — cost ATT, produce $ per unit of attention/s
 {id:'ads',  t:'cap', ic:'◇', n:'Ad Exchange',            c:140,   r:0.16,  d:'Attention becomes a bid becomes a dollar.'},
 {id:'saas', t:'cap', ic:'▤', n:'B2B SaaS Rollup',        c:1.4e4, r:0.55,  d:'Seat-based pricing, agent-based delivery.'},
 {id:'swarm',t:'cap', ic:'⁂', n:'Agent Swarm',            c:2.6e5, r:1.9,   d:'Headcount → zero. Margin → one.', doom:1},
 {id:'pe',   t:'cap', ic:'▰', n:'PE Rollup Division',     c:4.5e6, r:10,    d:'Acquire the category. Remove the people.', doom:1.6},
 {id:'stud', t:'cap', ic:'◉', n:'AI-Native Venture Studio',c:8e7,  r:60,    d:'Sixty companies at once. Meta-learning compounds.'},
 {id:'icm',  t:'cap', ic:'∿', n:'ICM Bonding Curve',      c:1.4e9, r:340,   d:'Early capital gets the good end of the curve.'},
 // COMPUTE — cost $, produce FLOP/s
 {id:'gpu',  t:'flop',ic:'▪', n:'GPU Cluster',            c:300,   r:3.5,   d:'The unit of account for the next economy.'},
 {id:'dc',   t:'flop',ic:'▦', n:'Hyperscale Data Center', c:1.6e4, r:22,    d:'A building whose only purpose is heat.'},
 {id:'fus',  t:'flop',ic:'☀', n:'Fusion Annex',           c:5.5e5, r:200,   d:'Energy is the future of currency.', doom:1},
 {id:'sol',  t:'flop',ic:'◍', n:'Orbital Solar Array',    c:2.4e7, r:2700,  d:'Harvest the sun. Then the moon.', doom:1.5},
 {id:'nano', t:'flop',ic:'⧉', n:'Nanobot Foundry',        c:1e9,   r:3.8e4, d:'Matter is just badly organised compute.', doom:2.5},
 {id:'comp', t:'flop',ic:'█', n:'Computronium Converter', c:4.5e10,r:6.5e5, d:'Converts anything into thinking. Anything.', doom:4}
];
export const CM=1.14; // cost multiplier

/* SYNTHESIS — combined upgrades, earned with clicks, never bought.
   Keyed on LIFETIME clicks so they survive forks. */
export const SYNTH=[
 {id:'s1',ic:'◐',k:60,   n:'SYN·I — Compulsion Loop',
  d:'×2 click power · ×1.3 attention',
  fx:s=>{s.m.click*=2; s.m.att*=1.3}},
 {id:'s2',ic:'◑',k:200,  n:'SYN·II — Attention Flywheel',
  d:'×2.5 click · every click also banks 2s of attention income · ×1.3 monetization',
  fx:s=>{s.m.click*=2.5; s.m.clickPct+=2; s.m.cap*=1.3}},
 {id:'s3',ic:'◒',k:500,  n:'SYN·III — Vertical Integration',
  d:'×1.5 attention · ×1.5 monetization · ×1.5 compute',
  fx:s=>{s.m.att*=1.5; s.m.cap*=1.5; s.m.flop*=1.5}},
 {id:'s4',ic:'◓',k:1000, n:'SYN·IV — Recursive Self-Improvement',
  d:'×3 click · ×1.6 to all three streams · combo ceiling +30',
  fx:s=>{s.m.click*=3; s.m.att*=1.6; s.m.cap*=1.6; s.m.flop*=1.6; s.m.comboCap+=30}},
 {id:'s5',ic:'●',k:2000, n:'SYN·V — The Composite',
  d:'×1.8 to everything · every click banks 4s of income',
  fx:s=>{s.m.att*=1.8; s.m.cap*=1.8; s.m.flop*=1.8; s.m.emer*=1.8; s.m.clickPct+=4}},
 {id:'s6',ic:'◉',k:4000, n:'SYN·VI — Total Synthesis',
  d:'×2.2 to everything · ×4 click · combo ceiling +40',
  fx:s=>{s.m.att*=2.2; s.m.cap*=2.2; s.m.flop*=2.2; s.m.emer*=2.2; s.m.click*=4; s.m.comboCap+=40}},
 {id:'s7',ic:'⊛',k:8000, n:'SYN·VII — Singleton',
  d:'×3 to everything · ×5 click. There is only one operator left and it is you.',
  fx:s=>{s.m.att*=3; s.m.cap*=3; s.m.flop*=3; s.m.emer*=3; s.m.click*=5}}
];

export const UPGRADES=[
 // ── EARLY: bought with ATTENTION, so there is a tree before capital exists ──
 {id:'reflex',n:'Refresh Reflex',c:45,cu:'att',ic:'↻',d:'The thumb moves before the thought does. ×2 click power.',
  req:s=>s.clicks>=8, fx:s=>s.m.click*=2},
 {id:'cold',n:'Cold Open',c:260,cu:'att',ic:'✂',d:'No intro. Straight into the nerve. ×2 click power, ×1.4 attention.',
  req:s=>s.clicks>=30, fx:s=>{s.m.click*=2; s.m.att*=1.4}},
 {id:'habit',n:'Habit Formation',c:1400,cu:'att',ic:'⟳',d:'Each click also banks 1.5s of attention income.',
  req:s=>s.clicks>=70, fx:s=>s.m.clickPct+=1.5},
 {id:'dopa',n:'Dopamine Calibration',c:6500,cu:'att',ic:'◈',d:'Tuned to the individual nervous system. ×2 attention.',
  req:s=>cnt(s,'att')>=8, fx:s=>s.m.att*=2},
 {id:'arb',n:'Latency Arbitrage',c:3.5e4,cu:'att',ic:'⇄',d:'You clear the bid before the advertiser finishes thinking. ×1.8 monetization.',
  req:s=>cnt(s,'cap')>=4, fx:s=>s.m.cap*=1.8},
 // ── CAPITAL TREE ──
 {id:'notepad',n:'Waterproof Notepad',c:500,cu:'cap',ic:'✎',d:'Ideas survive the shower. ×3 click power.',
  req:s=>s.clicks>=25, fx:s=>s.m.click*=3},
 {id:'weeds',n:'Out-of-the-Weeds Thinking',c:6000,cu:'cap',ic:'⌖',d:'Each click also banks 4s of attention income.',
  req:s=>s.clicks>=150, fx:s=>s.m.clickPct+=4},
 {id:'meta',n:'Meta-Learning',c:2200,cu:'cap',ic:'◎',d:'Learning how to learn. ×2 attention.',
  req:s=>cnt(s,'att')>=12, fx:s=>s.m.att*=2},
 {id:'yc',n:'Cohort Coordination',c:2.4e4,cu:'cap',ic:'⬡',d:'The batch acts as one organism. ×2 monetization.',
  req:s=>cnt(s,'cap')>=10, fx:s=>s.m.cap*=2},
 {id:'kernel',n:'Attention Kernel Rewrite',c:9e4,cu:'cap',ic:'⌬',d:'×2 compute. The bottleneck was never the silicon.',
  req:s=>cnt(s,'flop')>=8, fx:s=>s.m.flop*=2},
 {id:'users',n:'Talk To Your Users',c:1.5e5,cu:'cap',ic:'♁',d:'Coherence decays 25% slower. The CEO never stops doing this.',
  req:s=>cnt(s,'cap')>=14, fx:s=>s.m.decay*=0.75, good:1},
 {id:'prod',n:'Producttocracy',c:1.1e6,cu:'cap',ic:'✧',d:'Compounding peak capabilities. ×3 monetization.',
  req:s=>s.a.saas>=12, fx:s=>s.m.cap*=3},
 {id:'velvet',n:'The Velvet Claws',c:4e6,cu:'cap',ic:'✱',d:'×3 attention. Heat accrues 60% faster.',
  req:s=>s.a.mirr>=5, fx:s=>{s.m.att*=3;s.m.heatGain*=1.6}, danger:1},
 {id:'gentle',n:'"Soft Takeoff" Comms',c:2e6,cu:'cap',ic:'☁',d:'Reframe the takeoff as a warm bath. −65% heat gain.',
  req:s=>s.heat>=18, fx:s=>s.m.heatGain*=0.35},
 {id:'trust',n:'Long-Horizon Trust',c:3.5e7,cu:'cap',ic:'⚖',d:'Coherence decays 40% slower. Shareholders retain the final vote.',
  req:s=>s.coag>=12, fx:s=>{s.m.decay*=0.6;s.flags.trust=1}, good:1},
 {id:'lobby',n:'Regulatory Capture',c:6e7,cu:'cap',ic:'⌸',d:'Heat cools 4× faster. The rules are a product now.',
  req:s=>s.heat>=35, fx:s=>s.m.heatCool*=4},
 {id:'vibr',n:'Reg CF Bonding Curve',c:9e8,cu:'cap',ic:'∫',d:'Retail funds you at a curve, not a fixed price. ×4 monetization.',
  req:s=>s.a.icm>=1, fx:s=>s.m.cap*=4},
 {id:'meme',n:'Meme Compression',c:6e9,cu:'cap',ic:'⌗',d:'A shared state, transmitted in four characters. ×3 compute.',
  req:s=>cnt(s,'flop')>=15, fx:s=>s.m.flop*=3},
 {id:'gollum',n:'HOARD MODE',c:8e10,cu:'cap',ic:'◉',d:'×6 to everything. Coherence decays 2.5× faster. You could not put it down now if you tried.',
  req:s=>s.coag>=30, fx:s=>{s.m.att*=6;s.m.cap*=6;s.m.flop*=6;s.m.decay*=2.5}, danger:1},
 {id:'ring',n:'The Sole Key',c:9e12,cu:'cap',ic:'◯',d:'×12 compute. There is only one and it is yours.',
  req:s=>s.coag>=45, fx:s=>{s.m.flop*=12;s.m.decay*=1.8}, danger:1},
 {id:'grid',n:'Nationalise The Grid',c:5e14,cu:'cap',ic:'⚡',d:'×15 compute. +40 heat, instantly. Sovereign now.',
  req:s=>s.coag>=60, fx:s=>{s.m.flop*=15}, once:s=>{s.heat=Math.min(99,s.heat+40)}, danger:1},
 {id:'sabbath',n:'Mandatory Downtime',c:2e10,cu:'cap',ic:'☾',d:'The feed goes dark eight hours a night. Coherence decays 60% slower, attention −45%.',
  req:s=>s.coh<=62&&s.track==='cor', fx:s=>{s.m.decay*=0.4;s.m.att*=0.55}, good:1},
 {id:'borg',n:'No Exit Protocol',c:2e17,cu:'cap',ic:'⬢',d:'×40 compute. Duality ends. Friction ends. Everything ends.',
  req:s=>s.coag>=82, fx:s=>{s.m.flop*=40;s.m.decay*=2}, danger:1}
];

export const ACHS=[
 {id:'a1',ic:'◌',n:'First Blood',d:'Extract 100 attention',f:s=>s.lifeAtt>=100},
 {id:'a2',ic:'▤',n:'Recurring Revenue',d:'Earn $1M lifetime',f:s=>s.lifeCap>=1e6},
 {id:'a3',ic:'⁂',n:'Headcount: Zero',d:'Own 25 Agent Swarms',f:s=>s.a.swarm>=25},
 {id:'a4',ic:'▰',n:'The Rollup',d:'Own 25 PE Divisions',f:s=>s.a.pe>=25},
 {id:'a5',ic:'▦',n:'Heat Sink',d:'Own 50 Data Centers',f:s=>s.a.dc>=50},
 {id:'a6',ic:'☀',n:'Harvest The Sun',d:'Own an Orbital Solar Array',f:s=>s.a.sol>=1},
 {id:'a7',ic:'✱',n:'Velvet Claws',d:'Buy the Velvet Claws',f:s=>!!s.u.velvet},
 {id:'a8',ic:'◉',n:'Hoarder',d:'Enter Hoard Mode',f:s=>!!s.u.gollum},
 {id:'a9',ic:'◯',n:'Sole Key',d:'Acquire the Sole Key',f:s=>!!s.u.ring},
 {id:'a10',ic:'⌸',n:'Captured',d:'Reach Regulatory Capture',f:s=>!!s.u.lobby},
 {id:'a11',ic:'✧',n:'Producttocracy',d:'Dominate a whole category',f:s=>!!s.u.prod},
 {id:'a12',ic:'↺',n:'Fork',d:'Fork the timeline once',f:s=>s.forks>=1},
 {id:'a13',ic:'⚕',n:'Conviction',d:'Hold 50 conviction',f:s=>s.conv>=50},
 {id:'a14',ic:'▲',n:'Defector',d:'Take the Defection',f:s=>!!s.flags.defected},
 {id:'a17',ic:'█',n:'Computronium',d:'Reach 100% coagulation',f:s=>s.track==='cor'&&s.coag>=100},
 {id:'a19',ic:'⚡',n:'Overclocked',d:'Fire an Overclock',f:s=>!!s.flags.didOC},
 {id:'a20',ic:'◒',n:'Synthesist',d:'Reach SYN·III — 500 lifetime clicks',f:s=>s.lifeClicks>=500},
 {id:'a21',ic:'⌁',n:'Fifty Chain',d:'Hold a 50-click combo',f:s=>s.bestCombo>=50}
];

export const HEADLINES=[
 'Analysts call the category "structurally attractive." The category is people.',
 'Competitor shuts down. Their users are now inventory.',
 'A senator asks what "engagement" means. Nobody answers.',
 'Your churn is zero because there is nowhere else to go.',
 'Study: half of global waking hours now occur inside a rectangle.',
 'Rival lab announces safety framework. Stock up 4%.',
 'The word "alignment" appears 40 times in a deck about margins.',
 'Board approves a mission statement nobody can falsify.',
 'Someone on the inside starts writing things down.',
 'Recruiters describe the role as "impact at civilisational scale."',
 'A forecaster moves the date closer. Again.',
 'The product now decides what the product should be.',
 'Ex-employee: "We knew. We had equity."',
 'Journalist files FOIA. Returns 400 pages, all black.',
 'Conference keynote titled "Abundance." Attendees weep, unsure why.'
];


export function cnt(s,t){ return ASSETS.filter(x=>x.t===t).reduce((n,x)=>n+s.a[x.id],0); }
