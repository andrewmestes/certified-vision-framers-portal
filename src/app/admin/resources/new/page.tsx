"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentFramer, logout } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { extractDriveId, guessFileType } from "@/lib/drive-id";
import { ResourceCategory } from "@/types";
import PortalHeader from "@/components/PortalHeader";
import { Field, FormError } from "@/components/AuthShell";

type Framer = {
  id: string;
  email: string;
  name: string;
  is_admin: boolean;
};

const CATEGORIES: ResourceCategory[] = [
  "handout",
  "guide",
  "video",
  "template",
  "resource",
];

export default function NewResourcePage() {
  const [framer, setFramer] = useState<Framer | null>(null);
  const [checking, setChecking] = useState(true);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ResourceCategory>("handout");
  const [driveLink, setDriveLink] = useState("");
  const [publish, setPublish] = useState(true);

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function init() {
      const current = (await getCurrentFramer()) as Framer | null;
      if (!current?.is_admin) {
        router.replace("/resources");
        return;
      }
      setFramer(current);
      setChecking(false);
    }
    init();
  }, [router]);

  async function handleSignOut() {
    await logout();
    router.replace("/auth/login");
  }

  const parsedId = driveLink ? extractDriveId(driveLink) : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const driveId = extractDriveId(driveLink);
    if (!driveId) {
      setError(
        "That doesn't look like a Google Drive link. Paste the share link or the file ID."
      );
      return;
    }

    if (!framer) return;
    setSaving(true);

    // RLS ("Admins manage resources") enforces admin rights server-side, so
    // this insert is safe to make directly from the client.
    const { error: insertError } = await supabase.from("resources").insert({
      title,
      description,
      category,
      google_drive_id: driveId,
      file_url: driveLink.trim(),
      file_type: guessFileType(driveLink),
      created_by: framer.id,
      is_published: publish,
    });

    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    router.push("/resources");
  }

  if (checking) {
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
        title="Add a resource"
        subtitle="Point the portal at a file in Drive — it stays in sync automatically"
        backHref="/admin"
        backLabel="← Admin"
      />

      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200">
          <div className="h-1.5 bg-runfree-grad" />
          <form onSubmit={handleSubmit} className="space-y-5 p-8">
            <FormError message={error} />

            <Field id="title" label="Title" value={title} onChange={setTitle} />

            <div>
              <label
                htmlFor="description"
                className="mb-1.5 block text-sm font-medium text-runfree-ink"
              >
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 outline-none transition focus:border-runfree-magenta focus:ring-2 focus:ring-runfree-magenta/25"
              />
            </div>

            <div>
              <label
                htmlFor="category"
                className="mb-1.5 block text-sm font-medium text-runfree-ink"
              >
                Category
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as ResourceCategory)
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 capitalize text-gray-900 outline-none transition focus:border-runfree-magenta focus:ring-2 focus:ring-runfree-magenta/25"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c} className="capitalize">
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="drive"
                className="mb-1.5 block text-sm font-medium text-runfree-ink"
              >
                Google Drive link
              </label>
              <input
                id="drive"
                value={driveLink}
                onChange={(e) => setDriveLink(e.target.value)}
                placeholder="https://docs.google.com/document/d/…"
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-runfree-magenta focus:ring-2 focus:ring-runfree-magenta/25"
              />
              {driveLink && (
                <p
                  className={`mt-1.5 text-xs ${
                    parsedId ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {parsedId
                    ? `Detected file ID: ${parsedId}`
                    : "Couldn't find a file ID in that link"}
                </p>
              )}
            </div>

            <label className="flex items-center gap-2.5 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={publish}
                onChange={(e) => setPublish(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-runfree-magenta focus:ring-runfree-magenta/25"
              />
              Publish immediately
            </label>

            <div className="rounded-lg bg-runfree-indigo/50 px-4 py-3 text-xs leading-relaxed text-gray-600">
              Make sure this file is shared with your service account (Viewer
              access). The file stays private in Drive — the portal fetches it
              on behalf of signed-in framers.
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-runfree-grad px-4 py-2.5 font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Add Resource"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
