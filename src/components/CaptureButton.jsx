import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

/**
 * Large circular capture control.
 *
 * Press-scale comes from whileTap; the ripple is a separate expanding ring
 * keyed on a click counter so rapid taps each get their own animation. Both
 * are transform/opacity only, so they stay on the compositor.
 */
export default function CaptureButton({ disabled, scanning, onCapture }) {
  const [ripples, setRipples] = useState([]);

  function handleClick() {
    if (disabled) return;
    const id = Date.now();
    setRipples((r) => [...r, id]);
    setTimeout(() => setRipples((r) => r.filter((x) => x !== id)), 650);
    onCapture();
  }

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      aria-label={scanning ? "Scanning in progress" : "Capture photo and scan yard"}
      whileTap={disabled ? undefined : { scale: 0.88 }}
      transition={{ type: "spring", stiffness: 600, damping: 22 }}
      className={`relative grid h-[86px] w-[86px] place-items-center rounded-full transition-colors duration-300 ${
        disabled
          ? "cursor-not-allowed bg-slate-700/70 ring-4 ring-slate-800"
          : "bg-white ring-4 ring-emerald-400/60 shadow-lg shadow-emerald-500/25"
      }`}
    >
      {/* Ripples */}
      <AnimatePresence>
        {ripples.map((id) => (
          <motion.span
            key={id}
            aria-hidden
            initial={{ scale: 1, opacity: 0.5 }}
            animate={{ scale: 1.9, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.65, ease: "easeOut" }}
            className="pointer-events-none absolute inset-0 rounded-full bg-emerald-400"
          />
        ))}
      </AnimatePresence>

      {/* Idle breathing halo — stops while a scan is in flight. */}
      {!disabled && (
        <motion.span
          aria-hidden
          animate={{ scale: [1, 1.18, 1], opacity: [0.35, 0, 0.35] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          className="pointer-events-none absolute inset-0 rounded-full bg-emerald-400/50"
        />
      )}

      <span
        className={`relative h-[66px] w-[66px] rounded-full transition-colors duration-300 ${
          disabled ? "bg-slate-600" : "bg-white"
        }`}
      />

      {scanning && (
        <motion.span
          aria-hidden
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="absolute inset-1.5 rounded-full border-[3px] border-slate-500 border-t-emerald-400"
        />
      )}
    </motion.button>
  );
}
