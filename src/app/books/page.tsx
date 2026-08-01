"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { getCurrentFramer, logout } from "@/lib/auth";
import PortalHeader from "@/components/PortalHeader";
import PageLoader from "@/components/PageLoader";
import PortalFooter from "@/components/PortalFooter";
import FilePreview, { PreviewFile } from "@/components/FilePreview";

type Framer = {
  id: string;
  email: string;
  name: string;
  is_admin: boolean;
};

type BookFile = {
  id: string;
  name: string;
  title: string;
  num: string | null;
  label: string;
  mimeType: string;
  sizeBytes: number | null;
};

type BookShelf = {
  id: string;
  name: string;
  fullBook: BookFile | null;
  visualSummary: BookFile | null;
  chapters: BookFile[];
  other: BookFile[];
};

type BooksLibrary = {
  books: BookShelf[];
  extras: BookFile[];
};

// Static brand assets, not live-mirrored — book covers are design chrome,
// same reasoning as the Pivvot process icons: they don't change the way the
// underlying files do, so there's nothing to gain from fetching them live.
const COVERS: Record<string, string> = {
  "future church": "/brand/books/future-church.png",
  "church unique": "/brand/books/church-unique.png",
  "god dreams": "/brand/books/god-dreams.png",
  younique: "/brand/books/younique.png",
};

function coverFor(name: string): string | null {
  return COVERS[name.toLowerCase().trim()] || null;
}

