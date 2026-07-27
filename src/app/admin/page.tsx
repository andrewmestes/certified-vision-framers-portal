"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export default function AdminDashboard() {
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    framers: 0,
    resources: 0,
    accessLogs: 0,
  });
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const isAdminUser = await isAdmin();
    if (!isAdminUser) {
      router.push("/resources");
      return;
    }
    setAuthorized(true);
    loadStats();
  }

  async function loadStats() {
    try {
      const [framer, resource, logs] = await Promise.all([
        supabase.from("certified_framers").select("count()", { count: "exact" }),
        supabase.from("resources").select("count()", { count: "exact" }),
        supabase
          .from("resource_access_logs")
          .select("count()", { count: "exact" }),
      ]);

      setStats({
        framers: framer.count || 0,
        resources: resource.count || 0,
        accessLogs: logs.count || 0,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
  }

  if (!authorized || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Manage resources, users, and settings
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
              Certified Framers
            </h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {stats.framers}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
              Resources
            </h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {stats.resources}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
              Access Logs
            </h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {stats.accessLogs}
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href="/admin/resources/new"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition text-center"
            >
              Add New Resource
            </a>
            <a
              href="/admin/framers"
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium transition text-center"
            >
              Manage Certified Framers
            </a>
            <a
              href="/admin/resources"
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition text-center"
            >
              View All Resources
            </a>
            <a
              href="/admin/logs"
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition text-center"
            >
              View Access Logs
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
