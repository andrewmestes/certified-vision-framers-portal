# GoHighLevel ↔ portal sync

Access is meant to stay in step in both directions: tagging someone in GHL
should let them into the portal, and adding someone in the portal should tag
them in GHL. The two directions work differently and are configured
separately, so it's worth being clear about which half is live.

## Current status

| Direction | Mechanism | Works today |
| --- | --- | --- |
| GHL → portal | Workflow webhook | **Yes**, once the workflows below exist |
| Portal → GHL | GHL REST API | **No** — `GHL_API_KEY` is empty |

Nothing breaks while the second half is off. Adding a framer in the portal
still grants access immediately; it just doesn't tag them in the CRM, and the
admin screen says so rather than implying it happened.

---

## GHL → portal (tag drives access)

Driven by a GHL Workflow with a Webhook action rather than by polling the API,
so there's no key to rotate and no delay.

**Endpoint:** `POST https://<your-portal-domain>/api/webhooks/ghl`
**Auth:** header `x-portal-secret` must equal `GHL_WEBHOOK_SECRET` in Vercel.

### Workflow 1 — grant access

1. **Trigger:** Contact Tag → tag added → `Certified Vision Framer`
2. **Action:** Webhook
   - Method `POST`, URL as above
   - Header `x-portal-secret: <the value of GHL_WEBHOOK_SECRET>`
   - Body includes at least `email`; `first_name`, `last_name`, and
     `contact_id` are used when present

### Workflow 2 — revoke access

Same as above but triggered on **tag removed**, and add a Custom Data pair:

```
action = remove
```

That is the only thing distinguishing a revoke from a grant — without it the
webhook treats the call as an add.

### Invitations

A grant also emails the invitation, so a newly tagged contact hears that they
have access instead of sitting on the list unaware.

Only a genuine add sends one. Re-running a workflow across contacts who are
already listed is routine in GHL, and each replay would otherwise email
someone who has been in the portal for months.

To suppress it entirely — worth doing on a one-off workflow that retags an
existing cohort, where a few hundred invitations would hit the mail rate limit
and mostly never arrive — add a second Custom Data pair:

```
invite = false
```

### Checking it

`GET /api/webhooks/ghl` returns `{"status":"ok","configured":true}` in a
browser, which confirms the route is deployed and the secret is set. It does
not prove the workflows exist — for that, add the tag to a test contact and
watch them appear on Admin → Certified Vision Framers.

Every call is written to the `ghl_sync_log` table with success or failure, so
a workflow that's firing but failing is visible there.

---

## Portal → GHL (adding a framer tags them)

Implemented in `src/lib/ghl.ts` and called from the add, remove, and CSV
import paths. Currently inert.

**To turn it on**, set both of these in Vercel and redeploy:

| Variable | Where it comes from |
| --- | --- |
| `GHL_API_KEY` | Settings → Private Integrations → create a token with the **contacts.readonly** and **contacts.write** scopes |
| `GHL_LOCATION_ID` | Settings → Business Profile, top of General Information |

Both are required. A token doesn't imply which location it means, so the
calls fail without the ID.

Once set:

- Adding a framer tags that contact `Certified Vision Framer`
- Removing a framer removes the tag
- A CSV import tags everyone it added, in batches of five

Tagging is best-effort by design. Portal access is granted first and a CRM
failure never rolls it back — but the failure is surfaced to the admin rather
than swallowed, so nobody is told a tag was applied when it wasn't. If no GHL
contact matches the address, the admin is told that too.

### Why v2

`src/lib/ghl.ts` originally targeted the v1 REST API
(`rest.gohighlevel.com/v1`) with a Location API key. That credential no longer
exists on current sub-accounts — the "Api Key" panel has been removed from
Business Profile entirely — so the client was rewritten for v2
(`services.leadconnectorhq.com`) and a Private Integration token.

Three practical differences: a different host, a required `Version` header,
and `locationId` on every call.

One subtlety worth keeping: v2's contact search is fuzzy across name, email
and phone. `searchGHLContactByEmail` confirms the returned address matches
before handing the contact back, because a near-miss would otherwise get
tagged as certified.

---

## The loop question

Tagging in GHL fires the webhook, which adds the framer in the portal. The
portal doesn't then call back out to GHL, because the tag is already there —
so there's no cycle. The reverse holds too: tagging from the portal doesn't
trigger the inbound webhook to do anything meaningful, since the webhook
treats an already-listed person as `already_present` and only refreshes their
`ghl_contact_id`.
