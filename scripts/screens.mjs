// Screenshots of both acts and the reading pages at desktop and phone widths into docs/screens/.
// Mid-run states come from a short scripted run in the page, so they are real game states.
//   node scripts/screens.mjs                    from dist/, served locally
//   node scripts/screens.mjs https://host/path/
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { launchChrome } from "./lib/cdp.mjs";
import { startServer } from "./serve.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "docs", "screens");
const target = process.argv[2];
const local = target ? null : await startServer({ basePath: "/coagulation-corp-incremental-game/" });
const base = (target || local.url).replace(/\/*$/, "/");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// A few minutes of Act I, played by script, then the toasts cleared for a clean shot.
const PLAY_ACT1 = (seconds) => `(() => {
  const g = window.__game;
  for (let t = 0; t < ${seconds}; t += 1) {
    for (let i = 0; i < 4; i += 1) g.click(null);
    for (let k = 0; k < 10; k += 1) g.step(0.1);
    for (const a of g.ASSETS) { const cur = a.t === "flop" ? "cap" : "att"; let n = 0; while (g.S[cur] >= g.cost(a.id) && n < 30) { g.buy(a.id, 1); n += 1; } }
    for (const u of g.UPGRADES) { try { if (!u.danger && !g.S.u[u.id] && u.req(g.S) && g.S[u.cu] >= u.c) g.buyUp(u.id); } catch (e) {} }
  }
  g.render();
  document.getElementById("toasts").textContent = "";
  document.querySelectorAll(".signal").forEach((node) => node.remove());
})()`;
const PLAY_ACT2 = (seconds) => `(() => {
  const api = window.__api; const S = window.__G(); S.paused = false;
  for (let t = 0; t < ${seconds}; t += 1) {
    for (let i = 0; i < 4; i += 1) api.doClick();
    for (let k = 0; k < 10; k += 1) window.__step(0.1);
    for (const p of S.ppl) { if (p.unlocked && !p.flipped) { if (api.snipeOdds(p) >= 0.85) { const c = api.snipeCost(p); if (S.cv >= c.cv && S.cap >= c.cap) api.snipe(p); } else if (S.cv >= api.memoCost(p) * 3) api.sendMemo(p); } }
    for (const r of api.RESEARCH) if (r.id !== "r9") api.buyResearch(r);
    for (const bd of api.BUILDINGS) { let n = 0; while (n < 10 && (bd.cur === "cv" ? S.cv : S.cap) >= api.cost(bd)) { api.buy(bd); n += 1; } }
    if (S.cv > 400 && t % 5 === 0) api.doRaise();
  }
  document.getElementById("toasts").textContent = "";
})()`;

const shots = [
  // [name, path, width, height, phone?, prepare]
  ["act1-start-desktop", "", 1366, 900, false, null],
  ["act1-midrun-desktop", "", 1366, 900, false, PLAY_ACT1(240)],
  ["act1-midrun-phone", "", 390, 844, true, PLAY_ACT1(240)],
  ["act1-ending-desktop", "", 1366, 900, false, `${PLAY_ACT1(120)}; window.__game.S.coh = 0; window.__game.step(0.1); window.__game.render()`],
  ["act2-briefing-desktop", "coherence/", 1366, 900, false, null],
  ["act2-race-desktop", "coherence/", 1366, 900, false, `document.querySelector('[data-testid=begin]')?.click(); ${PLAY_ACT2(300)}`],
  ["act2-race-phone", "coherence/", 390, 844, true, `document.querySelector('[data-testid=begin]')?.click(); ${PLAY_ACT2(300)}`],
  ["act2-ending-phone", "coherence/", 390, 844, true, `document.querySelector('[data-testid=begin]')?.click(); window.__endGame('conversion')`],
  ["guide-desktop", "guide/", 1280, 1000, false, null],
  ["about-phone", "about/", 390, 844, true, null],
];

fs.mkdirSync(OUT, { recursive: true });
const browser = await launchChrome();
const overflow = [];
try {
  for (const [name, pagePath, width, height, mobile, prepare] of shots) {
    const page = await browser.newPage({ width, height, mobile });
    await page.goto(`${base}about/`);
    await page.eval("localStorage.clear()");
    await page.goto(`${base}${pagePath}?shot=${name}`, { settle: 1000 });
    if (prepare) {
      await page.eval(prepare);
      await sleep(600);
    }
    const wide = await page.eval("document.documentElement.scrollWidth - window.innerWidth");
    if (wide > 1) overflow.push(`${name}: ${wide}px wider than the screen`);
    await page.screenshot(path.join(OUT, `${name}.png`));
    console.log(`saved docs/screens/${name}.png`);
    if (name === "act2-ending-phone") {
      const png = await page.eval(`document.querySelector('[data-testid="ending-card"]')?.toDataURL("image/png") || ""`);
      if (png.startsWith("data:image/png;base64,")) {
        fs.writeFileSync(path.join(OUT, "ending-card.png"), Buffer.from(png.split(",")[1], "base64"));
        console.log("saved docs/screens/ending-card.png");
      }
    }
    await page.close();
  }
} finally {
  await browser.close();
  if (local) await local.close();
}
if (overflow.length) {
  console.log(`SIDEWAYS SCROLL:\n  ${overflow.join("\n  ")}`);
  process.exitCode = 1;
}
