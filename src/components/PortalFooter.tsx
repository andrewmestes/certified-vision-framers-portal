import Image from "next/image";

/**
 * Usage rights + copyright.
 *
 * Deliberately placed on every framer-facing page rather than buried on a
 * terms page: the whole point of a gated portal is that the material inside
 * it carries conditions, and those conditions should be visible next to the
 * download button that acts on them.
 */
export default function PortalFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-8">
          <div className="max-w-xl">
            <h2 className="font-display text-sm font-bold uppercase tracking-[0.08em] text-runfree-ink">
              Usage rights
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              These materials are licensed to you as a Certified Vision Framer
              for use with the churches and teams you personally facilitate.
              You&rsquo;re free to print, present, and distribute them to the
              teams you&rsquo;re walking through the process.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              Please don&rsquo;t redistribute them to other facilitators, post
              them publicly, or reproduce them in your own paid materials.
              Certification is what carries the license &mdash; it doesn&rsquo;t
              transfer with the files.
            </p>
          </div>

          <div className="flex flex-col items-start gap-4">
            <Image
              src="/brand/runfree-logo.png"
              alt="RunFree"
              width={120}
              height={30}
              className="h-7 w-auto"
            />
            <p className="text-xs leading-relaxed text-gray-500">
              &copy; {year} RunFree. All rights reserved.
              <br />
              Pivvot, the Vision Frame, and the Horizon Storyline
              <br />
              are trademarks of RunFree.
            </p>
          </div>
        </div>

        <p className="mt-8 border-t border-gray-100 pt-6 text-xs text-gray-500">
          Questions about permitted use? Contact{" "}
          <a
            href="mailto:andrew@runfree.co"
            className="font-medium text-runfree-magentaDeep hover:underline"
          >
            andrew@runfree.co
          </a>
          .
        </p>
      </div>
    </footer>
  );
}
