import Link from "next/link";
import NavLinks, { type NavItem } from "@/components/NavLinks";
import { createClient } from "@/lib/supabase/server";

const PUBLIC_LINKS: NavItem[] = [
  { href: "/gallery", label: "Arena", emoji: "🏟️" },
  { href: "/rate", label: "Rate", emoji: "⚡" },
];

const MEMBER_LINKS: NavItem[] = [
  { href: "/upload", label: "Upload", emoji: "📸" },
  { href: "/me", label: "My Jokes", emoji: "😂" },
];

export default async function NavBar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const name = (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? "Account";
  const avatar = user?.user_metadata?.avatar_url as string | undefined;
  // Upload stays visible to visitors (it explains sign-in); "My Jokes" only
  // makes sense once you're signed in.
  const items = user ? [...PUBLIC_LINKS, ...MEMBER_LINKS] : [...PUBLIC_LINKS, MEMBER_LINKS[0]];

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-primary text-primary-foreground shadow-md">
      <nav aria-label="Main" className="mx-auto w-full max-w-6xl">
        <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/" className="flex shrink-0 items-center gap-2 text-lg font-bold tracking-tight">
            <span aria-hidden>🎭</span>
            <span className="hidden min-[400px]:inline">The Humor Project</span>
          </Link>

          <NavLinks items={items} variant="desktop" />

          {user ? (
            <div className="flex items-center gap-2">
              <Link
                href="/profile"
                title="Your profile"
                className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition hover:bg-white/15"
              >
                {avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatar} alt="" referrerPolicy="no-referrer" className="h-8 w-8 rounded-full border-2 border-white/60" />
                ) : (
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-white/20" aria-hidden>
                    🙂
                  </span>
                )}
                <span className="hidden max-w-32 truncate text-sm lg:inline">{name}</span>
              </Link>
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="rounded-full bg-white/15 px-3 py-1.5 text-sm font-medium transition hover:bg-white/25"
                >
                  Sign out
                </button>
              </form>
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-accent-foreground shadow transition hover:brightness-105"
            >
              Sign in
            </Link>
          )}
        </div>
        <NavLinks items={items} variant="mobile" />
      </nav>
    </header>
  );
}
