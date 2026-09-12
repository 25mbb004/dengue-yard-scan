import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Owns the getUserMedia lifecycle for one live preview.
 *
 * - Requests the rear camera automatically when `active` becomes true.
 * - Holds ONE stream for as long as the screen is active (re-renders and
 *   re-running effects never re-acquire it).
 * - Stops every track on unmount, or when `active` goes false, so the camera
 *   indicator actually switches off.
 *
 * Status: "idle" | "requesting" | "ready" | "denied" | "unavailable" | "error"
 */
export function useCamera(active = true) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  // Tracked in a ref so the async start() can re-check it after awaiting the
  // permission prompt, which the user may leave open for a long time.
  const activeRef = useRef(active);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState(null);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  const stop = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const start = useCallback(async () => {
    // Reuse the stream we already hold — do not re-prompt or re-acquire.
    if (streamRef.current) {
      if (videoRef.current && !videoRef.current.srcObject) {
        videoRef.current.srcObject = streamRef.current;
      }
      setStatus("ready");
      return;
    }

    // getUserMedia is undefined on insecure origins. This is the single most
    // common "camera is broken" report and it has nothing to do with hardware.
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("unavailable");
      setMessage(
        window.isSecureContext === false
          ? "The camera needs a secure connection. Open this page over HTTPS or on localhost."
          : "This browser does not support camera access."
      );
      return;
    }

    setStatus("requesting");
    setMessage(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      // The screen may have been left while the permission prompt was open.
      if (!activeRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Safari needs an explicit play() after srcObject is assigned.
        await videoRef.current.play().catch(() => {});
      }
      setStatus("ready");
    } catch (err) {
      setStatus(errorStatus(err));
      setMessage(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    if (active) {
      start();
    } else {
      stop();
      setStatus("idle");
    }
    return undefined;
  }, [active, start, stop]);

  // Unmount cleanup is deliberately separate: the effect above must not tear
  // the stream down just because `active` or a callback identity changed.
  useEffect(() => stop, [stop]);

  return { videoRef, status, message, retry: start, stop };
}

function errorStatus(err) {
  if (err?.name === "NotAllowedError" || err?.name === "SecurityError") return "denied";
  if (err?.name === "NotFoundError" || err?.name === "OverconstrainedError") return "unavailable";
  return "error";
}

function errorMessage(err) {
  switch (err?.name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Camera access was blocked. Allow the camera in your browser settings, then try again.";
    case "NotFoundError":
    case "OverconstrainedError":
      return "No usable camera was found on this device.";
    case "NotReadableError":
      return "The camera is already in use by another app. Close it and try again.";
    default:
      return "The camera could not be started. You can upload a photo instead.";
  }
}
