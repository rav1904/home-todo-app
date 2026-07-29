"use client";

import { CalendarTaskModal } from "@/components/calendar/calendar-task-modal";
import { MonthCalendar } from "@/components/calendar/month-calendar";
import type { Category } from "@/lib/categories/types";
import type { Label } from "@/lib/labels/types";
import type { CalendarDayCell, CalendarModalTask, CalendarTask } from "@/lib/tasks/calendar";
import { useEffect, useState } from "react";

type CalendarClientShellProps = {
  monthLabel: string;
  prevMonthHref: string;
  nextMonthHref: string;
  todayHref: string;
  days: CalendarDayCell[];
  tasksByDay: Record<string, CalendarTask[]>;
  modalTasksById: Record<string, CalendarModalTask>;
  categories: Category[];
  labels: Label[];
};

export function CalendarClientShell({
  monthLabel,
  prevMonthHref,
  nextMonthHref,
  todayHref,
  days,
  tasksByDay,
  modalTasksById,
  categories,
  labels,
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
      <MonthCalendar
        monthLabel={monthLabel}
        prevMonthHref={prevMonthHref}
        nextMonthHref={nextMonthHref}
        todayHref={todayHref}
        days={days}
        tasksByDay={tasksByDay}
        onTaskSelect={setSelectedTaskId}
      />

      {selectedTask ? (
        <CalendarTaskModal
          task={selectedTask}
          categories={categories}
          labels={labels}
          onClose={() => setSelectedTaskId(null)}
        />
      ) : null}
    </>
  );
}
