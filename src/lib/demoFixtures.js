/**
 * DEMO SAFETY NET — the venue wifi will fail.
 *
 * These mirror DEMO_FALLBACK in api/scan.js, kept as a separate frontend copy
 * so the client bundle never imports the serverless handler (and the system
 * prompt with it). Shapes must stay in sync with the vision prompt's contract.
 */
export const DEMO_FIXTURES = {
  tyre_wet: {
    label: "Tyre, water inside",
    result: {
      scene_valid: true,
      scene_note: "",
      containers: [
        {
          container_type: "tyre",
          water_present: true,
          confidence: 0.93,
          shaded: true,
          size_class: "medium",
          bbox: [0.31, 0.52, 0.28, 0.24],
          note: "tyre lying flat, dark water pooled inside",
        },
      ],
    },
  },
  tyre_dry: {
    label: "Tyre, dry",
    result: {
      scene_valid: true,
      scene_note: "",
      containers: [
        {
          container_type: "tyre",
          water_present: false,
          confidence: 0.93,
          shaded: true,
          size_class: "medium",
          bbox: [0.31, 0.52, 0.28, 0.24],
          note: "tyre lying flat, interior dry",
        },
      ],
    },
  },
  clean_yard: {
    label: "Clean yard",
    result: { scene_valid: true, scene_note: "", containers: [] },
  },
};
