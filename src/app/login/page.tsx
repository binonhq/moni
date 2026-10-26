import type { Metadata } from "next";
import { LoginForm } from "@/components/login-form";
export const metadata: Metadata = { title: "Welcome home" };
export const dynamic = "force-dynamic";
export default function LoginPage() {
  return (
    <LoginForm
      configured={
        !!process.env.DATABASE_URL &&
        !!process.env.BETTER_AUTH_SECRET &&
        !!process.env.BETTER_AUTH_URL
      }
    />
  );
}
