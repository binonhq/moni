"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarDays, Landmark, Trash2 } from "lucide-react";
import { useResource, api, refreshData } from "@/hooks/use-resource";
import type { AssetCheckpoint } from "@/lib/types";
import { displayDate } from "@/lib/dates";
import { money } from "@/lib/utils";
import { PageHeading, EmptyState, ErrorNotice, Skeleton } from "./common";
import { Button } from "./ui/button";
import { Confirm } from "./ui/confirm";

export function AssetsScreen() {
  const resource = useResource<{ data: AssetCheckpoint[] }>("/api/assets/checkpoints");
  const data = resource.data?.data;
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
        <Button asChild>
          <Link href="/assets/new">
            <Landmark size={18} /> New checkpoint
          </Link>
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
