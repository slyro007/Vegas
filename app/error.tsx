"use client";

/** Route-level catch: a failed server action (dead wifi, expired session,
 *  or a tab left open across a deploy) lands here instead of Next's blank
 *  production error page. A full reload — not reset() — is the recovery:
 *  after a deploy the tab's client code is stale, and only a reload picks
 *  up the new build's server-action ids. */
export default function RouteError() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col items-start px-4 py-16 md:px-6 md:py-24">
      <p className="text-xs uppercase tracking-widest text-ink-muted">Detour</p>
      <h1 className="mt-1 font-display text-3xl font-semibold md:text-5xl">
        That didn&apos;t land.
      </h1>
      <p className="mt-4 max-w-xl text-sm text-ink-secondary md:text-base">
        Something went sideways — bad signal, or a sign-in that timed out. Your last change may
        not have saved.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-6 rounded-full bg-mark-pink px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
      >
        Try Again
      </button>
    </div>
  );
}
