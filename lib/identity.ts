import { auth, currentUser } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { isFamilyEmail } from "@/lib/family";

export type Actor =
  | { kind: "user"; userId: string }
  | { kind: "tester" };

/**
 * Resolve the acting identity: a signed-in family member, or the preview tester.
 * Signed-in accounts outside the family email list are rejected.
 */
export async function getActor(): Promise<Actor | null> {
  const { userId } = await auth();
  if (userId) {
    const user = await currentUser();
    const allowed = user?.emailAddresses.some((e) => isFamilyEmail(e.emailAddress)) ?? false;
    if (!allowed) return null;
    return { kind: "user", userId };
  }
  const jar = await cookies();
  const token = jar.get("preview_token")?.value;
  if (token && process.env.PREVIEW_BYPASS_TOKEN && token === process.env.PREVIEW_BYPASS_TOKEN) {
    return { kind: "tester" };
  }
  return null;
}

export async function requireActor(): Promise<Actor> {
  const actor = await getActor();
  if (!actor) throw new Error("Not authenticated");
  return actor;
}
