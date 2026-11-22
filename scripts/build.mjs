// Build the static site into dist/: Act I at /, Act II at /coherence/, the guide, the about page, and the
// search files. Settings come from environment variables (see .env.example).
//   node scripts/build.mjs
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as esbuild from "esbuild";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const site = JSON.parse(fs.readFileSync(path.join(ROOT, "site.json"), "utf8"));
const env = process.env;
const OUT = path.resolve(ROOT, env.OUT_DIR || "dist");
const siteUrl = (env.SITE_URL || site.defaultSiteUrl).replace(/\/+$/, "");
const staged = /^(1|true|yes)$/i.test(env.STAGED || "");
const basePath = new URL(siteUrl + "/").pathname;

function httpsUrl(value) {
  if (!value) return "";
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}
const config = {
  siteUrl,
  repoUrl: env.REPO_URL || site.repoUrl,
  supportUrl: httpsUrl(env.SUPPORT_URL),
  supportLabel: (env.SUPPORT_LABEL || "SUPPORT THE GAME").slice(0, 60),
  goatcounterUrl: httpsUrl(env.GOATCOUNTER_URL),
  staged,
  build: (env.BUILD_ID || env.GITHUB_SHA || "dev").slice(0, 40),
  moreGames: site.moreGames,
};

const escapeHtml = (text) => String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const jsonForScript = (value) =>
  JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(new RegExp(String.fromCharCode(0x2028), "g"), "\\u2028")
    .replace(new RegExp(String.fromCharCode(0x2029), "g"), "\\u2029");
const hashOf = (buffer) => createHash("sha256").update(buffer).digest("hex").slice(0, 10);
function lastChange() {
  try {
    return execFileSync("git", ["log", "-1", "--format=%cs"], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, "assets"), { recursive: true });
fs.cpSync(path.join(ROOT, "public"), OUT, { recursive: true });

async function asset(name, contents, extension) {
  const file = `${name}.${hashOf(contents)}.${extension}`;
  fs.writeFileSync(path.join(OUT, "assets", file), contents);
  return file;
}
async function css(file, name) {
  const result = await esbuild.transform(fs.readFileSync(path.join(ROOT, "src", file), "utf8"), { loader: "css", minify: true });
  return asset(name, result.code, "css");
}
async function js(file, name) {
  const result = await esbuild.build({
    entryPoints: [path.join(ROOT, "src", file)],
    bundle: true,
    format: "esm",
    target: ["es2020"],
    minify: true,
    legalComments: "none",
    write: false,
  });
  return asset(name, result.outputFiles[0].contents, "js");
}

const files = {
  act1Css: await css("act1/style.css", "act1"),
  act2Css: await css("act2/style.css", "act2"),
  docCss: await css("doc.css", "doc"),
  act1Js: await js("act1/game.js", "act1"),
  act2Js: await js("act2/game.js", "act2"),
};

const description =
  "A free satirical incremental game in two acts. Act I: run Coagulation Corp and turn attention into capital into compute. Act II: defect and race it to superintelligence. Ten endings. A work of fiction. No account, no ads.";
const shareDescription = "Run the company eating the attention economy, or defect and race it to superintelligence. Ten endings. Free, in your browser. Satire.";

function supportMarkup() {
  return config.supportUrl ? `<a href="${escapeHtml(config.supportUrl)}" rel="noopener" data-testid="support-link">${escapeHtml(config.supportLabel)}</a>` : "";
}

function page({ file, title, pageDescription, body, prefix, css, script, jsonLd = [], themeColor = "#08080b", bodyClass = "" }) {
  const canonical = `${siteUrl}/${file === "index.html" ? "" : file.replace(/index\.html$/, "")}`;
  const image = `${siteUrl}/og.jpg`;
  const robots = staged ? "noindex, nofollow" : "index, follow, max-image-preview:large";
  const analytics = config.goatcounterUrl ? `\n<script data-goatcounter="${escapeHtml(config.goatcounterUrl)}" async src="https://gc.zgo.at/count.js"></script>` : "";
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(pageDescription)}">
<link rel="canonical" href="${escapeHtml(canonical)}">
<meta name="robots" content="${robots}">
<meta name="theme-color" content="${themeColor}">
<link rel="icon" href="${prefix}favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="${prefix}assets/${css}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${escapeHtml(site.name)}">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(shareDescription)}">
<meta property="og:url" content="${escapeHtml(canonical)}">
<meta property="og:image" content="${escapeHtml(image)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Coagulation Corp: an incremental game with a coagulation meter racing a human coherence meter.">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(shareDescription)}">
<meta name="twitter:image" content="${escapeHtml(image)}">
${jsonLd.map((item) => `<script type="application/ld+json">${jsonForScript(item)}</script>`).join("\n")}
</head>
<body${bodyClass ? ` class="${bodyClass}"` : ""}>
${body.replace('<span id="supportSlot"></span>', supportMarkup())}
${script ? `<noscript><p style="padding:16px;font-family:monospace;color:#d6d6e0">Coagulation Corp is a browser game and needs JavaScript. The <a style="color:#f0a83c" href="${prefix}guide/">guide</a> explains how it works.</p></noscript>
<script id="site-config" type="application/json">${jsonForScript(config)}</script>
<script type="module" src="${prefix}assets/${script}"></script>` : ""}${analytics}
</body>
</html>
`;
  const target = path.join(OUT, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, html);
  return canonical;
}

const gameLd = {
  "@context": "https://schema.org",
  "@type": "VideoGame",
  name: site.name,
  url: `${siteUrl}/`,
  description,
  image: `${siteUrl}/og.jpg`,
  genre: ["Incremental game", "Idle game", "Clicker game", "Satire"],
  gamePlatform: "Web browser",
  applicationCategory: "Game",
  operatingSystem: "Any",
  playMode: "SinglePlayer",
  inLanguage: "en",
  isAccessibleForFree: true,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  publisher: { "@type": "Organization", name: site.name, url: config.repoUrl },
};
const crumbs = (name, url) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: site.name, item: `${siteUrl}/` },
    { "@type": "ListItem", position: 2, name, item: url },
  ],
});

const pages = await import(pathToFileURL(path.join(ROOT, "src", "pages.mjs")).href + `?t=${Date.now()}`);
const urls = [
  page({
    file: "index.html",
    title: "Coagulation Corp — a Satirical Incremental Game (Free, Like Universal Paperclips)",
    pageDescription: description,
    body: fs.readFileSync(path.join(ROOT, "src", "act1", "page.html"), "utf8"),
    prefix: "",
    css: files.act1Css,
    script: files.act1Js,
    jsonLd: [gameLd],
  }),
  page({
    file: "coherence/index.html",
    title: "Coherence Corp vs Coagulation Corp — Act II: the Race to Superintelligence",
    pageDescription:
      "Act II of Coagulation Corp: found Coherence Corp and race your old company to 200,000× data scaling efficiency. Bring their researchers over, keep your coherence, and find seven of the ten endings.",
    body: fs.readFileSync(path.join(ROOT, "src", "act2", "page.html"), "utf8"),
    prefix: "../",
    css: files.act2Css,
    script: files.act2Js,
    jsonLd: [crumbs("Act II: Coherence Corp", `${siteUrl}/coherence/`)],
    themeColor: "#080a0e",
  }),
  page({
    file: "guide/index.html",
    title: "Coagulation Corp: All 10 Endings and How to Reach Them (Guide)",
    pageDescription:
      "Every ending in Coagulation Corp and how to reach it, how The Defection works, and every asset, upgrade, research node and defector in both acts, from the game's own data.",
    body: pages.guidePage(config),
    prefix: "../",
    css: files.docCss,
    script: null,
    jsonLd: [crumbs("Guide", `${siteUrl}/guide/`), pages.faqLd()],
  }),
  page({
    file: "about/index.html",
    title: "About Coagulation Corp — Satire, Privacy and Credits",
    pageDescription: "What Coagulation Corp is, why it is satire and fiction, how saves stay on your device, how to embed the game, and where it came from.",
    body: pages.aboutPage(config),
    prefix: "../",
    css: files.docCss,
    script: null,
    jsonLd: [crumbs("About", `${siteUrl}/about/`)],
  }),
];

fs.writeFileSync(
  path.join(OUT, "404.html"),
  `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Page not found · ${escapeHtml(site.name)}</title><meta name="robots" content="noindex">
