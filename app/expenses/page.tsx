import { currentUser } from "@clerk/nextjs/server";
import { ExpenseLogger } from "@/components/ExpenseLogger";
import { Reveal } from "@/components/Reveal";
import { getBudgetItems, getExpenses, getTravelers } from "@/lib/data";

export const dynamic = "force-dynamic";

export const metadata = { title: "Spend · Vegas 2026" };

export default async function ExpensesPage() {
  const [travelers, budgetItems, expenses, user] = await Promise.all([
    getTravelers(),
    getBudgetItems(),
    getExpenses(),
    currentUser(),
  ]);

  // auto-select whoever is signed in (testers get no preselect)
  const userEmails = user?.emailAddresses.map((e) => e.emailAddress.toLowerCase()) ?? [];
  const me = travelers.find(
    (t) => t.clerkEmail && userEmails.includes(t.clerkEmail.toLowerCase()),
  );

  // top spender first, to match the Finances board
  const projectedFor = (id: number) =>
    budgetItems.filter((i) => i.travelerId === id).reduce((s, i) => s + i.plannedCents, 0);
  const orderedTravelers = [...travelers].sort((a, b) => projectedFor(b.id) - projectedFor(a.id));

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-6 md:py-14">
      <Reveal>
        <p className="text-xs uppercase tracking-widest text-ink-muted">
          Live · Every Entry Updates Finances
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold md:text-5xl">
          Spend{me ? ` · Hey ${me.name}` : ""}
        </h1>
        <p className="mt-3 max-w-xl text-sm text-ink-secondary md:text-base">
          Booked something? Paid for dinner? Log it in ten seconds — pick the budget line, punch
          in the amount. The Finances board updates instantly for everyone.
        </p>
      </Reveal>

      <div className="mt-8">
        <ExpenseLogger
          travelers={orderedTravelers}
          budgetItems={budgetItems}
          expenses={expenses}
          defaultTravelerId={me?.id ?? null}
        />
      </div>
    </div>
  );
}
