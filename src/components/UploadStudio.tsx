"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import StylePicker from "@/components/StylePicker";
import { prettyModel, type JokeStyle } from "@/lib/joke-styles";

type Step = "idle" | "uploading" | "describing" | "described" | "captioned" | "saving" | "done" | "error";

const STEPS: { key: Step; label: string; emoji: string }[] = [
  { key: "uploading", label: "Upload", emoji: "📤" },
  { key: "describing", label: "Look", emoji: "👀" },
  { key: "captioned", label: "Joke", emoji: "✍️" },
  { key: "saving", label: "Save", emoji: "💾" },
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
      setTimeout(() => router.push(`/gallery/${finalId}?new=1`), 700);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStep("error");
    }
  };

  const busy = step !== "idle" && step !== "error" && step !== "done";
  const current = STEPS.find((s) => s.key === step || (s.key === "describing" && step === "described"));

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      {/* Left: dropzone / preview + controls */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 max-lg:short:grid max-lg:short:grid-cols-2 max-lg:short:grid-rows-[1fr_auto_auto]">
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
          aria-label={preview ? "Choose a different photo" : "Choose a photo to upload"}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && !busy && inputRef.current?.click()}
          className={`relative min-h-24 flex-1 cursor-pointer overflow-hidden rounded-3xl border-4 border-dashed transition max-lg:short:row-span-3 max-lg:short:h-full ${
            dragging ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/60"
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
              <img src={preview} alt="" className="absolute inset-0 h-full w-full bg-black object-contain" />
              {busy && <div className="scan-line pointer-events-none absolute inset-x-0 h-24" />}
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <span className="text-6xl" aria-hidden>
                🖼️
              </span>
              <span className="btn btn-lg btn-primary pointer-events-none">Choose a photo</span>
              <span className="text-sm text-muted">or drop one here</span>
            </div>
          )}
        </div>

        <StylePicker value={style} onChange={setStyle} disabled={busy} />

        <div className="flex shrink-0 gap-2">
          {file && !busy && (
            <button type="button" onClick={() => inputRef.current?.click()} className="btn btn-lg btn-secondary">
              Change
            </button>
          )}
          <button type="button" disabled={!file || busy} onClick={generate} className="btn btn-lg btn-primary flex-1">
            {busy ? `${current?.emoji ?? "⏳"} ${current?.label ?? "Working"}…` : step === "done" ? "✓ Done!" : "✨ Write jokes"}
          </button>
        </div>
        {error && (
          <p role="alert" className="shrink-0 text-sm font-semibold text-down">
            {error}
          </p>
        )}
        {/* Phones: the newest joke appears here instead of a side panel. */}
        {captions.length > 0 && (
          <p className="shrink-0 animate-rise rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold lg:hidden">
            {captions[0]}
          </p>
        )}
      </div>

      {/* Right (wide screens): the prompt chain, live */}
      <div className="hidden min-h-0 flex-col gap-4 overflow-hidden rounded-3xl border border-border bg-card p-5 shadow-sm lg:flex">
        <ol className="grid shrink-0 grid-cols-4 gap-2">
          {STEPS.map((s) => {
            const active = step === s.key || (s.key === "describing" && step === "described");
            const complete = rank(step) > rank(s.key) && !(s.key === "describing" && step === "described");
            return (
              <li key={s.key} className="flex flex-col items-center gap-1 text-center">
                <span
                  className={`grid h-11 w-11 place-items-center rounded-full border-2 text-lg transition ${
                    complete
                      ? "border-primary bg-primary text-primary-foreground"
                      : active
                        ? "animate-pulse border-primary bg-primary/10"
                        : "border-border bg-background"
                  }`}
                >
                  {complete ? "✓" : s.emoji}
                </span>
                <span className={`text-xs font-bold ${active || complete ? "" : "text-muted"}`}>{s.label}</span>
              </li>
            );
          })}
        </ol>

        {typed ? (
          <div className="shrink-0 rounded-2xl bg-background p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-muted">{prettyModel(models.see)} saw</p>
            <p className="mt-1 line-clamp-4 text-sm">
              {typed}
              {typed.length < description.length && <span className="animate-pulse">▍</span>}
            </p>
          </div>
        ) : (
          <p className="flex flex-1 items-center justify-center text-center text-sm font-semibold text-muted">
            Pick a photo and a style, then hit Write jokes.
          </p>
        )}

        {captions.length > 0 && (
          <ul className="min-h-0 space-y-2 overflow-hidden">
            {captions.map((c, i) => (
              <li
                key={c}
                className="animate-rise rounded-2xl border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm font-semibold"
                style={{ animationDelay: `${i * 120}ms` }}
              >
                {c}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
