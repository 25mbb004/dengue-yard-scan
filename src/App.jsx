import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { assessPremises } from "./lib/scoringEngine.js";
import { captureFrame, fileToBase64Jpeg, scanImage } from "./lib/scanClient.js";
import { DEMO_FIXTURES } from "./lib/demoFixtures.js";
import { SEEDED_SCAN_POINTS, makeNearbyPoint } from "./lib/mockScanPoints.js";
import CameraView from "./components/CameraView.jsx";
import ScanningState from "./components/ScanningState.jsx";
import ScanResult from "./components/ScanResult.jsx";
import { NewScanBadge } from "./components/NewScanBadge.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";

// Leaflet is ~150kB and sits below the fold — keep it out of the initial
// bundle so the camera screen paints fast on a phone.
const ScanMap = lazy(() => import("./components/ScanMap.jsx"));

const SLOW_SCAN_MS = 9000;
const SCAN_TIMEOUT_MS = 45000;

export default function App() {
  const [assessment, setAssessment] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | scanning | error
  const [error, setError] = useState(null);
  const [step, setStep] = useState(0);
  const [slow, setSlow] = useState(false);
  const [points, setPoints] = useState(SEEDED_SCAN_POINTS);
  const [justAdded, setJustAdded] = useState(false);

  const abortRef = useRef(null);
  const resultsRef = useRef(null);

  // Advance the loading copy while a scan is in flight, and flag slow requests.
  useEffect(() => {
    if (status !== "scanning") {
      setStep(0);
      setSlow(false);
      return undefined;
    }
    const stepper = setInterval(() => setStep((s) => Math.min(s + 1, 3)), 1800);
    const slowTimer = setTimeout(() => setSlow(true), SLOW_SCAN_MS);
    return () => {
      clearInterval(stepper);
      clearTimeout(slowTimer);
    };
  }, [status]);

  // Abort any in-flight request if the app unmounts.
  useEffect(() => () => abortRef.current?.abort(), []);

  /** Shared tail for both camera and file paths. */
  const runScan = useCallback(async (image) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), SCAN_TIMEOUT_MS);

    setStatus("scanning");
    setError(null);
    setAssessment(null);
    setJustAdded(false);

    try {
      const vision = await scanImage(image, { signal: controller.signal });
      const result = assessPremises(vision);
      setAssessment(result);
      setStatus("idle");

      // A scan that couldn't be assessed isn't community data — don't map it.
      if (result.valid) {
        setPoints((prev) => [
          ...prev.map((p) => (p.isNew ? { ...p, isNew: false } : p)),
          makeNearbyPoint(result.riskScore, result.band.band),
        ]);
        setJustAdded(true);
      }

      requestAnimationFrame(() =>
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      );
    } catch (err) {
      if (err?.name === "AbortError") {
        setError("That scan took too long and was cancelled. Try again.");
      } else {
        setError(err?.message || "Something went wrong. Try again.");
      }
      setStatus("error");
    } finally {
      clearTimeout(timeout);
    }
  }, []);

  const handleCapture = useCallback(
    (videoEl) => {
      try {
        // Freeze the frame to a JPEG data URL and post it as-is:
        //   { "image": "data:image/jpeg;base64,..." }
        const dataUrl = captureFrame(videoEl);
        runScan(dataUrl);
      } catch (err) {
        setError(err?.message || "Could not capture that frame.");
        setStatus("error");
      }
    },
    [runScan]
  );

  const handleFile = useCallback(
    async (event) => {
      const file = event.target.files?.[0];
      event.target.value = ""; // allow re-picking the same file
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        setError("That file isn't an image. Choose a photo.");
        setStatus("error");
        return;
      }
      try {
        const base64 = await fileToBase64Jpeg(file);
        runScan(base64);
      } catch {
        setError("That photo could not be read. Try another.");
        setStatus("error");
      }
    },
    [runScan]
  );

  const loadDemo = useCallback((key) => {
    setError(null);
    setStatus("idle");
    setJustAdded(false);
    setAssessment(assessPremises(DEMO_FIXTURES[key].result));
  }, []);

  return (
    <div className="min-h-full bg-slate-950 text-slate-100">
      <div
        className="mx-auto max-w-md px-4"
        style={{
          paddingTop: "max(1.5rem, env(safe-area-inset-top))",
          paddingBottom: "max(2.5rem, env(safe-area-inset-bottom))",
        }}
      >
        <header className="mb-5">
          <h1 className="text-xl font-semibold tracking-tight">Dengue Yard Scan</h1>
          <p className="mt-1 text-sm leading-relaxed text-slate-400">
            Point your camera at the yard. We detect water-holding containers and
            score the breeding risk.
          </p>
        </header>

        <ErrorBoundary
          fallback="The camera view ran into a problem. Reload the page to try again."
        >
          <CameraView
            active
            scanning={status === "scanning"}
            onCapture={handleCapture}
            onFallbackFile={handleFile}
          />
        </ErrorBoundary>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500">Offline demo:</span>
          {Object.entries(DEMO_FIXTURES).map(([key, { label }]) => (
            <motion.button
              key={key}
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={() => loadDemo(key)}
              disabled={status === "scanning"}
              className="min-h-9 rounded-full border border-slate-700 px-3.5 text-xs text-slate-300 transition-colors hover:border-slate-500 hover:text-slate-100 disabled:opacity-40"
            >
              {label}
            </motion.button>
          ))}
        </div>

        <div ref={resultsRef} className="scroll-mt-4">
          <AnimatePresence mode="wait">
            {status === "scanning" && <ScanningState key="scanning" step={step} />}

            {status === "error" && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                role="alert"
                className="mt-6 rounded-2xl border border-red-900/60 bg-red-950/40 px-4 py-4"
              >
                <p className="text-sm leading-relaxed text-red-200">{error}</p>
              </motion.div>
            )}

            {status === "idle" && assessment && (
              <ErrorBoundary
                key="result"
                fallback="The results could not be displayed. Scan again."
              >
                <ScanResult assessment={assessment} />
              </ErrorBoundary>
            )}
          </AnimatePresence>
        </div>

        {slow && status === "scanning" && (
          <p className="mt-3 text-center text-xs text-slate-500">
            Still working — a slow connection can take a little longer.
          </p>
        )}

        <AnimatePresence>{justAdded && <NewScanBadge key="added" />}</AnimatePresence>

        <ErrorBoundary fallback="The map could not be loaded.">
          <Suspense
            fallback={
              <div className="mt-8 h-[380px] animate-pulse rounded-3xl border border-slate-800 bg-slate-900/60" />
            }
          >
            <ScanMap points={points} />
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  );
}
