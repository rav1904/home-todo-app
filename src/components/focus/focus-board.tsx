"use client";

import { FocusTowerAccordions } from "@/components/focus/focus-attention-stack";
import type { FocusBoardColumn } from "@/lib/tasks/focus-board";
import {
  buildFocusTowerSections,
  type FocusTaskLike,
} from "@/lib/tasks/focus";
import type { ReactNode } from "react";

type FocusBoardTask = FocusTaskLike & { id: string };

type FocusBoardProps<T extends FocusBoardTask> = {
  columns: FocusBoardColumn<T>[];
  renderCard: (task: T) => ReactNode;
};

export function focusTowerDomId(columnId: string) {
  return `focus-tower-${columnId}`;
}

export function FocusBoard<T extends FocusBoardTask>({
  columns,
  renderCard,
}: FocusBoardProps<T>) {
  const singleTower = columns.length === 1;

  return (
    <div
      className={
        singleTower
          ? "grid w-full min-w-0 max-w-xl grid-cols-1 items-start"
          : "grid w-full min-w-0 grid-cols-[repeat(auto-fill,minmax(min(100%,17.5rem),20rem))] items-start gap-3"
      }
    >
      {columns.map((column) => (
        <BoardColumn key={column.id} column={column} renderCard={renderCard} />
      ))}
    </div>
  );
}

function BoardColumn<T extends FocusBoardTask>({
  column,
  renderCard,
}: {
  column: FocusBoardColumn<T>;
  renderCard: (task: T) => ReactNode;
}) {
  const sections = buildFocusTowerSections(column.tasks);
  const taskLabel =
    column.tasks.length === 1 ? "1 task" : `${column.tasks.length} tasks`;

  return (
    <section
      id={focusTowerDomId(column.id)}
      className="flex min-w-0 scroll-mt-3 flex-col rounded-xl bg-stone-100/90 dark:bg-stone-900/70"
    >
      <header className="px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={
              column.colour
                ? { backgroundColor: column.colour }
                : { visibility: "hidden" }
            }
            aria-hidden
          />
          <h3 className="truncate text-sm font-semibold text-stone-800 dark:text-stone-100">
            {column.title}
          </h3>
        </div>
        <p className="mt-0.5 pl-4 text-xs tabular-nums text-stone-400 dark:text-stone-500">
          {taskLabel}
        </p>
      </header>
      <div className="px-2 pb-2">
        <FocusTowerAccordions
          towerId={column.id}
          sections={[
            {
              id: "overdue",
              title: "Overdue",
              count: sections.overdue.length,
              tone: "danger",
              tasks: sections.overdue.map((task) => (
                <div key={task.id}>{renderCard(task)}</div>
              )),
            },
            {
              id: "dueToday",
              title: "Due Today",
              count: sections.dueToday.length,
              tone: "warning",
              tasks: sections.dueToday.map((task) => (
                <div key={task.id}>{renderCard(task)}</div>
              )),
            },
            {
              id: "reminders",
              title: "Reminders",
              count: sections.remindersDue.length,
              tone: "warning",
              tasks: sections.remindersDue.map((task) => (
                <div key={task.id}>{renderCard(task)}</div>
              )),
            },
            {
              id: "upNext",
              title: "Up Next",
              count: sections.upNext.length,
              tasks: sections.upNext.map((task) => (
                <div key={task.id}>{renderCard(task)}</div>
              )),
            },
          ]}
        />
      </div>
    </section>
  );
}
