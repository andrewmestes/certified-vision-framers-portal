"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signupWithEmail } from "@/lib/auth";
import AuthShell, {
  Field,
  FormError,
  SubmitButton,
} from "@/components/AuthShell";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    try {
      await signupWithEmail(email, password, name);
      router.push("/resources");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Use the email your certification was issued to"
      footer={
        <p>
          Already have an account?{" "}
          <a
            href="/auth/login"
            className="font-medium text-runfree-magentaDeep hover:underline"
          >
            Sign in
          </a>
        </p>
      }
    >
      <form onSubmit={handleSignup} className="space-y-5">
        <FormError message={error} />
        <Field
          id="name"
          label="Full name"
          value={name}
          onChange={setName}
          autoComplete="name"
        />
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
          label="Password (min 8 characters)"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
        />
        <Field
          id="confirm-password"
          label="Confirm password"
          type="password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          autoComplete="new-password"
        />
        <SubmitButton
          loading={loading}
          idleLabel="Create Account"
          busyLabel="Creating account…"
        />
      </form>
    </AuthShell>
  );
}
