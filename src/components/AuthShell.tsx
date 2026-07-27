import Image from "next/image";

export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-runfree-indigo/40 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo sits on white, per brand guidance for the dark-inked mark */}
        <div className="mb-6 flex justify-center">
          <div className="rounded-xl bg-white px-6 py-4 shadow-sm">
            <Image
              src="/brand/runfree-logo.png"
              alt="RunFree"
              width={160}
              height={40}
              priority
              className="h-9 w-auto"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow-xl">
          <div className="h-1.5 bg-runfree-grad" />
          <div className="p-8">
            <h1 className="text-center font-display text-2xl font-extrabold tracking-tight text-runfree-ink">
              {title}
            </h1>
            <p className="mt-2 text-center text-sm text-gray-500">{subtitle}</p>

            <div className="mt-8">{children}</div>
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-gray-600">{footer}</div>
      </div>
    </div>
  );
}

export function Field({
  id,
  label,
  type = "text",
  value,
  onChange,
  autoComplete,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-runfree-ink"
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        required
        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-runfree-magenta focus:ring-2 focus:ring-runfree-magenta/25"
      />
    </div>
  );
}

export function SubmitButton({
  loading,
  idleLabel,
  busyLabel,
}: {
  loading: boolean;
  idleLabel: string;
  busyLabel: string;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full rounded-lg bg-runfree-grad px-4 py-2.5 font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
    >
      {loading ? busyLabel : idleLabel}
    </button>
  );
}

export function FormError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {message}
    </div>
  );
}
