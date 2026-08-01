"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { getCurrentFramer, logout } from "@/lib/auth";
import PortalHeader from "@/components/PortalHeader";
import PageLoader from "@/components/PageLoader";
import PortalFooter from "@/components/PortalFooter";

type Framer = {
  id: string;
  email: string;
  name: string;
  is_admin: boolean;
};

export default function HubPage() {
  const [framer, setFramer] = useState<Framer | null>(null);
  const [status, setStatus] = useState<"checking" | "denied" | "ready">(
    "checking"
  );
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
      setStatus("ready");
    }
    init();
  }, [router]);

  async function handleSignOut() {
    await logout();
    router.replace("/auth/login");
  }

  if (status === "checking") return <PageLoader label="Checking your access…" />;

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
              Your account is set up, but your email isn&rsquo;t on the
              Certified Vision Framer list yet. Once you&rsquo;re added, sign
              in again to get access.
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
        title="Certified Vision Framer Hub"
        subtitle="Helping leaders run free into what Jesus started"
        badge
      />

      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-12 flex flex-col items-center gap-4 text-center">
          <div className="rounded-2xl bg-white px-6 py-3 shadow-sm ring-1 ring-gray-200">
            <Image
              src="/brand/runfree-logo.png"
              alt="RunFree"
              width={200}
              height={88}
              priority
              className="h-9 w-auto sm:h-11"
            />
          </div>
          {framer?.name && (
            <p className="text-lg text-gray-600">
              Welcome back,{" "}
              <span className="font-semibold text-runfree-ink">
                {framer.name.split(" ")[0]}
              </span>
              .
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <HubCard
            index={1}
            href="/resources"
            icon={<HandoutsIcon />}
            title="Handouts"
            description="Every certification handout, module by module, straight from Drive."
          />
          <HubCard
            index={2}
            href="/videos"
            icon={<VideosIcon />}
            title="Training Videos"
            description="Walkthroughs and coaching for facilitating each tool."
          />
          <HubCard
            index={3}
            href="/books"
            icon={<BooksIcon />}
            title="Will's Books"
            description="Visual summaries, chapters, and full downloads of Will's books."
          />
          <HubCard
            index={4}
            href="/guide"
            icon={<GuideIcon />}
            title="Digital Facilitator's Guide"
            description="The complete training playbook in one file, always current."
          />
          <HubCard
            index={5}
            comingSoon
            icon={<KeynotesIcon />}
            title="Keynotes"
            description="Recorded keynote content for teams and cohorts."
          />
        </div>
      </main>

      <PortalFooter />
    </div>
  );
}

function HubCard({
  href,
  icon,
  title,
  description,
  index,
  comingSoon = false,
}: {
  href?: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  index: number;
  comingSoon?: boolean;
}) {
  const content = (
    <>
      <div className="h-1.5 bg-runfree-grad" />
      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-start justify-between">
          <span
            className={`flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-sm ${
              comingSoon ? "bg-gray-300" : "bg-runfree-grad"
            }`}
          >
            {icon}
          </span>
          <span className="font-display text-2xl font-extrabold text-gray-100">
            {String(index).padStart(2, "0")}
          </span>
        </div>
        <h2 className="mt-4 font-display text-lg font-bold text-runfree-ink">
          {title}
        </h2>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-600">
          {description}
        </p>
        <div className="mt-4">
          {comingSoon ? (
            <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-500">
              Coming soon
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-runfree-magentaDeep">
              Open
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4 transition group-hover:translate-x-0.5"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H4a1 1 0 110-2h8.586l-2.293-2.293a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
          )}
        </div>
      </div>
    </>
  );

  const className =
    "group flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 transition duration-200";

  if (comingSoon) {
    return <div className={`${className} opacity-70`}>{content}</div>;
  }

  return (
    <a
      href={href}
      className={`${className} hover:-translate-y-1 hover:shadow-lg hover:ring-runfree-magenta/30`}
    >
      {content}
    </a>
  );
}

function HandoutsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
      <path
        d="M7 3h7l4 4v13a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M14 3v4h4" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      <path d="M9 12h6M9 15.5h6M9 8.5h2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function VideosIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path d="M10 9.5l5 2.5-5 2.5v-5z" fill="currentColor" />
    </svg>
  );
}

function BooksIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
      <path
        d="M4 5.5C4 4.7 4.7 4 5.5 4H11v16H5.5A1.5 1.5 0 014 18.5v-13z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M20 5.5c0-.8-.7-1.5-1.5-1.5H13v16h5.5a1.5 1.5 0 001.5-1.5v-13z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GuideIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
      <rect x="6" y="3" width="12" height="18" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
      <path d="M9 1.75h6a.75.75 0 01.75.75v2.5H8.25v-2.5A.75.75 0 019 1.75z" fill="currentColor" />
      <path d="M9 11h6M9 14.5h6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function KeynotesIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
      <rect x="9" y="2" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M5.5 11a6.5 6.5 0 0013 0M12 17.5v3M9 20.5h6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}
