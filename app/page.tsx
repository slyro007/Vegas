import { Clock, Lock } from "lucide-react";
import Link from "next/link";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { Countdown } from "@/components/Countdown";
import { Reveal } from "@/components/Reveal";
import { RouteStrip } from "@/components/RouteStrip";
import { Stars } from "@/components/Stars";
import {
  getBudgetItems,
  getLodging,
  getScenarios,
  getTripSettings,
} from "@/lib/data";
import { daysUntil, fmtMoney } from "@/lib/format";
import { NAV_ICON, PlanIcon } from "@/lib/icons";

export const dynamic = "force-dynamic";

const QUICK_LINKS = [
  { href: "/itinerary", title: "Itinerary", desc: "Aug 7–14, day by day" },
  { href: "/finances", title: "Finances", desc: "Who pays what" },
  { href: "/expenses", title: "Spend", desc: "Log it in ten seconds" },
  { href: "/lodging", title: "Lodging", desc: "4 stays, all tracked" },
  { href: "/lists", title: "Lists", desc: "Packing + to-dos" },
];

export default async function Dashboard() {
  const [items, lodging, scenarios, settings] = await Promise.all([
    getBudgetItems(),
    getLodging(),
    getScenarios(),
    getTripSettings(),
  ]);
  const lockedScenario = scenarios.find((s) => s.id === settings.lockedScenarioId) ?? null;

  // the family yellow-pad pool, and how the real numbers sit against it
  const bucketTotal = items.reduce((sum, i) => sum + i.yellowPadCents, 0);
  const plannedWithActuals = items.filter((i) => i.actualCents !== null);
  const savedSoFar = plannedWithActuals.reduce(
    (sum, i) => sum + (i.plannedCents - (i.actualCents ?? 0)),
    0,
  );

  const luxor = lodging.find((l) => l.cancelBy);
  const cancelDays = luxor?.cancelBy ? daysUntil(luxor.cancelBy) : null;

  return (
    <div>
      {/* ---------- hero ---------- */}
      <section className="sunset-gradient relative overflow-hidden">
        <Stars />
        {/* horizon glow + mountain silhouette */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-40"
          style={{
            background:
              "linear-gradient(to top, rgba(18,13,28,1), rgba(18,13,28,0.6) 45%, transparent)",
          }}
          aria-hidden
        />
        <svg
          className="pointer-events-none absolute bottom-0 left-0 w-full"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            d="M0,120 L0,74 L90,52 L170,78 L260,38 L340,70 L420,54 L520,84 L610,44 L690,72 L780,30 L880,68 L960,50 L1050,80 L1130,58 L1200,74 L1200,120 Z"
            fill="#120d1c"
            opacity="0.92"
          />
        </svg>

        <div className="relative mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
          <Reveal>
            <p className="font-display italic text-ink-secondary md:text-lg">
              Austin → Vegas → Valle →
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <h1 className="font-marquee neon-flicker neon-text mt-2 text-[17vw] leading-none text-glow-pink md:text-9xl">
              VEGAS
            </h1>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mt-3 max-w-xl text-sm text-ink-secondary md:text-base">
              The family trip — <span className="font-medium text-ink">flights booked</span> ·{" "}
              <span className="text-ink font-medium">Aug 7 – 14, 2026</span> · Pithya, Shy, BeX
              &amp; Amma — horses at Valle, a Sedona weekend, Moapa Valley, old Vegas, and the
              Luxor to close it out.
            </p>
          </Reveal>
          <Reveal delay={0.35} className="mt-8">
            <Countdown targetIso="2026-08-07T15:39:00-05:00" />
            <p className="mt-2 text-xs uppercase tracking-widest text-ink-muted">
              until wheels up out of Austin
            </p>
          </Reveal>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-12 px-4 py-10 md:px-6 md:py-14">
        {/* ---------- stat tiles ---------- */}
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {[
            { label: "days in the desert", value: 8, prefix: "", accent: false },
            { label: "miles flown, round trip", value: 2170, prefix: "~", accent: false },
            { label: "yellow-pad budget", value: bucketTotal / 100, prefix: "$", accent: false },
            {
              label: "saved vs. plan so far",
              value: savedSoFar / 100,
              prefix: "$",
              accent: true,
            },
          ].map((stat, i) => (
            <Reveal key={stat.label} delay={i * 0.08}>
              <div className="rounded-2xl border border-borderc bg-card p-4 md:p-5">
                <div
                  className={`font-display text-2xl font-semibold md:text-4xl ${
                    stat.accent ? "text-mark-green" : "text-ink"
                  }`}
                >
                  <AnimatedNumber value={stat.value} prefix={stat.prefix} />
                </div>
                <div className="mt-1 text-xs uppercase tracking-wider text-ink-muted">
                  {stat.label}
                </div>
              </div>
            </Reveal>
          ))}
        </section>

        {/* ---------- booked + deadline callouts ---------- */}
        <section className="grid gap-3 md:grid-cols-2 md:gap-4">
          {lockedScenario && (
            <Reveal>
              <Link
                href="/finances"
                className="group block h-full rounded-2xl border border-mark-green/50 bg-card p-5 transition-colors hover:bg-card-hover"
              >
                <div className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-mark-green">
                  <Lock className="h-3.5 w-3.5" aria-hidden /> Booked
                </div>
                <div className="mt-2 flex items-center gap-2 font-display text-xl md:text-2xl">
                  <PlanIcon plan={lockedScenario.slug} className="h-5 w-5 shrink-0" />
                  {lockedScenario.name} ·{" "}
                  {fmtMoney(lockedScenario.costLines.reduce((s, l) => s + l.cents, 0))}
                </div>
                <div className="mt-2 text-sm text-ink-secondary">
                  Delta H2UQO8, Friday to Friday — Finances has every dollar.{" "}
                  <span className="text-glow-pink group-hover:underline">See It →</span>
                </div>
              </Link>
            </Reveal>
          )}
          {luxor && cancelDays !== null && (
            <Reveal delay={0.1}>
              <Link
                href="/lodging"
                className="group block h-full rounded-2xl border border-mark-amber/40 bg-card p-5 transition-colors hover:bg-card-hover"
              >
                <div className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-mark-amber">
                  <Clock className="h-3.5 w-3.5" aria-hidden /> Deadline Watch
                </div>
                <div className="mt-2 font-display text-xl md:text-2xl">
                  Luxor free cancellation ends Aug 9
                </div>
                <div className="mt-2 text-sm text-ink-secondary">
                  {cancelDays > 0
                    ? `${cancelDays} days left to change our minds penalty-free.`
                    : cancelDays === 0
                      ? "Today is the last day to cancel free."
                      : "The free-cancellation window has closed."}{" "}
                  <span className="text-glow-gold group-hover:underline">Details →</span>
                </div>
              </Link>
            </Reveal>
          )}
        </section>

        {/* ---------- route ---------- */}
        <section>
          <Reveal>
            <h2 className="font-display text-lg text-ink-secondary">The Route</h2>
            <div className="mt-3 rounded-2xl border border-borderc bg-card p-4">
              <RouteStrip />
            </div>
          </Reveal>
        </section>

        {/* ---------- quick links ---------- */}
        <section className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
          {QUICK_LINKS.map((q, i) => (
            <Reveal key={q.href} delay={i * 0.06}>
              <Link
                href={q.href}
                className="group flex h-full flex-col rounded-2xl border border-borderc bg-card p-4 transition-all hover:bg-card-hover hover:border-borderc-strong hover:-translate-y-0.5"
              >
                {(() => {
                  const Icon = NAV_ICON[q.href];
                  return (
                    <Icon className="h-6 w-6 text-ink-secondary transition-colors group-hover:text-glow-pink" />
                  );
                })()}
                <span className="mt-2 font-medium">{q.title}</span>
                <span className="mt-0.5 text-xs text-ink-muted">{q.desc}</span>
              </Link>
            </Reveal>
          ))}
        </section>
      </div>
    </div>
  );
}
