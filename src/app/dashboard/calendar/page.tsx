import { CalendarClientShell } from "@/components/calendar/calendar-client-shell";
import { DashboardHeader } from "@/components/dashboard/header";
import { fetchCalendarPageData } from "@/lib/tasks/build-calendar-tasks";
import { buildMonthGrid, groupCalendarTasksByDay } from "@/lib/tasks/calendar";
import {
  formatMonthLabel,
  formatMonthParam,
  getMonthBounds,
  parseMonthParam,
  shiftMonth,
} from "@/lib/tasks/local-dates";
import { createClient } from "@/lib/supabase/server";

type CalendarPageProps = {
  searchParams: Promise<{ view?: string; month?: string; date?: string }>;
};

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
  const params = await searchParams;
  const { year, month } = parseMonthParam(params.month);
  const { start, end } = getMonthBounds(year, month);
  const previousMonth = shiftMonth(year, month, -1);
  const nextMonth = shiftMonth(year, month, 1);
  const todayMonthParam = formatMonthParam(
    new Date().getFullYear(),
    new Date().getMonth(),
  );

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const {
    calendarTasks,
    modalTasksById,
    error,
    categoriesError,
    labelsError,
    taskLabelsError,
    historyError,
    categories,
    labels,
  } = await fetchCalendarPageData(supabase, { start, end });

  const days = buildMonthGrid(year, month);
  const tasksByDay = groupCalendarTasksByDay(calendarTasks);

  return (
    <>
      <DashboardHeader
        title="Calendar"
        description="Tasks grouped by due date"
        email={user?.email}
      />
      <div className="flex-1 space-y-6 overflow-auto p-4 sm:p-8">
        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            Could not load tasks: {error}
          </div>
        ) : null}

        {categoriesError ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
            Could not load categories: {categoriesError}
          </div>
        ) : null}

        {labelsError ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
            Could not load labels: {labelsError}
          </div>
        ) : null}

        {taskLabelsError ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
            Could not load task labels: {taskLabelsError}
          </div>
        ) : null}

        {historyError ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
            Could not load due date history: {historyError}
          </div>
        ) : null}

        {!error ? (
          <CalendarClientShell
            monthLabel={formatMonthLabel(year, month)}
            prevMonthHref={`/dashboard/calendar?month=${formatMonthParam(previousMonth.year, previousMonth.month)}`}
            nextMonthHref={`/dashboard/calendar?month=${formatMonthParam(nextMonth.year, nextMonth.month)}`}
            todayHref={`/dashboard/calendar?month=${todayMonthParam}`}
            days={days}
            tasksByDay={tasksByDay}
            modalTasksById={modalTasksById}
            categories={categories}
            labels={labels}
          />
        ) : null}

        {!error && calendarTasks.length === 0 ? (
          <p className="text-sm text-stone-500 dark:text-stone-400">
            No tasks with due dates in {formatMonthLabel(year, month)}.
          </p>
        ) : null}
      </div>
    </>
  );
}
