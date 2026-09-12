import { motion } from "framer-motion";

const STEPS = [
  "Scanning yard…",
  "Detecting containers…",
  "Checking for standing water…",
  "Scoring breeding risk…",
];

/**
 * Occupies the results area while a scan is in flight.
 *
 * The step text advances on a timer purely as progress feedback — it is not
 * tied to real request phases, and it stops at the last step rather than
 * looping, so a slow request never looks like it restarted.
 */
export default function ScanningState({ step = 0 }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3 }}
      className="mt-6 rounded-3xl border border-slate-800 bg-slate-900/60 p-8 text-center shadow-lg shadow-black/20"
      role="status"
      aria-live="polite"
    >
      <div className="relative mx-auto h-20 w-20">
        <motion.span
          aria-hidden
          animate={{ scale: [1, 1.35, 1], opacity: [0.3, 0, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 rounded-full bg-emerald-400/40"
        />
        <motion.span
          aria-hidden
          animate={{ rotate: 360 }}
          transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 rounded-full border-4 border-slate-700 border-t-emerald-400"
        />
        <span className="absolute inset-0 grid place-items-center text-2xl">🦟</span>
      </div>

      <motion.p
        key={step}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mt-5 text-base font-semibold text-slate-100"
      >
        {STEPS[Math.min(step, STEPS.length - 1)]}
      </motion.p>
      <p className="mt-1 text-sm text-slate-400">This usually takes a few seconds.</p>

      {/* Skeleton rows hint at the card list that is about to appear. */}
      <div className="mt-7 space-y-2.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ opacity: [0.25, 0.6, 0.25] }}
            transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.18, ease: "easeInOut" }}
            className="h-12 rounded-2xl bg-slate-800"
          />
        ))}
      </div>
    </motion.section>
  );
}
