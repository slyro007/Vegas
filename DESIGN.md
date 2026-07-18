# Design

Desert-dawn-to-Vegas-night on a dark surface. Warm sand and sunset orange for the road; neon pink and teal for Vegas. The system is already built and well-liked — this doc captures it so later passes reinforce it rather than flatten it.

## Theme

Dark, always. Surface `#161123` / bg tokens in [app/globals.css](app/globals.css). The trip's arc is the theme: `card-desert` (warm) for road/desert days, `card-vegas` (neon) for Vegas days. Neon glow is a real material here — used on the logo, the lit timeline rail, locked-plan cards — but it is earned, not global.

## Color

Two tiers, never mixed:
- **Data marks** (`--mark-*`, dark-surface-validated): orange `#ca6c34`, teal `#0ea5b5`, pink `#d34f8c`, amber `#b88931`, green `#4da06b`, purple `#8b73d1`. These carry meaning — categories, plan accents, traveler colors.
- **Decorative glows** (`--glow-*`): sunset `#f0813f`, pink `#ff5ca8`, teal `#2ee6f6`, gold `#ffcf6b`, purple `#a78bfa`. Glow/gradient/shadow ONLY — never a data value.

Travelers each own a mark color: Pithya orange, Shy amber, Bex pink, Amma green. Plan accents live in [lib/accents.ts](lib/accents.ts).

## Typography

- **Geist** (`--font-geist-sans`) — body and UI.
- **Fraunces** (`--font-fraunces`, display) — headings, money figures, names.
- **Monoton** (`--font-marquee`) — the neon VEGAS marquee logo and the '26 beside it.
- Base is 17px (`html { font-size: 106.25% }`); everything scales in rem. Keep functional labels legible — no sub-11px text in content the user reads.

## Iconography

**Lucide** line icons are the icon system — nav, plan markers (Car / Truck / Plane), functional glyphs (MapPin, Lock, Crown, Clock, Check, X, Plus, ChevronDown). Central map in [lib/icons.tsx](lib/icons.tsx). Travelers render as a colored circle with their monogram initial in their mark color. Emoji are NOT interface icons.

Two deliberate emoji flourishes are personality, not chrome, and stay: the RouteStrip Backstreet-Boys **Sphere easter egg** ([components/RouteStrip.tsx](components/RouteStrip.tsx)) and the 🌵 / 🎰 footer signature. Leave them.

## Components

Rounded-2xl cards on `bg-card` with `border-borderc`; `card-desert` / `card-vegas` themed variants. Pills for toggles (plan / view) with a sliding `layoutId` indicator. Two-tap confirm on destructive actions (delete line, lock, unlock). Money is edited in place (tap a figure). Everything reads projected vs actual — actual only appears from a logged expense or a booking.

## Motion

Motion (framer-motion via `motion/react`) marks the trip's arc: the timeline rail lights with scroll, cards spring in on view, the neon flickers. Springs, ease-out, no bounce. Staggered list entrances are fine; the uniform one-entrance-everywhere reflex is not. All of it respects `prefers-reduced-motion` (guards in [app/globals.css](app/globals.css)).

## Layout

Mobile-first. Bottom tab bar on phones, top nav on desktop. Content columns capped (`max-w-3xl`/`4xl`/`6xl` per page). The Day Grid packs the whole trip into ~1–2 screens; the Timeline is the scrollable narrative view.
