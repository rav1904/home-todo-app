"use client";

import { TaskListItem } from "@/components/tasks/task-list-item";
import type { Category } from "@/lib/categories/types";
import type { Label } from "@/lib/labels/types";
import type { CalendarModalTask } from "@/lib/tasks/calendar";
import { X } from "lucide-react";
import { useEffect } from "react";

type CalendarTaskModalProps = {
  task: CalendarModalTask;
  categories: Category[];
  labels: Label[];
  categoryIdsByLabelId?: Record<string, string[]>;
  onClose: () => void;
};

export function CalendarTaskModal({
  task,
  categories,
  labels,
  categoryIdsByLabelId = {},
  onClose,
}: CalendarTaskModalProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/50 p-4 sm:items-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`calendar-task-modal-title-${task.id}`}
        className="max-h-[min(90vh,720px)] w-full max-w-lg overflow-y-auto rounded-2xl border border-stone-200 bg-white p-5 shadow-xl dark:border-stone-700 dark:bg-stone-900"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2
            id={`calendar-task-modal-title-${task.id}`}
            className="min-w-0 truncate text-lg font-semibold text-stone-900 dark:text-stone-100"
          >
            {task.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close task"
            className="cursor-pointer rounded-lg p-2 text-stone-500 transition hover:bg-stone-100 hover:text-stone-900 dark:hover:bg-stone-800 dark:hover:text-stone-100"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <TaskListItem
          key={task.id}
          id={task.id}
          title={task.title}
          description={task.description}
          dueAt={task.dueAt}
          reminderAt={task.reminderAt}
          reminderMode={task.reminderMode}
          reminderOffsetMinutes={task.reminderOffsetMinutes}
          priority={task.priority}
          recurrence={task.recurrence}
          completed={task.completed}
          createdAt={task.createdAt}
          categoryId={task.categoryId}
          category={task.category}
          categoryUnavailable={task.categoryUnavailable}
          categories={categories}
          labels={labels}
          categoryIdsByLabelId={categoryIdsByLabelId}
          labelIds={task.labelIds}
          taskLabels={task.taskLabels}
          dueDateHistory={task.dueDateHistory}
          subtasks={task.subtasks}
          embedded
          onSuccess={onClose}
          onDeleted={onClose}
        />
      </div>
    </div>
  );
}
