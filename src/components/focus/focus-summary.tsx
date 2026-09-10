"use client";

import { buildFocusTowerSections, type FocusTaskLike } from "@/lib/tasks/focus";
import { Bell } from "lucide-react";

type FocusSummaryProps<T extends FocusTaskLike> = {
  tasks: T[];
  scopeLabel: string;
};

const CHART_SIZE = 96;
const STROKE_WIDTH = 12;
const RADIUS = (CHART_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const SLICE_COLORS = {
  overdue: "#e11d48",
  dueToday: "#d97706",
  upNext: "#78716c",
} as const;

export function FocusSummary<T extends FocusTaskLike>({
  tasks,
  scopeLabel,
}: FocusSummaryProps<T>) {
  const sections = buildFocusTowerSections(tasks);
  const overdue = sections.overdue.length;
  const dueToday = sections.dueToday.length;
  const upNext = sections.upNext.length;
  const reminders = sections.remindersDue.length;
  const pieTotal = overdue + dueToday + upNext;
  const openTotal = pieTotal + reminders;

  const slices = [
    { key: "overdue", count: overdue, color: SLICE_COLORS.overdue },
    { key: "dueToday", count: dueToday, color: SLICE_COLORS.dueToday },
    { key: "upNext", count: upNext, color: SLICE_COLORS.upNext },
  ].filter((slice) => slice.count > 0);

  const sliceArcs: {
    key: string;
    color: string;
    length: number;
    offset: number;
  }[] = [];
  let nextOffset = 0;
  for (const slice of slices) {
    const length = (slice.count / pieTotal) * CIRCUMFERENCE;
    sliceArcs.push({
      key: slice.key,
      color: slice.color,
      length,
      offset: nextOffset,
    });
    nextOffset += length;
  }

  return (
    <section
      aria-label={`Focus summary — ${scopeLabel}`}
      className="min-w-0 rounded-xl bg-white px-3 py-2.5 dark:bg-stone-900"
    >
      <h2 className="truncate text-xs font-medium text-stone-500 dark:text-stone-400">
        Focus summary — {scopeLabel}
      </h2>
      {openTotal === 0 ? (
        <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
          No active tasks for this filter.
        </p>
      ) : null}
      <div className="mt-2 flex min-w-0 flex-wrap items-center gap-4">
        <div className="relative h-24 w-24 shrink-0">
          <svg
            viewBox={`0 0 ${CHART_SIZE} ${CHART_SIZE}`}
            className="h-24 w-24"
            aria-hidden
          >
            <circle
              cx={CHART_SIZE / 2}
              cy={CHART_SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke="currentColor"
              strokeWidth={STROKE_WIDTH}
              className="text-stone-200 dark:text-stone-700"
            />
            {sliceArcs.map((slice) => (
              <circle
                key={slice.key}
                cx={CHART_SIZE / 2}
                cy={CHART_SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke={slice.color}
                strokeWidth={STROKE_WIDTH}
                strokeDasharray={`${slice.length} ${CIRCUMFERENCE - slice.length}`}
                strokeDashoffset={-slice.offset}
                transform={`rotate(-90 ${CHART_SIZE / 2} ${CHART_SIZE / 2})`}
              />
            ))}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-sm font-semibold tabular-nums text-stone-800 dark:text-stone-100">
              {openTotal}
            </span>
            <span className="text-[10px] leading-none text-stone-400 dark:text-stone-500">
              open
            </span>
          </div>
        </div>

        {openTotal === 0 ? null : (
          <ul className="min-w-0 flex-1 space-y-1 text-xs">
            <SummaryCount
              color={SLICE_COLORS.overdue}
              label="Overdue"
              count={overdue}
            />
            <SummaryCount
              color={SLICE_COLORS.dueToday}
              label="Due Today"
              count={dueToday}
            />
            <SummaryCount
              color={SLICE_COLORS.upNext}
              label="Up Next"
              count={upNext}
            />
            <li className="flex items-center justify-between gap-3 pt-0.5 text-stone-500 dark:text-stone-400">
              <span className="inline-flex items-center gap-1.5">
                <Bell className="h-3 w-3" aria-hidden />
                Reminders:
              </span>
              <span className="font-semibold tabular-nums">{reminders}</span>
            </li>
          </ul>
        )}
      </div>
    </section>
  );
}

function SummaryCount({
  color,
  label,
  count,
}: {
  color: string;
  label: string;
  count: number;
}) {
  return (
    <li className="flex items-center justify-between gap-3 text-stone-700 dark:text-stone-200">
      <span className="inline-flex min-w-0 items-center gap-1.5">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
          aria-hidden
        />
        {label}:
      </span>
      <span className="font-semibold tabular-nums">{count}</span>
    </li>
  );
}
