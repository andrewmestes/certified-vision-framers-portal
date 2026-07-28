"use client";

import Image from "next/image";

export type NavModule = {
  id: string;
  name: string;
  order: number;
  count: number;
};

/**
 * The six Pivvot process icons as the primary navigation.
 *
 * No circles — the icons carry their own shape, and ringing them flattens the
 * distinct silhouettes that make them recognisable at a glance. Selection is
 * shown with a gradient underline and a lift instead.
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
  return (
    <nav className="mb-10">
      <ul className="flex flex-wrap items-end justify-center gap-x-2 gap-y-6 sm:gap-x-6">
        <li>
          <AllButton active={active === "all"} onClick={() => onSelect("all")} />
        </li>

        {modules.map((m) => {
          const isActive = active === m.id;
          const icon =
            m.order >= 1 && m.order <= 6 ? `/brand/modules/${m.order}.png` : null;

          return (
            <li key={m.id}>
              <button
                onClick={() => onSelect(m.id)}
                aria-pressed={isActive}
                className="group flex w-[104px] flex-col items-center gap-2 outline-none sm:w-[116px]"
              >
                <span
                  className={`relative flex h-16 w-16 items-center justify-center transition-transform duration-300 ease-out will-change-transform ${
                    isActive
                      ? "-translate-y-1 scale-110"
                      : "group-hover:-translate-y-1 group-hover:scale-110 group-focus-visible:-translate-y-1"
                  }`}
                >
                  {/* Warm glow behind the icon, brand-coloured, no ring. */}
                  <span
                    aria-hidden
                    className={`absolute inset-0 rounded-full bg-runfree-magenta/20 blur-xl transition-opacity duration-300 ${
                      isActive
                        ? "opacity-100"
                        : "opacity-0 group-hover:opacity-70"
                    }`}
                  />
                  {icon && (
                    <Image
                      src={icon}
                      alt=""
                      width={64}
                      height={64}
                      className={`relative h-16 w-16 object-contain transition duration-300 ${
                        isActive
                          ? ""
                          : "opacity-70 saturate-50 group-hover:opacity-100 group-hover:saturate-100"
                      }`}
                    />
                  )}
                </span>

                <span
                  className={`text-center text-[13px] font-semibold leading-tight transition-colors ${
                    isActive
                      ? "text-runfree-ink"
                      : "text-gray-500 group-hover:text-runfree-ink"
                  }`}
                >
                  {m.name.replace(/^\s*\d+\s*-\s*/, "")}
                </span>

                <span
                  className={`h-[3px] rounded-full bg-runfree-grad transition-all duration-300 ${
                    isActive ? "w-10 opacity-100" : "w-0 opacity-0"
                  }`}
                />
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function AllButton({
  active,
  onClick,
}: {
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className="group flex w-[104px] flex-col items-center gap-2 outline-none sm:w-[116px]"
    >
      <span
        className={`relative flex h-16 w-16 items-center justify-center transition-transform duration-300 ease-out ${
          active
            ? "-translate-y-1 scale-110"
            : "group-hover:-translate-y-1 group-hover:scale-110"
        }`}
      >
        <span
          aria-hidden
          className={`absolute inset-0 rounded-full bg-runfree-magenta/20 blur-xl transition-opacity duration-300 ${
            active ? "opacity-100" : "opacity-0 group-hover:opacity-70"
          }`}
        />
        <span
          className={`relative grid h-11 w-11 grid-cols-2 gap-1 transition duration-300 ${
            active ? "" : "opacity-60 group-hover:opacity-100"
          }`}
        >
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="rounded-[3px] bg-runfree-navy" />
          ))}
        </span>
      </span>

      <span
        className={`text-center text-[13px] font-semibold leading-tight transition-colors ${
          active ? "text-runfree-ink" : "text-gray-500 group-hover:text-runfree-ink"
        }`}
      >
        All
      </span>

      <span
        className={`h-[3px] rounded-full bg-runfree-grad transition-all duration-300 ${
          active ? "w-10 opacity-100" : "w-0 opacity-0"
        }`}
      />
    </button>
  );
}
