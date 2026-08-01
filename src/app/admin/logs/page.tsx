"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getCurrentFramer, logout } from "@/lib/auth";
import PortalHeader from "@/components/PortalHeader";

type Me = { id: string; email: string; name: string; is_admin: boolean };

type FramerOption = { id: string; name: string; email: string };

type LogEntry = {
  id: string;
  source: "library" | "books" | "guide";
  resourceName: string;
  module: string | null;
  accessedAt: string;
  framerName: string;
  framerEmail: string;
};

const SOURCE_LABEL: Record<LogEntry["source"], string> = {
  library: "Handouts",
  books: "Books",
  guide: "Facilitator's Guide",
};

export default function AccessLogsPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [framers, setFramers] = useState<FramerOption[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  const [framerId, setFramerId] = useState("");
  const [source, setSource] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [q, setQ] = useState("");

  const router = useRouter();

  const authedFetch = useCallback(
    async (url: string, init?: RequestInit) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/auth/login");
        throw new Error("No session");
      }

      return fetch(url, {
        ...init,
        headers: {
          ...(init?.headers || {}),
          Authorization: `Bearer ${session.access_token}`,
        },
      });
    },
    [router]
  );

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    if (framerId) params.set("framerId", framerId);
    if (source) params.set("source", source);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (q.trim()) params.set("q", q.trim());
    return params;
  }, [framerId, source, from, to, q]);

  const loadLogs = useCallback(async () => {
    setFetching(true);
    setError("");
    try {
      const res = await authedFetch(`/api/admin/logs?${buildQuery()}`);
      const body = await res.json();

      if (!res.ok) {
        setError(body.error || "Could not load access logs.");
        return;
      }

      setLogs(body.logs || []);
    } finally {
      setFetching(false);
    }
  }, [authedFetch, buildQuery]);

  useEffect(() => {
    async function init() {
      const current = (await getCurrentFramer()) as Me | null;

      if (!current?.is_admin) {
        router.replace("/resources");
        return;
      }

      setMe(current);

      const res = await authedFetch("/api/admin/framers");
      if (res.ok) {
        const body = await res.json();
        setFramers(
          (body.framers || []).map((f: FramerOption) => ({
            id: f.id,
            name: f.name,
            email: f.email,
          }))
        );
      }

      await loadLogs();
      setLoading(false);
    }

    init();
    // Only run once on mount — filtered reloads are triggered explicitly below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSignOut() {
    await logout();
    router.replace("/auth/login");
  }

  async function handleFilter(e: React.FormEvent) {
    e.preventDefault();
    await loadLogs();
  }

  async function handleExport() {
    setExporting(true);
    try {
      const params = buildQuery();
      params.set("format", "csv");
      const res = await authedFetch(`/api/admin/logs?${params}`);
      if (!res.ok) {
        setError("Could not build the export.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "access-logs.csv";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } finally {
      setExporting(false);
    }
  }

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-1.5 w-24 rounded-full bg-runfree-grad" />
          <p className="text-sm text-gray-500">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PortalHeader
        framer={me}
        onSignOut={handleSignOut}
        title="Access Logs"
        subtitle="Who opened what, and when"
        backHref="/admin"
        backLabel="← Admin"
      />

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form
          onSubmit={handleFilter}
          className="mb-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200"
        >
          <div className="h-1.5 bg-runfree-grad" />
          <div className="flex flex-wrap items-end gap-3 p-6">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Framer
              </label>
              <select
                value={framerId}
                onChange={(e) => setFramerId(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-runfree-magenta focus:ring-2 focus:ring-runfree-magenta/25"
              >
                <option value="">Everyone</option>
                {framers.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Source
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-runfree-magenta focus:ring-2 focus:ring-runfree-magenta/25"
              >
                <option value="">Everywhere</option>
                <option value="library">Handouts</option>
                <option value="books">Books</option>
                <option value="guide">Facilitator&rsquo;s Guide</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                From
              </label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-runfree-magenta focus:ring-2 focus:ring-runfree-magenta/25"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                To
              </label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-runfree-magenta focus:ring-2 focus:ring-runfree-magenta/25"
              />
            </div>

            <div className="flex flex-1 min-w-[10rem] flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Search
              </label>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="File or module name…"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none placeholder:text-gray-400 focus:border-runfree-magenta focus:ring-2 focus:ring-runfree-magenta/25"
              />
            </div>

            <button
              type="submit"
              disabled={fetching}
              className="rounded-lg bg-runfree-grad px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {fetching ? "Filtering…" : "Filter"}
            </button>

            <button
              type="button"
              onClick={handleExport}
              disabled={exporting || logs.length === 0}
              className="rounded-lg px-5 py-2 text-sm font-medium text-gray-600 ring-1 ring-gray-200 transition hover:text-runfree-magentaDeep hover:ring-runfree-magenta/40 disabled:opacity-40"
            >
              {exporting ? "Exporting…" : "Export CSV"}
            </button>
          </div>
        </form>

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200">
          {logs.length === 0 ? (
            <p className="px-6 py-12 text-center text-sm text-gray-500">
              No access logged for these filters yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <th className="px-6 py-3">Framer</th>
                    <th className="px-6 py-3">File</th>
                    <th className="px-6 py-3">Module</th>
                    <th className="px-6 py-3">Source</th>
                    <th className="px-6 py-3">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td className="px-6 py-3">
                        <div className="font-medium text-runfree-ink">
                          {log.framerName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {log.framerEmail}
                        </div>
                      </td>
                      <td className="px-6 py-3 text-runfree-ink">
                        {log.resourceName}
                      </td>
                      <td className="px-6 py-3 text-gray-500">
                        {log.module || "—"}
                      </td>
                      <td className="px-6 py-3">
                        <span className="rounded-full bg-runfree-pink px-2.5 py-1 text-xs font-medium text-runfree-magentaDeep">
                          {SOURCE_LABEL[log.source]}
                        </span>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-gray-500">
                        {fmtDate(log.accessedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="mt-4 text-xs leading-relaxed text-gray-500">
          Showing up to 500 most recent matches. Narrow the filters to find
          older activity.
        </p>
      </main>
    </div>
  );
}
