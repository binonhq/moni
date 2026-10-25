"use client";
import { useState } from "react";
import { ArrowRight, LoaderCircle, ShieldCheck } from "lucide-react";
import { Brand } from "./brand";
import { Button } from "./ui/button";
export function LoginForm({ configured }: { configured: boolean }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget); setBusy(true); setError(null);
    try {
      const response = await fetch("/api/auth/sign-in/email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: data.get("email"), password: data.get("password"), rememberMe: true }) });
      if (!response.ok) { const result = await response.json(); throw new Error(result.error?.message || "Unable to sign in."); }
      location.replace("/");
    } catch (e) { setError(e instanceof Error ? e.message : "Please check your connection and try again."); setBusy(false); }
  }
  return <main className="login-page"><div className="login-story"><Brand /><div className="login-story-copy"><span className="eyebrow">A LITTLE CLARITY, EVERY DAY</span><h1>Make room<br />for what<br /><em>matters.</em></h1><p>A quiet place for your everyday expenses.<br />Less keeping track. More living.</p></div><div className="login-art" aria-hidden="true"><div className="art-orbit" /><div className="art-card"><span>moni.</span><div /><i /><i /></div></div><span className="login-private"><ShieldCheck size={17} />Personal by nature. Private by design.</span></div><div className="login-form-side"><div className="login-mobile-brand"><Brand /></div><div className="login-box"><span className="eyebrow">YOUR OWN LITTLE SPACE</span><h2>Welcome home.</h2><p className="muted">Sign in for a clearer picture of your money.</p>
    {!configured ? <div className="setup-notice"><h3>Your private space is almost ready.</h3><p>Connect the database, configure authentication, and create your owner account using the setup steps in the project README.</p><code>npm run db:migrate<br />npm run setup:user</code><p className="small">Public registration is disabled. Only the owner can create the first account.</p></div> : <form onSubmit={submit}><label htmlFor="email">Email address</label><input id="email" name="email" type="email" autoComplete="username" placeholder="you@example.com" required /><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="current-password" placeholder="Your private key to a calmer day" required />{error && <p className="form-error" role="alert">{error}</p>}<Button disabled={busy} type="submit">{busy ? <LoaderCircle size={18} className="spin" /> : <>Step inside <ArrowRight size={18} /></>}</Button></form>}
    <p className="login-security"><ShieldCheck size={15} />A private account, just for you.</p></div><span className="login-bottom">A little clarity goes a long way.</span></div></main>;
}
