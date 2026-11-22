// End-to-end test in headless Chrome: both acts, the hand-off between them, saves, endings, cards, links.
//   node scripts/e2e.mjs                         serve dist/ and test it
//   node scripts/e2e.mjs https://host/path/      test a deployed site
import { launchChrome } from "./lib/cdp.mjs";
import { startServer } from "./serve.mjs";

const target = process.argv[2];
const local = target ? null : await startServer({ basePath: "/coagulation-corp-incremental-game/" });
const base = (target || local.url).replace(/\/*$/, "/");
const failures = [];
const check = (condition, message) => {
  console.log(`${condition ? "ok  " : "FAIL"} ${message}`);
  if (!condition) failures.push(message);
};
const text = (selector) => `(document.querySelector(${JSON.stringify(selector)})?.textContent || "").trim()`;
const exists = (selector) => `Boolean(document.querySelector(${JSON.stringify(selector)}))`;
const overflow = "document.documentElement.scrollWidth - window.innerWidth";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const RENAMED = /gollum|one ring|precious|black mirror|ring-bearer|resistance is futile|gentle singularity|long-term benefit trust/i;

const browser = await launchChrome();
try {
  const page = await browser.newPage({ width: 1366, height: 900 });
  // Start from an empty browser profile for this origin (a game-free page, so no game writes on close).
  await page.goto(`${base}about/`);
  await page.eval("localStorage.clear()");
  await page.goto(base, { settle: 800 });

  // ---- Act I ----
  check((await page.eval("document.title")).includes("Coagulation Corp"), "Act I loads with its title");
  check((await page.eval(text("#corpName"))) === "COAGULATION CORP", "Act I shows Coagulation Corp");
  check((await page.eval(text('[data-testid="fiction-strip"]'))).includes("A work of fiction"), "the fiction note is on the page");
  check(!(await page.eval(exists('[data-testid="challenge-banner"]'))), "no challenge banner without a link");
  check(!RENAMED.test(await page.eval("document.body.innerText")), "no trademarked or real-world names on screen");
  await page.eval("for (let i = 0; i < 25; i += 1) document.getElementById('extract').click()");
  await sleep(300);
  const att = await page.eval("window.__game.S.att");
  check(att > 0 && (await page.eval("window.__game.S.clicks")) === 25, "clicking extracts attention");
  await page.eval("document.querySelector('#assets [data-b]')?.click()");
  check((await page.eval("window.__game.S.a.loop")) >= 1, "the first asset can be bought");
  await page.goto(base, { settle: 800 });
  check((await page.eval("window.__game.S.clicks")) === 25 && (await page.eval("window.__game.S.a.loop")) >= 1, "a reload restores the saved run");
  check((await page.eval("document.getElementById('toasts').innerText")).includes("WELCOME BACK"), "the game says the run was restored");

  // ---- An Act I ending, its card and the gallery ----
  await page.eval("window.__game.S.coh = 0; window.__game.step(0.1); window.__game.render()");
  await sleep(200);
  check((await page.eval(text("#card h2"))) === "FLATLINE", "coherence at zero ends Act I as FLATLINE");
  check((await page.eval("document.querySelector('[data-testid=ending-card]')?.dataset.drawn")) === "yes", "the ending card is drawn");
  const shareLink = await page.eval("document.querySelector('[data-testid=share-link]')?.href || ''");
  check(new URL(shareLink || "http://x/").searchParams.get("ending") === "a1-flatline", "the share link names the ending");
  check((await page.eval(text('[data-testid="ending-gallery"] .ending-gallery-head'))).includes("1/10"), "the gallery counts one ending of ten");
  check((await page.eval("JSON.parse(localStorage.getItem('coagulation-corp-endings-v1') || '{}')['a1-flatline'] !== undefined")), "the ending is remembered in this browser");
  await page.eval("document.querySelector('[data-testid=new-timeline]').click()");
  await sleep(200);
  check((await page.eval("window.__game.S.clicks")) === 0 && !(await page.eval("window.__game.S.ended")), "a new timeline starts fresh");

  // ---- The Defection hands over to Act II ----
  // Coagulation is recomputed from total compute every frame, so set the compute that gives 40%.
  await page.eval("window.__game.S.lifeClicks = 600; window.__game.S.conv = 25; window.__game.S.coh = 77; window.__game.S.totalFlop = Math.pow(10, 1.6 + 0.40 * 14); window.__game.render()");
  await sleep(300);
  check((await page.eval("getComputedStyle(document.getElementById('defectBtn')).display")) !== "none", "The Defection appears after 600 lifetime clicks");
  await page.eval("document.getElementById('defectBtn').click()");
  check((await page.eval(text("#card h2"))) === "THE DEFECTION", "The Defection explains what carries over");
  await page.eval("document.querySelector('[data-testid=confirm-defect]').click()").catch(() => null);
  for (let wait = 0; wait < 60; wait += 1) {
    await sleep(250);
    const where = await page.eval("location.pathname + '|' + document.readyState").catch(() => "");
    if (where.includes("/coherence/|complete")) break;
  }
  await sleep(1200);
  check((await page.eval("location.pathname")).endsWith("/coherence/"), "defecting opens Act II");
  const intro = await page.eval(text(".modal"));
  check(intro.includes("You defected"), "Act II's briefing says you defected");
  check(Math.abs((await page.eval("window.__G().coh")) - 77) < 1, "Act I's coherence carries over");
  check((await page.eval("window.__G().wisdom")) === 5, "Act I's conviction becomes wisdom (√25 = 5)");
  check((await page.eval("window.__G().comp")) > 1e6 * 9, "Coagulation Corp's curve starts further along after a late defection");
  await page.eval("document.querySelector('[data-testid=begin]').click()");
  await page.eval("for (let i = 0; i < 20; i += 1) document.getElementById('btnClick').click()");
  check((await page.eval("window.__G().clicks")) === 20 && (await page.eval("window.__G().cv")) > 0, "sharing the meme earns conviction");
  await sleep(2300);
  await page.goto(`${base}coherence/`, { settle: 900 });
  check((await page.eval("window.__G().clicks")) === 20, "a reload restores the Act II run");
  check((await page.eval(text(".modal"))).includes("Welcome back"), "Act II says the run was restored");

  // ---- An Act II ending ----
  await page.eval("document.querySelector('[data-testid=begin]').click(); window.__endGame('conversion')");
  await sleep(300);
  check((await page.eval(text(".modal h2"))) === "THE CONVERSION", "Act II can end in THE CONVERSION");
  check((await page.eval("document.querySelector('[data-testid=ending-card]')?.dataset.drawn")) === "yes", "the Act II ending card is drawn");
  check((await page.eval(text('[data-testid="ending-gallery"] .ending-gallery-head'))).includes("2/10"), "the gallery now counts two endings");
  check(await page.eval(exists('[data-testid="back-to-act1"]')), "the ending offers a way back to Act I");
  await sleep(2300);
  await page.goto(`${base}coherence/`, { settle: 900 });
  check((await page.eval(text(".modal h2"))) === "THE CONVERSION", "a reload shows the reached ending again");
  check(!RENAMED.test(await page.eval("document.body.innerText")), "Act II shows no trademarked or real-world names");
  check(page.problems.length === 0, `no console errors in either act${page.problems.length ? ": " + page.problems.slice(0, 3).join(" | ") : ""}`);
  await page.close();

  // ---- A shared ending link, and broken save codes ----
  const friend = await browser.newPage({ width: 1280, height: 900 });
  await friend.goto(`${base}?ending=a2-conversion`, { settle: 900 });
  check((await friend.eval(text('[data-testid="challenge-banner"]'))).includes("THE CONVERSION"), "a shared link shows which ending a friend reached");
  await friend.eval("document.getElementById('loadBtn').click()");
  await friend.eval("document.getElementById('ta').value = 'not a save'; window.tryLoad()");
  await sleep(200);
  check((await friend.eval("document.getElementById('toasts').innerText")).includes("INVALID"), "a broken save code is refused");
  check((await friend.eval("window.__game.S.ended")) === false, "the run survives a broken code");
  check(friend.problems.length === 0, `no console errors for a visitor from a link${friend.problems.length ? ": " + friend.problems.join(" | ") : ""}`);
  await friend.close();

  // ---- Phone ----
  const phone = await browser.newPage({ width: 390, height: 844, mobile: true });
  for (const [path, label] of [["", "Act I"], ["coherence/", "Act II"], ["guide/", "the guide"], ["about/", "the about page"]]) {
    await phone.goto(`${base}${path}`, { settle: 900 });
    check((await phone.eval(overflow)) <= 1, `${label} has no sideways scroll on a phone`);
  }
  await phone.goto(base, { settle: 900 });
  const top = await phone.eval("document.getElementById('extract').getBoundingClientRect().top + window.scrollY");
  check(top < 844 * 1.6, `the extract button is near the top on a phone (${Math.round(top)}px)`);
  await phone.goto(`${base}guide/`);
  check((await phone.eval("document.querySelector('.table tbody').querySelectorAll('tr').length")) === 10, "the guide lists all ten endings");
  check(phone.problems.length === 0, `no console errors on a phone${phone.problems.length ? ": " + phone.problems.slice(0, 3).join(" | ") : ""}`);
  await phone.close();

  const missing = await fetch(`${base}no-such-page/`);
  check(missing.status === 404 && (await missing.text()).includes("PLAY COAGULATION CORP"), "unknown addresses get the 404 page");
} finally {
  await browser.close();
  if (local) await local.close();
}

if (failures.length) {
  console.error(`\n${failures.length} check(s) failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log(`\nall checks passed for ${base}`);
