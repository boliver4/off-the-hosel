/**
 * A golfer's circular photo, or a colored initials badge when no photo
 * has been set yet (golfers.headshot_url is null). Add a real photo any
 * time by pasting an image URL into that column in Supabase's Table
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
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={name}
        className="golfer-avatar"
        style={{ width: size, height: size, fontSize: undefined }}
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
