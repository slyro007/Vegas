import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";

export type Actor =
  | { kind: "user"; userId: string }
  | { kind: "tester" };

/** Resolve the acting identity: a signed-in Clerk user, or the preview tester. */
export async function getActor(): Promise<Actor | null> {
  const { userId } = await auth();
  if (userId) return { kind: "user", userId };
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
