"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", key: "home", label: "Home" },
  { href: "/my-picks", key: "mypicks", label: "My Picks" },
  { href: "/leaderboard", key: "board", label: "Leaderboard" },
  { href: "/standings", key: "season", label: "Standings" },
  { href: "/tournament-info", key: "info", label: "Tournaments" },
  { href: "/more", key: "more", label: "More" },
];

export function Header({ displayName }: { displayName?: string | null }) {
  const pathname = usePathname();
  const initials = (displayName || "??")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="opta-header">
      <Link href="/" className="opta-brand" aria-label="Off The Hosel home">
        <span className="opta-mark opta-mark-photo" aria-hidden="true"></span>
        <span className="opta-copy">
          <b>Off The Hosel</b>
          <small>FANTASY GOLF</small>
        </span>
      </Link>

      <nav className="opta-nav" aria-label="Primary navigation">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className={"opta-item" + (pathname === item.href ? " active" : "")}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <span className="opta-separator"></span>

      <Link href="/more" className="opta-profile">
        <span className="opta-avatar">{initials}</span>
        <span className="opta-name">{displayName || "Guest"}</span>
        <span className="opta-chev">⌄</span>
      </Link>
    </header>
  );
}
