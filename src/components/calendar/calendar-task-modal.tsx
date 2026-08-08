"use client";

import { TaskListItem } from "@/components/tasks/task-list-item";
import type { Category } from "@/lib/categories/types";
import type { Label } from "@/lib/labels/types";
import type { CalendarModalTask } from "@/lib/tasks/calendar";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";

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
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/45 p-3 sm:items-center sm:p-4 dark:bg-black/55"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={task.title}
        className="max-h-[min(92vh,720px)] w-full max-w-lg overflow-y-auto rounded-2xl border border-stone-200/80 bg-white shadow-xl dark:border-stone-700/80 dark:bg-stone-900"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-stone-200/80 bg-white/95 px-3 py-2.5 backdrop-blur-sm dark:border-stone-700/80 dark:bg-stone-900/95">
          <p className="truncate text-sm font-medium text-stone-500 dark:text-stone-400">
            Task
          </p>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close task"
            className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-stone-500 transition hover:bg-stone-100 hover:text-stone-900 dark:hover:bg-stone-800 dark:hover:text-stone-100"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="p-3 sm:p-4">
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
    </div>
  );
}
