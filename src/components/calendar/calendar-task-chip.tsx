import { CategoryBadge } from "@/components/tasks/category-select";
import { LabelBadges } from "@/components/tasks/label-badges";
import type { CalendarTask } from "@/lib/tasks/calendar";
import { formatTaskTime } from "@/lib/tasks/local-dates";
import Link from "next/link";

type CalendarTaskChipProps = {
  task: CalendarTask;
  compact?: boolean;
};

export function CalendarTaskChip({ task, compact = false }: CalendarTaskChipProps) {
  const visibleLabels = compact ? task.labels.slice(0, 1) : task.labels.slice(0, 2);
  const hiddenLabelCount =
    task.labels.length -
    visibleLabels.length +
    task.unavailableLabelCount;

  return (
    <Link
      href={`/dashboard/tasks?edit=${task.id}`}
      className={`block rounded-md border border-stone-200 bg-stone-50 px-1.5 py-1 text-left transition hover:border-emerald-300 hover:bg-emerald-50/80 dark:border-stone-700 dark:bg-stone-800/80 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/30 ${
        task.completed ? "opacity-70" : ""
      }`}
    >
      <p
        className={`truncate text-[11px] font-medium leading-tight text-stone-900 dark:text-stone-100 sm:text-xs ${
          task.completed ? "line-through text-stone-400 dark:text-stone-500" : ""
        }`}
      >
        {task.title}
      </p>
      <p className="mt-0.5 truncate text-[10px] text-stone-500 dark:text-stone-400 sm:text-[11px]">
        {formatTaskTime(task.dueAt)}
      </p>
      {!compact && (task.category || task.categoryUnavailable) ? (
        <div className="mt-1 hidden overflow-hidden sm:block">
          <CategoryBadge
            category={task.category}
            unavailable={task.categoryUnavailable}
          />
        </div>
      ) : null}
      {!compact && visibleLabels.length > 0 ? (
        <div className="mt-1 hidden overflow-hidden sm:block">
          <LabelBadges labels={visibleLabels} />
        </div>
      ) : null}
      {!compact && hiddenLabelCount > 0 ? (
        <p className="mt-0.5 hidden text-[10px] text-stone-400 sm:block dark:text-stone-500">
          +{hiddenLabelCount} label{hiddenLabelCount === 1 ? "" : "s"}
        </p>
      ) : null}
    </Link>
  );
}
