import { SignIn } from "@clerk/nextjs";
import { Stars } from "@/components/Stars";

export default function SignInPage() {
  return (
    <div className="sunset-gradient relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4">
      <Stars />
      <p className="font-marquee neon-text relative mb-6 text-4xl text-glow-pink">VEGAS</p>
      <p className="relative mb-8 text-sm text-ink-secondary">
        Family only — sign in to plan the trip ✨
      </p>
      <div className="relative">
        <SignIn />
      </div>
    </div>
  );
}
