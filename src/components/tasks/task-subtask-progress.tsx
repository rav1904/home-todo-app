import type { SubtaskProgress } from "@/lib/tasks/subtasks/progress";

type TaskSubtaskProgressProps = {
  progress: SubtaskProgress;
  compact?: boolean;
};

export function TaskSubtaskProgress({
  progress,
  compact = false,
}: TaskSubtaskProgressProps) {
  return (
    <div className={compact ? "mt-2" : "mt-3"}>
      <div className="mb-1 flex items-center justify-between gap-2 text-xs text-stone-500 dark:text-stone-400">
        <span>Checklist</span>
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
          className="h-full rounded-full bg-emerald-500 transition-all dark:bg-emerald-400"
          style={{ width: `${progress.percent}%` }}
        />
      </div>
    </div>
  );
}
