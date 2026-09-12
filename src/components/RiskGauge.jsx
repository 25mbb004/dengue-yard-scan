import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * Semicircular risk gauge.
 *
 * Renders the score and band EXACTLY as scoringEngine returned them — the only
 * arithmetic here is geometry (score -> needle angle, score -> arc length).
 * Nothing in this file may alter a score or re-derive a band.
 */

const R = 78; // arc radius
const CX = 100;
const CY = 100;
const SWEEP = Math.PI * R; // length of a 180° arc, for dash maths

const clamp = (v) => Math.max(0, Math.min(100, v));

/** Score 0-100 -> point on the semicircle (180° = left, 0° = right). */
function pointAt(score) {
  const theta = Math.PI - (clamp(score) / 100) * Math.PI;
  return { x: CX + R * Math.cos(theta), y: CY - R * Math.sin(theta) };
}

const ARC_PATH = `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`;

export default function RiskGauge({ score, band, headline }) {
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  // One motion value drives needle, arc and counter, so they stay in lockstep.
  // Driven imperatively so the sweep restarts cleanly whenever `score` changes.
  const animated = useMotionValue(0);

  const [display, setDisplay] = useState(0);
  const rotation = useTransform(animated, (v) => -90 + (clamp(v) / 100) * 180);
  const dashOffset = useTransform(animated, (v) => SWEEP * (1 - clamp(v) / 100));

  useEffect(() => {
    const unsub = animated.on("change", (v) => setDisplay(Math.round(Math.max(0, v))));
    const duration = prefersReduced ? 0 : 1.5;

    const controls = animate(animated, score, {
      duration,
      ease: [0.16, 1, 0.3, 1], // decelerating sweep, settles without overshoot
    });

    // Correctness guard, not polish. The sweep runs on requestAnimationFrame,
    // which browsers pause entirely for a backgrounded tab. Without this the
    // gauge would sit at 0 next to a "Severe Risk" label — a wrong number, not
    // just a missing animation. setTimeout still fires when rAF does not, so
    // the reading is snapped to the real score either way.
    const settle = setTimeout(
      () => {
        if (animated.get() !== score) animated.set(score);
        setDisplay(Math.round(score));
      },
      duration * 1000 + 250
    );

    return () => {
      controls.stop();
      clearTimeout(settle);
      unsub();
    };
  }, [score, animated, prefersReduced]);

  const end = pointAt(score);

  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox="0 0 200 118"
        className="w-full max-w-[320px]"
        role="img"
        aria-label={`Risk score ${score} out of 100, ${band.label} risk`}
      >
        <defs>
          <filter id="gauge-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Track */}
        <path
          d={ARC_PATH}
          fill="none"
          stroke="currentColor"
          className="text-slate-800"
          strokeWidth="16"
          strokeLinecap="round"
        />

        {/* Progress arc, swept via stroke-dashoffset */}
        <motion.path
          d={ARC_PATH}
          fill="none"
          stroke={band.color}
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={SWEEP}
          style={{ strokeDashoffset: dashOffset }}
          filter="url(#gauge-glow)"
        />

        {/* Needle — rotates about the hub */}
        <motion.g style={{ rotate: rotation, originX: `${CX}px`, originY: `${CY}px` }}>
          <line
            x1={CX}
            y1={CY}
            x2={CX}
            y2={CY - R + 14}
            stroke={band.color}
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        </motion.g>
        <circle cx={CX} cy={CY} r="8" fill="#0f172a" stroke={band.color} strokeWidth="3" />

        {/* Endpoint marker */}
        <motion.circle
          cx={end.x}
          cy={end.y}
          r="4"
          fill={band.color}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.9, type: "spring", stiffness: 300, damping: 18 }}
        />

        <text x="16" y="114" className="fill-slate-600 text-[9px]">0</text>
        <text x="178" y="114" className="fill-slate-600 text-[9px]">100</text>
      </svg>

      <div className="-mt-6 text-center">
        <div
          className="text-6xl font-bold tabular-nums leading-none"
          style={{ color: band.color }}
        >
          {display}
        </div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className={`mt-3 inline-block rounded-full px-4 py-1.5 text-sm font-semibold tracking-wide ${band.chip}`}
        >
          {band.label} Risk
        </motion.div>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.4 }}
          className="mx-auto mt-3 max-w-[34ch] text-sm leading-relaxed text-slate-300"
        >
          {headline}
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.4 }}
          className="mx-auto mt-1.5 max-w-[36ch] text-xs leading-relaxed text-slate-400"
        >
          {band.status}
        </motion.p>
      </div>
    </div>
  );
}
