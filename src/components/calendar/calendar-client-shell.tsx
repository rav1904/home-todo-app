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
import type {
  CalendarNavLinks,
  CalendarView,
} from "@/lib/tasks/calendar-params";
import { useEffect, useState } from "react";

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
  tasksByDay: Record<string, CalendarTask[]>;
  listOverdue: CalendarTask[];
  listUpcomingByDay: Record<string, CalendarTask[]>;
  listUpcomingDayKeys: string[];
  modalTasksById: Record<string, CalendarModalTask>;
  categories: Category[];
  labels: Label[];
  categoryIdsByLabelId: Record<string, string[]>;
};

export function CalendarClientShell({
  view,
  viewSwitcherLinks,
  nav,
  monthDays,
  weekDays,
  dateKey,
  tasksByDay,
  listOverdue,
  listUpcomingByDay,
  listUpcomingDayKeys,
  modalTasksById,
  categories,
  labels,
  categoryIdsByLabelId,
}: CalendarClientShellProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const selectedTask = selectedTaskId ? modalTasksById[selectedTaskId] : null;

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
          overdue={listOverdue}
          upcomingByDay={listUpcomingByDay}
          upcomingDayKeys={listUpcomingDayKeys}
          onTaskSelect={setSelectedTaskId}
        />
      ) : null}

      {selectedTask ? (
        <CalendarTaskModal
          task={selectedTask}
          categories={categories}
          labels={labels}
          categoryIdsByLabelId={categoryIdsByLabelId}
          onClose={() => setSelectedTaskId(null)}
        />
      ) : null}
    </>
  );
}
