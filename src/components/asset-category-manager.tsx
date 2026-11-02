"use client";
import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { AssetCategory } from "@/lib/types";
import { api } from "@/hooks/use-resource";
import { Button } from "./ui/button";
import { Confirm } from "./ui/confirm";
export function AssetCategoryManager({
  categories,
  refresh,
  disabled,
}: {
  categories: AssetCategory[];
  refresh: () => void;
  disabled: boolean;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState<"vnd" | "chi">("vnd");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<AssetCategory | null>(null);
  function reset() {
    setEditing(null);
    setName("");
    setUnit("vnd");
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api(editing ? "/api/assets/categories/" + editing : "/api/assets/categories", {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify({ name, unit }),
      });
      reset();
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save category.");
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!deleting) return;
    setBusy(true);
    setError(null);
    try {
      await api("/api/assets/categories/" + deleting.id, { method: "DELETE" });
      if (editing === deleting.id) reset();
      setDeleting(null);
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete category.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="panel asset-category-manager">
      <summary>Manage asset categories</summary>
      <p className="muted">Changes apply to new checkpoints. Saved snapshots stay unchanged.</p>
      <ul className="asset-category-list">
        {categories.map(category => (
          <li key={category.id}>
            <span>
              {category.name} <small>({category.unit === "chi" ? "chỉ" : "VND"})</small>
            </span>
            <Button
              variant="ghost"
              size="icon"
              disabled={busy || disabled}
              aria-label={"Edit " + category.name}
              onClick={() => {
                setEditing(category.id);
                setName(category.name);
                setUnit(category.unit);
              }}
            >
              <Pencil size={16} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              disabled={busy || disabled}
              aria-label={"Delete " + category.name}
              onClick={() => setDeleting(category)}
            >
              <Trash2 size={16} />
            </Button>
          </li>
        ))}
      </ul>
      <form className="expense-form" onSubmit={save}>
        <label htmlFor="asset-category-name">
          {editing ? "Edit asset category" : "New asset category"}
        </label>
        <input
          id="asset-category-name"
          value={name}
          onChange={e => setName(e.target.value)}
          required
          maxLength={80}
          disabled={busy || disabled}
        />
        <label htmlFor="asset-category-unit">Unit</label>
        <select
          id="asset-category-unit"
          value={unit}
          onChange={e => setUnit(e.target.value as "vnd" | "chi")}
          disabled={busy || disabled}
        >
          <option value="vnd">VND</option>
          <option value="chi">Gold · chỉ</option>
        </select>
        <div className="checkpoint-form-actions">
          <Button type="submit" disabled={busy || disabled}>
            {editing ? "Save category" : "Add category"}
          </Button>
          {editing && (
            <Button type="button" variant="secondary" onClick={reset} disabled={busy || disabled}>
              Cancel
            </Button>
          )}
        </div>
      </form>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <Confirm
        open={!!deleting}
        onOpenChange={open => !busy && !open && setDeleting(null)}
        title={"Delete " + (deleting?.name ?? "category") + "?"}
        description="Existing checkpoints keep their saved names and amounts."
        busy={busy}
        onConfirm={remove}
      />
    </details>
  );
}
