"use client";
import * as Alert from "@radix-ui/react-alert-dialog";
import { Button } from "./button";
export function Confirm({ open, onOpenChange, title, description, onConfirm, busy, label = "Delete transaction" }: {
  open: boolean; onOpenChange: (open: boolean) => void; title: string; description: string; onConfirm: () => void; busy?: boolean; label?: string;
}) {
  return <Alert.Root open={open} onOpenChange={onOpenChange}><Alert.Portal><Alert.Overlay className="dialog-overlay" /><Alert.Content className="dialog-content confirm-dialog">
    <Alert.Title className="dialog-title">{title}</Alert.Title><Alert.Description className="muted">{description}</Alert.Description>
    <div className="dialog-actions"><Alert.Cancel asChild><Button variant="secondary" disabled={busy}>Keep it</Button></Alert.Cancel><Button variant="destructive" disabled={busy} onClick={onConfirm}>{busy ? "Working…" : label}</Button></div>
  </Alert.Content></Alert.Portal></Alert.Root>;
}
