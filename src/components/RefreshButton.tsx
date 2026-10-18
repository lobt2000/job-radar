"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type Status = {
  status: string;
  message: string;
  stats?: {
    companiesUpserted?: number;
    vacanciesUpserted?: number;
    companiesFailed?: number;
    companiesSkipped?: number;
    careersDiscovered?: number;
    progressCurrent?: number;
    progressTotal?: number;
  } | null;
};

export function RefreshButton() {
  const router = useRouter();
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);

  const poll = useCallback(async () => {
    const res = await fetch("/api/refresh", { cache: "no-store" });
    const data = (await res.json()) as Status;
    setStatus(data);
    if (data.status === "running") {
      setBusy(true);
      return true;
    }
    setBusy(false);
    router.refresh();
    return false;
  }, [router]);

  useEffect(() => {
    void poll();
  }, [poll]);

  useEffect(() => {
    if (!busy) return;
    const id = setInterval(() => {
      void poll().then((still) => {
        if (!still) clearInterval(id);
      });
    }, 1500);
    return () => clearInterval(id);
  }, [busy, poll]);

  async function onRefresh() {
    setBusy(true);
    setStatus({ status: "running", message: "Starting…" });
    await fetch("/api/refresh", { method: "POST" });
    await poll();
  }

  const progress = status?.stats;
  const pct =
    progress?.progressTotal && progress.progressTotal > 0
      ? Math.round(
          ((progress.progressCurrent ?? 0) / progress.progressTotal) * 100,
        )
      : null;

  return (
    <div className="flex min-w-[12rem] flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => void onRefresh()}
        disabled={busy}
        className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {busy ? "Refreshing…" : "Refresh"}
      </button>
      {pct != null && busy ? (
        <div className="h-1.5 w-40 overflow-hidden rounded-full bg-[var(--line)]">
          <div
            className="h-full bg-[var(--accent)] transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      ) : null}
      {status?.message ? (
        <p className="max-w-xs text-right text-xs text-[var(--muted)]">
          {status.message}
        </p>
      ) : null}
    </div>
  );
}
