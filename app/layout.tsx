import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono, Monoton } from "next/font/google";
import { Nav } from "@/components/Nav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
});

const monoton = Monoton({
  variable: "--font-monoton",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Vegas 2026 · The Family Trip",
  description:
    "Muir Lake → Flagstaff → the land → Vegas → Sedona. Itinerary, finances, and the big drive-vs-fly decision.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} ${monoton.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg text-ink">
        <ClerkProvider
          appearance={{
            variables: {
              colorPrimary: "#d34f8c",
              colorBackground: "#1c1630",
              colorForeground: "#f4ece2",
              colorNeutral: "#f4ece2",
              borderRadius: "0.75rem",
            },
          }}
        >
          <Nav />
          <main className="flex-1 pb-24 md:pb-10">{children}</main>
          <footer className="hidden md:block border-t border-borderc px-6 py-4 text-center text-xs text-ink-muted">
            Vegas 2026 · Pithya · Shy · Bex · Amma · built with 🌵 and 🎰
          </footer>
        </ClerkProvider>
      </body>
    </html>
  );
}
