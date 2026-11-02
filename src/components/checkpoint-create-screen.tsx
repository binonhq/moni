"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { api, refreshData, useResource } from "@/hooks/use-resource";
import type { AssetCategory, GoldPortfolio } from "@/lib/types";
import { money } from "@/lib/utils";
import { PageHeading, ErrorNotice } from "./common";
import { Button } from "./ui/button";
import { MoneyInput } from "./money-input";
import { AssetCategoryManager } from "./asset-category-manager";
type Draft = {
  key: string;
  categoryId: string;
  amount: string;
  weight: string;
  productCode: string;
};
function draft(): Draft {
  return { key: crypto.randomUUID(), categoryId: "", amount: "0", weight: "", productCode: "" };
}
function milliChi(weight: string) {
  const normalized = weight.trim().replace(",", ".");
  return /^\d+(?:\.\d{1,3})?$/.test(normalized) ? Math.round(Number(normalized) * 1000) : 0;
}
export function CheckpointCreateScreen() {
  const router = useRouter();
  const categories = useResource<{ data: AssetCategory[] }>("/api/assets/categories");
  const gold = useResource<{ data: GoldPortfolio }>("/api/assets/gold");
  const [items, setItems] = useState<Draft[]>([
    { key: "first", categoryId: "", amount: "0", weight: "", productCode: "" },
  ]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const categoryList = categories.data?.data;
  const prices = gold.data?.data.prices;
  const values = useMemo(
    () =>
      items.map(item => {
        const category = categoryList?.find(category => category.id === item.categoryId);
        if (!category) return null;
        if (category.unit === "chi") {
          const weight = milliChi(item.weight),
            price = prices?.find(price => price.productCode === item.productCode);
          return price && weight > 0 && weight <= 1_000_000
            ? (BigInt(price.buyPrice) * BigInt(weight)) / 1000n
            : null;
        }
        return /^\d+$/.test(item.amount) ? BigInt(item.amount) : null;
      }),
    [items, categoryList, prices],
  );
  const total = values.every(value => value !== null)
    ? values.reduce<bigint>((sum, value) => sum + (value ?? 0n), 0n)
    : null;
  function update(key: string, patch: Partial<Draft>) {
    setItems(current => current.map(item => (item.key === key ? { ...item, ...patch } : item)));
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (total === null) {
      setError(
        "Choose an asset category and enter valid amounts. Gold needs a product and positive weight (up to 3 decimals).",
      );
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload = items.map(item =>
        categoryList?.find(category => category.id === item.categoryId)?.unit === "chi"
          ? {
              categoryId: item.categoryId,
              productCode: item.productCode,
              weightMilliChi: milliChi(item.weight),
            }
          : { categoryId: item.categoryId, amount: item.amount },
      );
      await api("/api/assets/checkpoints", {
        method: "POST",
        body: JSON.stringify({ items: payload }),
      });
      refreshData();
      router.push("/assets");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create checkpoint.");
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
        <Button
          type="submit"
          form="checkpoint-form"
          disabled={busy || categories.loading || !categoryList?.length}
        >
          {busy ? <LoaderCircle size={18} className="spin" /> : <Check size={18} />} Create
          checkpoint
        </Button>
      </PageHeading>
      {categories.error && <ErrorNotice message={categories.error} retry={categories.refresh} />}
      <section className="panel checkpoint-create-panel" aria-label="Checkpoint details">
        <form id="checkpoint-form" className="expense-form" onSubmit={save}>
          <div className="checkpoint-drafts">
            {items.map(item => {
              const category = categoryList?.find(category => category.id === item.categoryId);
              return (
                <div className="checkpoint-draft" key={item.key}>
                  <label htmlFor={"category-" + item.key}>Asset category</label>
                  <select
                    id={"category-" + item.key}
                    value={item.categoryId}
                    onChange={e => update(item.key, { categoryId: e.target.value })}
                    disabled={busy || categories.loading}
                    required
                  >
                    <option value="">Choose an asset</option>
                    {categoryList?.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name} ({category.unit === "chi" ? "chỉ" : "VND"})
                      </option>
                    ))}
                  </select>
                  {item.categoryId && !category && (
                    <p className="form-error">This category was deleted. Choose another.</p>
                  )}
                  {category?.unit === "chi" ? (
                    <>
                      <label htmlFor={"product-" + item.key}>Gold product</label>
                      <select
                        id={"product-" + item.key}
                        value={item.productCode}
                        onChange={e => update(item.key, { productCode: e.target.value })}
                        disabled={busy || gold.loading}
                        required
                      >
                        <option value="">Choose a BTMH product</option>
                        {prices?.map(price => (
                          <option key={price.productCode} value={price.productCode}>
                            {price.productName}
                          </option>
                        ))}
                      </select>
                      <label htmlFor={"weight-" + item.key}>Weight (chỉ)</label>
                      <input
                        id={"weight-" + item.key}
                        inputMode="decimal"
                        value={item.weight}
                        onChange={e => update(item.key, { weight: e.target.value })}
                        placeholder="1.5"
                        required
                        disabled={busy}
                      />
                      <p className="muted">
                        Converted using BTMH buy-back prices
                        {gold.data?.data.priceDate ? " dated " + gold.data.data.priceDate : ""}
                        {gold.data?.data.priceStale ? " (cached)" : ""}. The saved VND value stays
                        fixed.
                      </p>
                      {gold.error && <ErrorNotice message={gold.error} retry={gold.refresh} />}
                      {!gold.loading && !prices?.length && (
                        <p className="form-error" role="alert">
                          Gold prices unavailable. Refresh prices before saving.
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <label htmlFor={"amount-" + item.key}>Amount (VND)</label>
                      <div className="amount-input-wrap">
                        <MoneyInput
                          id={"amount-" + item.key}
                          value={item.amount}
                          onValueChange={amount => update(item.key, { amount })}
                          disabled={busy}
                        />
                        <span>₫</span>
                      </div>
                    </>
                  )}
                  {items.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={busy}
                      onClick={() =>
                        setItems(current => current.filter(row => row.key !== item.key))
                      }
                    >
                      <Trash2 size={16} /> Remove asset
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setItems(current => [...current, draft()])}
            disabled={busy || items.length >= 20}
          >
            <Plus size={17} /> Add another asset
          </Button>
          <div className="checkpoint-total">
            <span>Total assets (VND)</span>
            <strong>{total === null ? "Complete asset details" : money(total)}</strong>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </form>
      </section>
      <AssetCategoryManager
        categories={categoryList ?? []}
        refresh={categories.refresh}
        disabled={busy || categories.loading || !!categories.error}
      />
    </>
  );
}
