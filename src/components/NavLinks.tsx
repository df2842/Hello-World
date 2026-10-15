"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string; emoji: string };

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/** Primary navigation as button-like pills; the current page is solid white. */
export default function NavLinks({ items, variant }: { items: NavItem[]; variant: "desktop" | "mobile" }) {
  const pathname = usePathname();

  return (
    <ul
      className={
        variant === "mobile"
          ? "flex gap-1.5 px-3 pb-2 sm:hidden"
          : "hidden items-center gap-1.5 sm:flex"
      }
    >
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <li key={item.href} className={variant === "mobile" ? "min-w-0 flex-1" : ""}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex h-10 items-center justify-center gap-1 whitespace-nowrap rounded-xl text-sm font-bold transition ${
                variant === "mobile" ? "px-1.5" : "px-3.5"
              } ${
                active ? "bg-white text-primary shadow" : "bg-white/15 hover:bg-white/25"
              }`}
            >
              <span aria-hidden className={variant === "mobile" ? "hidden min-[430px]:inline" : ""}>
                {item.emoji}
              </span>
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
