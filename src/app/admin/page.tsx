"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentFramer, logout } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import PortalHeader from "@/components/PortalHeader";

type Framer = {
  id: string;
  email: string;
  name: string;
  is_admin: boolean;
};

export default function AdminDashboard() {
  const [framer, setFramer] = useState<Framer | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    framers: 0,
    resources: 0,
    accessLogs: 0,
  });
  const router = useRouter();

  useEffect(() => {
    async function init() {
      const current = (await getCurrentFramer()) as Framer | null;

      if (!current?.is_admin) {
        router.replace("/resources");
        return;
      }

      setFramer(current);

      const [framers, resources, logs] = await Promise.all([
        supabase
          .from("certified_framers")
          .select("*", { count: "exact", head: true }),
        supabase.from("resources").select("*", { count: "exact", head: true }),
        supabase
          .from("resource_access_logs")
          .select("*", { count: "exact", head: true }),
      ]);

      setStats({
        framers: framers.count || 0,
        resources: resources.count || 0,
        accessLogs: logs.count || 0,
      });
      setLoading(false);
    }

    init();
  }, [router]);

  async function handleSignOut() {
    await logout();
    router.replace("/auth/login");
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
        framer={framer}
        onSignOut={handleSignOut}
        title="Admin"
        subtitle="Manage resources and certified framers"
        backHref="/resources"
        backLabel="← Resources"
      />

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-3">
          <StatCard label="Certified Framers" value={stats.framers} />
          <StatCard label="Resources" value={stats.resources} />
          <StatCard label="Downloads Logged" value={stats.accessLogs} />
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200">
          <div className="h-1.5 bg-runfree-grad" />
          <div className="p-8">
            <h2 className="font-display text-xl font-bold text-runfree-ink">
              Add a resource
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-600">
              Paste a Google Drive link. The portal stores the file&rsquo;s ID
              rather than a copy, so whenever you edit that file in Drive, framers
              get the updated version the next time they open it.
            </p>
            <a
              href="/admin/resources/new"
              className="mt-6 inline-block rounded-lg bg-runfree-grad px-6 py-2.5 font-semibold text-white transition hover:opacity-90"
            >
              Add New Resource
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </h3>
      <p className="mt-2 font-display text-4xl font-extrabold text-runfree-ink">
        {value}
      </p>
    </div>
  );
}
