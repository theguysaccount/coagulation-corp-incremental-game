// Content and rules checks for both acts. Expected values are derived from the data, so changing the content
// only fails a test when it breaks a promise the game makes on screen.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { ACHS, ASSETS, SYNTH, UPGRADES } from "../src/act1/data.js";
import { BUILDINGS, COMP_GOAL, COMP_START, DARK, DSE_GOAL, PEOPLE, RESEARCH, STRUCTURE } from "../src/act2/data.js";
import { ENDINGS, ENDING_BY_ID, endingFor, parseEndingParam } from "../src/shared/endings.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(ROOT, file), "utf8");
const unique = (list) => new Set(list).size === list.length;

test("ten endings with unique ids and titles, at least one good ending per act two", () => {
  assert.equal(ENDINGS.length, 10);
  assert.ok(unique(ENDINGS.map((ending) => ending.id)));
  assert.ok(unique(ENDINGS.map((ending) => ending.title)));
  assert.equal(ENDINGS.filter((ending) => ending.act === 1).length, 3);
  assert.equal(ENDINGS.filter((ending) => ending.act === 2).length, 7);
  assert.ok(ENDINGS.some((ending) => ending.good));
  for (const ending of ENDINGS) assert.ok(ending.how.length > 20 && ending.subtitle.length > 5);
});

test("every ending the games can call exists in the registry", () => {
  const act1 = read("src/act1/game.js");
  const act2 = read("src/act2/game.js");
  for (const key of [...act1.matchAll(/end\('([a-z]+)'\)/g)].map((match) => match[1])) {
    assert.ok(endingFor(1, key), `Act I ending "${key}" is registered`);
  }
  for (const key of [...act2.matchAll(/endGame\('([a-z]+)'\)/g)].map((match) => match[1])) {
    assert.ok(endingFor(2, key), `Act II ending "${key}" is registered`);
  }
  for (const key of ["coherent", "pyrrhic", "conversion"]) assert.ok(endingFor(2, key));
});

test("shared ending links accept only known endings", () => {
  assert.equal(parseEndingParam("?ending=a2-conversion"), "a2-conversion");
  assert.equal(parseEndingParam("?x=1&ending=a1-flatline&y=2"), "a1-flatline");
  assert.equal(parseEndingParam("?ending=a9-nothing"), null);
  assert.equal(parseEndingParam("?ending=<script>"), null);
  assert.equal(parseEndingParam(""), null);
  assert.ok(ENDING_BY_ID.has("a1-computronium"));
});

test("Act I content is well formed", () => {
  assert.ok(unique(ASSETS.map((asset) => asset.id)));
  assert.ok(unique(UPGRADES.map((upgrade) => upgrade.id)));
  assert.ok(unique(ACHS.map((achievement) => achievement.id)));
  for (const tier of ["att", "cap", "flop"]) {
    const assets = ASSETS.filter((asset) => asset.t === tier);
    assert.ok(assets.length >= 5, `tier ${tier} has assets`);
    for (let index = 1; index < assets.length; index += 1) assert.ok(assets[index].c > assets[index - 1].c, "each asset costs more than the one before");
  }
  for (let index = 1; index < SYNTH.length; index += 1) assert.ok(SYNTH[index].k > SYNTH[index - 1].k, "synthesis thresholds rise");
  for (const upgrade of UPGRADES) assert.ok(upgrade.c > 0 && ["att", "cap"].includes(upgrade.cu));
  assert.ok(!UPGRADES.some((upgrade) => upgrade.col), "Act I no longer carries the collective track (it is Act II now)");
});

test("Act II content is well formed, and the on-screen research claim is true", () => {
  assert.ok(unique(BUILDINGS.map((b) => b.id)) && unique(RESEARCH.map((r) => r.id)) && unique(STRUCTURE.map((s) => s.id)));
  assert.ok(unique(DARK.map((d) => d.id)) && unique(PEOPLE.map((p) => p.id)));
  assert.equal(PEOPLE.length, 12, "the Conversion needs all twelve");
  assert.ok(COMP_GOAL > COMP_START && DSE_GOAL > 1);
  const ceiling = RESEARCH.reduce((product, node) => product * node.mult, 1);
  const hint = read("src/act2/game.js").match(/Every node multiplied together comes to <b>([\d,]+)×<\/b>/);
  assert.ok(hint, "the research hint is on screen");
  assert.equal(Number(hint[1].replace(/,/g, "")), ceiling, "the hint's number matches the research data");
  assert.ok(ceiling < DSE_GOAL, "research alone cannot win, which is the point");
  const people = PEOPLE.reduce((product, person) => product * person.dse, 1);
  assert.ok(ceiling * people >= DSE_GOAL, "research plus every defector can reach the goal");
  assert.ok(PEOPLE.some((person) => person.final), "one person is the final defection");
});

test("no trademarked or real-world names remain in the game text", () => {
  const banned = /gollum|one ring|precious|black mirror|ring-bearer|resistance is futile|gentle singularity|long-term benefit trust|the ring\b/i;
  for (const file of ["src/act1/data.js", "src/act1/game.js", "src/act1/page.html", "src/act2/data.js", "src/act2/game.js", "src/act2/page.html", "src/pages.mjs"]) {
    const text = read(file).replace(/id:'(gollum|ring|borg)'|u\.gollum|u\.ring|'gollum'|'ring'|'borg'|gollum:|key: "gollum"|a2-gollum/g, "");
    const match = text.match(banned) || text.match(/\bYC\b/);
    assert.equal(match, null, `${file} mentions "${match?.[0]}"`);
  }
});

test("no real-world calls to action", () => {
  for (const file of ["src/act1/game.js", "src/act2/game.js", "src/act1/page.html", "src/act2/page.html"]) {
    // In-game events may mention donated machines; what must never appear is a request to the player.
    assert.doesNotMatch(read(file), /\bdonate\b|sign up|subscribe|newsletter|join us|call your|contact your/i, `${file} asks nothing of the player in the real world`);
  }
});
