"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

type GuideFile = {
  id: string;
  name: string;
  title: string;
  sizeBytes: number | null;
  modifiedTime: string | null;
};

function prettyDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function GuidePage() {
  const [framer, setFramer] = useState<Framer | null>(null);
  const [file, setFile] = useState<GuideFile | null>(null);
  const [status, setStatus] = useState<"checking" | "denied" | "ready">(
    "checking"
  );
  const [loadError, setLoadError] = useState("");
  const [preview, setPreview] = useState<PreviewFile | null>(null);
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

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        const res = await fetch("/api/guide", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const body = await res.json();
        if (!res.ok) {
          setLoadError(body.error || "Could not load the guide.");
        } else {
          setFile(body.file);
        }
      }

      setStatus("ready");
    }
    init();
  }, [router]);

  async function handleSignOut() {
    await logout();
    router.replace("/auth/login");
  }

  const fetchBlobUrl = useCallback(async (id: string): Promise<string | null> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return null;

    const res = await fetch(`/api/guide/file/${id}`, {
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
    router.replace("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PortalHeader
        framer={framer}
        onSignOut={handleSignOut}
        title="Digital Facilitator's Guide"
        subtitle="The current guide — always the latest version"
        badge
      />

      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
        {loadError && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {loadError}
          </div>
        )}

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200">
          <div className="h-1.5 bg-runfree-grad" />
          <div className="p-8 text-center">
            {file ? (
              <>
                <h2 className="font-display text-xl font-bold text-runfree-ink">
                  {file.title}
                </h2>
                {file.modifiedTime && (
                  <p className="mt-1 text-sm text-gray-500">
                    Last updated {prettyDate(file.modifiedTime)}
                  </p>
                )}
                <button
                  onClick={() =>
                    setPreview({ ...file, num: null, label: file.title })
                  }
                  className="mt-6 rounded-lg bg-runfree-grad px-8 py-3 text-sm font-semibold text-white transition hover:opacity-90"
                >
                  Open the Guide
                </button>
              </>
            ) : (
              <>
                <h2 className="font-display text-xl font-bold text-runfree-ink">
                  No guide uploaded yet
                </h2>
                <p className="mt-2 text-sm text-gray-500">
                  The Digital Facilitator&rsquo;s Guide will appear here as soon
                  as it&rsquo;s added to Drive.
                </p>
              </>
            )}
          </div>
        </div>
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
