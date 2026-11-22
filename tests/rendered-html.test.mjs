// Tests of the built site in dist/ (run `npm run build` first), plus extra builds for a custom domain and a
// staged copy. Expected values come from site.json and the game data.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { ENDINGS } from "../src/shared/endings.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const site = JSON.parse(fs.readFileSync(path.join(ROOT, "site.json"), "utf8"));
const PAGES = ["index.html", "coherence/index.html", "guide/index.html", "about/index.html"];
const read = (dir, file) => fs.readFileSync(path.join(dir, file), "utf8");
const meta = (html, attribute, name) => (html.match(new RegExp(`<meta ${attribute}="${name}" content="([^"]*)"`)) || [])[1] ?? null;
const canonical = (html) => (html.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
const jsonLd = (html) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((match) => JSON.parse(match[1]));
function build(env) {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "coag-build-"));
  execFileSync(process.execPath, [path.join(ROOT, "scripts", "build.mjs")], {
    cwd: ROOT,
    env: { ...process.env, SITE_URL: "", STAGED: "", SUPPORT_URL: "", GOATCOUNTER_URL: "", ...env, OUT_DIR: out },
    stdio: "pipe",
  });
  return out;
}
const config = JSON.parse(read(DIST, "index.html").match(/<script id="site-config" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const base = config.siteUrl;

test("both acts ship their markup and their own script", () => {
  const act1 = read(DIST, "index.html");
  assert.ok(act1.includes('id="extract"') && act1.includes("COAGULATION CORP") && act1.includes("A work of fiction"));
  assert.match(act1, /<script type="module" src="assets\/act1\.[0-9a-f]{10}\.js"><\/script>/);
  const act2 = read(DIST, "coherence/index.html");
  assert.ok(act2.includes('id="btnClick"') && act2.includes("COHERENCE CORP") && act2.includes("A work of fiction"));
  assert.match(act2, /<script type="module" src="\.\.\/assets\/act2\.[0-9a-f]{10}\.js"><\/script>/);
});

test("no trademarked or real-world names in anything shipped", () => {
  const banned = /gollum|one ring|precious|black mirror|ring-bearer|resistance is futile|gentle singularity|long-term benefit trust/i;
  for (const file of fs.readdirSync(path.join(DIST, "assets"))) {
    const text = read(DIST, `assets/${file}`).replace(/["']gollum["']|\.gollum|gollum:|a2-gollum/g, "");
    assert.doesNotMatch(text, banned, `assets/${file}`);
  }
  for (const file of PAGES) assert.doesNotMatch(read(DIST, file), banned, file);
});

test("every page has its own canonical, description and share tags", () => {
  for (const file of PAGES) {
    const html = read(DIST, file);
    assert.equal(canonical(html), `${base}/${file.replace(/index\.html$/, "")}`, `${file} canonical`);
    assert.equal(meta(html, "property", "og:url"), canonical(html));
    assert.equal(meta(html, "property", "og:image"), `${base}/og.jpg`);
    assert.ok((meta(html, "name", "description") || "").length > 60);
    assert.equal(meta(html, "name", "robots"), "index, follow, max-image-preview:large");
    for (const item of jsonLd(html)) assert.ok(item["@context"] && item["@type"]);
  }
});

test("local links and assets resolve inside dist/", () => {
  for (const file of PAGES) {
    const html = read(DIST, file);
    for (const [, ref] of html.matchAll(/(?:href|src)="([^"#]+)"/g)) {
      if (/^(https?:|mailto:|data:)/.test(ref)) continue;
      assert.ok(!ref.startsWith("/"), `${file}: ${ref} is relative`);
      const target = path.normalize(path.join(DIST, path.dirname(file), ref.split("?")[0]));
      const resolved = fs.existsSync(target) && fs.statSync(target).isDirectory() ? path.join(target, "index.html") : target;
      assert.ok(fs.existsSync(resolved), `${file} links to ${ref}`);
    }
  }
});

test("the guide lists every ending from the registry, with FAQ data", () => {
  const html = read(DIST, "guide/index.html");
  for (const ending of ENDINGS) assert.ok(html.includes(ending.title), `the guide names ${ending.title}`);
  const faq = jsonLd(html).find((item) => item["@type"] === "FAQPage");
  assert.ok(faq && faq.mainEntity.length >= 5);
  assert.ok(!html.includes('src="../assets/'), "the guide needs no script");
});

test("the about page states the satire, privacy and history", () => {
  const html = read(DIST, "about/index.html");
  assert.match(html, /Satire, and a work of fiction/);
  assert.match(html, /never uploaded/);
  assert.match(html, /Sound is off until you turn it on/);
  assert.ok(html.includes(site.repoUrl));
});

test("search files list exactly the pages and the key file matches", () => {
  const locs = [...read(DIST, "sitemap.xml").matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  assert.deepEqual(locs, PAGES.map((file) => `${base}/${file.replace(/index\.html$/, "")}`));
  assert.equal(read(DIST, "robots.txt").trim().split("\n").pop(), `Sitemap: ${base}/sitemap.xml`);
  assert.deepEqual(read(DIST, "urls.txt").trim().split("\n"), locs);
  assert.equal(read(DIST, `${site.indexNowKey}.txt`), site.indexNowKey);
  assert.match(read(DIST, "404.html"), /PLAY COAGULATION CORP/);
  assert.ok(fs.statSync(path.join(DIST, "og.jpg")).size < 1_000_000);
});

test("a custom-domain build switches every address with one setting", () => {
  const out = build({ SITE_URL: "https://play.example.org" });
  try {
    assert.equal(canonical(read(out, "coherence/index.html")), "https://play.example.org/coherence/");
    assert.match(read(out, "robots.txt"), /Sitemap: https:\/\/play\.example\.org\/sitemap\.xml/);
    assert.match(read(out, "404.html"), /href="\/"/);
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});

test("a staged build is noindex everywhere and publishes no sitemap", () => {
  const out = build({ STAGED: "true" });
  try {
    for (const file of PAGES) assert.equal(meta(read(out, file), "name", "robots"), "noindex, nofollow");
    assert.ok(!fs.existsSync(path.join(out, "sitemap.xml")));
    assert.equal(read(out, "urls.txt"), "");
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});

test("the optional slots stay off until set, and accept only https", () => {
  const off = build({ SUPPORT_URL: "javascript:alert(1)", GOATCOUNTER_URL: "http://insecure.example/count" });
  try {
    const html = read(off, "index.html");
    assert.ok(!html.includes("javascript:alert") && !html.includes("gc.zgo.at") && !html.includes('data-testid="support-link"'));
  } finally {
    fs.rmSync(off, { recursive: true, force: true });
  }
  const on = build({ SUPPORT_URL: "https://example.org/tip", SUPPORT_LABEL: "Tip jar", GOATCOUNTER_URL: "https://demo.goatcounter.com/count" });
  try {
    for (const file of ["index.html", "coherence/index.html"]) {
      const html = read(on, file);
      assert.ok(html.includes('data-testid="support-link"') && html.includes("Tip jar"), `${file} shows the money slot`);
      assert.ok(html.includes('data-goatcounter="https://demo.goatcounter.com/count"'));
    }
  } finally {
    fs.rmSync(on, { recursive: true, force: true });
  }
});
