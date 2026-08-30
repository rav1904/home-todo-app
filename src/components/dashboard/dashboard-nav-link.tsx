"use client";

import { Spinner } from "@/components/ui/spinner";
import { useDashboardNav } from "@/components/dashboard/nav-context";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useTransition,
  type ComponentProps,
  type MouseEvent,
  type ReactNode,
} from "react";

type DashboardNavLinkProps = {
  href: string;
  children: ReactNode;
  className?: string | ((state: { isActive: boolean; isPending: boolean }) => string);
  onNavigate?: () => void;
  exact?: boolean;
  showPendingSpinner?: boolean;
} & Omit<ComponentProps<typeof Link>, "href" | "className" | "children">;

export function DashboardNavLink({
  href,
  children,
  className,
  onNavigate,
  exact = false,
  showPendingSpinner = true,
  ...props
}: DashboardNavLinkProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { setNavigationPending } = useDashboardNav();
  const [isPending, startTransition] = useTransition();

  const isActive = exact
    ? pathname === href
    : href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(href);

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    if (isActive && pathname === href) {
      onNavigate?.();
      return;
    }

    event.preventDefault();
    onNavigate?.();
    setNavigationPending(true);
    startTransition(() => {
      router.push(href);
    });
  }

  const resolvedClassName =
    typeof className === "function"
      ? className({ isActive, isPending })
      : className;

  return (
    <Link
      {...props}
      href={href}
      onClick={handleClick}
      aria-current={isActive ? "page" : undefined}
      aria-busy={isPending || undefined}
      className={resolvedClassName}
    >
      {children}
      {isPending && showPendingSpinner ? (
        <Spinner className="ml-auto h-3.5 w-3.5 shrink-0 opacity-80" />
      ) : null}
    </Link>
  );
}
