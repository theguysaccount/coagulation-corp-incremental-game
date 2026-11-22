// The guide and about pages, rendered to static HTML at build time. The tables come straight from the games'
// own data, so the guide stays true when the content changes.
import { ACHS, ASSETS, CM, SYNTH, UPGRADES } from "./act1/data.js";
import { BUILDINGS, COMP_GOAL, COMP_START, DARK, DSE_GOAL, PEOPLE, RESEARCH, STRUCTURE } from "./act2/data.js";
import { ENDINGS } from "./shared/endings.js";

const esc = (text) => String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const strip = (html) => String(html).replace(/<[^>]+>/g, "");

const SUF = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc"];
function fmt(n) {
  if (!isFinite(n)) return "∞";
  if (n < 1000) return n < 10 ? String(Math.round(n * 100) / 100) : String(Math.round(n));
  let t = Math.floor(Math.log10(n) / 3);
  t = Math.min(t, SUF.length - 1);
  const v = n / Math.pow(1000, t);
  return (v < 10 ? v.toFixed(2) : v < 100 ? v.toFixed(1) : Math.floor(v).toString()) + SUF[t];
}

const TIER = { att: "Attention", cap: "Monetization", flop: "Compute" };
const researchCeiling = RESEARCH.reduce((product, node) => product * node.mult, 1);
const peopleMultiplier = PEOPLE.reduce((product, person) => product * person.dse, 1);

function shell(config, label, inner) {
  return `<div class="doc-shell">
<header class="doc-top"><a class="doc-brand" href="../">COAGULATION <span>CORP</span></a>
<nav aria-label="Site"><a href="../guide/">GUIDE</a><a href="../about/">ABOUT</a><a href="../coherence/">ACT II</a><a class="doc-play" href="../">PLAY →</a></nav></header>
<main class="doc">
<p class="doc-label">${label}</p>
${inner}
<p><a class="doc-play big" href="../">PLAY ACT I →</a> <a class="doc-play big alt" href="../coherence/">JUMP TO ACT II →</a></p>
</main>
<footer class="doc-foot"><p><b>A work of fiction.</b> Satire: every company, person, product and event in the game is invented, and any resemblance to real ones is part of the joke, not a claim about them. · <a href="${esc(config.repoUrl)}" rel="noopener">Source code</a>${config.supportUrl ? ` · <a href="${esc(config.supportUrl)}" rel="noopener">${esc(config.supportLabel)}</a>` : ""}</p></footer>
</div>`;
}

export function faqItems() {
  return [
    {
      q: "How many endings does Coagulation Corp have?",
      a: `${ENDINGS.length}: ${ENDINGS.filter((e) => e.act === 1).length} in Act I (Coagulation Corp) and ${ENDINGS.filter((e) => e.act === 2).length} in Act II (Coherence Corp). ${ENDINGS.filter((e) => e.good).length} of them are good endings.`,
    },
    {
      q: "How do you get to Act II?",
      a: "Take The Defection in Act I's Restructure panel. It appears once coagulation reaches 25%, after your first Fork, or after 600 lifetime clicks. Your conviction becomes wisdom, your coherence carries over, and the later you defect, the further along Coagulation Corp's compute curve starts.",
    },
    {
      q: "What is the best ending?",
      a: "Two endings count as wins: Coherent Superintelligence (reach the efficiency goal with coherence at 65% or more) and The Conversion (bring all twelve of their people over with high narrative and coherence, without finishing the race).",
    },
    {
      q: "How long does a run take?",
      a: "Act II's race is decided within about twenty minutes of play, because Coagulation Corp's compute curve keeps climbing. Act I takes as long as you choose to stay: The Defection can open within a few minutes of steady clicking.",
    },
    {
      q: "Is it a game like Universal Paperclips?",
      a: "Yes, in the same tradition: an incremental game whose mechanics carry an argument. Here the argument is about attention, capital and who gets to superintelligence first, and it is told as satire.",
    },
    {
      q: "Are the companies and people real?",
      a: "No. Everything in the game is invented. It is satire about the attention economy and the AI race, not a claim about any real company or person.",
    },
    {
      q: "Where is my save?",
      a: "In your browser's local storage, on your device. Nothing is uploaded. EXPORT in Act I and the save button in Act II give you a code to move a run to another device.",
    },
  ];
}

