import { motion } from "framer-motion";
import RiskGauge from "./RiskGauge.jsx";
import ContainerCard from "./ContainerCard.jsx";
import { displayBand } from "../lib/bands.js";

/**
 * Renders one assessPremises() result.
 *
 * Every number shown here comes straight off the engine result — riskScore,
 * band, containerIndex, positiveCount, and each container's reasoning string.
 * Nothing is recomputed.
 */
export default function ScanResult({ assessment }) {
  if (!assessment.valid) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-6 rounded-3xl border border-slate-800 bg-slate-900/60 p-6 text-center"
      >
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-slate-800 text-xl">
          🚫
        </div>
        <h2 className="mt-3 text-sm font-semibold text-slate-200">Could not assess</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{assessment.reason}</p>
        <p className="mt-3 text-xs text-slate-500">
          Point the camera at an outdoor yard in good light and scan again.
        </p>
      </motion.section>
    );
  }

  const { riskScore, band, headline, containerIndex, positiveCount, containers } = assessment;
  const view = displayBand(band);

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="mt-6 space-y-5"
    >
      <div
        className={`rounded-3xl border border-slate-800 bg-slate-900/60 px-5 pb-6 pt-7 shadow-xl ring-1 ${view.ring} ${view.glow}`}
      >
        <RiskGauge score={riskScore} band={view} headline={headline} />
      </div>

      <dl className="grid grid-cols-2 gap-3">
        <Stat label="Container Index" value={`${containerIndex}%`} />
        <Stat label="Active sites" value={positiveCount} />
      </dl>

      {containers.length > 0 ? (
        <div>
          <h2 className="mb-2.5 text-sm font-semibold text-slate-300">
            Detected containers ({containers.length})
          </h2>
          <ul className="space-y-3">
            {containers.map((c, i) => (
              <ContainerCard key={`${c.container_type}-${i}`} container={c} index={i} />
            ))}
          </ul>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.4 }}
          className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-center"
        >
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-500/15 text-xl">
            ✅
          </div>
          <p className="mt-3 text-sm font-medium text-slate-200">No breeding containers found</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-400">
            Nothing in this view is holding water. Scan other corners of the
            property — shaded spots behind the house are the usual culprits.
          </p>
        </motion.div>
      )}
    </motion.section>
  );
}

function Stat({ label, value }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.75, duration: 0.4 }}
      className="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3"
    >
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-xl font-semibold tabular-nums text-slate-100">{value}</dd>
    </motion.div>
  );
}
