import Link from "next/link";
import NavLinks, { type NavItem } from "@/components/NavLinks";
import { createClient } from "@/lib/supabase/server";

const PUBLIC_LINKS: NavItem[] = [
  { href: "/gallery", label: "Arena", emoji: "🏟️" },
  { href: "/rate", label: "Rate", emoji: "⚡" },
  { href: "/upload", label: "Upload", emoji: "📸" },
];

const MEMBER_LINKS: NavItem[] = [{ href: "/me", label: "My Jokes", emoji: "😂" }];

export default async function NavBar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const avatar = user?.user_metadata?.avatar_url as string | undefined;
  const items = user ? [...PUBLIC_LINKS, ...MEMBER_LINKS] : PUBLIC_LINKS;

  return (
    <header className="z-20 shrink-0 bg-primary text-primary-foreground shadow-md">
      <nav aria-label="Main" className="mx-auto w-full max-w-7xl">
        <div className="flex h-14 items-center justify-between gap-3 px-3 sm:px-6">
          <Link href="/" className="flex shrink-0 items-center gap-2 text-lg font-extrabold tracking-tight">
            <span aria-hidden className="text-2xl">
              🎭
            </span>
            <span className="hidden md:inline">The Humor Project</span>
          </Link>

          <NavLinks items={items} variant="desktop" />

          {user ? (
            <div className="flex items-center gap-2">
              <Link href="/profile" title="Your profile" aria-label="Your profile" className="shrink-0">
                {avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatar} alt="" referrerPolicy="no-referrer" className="h-9 w-9 rounded-full border-2 border-white" />
                ) : (
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-white/20" aria-hidden>
                    🙂
                  </span>
                )}
              </Link>
              <form action="/auth/signout" method="post">
                <button type="submit" className="btn btn-sm bg-white/15 text-primary-foreground shadow-none hover:bg-white/25">
                  Sign out
                </button>
              </form>
            </div>
          ) : (
            <Link href="/login" className="btn btn-sm btn-accent">
              Sign in
            </Link>
          )}
        </div>
        <NavLinks items={items} variant="mobile" />
      </nav>
    </header>
  );
}