export function faqLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems().map((item) => ({ "@type": "Question", name: item.q, acceptedAnswer: { "@type": "Answer", text: item.a } })),
  };
}

export function guidePage(config) {
  const endingRows = ENDINGS.map(
    (ending, index) => `<tr class="${ending.good ? "good" : ""}"><td>${index + 1}</td><th scope="row">${esc(ending.title)}</th><td>${ending.act === 1 ? "I" : "II"}</td><td>${esc(ending.subtitle)}</td><td>${esc(ending.how)}</td></tr>`,
  ).join("");
  const assetRows = ASSETS.map(
    (a) => `<tr><th scope="row">${esc(a.n)}</th><td>${TIER[a.t]}</td><td>${a.t === "flop" ? "$" : ""}${fmt(a.c)}${a.t === "flop" ? "" : " attention"}</td><td>${a.t === "cap" ? `$${fmt(a.r)} per attention/s` : `${fmt(a.r)} ${a.t === "att" ? "attention" : "FLOP"}/s`}</td><td>${a.doom ? "Yes" : ""}</td></tr>`,
  ).join("");
  const synthRows = SYNTH.map((x) => `<tr><th scope="row">${esc(x.n)}</th><td>${fmt(x.k)}</td><td>${esc(x.d)}</td></tr>`).join("");
  const upgradeRows = UPGRADES.map(
    (u) => `<tr class="${u.danger ? "danger" : u.good ? "good" : ""}"><th scope="row">${esc(u.n)}</th><td>${u.cu === "att" ? "" : "$"}${fmt(u.c)}${u.cu === "att" ? " attention" : ""}</td><td>${esc(u.d)}</td></tr>`,
  ).join("");
  const buildingRows = BUILDINGS.map((b) => `<tr><th scope="row">${esc(b.name)}</th><td>${b.cur === "cv" ? `${fmt(b.base)} conviction` : `$${fmt(b.base)}`}</td><td>×${b.growth}</td><td>${esc(b.d)}</td></tr>`).join("");
  const researchRows = RESEARCH.map((r) => `<tr><th scope="row">${esc(r.name)}</th><td>${fmt(r.cost)} insight</td><td>×${r.mult}</td><td>${esc(strip(r.d))}</td></tr>`).join("");
  const charterRows = STRUCTURE.map(
    (st) => `<tr><th scope="row">${esc(st.name)}</th><td>${[st.cost.cap ? `$${fmt(st.cost.cap)}` : "", st.cost.cv ? `${fmt(st.cost.cv)} conviction` : ""].filter(Boolean).join(" + ")}</td><td>${esc(st.d)}</td></tr>`,
  ).join("");
  const darkRows = DARK.map((d) => `<tr class="danger"><th scope="row">${esc(d.name)}</th><td>$${fmt(d.cost.cap)}</td><td>−${d.coh} now, −${d.drift}/s × org size</td><td>${esc(d.d)}</td></tr>`).join("");
  const peopleRows = PEOPLE.map(
    (p, index) => `<tr><td>${index + 1}</td><th scope="row">${esc(p.n)}</th><td>${esc(p.r)}</td><td>${p.thr}</td><td>×${p.dse}</td><td>−${(p.drag * 100).toFixed(1)}%</td></tr>`,
  ).join("");
  const faq = faqItems().map((item) => `<div><dt>${esc(item.q)}</dt><dd>${esc(item.a)}</dd></div>`).join("");

  return shell(
    config,
    "GUIDE · SPOILERS BELOW",
    `<h1>Coagulation Corp: all ${ENDINGS.length} endings, and how to reach them</h1>
<p class="lede">Coagulation Corp is a free satirical incremental game in two acts. In <b>Act I</b> you run a company that turns attention into capital into compute, while a Coagulation meter races a Human Coherence meter and regulators circle. In <b>Act II</b> you defect, found Coherence Corp, and race your old company to superintelligence. This page lists every ending and the numbers behind both acts, taken from the game's own data.</p>
<p class="note">Spoilers: the endings table names every ending. The game is satire and a work of fiction.</p>

<h2 id="endings">The ${ENDINGS.length} endings</h2>
<div class="table"><table><thead><tr><th>#</th><th>Ending</th><th>Act</th><th>In a line</th><th>How to reach it</th></tr></thead><tbody>${endingRows}</tbody></table></div>
<p>Every ending gives you a card to share, and the game remembers which endings you have found on this device.</p>

<h2 id="act1">Act I: Coagulation Corp</h2>
<ul>
<li><b>Extract attention</b> by clicking (or the spacebar). Clicks chained within 1.6 seconds build a <b>combo</b> that multiplies clicks and lifts all passive income.</li>
<li>Clicking fills the <b>surge</b> bar. A full bar fires a 12-second <b>overclock</b> (key F): ×6 clicks and ×2.2 to every stream.</li>
<li>Glowing <b>signals</b> float across the screen now and then. Catch them for bursts.</li>
<li>Three tiers: attention buys attention and monetization assets; monetization turns attention per second into dollars; dollars buy compute. Each copy costs ×${CM} the one before.</li>
<li>Compute drives <b>coagulation</b>. Coagulation, and assets marked "costly", bleed <b>human coherence</b>. Revenue and costly assets build <b>regulatory heat</b>.</li>
<li><b>Fork the Timeline</b> (prestige) resets the run for <b>conviction</b>: ⌊(lifetime capital ÷ $1M)<sup>0.3</sup>⌋ per fork, worth a permanent ×(1 + 0.5 × √conviction) to all production.</li>
</ul>
<h3>Assets</h3>
<div class="table"><table><thead><tr><th>Asset</th><th>Tier</th><th>First copy</th><th>Output each</th><th>Costly</th></tr></thead><tbody>${assetRows}</tbody></table></div>
<h3>Synthesis (free, earned with lifetime clicks, kept through every fork)</h3>
<div class="table"><table><thead><tr><th>Synthesis</th><th>Lifetime clicks</th><th>Effect</th></tr></thead><tbody>${synthRows}</tbody></table></div>
<h3>Strategic upgrades</h3>
<div class="table"><table><thead><tr><th>Upgrade</th><th>Cost</th><th>Effect</th></tr></thead><tbody>${upgradeRows}</tbody></table></div>
<p>Recognition: ${ACHS.length} achievements, from "${esc(ACHS[0].n)}" to "${esc(ACHS[ACHS.length - 1].n)}".</p>

<h2 id="defection">The Defection</h2>
<p>The Defection appears in the Restructure panel once coagulation reaches 25%, after your first fork, or after 600 lifetime clicks. Taking it ends Act I and founds Coherence Corp:</p>
<ul>
<li>Your conviction becomes <b>wisdom</b> (√conviction, rounded down): +5% starting efficiency and +2% raise rate each.</li>
<li>Your coherence carries over (at least 20%).</li>
<li>Coagulation Corp keeps what you built: leaving at <i>c</i>% coagulation starts their compute at 10<sup><i>c</i>/25</sup> times the usual level. Defect earlier and the race is shorter.</li>
</ul>

<h2 id="act2">Act II: Coherence Corp vs Coagulation Corp</h2>
<p>Coagulation Corp's compute climbs from ${fmt(COMP_START)} toward ${fmt(COMP_GOAL)}. You need <b>${fmt(DSE_GOAL)}× data scaling efficiency</b> first. Every research node together reaches only ${fmt(researchCeiling)}×, so the rest has to come from their people: each one who walks out multiplies your efficiency and slows their curve (all twelve together: ×${peopleMultiplier.toFixed(1)}). Coherence at 68% or more is what makes a defection stick when they counter-offer. When their curve passes 72%, they make you an offer.</p>
<h3>Buildings</h3>
<div class="table"><table><thead><tr><th>Building</th><th>First costs</th><th>Cost growth</th><th>Effect</th></tr></thead><tbody>${buildingRows}</tbody></table></div>
<h3>Research</h3>
<div class="table"><table><thead><tr><th>Node</th><th>Cost</th><th>Efficiency</th><th>Note</th></tr></thead><tbody>${researchRows}</tbody></table></div>
<h3>Charter</h3>
<div class="table"><table><thead><tr><th>Structure</th><th>Cost</th><th>Effect</th></tr></thead><tbody>${charterRows}</tbody></table></div>
<h3>Expedient (fast, and corrosive)</h3>
<div class="table"><table><thead><tr><th>Upgrade</th><th>Cost</th><th>Coherence</th><th>Effect</th></tr></thead><tbody>${darkRows}</tbody></table></div>
<h3>Their people</h3>
<div class="table"><table><thead><tr><th>#</th><th>Person</th><th>Role</th><th>Doubt threshold</th><th>Your efficiency</th><th>Their rate</th></tr></thead><tbody>${peopleRows}</tbody></table></div>

<h2 id="faq">Questions</h2>
<dl class="faq">${faq}</dl>`,
  );
}

