"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { getCurrentFramer, logout } from "@/lib/auth";
import PortalHeader from "@/components/PortalHeader";

type Framer = {
  id: string;
  email: string;
  name: string;
  is_admin: boolean;
};

type PortalFile = {
  id: string;
  name: string;
  title: string;
  mimeType: string;
  sizeBytes: number | null;
  modifiedTime: string | null;
};

type PortalModule = {
  id: string;
  name: string;
  /** Leading number of the Drive folder — also picks the Pivvot icon. */
  order: number;
  files: PortalFile[];
};

/** Pivvot process icons, keyed by module number (RUNFREE-LOGO-PACK, Blue PNG). */
function moduleIcon(order: number): string | null {
  return order >= 1 && order <= 6 ? `/brand/modules/${order}.png` : null;
}

function prettySize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ResourcesPage() {
  const [framer, setFramer] = useState<Framer | null>(null);
  const [modules, setModules] = useState<PortalModule[]>([]);
  const [status, setStatus] = useState<"checking" | "denied" | "ready">(
    "checking"
  );
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [activeModule, setActiveModule] = useState<string>("all");
  const [opening, setOpening] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const loadLibrary = useCallback(async (fresh = false) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) return;

    const res = await fetch(`/api/library${fresh ? "?fresh=1" : ""}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    const body = await res.json();

    if (!res.ok) {
      setLoadError(body.error || "Could not load the library.");
      return;
    }

    setLoadError("");
    setModules(body.modules || []);
  }, []);

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/auth/login");
        return;
      }

      const current = (await getCurrentFramer()) as Framer | null;

      if (!current) {
        setStatus("denied");
        return;
      }

      setFramer(current);
      await loadLibrary();
      setStatus("ready");
    }

    init();
  }, [router, loadLibrary]);

  async function handleSignOut() {
    await logout();
    router.replace("/auth/login");
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadLibrary(true);
    setRefreshing(false);
  }

  async function handleOpen(file: PortalFile) {
    setOpening(file.id);
    setLoadError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/auth/login");
        return;
      }

      const res = await fetch(`/api/library/file/${file.id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setLoadError(body.error || "Could not open that file.");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      setLoadError("Could not open that file.");
    } finally {
      setOpening(null);
    }
  }

  const needle = query.trim().toLowerCase();
  const shown = modules
    .filter((m) => activeModule === "all" || m.id === activeModule)
    .map((m) => ({
      ...m,
      files: needle
        ? m.files.filter((f) => f.title.toLowerCase().includes(needle))
        : m.files,
    }))
    .filter((m) => m.files.length > 0);

  const totalShown = shown.reduce((n, m) => n + m.files.length, 0);

  if (status === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-1.5 w-24 rounded-full bg-runfree-grad" />
          <p className="text-sm text-gray-500">Checking your access…</p>
        </div>
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-runfree-indigo/40 px-4">
        <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
          <div className="h-1.5 bg-runfree-grad" />
          <div className="p-8 text-center">
            <h1 className="font-display text-2xl font-bold text-runfree-ink">
              Access pending
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              Your account is set up, but your email isn&rsquo;t on the Certified
              Vision Framers list yet. Once you&rsquo;re added, sign in again to
              get access.
            </p>
            <button
              onClick={handleSignOut}
              className="mt-6 w-full rounded-lg bg-runfree-grad px-4 py-2.5 font-medium text-white transition hover:opacity-90"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PortalHeader
        framer={framer}
        onSignOut={handleSignOut}
        title="Vision Framers Resources"
        subtitle="Your certification handouts, straight from the source folder"
      />

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {loadError && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {loadError}
          </div>
        )}

        {/* Search + module filter */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search handouts…"
              className="w-full max-w-sm rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition placeholder:text-gray-400 focus:border-runfree-magenta focus:ring-2 focus:ring-runfree-magenta/25"
            />
            <span className="text-sm text-gray-500">
              {totalShown} {totalShown === 1 ? "handout" : "handouts"}
            </span>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="ml-auto rounded-lg px-3 py-2 text-sm font-medium text-gray-600 ring-1 ring-gray-200 transition hover:text-runfree-magentaDeep hover:ring-runfree-magenta/40 disabled:opacity-50"
            >
              {refreshing ? "Refreshing…" : "Refresh from Drive"}
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <FilterChip
              active={activeModule === "all"}
              onClick={() => setActiveModule("all")}
            >
              All
            </FilterChip>
            {modules.map((m) => (
              <FilterChip
                key={m.id}
                active={activeModule === m.id}
                onClick={() => setActiveModule(m.id)}
                icon={moduleIcon(m.order)}
              >
                {m.name}
              </FilterChip>
            ))}
          </div>
        </div>

        {shown.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center">
            <p className="font-display text-lg font-semibold text-runfree-ink">
              {modules.length === 0 ? "Nothing here yet" : "No matches"}
            </p>
            <p className="mt-2 text-sm text-gray-500">
              {modules.length === 0
                ? "Files added to the shared Drive folder will appear here automatically."
                : "Try a different search."}
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {shown.map((mod) => (
              <section key={mod.id}>
                <div className="mb-4 flex items-center gap-3">
                  {moduleIcon(mod.order) && (
                    <Image
                      src={moduleIcon(mod.order) as string}
                      alt=""
                      width={44}
                      height={44}
                      className="h-11 w-11 shrink-0 object-contain"
                    />
                  )}
                  <h2 className="font-display text-xl font-bold text-runfree-ink">
                    {mod.name}
                  </h2>
                  <span className="text-sm text-gray-400">
                    {mod.files.length}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {mod.files.map((file) => (
                    <article
                      key={file.id}
                      className="flex flex-col overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200 transition hover:shadow-md"
                    >
                      <div className="h-1 bg-runfree-grad" />
                      <div className="flex flex-1 flex-col p-5">
                        <h3 className="font-display text-base font-semibold leading-snug text-runfree-ink">
                          {file.title}
                        </h3>
                        <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
                          <span className="text-xs text-gray-400">
                            {prettySize(file.sizeBytes)}
                          </span>
                          <button
                            onClick={() => handleOpen(file)}
                            disabled={opening === file.id}
                            className="rounded-lg bg-runfree-grad px-4 py-1.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                          >
                            {opening === file.id ? "Opening…" : "Open"}
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon?: string | null;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-full py-2 text-sm font-medium transition ${
        icon ? "pl-2 pr-4" : "px-4"
      } ${
        active
          ? "bg-runfree-grad text-white shadow-sm"
          : "bg-white text-gray-600 ring-1 ring-gray-200 hover:ring-runfree-magenta/40"
      }`}
    >
      {icon && (
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
            active ? "bg-white/90" : "bg-transparent"
          }`}
        >
          <Image
            src={icon}
            alt=""
            width={20}
            height={20}
            className="h-5 w-5 object-contain"
          />
        </span>
      )}
      {children}
    </button>
  );
}
