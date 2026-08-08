import type { SubtaskProgress } from "@/lib/tasks/subtasks/progress";
import { ChevronDown, ChevronRight } from "lucide-react";

type TaskSubtaskProgressProps = {
  progress: SubtaskProgress;
  compact?: boolean;
  /** When set, renders as a toggle control for expanding the checklist. */
  expanded?: boolean;
  onToggle?: () => void;
};

export function TaskSubtaskProgress({
  progress,
  compact = false,
  expanded,
  onToggle,
}: TaskSubtaskProgressProps) {
  const interactive = typeof onToggle === "function";
  const body = (
    <>
      <div className="mb-1 flex items-center justify-between gap-2 text-xs text-stone-500 dark:text-stone-400">
        <span className="inline-flex items-center gap-1">
          {interactive ? (
            expanded ? (
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            )
          ) : null}
          Checklist
        </span>
        <span className="font-medium text-stone-600 dark:text-stone-300">
          {progress.completedCount}/{progress.totalCount}
        </span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700"
        role="progressbar"
        aria-valuenow={progress.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${progress.completedCount} of ${progress.totalCount} subtasks completed`}
      >
        <div
          className="h-full rounded-full bg-accent-muted0 transition-all dark:bg-success"
          style={{ width: `${progress.percent}%` }}
        />
      </div>
    </>
  );

  if (interactive) {
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className={`w-full cursor-pointer rounded-lg text-left transition hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 dark:hover:bg-stone-800/60 ${
          compact ? "mt-2 p-1.5" : "mt-3 p-2"
        }`}
      >
        {body}
      </button>
    );
  }

  return <div className={compact ? "mt-2" : "mt-3"}>{body}</div>;
}
