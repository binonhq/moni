"use client";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useDevice } from "@/components/providers";
export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store", credentials: "same-origin", headers: { ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers } });
  if (response.status === 401) { location.replace("/login"); throw new Error("Your session expired. Please sign in again."); }
  if (!response.ok) { const body = await response.json().catch(() => null); throw new Error(body?.error?.message || "Could not connect to Moni. Please try again."); }
  return response.status === 204 ? undefined as T : response.json();
}
export function refreshData() { window.dispatchEvent(new Event("moni:refresh")); }
const pendingRequests = new Set<AbortController>();
const loadingListeners = new Set<() => void>();
const notifyLoading = () => loadingListeners.forEach(listener => listener());
const subscribeLoading = (listener: () => void) => { loadingListeners.add(listener); return () => { loadingListeners.delete(listener); }; };
export function useRefreshing() { return useSyncExternalStore(subscribeLoading, () => pendingRequests.size > 0, () => false); }
export function useResource<T>(url: string, initial?: T) {
  const [data, setData] = useState<T | undefined>(initial);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!initial);
  const { online } = useDevice();
  const request = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    if (!navigator.onLine) return;
    request.current?.abort(); const controller = new AbortController(); request.current = controller;
    setLoading(true); pendingRequests.add(controller); notifyLoading();
    try { const result = await api<T>(url, { signal: controller.signal }); if (!controller.signal.aborted) { setData(result); setError(null); } }
    catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Unable to load data."); }
    finally { pendingRequests.delete(controller); notifyLoading(); if (!controller.signal.aborted) setLoading(false); }
  }, [url]);
  useEffect(() => { setData(initial); void refresh(); return () => request.current?.abort(); }, [refresh, initial]);
  useEffect(() => {
    const onFocus = () => { if (document.visibilityState === "visible") void refresh(); };
    window.addEventListener("moni:refresh", refresh); window.addEventListener("online", refresh); document.addEventListener("visibilitychange", onFocus);
    const timer = setInterval(onFocus, 60000);
    return () => { window.removeEventListener("moni:refresh", refresh); window.removeEventListener("online", refresh); document.removeEventListener("visibilitychange", onFocus); clearInterval(timer); };
  }, [refresh]);
  return { data, error, loading, online, refresh };
}
