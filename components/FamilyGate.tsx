import { SignOutButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import type { ReactNode } from "react";
import { isFamilyEmail } from "@/lib/family";

/**
 * App-side lockdown: a signed-in account whose email isn't on the family list
 * gets a dead end instead of the site. Testers (bypass cookie) have no Clerk
 * user and pass straight through — the middleware already vetted them.
 */
export async function FamilyGate({ children }: { children: ReactNode }) {
  const user = await currentUser();
  if (user) {
    const emails = user.emailAddresses.map((e) => e.emailAddress);
    if (!emails.some(isFamilyEmail)) {
      return (
        <div className="sunset-gradient flex min-h-screen flex-col items-center justify-center px-6 text-center">
          <p className="font-marquee neon-text text-4xl text-glow-pink">VEGAS</p>
          <h1 className="mt-6 font-display text-2xl font-semibold">Family Only 🌵</h1>
          <p className="mt-3 max-w-sm text-sm text-ink-secondary">
            This trip planner is just for Pithya, Shy, Bex, and Amma. If that&apos;s you, sign in
            with the email your invite was sent to.
          </p>
          <SignOutButton>
            <button className="mt-6 rounded-full border border-borderc-strong bg-card px-5 py-2 text-sm transition-colors hover:border-glow-pink/50">
              Sign Out
            </button>
          </SignOutButton>
        </div>
      );
    }
  }
  return <>{children}</>;
}
