"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { api, refreshData } from "@/hooks/use-resource";
import { money } from "@/lib/utils";
import { PageHeading } from "./common";
import { Button } from "./ui/button";
import { MoneyInput } from "./money-input";
type CheckpointDraft = { name: string; amount: string };
export function CheckpointCreateScreen() {
  const router = useRouter();
  const [items, setItems] = useState<CheckpointDraft[]>([{ name: "", amount: "0" }]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const total = useMemo(
    () =>
      items.reduce((sum, item) => sum + (/^\d+$/.test(item.amount) ? BigInt(item.amount) : 0n), 0n),
    [items],
  );
  const update = (index: number, patch: Partial<CheckpointDraft>) =>
    setItems(current =>
      current.map((item, position) => (position === index ? { ...item, ...patch } : item)),
    );
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (items.some(item => !item.name.trim() || !/^\d+$/.test(item.amount))) {
      setError("Give every asset a name and a valid amount.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api("/api/assets/checkpoints", { method: "POST", body: JSON.stringify({ items }) });
      refreshData();
      router.push("/assets");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create this checkpoint.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="ASSET CHECKPOINTS"
        title="Create an asset checkpoint"
        description="A timestamped snapshot that stays unchanged."
      >
        <Button variant="secondary" onClick={() => router.push("/assets")} disabled={busy}>
          <ArrowLeft size={18} /> Back
        </Button>
        <Button type="submit" form="checkpoint-form" disabled={busy}>
          {busy ? <LoaderCircle size={18} className="spin" /> : <Check size={18} />} Create
          checkpoint
        </Button>
      </PageHeading>
      <section className="panel checkpoint-create-panel" aria-label="Checkpoint details">
        <form id="checkpoint-form" className="expense-form" onSubmit={save}>
          <div className="checkpoint-drafts">
            {items.map((item, index) => (
              <div className="checkpoint-draft" key={index}>
                <label htmlFor={`checkpoint-name-${index}`}>Asset name</label>
                <input
                  id={`checkpoint-name-${index}`}
                  value={item.name}
                  onChange={e => update(index, { name: e.target.value })}
                  maxLength={80}
                  placeholder="Savings account"
                  disabled={busy}
                />
                <label htmlFor={`checkpoint-amount-${index}`}>Amount</label>
                <div className="checkpoint-amount-row">
                  <div className="amount-input-wrap">
                    <MoneyInput
                      id={`checkpoint-amount-${index}`}
                      value={item.amount}
                      onValueChange={amount => update(index, { amount })}
                      disabled={busy}
                    />
                    <span>₫</span>
                  </div>
                  {items.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ${item.name || "asset"}`}
                      onClick={() =>
                        setItems(current => current.filter((_, position) => position !== index))
                      }
                      disabled={busy}
                    >
                      <Trash2 size={18} />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setItems(current => [...current, { name: "", amount: "0" }])}
            disabled={busy || items.length >= 20}
          >
            <Plus size={17} /> Add another asset
          </Button>
          <div className="checkpoint-total">
            <span>Total assets</span>
            <strong>{money(total)}</strong>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </form>
      </section>
    </>
  );
}
