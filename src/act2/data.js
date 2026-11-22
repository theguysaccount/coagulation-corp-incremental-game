// Act II content: buildings, research, charter, expedient upgrades and personnel. Imported by game.js and the guide.
export const TICK = 0.1;                 // seconds per tick
export const DSE_GOAL = 200000;
export const COMP_START = 1e6;
export const COMP_GOAL  = 1e12;

/* ---------- content ---------- */
export const BUILDINGS = [
  { id:'believer', name:'Believers', cur:'cv', base:15, growth:1.140,
    d:'People who carry the meme without being paid to. +0.4 conviction/s each.' },
  { id:'venture', name:'AI-Native Studios', cur:'cap', base:40, growth:1.145,
    d:'Each spawns and runs B2B SaaS with minimal humans. +$2.2/s and +0.09 conviction/s each — the product is the argument. Rollup targets.' },
  { id:'researcher', name:'Researchers', cur:'cap', base:180, growth:1.150,
    d:'+0.6 insight/s each. Output scales with your Coherence — an incoherent lab learns slower.' },
  { id:'orchestrator', name:'Multi-Agent Orchestration', cur:'cap', base:2400, growth:1.250,
    d:'×1.06 to studio and researcher output, each. This is the compounding you were promised.' },
  { id:'node', name:'Collective Intelligence Nodes', cur:'cv', base:450, growth:1.220,
    d:'+20% insight, +0.024 coherence/s, and +2% doubt drift inside Coagulation, each.' },
];

export const RESEARCH = [
  { id:'r1', name:'Embodied Wisdom Corpus',      cost:30,     mult:2.5,   d:'Learn from what people know in their hands, not what they typed.' },
  { id:'r2', name:'Meta-Learning Loop',          cost:150,    mult:2.5, d:'Learning how to learn. The thing accelerators were actually selling.' },
  { id:'r3', name:'Feedback-Native Product',     cost:550,   mult:2,   d:'Users route straight to the orchestration. +0.35 coherence/s.' },
  { id:'r4', name:'Curriculum From Peers',       cost:1800,   mult:3,   d:'Conviction transmitted between agents, not scraped.' },
  { id:'r5', name:'Out-of-the-Weeds Abstraction',cost:5500,  mult:3,   d:'Sit above the individual company. See the power law. +25% insight.' },
  { id:'r6', name:'The Collective Gradient',     cost:16000,  mult:4,   d:'Many minds, one update step. Requires nodes ≥ 12.', req:s=>s.b.node>=12 },
  { id:'r7', name:"Raise It, Don't Train It",    cost:45000, mult:4,   d:'Absolute power corrupts absolutely — maybe not for a child.' },
  { id:'r8', name:'Spear-ritual Architecture',   cost:110000, mult:5,   d:'Coherence and convergence in one structure. Requires coherence ≥ 60.', req:s=>s.coh>=60 },
  { id:'r9', name:'Human-Parity Data Efficiency',cost:240000,  mult:5,   d:'200,000× less data for the same understanding. The whole thesis. <span class="c-bad">Finishing this ends the run — if you are chasing the Conversion, do not buy it yet.</span>' },
];

export const STRUCTURE = [
  { id:'trust', name:'Long-Horizon Trust', cost:{cap:4000},
    d:'A board seat that can, in theory, overrule the money. Absorbs exactly one Shareholder Revolt. A flimsy shield.' },
  { id:'curve', name:'Bonding-Curve Cap Table', cost:{cap:9000},
    d:'Price early backers on a curve instead of a flat round. ×2.4 raise rate, believers ×1.35.' },
  { id:'regcf', name:'Form C Automation (Reg CF)', cost:{cap:24000},
    d:'Agent-drafted crowdfunding filings. ×1.3 capital, plus retail flow scaled by narrative. Halves rollup losses — retail holders will not sell.' },
  { id:'council', name:'User Council', cost:{cap:50000},
    d:'The people who use it decide where it goes. +0.55 coherence/s, +18% insight.' },
  { id:'c3', name:'501(c)(3) Conversion', cost:{cap:115000},
    d:'Non-profit above the lab. Shrugs off half of all capture attempts. Required before the religious filing.', req:s=>true },
  { id:'religious', name:'501(c)(3) Religious Institution', cost:{cap:300000, cv:4000},
    d:'The blocker nobody has filed yet. Immune to Nationalization. Required for any ending where you keep it.', req:s=>s.st.c3 },
  { id:'custody', name:'Distributed Weights Custody', cost:{cap:850000},
    d:'No single party can lift the model. Blocks Exfiltration. ×1.5 all output.' },
];

