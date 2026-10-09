"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import StylePicker from "@/components/StylePicker";
import { prettyModel, type JokeStyle } from "@/lib/joke-styles";

type Step = "idle" | "uploading" | "describing" | "described" | "captioned" | "saving" | "done" | "error";

const STEPS: { key: Step; label: string; detail: string; emoji: string }[] = [
  { key: "uploading", label: "Uploading", detail: "Shrinking and sending your photo", emoji: "📤" },
  { key: "describing", label: "Looking", detail: "A vision model studies the picture and describes it", emoji: "👀" },
  { key: "captioned", label: "Writing jokes", detail: "The description goes to a second prompt that writes jokes", emoji: "✍️" },
  { key: "saving", label: "Saving", detail: "Image and captions go into Supabase", emoji: "💾" },
];

const ORDER: Step[] = ["idle", "uploading", "describing", "described", "captioned", "saving", "done"];
const rank = (s: Step) => ORDER.indexOf(s);

/**
 * Downscale to a JPEG so uploads are fast and the model gets a reasonable
 * image. GIFs become a JPEG of their first frame, since the AI can't read GIFs.
 */
async function shrink(file: File, maxEdge = 1600): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("Your browser couldn't open this image. Try a JPEG or PNG.");
  });
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.86));
  if (!blob) throw new Error("Your browser couldn't process this image. Try a JPEG or PNG.");
  return blob;
}

export default function UploadStudio() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [step, setStep] = useState<Step>("idle");
  const [description, setDescription] = useState("");
  const [typed, setTyped] = useState("");
  const [captions, setCaptions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [style, setStyle] = useState<JokeStyle>("mixed");
  const [models, setModels] = useState<{ see?: string; joke?: string }>({});

  // Release the last preview URL when the component unmounts.
  const previewRef = useRef<string | null>(null);
  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  // Typewriter effect for the description as soon as it arrives.
  useEffect(() => {
    if (!description) return;
    let i = 0;
    const id = setInterval(() => {
      i += 3;
      setTyped(description.slice(0, i));
      if (i >= description.length) clearInterval(id);
    }, 12);
    return () => clearInterval(id);
  }, [description]);

  const pick = (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setError("That doesn't look like an image.");
      return;
    }
    setError(null);
    setStep("idle");
    setDescription("");
    setTyped("");
    setCaptions([]);
    setModels({});
    setFile(f);
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = URL.createObjectURL(f);
    setPreview(previewRef.current);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    pick(e.dataTransfer.files?.[0]);
  }, []);

  const generate = async () => {
    if (!file) return;
    setError(null);
    setDescription("");
    setTyped("");
    setCaptions([]);
    setModels({});
    setStep("uploading");
    try {
      const blob = await shrink(file);
      const form = new FormData();
      form.append("file", blob, file.name.replace(/\.[^.]+$/, "") + ".jpg");
      form.append("style", style);

      const res = await fetch("/api/images", { method: "POST", body: form });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Upload failed (${res.status}).`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalId: string | null = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line);
          if (event.step === "error") throw new Error(event.message);
          if (event.step === "described") {
            setDescription(event.description);
            setModels((m) => ({ ...m, see: event.model }));
          }
          if (event.step === "captioned") {
            setCaptions(event.captions);
            setModels((m) => ({ ...m, joke: event.model }));
          }
          if (event.step === "done") finalId = event.id;
          setStep(event.step);
        }
      }
      if (!finalId) throw new Error("The server did not finish saving.");
      setTimeout(() => router.push(`/gallery/${finalId}?new=1`), 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStep("error");
    }
  };

  const busy = step !== "idle" && step !== "error" && step !== "done";

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
      {/* Left: dropzone / preview */}
      <div>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => !busy && inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
          className={`relative grid min-h-80 cursor-pointer place-items-center overflow-hidden rounded-3xl border-4 border-dashed transition ${
            dragging
              ? "scale-[1.01] border-primary bg-primary/10"
              : "border-border bg-card hover:border-primary/60"
          } ${busy ? "cursor-wait" : ""}`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => pick(e.target.files?.[0])}
          />
          {preview ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="" className="max-h-130 w-full object-contain" />
              {captions[0] && (
                <div className="meme-text pointer-events-none absolute inset-x-0 top-0 animate-rise p-4 text-center">
                  {captions[0]}
                </div>
              )}
              {busy && <div className="scan-line pointer-events-none absolute inset-x-0 h-24" />}
            </>
          ) : (
            <div className="p-10 text-center">
              <div className="text-6xl">🖼️</div>
              <p className="mt-4 text-lg font-semibold">Drop a photo here</p>
              <p className="mt-1 text-sm text-muted">or click to choose one · JPEG, PNG, WebP, GIF</p>
            </div>
          )}
        </div>

        <div className="mt-5">
          <p className="mb-2 text-sm font-semibold">Joke style</p>
          <StylePicker value={style} onChange={setStyle} disabled={busy} />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={!file || busy}
            onClick={generate}
            className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow transition hover:brightness-110 disabled:opacity-40"
          >
            {busy ? "Working…" : step === "done" ? "Done!" : "Write jokes about it ✨"}
          </button>
          {file && !busy && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="rounded-full border border-border px-4 py-2 text-sm hover:border-primary"
            >
              Choose another
            </button>
          )}
          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
        </div>
      </div>

      {/* Right: the prompt chain, live */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-bold">The prompt chain</h2>
        <p className="mt-1 text-sm text-muted">
          Two model calls, chained: the first one sees, the second one jokes.
        </p>

        <ol className="mt-6 space-y-4">
          {STEPS.map((s) => {
            const active =
              step === s.key || (s.key === "describing" && step === "described");
            const complete = rank(step) > rank(s.key) && !(s.key === "describing" && step === "described");
            return (
              <li key={s.key} className="flex gap-3">
                <div
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border text-lg transition ${
                    complete
                      ? "border-primary bg-primary text-primary-foreground"
                      : active
                        ? "animate-pulse border-primary bg-primary/10"
                        : "border-border bg-background text-muted"
                  }`}
                >
                  {complete ? "✓" : s.emoji}
                </div>
                <div>
                  <p className={`font-medium ${active || complete ? "" : "text-muted"}`}>{s.label}</p>
                  <p className="text-sm text-muted">{s.detail}</p>
                </div>
              </li>
            );
          })}
        </ol>

        {typed && (
          <div className="mt-6 rounded-2xl bg-background p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              {prettyModel(models.see)} saw
            </p>
            <p className="mt-1 text-sm leading-relaxed">
              {typed}
              {typed.length < description.length && <span className="animate-pulse">▍</span>}
            </p>
          </div>
        )}

        {captions.length > 0 && models.joke && (
          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">
            {prettyModel(models.joke)} wrote
          </p>
        )}
        {captions.length > 0 && (
          <ul className="mt-2 space-y-2">
            {captions.map((c, i) => (
              <li
                key={c}
                className="animate-rise rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-medium"
                style={{ animationDelay: `${i * 120}ms` }}
              >
                {c}
              </li>
            ))}
          </ul>
        )}

        {step === "done" && (
          <p className="mt-4 animate-rise text-sm font-semibold text-primary">
            Saved! Taking you to your picture so you can vote…
          </p>
        )}
      </div>
    </div>
  );
}
