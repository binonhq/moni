"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  Check,
  Coins,
  Landmark,
  LoaderCircle,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useResource, api, refreshData } from "@/hooks/use-resource";
import type { AssetCheckpoint, AssetsResponse, GoldPurchase } from "@/lib/types";
import { displayDate, localInput } from "@/lib/dates";
import { money } from "@/lib/utils";
import { PageHeading, EmptyState, ErrorNotice, Skeleton } from "./common";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./ui/dialog";
import { Confirm } from "./ui/confirm";
import { MoneyInput } from "./money-input";
import { GoldHistoryCard } from "./gold-history-card";

type CheckpointDraft = { name: string; amount: string };
const EMPTY_GOLD_PRICES: AssetsResponse["gold"]["prices"] = [];

function weightLabel(value: number) {
  return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 3 }).format(value / 1000)} chỉ`;
}

function PurchaseDialog({
  open,
  onOpenChange,
  assets,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assets?: AssetsResponse;
}) {
  const [productCode, setProductCode] = useState("");
  const [weight, setWeight] = useState("1");
  const [purchasePrice, setPurchasePrice] = useState("0");
  const [purchasedAt, setPurchasedAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const prices = assets?.gold.prices ?? EMPTY_GOLD_PRICES;
  useEffect(() => {
    if (!open) return;
    setProductCode(prices[0]?.productCode ?? "");
    setWeight("1");
    setPurchasePrice("0");
    setPurchasedAt(localInput(new Date().toISOString()));
    setError(null);
  }, [open, prices]);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    const normalizedWeight = weight.trim().replace(",", ".");
    if (!/^\d+(?:\.\d{1,3})?$/.test(normalizedWeight) || Number(normalizedWeight) <= 0) {
      setError("Enter a weight greater than zero, with up to 3 decimal places.");
      return;
    }
    if (!productCode || !/^\d+$/.test(purchasePrice) || BigInt(purchasePrice) <= 0n) {
      setError("Choose a gold product and enter the total amount you paid.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api("/api/assets/gold", {
        method: "POST",
        body: JSON.stringify({
          productCode,
          weightMilliChi: Math.round(Number(normalizedWeight) * 1000),
          purchasePrice,
          purchasedAt: `${purchasedAt.length === 16 ? purchasedAt + ":00" : purchasedAt}+07:00`,
        }),
      });
      refreshData();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save this gold purchase.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={value => !busy && onOpenChange(value)}>
      <DialogContent
        onOpenAutoFocus={event => {
          event.preventDefault();
          title.current?.focus({ preventScroll: true });
        }}
      >
        <span className="dialog-symbol gold-symbol">
          <Coins size={24} />
        </span>
        <DialogTitle ref={title} tabIndex={-1} className="dialog-title">
          Add a gold purchase
        </DialogTitle>
        <DialogDescription className="muted">Purchased from Bảo Tín Mạnh Hải.</DialogDescription>
        <form className="expense-form" onSubmit={save}>
          <div className="dialog-actions modal-top-actions">
            <Button type="submit" disabled={busy || !prices.length}>
              {busy ? <LoaderCircle size={18} className="spin" /> : <Check size={18} />} Save
              purchase
            </Button>
          </div>
          <label htmlFor="gold-product">Gold product</label>
          <select
            id="gold-product"
            value={productCode}
            onChange={e => setProductCode(e.target.value)}
            disabled={busy || !prices.length}
          >
            {prices.map(price => (
              <option key={price.productCode} value={price.productCode}>
                {price.productName}
              </option>
            ))}
          </select>
          <label htmlFor="gold-weight">
            Weight <span>chỉ</span>
          </label>
          <input
            id="gold-weight"
            inputMode="decimal"
            value={weight}
            onChange={e => setWeight(e.target.value)}
            placeholder="1"
            disabled={busy}
          />
          <label htmlFor="gold-paid">
            Total paid <span>Vietnamese dong</span>
          </label>
          <div className="amount-input-wrap">
            <MoneyInput
              id="gold-paid"
              value={purchasePrice}
              onValueChange={setPurchasePrice}
              disabled={busy}
              required
            />
            <span>₫</span>
          </div>
          <label htmlFor="gold-date">
            Purchase date & time <span>Vietnam · UTC+7</span>
          </label>
          <input
            id="gold-date"
            type="datetime-local"
            step="1"
            value={purchasedAt}
            onChange={e => setPurchasedAt(e.target.value)}
            required
            disabled={busy}
          />
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {!prices.length && (
            <p className="form-error">No BTMH price is available yet. Refresh and try again.</p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}

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
  const resource = useResource<AssetsResponse>("/api/assets");
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [checkpointOpen, setCheckpointOpen] = useState(false);
  const [deleting, setDeleting] = useState<{ kind: "gold" | "checkpoint"; id: string } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [operationError, setOperationError] = useState<string | null>(null);
  const data = resource.data;
  const difference =
    data?.gold.currentValue == null
      ? null
      : BigInt(data.gold.currentValue) - BigInt(data.gold.totalCost);
  async function remove() {
    if (!deleting) return;
    setBusy(true);
    setOperationError(null);
    try {
      const url =
        deleting.kind === "gold"
          ? `/api/assets/gold/${deleting.id}`
          : `/api/assets/checkpoints/${deleting.id}`;
      await api(url, { method: "DELETE" });
      setDeleting(null);
      refreshData();
    } catch (e) {
      setOperationError(e instanceof Error ? e.message : "Could not delete this record.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="WHAT YOU'RE BUILDING"
        title="Your assets, over time."
        description="Track your gold and keep timestamped snapshots of everything you own."
      >
        <Button onClick={() => setCheckpointOpen(true)} variant="secondary">
          <Landmark size={18} /> New checkpoint
        </Button>
        <Button onClick={() => setPurchaseOpen(true)} disabled={!data?.gold.prices.length}>
          <Coins size={18} /> Add gold
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
          <EmptyState
            title="Your assets are unavailable"
            text="Reconnect or refresh to load this page."
          />
        )
      ) : (
        <>
          <div className="asset-metrics">
            <section className="asset-hero gold-hero">
              <div className="asset-card-label">
                <Coins size={17} /> GOLD VALUE · BTMH
              </div>
              <strong>
                {data.gold.currentValue == null
                  ? "Price unavailable"
                  : money(data.gold.currentValue)}
              </strong>
              <span>Cost basis {money(data.gold.totalCost)}</span>
              {difference !== null && (
                <div className={`asset-change ${difference < 0n ? "negative" : "positive"}`}>
                  {difference < 0n ? <TrendingDown size={16} /> : <TrendingUp size={16} />}
                  {difference >= 0n ? "+" : ""}
                  {money(difference)}
                </div>
              )}
            </section>
            <section className="asset-hero checkpoint-hero">
              <div className="asset-card-label">
                <Landmark size={17} /> LATEST CHECKPOINT
              </div>
              <strong>
                {data.checkpoints[0] ? money(data.checkpoints[0].total) : "No checkpoint yet"}
              </strong>
              <span>
                {data.checkpoints[0]
                  ? displayDate(data.checkpoints[0].createdAt, {
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Create your first asset snapshot"}
              </span>
            </section>
          </div>
          <GoldHistoryCard prices={data.gold.prices} />
          <section className="panel asset-panel">
            <div className="panel-heading">
              <div>
                <h2>Gold accumulation</h2>
                <p>Valued at BTMH's current buy-back price.</p>
              </div>
              <span className={`price-status ${data.gold.priceStale ? "stale" : ""}`}>
                {data.gold.priceDate
                  ? `${data.gold.priceStale ? "Cached" : "Updated"} ${data.gold.priceDate}`
                  : "Price unavailable"}
              </span>
            </div>
            {data.gold.purchases.length ? (
              <div className="asset-list">
                {data.gold.purchases.map((purchase: GoldPurchase) => (
                  <div className="asset-row" key={purchase.id}>
                    <span className="asset-row-icon">
                      <Coins size={19} />
                    </span>
                    <div className="asset-row-copy">
                      <strong>{purchase.productName}</strong>
                      <span>
                        {weightLabel(purchase.weightMilliChi)} · bought{" "}
                        {displayDate(purchase.purchasedAt, { year: "numeric" })}
                      </span>
                      <small>Paid {money(purchase.purchasePrice)}</small>
                    </div>
                    <div className="asset-row-value">
                      <strong>{purchase.currentValue ? money(purchase.currentValue) : "—"}</strong>
                      <span>current value</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${purchase.productName} purchase`}
                      onClick={() => setDeleting({ kind: "gold", id: purchase.id })}
                    >
                      <Trash2 size={17} />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No gold purchases yet"
                text="Add each purchase with its product, weight and total price."
              />
            )}
          </section>
          <section className="panel asset-panel checkpoint-panel">
            <div className="panel-heading">
              <div>
                <h2>Asset checkpoints</h2>
                <p>Each snapshot is fixed at the moment you create it.</p>
              </div>
            </div>
            {data.checkpoints.length ? (
              <div className="checkpoint-list">
                {data.checkpoints.map((checkpoint: AssetCheckpoint) => (
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
                        onClick={() => setDeleting({ kind: "checkpoint", id: checkpoint.id })}
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
      <PurchaseDialog open={purchaseOpen} onOpenChange={setPurchaseOpen} assets={data} />
      <CheckpointDialog open={checkpointOpen} onOpenChange={setCheckpointOpen} />
      <Confirm
        open={!!deleting}
        onOpenChange={open => !open && setDeleting(null)}
        title={deleting?.kind === "gold" ? "Delete this gold purchase?" : "Delete this checkpoint?"}
        description="This record will be permanently removed. This cannot be undone."
        onConfirm={remove}
        busy={busy}
      />
    </>
  );
}
