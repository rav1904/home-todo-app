"use client";

import { UserCheck, UserRoundPen, Users } from "lucide-react";

type TaskAttributionProps = {
  authorName: string | null;
  showAuthor: boolean;
  creatorId?: string | null;
  assigneeId?: string | null;
  assigneeName: string | null;
  supportId?: string | null;
  supportName?: string | null;
  currentUserId?: string | null;
  className?: string;
};

function displayName(
  name: string | null | undefined,
  isMe: boolean,
  fallback = "Member",
) {
  return name ?? (isMe ? "Me" : fallback);
}

function PersonChip({
  icon: Icon,
  name,
  title,
}: {
  icon: typeof UserRoundPen;
  name: string;
  title: string;
}) {
  return (
    <span
      className="inline-flex min-w-0 max-w-[8.5rem] items-center gap-1 text-[11px] font-normal leading-none text-stone-400 dark:text-stone-500"
      title={title}
      aria-label={title}
    >
      <Icon className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
      <span className="truncate">{name}</span>
    </span>
  );
}

export function TaskAttribution({
  authorName,
  showAuthor,
  assigneeId = null,
  assigneeName,
  supportId = null,
  supportName = null,
  currentUserId = null,
  className = "",
}: TaskAttributionProps) {
  const creatorVisible = Boolean(showAuthor && authorName);
  const assigneeVisible = Boolean(assigneeId);
  const supportVisible = Boolean(supportId);

  const assigneeIsMe = Boolean(
    assigneeId && currentUserId && assigneeId === currentUserId,
  );
  const supportIsMe = Boolean(
    supportId && currentUserId && supportId === currentUserId,
  );
  const assigneeLabel = displayName(assigneeName, assigneeIsMe);
  const supportLabel = displayName(supportName, supportIsMe);

  if (!creatorVisible && !assigneeVisible && !supportVisible) {
    return null;
  }

  return (
    <div
      className={`flex min-w-0 items-center gap-2.5 overflow-hidden ${className}`}
    >
      {creatorVisible ? (
        <PersonChip
          icon={UserRoundPen}
          name={authorName!}
          title={`Created by ${authorName}`}
        />
      ) : null}
      {assigneeVisible ? (
        <PersonChip
          icon={UserCheck}
          name={assigneeLabel}
          title={`Assigned to ${assigneeName ?? (assigneeIsMe ? "you" : "Member")}`}
        />
      ) : null}
      {supportVisible ? (
        <PersonChip
          icon={Users}
          name={supportLabel}
          title={`Support: ${supportName ?? (supportIsMe ? "you" : "Member")}`}
        />
      ) : null}
    </div>
  );
}
