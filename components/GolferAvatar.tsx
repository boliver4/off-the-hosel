"use client";

import { useState } from "react";

/**
 * A golfer's circular photo, or a colored initials badge when no photo
 * has been set yet (golfers.headshot_url is null) — or if the photo URL
 * fails to actually load (broken link, moved image, etc.), so a bad URL
 * never shows a broken-image icon on the live site. Add/fix a photo any
 * time by editing that golfer's headshot_url column in Supabase's Table
 * Editor — it'll show up automatically, no code change needed.
 */
export function GolferAvatar({
  name,
  photoUrl,
  size = 44,
}: {
  name: string;
  photoUrl?: string | null;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);

  if (photoUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={name}
        className="golfer-avatar"
        style={{ width: size, height: size }}
        onError={() => setFailed(true)}
      />
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
    <span
      className="golfer-avatar golfer-avatar-fallback"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.34) }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}
