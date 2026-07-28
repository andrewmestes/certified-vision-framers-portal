"use client";

import Image from "next/image";
import { isProcessModule, stripModuleNumber } from "@/lib/modules";

export type NavModule = {
  id: string;
  name: string;
  order: number;
  count: number;
};

/**
 * The six Pivvot process icons as primary navigation, with the extra folders
 * (Additional / Combined Handouts) as chips below.
 *
 * No circles — each icon's silhouette is distinct enough to read on its own,
 * and ringing them flattens exactly what makes them recognisable. Names are
 * stacked one word per line so every label is two lines tall, which keeps the
 * icons on a single baseline instead of stepping up and down.
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
  const process = modules.filter((m) => isProcessModule(m.order));
  const extras = modules.filter((m) => !isProcessModule(m.order));

  return (
    <nav className="mb-8">
      <ul className="flex flex-wrap items-start justify-center gap-x-1 gap-y-6 sm:gap-x-4">
        {process.map((m) => {
          const isActive = active === m.id;
          const words = stripModuleNumber(m.name).split(/\s+/);

          return (
            <li key={m.id}>
              <button
                onClick={() => onSelect(m.id)}
                aria-pressed={isActive}
                className="group flex w-[96px] flex-col items-center outline-none sm:w-[112px]"
              >
                <span
                  className={`relative flex h-16 w-16 items-center justify-center transition-transform duration-300 ease-out will-change-transform ${
                    isActive
                      ? "-translate-y-1 scale-110"
                      : "group-hover:-translate-y-1 group-hover:scale-110 group-focus-visible:-translate-y-1"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`absolute inset-0 rounded-full bg-runfree-magenta/20 blur-xl transition-opacity duration-300 ${
                      isActive ? "opacity-100" : "opacity-0 group-hover:opacity-70"
                    }`}
                  />
                  <Image
                    src={`/brand/modules/${m.order}.png`}
                    alt=""
                    width={64}
                    height={64}
                    className={`relative h-16 w-16 object-contain transition duration-300 ${
                      isActive
                        ? ""
                        : "opacity-70 saturate-50 group-hover:opacity-100 group-hover:saturate-100"
                    }`}
                  />
                </span>

                {/* One word per line keeps every label the same height. */}
                <span
                  className={`mt-2 flex h-9 flex-col justify-start text-center text-[13px] font-semibold leading-[1.15] transition-colors ${
                    isActive
                      ? "text-runfree-ink"
                      : "text-gray-500 group-hover:text-runfree-ink"
                  }`}
                >
                  {words.map((w) => (
                    <span key={w}>{w}</span>
                  ))}
                </span>

                <span
                  className={`mt-1.5 h-[3px] rounded-full bg-runfree-grad transition-all duration-300 ${
                    isActive ? "w-10 opacity-100" : "w-0 opacity-0"
                  }`}
                />
              </button>
            </li>
          );
        })}
      </ul>

      {extras.length > 0 && (
        <div className="mt-7 flex flex-wrap justify-center gap-2">
          {extras.map((m) => {
            const isActive = active === m.id;
            return (
              <button
                key={m.id}
                onClick={() => onSelect(m.id)}
                aria-pressed={isActive}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-runfree-grad text-white shadow-sm"
                    : "bg-white text-gray-600 ring-1 ring-gray-200 hover:ring-runfree-magenta/40"
                }`}
              >
                {m.name}
                <span
                  className={`ml-2 text-xs ${
                    isActive ? "text-white/80" : "text-gray-400"
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
