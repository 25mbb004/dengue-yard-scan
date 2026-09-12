/**
 * Wiring smoke tests. These do NOT test the scoring maths (that module is
 * already tested); they prove the pieces are connected: the serverless
 * function parses, its embedded system prompt matches docs/vision-prompt.md,
 * and a vision-shaped payload flows through assessPremises() intact.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { assessPremises } from "../src/lib/scoringEngine.js";
import { DEMO_FIXTURES } from "../src/lib/demoFixtures.js";

test("api/scan.js loads and exports a handler", async () => {
  const mod = await import("../api/scan.js");
  assert.equal(typeof mod.default, "function");
  assert.ok(mod.DEMO_FALLBACK.tyre_wet);
});

test("embedded SYSTEM_PROMPT matches docs/vision-prompt.md byte for byte", () => {
  const scan = fs.readFileSync(new URL("../api/scan.js", import.meta.url), "utf8");
  const literal = scan.match(/const SYSTEM_PROMPT = (`[\s\S]*?`);\n/);
  assert.ok(literal, "SYSTEM_PROMPT literal not found");
  const embedded = eval(literal[1]);

  const md = fs
    .readFileSync(new URL("../docs/vision-prompt.md", import.meta.url), "utf8")
    .split(/\r?\n/);
  const start = md.findIndex((l) => l.startsWith("You are a container-detection sensor"));
  const end = md.findIndex((l) => l.startsWith("If no containers are found in a valid outdoor scene"));
  const source = md.slice(start, end + 1).join("\n");

  assert.equal(embedded, source);
  assert.ok(embedded.includes("A false alarm on a coffee mug destroys user trust."));
});

test("wet tyre fixture produces an actionable band", () => {
  const a = assessPremises(DEMO_FIXTURES.tyre_wet.result);
  assert.equal(a.valid, true);
  assert.equal(a.positiveCount, 1);
  assert.ok(a.riskScore > 50, `expected an action band, got ${a.riskScore}`);
  assert.match(a.headline, /active breeding site/);
  assert.ok(a.containers[0].action, "remediation action should be attached");
  assert.ok(a.containers[0].reasoning.includes("base 1.00"), "audit trail should survive");
});

test("dry tyre scores far lower than a wet one", () => {
  const wet = assessPremises(DEMO_FIXTURES.tyre_wet.result).riskScore;
  const dry = assessPremises(DEMO_FIXTURES.tyre_dry.result).riskScore;
  assert.ok(dry < wet, `dry (${dry}) should score below wet (${wet})`);
});

test("clean yard scores zero", () => {
  const a = assessPremises(DEMO_FIXTURES.clean_yard.result);
  assert.equal(a.riskScore, 0);
  assert.equal(a.band.band, "LOW");
  assert.equal(a.headline, "No breeding containers detected.");
});

test("invalid scene short-circuits", () => {
  const a = assessPremises({ scene_valid: false, scene_note: "indoor photo", containers: [] });
  assert.equal(a.valid, false);
  assert.equal(a.reason, "indoor photo");
  assert.equal(a.riskScore, 0);
});
