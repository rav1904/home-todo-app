"use client";

import { DueDatetimeFields } from "@/components/tasks/due-datetime-fields";
import {
  REMINDER_OFFSET_OPTIONS,
  reminderFormFromSelectValue,
  reminderSelectValueFromForm,
  type ReminderFormState,
  type ReminderSelectValue,
} from "@/lib/tasks/reminder";
import { fieldClassName } from "@/lib/ui/field-classes";

type ReminderFieldsProps = {
  id: string;
  dueLocal: string;
  value: ReminderFormState;
  onChange: (value: ReminderFormState) => void;
  labelClassName?: string;
};

export function ReminderFields({
  id,
  dueLocal,
  value,
  onChange,
  labelClassName = "mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300",
}: ReminderFieldsProps) {
  const hasDueDate = Boolean(dueLocal);
  const selectValue = reminderSelectValueFromForm(value);

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor={id} className={labelClassName}>
          Reminder{" "}
          <span className="font-normal text-stone-400 dark:text-stone-500">
            (optional)
          </span>
        </label>
        <select
          id={id}
          value={selectValue}
          onChange={(event) => {
            const next = event.target.value as ReminderSelectValue;
            onChange(reminderFormFromSelectValue(next, value));
          }}
          className={fieldClassName}
        >
          <option value="none">No reminder</option>
          <option value="custom">Custom date/time</option>
          {REMINDER_OFFSET_OPTIONS.map((option) => (
            <option
              key={option.minutes}
              value={String(option.minutes)}
              disabled={!hasDueDate}
            >
              {option.label}
            </option>
          ))}
        </select>
        {!hasDueDate ? (
          <p className="mt-1.5 text-xs text-stone-500 dark:text-stone-400">
            Select a due date to use reminders before the due date. Custom
            reminders are always available.
          </p>
        ) : null}
      </div>

      {value.mode === "custom" ? (
        <DueDatetimeFields
          id={`${id}-custom`}
          label="Custom reminder time"
          value={value.customLocal}
          onChange={(customLocal) =>
            onChange({
              ...value,
              mode: "custom",
              offsetMinutes: null,
              customLocal,
            })
          }
          labelClassName={labelClassName}
        />
      ) : null}
    </div>
  );
}
