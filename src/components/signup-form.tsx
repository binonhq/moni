"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, LoaderCircle, ShieldCheck } from "lucide-react";
import { Brand } from "./brand";
import { Button } from "./ui/button";

export function SignupForm({ configured }: { configured: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/sign-up/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.get("name"), email: data.get("email"), password: data.get("password") }),
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || "Unable to create your account.");
      }
      location.replace("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please check your connection and try again.");
      setBusy(false);
    }
  }
  return (
    <main className="login-page">
      <div className="login-story"><Brand /><div className="login-story-copy"><span className="eyebrow">A LITTLE CLARITY, EVERY DAY</span><h1>Make room<br />for what<br /><em>matters.</em></h1><p>A quiet place for your everyday expenses.<br />Less keeping track. More living.</p></div><span className="login-private"><ShieldCheck size={17} />Personal by nature. Private by design.</span></div>
      <div className="login-form-side"><div className="login-mobile-brand"><Brand /></div><div className="login-box"><span className="eyebrow">YOUR OWN LITTLE SPACE</span><h2>Create your space.</h2><p className="muted">A calmer way to keep up with your money.</p>
        {!configured ? <div className="setup-notice"><h3>Your private space is almost ready.</h3><p>Connect the database and configure authentication using the project README.</p></div> : <form onSubmit={submit}>
          <label htmlFor="name">Your name</label><input id="name" name="name" autoComplete="name" placeholder="How should we call you?" required />
          <label htmlFor="email">Email address</label><input id="email" name="email" type="email" autoComplete="username" placeholder="you@example.com" required />
          <label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="new-password" minLength={13} maxLength={128} placeholder="At least 13 characters" required />
          {error && <p className="form-error" role="alert">{error}</p>}
          <Button disabled={busy} type="submit">{busy ? <LoaderCircle size={18} className="spin" /> : <>Create account <ArrowRight size={18} /></>}</Button>
        </form>}
        <p className="login-switch">Already have an account? <Link href="/login">Sign in</Link></p><p className="login-security"><ShieldCheck size={15} />Your finances stay private to your account.</p>
      </div><span className="login-bottom">A little clarity goes a long way.</span></div>
    </main>
  );
}
