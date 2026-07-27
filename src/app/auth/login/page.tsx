"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginWithEmail } from "@/lib/auth";
import AuthShell, {
  Field,
  FormError,
  SubmitButton,
} from "@/components/AuthShell";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await loginWithEmail(email, password);
      router.push("/resources");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Vision Framers Portal"
      subtitle="For RunFree Certified Vision Framers"
      footer={
        <p>
          New to the portal?{" "}
          <a
            href="/auth/signup"
            className="font-medium text-runfree-magentaDeep hover:underline"
          >
            Create an account
          </a>
        </p>
      }
    >
      <form onSubmit={handleLogin} className="space-y-5">
        <FormError message={error} />
        <Field
          id="email"
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
        />
        <Field
          id="password"
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
        />
        <SubmitButton
          loading={loading}
          idleLabel="Sign In"
          busyLabel="Signing in…"
        />
      </form>
    </AuthShell>
  );
}
