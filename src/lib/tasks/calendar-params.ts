import {
  formatDateParam,
  formatMonthLabel,
  formatMonthParam,
  formatWeekLabel,
  formatDayLabel,
  getWeekStartDayKey,
  isSameLocalDay,
  localDayKeyToDate,
  parseDateParam,
  parseMonthParam,
  shiftDayKey,
  shiftMonth,
  toLocalDayKey,
} from "@/lib/tasks/local-dates";

export type CalendarView = "month" | "week" | "day" | "list";

export type CalendarParams = {
  view: CalendarView;
  monthParam: string;
  dateKey: string;
  year: number;
  month: number;
};

export type CalendarNavLinks = {
  prevHref: string | null;
  nextHref: string | null;
  todayHref: string | null;
  title: string;
};

const VALID_VIEWS = new Set<CalendarView>(["month", "week", "day", "list"]);

export function parseCalendarParams(
  searchParams: {
    view?: string;
    month?: string;
    date?: string;
  },
  now = new Date(),
): CalendarParams {
  let view: CalendarView = "month";

  if (
    searchParams.view &&
    VALID_VIEWS.has(searchParams.view as CalendarView)
  ) {
    view = searchParams.view as CalendarView;
  }

  const { year, month } = parseMonthParam(searchParams.month, now);
  const monthParam = formatMonthParam(year, month);
  const dateKey = parseDateParam(searchParams.date, now);

  return {
    view,
    monthParam,
    dateKey,
    year,
    month,
  };
}

export function buildCalendarHref(options: {
  view: CalendarView;
  month?: string;
  date?: string;
}) {
  const params = new URLSearchParams();
  params.set("view", options.view);

  if (options.view === "month" && options.month) {
    params.set("month", options.month);
  }

  if ((options.view === "week" || options.view === "day") && options.date) {
    params.set("date", options.date);
  }

  return `/dashboard/calendar?${params.toString()}`;
}

function getViewAnchorDateKey(
  view: CalendarView,
  monthParam: string,
  dateKey: string,
  now = new Date(),
) {
  if (view === "month") {
    const { year, month } = parseMonthParam(monthParam, now);
    const todayKey = toLocalDayKey(now);
    const todayDate = localDayKeyToDate(todayKey);

    if (todayDate.getFullYear() === year && todayDate.getMonth() === month) {
      return todayKey;
    }

    return formatDateParam(new Date(year, month, 1));
  }

  return dateKey;
}

export function buildViewSwitcherLinks(
  currentView: CalendarView,
  monthParam: string,
  dateKey: string,
  now = new Date(),
) {
  const anchorDateKey = getViewAnchorDateKey(
    currentView,
    monthParam,
    dateKey,
    now,
  );
  const anchorMonthParam = formatMonthParam(
    localDayKeyToDate(anchorDateKey).getFullYear(),
    localDayKeyToDate(anchorDateKey).getMonth(),
  );

  return (["month", "week", "day", "list"] as const).map((view) => ({
    view,
    href: buildCalendarHref({
      view,
      month: view === "month" ? anchorMonthParam : undefined,
      date: view === "week" || view === "day" ? anchorDateKey : undefined,
    }),
    isActive: view === currentView,
  }));
}

export function buildCalendarNavLinks(
  params: CalendarParams,
  now = new Date(),
): CalendarNavLinks {
  const todayKey = toLocalDayKey(now);

  switch (params.view) {
    case "month": {
      const previous = shiftMonth(params.year, params.month, -1);
      const next = shiftMonth(params.year, params.month, 1);

      return {
        title: formatMonthLabel(params.year, params.month),
        prevHref: buildCalendarHref({
          view: "month",
          month: formatMonthParam(previous.year, previous.month),
        }),
        nextHref: buildCalendarHref({
          view: "month",
          month: formatMonthParam(next.year, next.month),
        }),
        todayHref: buildCalendarHref({
          view: "month",
          month: formatMonthParam(now.getFullYear(), now.getMonth()),
        }),
      };
    }
    case "week": {
      const weekStartKey = getWeekStartDayKey(params.dateKey);

      return {
        title: formatWeekLabel(weekStartKey),
        prevHref: buildCalendarHref({
          view: "week",
          date: shiftDayKey(params.dateKey, -7),
        }),
        nextHref: buildCalendarHref({
          view: "week",
          date: shiftDayKey(params.dateKey, 7),
        }),
        todayHref: buildCalendarHref({
          view: "week",
          date: todayKey,
        }),
      };
    }
    case "day":
      return {
        title: formatDayLabel(params.dateKey),
        prevHref: buildCalendarHref({
          view: "day",
          date: shiftDayKey(params.dateKey, -1),
        }),
        nextHref: buildCalendarHref({
          view: "day",
          date: shiftDayKey(params.dateKey, 1),
        }),
        todayHref: buildCalendarHref({
          view: "day",
          date: todayKey,
        }),
      };
    case "list":
      return {
        title: "Upcoming tasks",
        prevHref: null,
        nextHref: null,
        todayHref: null,
      };
  }
}

export function isTodayDayKey(dayKey: string, now = new Date()) {
  return isSameLocalDay(localDayKeyToDate(dayKey), now);
}