<style>body{background:#08080b;color:#d6d6e0;font-family:ui-monospace,Menlo,Consolas,monospace;margin:0;min-height:100vh;display:grid;place-items:center;text-align:center;padding:24px}
h1{color:#f0a83c;letter-spacing:.14em;font-size:clamp(22px,5vw,40px);margin:0 0 14px}p{color:#71718a}
a{display:inline-block;margin-top:20px;padding:12px 16px;border:1px solid #5a3a1a;border-radius:7px;color:#f0a83c;text-decoration:none;letter-spacing:.1em}</style></head>
<body><main><h1>THIS TIMELINE WAS NEVER FORKED.</h1><p>The page you asked for is not here.</p><a href="${escapeHtml(basePath)}">PLAY COAGULATION CORP →</a></main></body></html>
`,
);

const lastmod = lastChange();
if (staged) {
  fs.writeFileSync(path.join(OUT, "robots.txt"), "User-agent: *\nAllow: /\n# Staged copy: every page is marked noindex and no sitemap is published.\n");
} else {
  fs.writeFileSync(
    path.join(OUT, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url><loc>${escapeHtml(url)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}</url>`).join("\n")}
</urlset>
`,
  );
  fs.writeFileSync(path.join(OUT, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`);
}
fs.writeFileSync(path.join(OUT, "urls.txt"), staged ? "" : urls.join("\n") + "\n");
fs.writeFileSync(
  path.join(OUT, "build.json"),
  JSON.stringify({ build: config.build, siteUrl, staged, pages: urls.length, scripts: [files.act1Js, files.act2Js] }, null, 2) + "\n",
);
const kb = (file) => `${(fs.statSync(path.join(OUT, "assets", file)).size / 1024).toFixed(1)} KB`;
console.log(`built ${path.relative(ROOT, OUT)}/ for ${siteUrl}${staged ? " (staged: noindex)" : ""}`);
console.log(`  act1 ${kb(files.act1Js)} + ${kb(files.act1Css)}, act2 ${kb(files.act2Js)} + ${kb(files.act2Css)}, ${urls.length} pages`);
