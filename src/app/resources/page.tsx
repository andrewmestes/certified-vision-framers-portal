"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getCurrentFramer, logout } from "@/lib/auth";
import { Resource, ResourceCategory } from "@/types";

type Framer = {
  id: string;
  email: string;
  name: string;
  is_admin: boolean;
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
  const router = useRouter();

  const categories: ResourceCategory[] = [
    "handout",
    "guide",
    "video",
    "template",
    "resource",
  ];

  useEffect(() => {
    async function init() {
      // Must be signed in
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/auth/login");
        return;
      }

      // Must be on the certified framers allowlist
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

  async function handleDownload(resource: Resource) {
    if (!framer) return;

    // Log against the framer record, not the auth user id
    const { error } = await supabase.from("resource_access_logs").insert({
      framer_id: framer.id,
      resource_id: resource.id,
      action: "download",
    });

    if (error) {
      console.error("Error logging access:", error);
    }

    window.open(resource.file_url, "_blank", "noopener,noreferrer");
  }

  const visible =
    selectedCategory === "all"
      ? resources
      : resources.filter((r) => r.category === selectedCategory);

  if (status === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Checking your access...</p>
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Access pending
          </h1>
          <p className="text-gray-600 mb-6">
            Your account was created, but your email is not on the Certified
            Vision Framers list yet. Once an admin adds you, sign in again to
            get access.
          </p>
          <button
            onClick={handleSignOut}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Vision Framers Resources
            </h1>
            <p className="text-gray-600 mt-2">
              Access handouts, guides, videos, and more
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {framer?.is_admin && (
              <a
                href="/admin"
                className="text-sm font-medium text-blue-600 hover:underline"
              >
                Admin
              </a>
            )}
            <button
              onClick={handleSignOut}
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Category Filter */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            Filter by Category
          </h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                selectedCategory === "all"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              All Resources
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-lg font-medium capitalize transition ${
                  selectedCategory === cat
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {cat}s
              </button>
            ))}
          </div>
        </div>

        {/* Resources Grid */}
        {visible.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No resources found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visible.map((resource) => (
              <div
                key={resource.id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition"
              >
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-3">
                  <span className="text-white text-xs font-semibold uppercase tracking-wide">
                    {resource.category}
                  </span>
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {resource.title}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4">
                    {resource.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {resource.file_type.toUpperCase()}
                    </span>
                    <button
                      onClick={() => handleDownload(resource)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                    >
                      Download
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
