/**
 * Presentation metadata for risk bands.
 *
 * scoringEngine.js is the single source of truth for which band a score falls
 * in and what colour it carries. This module ONLY maps the engine's band names
 * onto display labels and Tailwind classes. It never computes a band, never
 * re-derives a colour, and must never be used to change a score.
 *
 * Engine band  →  display label
 *   LOW        →  Safe      (green  #22c55e)
 *   MODERATE   →  Moderate  (yellow #eab308)
 *   HIGH       →  High      (orange #f97316)
 *   CRITICAL   →  Severe    (red    #ef4444)
 *
 * The hexes above are the engine's own BANDS colours — repeated here as a
 * comment for reference only. At runtime we read `band.color` off the engine
 * result so the two can never drift.
 */

const DISPLAY = {
  LOW: {
    label: "Safe",
    status: "No active breeding sites found. Keep checking weekly.",
    ring: "ring-emerald-500/30",
    chip: "bg-emerald-500/15 text-emerald-300",
    glow: "shadow-emerald-500/20",
  },
  MODERATE: {
    label: "Moderate",
    status: "Some risk detected. Clear the sites below within 48 hours.",
    ring: "ring-yellow-500/30",
    chip: "bg-yellow-500/15 text-yellow-300",
    glow: "shadow-yellow-500/20",
  },
  HIGH: {
    label: "High",
    status: "Act today. Clear these sites and tell your neighbours.",
    ring: "ring-orange-500/30",
    chip: "bg-orange-500/15 text-orange-300",
    glow: "shadow-orange-500/20",
  },
  CRITICAL: {
    label: "Severe",
    status: "Clear immediately and report this premises to your PHI.",
    ring: "ring-red-500/30",
    chip: "bg-red-500/15 text-red-300",
    glow: "shadow-red-500/20",
  },
};

const FALLBACK = {
  label: "Unknown",
  status: "Risk band unavailable.",
  ring: "ring-slate-600/30",
  chip: "bg-slate-500/15 text-slate-300",
  glow: "shadow-slate-500/20",
};

/**
 * @param {{band?: string, color?: string, action?: string}} band the engine's band object
 * @returns display metadata, with the engine's own colour and action passed through
 */
export function displayBand(band) {
  const meta = DISPLAY[band?.band] ?? FALLBACK;
  return {
    ...meta,
    name: band?.band ?? "UNKNOWN",
    color: band?.color ?? "#64748b",
    // Prefer the engine's remediation copy; fall back to our generic status line.
    status: band?.action ?? meta.status,
  };
}

/** Colour for a bare band name — used by the map, which has no engine object. */
export function colorForBandName(name) {
  return (
    { LOW: "#22c55e", MODERATE: "#eab308", HIGH: "#f97316", CRITICAL: "#ef4444" }[name] ??
    "#64748b"
  );
}

/** Display label for a bare band name. */
export function labelForBandName(name) {
  return (DISPLAY[name] ?? FALLBACK).label;
}
