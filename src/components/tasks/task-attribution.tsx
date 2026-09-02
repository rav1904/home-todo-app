"use client";

import { User, UserCheck } from "lucide-react";

type TaskAttributionProps = {
  authorName: string | null;
  showAuthor: boolean;
  creatorId?: string | null;
  assigneeId?: string | null;
  assigneeName: string | null;
  currentUserId?: string | null;
  className?: string;
};

export function TaskAttribution({
  authorName,
  showAuthor,
  creatorId = null,
  assigneeId = null,
  assigneeName,
  currentUserId = null,
  className = "",
}: TaskAttributionProps) {
  const samePerson = Boolean(
    showAuthor && creatorId && assigneeId && creatorId === assigneeId,
  );
  const creatorVisible = Boolean(showAuthor && authorName) && !samePerson;
  const assigneeVisible = Boolean(assigneeId);
  const assigneeIsMe = Boolean(
    assigneeId && currentUserId && assigneeId === currentUserId,
  );
  const assigneeLabel = assigneeName ?? (assigneeIsMe ? "Me" : "Member");
  const assigneeAria = samePerson
    ? `Created by ${authorName ?? assigneeLabel}, assigned to ${assigneeName ?? (assigneeIsMe ? "you" : "Member")}`
    : `Assigned to ${assigneeName ?? (assigneeIsMe ? "you" : "Member")}`;

  if (!creatorVisible && !assigneeVisible) {
    return null;
  }

  return (
    <div
      className={`flex min-w-0 items-center gap-2.5 overflow-hidden ${className}`}
    >
      {creatorVisible ? (
        <span
          className="inline-flex min-w-0 max-w-[8.5rem] items-center gap-1 text-[11px] font-normal leading-none text-stone-400 dark:text-stone-500"
          title={`Created by ${authorName}`}
          aria-label={`Created by ${authorName}`}
        >
          <User className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
          <span className="truncate">{authorName}</span>
        </span>
      ) : null}
      {assigneeVisible ? (
        <span
          className="inline-flex min-w-0 max-w-[8.5rem] items-center gap-1 text-[11px] font-normal leading-none text-stone-400 dark:text-stone-500"
          title={assigneeAria}
          aria-label={assigneeAria}
        >
          <UserCheck className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
          <span className="truncate">{assigneeLabel}</span>
        </span>
      ) : null}
    </div>
  );
}
