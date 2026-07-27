"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Resource, ResourceCategory } from "@/types";

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<ResourceCategory | "all">("all");

  const categories: ResourceCategory[] = ["handout", "guide", "video", "template", "resource"];

  useEffect(() => {
    loadResources();
  }, []);

  async function loadResources() {
    try {
      let query = supabase
        .from("resources")
        .select("*")
        .eq("is_published", true)
        .order("created_at", { ascending: false });

      if (selectedCategory !== "all") {
        query = query.eq("category", selectedCategory);
      }

      const { data, error } = await query;
      if (error) throw error;
      setResources(data || []);
    } catch (error) {
      console.error("Error loading resources:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload(resource: Resource) {
    try {
      // Log the access
      await supabase.from("resource_access_logs").insert({
        framer_id: (await supabase.auth.getUser()).data.user?.id || "",
        resource_id: resource.id,
        action: "download",
      });

      // Open the file
      window.open(resource.file_url, "_blank");
    } catch (error) {
      console.error("Error logging access:", error);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Vision Framers Resources
          </h1>
          <p className="text-gray-600 mt-2">
            Access handouts, guides, videos, and more
          </p>
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
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading resources...</p>
          </div>
        ) : resources.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No resources found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resources.map((resource) => (
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
