import type { CategoryDisplay } from "@/lib/categories/tree";
import type { TaskLabelDisplay } from "@/lib/labels/display";
import type { Label } from "@/lib/labels/types";
import type { DueDateHistoryCounts } from "@/lib/tasks/due-date-change";
import type { TaskCreatorProfile } from "@/lib/tasks/creators";
import type { TaskPriority } from "@/lib/tasks/priority";
import type { TaskRecurrence } from "@/lib/tasks/recurrence";
import type { SubtaskProgress } from "@/lib/tasks/subtasks/progress";
import type { TaskSubtask } from "@/lib/tasks/subtasks/types";
import {
  addDays,
  dueAtToCalendarDayKey,
  getWeekStartDayKey,
  isSameLocalDay,
  localDayKeyToDate,
  toLocalDayKey,
} from "@/lib/tasks/local-dates";
import { isFocusDueOverdue } from "@/lib/tasks/focus";

export type CalendarTask = {
  id: string;
  title: string;
  dueAt: string;
  completed: boolean;
  priority: TaskPriority;
  recurrence: TaskRecurrence;
  reminderAt: string | null;
  category: CategoryDisplay | null;
  categoryUnavailable: boolean;
  labels: Label[];
  unavailableLabelCount: number;
  subtaskProgress: SubtaskProgress | null;
};

export type CalendarModalTask = {
  id: string;
  title: string;
  description: string | null;
  dueAt: string;
  reminderAt: string | null;
  reminderMode: string | null;
  reminderOffsetMinutes: number | null;
  priority: TaskPriority;
  recurrence: TaskRecurrence;
  completed: boolean;
  createdAt: string;
  categoryId: string | null;
  category: CategoryDisplay | null;
  categoryUnavailable: boolean;
  labelIds: string[];
  taskLabels: TaskLabelDisplay;
  dueDateHistory: DueDateHistoryCounts;
  subtasks: TaskSubtask[];
  taskUserId: string;
  canDelete: boolean;
  creator: TaskCreatorProfile | null;
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
    const dayKey = dueAtToCalendarDayKey(task.dueAt);

    if (!grouped[dayKey]) {
      grouped[dayKey] = [];
    }

    grouped[dayKey].push(task);
  }

  for (const dayKey of Object.keys(grouped)) {
    grouped[dayKey].sort((left, right) => {
      // Date-only tasks sort before timed ones on the same day.
      const leftKey = dueAtToCalendarDayKey(left.dueAt);
      const rightKey = dueAtToCalendarDayKey(right.dueAt);
      if (leftKey !== rightKey) {
        return leftKey.localeCompare(rightKey);
      }
      return (
        new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime()
      );
    });
  }

  return grouped;
}

export function buildWeekDays(
  anchorDayKey: string,
  today = new Date(),
): CalendarDayCell[] {
  const weekStartKey = getWeekStartDayKey(anchorDayKey);
  const weekStart = localDayKeyToDate(weekStartKey);
  const cells: CalendarDayCell[] = [];

  for (let index = 0; index < 7; index += 1) {
    const date = addDays(weekStart, index);

    cells.push({
      dayKey: toLocalDayKey(date),
      date: date.toISOString(),
      dayNumber: date.getDate(),
      isCurrentMonth: true,
      isToday: isSameLocalDay(date, today),
    });
  }

  return cells;
}

export function splitListCalendarTasks(
  tasks: CalendarTask[],
  today = new Date(),
) {
  const overdue: CalendarTask[] = [];
  const upcoming: CalendarTask[] = [];

  for (const task of tasks) {
    if (isFocusDueOverdue(task.dueAt, today)) {
      overdue.push(task);
    } else {
      upcoming.push(task);
    }
  }

  overdue.sort(
    (left, right) =>
      new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime(),
  );

  upcoming.sort(
    (left, right) =>
      new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime(),
  );

  const upcomingByDay = groupCalendarTasksByDay(upcoming);
  const upcomingDayKeys = Object.keys(upcomingByDay).sort();

  return {
    overdue,
    upcomingByDay,
    upcomingDayKeys,
  };
}

export const CALENDAR_VISIBLE_TASK_LIMIT = 2;
