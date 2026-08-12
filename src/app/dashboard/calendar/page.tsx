import { CalendarClientShell } from "@/components/calendar/calendar-client-shell";
import { DashboardHeader } from "@/components/dashboard/header";
import { fetchCalendarPageData } from "@/lib/tasks/build-calendar-tasks";
import {
  buildMonthGrid,
  buildWeekDays,
  groupCalendarTasksByDay,
  splitListCalendarTasks,
} from "@/lib/tasks/calendar";
import {
  buildCalendarNavLinks,
  buildViewSwitcherLinks,
  parseCalendarParams,
} from "@/lib/tasks/calendar-params";
import {
  getDayBounds,
  getMonthBounds,
  getWeekBounds,
} from "@/lib/tasks/local-dates";
import { createClient } from "@/lib/supabase/server";

type CalendarPageProps = {
  searchParams: Promise<{ view?: string; month?: string; date?: string }>;
};

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
  const params = await searchParams;
  const calendarParams = parseCalendarParams(params);
  const viewSwitcherLinks = buildViewSwitcherLinks(
    calendarParams.view,
    calendarParams.monthParam,
    calendarParams.dateKey,
  );
  const nav = buildCalendarNavLinks(calendarParams);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let fetchOptions:
    | { mode: "range"; start: Date; end: Date }
    | { mode: "list" };

  switch (calendarParams.view) {
    case "month": {
      const { start, end } = getMonthBounds(
        calendarParams.year,
        calendarParams.month,
      );
      fetchOptions = { mode: "range", start, end };
      break;
    }
    case "day": {
      const { start, end } = getDayBounds(calendarParams.dateKey);
      fetchOptions = { mode: "range", start, end };
      break;
    }
    case "week": {
      const { start, end } = getWeekBounds(calendarParams.dateKey);
      fetchOptions = { mode: "range", start, end };
      break;
    }
    case "list":
      fetchOptions = { mode: "list" };
      break;
  }

  const {
    calendarTasks,
    modalTasksById,
    error,
    categoriesError,
    labelsError,
    labelCategoryLinksError,
    taskLabelsError,
    historyError,
    subtasksError,
    categories,
    labels,
    categoryIdsByLabelId,
    currentUserId,
  } = await fetchCalendarPageData(supabase, fetchOptions);

  const tasksByDay = groupCalendarTasksByDay(calendarTasks);
  const listGroups =
    calendarParams.view === "list"
      ? splitListCalendarTasks(calendarTasks)
      : { overdue: [], upcomingByDay: {}, upcomingDayKeys: [] };

  const warningMessages = [
    categoriesError ? `Could not load categories: ${categoriesError}` : null,
    labelsError ? `Could not load labels: ${labelsError}` : null,
    labelCategoryLinksError
      ? `Could not load label category links: ${labelCategoryLinksError}`
      : null,
    taskLabelsError ? `Could not load task labels: ${taskLabelsError}` : null,
    historyError ? `Could not load due date history: ${historyError}` : null,
    subtasksError ? `Could not load subtasks: ${subtasksError}` : null,
  ].filter((message): message is string => Boolean(message));

  const monthEmpty =
    !error &&
    calendarParams.view === "month" &&
    calendarTasks.length === 0;

  return (
    <>
      <DashboardHeader
        title="Calendar"
        description="Due dates at a glance"
        email={user?.email}
      />
      <div className="flex-1 space-y-4 overflow-auto p-4 sm:p-6 lg:p-8">
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            Could not load tasks: {error}
          </div>
        ) : null}

        {warningMessages.length > 0 ? (
          <div className="space-y-2">
            {warningMessages.map((message) => (
              <div
                key={message}
                className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300"
              >
                {message}
              </div>
            ))}
          </div>
        ) : null}

        {!error ? (
          <div className="mx-auto max-w-6xl space-y-3">
            <CalendarClientShell
              view={calendarParams.view}
              viewSwitcherLinks={viewSwitcherLinks}
              nav={nav}
              monthDays={buildMonthGrid(
                calendarParams.year,
                calendarParams.month,
              )}
              weekDays={buildWeekDays(calendarParams.dateKey)}
              dateKey={calendarParams.dateKey}
              tasksByDay={tasksByDay}
              listOverdue={listGroups.overdue}
              listUpcomingByDay={listGroups.upcomingByDay}
              listUpcomingDayKeys={listGroups.upcomingDayKeys}
              modalTasksById={modalTasksById}
              categories={categories}
              labels={labels}
              categoryIdsByLabelId={categoryIdsByLabelId}
              currentUserId={currentUserId ?? user?.id ?? ""}
            />

            {monthEmpty ? (
              <p className="text-center text-sm text-stone-500 dark:text-stone-400">
                No tasks with due dates this month.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </>
  );
}
