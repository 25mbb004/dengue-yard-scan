import { AnimatePresence, motion } from "framer-motion";
import { useCamera } from "../hooks/useCamera.js";
import CaptureButton from "./CaptureButton.jsx";

/**
 * Live camera preview, sized for phone portrait.
 *
 * The stream is owned by useCamera and lives for as long as this screen is
 * mounted and `active`. Capturing does not tear it down — you can scan again
 * immediately without a second permission prompt.
 */
export default function CameraView({ active, scanning, onCapture, onFallbackFile }) {
  const { videoRef, status, message, retry } = useCamera(active);
  const blocked = status === "denied" || status === "unavailable" || status === "error";

  return (
    <section className="relative">
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-3xl bg-slate-900 shadow-xl shadow-black/40 ring-1 ring-white/10">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          aria-label="Live camera preview"
          className={`h-full w-full object-cover transition-opacity duration-500 ${
            status === "ready" ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Framing guide — purely decorative, kept out of the a11y tree. */}
        {status === "ready" && (
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute inset-x-6 inset-y-10 rounded-2xl border border-white/20" />
            <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/70 to-transparent" />
          </div>
        )}

        <AnimatePresence>
          {status === "requesting" && (
            <motion.div
              key="requesting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 grid place-items-center px-8 text-center"
            >
              <div>
                <motion.div
                  animate={{ scale: [1, 1.12, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                  className="mx-auto h-12 w-12 rounded-full border-2 border-emerald-400/70"
                />
                <p className="mt-4 text-sm text-slate-300">Waiting for camera permission…</p>
              </div>
            </motion.div>
          )}

          {blocked && (
            <motion.div
              key="blocked"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 grid place-items-center px-7 text-center"
            >
              <div>
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-slate-800 text-2xl">
                  📷
                </div>
                <h2 className="mt-4 text-base font-semibold text-slate-100">
                  {status === "denied" ? "Camera blocked" : "Camera unavailable"}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{message}</p>

                <div className="mt-5 flex flex-col gap-2">
                  {status === "denied" && (
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.96 }}
                      onClick={retry}
                      className="min-h-11 rounded-full bg-emerald-500 px-5 text-sm font-semibold text-slate-950"
                    >
                      Try again
                    </motion.button>
                  )}
                  <label className="min-h-11 cursor-pointer rounded-full border border-slate-600 px-5 py-3 text-sm font-medium text-slate-200">
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={onFallbackFile}
                    />
                    Upload a photo instead
                  </label>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating capture button, overlapping the preview's lower edge. */}
      <div className="relative -mt-11 flex justify-center">
        <CaptureButton
          disabled={status !== "ready" || scanning}
          scanning={scanning}
          // Hand the live element up so the parent can freeze a frame from it.
          onCapture={() => onCapture(videoRef.current)}
        />
      </div>
    </section>
  );
}
