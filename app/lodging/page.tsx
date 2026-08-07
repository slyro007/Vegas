import Link from "next/link";
import { LodgingCard } from "@/components/LodgingCard";
import { Reveal } from "@/components/Reveal";
import { getBudgetItems, getExpenses, getLodging } from "@/lib/data";
import { fmtMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = { title: "Lodging · Vegas 2026" };

export default async function LodgingPage() {
  const [stays, items, expenses] = await Promise.all([
    getLodging(),
    getBudgetItems(),
    getExpenses(),
  ]);

  // the money comes from each stay's budget line and the payments logged on it,
  // so this page and Finances can never disagree about what a hotel cost
  const lineById = new Map(items.map((i) => [i.id, i]));
  const paidByLine = new Map<number, number>();
  for (const e of expenses) {
    paidByLine.set(e.budgetItemId, (paidByLine.get(e.budgetItemId) ?? 0) + e.amountCents);
  }

  const rows = stays.map((stay) => {
    const line = stay.budgetItemId == null ? null : (lineById.get(stay.budgetItemId) ?? null);
    return { stay, line, paid: line ? (paidByLine.get(line.id) ?? 0) : 0 };
  });

  const cost = rows.reduce((s, r) => s + (r.line?.plannedCents ?? r.stay.plannedCents), 0);
  const paid = rows.reduce((s, r) => s + r.paid, 0);
  const due = Math.max(0, cost - paid);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-6 md:py-14">
      <Reveal>
        <p className="text-xs uppercase tracking-widest text-ink-muted">
          four stays · thanks john 🙏
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold md:text-5xl">Lodging</h1>
        <p className="mt-3 max-w-xl text-sm text-ink-secondary md:text-base">
          Every Best Western is on John&apos;s employee rate —{" "}
          <span className="font-medium text-ink">{fmtMoney(cost)}</span> across all four stays,{" "}
          <span className="font-medium text-mark-green">{fmtMoney(paid)}</span> of it paid
          {due > 0 && (
            <>
              {" "}
              and <span className="font-medium text-mark-amber">{fmtMoney(due)}</span> still to go
            </>
          )}
          . These are the same numbers the{" "}
          <Link href="/finances" className="text-glow-pink hover:underline">
            Finances board
          </Link>{" "}
          shows — change a price here and it lands there.
        </p>
      </Reveal>

      <div className="mt-8 space-y-4">
        {rows.map(({ stay, line, paid }, i) => (
          <LodgingCard key={stay.id} stay={stay} line={line} paidCents={paid} index={i} />
        ))}
      </div>
    </div>
  );
}
