import { headers } from "next/headers";
import GoogleSignIn from "@/components/GoogleSignIn";
import { safeNext } from "@/lib/safe-next";

export const metadata = { title: "Sign in" };

/** The stable production domain; always registered with Google. */
const PRODUCTION_HOST = "hello-world-the-humor-project.vercel.app";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next: rawNext } = await searchParams;
  const next = rawNext ? safeNext(rawNext) : undefined;
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const host = (await headers()).get("host") ?? "";
  // Google only accepts sign-ins from origins listed on the OAuth client.
  // Per-deployment Vercel URLs may not be listed yet, so offer a way out.
  const onPreviewHost = host.endsWith(".vercel.app") && host !== PRODUCTION_HOST;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <span className="text-4xl" aria-hidden>
          🔐
        </span>
        <h1 className="mt-3 text-3xl font-bold">Sign in</h1>
        <p className="mt-2 text-muted">
          {next
            ? "Sign in with Google to continue. We'll bring you right back."
            : "Sign in with Google to upload photos, vote on jokes and track your own."}
        </p>

        {error && (
          <p role="alert" className="mt-6 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </p>
        )}

        <div className="mt-8">
          {clientId ? (
            <GoogleSignIn clientId={clientId} next={next} />
          ) : (
            <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              Google sign-in is not configured. Set NEXT_PUBLIC_GOOGLE_CLIENT_ID.
            </p>
          )}
        </div>

        <ul className="mt-8 space-y-1 text-left text-sm text-muted">
          <li>📸 Upload photos and get AI-written jokes</li>
          <li>👍 Vote on everyone&apos;s jokes</li>
          <li>📊 See how your jokes rank across all your pictures</li>
        </ul>

        {onPreviewHost && (
          <p className="mt-6 text-xs text-muted">
            Google button not working on this preview link?{" "}
            <a
              href={`https://${PRODUCTION_HOST}/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}
              className="font-semibold text-primary underline"
            >
              Sign in on the main site
            </a>
            .
          </p>
        )}

        <p className="mt-6 text-xs text-muted">
          Google sends an ID token to <code>/auth/callback</code>; Supabase turns it into a session.
          No client secret is involved.
        </p>
      </div>
    </main>
  );
}
