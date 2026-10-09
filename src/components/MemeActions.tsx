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

/** Draws the photo with the joke burned in, classic meme style, as a PNG blob. */
async function renderMeme(imageUrl: string, text: string): Promise<Blob> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = imageUrl;
  await img.decode();

  const maxEdge = 1600;
  const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const family =
    getComputedStyle(document.documentElement).getPropertyValue("--font-anton").trim() || "Impact";
  const size = Math.max(22, Math.round(canvas.width / 13));
  await document.fonts.load(`${size}px ${family}`).catch(() => undefined);
  ctx.font = `${size}px ${family}, Impact, "Arial Black", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(3, size / 8);
  ctx.strokeStyle = "#000";
  ctx.fillStyle = "#fff";

  const lines = wrap(ctx, text.toUpperCase(), canvas.width * 0.92);
  const lineHeight = size * 1.12;
  const top = Math.round(canvas.height * 0.03);
  lines.forEach((l, i) => {
    const y = top + i * lineHeight;
    ctx.strokeText(l, canvas.width / 2, y);
    ctx.fillText(l, canvas.width / 2, y);
  });

  // Small watermark so shared memes point back to the app.
  ctx.font = `${Math.max(12, Math.round(size / 3.2))}px ui-sans-serif, system-ui, sans-serif`;
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.lineWidth = 3;
  ctx.strokeText("The Humor Project", canvas.width - 12, canvas.height - 10);
  ctx.fillText("The Humor Project", canvas.width - 12, canvas.height - 10);

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not render image"))), "image/png"),
  );
}

/** "Download meme" and "Share" buttons for a picture + joke. */
export default function MemeActions({
  imageUrl,
  text,
  sharePath,
  compact = false,
}: {
  imageUrl: string;
  text: string;
  sharePath: string;
  compact?: boolean;
}) {
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const download = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const blob = await renderMeme(imageUrl, text);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${text.slice(0, 40).replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "meme"}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setStatus("Downloaded!");
    } catch {
      setStatus("Could not create the image.");
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
      setStatus("Link copied!");
    } catch {
      // The user closed the share sheet; nothing to do.
    }
  };

  const btn = `rounded-full border border-border bg-card font-medium transition hover:border-primary hover:text-primary disabled:opacity-50 ${
    compact ? "px-3 py-1 text-xs" : "px-4 py-2 text-sm"
  }`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={download} disabled={busy} className={btn}>
        {busy ? "Rendering…" : "⬇️ Download meme"}
      </button>
      <button type="button" onClick={share} className={btn}>
        🔗 Share
      </button>
      {status && (
        <span role="status" className="text-xs text-muted">
          {status}
        </span>
      )}
    </div>
  );
}
