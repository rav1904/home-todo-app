"use client";

import { Spinner } from "@/components/ui/spinner";
import {
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";

type LoadingButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  /** Shown while idle when provided; otherwise `children` is used. */
  idleLabel?: ReactNode;
  /** Shown while loading; falls back to idleLabel/children. */
  loadingLabel?: ReactNode;
  /** Keep a stable min width so the button does not jump on mobile. */
  minLabelWidthClassName?: string;
  showSpinner?: boolean;
};

export function LoadingButton({
  loading = false,
  idleLabel,
  loadingLabel,
  minLabelWidthClassName,
  showSpinner = true,
  children,
  className = "",
  disabled,
  type = "button",
  ...props
}: LoadingButtonProps) {
  const label = loading
    ? (loadingLabel ?? idleLabel ?? children)
    : (idleLabel ?? children);

  return (
    <button
      type={type}
      {...props}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={className}
    >
      <span
        className={`inline-flex min-w-0 items-center justify-center gap-3 ${
          minLabelWidthClassName ?? ""
        }`}
      >
        {loading && showSpinner ? (
          <Spinner className="h-4 w-4 shrink-0" />
        ) : null}
        {label}
      </span>
    </button>
  );
}
