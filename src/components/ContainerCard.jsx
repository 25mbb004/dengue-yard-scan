import { motion } from "framer-motion";

/** One icon per container_type in the vision prompt's class list. */
const ICONS = {
  tyre: "🛞",
  barrel_tank: "🛢️",
  discarded_container: "🥤",
  coconut_shell: "🥥",
  pot_saucer: "🪴",
  roof_gutter: "🏠",
  tarpaulin: "⛺",
  natural_pool: "🌿",
  ground_depression: "💧",
};

export default function ContainerCard({ container, index }) {
  const icon = ICONS[container.container_type] ?? "⚠️";
  const active = container.water_present;

  return (
    <motion.li
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: 0.9 + index * 0.09, // let the gauge land first
        duration: 0.42,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg shadow-black/20"
    >
      <div className="flex gap-3.5">
        <div
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-xl ${
            active ? "bg-red-500/15" : "bg-slate-800"
          }`}
          aria-hidden
        >
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-100">{container.label}</h3>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                active ? "bg-red-500/15 text-red-300" : "bg-slate-700/60 text-slate-400"
              }`}
            >
              {active ? "Holding water" : "Dry"}
            </span>
          </div>

          {container.note && (
            <p className="mt-1 text-sm leading-snug text-slate-400">{container.note}</p>
          )}

          {container.action && (
            <p className="mt-2 text-sm leading-snug text-slate-200">{container.action}</p>
          )}

          {/* The scoring engine's audit trail, rendered exactly as returned. */}
          {container.reasoning && (
            <p className="mt-2.5 overflow-x-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-slate-500">
              {container.reasoning}
            </p>
          )}
        </div>
      </div>
    </motion.li>
  );
}
