"use client";

import { CalendarTaskModal } from "@/components/calendar/calendar-task-modal";
import { CalendarViewSwitcher } from "@/components/calendar/calendar-view-switcher";
import { DayCalendar } from "@/components/calendar/day-calendar";
import { ListCalendar } from "@/components/calendar/list-calendar";
import { MonthCalendar } from "@/components/calendar/month-calendar";
import { WeekCalendar } from "@/components/calendar/week-calendar";
import type { Category } from "@/lib/categories/types";
import type { Label } from "@/lib/labels/types";
import type {
  CalendarDayCell,
  CalendarModalTask,
  CalendarTask,
} from "@/lib/tasks/calendar";
import {
  groupCalendarTasksByDay,
  splitListCalendarTasks,
} from "@/lib/tasks/calendar";
import type {
  CalendarNavLinks,
  CalendarView,
} from "@/lib/tasks/calendar-params";
import { useEffect, useMemo, useState } from "react";

type ViewSwitcherLink = {
  view: CalendarView;
  href: string;
  isActive: boolean;
};

type CalendarClientShellProps = {
  view: CalendarView;
  viewSwitcherLinks: ViewSwitcherLink[];
  nav: CalendarNavLinks;
  monthDays: CalendarDayCell[];
  weekDays: CalendarDayCell[];
  dateKey: string;
  calendarTasks: CalendarTask[];
  modalTasksById: Record<string, CalendarModalTask>;
  categories: Category[];
  labels: Label[];
  categoryIdsByLabelId: Record<string, string[]>;
  currentUserId: string;
};

export function CalendarClientShell({
  view,
  viewSwitcherLinks,
  nav,
  monthDays,
  weekDays,
  dateKey,
  calendarTasks,
  modalTasksById,
  categories,
  labels,
  categoryIdsByLabelId,
  currentUserId,
}: CalendarClientShellProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const selectedTask = selectedTaskId ? modalTasksById[selectedTaskId] : null;

  // Group in the browser so date-only dues use the user's local calendar day.
  const tasksByDay = useMemo(
    () => groupCalendarTasksByDay(calendarTasks),
    [calendarTasks],
  );
  const listGroups = useMemo(
    () =>
      view === "list"
        ? splitListCalendarTasks(calendarTasks)
        : { overdue: [], upcomingByDay: {}, upcomingDayKeys: [] },
    [calendarTasks, view],
  );

  useEffect(() => {
    if (selectedTaskId && !modalTasksById[selectedTaskId]) {
      setSelectedTaskId(null);
    }
  }, [modalTasksById, selectedTaskId]);

  return (
    <>
      <CalendarViewSwitcher links={viewSwitcherLinks} />

      {view === "month" ? (
        <MonthCalendar
          nav={nav}
          days={monthDays}
          tasksByDay={tasksByDay}
          onTaskSelect={setSelectedTaskId}
        />
      ) : null}

      {view === "week" ? (
        <WeekCalendar
          nav={nav}
          days={weekDays}
          tasksByDay={tasksByDay}
          onTaskSelect={setSelectedTaskId}
        />
      ) : null}

      {view === "day" ? (
        <DayCalendar
          nav={nav}
          tasks={tasksByDay[dateKey] ?? []}
          onTaskSelect={setSelectedTaskId}
        />
      ) : null}

      {view === "list" ? (
        <ListCalendar
          nav={nav}
          overdue={listGroups.overdue}
          upcomingByDay={listGroups.upcomingByDay}
          upcomingDayKeys={listGroups.upcomingDayKeys}
          onTaskSelect={setSelectedTaskId}
        />
      ) : null}

      {selectedTask ? (
        <CalendarTaskModal
          task={selectedTask}
          categories={categories}
          labels={labels}
          categoryIdsByLabelId={categoryIdsByLabelId}
          currentUserId={currentUserId}
          onClose={() => setSelectedTaskId(null)}
        />
      ) : null}
    </>
  );
}
