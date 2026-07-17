"use client";

import { animate, useInView, useMotionValue } from "motion/react";
import { useEffect, useRef, useState } from "react";

/**
 * Counts from 0 to `value` when scrolled into view.
 * Server components pass `prefix`/`suffix` (serializable); client components may pass `format`.
 */
export function AnimatedNumber({
  value,
  format,
  prefix = "",
  suffix = "",
  duration = 1.2,
  className,
}: {
  value: number;
  format?: (v: number) => string;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  format ??= (v: number) => `${prefix}${Math.round(v).toLocaleString()}${suffix}`;
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const motionValue = useMotionValue(0);
  const [display, setDisplay] = useState(() => format(0));

  useEffect(() => {
    if (!inView) return;
    const controls = animate(motionValue, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(format(v)),
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, value]);

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}
