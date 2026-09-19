"use client";

import { useTaskCompleteAction } from "@/components/tasks/task-complete-toast";
import { Check, CircleCheck } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

const AXIS_LOCK_PX = 12;
const THRESHOLD_RATIO = 0.36;
const MIN_THRESHOLD_PX = 72;
const MAX_REVEAL_RATIO = 0.85;

type Axis = "x" | "y" | null;

type SwipeToCompleteProps = {
  enabled: boolean;
  taskId: string;
  children: ReactNode;
  className?: string;
  surfaceClassName?: string;
};

function isFinePointer(pointerType: string) {
  return pointerType === "mouse";
}

export function SwipeToComplete({
  enabled,
  taskId,
  children,
  className = "",
  surfaceClassName = "bg-stone-50 dark:bg-stone-950",
}: SwipeToCompleteProps) {
  const { completeTask } = useTaskCompleteAction();
  const rootRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const axisRef = useRef<Axis>(null);
  const offsetRef = useRef(0);
  const trackingRef = useRef(false);
  const suppressClickRef = useRef(false);
  const completingRef = useRef(false);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [armed, setArmed] = useState(false);

  const snapTo = useCallback((value: number, animate: boolean) => {
    offsetRef.current = value;
    setDragging(!animate);
    setOffset(value);
    setArmed(false);
  }, []);

  const thresholdFor = useCallback((width: number) => {
    return Math.max(MIN_THRESHOLD_PX, width * THRESHOLD_RATIO);
  }, []);

  useEffect(() => {
    const node = rootRef.current;
    if (!node || !enabled) {
      return;
    }

    function onTouchMove(event: TouchEvent) {
      if (axisRef.current === "x") {
        event.preventDefault();
      }
    }

    node.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => node.removeEventListener("touchmove", onTouchMove);
  }, [enabled]);

  function resetGesture() {
    trackingRef.current = false;
    axisRef.current = null;
    completingRef.current = false;
  }

  async function finishComplete(width: number) {
    completingRef.current = true;
    setDragging(false);
    setArmed(true);
    offsetRef.current = -width;
    setOffset(-width);

    const ok = await completeTask(taskId);
    if (!ok) {
      snapTo(0, true);
      resetGesture();
    }
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!enabled || completingRef.current || isFinePointer(event.pointerType)) {
      return;
    }

    trackingRef.current = true;
    axisRef.current = null;
    suppressClickRef.current = false;
    startXRef.current = event.clientX;
    startYRef.current = event.clientY;
    setDragging(true);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!enabled || !trackingRef.current || completingRef.current) {
      return;
    }

    const dx = event.clientX - startXRef.current;
    const dy = event.clientY - startYRef.current;

    if (axisRef.current === null) {
      if (Math.abs(dx) < AXIS_LOCK_PX && Math.abs(dy) < AXIS_LOCK_PX) {
        return;
      }

      axisRef.current = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      if (axisRef.current === "y") {
        setDragging(false);
        return;
      }

      event.currentTarget.setPointerCapture(event.pointerId);
    }

    if (axisRef.current !== "x") {
      return;
    }

    const width = event.currentTarget.getBoundingClientRect().width || 1;
    const maxReveal = width * MAX_REVEAL_RATIO;
    const next = Math.max(-maxReveal, Math.min(0, dx));
    offsetRef.current = next;
    setOffset(next);
    setArmed(Math.abs(next) >= thresholdFor(width));
    suppressClickRef.current = Math.abs(next) > AXIS_LOCK_PX;
  }

  function handlePointerCancel(event: ReactPointerEvent<HTMLDivElement>) {
    if (!enabled || completingRef.current) {
      return;
    }

    trackingRef.current = false;
    axisRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    snapTo(0, true);
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (!enabled || !trackingRef.current) {
      return;
    }

    const width = event.currentTarget.getBoundingClientRect().width || 1;
    const shouldComplete =
      axisRef.current === "x" &&
      Math.abs(offsetRef.current) >= thresholdFor(width);

    trackingRef.current = false;
    axisRef.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (shouldComplete) {
      void finishComplete(width);
      return;
    }

    snapTo(0, true);
  }

  function handleClickCapture(event: React.MouseEvent<HTMLDivElement>) {
    if (!suppressClickRef.current) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    suppressClickRef.current = false;
  }

  if (!enabled) {
    return <>{children}</>;
  }

  const reveal = Math.abs(offset);
  const showLabel = reveal >= 88;

  return (
    <div
      ref={rootRef}
      className={`relative min-w-0 max-w-full overflow-hidden touch-pan-y ${className}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onClickCapture={handleClickCapture}
    >
      <div
        className={`absolute inset-0 flex items-center justify-end gap-1.5 pr-4 text-white ${
          armed ? "bg-emerald-500" : "bg-emerald-600"
        }`}
        aria-hidden="true"
      >
        {armed ? (
          <CircleCheck className="h-5 w-5 shrink-0" />
        ) : (
          <Check className="h-5 w-5 shrink-0 opacity-90" />
        )}
        {showLabel ? (
          <span className="text-xs font-semibold tracking-wide">Complete</span>
        ) : null}
      </div>
      <div
        className={`relative min-w-0 ${surfaceClassName}`}
        style={{
          transform: `translateX(${offset}px)`,
          transition: dragging ? "none" : "transform 180ms ease-out",
          willChange: dragging || offset !== 0 ? "transform" : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}
