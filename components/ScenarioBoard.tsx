"use client";

import { Check, ChevronDown, Crown, Lock } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useOptimistic, useState, useTransition } from "react";
import { castVote, lockScenario } from "@/app/actions";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { scenarioAccent } from "@/lib/accents";
import type { Scenario, Traveler, TripSettings, Vote } from "@/lib/data";
import { fmtMoney } from "@/lib/format";
import { PlanIcon, TravelerAvatar } from "@/lib/icons";

const total = (s: Scenario) => s.costLines.reduce((sum, l) => sum + l.cents, 0);

export function ScenarioBoard({
  scenarios,
  travelers,
  votes,
  settings,
}: {
  scenarios: Scenario[];
  travelers: Traveler[];
  votes: Vote[];
  settings: TripSettings;
}) {
  const [pending, startTransition] = useTransition();
  const [optimisticVotes, applyVote] = useOptimistic(
    votes,
    (state, next: { travelerId: number; scenarioId: number }) => {
      const existing = state.find((v) => v.travelerId === next.travelerId);
      const rest = state.filter((v) => v.travelerId !== next.travelerId);
      // tapping your current pick again = unvote
      if (existing && existing.scenarioId === next.scenarioId) return rest;
      return [...rest, { ...next, id: -next.travelerId, createdAt: new Date() }];
    },
  );
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirmLock, setConfirmLock] = useState<string | null>(null);

  const voteFor = (travelerId: number) =>
    optimisticVotes.find((v) => v.travelerId === travelerId)?.scenarioId;
  const tallyFor = (scenarioId: number) =>
    optimisticVotes.filter((v) => v.scenarioId === scenarioId).length;
  const leadingId =
    optimisticVotes.length > 0
      ? scenarios.reduce((best, s) =>
          tallyFor(s.id) > tallyFor(best.id) ? s : best,
        ).id
      : null;

  const handleVote = (travelerId: number, scenarioId: number) => {
    startTransition(async () => {
      applyVote({ travelerId, scenarioId });
      await castVote(travelerId, scenarioId);
    });
  };

  return (
    <div className="space-y-10">
      {/* ---------- scenario cards ---------- */}
      <section className="grid gap-4 lg:grid-cols-3">
        {scenarios.map((s, idx) => {
          const accent = scenarioAccent(s.slug);
          const isLocked = settings.lockedScenarioId === s.id;
          const t = total(s);
          const isOpen = expanded === s.slug;
          const tally = tallyFor(s.id);
          const leading = leadingId === s.id;
          return (
            <motion.article
              key={s.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ type: "spring", stiffness: 140, damping: 20, delay: idx * 0.08 }}
              className="relative flex flex-col rounded-2xl border bg-card p-5"
              style={{
                borderColor: isLocked || leading ? accent.mark : "var(--border)",
                boxShadow: isLocked || leading ? `0 0 24px ${accent.glow}` : undefined,
              }}
            >
              {(isLocked || leading) && (
                <div
                  className="absolute -top-3 right-4 flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-bg"
                  style={{ background: accent.mark }}
                >
                  {isLocked ? (
                    <>
                      <Lock className="h-3.5 w-3.5" aria-hidden /> Locked In
                    </>
                  ) : (
                    <>
                      <Crown className="h-3.5 w-3.5" aria-hidden /> Leading
                    </>
                  )}
                </div>
              )}

              <div style={{ color: accent.mark }}>
                <PlanIcon plan={s.slug} className="h-8 w-8" />
              </div>
              <h3 className="mt-2 font-display text-xl font-semibold">{s.name}</h3>
              <p className="text-sm italic text-ink-secondary">{s.tagline}</p>

              <div className="mt-4 font-display text-3xl font-semibold tabular-nums">
                <AnimatedNumber
                  value={t / 100}
                  format={(v) => `$${Math.round(v).toLocaleString()}`}
                />
              </div>
              <p className="mt-1 text-xs text-ink-muted">{s.travelSummary}</p>

              {/* breakdown toggle */}
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setExpanded(isOpen ? null : s.slug)}
                className="mt-4 flex items-center gap-1.5 self-start rounded-full border border-borderc px-3 py-1 text-xs text-ink-secondary transition-colors hover:border-borderc-strong hover:text-ink"
                aria-expanded={isOpen}
              >
                Cost Breakdown + The Week
                <motion.span animate={{ rotate: isOpen ? 180 : 0 }} className="inline-flex">
                  <ChevronDown className="h-4 w-4" />
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 200, damping: 28 }}
                    className="overflow-hidden"
                  >
                    <ul className="mt-3 space-y-2">
                      {s.costLines.map((line) => (
                        <li key={line.label} className="text-sm" title={fmtMoney(line.cents)}>
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-ink-secondary">
                              {line.label}
                              {line.estimate && (
                                <span className="ml-1.5 rounded bg-surface px-1 py-px text-[11px] uppercase tracking-wide text-ink-muted">
                                  est.
                                </span>
                              )}
                            </span>
                            <span className="tabular-nums">{fmtMoney(line.cents)}</span>
                          </div>
                          <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-surface">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${(line.cents / t) * 100}%`,
                                background: accent.mark,
                                backgroundImage: line.estimate
                                  ? "repeating-linear-gradient(45deg, transparent 0 3px, rgba(0,0,0,0.35) 3px 6px)"
                                  : undefined,
                              }}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>

                    {s.itineraryOutline.length > 0 && (
                      <div className="mt-4">
                        <p className="text-[11px] uppercase tracking-widest text-ink-muted">
                          How the Week Plays Out
                        </p>
                        <ul className="mt-2 space-y-1.5">
                          {s.itineraryOutline.map((entry) => (
                            <li key={entry.day} className="flex gap-2 text-xs">
                              <span
                                className="w-12 shrink-0 font-medium tabular-nums"
                                style={{ color: accent.mark }}
                              >
                                {entry.day}
                              </span>
                              <span className="text-ink-secondary">{entry.plan}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* pros / cons */}
              <div className="mt-4 space-y-1.5 text-sm">
                {s.pros.map((p) => (
                  <p key={p} className="flex gap-2 text-ink-secondary">
                    <span className="text-mark-green">+</span>
                    <span>{p}</span>
                  </p>
                ))}
                {s.cons.map((c) => (
                  <p key={c} className="flex gap-2 text-ink-muted">
                    <span className="text-mark-pink">−</span>
                    <span>{c}</span>
                  </p>
                ))}
              </div>

              {/* voting */}
              <div className="mt-5 border-t border-borderc pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-widest text-ink-muted">votes</span>
                  <span className="text-sm font-medium tabular-nums">
                    {tally}/{travelers.length}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: accent.mark }}
                    animate={{ width: `${(tally / travelers.length) * 100}%` }}
                    transition={{ type: "spring", stiffness: 120, damping: 20 }}
                  />
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {travelers.map((traveler) => {
                    const votedHere = voteFor(traveler.id) === s.id;
                    return (
                      <motion.button
                        key={traveler.id}
                        whileTap={{ scale: 0.92 }}
                        disabled={pending}
                        onClick={() => handleVote(traveler.id, s.id)}
                        className="flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-2.5 text-xs font-medium transition-colors disabled:opacity-60"
                        style={{
                          borderColor: votedHere ? traveler.color : "var(--border)",
                          background: votedHere ? accent.soft : "transparent",
                          color: votedHere ? "var(--ink)" : "var(--ink-muted)",
                        }}
                        title={
                          votedHere
                            ? `${traveler.name} voted for this — tap again to remove the vote`
                            : `Vote as ${traveler.name}`
                        }
                      >
                        <TravelerAvatar
                          name={traveler.name}
                          color={traveler.color}
                          className="h-5 w-5 text-[11px]"
                        />
                        {traveler.name}
                        {votedHere && <Check className="h-4 w-4" aria-hidden />}
                      </motion.button>
                    );
                  })}
                </div>

                {/* lock it in */}
                {!settings.lockedScenarioId && (
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    disabled={pending}
                    onClick={() => {
                      if (confirmLock !== s.slug) {
                        setConfirmLock(s.slug);
                        setTimeout(() => setConfirmLock(null), 3000);
                        return;
                      }
                      setConfirmLock(null);
                      startTransition(() => lockScenario(s.id));
                    }}
                    className="mt-4 w-full rounded-xl border py-2 text-sm font-semibold transition-colors"
                    style={{
                      borderColor: confirmLock === s.slug ? accent.mark : "var(--border-strong)",
                      background: confirmLock === s.slug ? accent.soft : "transparent",
                      color: confirmLock === s.slug ? "var(--ink)" : "var(--ink-secondary)",
                    }}
                  >
                    {confirmLock === s.slug ? "Tap Again to Confirm 🔐" : "🔒 Lock This Plan"}
                  </motion.button>
                )}
              </div>
            </motion.article>
          );
        })}
      </section>
    </div>
  );
}
