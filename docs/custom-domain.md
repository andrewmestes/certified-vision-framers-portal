# Moving the portal to a custom domain

The plan is `certified.runfree.co` instead of the `*.vercel.app` URL.

It is deliberately named for *certification*, not for Vision Framing — if CBU
or another certification follows, it lives here too and what someone sees
depends on what they hold. `portal.runfree.co` is reserved for the separate
client engagement portal.

**No code changes are needed.** Nothing in the app hardcodes the production
domain — every redirect is built from the incoming request's own origin, so the
portal follows whatever domain serves it. `NEXT_PUBLIC_APP_URL` exists in some
older notes but is read by nothing.

That means the whole migration lives in a handful of dashboards, and the failure
mode if one is missed is specific and worth knowing in advance.

## Do them in this order

### 1. Route 53 — add the CNAME first

DNS before Vercel, not after. Vercel refuses to attach a domain it cannot yet
verify, so adding the record first means the next step succeeds immediately
instead of sitting in "Invalid Configuration".

In the `runfree.co` hosted zone, create:

```
Name:   certified
Type:   CNAME
Value:  cname.vercel-dns.com
TTL:    300
```

**Leave the `*.runfree.co` wildcard alone.** A specific record beats a wildcard,
and the wildcard is presumably serving other things.

One thing that will look like a failure and is not: `certified.runfree.co`
**already resolves today**, to the Plesk web host at `172.239.52.194`, because
of that wildcard. So there is no "domain not found" stage to wait through — the
subdomain will serve the wrong page until the CNAME propagates, then the right
one. Check for the portal, not for an error.

### 2. Vercel — attach the domain

Project → Settings → Domains → add `certified.runfree.co`. With the CNAME
already in place it verifies straight away.

Both URLs work from here on; the vercel.app one never stops working, which is
what makes the rest of these safe to do one at a time.

### 3. Supabase — Site URL and redirect allowlist

Authentication → URL Configuration.

- **Site URL** → `https://certified.runfree.co`
- **Redirect URLs** → add `https://certified.runfree.co/**`

Leave the old vercel.app entries in place until the last step. Supabase only honours a
`redirectTo` that appears in this allowlist, and silently falls back to the Site
URL otherwise.

**If you skip this:** invitation and password-reset links keep landing on the
old domain. They still work, but a new Certified Vision Framer sees a URL that
doesn't match the one you told them about.

### 4. GoHighLevel — repoint both webhooks

Automation → Workflows. In **both** "Certified Vision Framer - Tag Added" and
"Certified Vision Framer - Tag Removed", open the Webhook action and change the
URL to:

```
https://certified.runfree.co/api/webhooks/ghl
```

Leave the `x-portal-secret` header and the `action = remove` Custom Data pair
exactly as they are. Publish each workflow after editing.

**If you skip this:** nothing breaks. The old URL still resolves. Worth doing
anyway so there's one domain to reason about.

### 5. Check the email templates

Authentication → Emails. The branded templates use `{{ .ConfirmationURL }}`,
which Supabase fills in from the Site URL you set in step 3 — so they follow
automatically. Only look here if you hardcoded a link into a template.

### 6. Verify, then clean up

Before removing the old redirect URLs, confirm the new domain end to end:

1. Add a test address on Admin → Certified Vision Framers and check the invite
   email links to `certified.runfree.co`.
2. Click it and confirm you land on "Set your password".
3. Tag a test contact in GHL, confirm they appear on the admin list.
4. Untag them, confirm they disappear.
5. Remove the test framer and the test GHL contact.

Once that passes, drop the vercel.app entries from the Supabase redirect
allowlist.

## What is deliberately not on this list

- **Vercel environment variables** — none of them contain a URL.
- **Google Drive** — folder ids and the service account are domain-independent.
- **Loom** — thumbnails are absolute CDN URLs.
