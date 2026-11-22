// Render the 1200x630 share image (public/og.jpg) in headless Chrome. Committed, so builds need no Chrome.
//   node scripts/og.mjs
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { launchChrome } from "./lib/cdp.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;width:1200px;height:630px;overflow:hidden}
body{background:radial-gradient(ellipse 90% 70% at 50% -20%,rgba(240,168,60,.16),transparent 60%),radial-gradient(ellipse 70% 60% at 50% 120%,rgba(58,216,204,.12),transparent 60%),#08080b;
 color:#d6d6e0;font-family:ui-monospace,"SF Mono",Menlo,Consolas,monospace;box-sizing:border-box;padding:64px 72px;display:flex;flex-direction:column;justify-content:space-between}
.k{font-size:20px;letter-spacing:.18em;color:#71718a}
h1{margin:14px 0 0;font-size:92px;letter-spacing:.06em;color:#f0a83c;text-shadow:0 0 40px rgba(240,168,60,.45);line-height:1}
h1 span{color:#3ad8cc;text-shadow:0 0 40px rgba(58,216,204,.45)}
p{margin:18px 0 0;font-size:27px;line-height:1.45;color:#c3cfda;max-width:1000px}
.m{display:grid;grid-template-columns:1fr 1fr;gap:22px}
.meter{border:1px solid #24242f;border-radius:10px;padding:14px 16px;background:#0b0b10}
.lab{display:flex;justify-content:space-between;font-size:17px;letter-spacing:.12em;color:#71718a;margin-bottom:10px}.lab b{color:#d6d6e0}
.bar{height:14px;background:#1a1a23;border-radius:7px;overflow:hidden}.bar i{display:block;height:100%;border-radius:7px}
.a i{width:64%;background:linear-gradient(90deg,#8a4a1a,#f0a83c);box-shadow:0 0 18px rgba(240,168,60,.6)}
.c i{width:31%;background:linear-gradient(90deg,#1e6b5c,#3ad8cc);box-shadow:0 0 18px rgba(58,216,204,.5)}
.f{font-size:18px;letter-spacing:.14em;color:#4a4a5c}
</style></head><body>
<div><div class="k">A SATIRICAL INCREMENTAL GAME IN TWO ACTS</div><h1>COAGULATION <span>CORP</span></h1>
<p>Act I: turn attention into capital into compute. Act II: defect, and race it to superintelligence.</p></div>
<div class="m"><div class="meter a"><div class="lab"><span>COAGULATION</span><b>64.20%</b></div><div class="bar"><i></i></div></div>
<div class="meter c"><div class="lab"><span>HUMAN COHERENCE</span><b>31.0%</b></div><div class="bar"><i></i></div></div></div>
<div class="f">10 ENDINGS · FREE IN YOUR BROWSER · A WORK OF FICTION</div>
</body></html>`;
const work = fs.mkdtempSync(path.join(os.tmpdir(), "og-"));
fs.writeFileSync(path.join(work, "og.html"), html);
const browser = await launchChrome();
try {
  const page = await browser.newPage({ width: 1200, height: 630 });
  await page.goto(pathToFileURL(path.join(work, "og.html")).href, { settle: 600 });
  const { data } = await page.call("Page.captureScreenshot", { format: "jpeg", quality: 88 });
  fs.writeFileSync(path.join(ROOT, "public", "og.jpg"), Buffer.from(data, "base64"));
  console.log(`wrote public/og.jpg (${(fs.statSync(path.join(ROOT, "public", "og.jpg")).size / 1024).toFixed(0)} KB)`);
} finally {
  await browser.close();
  fs.rmSync(work, { recursive: true, force: true });
}
