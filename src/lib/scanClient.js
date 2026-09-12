/**
 * Browser-side client for POST /api/scan.
 *
 * The Anthropic key lives only in the serverless function. This module never
 * sees it and never talks to api.anthropic.com directly.
 */

const MAX_EDGE = 1568; // Anthropic downsamples above this anyway — send less over the wire.

/**
 * Read a File into a base64 JPEG string with no `data:` prefix, downscaling
 * so a 12MP phone photo doesn't blow the request body limit.
 * @param {File} file
 * @returns {Promise<string>} bare base64
 */
export async function fileToBase64Jpeg(file) {
  const bitmap = await createImageBitmap(file);

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d").drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  return dataUrl.slice(dataUrl.indexOf(",") + 1);
}

/**
 * Freeze the current frame of a live <video> into a JPEG data URL.
 *
 * Downscales the same way fileToBase64Jpeg does — a 1080p frame is far more
 * than the model needs and makes the request body needlessly large.
 *
 * @param {HTMLVideoElement} video
 * @returns {string} "data:image/jpeg;base64,..."
 */
export function captureFrame(video) {
  const w = video?.videoWidth ?? 0;
  const h = video?.videoHeight ?? 0;
  // videoWidth is 0 until the first frame has actually decoded.
  if (!w || !h) throw new Error("The camera is still warming up. Try again in a moment.");

  const scale = Math.min(1, MAX_EDGE / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);

  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  if (!dataUrl.startsWith("data:image/jpeg;base64,") || dataUrl.length < 128) {
    throw new Error("That frame could not be read. Try again.");
  }
  return dataUrl;
}

/**
 * Send one image to the vision endpoint.
 *
 * Accepts either a bare base64 string or a full data URL — /api/scan tolerates
 * both and strips the prefix before it reaches Anthropic.
 *
 * @param {string} image bare base64 JPEG or "data:image/jpeg;base64,..."
 * @param {{signal?: AbortSignal}} [options]
 * @returns {Promise<object>} the raw vision result — feed it to assessPremises()
 */
export async function scanImage(image, { signal } = {}) {
  let res;
  try {
    res = await fetch("/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image }),
      signal,
    });
  } catch (err) {
    if (err?.name === "AbortError") throw err;
    throw new Error("Could not reach the scan service. Check your connection.");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || friendlyStatus(res.status));
  }

  try {
    return await res.json();
  } catch {
    throw new Error("The scan service returned an unreadable response.");
  }
}

function friendlyStatus(status) {
  if (status === 400) return "That image could not be read. Try another photo.";
  if (status === 413) return "That photo is too large. Try again.";
  if (status === 429) return "Too many scans right now. Wait a moment and retry.";
  if (status >= 500) return "The scan service is unavailable. Try again shortly.";
  return `Scan failed (${status})`;
}
