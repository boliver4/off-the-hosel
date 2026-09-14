"use client";

import { useState } from "react";

/**
 * Fills the "My Pick" homepage card's photo slot — a real golfer photo
 * if one's set, or a clean centered-initials fallback otherwise (also
 * used if the photo URL fails to load). Unlike GolferAvatar this fills
 * a rectangular box rather than a small circle.
 */
export function PickPhoto({ name, photoUrl }: { name: string; photoUrl?: string | null }) {
  const [failed, setFailed] = useState(false);

  if (photoUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={photoUrl} alt={name} onError={() => setFailed(true)} />
    );
  }

  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?";

  return (
    <span className="approved-pick-photo-fallback" aria-hidden="true">
      {initials}
    </span>
  );
}
