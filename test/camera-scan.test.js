/**
 * Tests for the camera-scan additions. Pure logic only — no DOM, no network.
 * The scoring engine is not exercised here beyond passing values through it.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { stripDataUrlPrefix } from "../api/scan.js";
import { displayBand, colorForBandName, labelForBandName } from "../src/lib/bands.js";
import {
  SEEDED_SCAN_POINTS,
  makeNearbyPoint,
  relativeTime,
  MAP_CENTER,
} from "../src/lib/mockScanPoints.js";
import { assessPremises, BANDS } from "../src/lib/scoringEngine.js";

/* ---------------- API contract: both image forms accepted --------------- */

test("bare base64 passes through untouched (existing callers unaffected)", () => {
  assert.equal(stripDataUrlPrefix("AAAABBBBCCCC"), "AAAABBBBCCCC");
});

test("data URL prefix is stripped", () => {
  assert.equal(stripDataUrlPrefix("data:image/jpeg;base64,AAAABBBB"), "AAAABBBB");
  assert.equal(stripDataUrlPrefix("data:image/png;base64,ZZZZ"), "ZZZZ");
});

test("surrounding whitespace is tolerated", () => {
  assert.equal(stripDataUrlPrefix("  data:image/jpeg;base64,AAAA \n"), "AAAA");
});

test("a doubled or non-image data URL is rejected rather than forwarded", () => {
  assert.equal(stripDataUrlPrefix("data:text/plain;base64,AAAA"), "");
  assert.equal(stripDataUrlPrefix("data:application/pdf;base64,AAAA"), "");
});

/* ---------------- Band mapping: engine names -> display labels ----------- */

test("every engine band maps to the specified display label and colour", () => {
  const expected = {
    LOW: ["Safe", "#22c55e"],
    MODERATE: ["Moderate", "#eab308"],
    HIGH: ["High", "#f97316"],
    CRITICAL: ["Severe", "#ef4444"],
  };

  for (const engineBand of BANDS) {
    const [label, color] = expected[engineBand.band];
    const view = displayBand(engineBand);
    assert.equal(view.label, label, `${engineBand.band} label`);
    // Colour must come from the engine, not be re-derived here.
    assert.equal(view.color, engineBand.color, `${engineBand.band} colour passthrough`);
    assert.equal(view.color, color, `${engineBand.band} colour value`);
  }
});

test("bare-name helpers agree with the engine's own colours", () => {
  for (const b of BANDS) {
    assert.equal(colorForBandName(b.band), b.color);
  }
  assert.equal(labelForBandName("CRITICAL"), "Severe");
  assert.equal(labelForBandName("LOW"), "Safe");
});

test("an unknown band degrades instead of throwing", () => {
  const view = displayBand(undefined);
  assert.equal(view.label, "Unknown");
  assert.ok(view.color);
});

/* ---------------- Seeded map data ---------------------------------------- */

test("exactly 40 seeded points with the requested distribution", () => {
  assert.equal(SEEDED_SCAN_POINTS.length, 40);
  const counts = SEEDED_SCAN_POINTS.reduce(
    (a, p) => ({ ...a, [p.band]: (a[p.band] ?? 0) + 1 }),
    {}
  );
  assert.deepEqual(counts, { LOW: 10, MODERATE: 12, HIGH: 11, CRITICAL: 7 });
});

test("each seeded point has the required shape and a plausible location", () => {
  const ids = new Set();
  for (const p of SEEDED_SCAN_POINTS) {
    assert.ok(p.id && !ids.has(p.id), `duplicate or missing id: ${p.id}`);
    ids.add(p.id);
    assert.equal(typeof p.lat, "number");
    assert.equal(typeof p.lng, "number");
    assert.equal(typeof p.score, "number");
    assert.equal(typeof p.band, "string");
    // Colombo-Negombo corridor, on land.
    assert.ok(p.lat > 6.7 && p.lat < 7.3, `lat out of corridor: ${p.lat}`);
    assert.ok(p.lng > 79.82 && p.lng < 79.95, `lng out of corridor: ${p.lng}`);
  }
});

test("seeded scores fall inside the band the engine would assign", () => {
  for (const p of SEEDED_SCAN_POINTS) {
    const engineBand = BANDS.find((b) => p.score <= b.max);
    assert.equal(engineBand.band, p.band, `${p.id} score ${p.score} vs band ${p.band}`);
  }
});

