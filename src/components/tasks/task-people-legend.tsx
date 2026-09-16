"use client";

import { UserCheck, UserRoundPen, Users } from "lucide-react";

type TaskPeopleLegendProps = {
  className?: string;
};

function LegendItem({
  icon: Icon,
  label,
  title,
}: {
  icon: typeof UserRoundPen;
  label: string;
  title: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-0.5"
      title={title}
      aria-label={title}
    >
      <Icon className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
      {label}
    </span>
  );
}

export function TaskPeopleLegend({ className = "" }: TaskPeopleLegendProps) {
  return (
    <p
      className={`flex w-full min-w-0 flex-wrap items-center justify-end gap-x-2.5 gap-y-0.5 text-[10px] leading-none text-stone-400 dark:text-stone-500 ${className}`}
      aria-label="People icons: Created, Assigned, Support"
    >
      <LegendItem
        icon={UserRoundPen}
        label="Created"
        title="Creator icon = Created"
      />
      <LegendItem
        icon={UserCheck}
        label="Assigned"
        title="Assigned icon = Assigned"
      />
      <LegendItem
        icon={Users}
        label="Support"
        title="Support icon = Support"
      />
    </p>
  );
}
