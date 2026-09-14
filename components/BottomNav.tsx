"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  {
    href: "/",
    key: "home",
    label: "Home",
    icon: <path d="M3 11 12 3l9 8v10h-6v-6H9v6H3Z" />,
  },
  {
    href: "/one-done",
    key: "one",
    label: "One & Done",
    icon: <path d="M6 21V3m0 2h10l-2 4 2 4H6" />,
  },
  {
    href: "/major-challenge",
    key: "major",
    label: "Majors",
    icon: (
      <>
        <path d="M8 3h8v4a4 4 0 0 1-8 0V3Z" />
        <path d="M6 5H3v2a4 4 0 0 0 4 4m11-6h3v2a4 4 0 0 1-4 4M12 11v6m-4 3h8" />
      </>
    ),
  },
  {
    href: "/leaderboard",
    key: "board",
    label: "Leaderboard",
    icon: <path d="M5 20v-8h3v8H5Zm5.5 0V5h3v15h-3Zm5.5 0v-11h3v11h-3Z" />,
  },
  {
    href: "/more",
    key: "more",
    label: "More",
    icon: <path d="M4 6h16M4 12h16M4 18h16" />,
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom">
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className={"nav" + (pathname === item.href ? " active" : "")}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            {item.icon}
          </svg>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
