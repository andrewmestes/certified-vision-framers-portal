"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { updatePassword } from "@/lib/auth";
import AuthShell, {
  Field,
  FormError,
  SubmitButton,
} from "@/components/AuthShell";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState<"checking" | "ok" | "invalid">("checking");
  const router = useRouter();

  useEffect(() => {
    // Supabase puts a recovery session in the URL and the client picks it up.
    // Give it a moment, then confirm we actually have one.
    const timer = setTimeout(async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setReady(session ? "ok" : "invalid");
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    try {
      await updatePassword(password);
      router.push("/resources");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Choose a new password"
      subtitle="Then you'll be signed straight in"
      footer={
        <p>
          <a
            href="/auth/login"
            className="font-medium text-runfree-magentaDeep hover:underline"
          >
            Back to sign in
          </a>
        </p>
      }
    >
      {ready === "checking" && (
        <p className="text-center text-sm text-gray-500">Checking your link…</p>
      )}

      {ready === "invalid" && (
        <div className="space-y-4">
          <FormError message="This reset link is invalid or has expired." />
          <p className="text-sm leading-relaxed text-gray-600">
            Reset links are single-use and expire after an hour.{" "}
            <a
              href="/auth/forgot-password"
              className="font-medium text-runfree-magentaDeep hover:underline"
            >
              Request a new one
            </a>
            .
          </p>
        </div>
      )}

      {ready === "ok" && (
        <form onSubmit={handleSubmit} className="space-y-5">
          <FormError message={error} />
          <Field
            id="password"
            label="New password (min 8 characters)"
            type="password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
          />
          <Field
            id="confirm"
            label="Confirm new password"
            type="password"
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
          />
          <SubmitButton
            loading={loading}
            idleLabel="Update password"
            busyLabel="Updating…"
          />
        </form>
      )}
    </AuthShell>
  );
}
