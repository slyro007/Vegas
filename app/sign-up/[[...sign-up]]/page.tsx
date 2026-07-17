import { SignUp } from "@clerk/nextjs";
import { Stars } from "@/components/Stars";

export default function SignUpPage() {
  return (
    <div className="sunset-gradient relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4">
      <Stars />
      <p className="font-marquee neon-text relative mb-6 text-4xl text-glow-pink">VEGAS</p>
      <p className="relative mb-8 text-sm text-ink-secondary">
        Joining the trip? Make your account 🌵
      </p>
      <div className="relative">
        <SignUp />
      </div>
    </div>
  );
}
