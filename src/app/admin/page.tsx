"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getCurrentFramer, logout } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import PortalHeader from "@/components/PortalHeader";

type Framer = {
  id: string;
  email: string;
  name: string;
  is_admin: boolean;
};

type ModuleSummary = {
  id: string;
  name: string;
  order: number;
  files: unknown[];
};

export default function AdminDashboard() {
  const [framer, setFramer] = useState<Framer | null>(null);
  const [loading, setLoading] = useState(true);
  const [framerCount, setFramerCount] = useState(0);
  const [downloads, setDownloads] = useState(0);
  const [modules, setModules] = useState<ModuleSummary[]>([]);
  const router = useRouter();

  useEffect(() => {
    async function init() {
      const current = (await getCurrentFramer()) as Framer | null;

      if (!current?.is_admin) {
        router.replace("/");
        return;
      }

      setFramer(current);

      const [framers, logs] = await Promise.all([
        supabase
          .from("certified_framers")
          .select("*", { count: "exact", head: true }),
        supabase
          .from("resource_access_logs")
          .select("*", { count: "exact", head: true }),
      ]);

      setFramerCount(framers.count || 0);
      setDownloads(logs.count || 0);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        const res = await fetch("/api/library", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const body = await res.json();
          setModules(body.modules || []);
        }
      }

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

  const fileCount = modules.reduce((n, m) => n + m.files.length, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <PortalHeader
        framer={framer}
        onSignOut={handleSignOut}
        title="Admin"
        subtitle="Who has access, and what they're using"
        backHref="/"
        backLabel="← Hub"
      />

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-3">
          <StatCard label="Certified Vision Framers" value={framerCount} />
          <StatCard label="Handouts Live" value={fileCount} />
          <StatCard label="Downloads Logged" value={downloads} />
        </div>

        <div className="mb-8 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200">
          <div className="h-1.5 bg-runfree-grad" />
          <div className="p-8">
            <h2 className="font-display text-xl font-bold text-runfree-ink">
              Who has access
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-600">
              Add or remove Certified Vision Framers, and see who has actually created
              their login.
            </p>
            <a
              href="/admin/framers"
              className="mt-6 inline-block rounded-lg bg-runfree-grad px-6 py-2.5 font-semibold text-white transition hover:opacity-90"
            >
              Manage Framers
            </a>
          </div>
        </div>

        <div className="mb-8 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200">
          <div className="h-1.5 bg-runfree-grad" />
          <div className="p-8">
            <h2 className="font-display text-xl font-bold text-runfree-ink">
              Training videos
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-600">
              Paste a Loom, YouTube, Vimeo, or Google Drive link and it plays
              inside the portal. Group a video under a module name to sit it
              alongside those handouts.
            </p>
            <a
              href="/admin/videos"
              className="mt-6 inline-block rounded-lg bg-runfree-grad px-6 py-2.5 font-semibold text-white transition hover:opacity-90"
            >
              Manage Videos
            </a>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200">
          <div className="h-1.5 bg-runfree-grad" />
          <div className="p-8">
            <h2 className="font-display text-xl font-bold text-runfree-ink">
              Managing content
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-600">
              There&rsquo;s nothing to manage here — the portal reads your{" "}
              <span className="font-medium text-runfree-ink">
                Pivvot Handouts (PDF)
              </span>{" "}
              folder directly. Add, rename, reorganise, or delete a file in
              Drive and framers see the change within a minute. Files you move to
              the trash disappear automatically.
            </p>

            <div className="mt-6 space-y-2">
              {modules.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-3 rounded-lg bg-gray-50 px-4 py-2.5 text-sm"
                >
                  {m.order >= 1 && m.order <= 6 && (
                    <Image
                      src={`/brand/modules/${m.order}.png`}
                      alt=""
                      width={24}
                      height={24}
                      className="h-6 w-6 shrink-0 object-contain"
                    />
                  )}
                  <span className="font-medium text-runfree-ink">{m.name}</span>
                  <span className="ml-auto text-gray-500">
                    {m.files.length} {m.files.length === 1 ? "file" : "files"}
                  </span>
                </div>
              ))}
            </div>

            <p className="mt-6 text-xs leading-relaxed text-gray-500">
              To add a new module, create a subfolder in that Drive folder. To
              control ordering, prefix folder and file names with a number
              (&ldquo;1 - …&rdquo;, &ldquo;01 …&rdquo;) as you already do.
            </p>
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
