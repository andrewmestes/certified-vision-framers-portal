"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signupWithEmail, signInWithGoogle } from "@/lib/auth";
import AuthShell, {
  Field,
  FormError,
  FormNotice,
  GoogleButton,
  OrDivider,
  SubmitButton,
} from "@/components/AuthShell";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [checkInbox, setCheckInbox] = useState(false);
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
      const result = await signupWithEmail(email, password, name);

      // With email confirmation on, there's no session yet — they have to
      // click the link first. Without it, we can go straight in.
      if (result?.session) {
        router.push("/resources");
      } else {
        setCheckInbox(true);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Signup failed";
      setError(
        /already registered|already exists/i.test(msg)
          ? "There's already an account for that email. Try signing in instead."
          : msg
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError("");
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
      setGoogleLoading(false);
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
      {checkInbox ? (
        <div className="space-y-4">
          <FormNotice
            message={`Almost there — we sent a confirmation link to ${email}.`}
          />
          <p className="text-sm leading-relaxed text-gray-600">
            Click the link in that email to finish setting up your account, then
            sign in. If it doesn&rsquo;t arrive within a few minutes, check your
            spam folder.
          </p>
        </div>
      ) : (
        <>
      <GoogleButton
        onClick={handleGoogle}
        disabled={googleLoading}
        label={googleLoading ? "Redirecting…" : "Continue with Google"}
      />

      <OrDivider />

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
        </>
      )}
    </AuthShell>
  );
}
