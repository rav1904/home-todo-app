"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useId, useRef, useState } from "react";

const themes = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
] as const;

const iconButtonClassName =
  "inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-stone-500 transition hover:bg-stone-100 hover:text-stone-800 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100";

export function ThemeMenu() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (!mounted) {
    return (
      <div
        className="h-9 w-9 rounded-lg bg-stone-100 dark:bg-stone-800"
        aria-hidden="true"
      />
    );
  }

  const activeTheme =
    themes.find((item) => item.value === theme) ?? themes[0];
  const ActiveIcon = activeTheme.icon;

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={`Theme: ${activeTheme.label}. Choose theme`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        title={`Theme: ${activeTheme.label}`}
        className={iconButtonClassName}
      >
        <ActiveIcon className="h-4 w-4" aria-hidden="true" />
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Theme options"
          className="absolute right-0 top-full z-50 mt-1 flex gap-0.5 rounded-xl border border-stone-200 bg-white p-1 shadow-lg dark:border-stone-700 dark:bg-stone-900"
        >
          {themes.map(({ value, label, icon: Icon }) => {
            const isActive = theme === value;

            return (
              <button
                key={value}
                type="button"
                role="menuitemradio"
                aria-checked={isActive}
                aria-label={label}
                title={label}
                onClick={() => {
                  setTheme(value);
                  setOpen(false);
                }}
                className={`${iconButtonClassName} ${
                  isActive
                    ? "bg-stone-100 text-stone-900 dark:bg-stone-800 dark:text-stone-100"
                    : ""
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
