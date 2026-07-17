"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

function parts(target: Date) {
  const diff = Math.max(0, target.getTime() - Date.now());
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  };
}

function Unit({ value, label }: { value: number; label: string }) {
  const padded = String(value).padStart(2, "0");
  return (
    <div className="flex flex-col items-center">
      <div className="relative h-14 w-16 md:h-20 md:w-24 overflow-hidden rounded-xl border border-borderc-strong bg-card/80 backdrop-blur">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={padded}
            initial={{ y: "-100%", opacity: 0 }}
            animate={{ y: "0%", opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute inset-0 flex items-center justify-center font-display text-2xl md:text-4xl font-semibold tabular-nums"
          >
            {padded}
          </motion.span>
        </AnimatePresence>
      </div>
      <span className="mt-1.5 text-[10px] md:text-xs uppercase tracking-widest text-ink-muted">
        {label}
      </span>
    </div>
  );
}

export function Countdown({ targetIso }: { targetIso: string }) {
  const [now, setNow] = useState<ReturnType<typeof parts> | null>(null);

  useEffect(() => {
    const target = new Date(targetIso);
    const tick = () => setNow(parts(target));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetIso]);

  if (!now) {
    return <div className="h-[76px] md:h-[104px]" aria-hidden />;
  }

  return (
    <div className="flex items-start gap-2 md:gap-4" role="timer" aria-label="Countdown to departure">
      <Unit value={now.days} label="days" />
      <Unit value={now.hours} label="hrs" />
      <Unit value={now.minutes} label="min" />
      <Unit value={now.seconds} label="sec" />
    </div>
  );
}
