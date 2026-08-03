"use client";

import AuthShell from "@/components/AuthShell";

/**
 * Self-signup is deliberately not offered.
 *
 * Access follows certification: an admin adds the person to the Certified
 * Vision Framers list and invites them. An open signup form only produced
 * people stuck on an "access pending" screen with no idea why, so the form
 * is gone.
 *
 * The route is kept rather than deleted because the old link has been sent
 * out and may be bookmarked — a page explaining how access actually works is
 * more use than a 404. The real enforcement is the "Allow new users to sign
 * up" setting in Supabase; this page is the signpost, not the lock.
 */
export default function SignupClosedPage() {
  return (
    <AuthShell
      title="Access is by invitation"
      subtitle="For RunFree Certified Vision Framers"
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
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-gray-600">
          This portal is for leaders who have completed Pivvot Vision Framing
          certification. Accounts aren&rsquo;t created here — RunFree adds you
          once your certification is complete, and you&rsquo;ll get an email
          invitation to set your password.
        </p>

        <p className="text-sm leading-relaxed text-gray-600">
          Already been invited? Use the link in that email, or{" "}
          <a
            href="/auth/login"
            className="font-medium text-runfree-magentaDeep hover:underline"
          >
            sign in
          </a>
          . If you had an account and can&rsquo;t get in,{" "}
          <a
            href="/auth/forgot-password"
            className="font-medium text-runfree-magentaDeep hover:underline"
          >
            reset your password
          </a>
          .
        </p>

        <div className="rounded-lg bg-runfree-indigo/60 px-4 py-3 text-sm leading-relaxed text-runfree-navy">
          Think you should have access?{" "}
          <a
            href="mailto:andrew@runfree.co?subject=Vision%20Framers%20Portal%20access"
            className="font-semibold underline"
          >
            Email us
          </a>{" "}
          and we&rsquo;ll get you set up.
        </div>
      </div>
    </AuthShell>
  );
}
