"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Check, Landmark, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { useResource, api, refreshData } from "@/hooks/use-resource";
import type { AssetCheckpoint } from "@/lib/types";
import { displayDate } from "@/lib/dates";
import { money } from "@/lib/utils";
import { PageHeading, EmptyState, ErrorNotice, Skeleton } from "./common";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./ui/dialog";
import { Confirm } from "./ui/confirm";
import { MoneyInput } from "./money-input";

type CheckpointDraft = { name: string; amount: string };
function CheckpointDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [items, setItems] = useState<CheckpointDraft[]>([{ name: "", amount: "0" }]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (open) {
      setItems([{ name: "", amount: "0" }]);
      setError(null);
    }
  }, [open]);
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
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create this checkpoint.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={value => !busy && onOpenChange(value)}>
      <DialogContent
        className="checkpoint-dialog"
        onOpenAutoFocus={event => {
          event.preventDefault();
          title.current?.focus({ preventScroll: true });
        }}
      >
        <span className="dialog-symbol">
          <Landmark size={24} />
        </span>
        <DialogTitle ref={title} tabIndex={-1} className="dialog-title">
          Create an asset checkpoint
        </DialogTitle>
        <DialogDescription className="muted">
          A timestamped snapshot that stays unchanged.
        </DialogDescription>
        <form className="expense-form" onSubmit={save}>
          <div className="dialog-actions modal-top-actions">
            <Button type="submit" disabled={busy}>
              {busy ? <LoaderCircle size={18} className="spin" /> : <Check size={18} />} Create
              checkpoint
            </Button>
          </div>
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
      </DialogContent>
    </Dialog>
  );
}

export function AssetsScreen() {
  const resource = useResource<{ data: AssetCheckpoint[] }>("/api/assets/checkpoints");
  const data = resource.data?.data;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [operationError, setOperationError] = useState<string | null>(null);

  async function remove() {
    if (!deleting) return;
    setBusy(true);
    setOperationError(null);
    try {
      await api(`/api/assets/checkpoints/${deleting}`, { method: "DELETE" });
      setDeleting(null);
      refreshData();
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : "Could not delete this record.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="WHAT YOU'RE BUILDING"
        title="Your asset checkpoints."
        description="Keep timestamped snapshots of everything you own."
      >
        <Button onClick={() => setDialogOpen(true)}>
          <Landmark size={18} /> New checkpoint
        </Button>
      </PageHeading>
      {resource.error && <ErrorNotice message={resource.error} retry={resource.refresh} />}
      {operationError && (
        <ErrorNotice message={operationError} retry={() => setOperationError(null)} />
      )}
      {!data ? (
        resource.loading ? (
          <Skeleton />
        ) : (
          <EmptyState title="Data unavailable" text="Reconnect or refresh to load this page." />
        )
      ) : (
        <>
          <div className="feature-metrics">
            <section className="asset-hero checkpoint-hero">
              <div className="asset-card-label">
                <Landmark size={17} /> LATEST CHECKPOINT
              </div>
              <strong>{data[0] ? money(data[0].total) : "No checkpoint yet"}</strong>
              <span>
                {data[0]
                  ? displayDate(data[0].createdAt, {
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Create your first asset snapshot"}
              </span>
            </section>
          </div>
          <section className="panel asset-panel checkpoint-panel">
            <div className="panel-heading">
              <div>
                <h2>Asset checkpoints</h2>
                <p>Each snapshot is fixed at the moment you create it.</p>
              </div>
            </div>
            {data.length ? (
              <div className="checkpoint-list">
                {data.map((checkpoint: AssetCheckpoint) => (
                  <article className="checkpoint-card" key={checkpoint.id}>
                    <header>
                      <div>
                        <span>
                          <CalendarDays size={15} />{" "}
                          {displayDate(checkpoint.createdAt, {
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                          })}
                        </span>
                        <strong>{money(checkpoint.total)}</strong>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Delete checkpoint"
                        onClick={() => setDeleting(checkpoint.id)}
                      >
                        <Trash2 size={17} />
                      </Button>
                    </header>
                    <div className="checkpoint-items">
                      {checkpoint.items.map(item => (
                        <div key={item.id}>
                          <span>{item.name}</span>
                          <strong>{money(item.amount)}</strong>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No checkpoints yet"
                text="Create a snapshot with the names and values of your assets."
              />
            )}
          </section>
        </>
      )}
      <CheckpointDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <Confirm
        open={!!deleting}
        onOpenChange={open => !open && setDeleting(null)}
        title="Delete this checkpoint?"
        description="This record will be permanently removed. This cannot be undone."
        onConfirm={remove}
        busy={busy}
      />
    </>
  );
}
