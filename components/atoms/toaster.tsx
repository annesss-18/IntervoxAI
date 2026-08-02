"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  CheckCircle2,
  XCircle,
  Info,
  AlertTriangle,
  X,
  type LucideIcon,
} from "lucide-react";

type ToastType = "success" | "error" | "info" | "warning";

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

const MAX_VISIBLE = 4;
const EXIT_MS = 200;

const DURATIONS: Record<ToastType, number> = {
  success: 4000,
  info: 4000,
  warning: 5000,
  error: 6000,
};

const ICONS: Record<ToastType, LucideIcon> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

const ICON_COLORS: Record<ToastType, string> = {
  success: "text-success",
  error: "text-error",
  info: "text-info",
  warning: "text-warning",
};

// Module state lets imperative toasts work outside React components.
let items: ToastItem[] = [];
let nextId = 0;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return items;
}

const SERVER_SNAPSHOT: ToastItem[] = [];
function getServerSnapshot() {
  return SERVER_SNAPSHOT;
}

function dismiss(id: number) {
  items = items.filter((item) => item.id !== id);
  notify();
}

function push(type: ToastType, message: string): number {
  const id = nextId++;
  items = [{ id, type, message }, ...items].slice(0, MAX_VISIBLE);
  notify();
  return id;
}

export const toast = {
  success: (message: string) => push("success", message),
  error: (message: string) => push("error", message),
  info: (message: string) => push("info", message),
  warning: (message: string) => push("warning", message),
};

function ToastCard({ item }: { item: ToastItem }) {
  const [closing, setClosing] = useState(false);
  const Icon = ICONS[item.type];
  const isAssertive = item.type === "error" || item.type === "warning";

  useEffect(() => {
    const timer = setTimeout(() => setClosing(true), DURATIONS[item.type]);
    return () => clearTimeout(timer);
  }, [item.type]);

  useEffect(() => {
    if (!closing) return;
    const timer = setTimeout(() => dismiss(item.id), EXIT_MS);
    return () => clearTimeout(timer);
  }, [closing, item.id]);

  return (
    <div
      role={isAssertive ? "alert" : "status"}
      aria-live={isAssertive ? "assertive" : "polite"}
      className={`animate-fade-up flex w-full items-start gap-3 rounded-2xl border border-border bg-card/95 p-4 shadow-[var(--shadow-lg)] backdrop-blur-xl transition-all duration-200 ease-out ${
        closing ? "-translate-y-1 opacity-0" : "translate-y-0 opacity-100"
      }`}
    >
      <Icon
        className={`mt-0.5 h-5 w-5 shrink-0 ${ICON_COLORS[item.type]}`}
        aria-hidden="true"
      />
      <p className="flex-1 text-sm leading-snug text-foreground">
        {item.message}
      </p>
      <button
        type="button"
        onClick={() => setClosing(true)}
        aria-label="Dismiss notification"
        className="shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function Toaster() {
  const visible = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  if (visible.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex flex-col items-center gap-2 px-4"
      aria-label="Notifications"
    >
      {visible.map((item) => (
        <div key={item.id} className="pointer-events-auto w-full max-w-sm">
          <ToastCard item={item} />
        </div>
      ))}
    </div>
  );
}
