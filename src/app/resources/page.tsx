"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getCurrentFramer, logout } from "@/lib/auth";
import { Resource, ResourceCategory } from "@/types";
import PortalHeader from "@/components/PortalHeader";

type Framer = {
  id: string;
  email: string;
  name: string;
  is_admin: boolean;
};

const CATEGORY_LABEL: Record<ResourceCategory, string> = {
  handout: "Handouts",
  guide: "Guides",
  video: "Videos",
  template: "Templates",
  resource: "Resources",
};

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [framer, setFramer] = useState<Framer | null>(null);
  const [status, setStatus] = useState<"checking" | "denied" | "ready">(
    "checking"
  );
  const [selectedCategory, setSelectedCategory] = useState<
    ResourceCategory | "all"
  >("all");
  const [opening, setOpening] = useState<string | null>(null);
  const [openError, setOpenError] = useState<string>("");
  const router = useRouter();

  const categories = Object.keys(CATEGORY_LABEL) as ResourceCategory[];

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/auth/login");
        return;
      }

      const currentFramer = (await getCurrentFramer()) as Framer | null;

      if (!currentFramer) {
        setStatus("denied");
        return;
      }

      setFramer(currentFramer);

      const { data, error } = await supabase
        .from("resources")
        .select("*")
        .eq("is_published", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading resources:", error);
      } else {
        setResources(data || []);
      }

      setStatus("ready");
    }

    init();
  }, [router]);

  async function handleSignOut() {
    await logout();
    router.replace("/auth/login");
  }

  /**
   * Files are fetched through the portal's gated endpoint rather than a public
   * link, so Drive can keep them private. The endpoint pulls the live bytes,
   * meaning an edit in Drive shows up here on the very next open.
   */
  async function handleOpen(resource: Resource) {
    setOpening(resource.id);
    setOpenError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/auth/login");
        return;
      }

      const res = await fetch(`/api/resources/${resource.id}/file`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setOpenError(body.error || "Could not open that file.");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      setOpenError("Could not open that file.");
    } finally {
      setOpening(null);
    }
  }

  const visible =
    selectedCategory === "all"
      ? resources
      : resources.filter((r) => r.category === selectedCategory);

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
        subtitle="Handouts, facilitator guides, videos, and templates"
      />

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {openError && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {openError}
          </div>
        )}

        {/* Category filter */}
        <div className="mb-8 flex flex-wrap gap-2">
          <FilterChip
            active={selectedCategory === "all"}
            onClick={() => setSelectedCategory("all")}
          >
            All
          </FilterChip>
          {categories.map((cat) => (
            <FilterChip
              key={cat}
              active={selectedCategory === cat}
              onClick={() => setSelectedCategory(cat)}
            >
              {CATEGORY_LABEL[cat]}
            </FilterChip>
          ))}
        </div>

        {visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center">
            <p className="font-display text-lg font-semibold text-runfree-ink">
              Nothing here yet
            </p>
            <p className="mt-2 text-sm text-gray-500">
              {resources.length === 0
                ? "Resources added by an admin will appear here."
                : "No resources in this category."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {visible.map((resource) => (
              <article
                key={resource.id}
                className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 transition hover:shadow-lg"
              >
                <div className="h-1.5 bg-runfree-grad" />
                <div className="flex flex-1 flex-col p-6">
                  <span className="mb-3 inline-flex w-fit rounded-full bg-runfree-pink px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-runfree-magentaDeep">
                    {resource.category}
                  </span>
                  <h3 className="font-display text-lg font-bold leading-snug text-runfree-ink">
                    {resource.title}
                  </h3>
                  {resource.description && (
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-600">
                      {resource.description}
                    </p>
                  )}
                  <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4">
                    <span className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      {resource.file_type}
                    </span>
                    <button
                      onClick={() => handleOpen(resource)}
                      disabled={opening === resource.id}
                      className="rounded-lg bg-runfree-grad px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                    >
                      {opening === resource.id ? "Opening…" : "Open"}
                    </button>
                  </div>
                </div>
              </article>
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
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
        active
          ? "bg-runfree-grad text-white shadow-sm"
          : "bg-white text-gray-600 ring-1 ring-gray-200 hover:ring-runfree-magenta/40"
      }`}
    >
      {children}
    </button>
  );
}
