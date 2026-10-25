"use client";
import Link from "next/link";
import { useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, Monitor, Download, Globe2, ShieldCheck, Smartphone, ArrowUpRight, LogOut, KeyRound, ChevronRight, Share, PlusSquare, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { api, useResource } from "@/hooks/use-resource";
import { displayDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { PageHeading, ErrorNotice } from "./common";
import { Button } from "./ui/button";
import { Confirm } from "./ui/confirm";
import { useDevice } from "./providers";
export function SettingsScreen() {
  const { theme, setTheme } = useTheme(); const { online, standalone, iosSafari, install } = useDevice();
  const integration = useResource<{ data: { active: boolean; createdAt: string | null; lastUsedAt: string | null } }>("/api/integration");
  const [revoke, setRevoke] = useState(false); const [busy, setBusy] = useState(false); const [exporting, setExporting] = useState(false); const [changing, setChanging] = useState(false);
  async function revokeToken() { setBusy(true); try { await api("/api/integration", { method: "DELETE" }); toast.success("Shortcut token revoked"); setRevoke(false); void integration.refresh(); } catch (e) { toast.error(e instanceof Error ? e.message : "Could not revoke token."); } finally { setBusy(false); } }
  async function exportCsv() {
    setExporting(true);
    try {
      const response = await fetch("/api/export", { cache: "no-store" });
      if (response.status === 401) { location.replace("/login"); return; }
      if (!response.ok) throw new Error("Could not export your expenses. Please try again.");
      const url = URL.createObjectURL(await response.blob()); const link = document.createElement("a"); link.href = url; link.download = `moni-expenses.csv`; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000); toast.success("Your CSV is ready");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Export failed."); } finally { setExporting(false); }
  }
  async function logout() { setBusy(true); try { await api("/api/auth/sign-out", { method: "POST", body: "{}" }); location.replace("/login"); } catch (e) { toast.error(e instanceof Error ? e.message : "Unable to sign out."); setBusy(false); } }
  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); setChanging(true);
    try { await api("/api/auth/change-password", { method: "POST", body: JSON.stringify({ currentPassword: data.get("current"), newPassword: data.get("next"), revokeOtherSessions: true }) }); toast.success("Password changed. Other sessions have been signed out."); form.reset(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Could not change password."); } finally { setChanging(false); }
  }
  return <><PageHeading eyebrow="MAKE YOURSELF AT HOME" title="Just the way you like it." description="Your preferences, connections, and a little peace of mind." />
    <div className="settings-grid"><div className="settings-column"><section className="panel settings-panel"><h2>Look & feel</h2><p className="muted">A little light. A little dark. Your call.</p><div className="theme-options">{[{ value: "light", label: "Light", icon: Sun }, { value: "dark", label: "Dark", icon: Moon }, { value: "system", label: "System", icon: Monitor }].map(({ value, label, icon: Icon }) => <button key={value} className={cn("theme-option", theme === value && "selected")} onClick={() => setTheme(value)} aria-pressed={theme === value}><span className={`theme-preview theme-preview-${value}`}><i /><i /><i /></span><span><Icon size={15} />{label}</span></button>)}</div></section>
      <section className="panel settings-panel"><h2>The essentials</h2><div className="settings-row"><span className="setting-icon"><Globe2 size={19} /></span><div><strong>Timezone</strong><span>Vietnam · Asia/Ho_Chi_Minh</span></div><span className="setting-value">UTC+7</span></div><div className="settings-row"><span className="setting-icon">₫</span><div><strong>Currency</strong><span>Vietnamese dong</span></div><span className="setting-value">VND</span></div><div className="settings-row"><span className="setting-icon"><ShieldCheck size={19} /></span><div><strong>Private by design</strong><span>One account. Only your finances.</span></div></div></section>
      <section className="panel settings-panel"><h2>Your data, in your hands</h2><p className="muted">Take a copy of every expense, whenever you like.</p><Button variant="secondary" onClick={exportCsv} disabled={!online || exporting}><Download size={17} />{exporting ? "Preparing export…" : "Export transactions to CSV"}</Button><Link href="/transactions" className="settings-link">Review, correct, or delete expenses <ChevronRight size={16} /></Link><p className="small muted">Exports contain private financial data. Keep your backup somewhere you trust.</p></section>
      <section className="panel settings-panel"><h2>Account security</h2><form className="password-form" onSubmit={changePassword}><label htmlFor="current-password">Current password</label><input id="current-password" name="current" type="password" autoComplete="current-password" required /><label htmlFor="new-password">New password</label><input id="new-password" name="next" type="password" autoComplete="new-password" minLength={13} maxLength={128} required placeholder="At least 13 characters" /><Button variant="secondary" disabled={!online || changing}><KeyRound size={17} />{changing ? "Updating…" : "Change password"}</Button></form><Button className="logout-button" variant="ghost" onClick={logout} disabled={!online || busy}><LogOut size={17} />Sign out of Moni</Button></section>
    </div><div className="settings-column"><section className="panel settings-panel integration-panel"><div className="settings-title"><span className="setting-icon mint"><Smartphone size={22} /></span><span className={cn("status-pill", integration.data?.data.active && "connected")}><i />{integration.loading ? "Checking" : integration.data?.data.active ? "Token active" : "Not connected"}</span></div><h2>From your iPhone.<br />Straight to Moni.</h2><p className="muted">Let a Shortcut send your outgoing transactions. Less typing, more living.</p>{integration.error && <ErrorNotice message={integration.error} retry={integration.refresh} />}<Link href="/guide" className="button button-primary">Set up your Shortcut <ArrowUpRight size={17} /></Link>
      <div className="integration-detail"><span>Last token activity</span><strong>{integration.data?.data.lastUsedAt ? displayDate(integration.data.data.lastUsedAt, { year: "numeric", hour: "2-digit", minute: "2-digit" }) : "No activity yet"}</strong></div><details className="token-guide"><summary><KeyRound size={16} />Manage API access</summary><p>Create or rotate your token using <code>npm run token:rotate</code> on the trusted machine connected to your database. The new token appears once in that terminal.</p><p>Paste it into your Shortcut’s Authorization header. Rotation immediately replaces the old token. Moni never sends the token to this browser.</p>{integration.data?.data.active && <Button variant="destructive" onClick={() => setRevoke(true)} disabled={!online || busy}>Revoke current token</Button>}</details>
    </section>
    {!standalone && <section className="panel settings-panel install-panel"><span className="setting-icon"><Smartphone size={22} /></span><h2>At home on your Home Screen.</h2><p className="muted">Your finances, one tap away. Moni opens in its own calm, full-screen space.</p>{iosSafari ? <ol className="install-steps"><li><span>1</span>Open Safari’s Share menu <Share size={17} /></li><li><span>2</span>Select Add to Home Screen <PlusSquare size={17} /></li><li><span>3</span>Enable Open as Web App</li><li><span>4</span>Tap Add. Make yourself at home.</li></ol> : install ? <Button variant="secondary" onClick={() => void install.prompt()}>Install Moni</Button> : <p className="small muted">On iPhone, open Moni in Safari. Tap Share → Add to Home Screen, enable Open as Web App, then tap Add. On other browsers, use the browser’s installation menu when available.</p>}</section>}
    {standalone && <div className="installed-note"><CheckCircle2 size={18} />You’re using Moni as an installed app.</div>}
    <p className="settings-footnote">Moni 1.0<br />A little clarity goes a long way.</p></div></div>
    <Confirm open={revoke} onOpenChange={setRevoke} title="Disconnect your Shortcut?" description="The current ingestion token will stop working immediately. Existing expenses stay safe. Generate a new token in your trusted terminal to reconnect." label="Revoke token" onConfirm={revokeToken} busy={busy} />
  </>;
}
