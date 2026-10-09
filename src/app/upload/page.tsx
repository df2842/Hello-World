import UploadStudio from "@/components/UploadStudio";

export const metadata = { title: "Upload" };

export default function UploadPage() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-12">
      <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent-foreground">
        Members only
      </span>
      <h1 className="mt-3 text-4xl font-bold">Feed the caption machine</h1>
      <p className="mt-2 max-w-xl text-muted">
        Upload a photo and pick a joke style. A fast Gemini Flash-Lite model describes what it
        sees, then a second prompt turns that description into jokes about your picture. You
        get to watch it happen, then the crowd votes.
      </p>
      <div className="mt-8">
        <UploadStudio />
      </div>
    </main>
  );
}
