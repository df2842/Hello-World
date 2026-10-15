import UploadStudio from "@/components/UploadStudio";

export const metadata = { title: "Upload" };
// The upload's AI prompt chain runs in /api/images; this page is just the UI.

export default function UploadPage() {
  return (
    <main className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col px-3 py-3 sm:px-6 sm:py-4">
      <h1 className="mb-3 shrink-0 text-2xl font-extrabold sm:text-3xl">Upload a photo</h1>
      <UploadStudio />
    </main>
  );
}
