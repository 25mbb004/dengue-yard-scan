import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import { useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";
import { MAP_CENTER, MAP_ZOOM, relativeTime } from "../lib/mockScanPoints.js";
import { colorForBandName, labelForBandName } from "../lib/bands.js";

/**
 * Community scan map.
 *
 * CircleMarker is used rather than Leaflet's default pin — it needs no icon
 * assets (which is also why there's no marker-icon 404 to patch around) and
 * takes a band colour directly.
 */
export default function ScanMap({ points }) {
  return (
    <section className="mt-8">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-base font-semibold text-slate-100">Community activity</h2>
        <span className="text-xs text-slate-500">{points.length} scans nearby</span>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-800 shadow-lg shadow-black/30">
        <MapContainer
          center={MAP_CENTER}
          zoom={MAP_ZOOM}
          scrollWheelZoom={false}
          className="h-[380px] w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {points.map((p) => (
            <ScanMarker key={p.id} point={p} />
          ))}
        </MapContainer>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {["LOW", "MODERATE", "HIGH", "CRITICAL"].map((b) => (
          <span key={b} className="flex items-center gap-1.5 text-xs text-slate-400">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: colorForBandName(b) }}
            />
            {labelForBandName(b)}
          </span>
        ))}
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
        Nearby scans are simulated sample data for demonstration, not real
        surveillance records. Locations are approximate.
      </p>
    </section>
  );
}

/**
 * A marker that pulses in when freshly added.
 *
 * Leaflet owns the DOM here, so the entrance is animated by driving the
 * CircleMarker's own radius/opacity props rather than wrapping it in a
 * motion component.
 */
function ScanMarker({ point }) {
  const color = colorForBandName(point.band);
  const [grown, setGrown] = useState(!point.isNew);

  useEffect(() => {
    if (!point.isNew) return undefined;
    const t = setTimeout(() => setGrown(true), 40);
    return () => clearTimeout(t);
  }, [point.isNew]);

  return (
    <CircleMarker
      center={[point.lat, point.lng]}
      radius={point.isNew ? (grown ? 11 : 26) : 8}
      pathOptions={{
        color: point.isNew ? "#ffffff" : color,
        weight: point.isNew ? 3 : 1.5,
        fillColor: color,
        fillOpacity: grown ? 0.85 : 0.25,
        className: "transition-all duration-700 ease-out",
      }}
    >
      <Popup>
        <div className="min-w-[140px]">
          <div className="text-sm font-semibold text-slate-900">Yard Scan</div>
          <div className="mt-1 text-lg font-bold tabular-nums" style={{ color }}>
            Score: {point.score}
          </div>
          <div className="text-sm font-medium" style={{ color }}>
            {labelForBandName(point.band)} Risk
          </div>
          <div className="mt-1 text-xs text-slate-500">{relativeTime(point)}</div>
        </div>
      </Popup>
    </CircleMarker>
  );
}
