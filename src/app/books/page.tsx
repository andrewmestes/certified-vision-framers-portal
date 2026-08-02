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
import PdfThumbnail from "@/components/PdfThumbnail";

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
  amazonUrl: string;
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
  calling: "/brand/books/calling.png",
};

function coverFor(name: string): string | null {
  return COVERS[name.toLowerCase().trim()] || null;
}

// Not part of the live-mirrored shelf — this isn't a retail book at all
// (there's no Amazon listing), it's RunFree's own 8-week "Calling for the
// Best of Us" group curriculum, powered by Younique. Still sits on the
// shelf alongside the other four so it isn't a second-class citizen at the
// bottom of the page.
const CALLING_ID = "calling";
const CALLING_BOOK = {
  id: CALLING_ID,
  name: "Calling",
  title: "Calling for the Best of Us",
  description:
    "RunFree's 8-week Calling Group curriculum, powered by Younique — where Younique names an individual's unique design, this is the group experience that helps a team actually activate it. Not a book on Amazon; it's a facilitated program run through RunFree.",
};

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

  /**
   * Navigation is a side effect, so it belongs here rather than in the render
   * body. Calling router.replace() during render violates React's rules and,
   * with reactStrictMode on, ran twice per mount.
   */
  useEffect(() => {
    if (status === "denied") router.replace("/");
  }, [status, router]);

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

  /** Raw bytes for the first-page preview, through the same gated endpoint. */
  const fetchPdfBytes = useCallback(
    async (id: string): Promise<ArrayBuffer | null> => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return null;

      const res = await fetch(`/api/books/file/${id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) return null;
      return res.arrayBuffer();
    },
    []
  );

  if (status === "checking" || status === "denied") {
    return <PageLoader label="Checking your access…" />;
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

        {/* Shelf. Deliberately smaller than it was: at the old size the covers
            plus a centred refresh button filled an entire laptop screen, so a
            framer had to scroll before seeing a single chapter. It scrolls
            sideways on phones rather than wrapping to two ragged rows. */}
        <div className="-mx-4 mb-6 flex items-start gap-5 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:justify-center sm:gap-8 sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden">
          {[...library.books, CALLING_BOOK].map((b) => {
            const cover = coverFor(b.name);
            const isActive = b.id === activeId;
            return (
              <button
                key={b.id}
                onClick={() => setActiveId(b.id)}
                aria-pressed={isActive}
                title={b.name}
                className="group flex w-16 shrink-0 flex-col items-center rounded-xl outline-none ring-runfree-magenta/60 focus-visible:ring-2 focus-visible:ring-offset-2 sm:w-24"
              >
                <span
                  className={`relative aspect-[2/3] w-16 overflow-hidden rounded-lg bg-white shadow-sm transition duration-300 ease-out sm:w-24 ${
                    isActive
                      ? "-translate-y-1 scale-105 shadow-lg ring-2 ring-runfree-magenta/50"
                      : "opacity-75 group-hover:-translate-y-1 group-hover:scale-105 group-hover:opacity-100 group-hover:shadow-lg"
                  }`}
                >
                  {cover ? (
                    <Image
                      src={cover}
                      alt={`${b.name} cover`}
                      fill
                      sizes="(min-width: 640px) 96px, 64px"
                      className="object-contain"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center bg-runfree-indigo p-2 text-center text-[10px] font-semibold text-runfree-navy">
                      {b.name}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {activeId === CALLING_ID && (
          <div className="animate-rise overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200">
            <div className="h-1 bg-runfree-grad" />
            <div className="flex flex-col items-center gap-2 p-8 text-center sm:p-10">
              <Image
                src="/brand/books/calling.png"
                alt=""
                width={90}
                height={79}
                className="mb-2 h-16 w-auto"
              />
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-runfree-magentaDeep">
                Also from RunFree
              </p>
              <h2 className="font-display text-2xl font-bold text-runfree-ink">
                {CALLING_BOOK.title}
              </h2>
              <p className="mx-auto mt-1 max-w-xl text-sm leading-relaxed text-gray-600">
                {CALLING_BOOK.description}
              </p>
            </div>
          </div>
        )}

        {active && (
          <div key={active.id} className="animate-rise space-y-8">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-display text-2xl font-extrabold text-runfree-ink">
                {active.name}
              </h2>
              <a
                href={active.amazonUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-runfree-magentaDeep ring-1 ring-runfree-magenta/30 transition hover:bg-runfree-pink/40"
              >
                Buy on Amazon
                <ExternalIcon />
              </a>
              {/* A maintenance control, so it sits with the other row actions
                  rather than centred on its own under the shelf. */}
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-500 ring-1 ring-gray-200 transition hover:text-runfree-magentaDeep hover:ring-runfree-magenta/40 disabled:opacity-50"
              >
                {refreshing ? "Refreshing…" : "Refresh"}
              </button>
            </div>

            {/* Featured: visual summary + full book */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <VisualSummaryCard
                file={active.visualSummary}
                onOpen={setPreview}
                fetchBytes={fetchPdfBytes}
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

/**
 * The visual summary is, well, visual — it deserves more than a text row.
 * The underlying files are PDFs (no page-image to thumbnail without adding
 * a rendering pipeline), so instead of a literal page preview this gives it
 * its own bold, infographic-styled tile so it reads as "the visual one" at
 * a glance rather than looking like just another download link.
 */
function VisualSummaryCard({
  file,
  onOpen,
  fetchBytes,
}: {
  file: BookFile | null;
  onOpen: (f: BookFile) => void;
  fetchBytes: (id: string) => Promise<ArrayBuffer | null>;
}) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200">
      {file ? (
        <button
          onClick={() => onOpen(file)}
          className="group flex w-full flex-col text-left outline-none ring-runfree-magenta/60 focus-visible:ring-2 focus-visible:ring-inset"
        >
          {/* The summary's own first page, which says far more about what it
              is than any icon could. Falls back to the branded tile when the
              render can't be produced. */}
          {/* object-contain, not cover: these pages are landscape infographics
              and cropping them to a strip threw away the thing that makes a
              visual summary worth showing. */}
          <div className="relative flex aspect-[16/10] items-center justify-center overflow-hidden bg-runfree-indigo">
            <PdfThumbnail
              fileId={file.id}
              fetchBytes={fetchBytes}
              width={520}
              sizeBytes={file.sizeBytes}
              className="h-full w-full object-contain"
              fallback={
                <span className="relative flex h-full w-full items-center justify-center overflow-hidden bg-runfree-grad">
                  <span
                    aria-hidden
                    className="absolute -bottom-6 -right-6 h-28 w-28 rounded-full bg-white/10"
                  />
                  <InfographicIcon />
                </span>
              }
            />
          </div>
          <div className="p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-runfree-magentaDeep">
              Visual Summary
            </p>
            <h3 className="mt-1 font-display text-base font-bold text-runfree-ink">
              {file.title}
            </h3>
            <span className="mt-4 inline-block rounded-lg bg-runfree-grad px-5 py-2 text-sm font-semibold text-white transition group-hover:opacity-90">
              Open
            </span>
          </div>
        </button>
      ) : (
        <div className="p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-runfree-magentaDeep">
            Visual Summary
          </p>
          <p className="mt-2 text-sm text-gray-500">No visual summary yet</p>
        </div>
      )}
    </div>
  );
}

function InfographicIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="relative h-10 w-10 text-white"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="7" height="18" rx="1.5" fill="currentColor" fillOpacity="0.9" />
      <rect x="12" y="9" width="7" height="12" rx="1.5" fill="currentColor" fillOpacity="0.65" />
      <circle cx="18.5" cy="4.5" r="2.5" fill="currentColor" fillOpacity="0.9" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
      <path
        d="M7 4h9v9M16 4L4 16"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
