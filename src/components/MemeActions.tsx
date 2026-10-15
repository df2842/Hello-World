"use client";

import { useState } from "react";

/** Wraps text into lines that fit `maxWidth` on the canvas. */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Draws the photo with the joke in a white caption band BELOW it (the text
 * never covers the photo), as a PNG blob.
 */
async function renderCaptioned(imageUrl: string, text: string): Promise<Blob> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = imageUrl;
  await img.decode();

  const maxEdge = 1600;
  const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.round(img.naturalWidth * scale);
  const photoHeight = Math.round(img.naturalHeight * scale);

  const family =
    getComputedStyle(document.documentElement).getPropertyValue("--font-geist-sans").trim() || "system-ui";
  const size = Math.max(20, Math.round(width / 22));
  const padding = Math.round(size * 0.9);

  // Measure first to size the caption band.
  const measure = document.createElement("canvas").getContext("2d")!;
  measure.font = `700 ${size}px ${family}, system-ui, sans-serif`;
  const lines = wrap(measure, text, width - padding * 2);
  const lineHeight = size * 1.3;
  const band = Math.round(lines.length * lineHeight + padding * 2);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = photoHeight + band;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, width, photoHeight);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, photoHeight, width, band);

  ctx.font = `700 ${size}px ${family}, system-ui, sans-serif`;
  ctx.fillStyle = "#1b1411";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  lines.forEach((l, i) => ctx.fillText(l, width / 2, photoHeight + padding + i * lineHeight));

  ctx.font = `${Math.max(11, Math.round(size / 2.4))}px system-ui, sans-serif`;
  ctx.fillStyle = "#9a8b7f";
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillText("The Humor Project", width - 10, canvas.height - 6);

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not render image"))), "image/png"),
  );
}

/** "Download" and "Share" buttons for a photo + joke. */
export default function MemeActions({
  imageUrl,
  text,
  sharePath,
}: {
  imageUrl: string;
  text: string;
  sharePath: string;
}) {
  const [status, setStatus] = useState<{ which: "save" | "share"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const flash = (which: "save" | "share", text: string) => {
    setStatus({ which, text });
    setTimeout(() => setStatus(null), 2000);
  };

  const download = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const blob = await renderCaptioned(imageUrl, text);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${text.slice(0, 40).replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "joke"}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      flash("save", "✓ Saved");
    } catch {
      flash("save", "Failed");
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    const url = `${window.location.origin}${sharePath}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "The Humor Project", text, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      flash("share", "✓ Copied");
    } catch {
      // The user closed the share sheet; nothing to do.
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={download}
        disabled={busy}
        className="btn btn-sm btn-secondary flex-1"
        title="Download the photo with this joke under it"
      >
        <span aria-live="polite">{busy ? "Saving…" : status?.which === "save" ? status.text : "⬇️ Save"}</span>
      </button>
      <button type="button" onClick={share} className="btn btn-sm btn-secondary flex-1" title="Share a link to this photo">
        <span aria-live="polite">{status?.which === "share" ? status.text : "🔗 Share"}</span>
      </button>
    </>
  );
}
