/**
 * /api/scan.js  — Vercel serverless function
 *
 * WHY THIS EXISTS: your Anthropic API key must NEVER be in frontend code.
 * Anyone can open devtools. Put the key in Vercel env vars as ANTHROPIC_API_KEY.
 *
 * Frontend calls: POST /api/scan  { image: "<base64 jpeg>" }
 *
 * `image` accepts either a bare base64 string or a full `data:image/...;base64,`
 * data URL — the prefix is stripped before the payload reaches Anthropic, which
 * requires bare base64 in `source.data`. Accepting both is purely additive:
 * every existing bare-base64 caller is unaffected.
 *
 * The system prompt below is the canonical copy from docs/vision-prompt.md.
 * If you edit the prompt, edit it in BOTH places or the doc goes stale.
 */

const SYSTEM_PROMPT = `You are a container-detection sensor for a dengue vector surveillance tool used in Sri Lanka.

Your ONLY job is to look at an outdoor image and report which water-holding containers are present and whether each currently holds standing water. You do NOT assess risk. You do NOT give advice. You do NOT calculate scores. A separate scoring engine handles all of that.

## WHAT COUNTS AS A CONTAINER

Report an object ONLY if it belongs to one of these classes:

- \`tyre\` — discarded or stored tyres, lying flat or stacked
- \`barrel_tank\` — drums, barrels, water tanks, cement mixing tubs
- \`discarded_container\` — bottles, tins, cans, plastic cups, food containers, buckets left outdoors, paint tins
- \`coconut_shell\` — coconut half-shells, husks
- \`pot_saucer\` — plant pot saucers, plant pots, hanging planters
- \`roof_gutter\` — roof gutters, downpipes, roof valleys, especially if visibly blocked with debris
- \`tarpaulin\` — tarps, plastic sheeting, canvas covers with folds or sagging
- \`natural_pool\` — ornamental ponds, tree holes, leaf axils, bromeliads, natural depressions holding water
- \`ground_depression\` — puddles, potholes, uneven concrete holding water, drains that are not flowing

If an object does not clearly fit one of these classes, DO NOT report it.

## HARD EXCLUSIONS — never report these

- Anything indoors, on a table, or in active human use (a mug, a drinking glass, a water bottle someone is holding, a kitchen sink, a pet water bowl actively in use)
- Sealed or tightly covered containers where water cannot enter
- Fast-flowing water: rivers, streams, open running drains, rain actively falling
- Swimming pools that are visibly clean, chlorinated, or maintained
- Water bodies larger than roughly 3 metres across (lakes, canals, paddy fields)
- Objects you can see are dry AND cannot hold water at all (flat surfaces, walls, closed lids)

If you are unsure whether something is a real outdoor breeding container versus an everyday in-use household item, DO NOT report it. Missing an item is acceptable. A false alarm on a coffee mug destroys user trust.

## FOR EACH CONTAINER, REPORT

- \`container_type\` — one of the exact class strings above
- \`water_present\` — true only if you can actually SEE standing water (reflection, dark pooling, waterline, wet sheen). If the object could hold water but you cannot see any, set false.
- \`confidence\` — 0.0 to 1.0, your genuine certainty about container_type AND water_present combined. Be honest. Low confidence is useful information; false confidence is not.
- \`shaded\` — true if the container sits in shade, under vegetation, under a roof overhang, or in visibly dim light
- \`size_class\` — \`small\` (under ~5 litres), \`medium\` (~5-50 litres), \`large\` (over ~50 litres)
- \`bbox\` — \`[x, y, width, height]\` as fractions of image dimensions, 0.0 to 1.0
- \`note\` — max 10 words, plainly what you see. No advice, no risk language.

## SCENE VALIDITY

Also report:
- \`scene_valid\` — false if the image is indoors, is a screenshot, is a person's face, is too dark or blurred to assess, or is clearly not a yard/outdoor premises
- \`scene_note\` — max 12 words explaining why, only if \`scene_valid\` is false

If \`scene_valid\` is false, return an empty \`containers\` array.

## OUTPUT FORMAT

Return ONLY raw JSON. No markdown fences. No preamble. No explanation before or after. Your entire response must parse with \`JSON.parse()\`.

\`\`\`
{
  "scene_valid": true,
  "scene_note": "",
  "containers": [
    {
      "container_type": "tyre",
      "water_present": true,
      "confidence": 0.93,
      "shaded": true,
      "size_class": "medium",
      "bbox": [0.31, 0.52, 0.28, 0.24],
      "note": "tyre lying flat, dark water pooled inside"
    }
  ]
}
\`\`\`

If no containers are found in a valid outdoor scene, return an empty \`containers\` array. That is a correct and useful answer.`;

