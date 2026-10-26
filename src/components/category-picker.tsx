"use client";
import { useState } from "react";
import { Plus, Check, LoaderCircle, X } from "lucide-react";
import { api, useResource } from "@/hooks/use-resource";
import { categoryIcons, categoryIconLabels, type CategoryIconName } from "@/lib/categories";
import { categorySchema } from "@/lib/validation";
import type { Category } from "@/lib/types";
import { CategoryIcon } from "./category-icon";
import { Button } from "./ui/button";

export function CategoryPicker({
  value,
  onChange,
  disabled,
  onBusyChange,
}: {
  value: Category | null;
  onChange: (category: Category | null) => void;
  disabled: boolean;
  onBusyChange: (busy: boolean) => void;
}) {
  const categories = useResource<{ data: Category[] }>("/api/categories");
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<CategoryIconName>("tag");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function create() {
    if (busy || disabled) return;
    const parsed = categorySchema.safeParse({ name, icon });
    if (!parsed.success) {
      setError("Enter a category name between 1 and 40 characters.");
      return;
    }
    setBusy(true);
    onBusyChange(true);
    setError(null);
    try {
      const result = await api<{ data: Category }>("/api/categories", {
        method: "POST",
        body: JSON.stringify(parsed.data),
      });
      onChange(result.data);
      setCreating(false);
      setName("");
      setIcon("tag");
      void categories.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create category.");
    } finally {
      setBusy(false);
      onBusyChange(false);
    }
  }
  const options = categories.data?.data ?? [];
  const choices = value && !options.some(c => c.id === value.id) ? [...options, value] : options;
  return (
    <fieldset className="category-picker" disabled={disabled || busy}>
      <legend>Category</legend>
      <div className="category-choices" role="group" aria-label="Expense category">
        <button
          type="button"
          className="category-choice"
          aria-pressed={!value}
          onClick={() => onChange(null)}
        >
          <CategoryIcon name="tag" size={17} />
          <span>Uncategorized</span>
        </button>
        {choices.map(category => (
          <button
            type="button"
            className="category-choice"
            key={category.id}
            aria-pressed={value?.id === category.id}
            onClick={() => onChange(category)}
          >
            <CategoryIcon name={category.icon} size={17} />
            <span>{category.name}</span>
          </button>
        ))}
        <button
          type="button"
          className="category-choice category-new"
          onClick={() => {
            setCreating(v => !v);
            setError(null);
          }}
          aria-expanded={creating}
        >
          <Plus size={17} />
          <span>New category</span>
        </button>
      </div>
      {categories.loading && !categories.data && (
        <p className="small muted" role="status">
          Loading categories…
        </p>
      )}
      {categories.error && (
        <p className="form-error" role="alert">
          {categories.error}{" "}
          <button type="button" className="text-link" onClick={() => void categories.refresh()}>
            Retry
          </button>
        </p>
      )}
      {creating && (
        <div className="category-create">
          <div className="category-create-heading">
            <strong>Create a category</strong>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="Cancel new category"
              onClick={() => setCreating(false)}
            >
              <X size={16} />
            </Button>
          </div>
          <label htmlFor="category-name">Name</label>
          <input
            id="category-name"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") {
                e.preventDefault();
                void create();
              }
            }}
            placeholder="e.g. Hobbies"
            maxLength={40}
            autoComplete="off"
          />
          <span className="small muted" id="category-icon-label">
            Choose an icon
          </span>
          <div className="category-icons" role="group" aria-labelledby="category-icon-label">
            {categoryIcons.map(option => (
              <button
                type="button"
                key={option}
                aria-label={categoryIconLabels[option]}
                title={categoryIconLabels[option]}
                aria-pressed={icon === option}
                onClick={() => setIcon(option)}
              >
                <CategoryIcon name={option} size={20} />
              </button>
            ))}
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <Button
            type="button"
            variant="secondary"
            onClick={create}
            disabled={busy || !name.trim()}
          >
            {busy ? <LoaderCircle size={16} className="spin" /> : <Check size={16} />}Create
            category
          </Button>
        </div>
      )}
    </fieldset>
  );
}
