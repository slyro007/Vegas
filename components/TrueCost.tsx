"use client";

import { motion } from "motion/react";
import { useMemo } from "react";
import { scenarioAccent } from "@/lib/accents";
import type { BudgetItem, Scenario, Traveler } from "@/lib/data";
import { estimateForScenario } from "@/lib/estimate";
import { fmtMoney } from "@/lib/format";
import { PlanIcon } from "@/lib/icons";

const YELLOW_PAD_NOTE =
  "The yellow pad assumed we'd drive, so every plan's gap from it has two separate causes.";

/**
 * Are we actually saving? Three readings of the same money:
 *   (a) each plan's real total vs the original yellow pad, ranked
 *   (b) that gap split into route choice vs. the real deals we got
 *   (c) drive vs fly head-to-head — is it the hotels or the transportation?
 */
export function TrueCost({
  scenarios,
  travelers,
  items,
  selected,
}: {
  scenarios: Scenario[];
  travelers: Traveler[];
  items: BudgetItem[];
  selected: string;
}) {
  const rows = useMemo(
    () =>
      scenarios
        .map((s) => ({ scenario: s, est: estimateForScenario(travelers, items, s) }))
        .sort((a, b) => a.est.realTotal - b.est.realTotal),
    [scenarios, travelers, items],
  );

  const drive = rows.find((r) => r.scenario.slug === "forester");
  const fly = rows.find((r) => r.scenario.slug === "fly");
  const bucketTotal = rows[0]?.est.bucketTotal ?? 0;

  return (
    <section>
      <h2 className="font-display text-xl font-semibold md:text-2xl">Are we actually saving?</h2>
      <p className="mt-1 text-sm text-ink-secondary">
        Every number below is a total for all four of us, measured against the{" "}
        <span className="font-medium text-ink">{fmtMoney(bucketTotal)}</span> we originally planned
        on the yellow pad.
      </p>

      {/* ---------- (a) ranked vs the yellow pad ---------- */}
      <div className="mt-4 rounded-2xl border border-borderc bg-card p-5">
        <h3 className="text-xs uppercase tracking-widest text-ink-muted">
          What each plan really costs
        </h3>
        <ul className="mt-4 space-y-3.5">
          {rows.map(({ scenario, est }) => {
            const accent = scenarioAccent(scenario.slug);
            const under = est.available >= 0;
            const active = scenario.slug === selected;
            return (
              <li
                key={scenario.id}
                className={`rounded-xl px-2.5 py-2 transition-colors ${active ? "bg-surface" : ""}`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1 text-sm">
                  <span className="flex items-center gap-2">
                    <span style={{ color: accent.mark }}>
                      <PlanIcon plan={scenario.slug} className="h-[1.15rem] w-[1.15rem]" />
                    </span>
                    <span className={active ? "font-medium" : ""}>{scenario.name}</span>
                  </span>
                  <span className="flex items-baseline gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        under
                          ? "bg-mark-green/15 text-mark-green"
                          : "bg-mark-pink/15 text-mark-pink"
                      }`}
                    >
                      {under ? "saves" : "short"} {fmtMoney(Math.abs(est.available))}
                    </span>
                    <span className="font-medium tabular-nums">{fmtMoney(est.realTotal)}</span>
                  </span>
                </div>
                <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-surface">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: accent.mark }}
                    initial={{ width: 0 }}
                    whileInView={{
                      width: `${(est.realTotal / rows[rows.length - 1].est.realTotal) * 100}%`,
                    }}
                    viewport={{ once: true }}
                    transition={{ type: "spring", stiffness: 60, damping: 20 }}
                  />
                </div>
                {/* how firm is this plan's number? */}
                <p className="mt-1 text-xs text-ink-muted">
                  <span className="text-ink-secondary">
                    {fmtMoney(est.byConfidence.quoted)} quoted
                  </span>{" "}
                  · {fmtMoney(est.byConfidence.rate)} on John&apos;s rates ·{" "}
                  {fmtMoney(est.byConfidence.estimate)} estimated
                </p>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-xs text-ink-muted">
          The drive plans have <span className="text-ink-secondary">nothing quoted</span> — their
          saving rests entirely on John&apos;s rates plus gas and food estimates. The fly plans are
          the ones carrying real quoted money.
        </p>
      </div>

      {/* ---------- (b) route choice vs. real deals ---------- */}
      <div className="mt-4 rounded-2xl border border-borderc bg-card p-5">
        <h3 className="text-xs uppercase tracking-widest text-ink-muted">
          Where each saving comes from
        </h3>
        <p className="mt-1 text-xs text-ink-muted">{YELLOW_PAD_NOTE}</p>
        <div className="scroll-thin mt-4 overflow-x-auto">
          <table className="w-full min-w-[34rem] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-ink-muted">
                <th className="pb-2 font-normal">Plan</th>
                <th className="pb-2 text-right font-normal">Route change</th>
                <th className="pb-2 text-right font-normal">Real deals</th>
                <th className="pb-2 text-right font-normal">Real total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ scenario, est }) => {
                const accent = scenarioAccent(scenario.slug);
                const active = scenario.slug === selected;
                return (
                  <tr
                    key={scenario.id}
                    className={`border-t border-borderc ${active ? "bg-surface" : ""}`}
                  >
                    <td className="py-2.5">
                      <span className="flex items-center gap-2">
                        <span style={{ color: accent.mark }}>
                          <PlanIcon plan={scenario.slug} className="h-4 w-4" />
                        </span>
                        <span className={active ? "font-medium" : ""}>{scenario.name}</span>
                      </span>
                    </td>
                    <td className="py-2.5 text-right tabular-nums">
                      {est.routeChange === 0 ? (
                        <span className="text-ink-muted">—</span>
                      ) : (
                        <span className="text-mark-pink">+{fmtMoney(est.routeChange)}</span>
                      )}
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-mark-green">
                      −{fmtMoney(est.dealSavings)}
                    </td>
                    <td className="py-2.5 text-right font-medium tabular-nums">
                      {fmtMoney(est.realTotal)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <dl className="mt-4 space-y-2 text-xs text-ink-muted">
          <div>
            <dt className="inline font-medium text-mark-pink">Route change · </dt>
            <dd className="inline">
              what flying adds that nobody budgeted for, minus what not driving hands back (gas,
              road food and the Flagstaff night). Driving is zero — it&apos;s what the yellow pad
              already assumed.
            </dd>
          </div>
          <div>
            <dt className="inline font-medium text-mark-green">Real deals · </dt>
            <dd className="inline">
              real prices beating the plan. The Luxor all-inclusive is the big one and it&apos;s
              identical on every plan. John&apos;s rates are the part that shifts with the route.
            </dd>
          </div>
        </dl>
      </div>

      {/* ---------- (c) every plan, every dollar ---------- */}
      {drive && fly && (
        <div className="mt-4 rounded-2xl border border-borderc bg-card p-5">
          <h3 className="text-xs uppercase tracking-widest text-ink-muted">
            Every plan, every dollar
          </h3>
          <p className="mt-1 text-xs text-ink-muted">
            Nothing left out — the rows add up to each plan&apos;s real total.
          </p>
          <div className="scroll-thin mt-4 overflow-x-auto">
            <table className="w-full min-w-[30rem] text-sm">
              <thead>
                <tr>
                  <th className="pb-2 text-left text-xs font-normal uppercase tracking-wider text-ink-muted">
                    What we spend on
                  </th>
                  {rows.map(({ scenario }) => (
                    <th
                      key={scenario.id}
                      className="pb-2 text-right text-xs font-normal uppercase tracking-wider"
                      style={{ color: scenarioAccent(scenario.slug).mark }}
                    >
                      {scenario.name.replace(/^(Road Trip|Fly) · /, "")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    ["Getting there", "gettingThere"],
                    ["Hotels", "hotels"],
                    ["Food", "food"],
                  ] as const
                ).map(([label, field]) => (
                  <tr key={label} className="border-t border-borderc">
                    <td className="py-2 text-ink-secondary">{label}</td>
                    {rows.map(({ scenario, est }) => (
                      <td key={scenario.id} className="py-2 text-right tabular-nums">
                        {fmtMoney(est[field])}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="border-t border-borderc font-medium">
                  <td className="py-2">Costs that change by plan</td>
                  {rows.map(({ scenario, est }) => (
                    <td key={scenario.id} className="py-2 text-right tabular-nums">
                      {fmtMoney(est.gettingThere + est.hotels + est.food)}
                    </td>
                  ))}
                </tr>
                <tr className="border-t border-borderc">
                  <td className="py-2 text-ink-secondary">
                    Same either way
                    <span className="block text-xs text-ink-muted">
                      the Luxor, Wynn, Caesar, gifts, spending money
                    </span>
                  </td>
                  {rows.map(({ scenario, est }) => (
                    <td
                      key={scenario.id}
                      className="py-2 text-right tabular-nums text-ink-secondary"
                    >
                      {fmtMoney(est.personalTotal)}
                    </td>
                  ))}
                </tr>
                <tr className="border-t border-borderc-strong font-semibold">
                  <td className="py-2.5">Real total</td>
                  {rows.map(({ scenario, est }) => (
                    <td key={scenario.id} className="py-2.5 text-right tabular-nums">
                      {fmtMoney(est.realTotal)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-4 space-y-1.5 border-t border-borderc pt-3 text-sm">
            {(
              [
                ["Hotels", fly.est.hotels - drive.est.hotels],
                ["Food", fly.est.food - drive.est.food],
                ["Getting there", fly.est.gettingThere - drive.est.gettingThere],
              ] as const
            ).map(([label, delta]) => (
              <div key={label} className="flex items-baseline justify-between gap-3">
                <span className="text-ink-secondary">
                  {label} — Forester vs flying
                </span>
                <span
                  className={`tabular-nums ${delta > 0 ? "text-mark-pink" : "text-mark-green"}`}
                >
                  flying is {fmtMoney(Math.abs(delta))} {delta > 0 ? "more" : "cheaper"}
                </span>
              </div>
            ))}
            <div className="flex items-baseline justify-between gap-3 pt-1 font-medium">
              <span>Taking the Forester saves</span>
              <span className="tabular-nums text-mark-green">
                {fmtMoney(fly.est.realTotal - drive.est.realTotal)}
              </span>
            </div>
          </div>

          <p className="mt-4 text-xs text-ink-muted">
            <span className="text-ink-secondary">It&apos;s the transportation, not the trip.</span>{" "}
            Hotels and food land within a couple hundred dollars of each other on all three plans —
            flying costs a bit more on lodging (the Saturday Sedona rate) and a bit less on food (no
            road-trip meals). Nearly the whole gap is getting there: $2,475 to fly plus the
            rental, bags, ubers and fuel, against gas and a car we already own. The rental SUV is
            the same road trip with $650 of vehicle on top.
          </p>
        </div>
      )}
    </section>
  );
}
