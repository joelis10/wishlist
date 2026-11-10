"use client";

import { useEffect, useState } from "react";
import { BellIcon } from "./icons";

type Status = "checking" | "unsupported" | "blocked" | "disabled" | "enabled" | "error";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  const output = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) {
    output[index] = raw.charCodeAt(index);
  }
  return output;
}

export function NotificationSettings({
  publicKey,
  enabled,
}: {
  publicKey: string;
  enabled: boolean;
}) {
  const [status, setStatus] = useState<Status>("checking");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (
        typeof window === "undefined" ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        if (!cancelled) setStatus("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        if (!cancelled) setStatus("blocked");
        return;
      }
      if (!enabled) {
        if (!cancelled) setStatus("disabled");
        return;
      }
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (!cancelled) setStatus(subscription ? "enabled" : "disabled");
      } catch {
        if (!cancelled) setStatus("error");
      }
    }
    void check();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  async function enable() {
    setBusy(true);
    setMessage(null);
    try {
      if (!publicKey) throw new Error("Notifications are not configured on the server.");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "blocked" : "disabled");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
        }));

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!response.ok) throw new Error("Could not save the subscription.");
      setStatus("enabled");
      setMessage("Notifications are on for this device.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Could not enable notifications.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setMessage(null);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      const response = await fetch("/api/push/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription?.endpoint }),
      });
      if (!response.ok) throw new Error("Could not turn notifications off.");
      await subscription?.unsubscribe();
      setStatus("disabled");
      setMessage("Notifications are off.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not turn notifications off.");
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/push/test", { method: "POST" });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not send a test notification.");
      setMessage("Test notification sent.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not send a test notification.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-sm text-muted">
          <BellIcon className="size-4" />
          {status === "checking"
            ? "Checking…"
            : status === "enabled"
              ? "On for this device"
              : status === "blocked"
                ? "Blocked in browser settings"
                : status === "unsupported"
                  ? "Not supported in this browser"
                  : "Off"}
        </span>
        <div className="flex gap-2">
          {status === "enabled" ? (
            <>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => void test()}
                disabled={busy}
              >
                Send test
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => void disable()}
                disabled={busy}
              >
                Turn off
              </button>
            </>
          ) : null}
          {status === "disabled" || status === "error" ? (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => void enable()}
              disabled={busy}
            >
              {busy ? "Enabling…" : "Enable notifications"}
            </button>
          ) : null}
        </div>
      </div>
      {message ? <p className="mt-2 text-xs text-muted">{message}</p> : null}
    </div>
  );
}
