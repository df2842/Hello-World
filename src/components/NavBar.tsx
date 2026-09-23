import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const links = [
  { href: "/", label: "Home" },
  { href: "/jokes", label: "Jokes" },
  { href: "/profile", label: "Profile" },
];

export default async function NavBar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const name =
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email ??
    "Account";
  const avatar = user?.user_metadata?.avatar_url as string | undefined;

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-primary text-primary-foreground shadow-md">
      <nav className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-bold tracking-tight"
        >
          <span aria-hidden>🎭</span>
          The Humor Project
        </Link>

        <ul className="hidden items-center gap-1 sm:flex">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="rounded-full px-3 py-1.5 text-sm font-medium transition hover:bg-white/15"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        {user ? (
          <div className="flex items-center gap-3">
            {avatar && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatar}
                alt=""
                referrerPolicy="no-referrer"
                className="h-8 w-8 rounded-full border-2 border-white/60"
              />
            )}
            <span className="hidden max-w-40 truncate text-sm md:inline">
              {name}
            </span>
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
      </nav>
    </header>
  );
}
