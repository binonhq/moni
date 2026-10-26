import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { createAuth } from "./auth-config";
let auth: ReturnType<typeof createAuth> | undefined;
export function getAuth() {
  return (auth ??= createAuth(getDb(), true));
}
export async function requirePageSession() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET)
    redirect("/login?setup=required");
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  return session;
}