test("points are scattered, not on a grid", () => {
  // A grid repeats coordinates exactly and spaces neighbours uniformly.
  // Natural scatter does neither.
  const lats = new Set(SEEDED_SCAN_POINTS.map((p) => p.lat));
  const lngs = new Set(SEEDED_SCAN_POINTS.map((p) => p.lng));
  assert.equal(lats.size, 40, "every latitude should be distinct");
  assert.ok(lngs.size >= 39, `only ${lngs.size} distinct longitudes`);

  // No two scans on top of each other, and spacing must vary rather than
  // repeat at a fixed pitch the way grid rows would.
  const gaps = [];
  for (let i = 0; i < SEEDED_SCAN_POINTS.length; i++) {
    for (let j = i + 1; j < SEEDED_SCAN_POINTS.length; j++) {
      const a = SEEDED_SCAN_POINTS[i];
      const b = SEEDED_SCAN_POINTS[j];
      const dLat = (a.lat - b.lat) * 110.574;
      const dLng = (a.lng - b.lng) * 110.574 * Math.cos((a.lat * Math.PI) / 180);
      gaps.push(Math.hypot(dLat, dLng));
    }
  }
  assert.ok(Math.min(...gaps) > 0.1, "points should not sit on top of one another");
  assert.ok(new Set(gaps.map((g) => g.toFixed(2))).size > gaps.length * 0.8, "spacing should vary");
});

test("map centre keeps both Colombo and Negombo in view", () => {
  const [lat] = MAP_CENTER;
  assert.ok(lat > 6.9271 && lat < 7.2086, "centre should sit between the two cities");
});

/* ---------------- New-scan marker ---------------------------------------- */

test("a new scan lands 0.5-2 km from Colombo", () => {
  const COLOMBO = { lat: 6.9271, lng: 79.8612 };
  for (let i = 0; i < 300; i++) {
    const p = makeNearbyPoint(82, "CRITICAL");
    const dLat = (p.lat - COLOMBO.lat) * 110.574;
    const dLng = (p.lng - COLOMBO.lng) * 110.574 * Math.cos((COLOMBO.lat * Math.PI) / 180);
    const km = Math.hypot(dLat, dLng);
    assert.ok(km >= 0.49 && km <= 2.01, `distance ${km.toFixed(3)} km out of range`);
  }
});

test("a new scan carries the score and band it was given, unmodified", () => {
  const p = makeNearbyPoint(82, "CRITICAL");
  assert.equal(p.score, 82);
  assert.equal(p.band, "CRITICAL");
  assert.equal(p.isNew, true);
  assert.ok(p.scannedAt);
});

test("new-scan band comes from the engine, end to end", () => {
  const vision = {
    scene_valid: true,
    scene_note: "",
    containers: [
      {
        container_type: "tyre",
        water_present: true,
        confidence: 0.93,
        shaded: true,
        size_class: "medium",
        bbox: [0.3, 0.5, 0.3, 0.2],
        note: "water pooled inside",
      },
    ],
  };
  const result = assessPremises(vision);
  const point = makeNearbyPoint(result.riskScore, result.band.band);

  assert.equal(point.score, result.riskScore);
  assert.equal(colorForBandName(point.band), result.band.color);
});

/* ---------------- Relative timestamps ------------------------------------ */

test("a fresh scan reads as just now", () => {
  assert.equal(relativeTime({ id: "x", scannedAt: Date.now() }), "just now");
});

test("seeded points get a stable age across calls", () => {
  const p = SEEDED_SCAN_POINTS[3];
  assert.equal(relativeTime(p), relativeTime(p));
  assert.match(relativeTime(p), /ago$/);
});

/* ---------------- Missing-key configuration error ------------------------ */

test("a missing API key reports a config error, not an upstream failure", async () => {
  const { default: handler } = await import("../api/scan.js");
  const saved = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;

  let status;
  let payload;
  const res = {
    status(c) { status = c; return this; },
    json(p) { payload = p; return this; },
  };

  try {
    await handler({ method: "POST", body: { image: "QUJD" } }, res);
  } finally {
    if (saved !== undefined) process.env.ANTHROPIC_API_KEY = saved;
  }

  assert.equal(status, 500, "a config problem is 500, not 502");
  assert.match(payload.error, /not configured/i);
  assert.ok(!/vision service/i.test(payload.error), "must not blame the upstream service");
});