function prettySize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function BooksPage() {
  const [framer, setFramer] = useState<Framer | null>(null);
  const [library, setLibrary] = useState<BooksLibrary>({ books: [], extras: [] });
  const [status, setStatus] = useState<"checking" | "denied" | "ready">(
    "checking"
  );
  const [loadError, setLoadError] = useState("");
  const [activeId, setActiveId] = useState<string>("");
  const [preview, setPreview] = useState<PreviewFile | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const load = useCallback(async (fresh = false) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch(`/api/books${fresh ? "?fresh=1" : ""}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const body = await res.json();

    if (!res.ok) {
      setLoadError(body.error || "Could not load the books library.");
      return;
    }

    setLoadError("");
    const books: BookShelf[] = body.books || [];
    setLibrary({ books, extras: body.extras || [] });
    setActiveId((prev) => prev || books[0]?.id || "");
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
      await load();
      setStatus("ready");
    }
    init();
  }, [router, load]);

  async function handleSignOut() {
    await logout();
    router.replace("/auth/login");
  }

  async function handleRefresh() {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  }

  const fetchBlobUrl = useCallback(async (id: string): Promise<string | null> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return null;

    const res = await fetch(`/api/books/file/${id}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) return null;

    const blob = await res.blob();
    return URL.createObjectURL(
      blob.type === "application/pdf"
        ? blob
        : new Blob([blob], { type: "application/pdf" })
    );
  }, []);

  if (status === "checking") return <PageLoader label="Checking your access…" />;

  if (status === "denied") {
    router.replace("/resources");
    return null;
  }

  const active = library.books.find((b) => b.id === activeId) || null;

  return (
    <div className="min-h-screen bg-gray-50">
      <PortalHeader
        framer={framer}
        onSignOut={handleSignOut}
        title="Will's Books"
        subtitle="Visual summaries, chapters, and full downloads"
        badge
      />

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        {loadError && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {loadError}
          </div>
        )}

        {/* Shelf */}
        <div className="mb-4 flex items-start justify-center gap-6 sm:gap-10">
          {library.books.map((b) => {
            const cover = coverFor(b.name);
            const isActive = b.id === activeId;
            return (
              <button
                key={b.id}
                onClick={() => setActiveId(b.id)}
                aria-pressed={isActive}
                className="group flex w-24 flex-col items-center gap-2 outline-none sm:w-32"
              >
                <span
                  className={`relative aspect-[3/4] w-24 overflow-hidden rounded-xl bg-white shadow-sm ring-1 transition duration-300 ease-out sm:w-32 ${
                    isActive
                      ? "-translate-y-1 scale-105 shadow-lg ring-2 ring-runfree-magenta"
                      : "ring-gray-200 group-hover:-translate-y-1 group-hover:scale-105 group-hover:shadow-lg"
                  }`}
                >
                  {cover ? (
                    <Image
                      src={cover}
                      alt={`${b.name} cover`}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center bg-runfree-indigo p-3 text-center text-xs font-semibold text-runfree-navy">
                      {b.name}
                    </span>
                  )}
                </span>
                <span
                  className={`text-center text-[13px] font-semibold leading-tight ${
                    isActive ? "text-runfree-ink" : "text-gray-500 group-hover:text-runfree-ink"
                  }`}
                >
                  {b.name}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mb-8 flex justify-center">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 ring-1 ring-gray-200 transition hover:text-runfree-magentaDeep hover:ring-runfree-magenta/40 disabled:opacity-50"
          >
            {refreshing ? "Refreshing…" : "Refresh from Drive"}
          </button>
        </div>

        {active && (
          <div key={active.id} className="animate-rise space-y-8">
            {/* Featured: visual summary + full book */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FeaturedCard
                label="Visual Summary"
                file={active.visualSummary}
                emptyText="No visual summary yet"
                onOpen={setPreview}
              />
              <FeaturedCard
                label="Full Book"
                file={active.fullBook}
                emptyText="No full book file yet"
                onOpen={setPreview}
              />
            </div>

            {/* Chapters */}
            <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200">
              <div className="h-1 bg-runfree-grad" />
              <header className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
                <h2 className="font-display text-lg font-bold text-runfree-ink">
                  Chapters
                </h2>
                <span className="rounded-full bg-runfree-indigo px-2.5 py-0.5 text-xs font-semibold text-runfree-navy">
                  {active.chapters.length}
                </span>
              </header>

              {active.chapters.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-gray-500">
                  No chapters listed yet.
                </p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {active.chapters.map((f) => (
                    <li key={f.id}>
                      <button
                        onClick={() => setPreview(f)}
                        className="group flex w-full items-center gap-4 px-5 py-3 text-left transition hover:bg-runfree-pink/40"
                      >
                        <span
                          className={`w-10 shrink-0 font-display text-sm font-bold tabular-nums ${
                            f.num ? "text-runfree-magentaDeep" : "text-transparent"
                          }`}
                        >
                          {f.num || "—"}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-runfree-ink">
                          {f.label}
                        </span>
                        <span className="hidden shrink-0 text-xs text-gray-400 sm:inline">
                          {prettySize(f.sizeBytes)}
                        </span>
                        <span className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold text-runfree-magentaDeep opacity-0 ring-1 ring-runfree-magenta/30 transition group-hover:opacity-100">
                          Preview
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Other: workbooks, bullet-books, anything that isn't a chapter */}
            {active.other.length > 0 && (
              <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200">
                <header className="border-b border-gray-100 px-5 py-4">
                  <h2 className="font-display text-lg font-bold text-runfree-ink">
                    More from {active.name}
                  </h2>
                </header>
                <ul className="divide-y divide-gray-100">
                  {active.other.map((f) => (
                    <li key={f.id}>
                      <button
                        onClick={() => setPreview(f)}
                        className="group flex w-full items-center gap-4 px-5 py-3 text-left transition hover:bg-runfree-pink/40"
                      >
                        <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-runfree-ink">
                          {f.title}
                        </span>
                        <span className="hidden shrink-0 text-xs text-gray-400 sm:inline">
                          {prettySize(f.sizeBytes)}
                        </span>
                        <span className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold text-runfree-magentaDeep opacity-0 ring-1 ring-runfree-magenta/30 transition group-hover:opacity-100">
                          Preview
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}

        {library.extras.length > 0 && (
          <section className="mt-12 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200">
            <header className="border-b border-gray-100 px-5 py-4">
              <h2 className="font-display text-lg font-bold text-runfree-ink">
                Other Resources
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Files in the Books folder that aren&rsquo;t tied to one of the
                four books above.
              </p>
            </header>
            <ul className="divide-y divide-gray-100">
              {library.extras.map((f) => (
                <li key={f.id}>
                  <button
                    onClick={() => setPreview(f)}
                    className="group flex w-full items-center gap-4 px-5 py-3 text-left transition hover:bg-runfree-pink/40"
                  >
                    <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-runfree-ink">
                      {f.title}
                    </span>
                    <span className="hidden shrink-0 text-xs text-gray-400 sm:inline">
                      {prettySize(f.sizeBytes)}
                    </span>
                    <span className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold text-runfree-magentaDeep opacity-0 ring-1 ring-runfree-magenta/30 transition group-hover:opacity-100">
                      Preview
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      <PortalFooter />

      {preview && (
        <FilePreview
          file={preview}
          fetchUrl={fetchBlobUrl}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
}

function FeaturedCard({
  label,
  file,
  emptyText,
  onOpen,
}: {
  label: string;
  file: BookFile | null;
  emptyText: string;
  onOpen: (f: BookFile) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200">
      <div className="h-1 bg-runfree-grad" />
      <div className="p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-runfree-magentaDeep">
          {label}
        </p>
        {file ? (
          <>
            <h3 className="mt-1 font-display text-base font-bold text-runfree-ink">
              {file.title}
            </h3>
            <button
              onClick={() => onOpen(file)}
              className="mt-4 rounded-lg bg-runfree-grad px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Open
            </button>
          </>
        ) : (
          <p className="mt-2 text-sm text-gray-500">{emptyText}</p>
        )}
      </div>
    </div>
  );
}
