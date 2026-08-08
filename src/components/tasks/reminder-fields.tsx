"use client";

import { DueDatetimeFields } from "@/components/tasks/due-datetime-fields";
import {
  REMINDER_OFFSET_OPTIONS,
  reminderFormFromSelectValue,
  reminderSelectValueFromForm,
  type ReminderFormState,
  type ReminderSelectValue,
} from "@/lib/tasks/reminder";
import {
  compactFieldClassName,
  formLabelClassName,
} from "@/lib/ui/field-classes";

type ReminderFieldsProps = {
  id: string;
  dueLocal: string;
  value: ReminderFormState;
  onChange: (value: ReminderFormState) => void;
  labelClassName?: string;
  className?: string;
};

export function ReminderFields({
  id,
  dueLocal,
  value,
  onChange,
  labelClassName = formLabelClassName,
  className = compactFieldClassName,
}: ReminderFieldsProps) {
  const hasDueDate = Boolean(dueLocal);
  const selectValue = reminderSelectValueFromForm(value);

  return (
    <div className="space-y-2">
      <div>
        <label htmlFor={id} className={labelClassName}>
          Reminder
          <span className="font-normal text-stone-400 dark:text-stone-500">
            {" "}
            · optional
          </span>
        </label>
        <select
          id={id}
          value={selectValue}
          onChange={(event) => {
            const next = event.target.value as ReminderSelectValue;
            onChange(reminderFormFromSelectValue(next, value));
          }}
          className={className}
        >
          <option value="none">None</option>
          <option value="custom">Custom time</option>
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
          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
            Relative reminders need a due date. Custom times always work.
          </p>
        ) : null}
      </div>

      {value.mode === "custom" ? (
        <DueDatetimeFields
          id={`${id}-custom`}
          label="Custom reminder"
          optional={false}
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
          className={className}
        />
      ) : null}
    </div>
  );
}
