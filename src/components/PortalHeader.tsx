"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type Props = {
  framer: { name?: string; is_admin?: boolean } | null;
  onSignOut: () => void;
  title: string;
  subtitle?: string;
  /** Small line above the title — used for the personal greeting on the hub. */
  eyebrow?: string;
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
  eyebrow,
  backHref,
  backLabel,
  badge = false,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  // Escape closes it, matching every other dismissible surface in the portal.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const links = backHref
    ? [{ href: backHref, label: backLabel || "Back", title: undefined }]
    : NAV_LINKS;

  return (
    <header className="bg-runfree-navy">
      {/* Brand bar */}
      <div className="h-1.5 bg-runfree-grad" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-x-8 border-b border-white/10 py-3 sm:py-4">
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

          {/* Desktop nav. Below sm it collapses into the menu — a sideways
              scroll strip with hidden scrollbars gave no sign the links past
              the edge existed at all, so the Facilitator's Guide was simply
              invisible on a phone. */}
          <nav className="hidden flex-1 items-center justify-center gap-x-9 sm:flex">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                title={link.title}
                className="whitespace-nowrap text-sm font-bold uppercase tracking-wider text-white/70 transition hover:text-white"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden shrink-0 items-center gap-4 text-sm sm:flex">
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
                className="font-medium text-white/60 transition hover:text-white"
              >
                {framer.name}
              </a>
            )}
            <button
              onClick={onSignOut}
              className="rounded-lg px-3 py-1.5 font-medium text-white/80 outline-none ring-1 ring-white/25 transition hover:text-white hover:ring-white/50 focus-visible:ring-2 focus-visible:ring-white"
            >
              Sign out
            </button>
          </div>

          {/* 44px square: Apple's minimum comfortable tap target. */}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-controls="portal-mobile-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="-mr-2 ml-auto flex h-11 w-11 items-center justify-center rounded-lg text-white outline-none ring-white/25 transition hover:bg-white/10 focus-visible:ring-2 sm:hidden"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="h-6 w-6"
              aria-hidden="true"
            >
              {menuOpen ? (
                <path d="M6 6l12 12M18 6L6 18" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Expands in place rather than covering the page: nothing here needs
            to overlay content, and a panel that pushes cannot strand someone
            behind an invisible backdrop. */}
        {menuOpen && (
          <nav
            id="portal-mobile-menu"
            className="animate-fade border-b border-white/10 py-2 sm:hidden"
          >
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="block rounded-lg px-2 py-3 text-sm font-bold uppercase tracking-wider text-white/80 outline-none ring-white/25 transition hover:bg-white/10 hover:text-white focus-visible:ring-2"
              >
                {link.label}
              </a>
            ))}

            <div className="my-2 border-t border-white/10" />

            {framer?.is_admin && (
              <a
                href="/admin"
                onClick={() => setMenuOpen(false)}
                /* min-h keeps this at a comfortable tap size — its smaller
                   type alone left it at 40px, under the 44px minimum. */
                className="flex min-h-[44px] items-center rounded-lg px-2 text-xs font-bold uppercase tracking-wider text-runfree-pink outline-none ring-white/25 transition hover:bg-white/10 focus-visible:ring-2"
              >
                Admin
              </a>
            )}

            {framer?.name && (
              <a
                href="/account"
                onClick={() => setMenuOpen(false)}
                className="block rounded-lg px-2 py-3 text-sm font-medium text-white/70 outline-none ring-white/25 transition hover:bg-white/10 hover:text-white focus-visible:ring-2"
              >
                {framer.name} — Account
              </a>
            )}

            <button
              onClick={() => {
                setMenuOpen(false);
                onSignOut();
              }}
              className="mt-1 block w-full rounded-lg px-2 py-3 text-left text-sm font-medium text-white/80 outline-none ring-white/25 transition hover:bg-white/10 hover:text-white focus-visible:ring-2"
            >
              Sign out
            </button>
          </nav>
        )}

        <div className="flex flex-wrap items-center justify-between gap-6 py-6 sm:py-7">
          <div className="min-w-0">
            {eyebrow && (
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-runfree-pink">
                {eyebrow}
              </p>
            )}
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
