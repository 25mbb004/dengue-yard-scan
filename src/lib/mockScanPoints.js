/**
 * Mock community scan activity for the map.
 *
 * These are INVENTED coordinates scattered around the Colombo–Negombo corridor
 * (Colombo, Dehiwala, Mount Lavinia, Moratuwa, Wattala, Ja-Ela, Negombo). They
 * exist to make the map feel like a live community view during a demo. They are
 * not real scans and must never be presented as surveillance data.
 *
 * The set is a fixed literal rather than generated at runtime so markers stay
 * put across re-renders. Distribution is 10 Safe / 12 Moderate / 11 High /
 * 7 Severe, using the engine's own band names (LOW / MODERATE / HIGH / CRITICAL)
 * so colours resolve through the same mapping the gauge uses.
 *
 * Shape: { id, lat, lng, score, band }
 */
export const SEEDED_SCAN_POINTS = [
  { id: "seed-01", lat: 6.94948, lng: 79.86343, score: 43, band: "MODERATE" },
  { id: "seed-02", lat: 6.88804, lng: 79.86287, score: 33, band: "MODERATE" },
  { id: "seed-03", lat: 6.97065, lng: 79.86850, score: 52, band: "HIGH" },
  { id: "seed-04", lat: 6.85998, lng: 79.86550, score: 61, band: "HIGH" },
  { id: "seed-05", lat: 6.94637, lng: 79.87487, score: 49, band: "MODERATE" },
  { id: "seed-06", lat: 6.92119, lng: 79.85792, score: 32, band: "MODERATE" },
  { id: "seed-07", lat: 6.90862, lng: 79.85717, score: 63, band: "HIGH" },
  { id: "seed-08", lat: 6.90891, lng: 79.87532, score: 62, band: "HIGH" },
  { id: "seed-09", lat: 6.87080, lng: 79.88451, score: 82, band: "CRITICAL" },
  { id: "seed-10", lat: 6.84566, lng: 79.86519, score: 38, band: "MODERATE" },
  { id: "seed-11", lat: 6.86588, lng: 79.86089, score: 85, band: "CRITICAL" },
  { id: "seed-12", lat: 6.85872, lng: 79.88181, score: 80, band: "CRITICAL" },
  { id: "seed-13", lat: 6.84276, lng: 79.86801, score: 15, band: "LOW" },
  { id: "seed-14", lat: 6.88439, lng: 79.85792, score: 37, band: "MODERATE" },
  { id: "seed-15", lat: 6.85319, lng: 79.87398, score: 63, band: "HIGH" },
  { id: "seed-16", lat: 6.82635, lng: 79.88271, score: 23, band: "LOW" },
  { id: "seed-17", lat: 6.82880, lng: 79.87246, score: 62, band: "HIGH" },
  { id: "seed-18", lat: 6.81555, lng: 79.88127, score: 17, band: "LOW" },
  { id: "seed-19", lat: 6.82873, lng: 79.87044, score: 93, band: "CRITICAL" },
  { id: "seed-20", lat: 6.80497, lng: 79.89904, score: 4, band: "LOW" },
  { id: "seed-21", lat: 6.78751, lng: 79.87904, score: 20, band: "LOW" },
  { id: "seed-22", lat: 6.78366, lng: 79.88711, score: 97, band: "CRITICAL" },
  { id: "seed-23", lat: 6.79806, lng: 79.88171, score: 23, band: "LOW" },
  { id: "seed-24", lat: 6.81432, lng: 79.89076, score: 39, band: "MODERATE" },
  { id: "seed-25", lat: 7.00193, lng: 79.92638, score: 40, band: "MODERATE" },
  { id: "seed-26", lat: 7.00371, lng: 79.90161, score: 64, band: "HIGH" },
  { id: "seed-27", lat: 7.00390, lng: 79.90020, score: 7, band: "LOW" },
  { id: "seed-28", lat: 7.00595, lng: 79.90003, score: 7, band: "LOW" },
  { id: "seed-29", lat: 6.98719, lng: 79.87341, score: 29, band: "MODERATE" },
  { id: "seed-30", lat: 7.07274, lng: 79.89288, score: 65, band: "HIGH" },
  { id: "seed-31", lat: 7.06507, lng: 79.91308, score: 24, band: "LOW" },
  { id: "seed-32", lat: 7.04041, lng: 79.88729, score: 57, band: "HIGH" },
  { id: "seed-33", lat: 7.09887, lng: 79.88198, score: 57, band: "HIGH" },
  { id: "seed-34", lat: 7.07810, lng: 79.88333, score: 29, band: "MODERATE" },
  { id: "seed-35", lat: 7.21924, lng: 79.83072, score: 95, band: "CRITICAL" },
  { id: "seed-36", lat: 7.20947, lng: 79.83035, score: 86, band: "CRITICAL" },
  { id: "seed-37", lat: 7.22298, lng: 79.83652, score: 65, band: "HIGH" },
  { id: "seed-38", lat: 7.21149, lng: 79.83559, score: 49, band: "MODERATE" },
  { id: "seed-39", lat: 7.20086, lng: 79.84221, score: 17, band: "LOW" },
  { id: "seed-40", lat: 7.22494, lng: 79.84300, score: 28, band: "MODERATE" },
];

/** Roughly the middle of the Colombo–Negombo corridor, so both ends are visible. */
export const MAP_CENTER = [7.0475, 79.8665];
export const MAP_ZOOM = 11;

const COLOMBO = { lat: 6.9271, lng: 79.8612 };
const KM_PER_DEG_LAT = 110.574;

/**
 * Invent a nearby location for a scan that just completed, ~0.5-2 km from
 * Colombo, on a random bearing. Used to drop a fresh marker onto the map.
 *
 * @param {number} score  riskScore from assessPremises()
 * @param {string} bandName  band.band from assessPremises() (LOW|MODERATE|HIGH|CRITICAL)
 */
export function makeNearbyPoint(score, bandName) {
  const distanceKm = 0.5 + Math.random() * 1.5;
  const bearing = Math.random() * 2 * Math.PI;

  const dLat = (distanceKm * Math.cos(bearing)) / KM_PER_DEG_LAT;
  const dLng =
    (distanceKm * Math.sin(bearing)) /
    (KM_PER_DEG_LAT * Math.cos((COLOMBO.lat * Math.PI) / 180));

  return {
    id: `scan-${Date.now()}`,
    lat: +(COLOMBO.lat + dLat).toFixed(5),
    lng: +(COLOMBO.lng + dLng).toFixed(5),
    score,
    band: bandName,
    isNew: true,
    scannedAt: Date.now(),
  };
}

/**
 * "2 mins ago" style relative time. Seeded points have no timestamp, so they
 * get a stable pseudo-random age derived from their id instead of drifting.
 */
export function relativeTime(point) {
  if (point.scannedAt) {
    const mins = Math.floor((Date.now() - point.scannedAt) / 60000);
    if (mins < 1) return "just now";
    if (mins === 1) return "1 min ago";
    if (mins < 60) return `${mins} mins ago`;
    const hours = Math.floor(mins / 60);
    return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  }

  // Stable hash of the id -> an age between ~5 minutes and ~3 days.
  let h = 0;
  for (let i = 0; i < point.id.length; i++) h = (h * 31 + point.id.charCodeAt(i)) >>> 0;
  const mins = 5 + (h % 4320);
  if (mins < 60) return `${mins} mins ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "1 day ago" : `${days} days ago`;
}
