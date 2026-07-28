"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getCurrentFramer, logout } from "@/lib/auth";
import { parseVideoUrl, PROVIDER_LABEL } from "@/lib/video";
import PortalHeader from "@/components/PortalHeader";
import PageLoader from "@/components/PageLoader";
import PortalFooter from "@/components/PortalFooter";

type Framer = {
  id: string;
  email: string;
  name: string;
  is_admin: boolean;
};

type Video = {
  id: string;
  title: string;
  url: string;
  description: string | null;
  module: string | null;
  sort_order: number;
};

export default function VideosPage() {
  const [framer, setFramer] = useState<Framer | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [status, setStatus] = useState<"checking" | "denied" | "ready">(
    "checking"
  );
  const [playing, setPlaying] = useState<Video | null>(null);
  const router = useRouter();

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

      const { data } = await supabase
        .from("training_videos")
        .select("id,title,url,description,module,sort_order")
        .eq("is_published", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      setVideos(data || []);
      setStatus("ready");
    }

    init();
  }, [router]);

  // Close the player on Escape
  useEffect(() => {
    if (!playing) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPlaying(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing]);

  async function handleSignOut() {
    await logout();
    router.replace("/auth/login");
  }

  if (status === "checking") {
    return <PageLoader label="Checking your access…" />;
  }

  if (status === "denied") {
    router.replace("/resources");
    return null;
  }

  // Group by module, preserving insertion order
  const groups = new Map<string, Video[]>();
  for (const v of videos) {
    const key = v.module?.trim() || "General";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(v);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PortalHeader
        framer={framer}
        onSignOut={handleSignOut}
        title="Training Videos"
        subtitle="Walkthroughs and coaching for facilitating the tools"
        badge
      />

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {videos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center">
            <p className="font-display text-lg font-semibold text-runfree-ink">
              No videos yet
            </p>
            <p className="mt-2 text-sm text-gray-500">
              {framer?.is_admin
                ? "Add one from Admin → Training Videos."
                : "Training videos will appear here as they're added."}
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {[...groups.entries()].map(([module, items]) => (
              <section key={module}>
                <h2 className="mb-4 font-display text-xl font-bold text-runfree-ink">
                  {module}
                </h2>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {items.map((v, i) => {
                    const parsed = parseVideoUrl(v.url);
                    return (
                      <button
                        key={v.id}
                        onClick={() =>
                          parsed.embedUrl
                            ? setPlaying(v)
                            : window.open(parsed.watchUrl, "_blank")
                        }
                        style={
                          {
                            "--delay": `${Math.min(i, 8) * 45}ms`,
                          } as React.CSSProperties
                        }
                        className="animate-rise group overflow-hidden rounded-2xl bg-white text-left shadow-sm ring-1 ring-gray-200 transition duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:ring-runfree-magenta/30"
                      >
                        <div className="relative aspect-video overflow-hidden bg-runfree-sunset">
                          {parsed.thumbnailUrl && (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={parsed.thumbnailUrl}
                              alt=""
                              loading="lazy"
                              className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:opacity-0"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          )}

                          {/* Loom's animated preview, revealed on hover. */}
                          {parsed.animatedUrl && (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={parsed.animatedUrl}
                              alt=""
                              loading="lazy"
                              className="absolute inset-0 h-full w-full object-cover opacity-0 transition duration-300 group-hover:opacity-100"
                            />
                          )}

                          <span className="absolute inset-0 flex items-center justify-center">
                            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/95 shadow-lg transition duration-300 group-hover:scale-110">
                              <svg
                                viewBox="0 0 24 24"
                                className="ml-1 h-6 w-6 fill-runfree-magenta"
                                aria-hidden="true"
                              >
                                <path d="M8 5v14l11-7z" />
                              </svg>
                            </span>
                          </span>

                          {/* Duration sits on the thumbnail, the way every
                              video player does it — not as body copy. */}
                          {v.description && (
                            <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                              {v.description}
                            </span>
                          )}

                          <span className="absolute left-2 top-2 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur">
                            {PROVIDER_LABEL[parsed.provider]}
                          </span>
                        </div>

                        <div className="p-4">
                          <h3 className="font-display text-[15px] font-semibold leading-snug text-runfree-ink">
                            {v.title}
                          </h3>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      <PortalFooter />

      {/* Player */}
      {playing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPlaying(null)}
        >
          <div
            className="w-full max-w-4xl overflow-hidden rounded-2xl bg-black shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between bg-white px-5 py-3">
              <h3 className="font-display text-base font-semibold text-runfree-ink">
                {playing.title}
              </h3>
              <button
                onClick={() => setPlaying(null)}
                className="rounded-lg px-3 py-1 text-sm font-medium text-gray-500 transition hover:text-runfree-magentaDeep"
              >
                Close
              </button>
            </div>
            <div className="aspect-video w-full">
              <iframe
                src={parseVideoUrl(playing.url).embedUrl || ""}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
                title={playing.title}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
