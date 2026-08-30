"use client";

import { LoadingButton } from "@/components/ui/loading-button";
import { SignOutButton } from "@/components/dashboard/sign-out-button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { submitAccessRequest } from "@/lib/access/mutations";
import {
  fieldClassName,
  formErrorClassName,
  formLabelClassName,
  formPrimaryButtonClassName,
} from "@/lib/ui/field-classes";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type AccessRequestFormProps = {
  displayName: string;
  email: string;
  alreadySubmitted: boolean;
};

export function AccessRequestForm({
  displayName,
  email,
  alreadySubmitted,
}: AccessRequestFormProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(alreadySubmitted);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submittingRef = useRef(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submittingRef.current || loading) {
      return;
    }

    submittingRef.current = true;
    setLoading(true);
    setError(null);

    const { error: submitError } = await submitAccessRequest(
      message.trim() || null,
    );

    if (submitError) {
      setError(submitError.message);
      setLoading(false);
      submittingRef.current = false;
      return;
    }

    setSubmitted(true);
    setLoading(false);
    submittingRef.current = false;
    router.refresh();
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-lg font-semibold text-white">
          H
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">
          Request access
        </h1>
        <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
          Thanks for your interest in the app. We'll review your request soon.
        </p>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-700 dark:bg-stone-900">
        {submitted ? (
          <p className="text-sm leading-relaxed text-stone-700 dark:text-stone-300">
            Access request submitted. We&apos;ll review it soon.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <p className={formLabelClassName}>Name</p>
              <p className="text-sm font-medium text-stone-900 dark:text-stone-100">
                {displayName}
              </p>
            </div>
            <div>
              <p className={formLabelClassName}>Email</p>
              <p className="text-sm font-medium text-stone-900 dark:text-stone-100">
                {email}
              </p>
            </div>
            <div>
              <label htmlFor="access-message" className={formLabelClassName}>
                Message (optional)
              </label>
              <textarea
                id="access-message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                maxLength={1000}
                rows={4}
                className={fieldClassName}
                placeholder="Anything we should know?"
              />
            </div>

            {error ? <p className={formErrorClassName}>{error}</p> : null}

            <LoadingButton
              type="submit"
              loading={loading}
              idleLabel="Submit request"
              loadingLabel="Submitting…"
              minLabelWidthClassName="min-w-[9rem]"
              className={`${formPrimaryButtonClassName} w-full`}
            />
          </form>
        )}
      </div>

      <div className="mt-6 flex items-center justify-center gap-3">
        <ThemeToggle />
        <SignOutButton />
      </div>
    </div>
  );
}
