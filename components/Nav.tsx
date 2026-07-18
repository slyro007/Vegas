"use client";

import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ICON } from "@/lib/icons";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/itinerary", label: "Itinerary" },
  { href: "/scenarios", label: "Decide" },
  { href: "/finances", label: "Finances" },
  { href: "/expenses", label: "Spend" },
  { href: "/lodging", label: "Lodging" },
  { href: "/lists", label: "Lists" },
];

export function Nav({ showDecide = true }: { showDecide?: boolean }) {
  const pathname = usePathname();
  if (pathname.startsWith("/sign-")) return null;

  const links = showDecide ? LINKS : LINKS.filter((l) => l.href !== "/scenarios");

  return (
    <>
      {/* top bar */}
      <header className="sticky top-0 z-40 border-b border-borderc bg-bg/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-baseline gap-1.5">
            <span className="font-marquee text-lg text-glow-pink neon-text leading-none">
              VEGAS
            </span>
            <span className="font-marquee text-[0.7rem] leading-none text-glow-teal neon-text-teal">
              ’26
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {links.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative rounded-full px-3.5 py-1.5 text-sm transition-colors ${
                    active ? "text-ink" : "text-ink-muted hover:text-ink-secondary"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-full bg-card border border-borderc-strong"
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    />
                  )}
                  <span className="relative">{link.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <Show when="signed-out">
              <SignInButton>
                <button className="rounded-full border border-borderc-strong bg-card px-4 py-1.5 text-sm text-ink-secondary transition-colors hover:text-ink hover:border-glow-pink/40">
                  Sign in
                </button>
              </SignInButton>
            </Show>
            <Show when="signed-in">
              <UserButton />
            </Show>
          </div>
        </div>
      </header>

      {/* mobile bottom tab bar */}
      <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-borderc bg-bg-elevated/90 backdrop-blur-md md:hidden">
        <div className={`grid ${links.length === 7 ? "grid-cols-7" : "grid-cols-6"}`}>
          {links.map((link) => {
            const active = pathname === link.href;
            const Icon = NAV_ICON[link.href];
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className="relative flex flex-col items-center gap-1 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]"
              >
                {active && (
                  <motion.span
                    layoutId="nav-tab"
                    className="absolute top-0 h-0.5 w-8 rounded-full bg-glow-pink"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                {Icon && (
                  <Icon
                    className={`h-[1.4rem] w-[1.4rem] transition-colors ${
                      active ? "text-glow-pink" : "text-ink-muted"
                    }`}
                    aria-hidden
                  />
                )}
                <span className={`text-[11px] ${active ? "text-ink" : "text-ink-muted"}`}>
                  {link.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
