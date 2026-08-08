import { endOfLocalDay, startOfLocalDay } from "@/lib/tasks/local-dates";
import {
  comparePriorityDesc,
  parseTaskPriority,
} from "@/lib/tasks/priority";
import { isReminderDueOrOverdue } from "@/lib/tasks/reminder";

export const FOCUS_UP_NEXT_LIMIT = 5;

export type FocusTaskLike = {
  id: string;
  due_at: string | null;
  reminder_at: string | null;
  priority?: string | null;
  completed: boolean;
  created_at: string;
};

export type FocusSections<T extends FocusTaskLike> = {
  overdue: T[];
  dueToday: T[];
  remindersDue: T[];
  highUrgent: T[];
  upNext: T[];
};

export function isFocusDueOverdue(dueAt: string, now = new Date()) {
  return new Date(dueAt).getTime() < startOfLocalDay(now).getTime();
}

export function isFocusDueToday(dueAt: string, now = new Date()) {
  const due = new Date(dueAt).getTime();
  return (
    due >= startOfLocalDay(now).getTime() &&
    due <= endOfLocalDay(now).getTime()
  );
}

export function isFocusDueAfterToday(dueAt: string, now = new Date()) {
  return new Date(dueAt).getTime() > endOfLocalDay(now).getTime();
}

function compareCreatedDesc(
  left: { created_at: string },
  right: { created_at: string },
) {
  return (
    new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
  );
}

function compareDueAscNullsLast(
  left: { due_at: string | null },
  right: { due_at: string | null },
) {
  if (left.due_at === null && right.due_at === null) {
    return 0;
  }

  if (left.due_at === null) {
    return 1;
  }

  if (right.due_at === null) {
    return -1;
  }

  return new Date(left.due_at).getTime() - new Date(right.due_at).getTime();
}

function sortOverdueOrDueToday<T extends FocusTaskLike>(tasks: T[]) {
  return [...tasks].sort((left, right) => {
    const priorityDiff = comparePriorityDesc(
      parseTaskPriority(left.priority),
      parseTaskPriority(right.priority),
    );
    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    const dueDiff = compareDueAscNullsLast(left, right);
    if (dueDiff !== 0) {
      return dueDiff;
    }

    return compareCreatedDesc(left, right);
  });
}

function sortRemindersDue<T extends FocusTaskLike>(tasks: T[]) {
  return [...tasks].sort((left, right) => {
    const reminderDiff =
      new Date(left.reminder_at!).getTime() -
      new Date(right.reminder_at!).getTime();
    if (reminderDiff !== 0) {
      return reminderDiff;
    }

    const priorityDiff = comparePriorityDesc(
      parseTaskPriority(left.priority),
      parseTaskPriority(right.priority),
    );
    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    return compareCreatedDesc(left, right);
  });
}

function sortHighUrgent<T extends FocusTaskLike>(tasks: T[]) {
  return [...tasks].sort((left, right) => {
    const priorityDiff = comparePriorityDesc(
      parseTaskPriority(left.priority),
      parseTaskPriority(right.priority),
    );
    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    const dueDiff = compareDueAscNullsLast(left, right);
    if (dueDiff !== 0) {
      return dueDiff;
    }

    return compareCreatedDesc(left, right);
  });
}

function sortUpNext<T extends FocusTaskLike>(tasks: T[]) {
  return [...tasks].sort((left, right) => {
    const dueDiff = compareDueAscNullsLast(left, right);
    if (dueDiff !== 0) {
      return dueDiff;
    }

    const priorityDiff = comparePriorityDesc(
      parseTaskPriority(left.priority),
      parseTaskPriority(right.priority),
    );
    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    return compareCreatedDesc(left, right);
  });
}

/** Exclusive focus buckets for open tasks. Completed tasks are ignored. */
export function buildFocusSections<T extends FocusTaskLike>(
  tasks: T[],
  now = new Date(),
  upNextLimit = FOCUS_UP_NEXT_LIMIT,
): FocusSections<T> {
  const openTasks = tasks.filter((task) => !task.completed);
  const claimed = new Set<string>();

  const overdue: T[] = [];
  const dueToday: T[] = [];
  const remindersDue: T[] = [];
  const highUrgent: T[] = [];
  const upNextCandidates: T[] = [];

  for (const task of openTasks) {
    if (task.due_at && isFocusDueOverdue(task.due_at, now)) {
      overdue.push(task);
      claimed.add(task.id);
    }
  }

  for (const task of openTasks) {
    if (claimed.has(task.id)) {
      continue;
    }

    if (task.due_at && isFocusDueToday(task.due_at, now)) {
      dueToday.push(task);
      claimed.add(task.id);
    }
  }

  for (const task of openTasks) {
    if (claimed.has(task.id)) {
      continue;
    }

    if (
      task.reminder_at &&
      isReminderDueOrOverdue(task.reminder_at, now)
    ) {
      remindersDue.push(task);
      claimed.add(task.id);
    }
  }

  for (const task of openTasks) {
    if (claimed.has(task.id)) {
      continue;
    }

    const priority = parseTaskPriority(task.priority);
    if (priority === "high" || priority === "urgent") {
      highUrgent.push(task);
      claimed.add(task.id);
    }
  }

  for (const task of openTasks) {
    if (claimed.has(task.id)) {
      continue;
    }

    if (task.due_at && isFocusDueAfterToday(task.due_at, now)) {
      upNextCandidates.push(task);
    }
  }

  return {
    overdue: sortOverdueOrDueToday(overdue),
    dueToday: sortOverdueOrDueToday(dueToday),
    remindersDue: sortRemindersDue(remindersDue),
    highUrgent: sortHighUrgent(highUrgent),
    upNext: sortUpNext(upNextCandidates).slice(0, upNextLimit),
  };
}

export function focusSectionsAreEmpty<T extends FocusTaskLike>(
  sections: FocusSections<T>,
) {
  return (
    sections.overdue.length === 0 &&
    sections.dueToday.length === 0 &&
    sections.remindersDue.length === 0 &&
    sections.highUrgent.length === 0 &&
    sections.upNext.length === 0
  );
}
