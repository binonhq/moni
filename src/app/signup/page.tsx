import type { Metadata } from "next";
import { SignupForm } from "@/components/signup-form";
export const metadata: Metadata = { title: "Create your space" };
export const dynamic = "force-dynamic";
export default function SignupPage() {
  return <SignupForm configured={!!process.env.DATABASE_URL && !!process.env.BETTER_AUTH_SECRET && !!process.env.BETTER_AUTH_URL} />;
}
