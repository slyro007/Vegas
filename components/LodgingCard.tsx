"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState, useTransition } from "react";
import { updateLodgingBooking } from "@/app/actions";
import type { LodgingStay } from "@/lib/data";
import { daysUntil, fmtDay, fmtMoney, nightsBetween } from "@/lib/format";

function parseDollars(input: string): number | null {
  const cleaned = input.replace(/[$,\s]/g, "");
  if (cleaned === "") return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

export function LodgingCard({ stay, index }: { stay: LodgingStay; index: number }) {
  const [pending, startTransition] = useTransition();
  const [formOpen, setFormOpen] = useState(false);
  const [priceDraft, setPriceDraft] = useState("");
  const [confDraft, setConfDraft] = useState("");

  const nights = nightsBetween(stay.checkIn, stay.checkOut);
  const cancelDays = stay.cancelBy ? daysUntil(stay.cancelBy) : null;
  const vegas = stay.theme === "vegas";
  const booked = stay.bookingStatus === "booked";
  const saved = stay.actualCents !== null ? stay.plannedCents - stay.actualCents : null;

  const openForm = () => {
    setPriceDraft(((stay.actualCents ?? stay.plannedCents) / 100).toString());
    setConfDraft(stay.confirmationNumber ?? "");
    setFormOpen(true);
  };

  const save = () => {
    const cents = parseDollars(priceDraft);
    setFormOpen(false);
    startTransition(() =>
      updateLodgingBooking(stay.id, {
        bookingStatus: "booked",
        ...(cents !== null ? { actualCents: cents } : {}),
        confirmationNumber: confDraft,
      }),
    );
  };

  // un-booking wipes the actual — nothing is really spent anymore, back to projected
  const unbook = () => {
    setFormOpen(false);
    startTransition(() =>
      updateLodgingBooking(stay.id, { bookingStatus: "planned", actualCents: null }),
    );
  };

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
            📍 {stay.location} · {fmtDay(stay.checkIn)} → {fmtDay(stay.checkOut)} · {nights}{" "}
            night{nights === 1 ? "" : "s"}
          </p>
        </div>
        <button
          disabled={pending}
          onClick={() => (formOpen ? setFormOpen(false) : openForm())}
          className={`rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wider transition-colors ${
            booked
              ? "border-mark-green/60 bg-mark-green/15 text-mark-green"
              : "border-borderc-strong text-ink-muted hover:text-ink"
          }`}
          title={booked ? "Tap to edit the booking details" : "Tap to mark as booked"}
        >
          {booked ? "✓ Booked" : "Not Booked Yet"}
        </button>
      </div>

      {/* booking form */}
      <AnimatePresence initial={false}>
        {formOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 30 }}
            className="overflow-hidden"
          >
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-borderc-strong p-3">
              <div className="flex items-center rounded-lg border border-borderc bg-surface px-2 focus-within:border-glow-pink/60">
                <span className="text-sm text-ink-muted">$</span>
                <input
                  value={priceDraft}
                  onChange={(e) => setPriceDraft(e.target.value)}
                  inputMode="decimal"
                  placeholder="Price"
                  className="w-24 bg-transparent px-1.5 py-1.5 text-sm tabular-nums outline-none"
                  aria-label="Booked price"
                />
              </div>
              <input
                value={confDraft}
                onChange={(e) => setConfDraft(e.target.value)}
                placeholder="Confirmation # (optional)"
                className="min-w-0 flex-1 rounded-lg border border-borderc bg-surface px-2.5 py-1.5 text-sm outline-none focus:border-glow-pink/60"
                aria-label="Confirmation number"
              />
              <button
                onClick={save}
                disabled={pending}
                className="rounded-full bg-mark-green px-3.5 py-1.5 text-sm font-medium text-bg transition-opacity disabled:opacity-50"
              >
                Save Booking
              </button>
              {booked && (
                <button
                  onClick={unbook}
                  disabled={pending}
                  className="text-xs text-ink-muted transition-colors hover:text-mark-pink"
                >
                  Mark Not Booked
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-2">
        <div>
          <div className="text-[11px] uppercase tracking-widest text-ink-muted">Projected</div>
          <div
            className={`font-display tabular-nums ${
              stay.actualCents !== null
                ? "text-lg text-ink-secondary line-through decoration-ink-muted/50"
                : "text-2xl font-semibold"
            }`}
          >
            {fmtMoney(stay.plannedCents)}
          </div>
        </div>
        {stay.actualCents !== null && (
          <div>
            <div className="text-[11px] uppercase tracking-widest text-ink-muted">
              Booked At
            </div>
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
        {booked && stay.confirmationNumber && (
          <button
            onClick={openForm}
            className="rounded-full border border-borderc-strong px-2.5 py-1 text-xs font-medium text-ink-secondary transition-colors hover:text-ink"
            title="Tap to edit"
          >
            Conf # {stay.confirmationNumber}
          </button>
        )}
      </div>

      {cancelDays !== null && (
        <div
          className={`mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
            cancelDays >= 0 ? "bg-mark-amber/15 text-glow-gold" : "bg-surface text-ink-muted"
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
