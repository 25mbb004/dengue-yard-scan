/**
 * Verifies the Netlify adapter translates correctly to and from the Vercel
 * handler. `fetch` is stubbed so no real Anthropic call is made.
 */
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import adapter from "../netlify/functions/scan.mjs";

const realFetch = globalThis.fetch;
let lastRequestBody = null;

beforeEach(() => {
  process.env.ANTHROPIC_API_KEY = "test-key";
  lastRequestBody = null;
  globalThis.fetch = async (_url, init) => {
    lastRequestBody = JSON.parse(init.body);
    return {
      ok: true,
      json: async () => ({
        content: [
          {
            type: "text",
            text: JSON.stringify({ scene_valid: true, scene_note: "", containers: [] }),
          },
        ],
      }),
    };
  };
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

function post(body) {
  return new Request("https://example.test/api/scan", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("adapter is routed at /api/scan, matching the Vercel path", async () => {
  const { config } = await import("../netlify/functions/scan.mjs");
  assert.equal(config.path, "/api/scan");
});

test("a data URL round-trips and reaches Anthropic as bare base64", async () => {
  const res = await adapter(post({ image: "data:image/jpeg;base64,QUJD" }));
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), {
    scene_valid: true,
    scene_note: "",
    containers: [],
  });

  const sent = lastRequestBody.messages[0].content[0].source.data;
  assert.equal(sent, "QUJD", "the data: prefix must be stripped before Anthropic");
});

test("bare base64 still works unchanged", async () => {
  const res = await adapter(post({ image: "QUJD" }));
  assert.equal(res.status, 200);
  assert.equal(lastRequestBody.messages[0].content[0].source.data, "QUJD");
});

test("a missing image returns 400, not a crash", async () => {
  const res = await adapter(post({}));
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error, "No image provided");
});

test("GET is rejected with 405", async () => {
  const res = await adapter(new Request("https://example.test/api/scan", { method: "GET" }));
  assert.equal(res.status, 405);
});

test("a malformed body is handled, not thrown", async () => {
  const res = await adapter(
    new Request("https://example.test/api/scan", { method: "POST", body: "not json" })
  );
  assert.equal(res.status, 400);
  assert.ok((await res.json()).error);
});

test("an upstream failure surfaces as 502 without leaking detail", async () => {
  globalThis.fetch = async () => ({ ok: false, status: 500, text: async () => "boom" });
  const res = await adapter(post({ image: "QUJD" }));
  assert.equal(res.status, 502);
  const body = await res.json();
  assert.equal(body.error, "Vision service failed");
  assert.ok(!JSON.stringify(body).includes("boom"), "upstream detail must not leak");
});
