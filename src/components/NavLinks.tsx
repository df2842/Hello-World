"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string; emoji: string };

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/** Primary navigation with the current page highlighted. */
export default function NavLinks({ items, variant }: { items: NavItem[]; variant: "desktop" | "mobile" }) {
  const pathname = usePathname();

  if (variant === "mobile") {
    return (
      <ul className="flex gap-1 overflow-x-auto px-4 pb-2 sm:hidden">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-1 text-sm font-medium ${
                  active ? "bg-white text-primary" : "bg-white/15"
                }`}
              >
                <span aria-hidden>{item.emoji}</span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <ul className="hidden items-center gap-1 sm:flex">
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                active ? "bg-white text-primary shadow-sm" : "hover:bg-white/15"
              }`}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
