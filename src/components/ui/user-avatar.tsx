"use client";

import { getUserInitials } from "@/lib/auth/user-display";
import { useState } from "react";

type UserAvatarProps = {
  name: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
};

const sizeClasses = {
  sm: "h-8 w-8 text-[11px]",
  md: "h-9 w-9 text-xs",
  lg: "h-12 w-12 text-sm",
} as const;

export function UserAvatar({
  name,
  avatarUrl,
  size = "md",
}: UserAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const initials = getUserInitials(name);
  const sizeClass = sizeClasses[size];

  if (avatarUrl && !imageFailed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- Google/Supabase avatar URLs vary by provider
      <img
        src={avatarUrl}
        alt=""
        onError={() => setImageFailed(true)}
        className={`${sizeClass} shrink-0 rounded-full object-cover ring-1 ring-stone-200/80 dark:ring-stone-700`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`${sizeClass} inline-flex shrink-0 items-center justify-center rounded-full bg-stone-200 font-medium tracking-wide text-stone-600 ring-1 ring-stone-200/80 dark:bg-stone-700 dark:text-stone-200 dark:ring-stone-600`}
    >
      {initials}
    </span>
  );
}
