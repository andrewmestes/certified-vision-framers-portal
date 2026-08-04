"use client";

import Image from "next/image";
import { isProcessModule, stripModuleNumber, MODULE_META } from "@/lib/modules";

export type NavModule = {
  id: string;
  name: string;
  order: number;
  count: number;
};

/**
 * The Field Guide sits in the same pill row as "Additional Handouts" and
 * "Combined Handouts" — the process icons still lead the page — but gets a
 * highlighted style and leads that row, since it's the one thing worth
 * seeing before the six modules.
 */
function isFieldGuideModule(name: string): boolean {
  return /vision frame field guide/i.test(name);
}

/**
 * The six Pivvot process icons as primary navigation.
 *
 * A track runs behind them the way it does on the co::Lab landing page — the
 * six tools are a sequence, not a menu, and the line is what says so. The
 * segment up to the selected tool fills with the brand gradient, which doubles
 * as a progress read.
 *
 * No circles: each silhouette is distinct enough on its own, and ringing them
 * flattens exactly what makes them recognisable.
 */
export default function ModuleNav({
  modules,
  active,
  onSelect,
}: {
  modules: NavModule[];
  active: string;
  onSelect: (id: string) => void;
}) {
  const process = modules
    .filter((m) => isProcessModule(m.order))
    .sort((a, b) => a.order - b.order);
  const extras = modules.filter((m) => !isProcessModule(m.order));

  const activeIndex = process.findIndex((m) => m.id === active);
  const activeModule = activeIndex >= 0 ? process[activeIndex] : null;
  const meta = activeModule ? MODULE_META[activeModule.order] : null;

  // Fill the track up to the middle of the selected icon.
  const fillPercent =
    activeIndex < 0 || process.length < 2
      ? 0
      : (activeIndex / (process.length - 1)) * 100;

  return (
    <nav className="mb-10">
      <div className="relative">
        {/* Track — inset so it starts and ends under the outer icons. */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-0 right-0 top-10 mx-auto hidden h-[3px] sm:block"
          style={{ width: "calc(100% - 140px)", marginLeft: 70 }}
        >
          <div className="h-full w-full rounded-full bg-gray-200" />
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-runfree-grad transition-all duration-500 ease-out"
            style={{ width: `${fillPercent}%` }}
          />
        </div>

        <ul className="relative flex flex-wrap items-start justify-center gap-x-1 gap-y-8 sm:flex-nowrap sm:gap-x-2">
          {process.map((m) => {
            const isActive = active === m.id;
            const words = stripModuleNumber(m.name).split(/\s+/);

            return (
              <li key={m.id} className="flex-1">
                <button
                  onClick={() => onSelect(m.id)}
                  aria-pressed={isActive}
                  className="group flex w-full min-w-[104px] flex-col items-center rounded-xl outline-none ring-runfree-magenta/60 focus-visible:ring-2 focus-visible:ring-offset-2"
                >
                  <span
                    className={`relative flex h-20 w-20 items-center justify-center rounded-full transition-transform duration-300 ease-out will-change-transform ${
                      isActive
                        ? "-translate-y-1 scale-110"
                        : "group-hover:-translate-y-1 group-hover:scale-110 group-focus-visible:-translate-y-1"
                    }`}
                  >
                    {/* Opaque plate so the track passes behind, not through. */}
                    <span
                      aria-hidden
                      className="absolute inset-1 rounded-full bg-gray-50"
                    />
                    <span
                      aria-hidden
                      className={`absolute inset-0 rounded-full bg-runfree-magenta/25 blur-xl transition-opacity duration-300 ${
                        isActive
                          ? "opacity-100"
                          : "opacity-0 group-hover:opacity-70"
                      }`}
                    />
                    <Image
                      src={`/brand/modules/${m.order}.png`}
                      alt=""
                      width={76}
                      height={76}
                      className={`relative h-[72px] w-[72px] object-contain transition duration-300 ${
                        isActive
                          ? ""
                          : "opacity-70 saturate-50 group-hover:opacity-100 group-hover:saturate-100"
                      }`}
                    />
                  </span>

                  <span
                    className={`mt-3 flex h-10 flex-col justify-start text-center text-[15px] font-semibold leading-[1.15] transition-colors ${
                      isActive
                        ? "text-runfree-ink"
                        : "text-gray-500 group-hover:text-runfree-ink"
                    }`}
                  >
                    {words.map((w) => (
                      <span key={w}>{w}</span>
                    ))}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* The mantra gets its own line, sized to actually carry. Keyed on the
          module so it re-animates each time the selection changes. */}
      <div className="mt-8 flex min-h-[68px] items-center justify-center px-4">
        {meta && activeModule && (
          <div key={activeModule.id} className="animate-rise text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-runfree-magentaDeep">
              {meta.stage}
            </p>
            <p className="mt-1 font-display text-2xl font-extrabold tracking-tight text-runfree-ink sm:text-3xl">
              {meta.mantra}
            </p>
          </div>
        )}
      </div>

      {extras.length > 0 && (
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          {extras
            .slice()
            .sort((a, b) =>
              isFieldGuideModule(a.name) === isFieldGuideModule(b.name)
                ? 0
                : isFieldGuideModule(a.name)
                  ? -1
                  : 1
            )
            .map((m) => {
              const isActive = active === m.id;
              const isFieldGuide = isFieldGuideModule(m.name);
              return (
                <button
                  key={m.id}
                  onClick={() => onSelect(m.id)}
                  aria-pressed={isActive}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-runfree-grad-deep text-white shadow-sm"
                      : isFieldGuide
                        ? "bg-runfree-pink text-runfree-magentaDeep ring-1 ring-runfree-magenta/40 hover:ring-runfree-magenta/70"
                        : "bg-white text-gray-600 ring-1 ring-gray-200 hover:ring-runfree-magenta/40"
                  }`}
                >
                  {stripModuleNumber(m.name)}
                  <span
                    className={`ml-2 text-xs ${
                      isActive
                        ? "text-white/80"
                        : isFieldGuide
                          ? "text-runfree-magentaDeep/60"
                          : "text-gray-500"
                    }`}
                  >
                    {m.count}
                  </span>
                </button>
              );
            })}
        </div>
      )}
    </nav>
  );
}