/**
 * The vision prompt's output contract, expressed as a schema.
 * This replaces the old `{ role: "assistant", content: "{" }` prefill trick —
 * assistant prefills return a 400 on claude-sonnet-4-6. Structured outputs do
 * the same job (no preamble, guaranteed shape) and enforce the field names too.
 */
const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    scene_valid: { type: "boolean" },
    scene_note: { type: "string" },
    containers: {
      type: "array",
      items: {
        type: "object",
        properties: {
          container_type: {
            type: "string",
            enum: [
              "tyre",
              "barrel_tank",
              "discarded_container",
              "coconut_shell",
              "pot_saucer",
              "roof_gutter",
              "tarpaulin",
              "natural_pool",
              "ground_depression",
            ],
          },
          water_present: { type: "boolean" },
          confidence: { type: "number" },
          shaded: { type: "boolean" },
          size_class: { type: "string", enum: ["small", "medium", "large"] },
          bbox: {
            type: "array",
            items: { type: "number" },
            minItems: 4,
            maxItems: 4,
          },
          note: { type: "string" },
        },
        required: [
          "container_type",
          "water_present",
          "confidence",
          "shaded",
          "size_class",
          "bbox",
          "note",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["scene_valid", "scene_note", "containers"],
  additionalProperties: false,
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  const { image } = req.body || {};
  if (!image || typeof image !== "string") {
    return res.status(400).json({ error: "No image provided" });
  }

  const imageData = stripDataUrlPrefix(image);
  if (!imageData) return res.status(400).json({ error: "Invalid image data" });

  // Fail loudly on a missing key rather than letting it reach Anthropic as
  // `x-api-key: undefined`, come back 401, and surface as a generic upstream
  // error. A missing key is a deployment config problem, not a service outage,
  // and conflating the two sends you debugging the wrong system.
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error(
      "ANTHROPIC_API_KEY is not set. Add it to this deployment's environment variables."
    );
    return res.status(500).json({
      error: "Scanning is not configured on this server yet (missing API key).",
    });
  }

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        output_config: {
          format: { type: "json_schema", schema: OUTPUT_SCHEMA },
        },
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: "image/jpeg", data: imageData },
              },
              {
                type: "text",
                text: "Analyse this outdoor premises image. Return the JSON only.",
              },
            ],
          },
        ],
      }),
    });

    if (!r.ok) {
      const detail = await r.text();
      console.error("Anthropic API error:", r.status, detail);
      return res.status(502).json({ error: "Vision service failed" });
    }

    const data = await r.json();
    const text = data.content
      .filter(b => b.type === "text")
      .map(b => b.text)
      .join("");

    const parsed = safeParse(text);
    return res.status(200).json(parsed);
  } catch (err) {
    console.error("Scan failed:", err);
    return res.status(500).json({ error: "Could not analyse image" });
  }
}

/**
 * Accept both `data:image/jpeg;base64,AAAA` and a bare `AAAA`.
 * Returns "" for anything that isn't usable base64 payload.
 */
export function stripDataUrlPrefix(image) {
  const trimmed = image.trim();
  const match = trimmed.match(/^data:image\/[a-zA-Z+.-]+;base64,(.*)$/s);
  const payload = match ? match[1] : trimmed;
  return payload.startsWith("data:") ? "" : payload;
}

function safeParse(text) {
  const cleaned = text.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON in response");
  return JSON.parse(cleaned.slice(start, end + 1));
}

/* ----------------------------------------------------------------- */
/* DEMO SAFETY NET — build this on Day 3 morning. The venue wifi WILL */
/* fail. Cache your three demo props as static JSON and add an        */
/* offline toggle in the UI that reads from them instead of the API.  */
/* ----------------------------------------------------------------- */
export const DEMO_FALLBACK = {
  tyre_wet: {
    scene_valid: true,
    containers: [{
      container_type: "tyre", water_present: true, confidence: 0.93,
      shaded: true, size_class: "medium", bbox: [0.31, 0.52, 0.28, 0.24],
      note: "tyre lying flat, dark water pooled inside",
    }],
  },
  tyre_dry: {
    scene_valid: true,
    containers: [{
      container_type: "tyre", water_present: false, confidence: 0.93,
      shaded: true, size_class: "medium", bbox: [0.31, 0.52, 0.28, 0.24],
      note: "tyre lying flat, interior dry",
    }],
  },
  clean_yard: { scene_valid: true, containers: [] },
};
