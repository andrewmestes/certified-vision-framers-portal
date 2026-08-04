"use client";

/**
 * Shown when we could not find out whether someone has access — a dropped
 * connection, a Supabase hiccup, a bad gateway.
 *
 * Deliberately distinct from the "Access pending" screen. That one is an
 * answer: you are not on the Certified Vision Framer list yet. This one is
 * the absence of an answer, and telling a certified framer their access was
 * pending because their wifi dropped is the kind of thing that generates an
 * email to Andrew asking what went wrong.
 *
 * It also replaces the previous behaviour of that failure, which was to sit
 * on the loading bar indefinitely with no way forward.
 */
export default function AccessError({
  onRetry,
  detail,
}: {
  onRetry: () => void;
  detail?: string | null;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-runfree-indigo/40 px-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="h-1.5 bg-runfree-grad" />
        <div className="p-8 text-center">
          <h1 className="font-display text-2xl font-bold text-runfree-ink">
            We couldn&rsquo;t load your portal
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-gray-600">
            This is almost always a brief connection problem, not a problem
            with your access. Try again in a moment.
          </p>
          <button
            onClick={onRetry}
            className="mt-6 w-full rounded-lg bg-runfree-grad px-4 py-2.5 font-medium text-white outline-none ring-runfree-magenta/60 transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            Try again
          </button>
          <p className="mt-4 text-xs text-gray-500">
            Still stuck?{" "}
            <a
              href="mailto:andrew@runfree.co"
              className="font-medium text-runfree-magentaDeep hover:underline"
            >
              andrew@runfree.co
            </a>
          </p>
          {detail && (
            <p className="mt-3 break-words text-[11px] text-gray-400">
              {detail}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
