"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getCurrentFramer, logout } from "@/lib/auth";
import PortalHeader from "@/components/PortalHeader";

type AccountStatus = "no_account" | "pending" | "confirmed";

type Framer = {
  id: string;
  email: string;
  name: string;
  is_admin: boolean;
  created_at: string;
  hasAccount: boolean;
  accountStatus: AccountStatus;
};

type Me = { id: string; email: string; name: string; is_admin: boolean };

export default function FramersAdminPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [framers, setFramers] = useState<Framer[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);

  const router = useRouter();

  const authedFetch = useCallback(
    async (url: string, init?: RequestInit) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/auth/login");
        throw new Error("No session");
      }

      return fetch(url, {
        ...init,
        headers: {
          ...(init?.headers || {}),
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      });
    },
    [router]
  );

  const load = useCallback(async () => {
    const res = await authedFetch("/api/admin/framers");
    const body = await res.json();

    if (!res.ok) {
      setError(body.error || "Could not load the list.");
      return;
    }

    setFramers(body.framers || []);
  }, [authedFetch]);

  useEffect(() => {
    async function init() {
      const current = (await getCurrentFramer()) as Me | null;

      if (!current?.is_admin) {
        router.replace("/resources");
        return;
      }

      setMe(current);
      await load();
      setLoading(false);
    }

    init();
  }, [router, load]);

  async function handleSignOut() {
    await logout();
    router.replace("/auth/login");
  }

  function flash(msg: string) {
    setNotice(msg);
    setTimeout(() => setNotice(""), 4000);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setAdding(true);

    try {
      const res = await authedFetch("/api/admin/framers", {
        method: "POST",
        body: JSON.stringify({ email: newEmail, name: newName }),
      });
      const body = await res.json();

      if (!res.ok) {
        setError(body.error || "Could not add them.");
        return;
      }

      flash(`${newEmail.trim().toLowerCase()} can now create an account.`);
      setNewEmail("");
      setNewName("");
      await load();
    } finally {
      setAdding(false);
    }
  }

  async function toggleAdmin(f: Framer) {
    setError("");
    setBusyId(f.id);

    try {
      const res = await authedFetch("/api/admin/framers", {
        method: "PATCH",
        body: JSON.stringify({ id: f.id, isAdmin: !f.is_admin }),
      });
      const body = await res.json();

      if (!res.ok) {
        setError(body.error || "Could not update them.");
        return;
      }

      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function resendConfirmation(f: Framer) {
    setError("");
    setResendingId(f.id);

    try {
      const res = await authedFetch("/api/admin/framers", {
        method: "PUT",
        body: JSON.stringify({ email: f.email }),
      });
      const body = await res.json();

      if (!res.ok) {
        setError(body.error || "Could not resend that email.");
        return;
      }

      flash(`Confirmation email resent to ${f.email}.`);
    } finally {
      setResendingId(null);
    }
  }

  async function remove(f: Framer) {
    setError("");
    setBusyId(f.id);

    try {
      const res = await authedFetch(`/api/admin/framers?id=${f.id}`, {
        method: "DELETE",
      });
      const body = await res.json();

      if (!res.ok) {
        setError(body.error || "Could not remove them.");
        return;
      }

      flash(`${f.email} no longer has access.`);
      setConfirmId(null);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  const needle = query.trim().toLowerCase();
  const shown = needle
    ? framers.filter(
        (f) =>
          f.email.toLowerCase().includes(needle) ||
          f.name.toLowerCase().includes(needle)
      )
    : framers;

  const notSignedUp = framers.filter(
    (f) => f.accountStatus === "no_account"
  ).length;
  const unconfirmed = framers.filter(
    (f) => f.accountStatus === "pending"
  ).length;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-1.5 w-24 rounded-full bg-runfree-grad" />
          <p className="text-sm text-gray-500">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PortalHeader
        framer={me}
        onSignOut={handleSignOut}
        title="Certified Vision Framers"
        subtitle="Who can get into the portal"
        backHref="/admin"
        backLabel="← Admin"
      />

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {notice && (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            {notice}
          </div>
        )}

        {/* Add someone */}
        <div className="mb-8 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200">
          <div className="h-1.5 bg-runfree-grad" />
          <form onSubmit={handleAdd} className="p-6">
            <h2 className="font-display text-lg font-bold text-runfree-ink">
              Add a Certified Vision Framer
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              They&rsquo;ll create their own account with this email — you
              don&rsquo;t set a password for them.
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Full name"
                required
                className="min-w-[10rem] flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition placeholder:text-gray-400 focus:border-runfree-magenta focus:ring-2 focus:ring-runfree-magenta/25"
              />
              <input
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                type="email"
                placeholder="name@church.org"
                required
                className="min-w-[14rem] flex-[1.4] rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition placeholder:text-gray-400 focus:border-runfree-magenta focus:ring-2 focus:ring-runfree-magenta/25"
              />
              <button
                type="submit"
                disabled={adding}
                className="rounded-lg bg-runfree-grad px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {adding ? "Adding…" : "Add"}
              </button>
            </div>
          </form>
        </div>

        {/* List */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full max-w-sm rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition placeholder:text-gray-400 focus:border-runfree-magenta focus:ring-2 focus:ring-runfree-magenta/25"
          />
          <span className="text-sm text-gray-500">
            {framers.length} on the list
            {notSignedUp > 0 && ` · ${notSignedUp} not signed up yet`}
            {unconfirmed > 0 && ` · ${unconfirmed} unconfirmed`}
          </span>
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200">
          {shown.length === 0 ? (
            <p className="px-6 py-12 text-center text-sm text-gray-500">
              {framers.length === 0
                ? "Nobody on the list yet."
                : "No matches."}
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {shown.map((f) => {
                const isSelf = f.id === me?.id;
                const busy = busyId === f.id;

                return (
                  <li
                    key={f.id}
                    className="flex flex-wrap items-center gap-x-4 gap-y-2 px-6 py-4"
                  >
                    <div className="min-w-[12rem] flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-runfree-ink">
                          {f.name}
                        </span>
                        {f.is_admin && (
                          <span className="rounded-full bg-runfree-pink px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-runfree-magentaDeep">
                            Admin
                          </span>
                        )}
                        {isSelf && (
                          <span className="text-xs text-gray-400">(you)</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">{f.email}</div>
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        f.accountStatus === "confirmed"
                          ? "bg-green-50 text-green-700"
                          : f.accountStatus === "pending"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {f.accountStatus === "confirmed"
                        ? "Signed up"
                        : f.accountStatus === "pending"
                          ? "Unconfirmed"
                          : "Not signed up yet"}
                    </span>

                    {f.accountStatus === "pending" && (
                      <button
                        onClick={() => resendConfirmation(f)}
                        disabled={resendingId === f.id}
                        className="rounded-lg px-3 py-1.5 text-xs font-semibold text-runfree-magentaDeep ring-1 ring-runfree-magenta/30 transition hover:bg-runfree-pink/40 disabled:opacity-50"
                      >
                        {resendingId === f.id
                          ? "Sending…"
                          : "Resend confirmation"}
                      </button>
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleAdmin(f)}
                        disabled={busy || isSelf}
                        title={
                          isSelf
                            ? "You can't change your own admin access"
                            : undefined
                        }
                        className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 ring-1 ring-gray-200 transition hover:text-runfree-magentaDeep hover:ring-runfree-magenta/40 disabled:opacity-40 disabled:hover:text-gray-600 disabled:hover:ring-gray-200"
                      >
                        {f.is_admin ? "Remove admin" : "Make admin"}
                      </button>

                      {confirmId === f.id ? (
                        <span className="flex items-center gap-2">
                          <button
                            onClick={() => remove(f)}
                            disabled={busy}
                            className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                          >
                            {busy ? "Removing…" : "Confirm"}
                          </button>
                          <button
                            onClick={() => setConfirmId(null)}
                            className="text-sm text-gray-500 hover:text-gray-700"
                          >
                            Cancel
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => setConfirmId(f.id)}
                          disabled={busy || isSelf}
                          title={
                            isSelf
                              ? "You can't remove your own access"
                              : undefined
                          }
                          className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 ring-1 ring-red-200 transition hover:bg-red-50 disabled:opacity-40 disabled:hover:bg-transparent"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <p className="mt-4 text-xs leading-relaxed text-gray-500">
          Removing someone revokes portal access immediately but leaves their
          login intact, so re-adding them later just works. To delete an account
          outright, use Authentication → Users in Supabase.
        </p>
      </main>
    </div>
  );
}
