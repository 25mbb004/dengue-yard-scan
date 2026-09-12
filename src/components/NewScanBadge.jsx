import { motion } from "framer-motion";

/**
 * Small banner announcing that the latest scan joined the community map.
 *
 * Lives outside ScanMap.jsx so App can render it without pulling the
 * lazy-loaded Leaflet chunk into the initial bundle.
 */
export function NewScanBadge() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="mt-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-center text-xs text-emerald-300"
    >
      Your scan was added to the community map.
    </motion.div>
  );
}

export default NewScanBadge;