export const DARK = [
  { id:'engage', name:'Engagement Optimizer', cost:{cap:2600}, coh:22, drift:0.13,
    d:'Studio revenue ×2.0. It works because it takes their attention, and attention was the only thing they had.' },
  { id:'rollup', name:'PE 2.0 Rollup', cost:{cap:30000}, coh:19, drift:0.13,
    d:'Buy 6 studios outright, fire everyone, replace them with orchestration. +6 studios, studio revenue ×1.15.' },
  { id:'harvest', name:'Attention Harvest', cost:{cap:95000}, coh:22, drift:0.16,
    d:'Conviction/s ×2.4. Manufactured conviction still spends. It just does not hold under counter-offer.' },
  { id:'recruit', name:"Hire Their Recruiters", cost:{cap:260000}, coh:24, drift:0.16,
    d:'Snipe costs −45%. You will be very good at taking people, and worse at keeping them.' },
];

export const PEOPLE = [
  { id:'p1',  n:'The Intern Who Reads Everything', r:'Research Resident',        thr:32, rate:0.42, cv:120,   cap:500,    dse:1.22, drag:0.030, ins:1.2, f:'Has read every paper on the misalignment risk and every internal memo. Has not yet learned to stop noticing.' },
  { id:'p2',  n:'The Interpretability Ghost',      r:'Interp Lead',              thr:42, rate:0.34, cv:320,   cap:2000,   dse:1.22, drag:0.045, ins:2.4, f:'Has actually looked inside the thing. Does not sleep well. Publishes less every quarter.' },
  { id:'p3',  n:'The Evals Skeptic',               r:'Evaluations',              thr:48, rate:0.30, cv:800,  cap:6000,  dse:1.22, drag:0.045, ins:5,   f:'Keeps writing "this benchmark does not measure what we claim it measures" in documents nobody reads.' },
  { id:'p4',  n:'RL Environments Lead',            r:'Post-Training',            thr:54, rate:0.26, cv:1800,  cap:16000,  dse:1.24, drag:0.055, ins:11,  f:'Builds the worlds the model grows up in. Has started asking what kind of childhood this is.' },
  { id:'p5',  n:'Head of Engagement Optimization', r:'Growth',                   thr:58, rate:0.24, cv:3600,  cap:38000,  dse:1.20, drag:0.055, cv_s:9, cohHit:6, f:'Best in the world at taking a person\'s hour. Knows exactly what it is. Brings the habit with them.' },
  { id:'p6',  n:'Datacenter Buildout VP',          r:'Infrastructure',           thr:62, rate:0.22, cv:7000, cap:80000, dse:1.20, drag:0.085, cap_s:110, f:'Knows the real delivery schedule, the real power contracts, and how much of the roadmap is a press release.' },
  { id:'p7',  n:'Chief Narrative Officer',         r:'Comms',                    thr:68, rate:0.20, cv:13000, cap:165000, dse:1.20, drag:0.070, nar_s:0.55, f:'Wrote "the soft takeoff". Can feel the velvet on the claws. Would like to write one true thing.' },
  { id:'p8',  n:'Pretraining Lead',                r:'Frontier Training',        thr:73, rate:0.17, cv:24000, cap:330000,  dse:1.30, drag:0.095, ins:120, f:'Owns the scaling curve. Has privately concluded it does not reach where the fundraising deck says it reaches.' },
  { id:'p9',  n:'Alignment Lead (Nominal)',        r:'Safety, On Paper',         thr:78, rate:0.15, cv:42000,cap:620000,  dse:1.32, drag:0.085, cohGain:12, f:'The title exists so the title can be pointed at. They know that. It is the worst part of the job.' },
  { id:'p10', n:'The Independent Board Member',    r:'Governance',               thr:83, rate:0.13, cv:70000,cap:1.1e+06,  dse:1.25, drag:0.075, blocks:'nationalize', f:'Voted against dissolving the non-profit. Lost. Stayed anyway, which was either courage or capture.' },
  { id:'p11', n:'Chief Scaling Officer',           r:'The Number Goes Up',       thr:88, rate:0.11, cv:115000,cap:1.9e+06,  dse:1.30, drag:0.140, f:'Believes compute is the future of currency. Has begun to notice that the future of currency has no one left in it to spend it.' },
  { id:'p12', n:'The Keyholder',                   r:'Founder & CEO',            thr:96, rate:0.075,cv:190000,cap:3.2e+06,  dse:1.35, drag:0.30, final:true, f:'Was supposed to destroy it. Has been carrying it so long the carrying is the identity. Wants, somewhere under all of it, to be told there is another way to win.' },
];

