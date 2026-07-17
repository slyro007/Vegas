"use client";

import { motion } from "motion/react";
import { useOptimistic, useTransition } from "react";
import { setLodgingStatus } from "@/app/actions";
import type { LodgingStay } from "@/lib/data";
import { daysUntil, fmtDay, fmtMoney, nightsBetween } from "@/lib/format";

export function LodgingCard({ stay, index }: { stay: LodgingStay; index: number }) {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useOptimistic(stay.bookingStatus);
  const nights = nightsBetween(stay.checkIn, stay.checkOut);
  const cancelDays = stay.cancelBy ? daysUntil(stay.cancelBy) : null;
  const vegas = stay.theme === "vegas";
  const booked = status === "booked";
  const saved =
    stay.actualCents !== null ? stay.plannedCents - stay.actualCents : null;

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ type: "spring", stiffness: 140, damping: 20, delay: index * 0.08 }}
      className={`rounded-2xl border p-5 ${vegas ? "card-vegas" : "card-desert"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-semibold md:text-xl">{stay.name}</h2>
          <p className="mt-0.5 text-sm text-ink-secondary">
            📍 {stay.location} · {fmtDay(stay.checkIn)} → {fmtDay(stay.checkOut)} ·{" "}
            {nights} night{nights === 1 ? "" : "s"}
          </p>
        </div>
        <button
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const next = booked ? "planned" : "booked";
              setStatus(next);
              await setLodgingStatus(stay.id, next);
            })
          }
          className={`rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wider transition-colors ${
            booked
              ? "border-mark-green/60 bg-mark-green/15 text-mark-green"
              : "border-borderc-strong text-ink-muted hover:text-ink"
          }`}
          title="Tap to toggle booked status"
        >
          {booked ? "✓ booked" : "not booked yet"}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-2">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-ink-muted">planned</div>
          <div className="font-display text-lg tabular-nums text-ink-secondary line-through decoration-ink-muted/50">
            {fmtMoney(stay.plannedCents)}
          </div>
        </div>
        {stay.actualCents !== null && (
          <div>
            <div className="text-[10px] uppercase tracking-widest text-ink-muted">actual</div>
            <div className="font-display text-2xl font-semibold tabular-nums">
              {fmtMoney(stay.actualCents)}
            </div>
          </div>
        )}
        {saved !== null && saved > 0 && (
          <div className="rounded-full bg-mark-green/15 px-2.5 py-1 text-xs font-medium text-mark-green">
            Saves {fmtMoney(saved)}
          </div>
        )}
      </div>

      {cancelDays !== null && (
        <div
          className={`mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
            cancelDays >= 0
              ? "bg-mark-amber/15 text-glow-gold"
              : "bg-surface text-ink-muted"
          }`}
        >
          ⏳{" "}
          {cancelDays > 0
            ? `Free cancellation for ${cancelDays} more day${cancelDays === 1 ? "" : "s"} (until ${fmtDay(stay.cancelBy!)})`
            : cancelDays === 0
              ? "Last day for free cancellation!"
              : "Free-cancellation window closed"}
        </div>
      )}

      {stay.notes && <p className="mt-3 text-xs text-ink-muted">{stay.notes}</p>}
    </motion.article>
  );
}
