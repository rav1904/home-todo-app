type UserMetadataLike = {
  full_name?: unknown;
  name?: unknown;
  avatar_url?: unknown;
  picture?: unknown;
} | null | undefined;

export const DISPLAY_NAME_OVERRIDE_MAX_LENGTH = 40;

function readTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function getUserAuthName(metadata: UserMetadataLike): string | null {
  const fullName = readTrimmedString(metadata?.full_name);
  if (fullName) return fullName;

  const name = readTrimmedString(metadata?.name);
  if (name) return name;

  return null;
}

export function getUserDisplayName(
  metadata: UserMetadataLike,
  email: string | null | undefined,
  fallback: string,
  override?: string | null,
): string {
  const overrideName = readTrimmedString(override);
  if (overrideName) return overrideName;

  const authName = getUserAuthName(metadata);
  if (authName) return authName;

  const trimmedEmail = email?.trim() ?? "";
  const username = trimmedEmail.split("@")[0]?.trim();
  if (username) return username;
  if (trimmedEmail) return trimmedEmail;

  return fallback;
}

export function parseDisplayNameOverride(
  input: string,
): { value: string | null } | { error: string } {
  const trimmed = input.trim();
  if (!trimmed) {
    return { value: null };
  }

  if (trimmed.length > DISPLAY_NAME_OVERRIDE_MAX_LENGTH) {
    return {
      error: `Display name must be ${DISPLAY_NAME_OVERRIDE_MAX_LENGTH} characters or fewer.`,
    };
  }

  if (/\p{Cc}/u.test(trimmed)) {
    return { error: "Display name cannot include control characters." };
  }

  return { value: trimmed };
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