export function aboutPage(config) {
  const embed = `<iframe src="${config.siteUrl}/" title="Coagulation Corp" width="100%" height="800" style="border:0;max-width:1340px" loading="lazy"></iframe>`;
  return shell(
    config,
    "ABOUT",
    `<h1>About Coagulation Corp</h1>
<p class="lede">A free incremental game in two acts about attention, capital and the race to superintelligence, in the tradition of <i>Universal Paperclips</i>. Its mechanics carry one argument: coherence, not capital, is what makes a defection stick.</p>

<h2 id="fiction">Satire, and a work of fiction</h2>
<p>Every company, lab, person, product and event in the game is invented. Some mechanics satirize real strategies of the technology industry (rollups, engagement optimization, compute deals, unusual legal structures). That is the joke, not a claim about any real company or person, and nothing here is legal, financial or investment advice. The game asks you to do nothing in the real world: no sign-ups, no donations, no calls to action.</p>

<h2 id="privacy">Privacy</h2>
<ul>
<li>No account, no cookies, no ads.</li>
<li>Your runs and the endings you have found are saved in your browser's local storage on your device, and never uploaded.</li>
<li>Ending cards are drawn on your device. A shared link carries one thing: the name of the ending.</li>
<li>${config.goatcounterUrl ? "Visits and a few game events (act started, defection, ending reached, card shared) are counted without cookies or personal data, using GoatCounter." : "Nothing is counted or tracked: this site loads no analytics."}</li>
<li>Sound is off until you turn it on.</li>
<li>The site is hosted on GitHub Pages, which keeps standard server logs.</li>
</ul>

<h2 id="history">Where it came from</h2>
<p>Coagulation Corp and Coherence Corp began as two separate single-page games written in August 2026 from a pair of talks about the "economy machine" and the "war for consciousness". They are merged here: Coagulation Corp is Act I, and its Defection opens Coherence Corp as Act II. Trademarked names in the originals were replaced with invented ones.</p>

<h2 id="embed">Put the game on your own page</h2>
<pre class="code"><code>${esc(embed)}</code></pre>

<h2 id="credits">Credits</h2>
<ul>
<li>Code and game text: MIT licence. <a href="${esc(config.repoUrl)}" rel="noopener">Source on GitHub</a>.</li>
<li>No third-party fonts, images or trackers.</li>
</ul>
<p>Found a bug or a balance problem? <a href="${esc(config.repoUrl)}/issues" rel="noopener">Open an issue</a>.</p>
${config.moreGames.length ? `<h2 id="more">More games in this line</h2><ul>${config.moreGames.map((g) => `<li><a href="${esc(g.url)}" rel="noopener">${esc(g.name)}</a>: ${esc(g.blurb)}</li>`).join("")}</ul>` : ""}`,
  );
}
