// Balance check in headless Chrome: scripted players run the real game code with fast-forwarded time and
// report how long each act takes. Writes a summary; exits 1 if a run falls outside the target window.
//   node scripts/balance.mjs [site-url]          (default: serve dist/ locally)
// Targets, from the prompt's balance pass ("a 20-40 minute first run"):
//   - A scripted first run that defects as soon as The Defection opens and then plays Act II well: 8-45 minutes.
//     (The script plays faster than a first-time player, who also reads; a human first run lands around 20-40.)
//   - A first run that never defects reaches an Act I ending within 15-70 minutes.
//   - Act II reaches an ending within 35 minutes, however it is played.
// Events and signals are random, so the windows are generous.
import fs from "node:fs";
import { launchChrome } from "./lib/cdp.mjs";
import { startServer } from "./serve.mjs";

const target = process.argv[2];
const local = target ? null : await startServer({ basePath: "/coagulation-corp-incremental-game/" });
const base = (target || local.url).replace(/\/*$/, "/");

// Act I player: clicks 4 times a second, buys the cheapest affordable asset in each tier and every affordable
// upgrade except the corrosive ones, fires overclock when ready. Game time advances through the game's own step().
const ACT1 = `(async () => {
  const g = window.__game;
  const S = () => g.S;
  let t = 0, defectAt = null;
  const tiers = ["att", "cap", "flop"];
  while (t < 70 * 60) {
    for (let i = 0; i < 4; i += 1) { g.click(null); }
    g.S.lastClick = performance.now();
    for (let k = 0; k < 10; k += 1) g.step(0.1);
    t += 1;
    if (S().surge >= 100 && S().ocT <= 0) g.overclock();
    for (const tier of tiers) {
      const owned = g.ASSETS.filter((a) => a.t === tier);
      for (const a of owned) {
        const cur = tier === "flop" ? "cap" : "att";
        let guard = 0;
        while (S()[cur] >= g.cost(a.id) && guard < 50) { g.buy(a.id, 1); guard += 1; }
      }
    }
    for (const u of g.UPGRADES) {
      if (u.danger || S().u[u.id]) continue;
      try { if (u.req(S()) && S()[u.cu] >= u.c) g.buyUp(u.id); } catch (e) {}
    }
    const canDefect = S().coag >= 25 || S().forks >= 1 || S().lifeClicks >= 600;
    if (canDefect && defectAt === null) defectAt = t;
    if (S().ended) break;
  }
  return { defectAt, t, coag: S().coag, coh: S().coh, heat: S().heat, ended: S().ended, lifeCap: S().lifeCap };
})()`;

// Act II player: clicks 4 times a second; raises when conviction piles up; buys buildings, research (but not the
// final node before eight defections), charter structures; sends memos and makes offers when the odds are good.
const ACT2 = `(async () => {
  const api = window.__api;
  const S = () => window.__G();
  S().paused = false;
  let t = 0;
  while (!S().ended && t < 60 * 60) {
    for (let i = 0; i < 4; i += 1) api.doClick();
    for (let k = 0; k < 10; k += 1) window.__step(0.1);
    t += 1;
    const s = S();
    if (s.paused && !s.ended) { s.paused = false; s.offered = true; }
    for (const p of s.ppl) {
      if (!p.unlocked || p.flipped) continue;
      if (api.snipeOdds(p) >= 0.85) { const c = api.snipeCost(p); if (s.cv >= c.cv && s.cap >= c.cap) api.snipe(p); }
      else if (s.cv >= api.memoCost(p) * 3) api.sendMemo(p);
    }
    for (const r of api.RESEARCH) { if (r.id === "r9" && s.snipes < 8) continue; api.buyResearch(r); }
    for (const st of api.STRUCTURE) api.buyStructure(st);
    if (s.cv > 40 && s.pubs < 25 && s.cv >= api.publishCost()) api.doPublish();
    for (const bd of api.BUILDINGS) { let guard = 0; while (guard < 20 && (bd.cur === "cv" ? s.cv : s.cap) >= api.cost(bd)) { api.buy(bd); guard += 1; } }
    if (s.cv > 400 && t % 5 === 0) api.doRaise();
  }
  const s = S();
  return { t, ended: s.ended, snipes: s.snipes, coh: s.coh, dse: window.__dse() };
})()`;

const browser = await launchChrome();
const results = {};
try {
  const page = await browser.newPage({ width: 1280, height: 900 });
  await page.goto(base, { settle: 800 });
  await page.eval("localStorage.clear()");
  await page.goto(base, { settle: 800 });
  results.act1 = await page.eval(ACT1);
  await page.goto(`${base}coherence/`, { settle: 800 });
  await page.eval("document.querySelector('[data-testid=begin]')?.click()");
  results.act2 = await page.eval(ACT2);
} finally {
  await browser.close();
  if (local) await local.close();
}

const minutes = (seconds) => (seconds === null ? "never" : `${(seconds / 60).toFixed(1)} min`);
const lines = [
  "## Balance (scripted players, game time)",
  "",
  `- Act I: The Defection opens after ${minutes(results.act1.defectAt)} (coagulation ${results.act1.coag.toFixed(1)}%, coherence ${results.act1.coh.toFixed(1)}% after ${minutes(results.act1.t)}${results.act1.ended ? `, ended: ${results.act1.ended}` : ""})`,
  `- Act II: ending "${results.act2.ended}" after ${minutes(results.act2.t)} (defections ${results.act2.snipes}/12, coherence ${results.act2.coh.toFixed(0)}%)`,
];
console.log(lines.join("\n"));
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join("\n") + "\n");
const problems = [];
const firstRun = results.act1.defectAt === null ? null : results.act1.defectAt + results.act2.t;
lines.push(`- First run, defecting at once: ${minutes(firstRun)}`);
console.log(lines[lines.length - 1]);
if (firstRun === null || firstRun < 8 * 60 || firstRun > 45 * 60) problems.push("A scripted first run that defects should take 8-45 minutes");
if (!results.act1.ended || results.act1.t < 15 * 60) problems.push("A first run that never defects should reach an Act I ending within 15-70 minutes");
if (!results.act2.ended || results.act2.t > 35 * 60) problems.push("Act II should reach an ending within 35 minutes");
for (const problem of problems) console.log(`::error::${problem}`);
process.exit(problems.length ? 1 : 0);
