import type { CategoryDisplay } from "@/lib/categories/tree";
import type { Label } from "@/lib/labels/types";
import {
  addDays,
  isSameLocalDay,
  toLocalDayKey,
} from "@/lib/tasks/local-dates";

export type CalendarTask = {
  id: string;
  title: string;
  dueAt: string;
  completed: boolean;
  category: CategoryDisplay | null;
  categoryUnavailable: boolean;
  labels: Label[];
  unavailableLabelCount: number;
};

export type CalendarDayCell = {
  dayKey: string;
  date: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
};

export function buildMonthGrid(
  year: number,
  month: number,
  today = new Date(),
): CalendarDayCell[] {
  const firstOfMonth = new Date(year, month, 1);
  const mondayBasedOffset = (firstOfMonth.getDay() + 6) % 7;
  const gridStart = addDays(firstOfMonth, -mondayBasedOffset);
  const cells: CalendarDayCell[] = [];

  for (let index = 0; index < 42; index += 1) {
    const date = addDays(gridStart, index);

    cells.push({
      dayKey: toLocalDayKey(date),
      date: date.toISOString(),
      dayNumber: date.getDate(),
      isCurrentMonth: date.getMonth() === month,
      isToday: isSameLocalDay(date, today),
    });
  }

  return cells;
}

export function groupCalendarTasksByDay(tasks: CalendarTask[]) {
  const grouped: Record<string, CalendarTask[]> = {};

  for (const task of tasks) {
    const dayKey = toLocalDayKey(task.dueAt);

    if (!grouped[dayKey]) {
      grouped[dayKey] = [];
    }

    grouped[dayKey].push(task);
  }

  for (const dayKey of Object.keys(grouped)) {
    grouped[dayKey].sort(
      (left, right) =>
        new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime(),
    );
  }

  return grouped;
}

export const CALENDAR_VISIBLE_TASK_LIMIT = 2;
