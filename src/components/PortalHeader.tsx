import Image from "next/image";

type Props = {
  framer: { name?: string; is_admin?: boolean } | null;
  onSignOut: () => void;
  title: string;
  subtitle?: string;
  /** Where the "back" affordance points, if this isn't the top-level page. */
  backHref?: string;
  backLabel?: string;
};

export default function PortalHeader({
  framer,
  onSignOut,
  title,
  subtitle,
  backHref,
  backLabel,
}: Props) {
  return (
    <header className="border-b border-gray-200 bg-white">
      {/* Brand bar */}
      <div className="h-1.5 bg-runfree-grad" />

      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <a href="/resources" className="flex items-center gap-3">
          <Image
            src="/brand/runfree-logo.png"
            alt="RunFree"
            width={132}
            height={32}
            priority
            className="h-8 w-auto"
          />
        </a>

        <nav className="flex items-center gap-4 text-sm">
          {backHref && (
            <a
              href={backHref}
              className="font-medium text-gray-500 transition hover:text-runfree-magentaDeep"
            >
              {backLabel || "Back"}
            </a>
          )}
          {framer?.is_admin && (
            <a
              href="/admin"
              className="font-medium text-runfree-magentaDeep transition hover:text-runfree-magenta"
            >
              Admin
            </a>
          )}
          {framer?.name && (
            <span className="hidden text-gray-400 sm:inline">
              {framer.name}
            </span>
          )}
          <button
            onClick={onSignOut}
            className="rounded-lg px-3 py-1.5 font-medium text-gray-600 ring-1 ring-gray-200 transition hover:text-runfree-magentaDeep hover:ring-runfree-magenta/40"
          >
            Sign out
          </button>
        </nav>
      </div>

      {/* Page title */}
      <div className="mx-auto max-w-7xl px-4 pb-8 pt-2 sm:px-6 lg:px-8">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-runfree-ink sm:text-4xl">
          {title}
        </h1>
        {subtitle && <p className="mt-2 text-gray-600">{subtitle}</p>}
      </div>
    </header>
  );
}
