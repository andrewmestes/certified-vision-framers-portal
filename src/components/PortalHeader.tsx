import Image from "next/image";

type Props = {
  framer: { name?: string; is_admin?: boolean } | null;
  onSignOut: () => void;
  title: string;
  subtitle?: string;
  /** Where the "back" affordance points, if this isn't the top-level page. */
  backHref?: string;
  backLabel?: string;
  /**
   * Show the Pivvot certification mark alongside the title. Reserved for the
   * top-level pages — on admin screens it's ceremony that gets in the way.
   */
  badge?: boolean;
};

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/resources", label: "Handouts" },
  { href: "/videos", label: "Videos" },
  { href: "/books", label: "Books" },
  {
    href: "/guide",
    label: "Facilitator's Guide",
    title: "Digital Facilitator's Guide",
  },
];

export default function PortalHeader({
  framer,
  onSignOut,
  title,
  subtitle,
  backHref,
  backLabel,
  badge = false,
}: Props) {
  return (
    <header className="bg-runfree-navy">
      {/* Brand bar */}
      <div className="h-1.5 bg-runfree-grad" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Logo and account controls hold one line at every width; the nav
            drops to its own row on phones and scrolls sideways there rather
            than wrapping to three stacked lines, which was costing over half
            the fold before any content appeared. */}
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3 border-b border-white/10 py-3 sm:py-4">
          <a href="/" className="flex shrink-0 items-center">
            <Image
              src="/brand/runfree-logo-white.png"
              alt="RunFree"
              width={200}
              height={88}
              priority
              className="h-8 w-auto"
            />
          </a>

          <nav className="-mx-4 order-last flex w-[calc(100%+2rem)] items-center gap-x-7 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:order-none sm:mx-0 sm:w-auto sm:flex-1 sm:justify-center sm:overflow-visible sm:px-0 sm:pb-0 sm:gap-x-9">
            {!backHref &&
              NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  title={link.title}
                  className="whitespace-nowrap text-sm font-bold uppercase tracking-wider text-white/70 transition hover:text-white"
                >
                  {link.label}
                </a>
              ))}
            {backHref && (
              <a
                href={backHref}
                className="whitespace-nowrap text-sm font-bold uppercase tracking-wider text-white/70 transition hover:text-white"
              >
                {backLabel || "Back"}
              </a>
            )}
          </nav>

          <div className="flex shrink-0 items-center gap-4 text-sm">
            {framer?.is_admin && (
              <a
                href="/admin"
                className="text-xs font-bold uppercase tracking-wider text-runfree-pink transition hover:text-white"
              >
                Admin
              </a>
            )}
            {framer?.name && (
              <a
                href="/account"
                className="hidden font-medium text-white/60 transition hover:text-white sm:inline"
              >
                {framer.name}
              </a>
            )}
            <button
              onClick={onSignOut}
              className="rounded-lg px-3 py-1.5 font-medium text-white/80 ring-1 ring-white/25 transition hover:text-white hover:ring-white/50"
            >
              Sign out
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-6 py-6 sm:py-8">
          <div className="min-w-0">
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-2 max-w-xl text-white/70">{subtitle}</p>
            )}
          </div>

          {/* Hidden on phones: the certification mark is ceremony, and at this
              width it wraps onto its own row and pushes the actual content
              most of the way off the first screen. */}
          {badge && (
            <Image
              src="/brand/pivvot-badge-white.svg"
              alt="Pivvot Vision Framing — Certified"
              width={280}
              height={280}
              priority
              className="hidden h-24 w-auto shrink-0 opacity-95 sm:block sm:h-32"
            />
          )}
        </div>
      </div>
    </header>
  );
}
