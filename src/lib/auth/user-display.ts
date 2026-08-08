type UserMetadataLike = {
  full_name?: unknown;
  name?: unknown;
  avatar_url?: unknown;
  picture?: unknown;
} | null | undefined;

function readTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function getUserDisplayName(
  metadata: UserMetadataLike,
  email: string | null | undefined,
  fallback: string,
): string {
  const fullName = readTrimmedString(metadata?.full_name);
  if (fullName) return fullName;

  const name = readTrimmedString(metadata?.name);
  if (name) return name;

  const username = email?.split("@")[0]?.trim();
  if (username) return username;

  return fallback;
}

export function getUserAvatarUrl(metadata: UserMetadataLike): string | null {
  const avatarUrl = readTrimmedString(metadata?.avatar_url);
  if (avatarUrl) return avatarUrl;

  const picture = readTrimmedString(metadata?.picture);
  if (picture) return picture;

  return null;
}

export function getUserInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}
