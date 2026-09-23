import GoogleSignIn from "@/components/GoogleSignIn";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <span className="text-4xl" aria-hidden>
          🔐
        </span>
        <h1 className="mt-3 text-3xl font-bold">Sign in</h1>
        <p className="mt-2 text-muted">
          {next
            ? "That page is members only. Sign in with Google to continue."
            : "Use your Google account to unlock the members-only area."}
        </p>

        {error && (
          <p className="mt-6 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </p>
        )}

        <div className="mt-8">
          {clientId ? (
            <GoogleSignIn clientId={clientId} />
          ) : (
            <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              Google sign-in is not configured. Set NEXT_PUBLIC_GOOGLE_CLIENT_ID.
            </p>
          )}
        </div>

        <p className="mt-8 text-xs text-muted">
          Google sends an ID token to <code>/auth/callback</code>; Supabase
          turns it into a session. No client secret is involved.
        </p>
      </div>
    </main>
  );
}
