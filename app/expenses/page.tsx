import { ExpenseLogger } from "@/components/ExpenseLogger";
import { Reveal } from "@/components/Reveal";
import { getBudgetItems, getExpenses, getTravelers } from "@/lib/data";

export const dynamic = "force-dynamic";

export const metadata = { title: "Spend · Vegas 2026" };

export default async function ExpensesPage() {
  const [travelers, budgetItems, expenses] = await Promise.all([
    getTravelers(),
    getBudgetItems(),
    getExpenses(),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-6 md:py-14">
      <Reveal>
        <p className="text-xs uppercase tracking-widest text-ink-muted">
          Live · Every Entry Updates Finances
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold md:text-5xl">Spend</h1>
        <p className="mt-3 max-w-xl text-sm text-ink-secondary md:text-base">
          Booked something? Paid for dinner? Log it in ten seconds — pick your name, pick the
          budget line, punch in the amount. The Finances board updates instantly for everyone.
        </p>
      </Reveal>

      <div className="mt-8">
        <ExpenseLogger travelers={travelers} budgetItems={budgetItems} expenses={expenses} />
      </div>
    </div>
  );
}
