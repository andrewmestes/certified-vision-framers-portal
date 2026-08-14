# Certified Vision Framers Portal

A private portal for church leaders certified in Pivvot Vision Framing. Content
lives in Google Drive and Loom and is mirrored live — nothing is copied into
this repo. Auth is Supabase, invite-only.

**This is live and serving real people.** A push to `main` is a deploy within
about two minutes, and there is no staging environment.

Owner: Andrew Estes, who is not an engineer. Explain things in those terms.

**Ignore the root-level docs** — `README.md`, `ARCHITECTURE.md`, `START_HERE.md`,
`QUICK_START.md`, `BUILD_PROGRESS.md`, `BUILD_SUMMARY.txt`. They're scaffold
docs from day one (27 Jul) and are now actively wrong: they document
`/api/resources` and `/api/framers` (neither exists — resources was deleted as
an unauthenticated endpoint, framers is `/api/admin/framers`), list
`GHL_ACCOUNT_ID`/`GHL_CUSTOM_FIELD_ID` (the code reads `GHL_LOCATION_ID`), and
omit `GOOGLE_BOOKS_FOLDER_ID`/`GOOGLE_DFG_FOLDER_ID`, which the Books and Guide
pages throw without. `.env.example`, everything in `docs/`, and the code itself
are accurate. Never re-create something because a root doc mentions it —
check `src/app/api/` and `git log` first.

---

## Running it

`npm run dev` fails here with `next: command not found`. The repo path contains
a colon (`ChatGPT:Claude Data`), `PATH` is colon-separated, so npm's injected
`node_modules/.bin` entry splits into two directories that do not exist. Not a
broken install. Run binaries directly:

```bash
./node_modules/.bin/next dev
./node_modules/.bin/next build
./node_modules/.bin/tsc --noEmit
```

Environment: `vercel env pull .env.local`. Never paste secrets anywhere else.

If a build behaves strangely after switching branches, `rm -rf .next` first —
building against a running dev server corrupts it, and the errors it produces
point everywhere except the cause.

---

## Terminology

Always **"Certified Vision Framer(s)"**. Never "Certified Framer", never
"framers" alone. Standing instruction from Andrew — code, comments, UI copy,
docs, commit messages, GHL tag names (`CERTIFIED_TAG` in `lib/ghl.ts`), all of it.

---

## Access control

**An allowlist row is only half of access.** Being in `certified_framers` decides
what an *existing login* may see — it does not create one. Self-signup is off in
the Supabase dashboard (not in code), so a fresh allowlist row with no invite
means that person can never sign in, "forgot password" reports success and sends
nothing, and there is no error anywhere. Only `POST /api/admin/framers` and the
GHL webhook do both steps, via `inviteFramer()` in `lib/invite.ts`. **Never
insert into `certified_framers` directly** — not via SQL, not via the Supabase
dashboard, not via the dead `addCertifiedFramer()` helper in `lib/auth.ts`
(unused, and its `supabaseAdmin` is really the anon client in the browser).
CSV-imported people are deliberately in this half-added state — see below — and
need Invite clicked per person afterward.

**There is no server-side session anywhere.** This app uses the plain
`supabase-js` browser client; the session lives in `localStorage`, never in a
cookie. `@supabase/auth-helpers-nextjs` is in `package.json` but unused — it is
bait, not a partial migration. Every page guard must stay client-side, and every
API route re-derives identity from an explicit `Authorization: Bearer <token>`
header, then re-checks `certified_framers` with `supabaseAdmin`. Do not add
middleware or a server-component guard; it will find no session for anyone and
lock out every signed-in framer.

**Invite and recovery links land on `/`, not on the page they're for**, because
the Supabase Redirect URLs allowlist is empty — GoTrue ignores `redirectTo` and
falls back to Site URL. The hash-sniffing effect at the top of `src/app/page.tsx`
forwards `type=recovery`/`type=invite` to `/auth/reset-password` by hand, and the
`onAuthStateChange` `PASSWORD_RECOVERY` listener beside it covers the race where
the Supabase client consumes the hash first. Both look deletable. Neither is:
without them, an invited framer is signed in but never sets a password, and the
next sign-out locks them out permanently (no self-signup to fall back on). Same
logic in `auth/callback/page.tsx`'s `type=invite` branch. Remove only after the
Redirect URLs allowlist is actually fixed and a real invite has been tested
end-to-end.

**`getCurrentFramer()` throws `FramerLookupError` when the lookup fails, and
returns `null` only when someone genuinely is not on the list.** Keep the
`maybeSingle()`; don't merge these back into one path. Collapsing them told a
real certified framer their access was pending because their wifi dropped. The
mirror-image trap: because it throws, every page's `init()` needs a `.catch()`
that sets `status: "error"` and renders `<AccessError>` — without one, any
throw (a failed lookup, a rejected fetch, a Vercel 502 returning HTML to
`res.json()`) leaves the page on its loading bar forever.

**File routes re-derive their file list on every request — this recomputation
*is* the authorization boundary, not wasted work.** `known` in each
`/file/[id]/route.ts` is built from a fresh `listPortalLibrary()` /
`listBooksLibrary()` / `getFacilitatorGuide()` call; a requested id not in that
list 404s, verified in production against Google's own public sample file id.
Two "obvious optimizations" both silently break this:
- Scoping the Drive `files.list` query to the root folder — Drive's `in parents`
  is direct-children-only with no recursive form, so scoping empties every
  nested module with a 200 OK and no error.
- Caching or skipping the list call inside the `/file/` route — that call is
  also where the not-for-distribution filter and the timestamped-export dedup
  live, so caching it means a file added in Drive 404s until the cache expires,
  and skipping it removes the only thing stopping an authenticated framer from
  requesting an arbitrary Drive id.

**Never add `Content-Length` or Range/206 support to the Drive file routes.**
Both were tried in production and both silently hung every PDF preview — one
because the browser waits for exact declared bytes that a stream doesn't
deliver, the other because it measured slower despite fewer bytes (9 round
trips replacing 1). If a preview needs to feel faster, that is a client-side
problem, not a headers problem.

**The "not for distribution" filter (`isExcluded()`) exists only in
`lib/books.ts`, applied only to the Books Drive folder.** Handouts (`lib/drive.ts`)
and the Facilitator's Guide (`lib/guide.ts`) have no equivalent — a file dropped
into either of those folders and marked not-for-distribution is served to every
certified framer with no warning. Don't assume there's a global confidentiality
filter; there isn't.

**Admin actions require `requireAdmin()`** (checks `is_admin` on
`certified_framers`). A member who isn't an admin gets 403 on every admin route
— confirmed in production, including that a blocked POST leaves no row behind.

---

## The GoHighLevel webhook

Both directions are live. `/api/webhooks/ghl` is authed by the `x-portal-secret`
header. Every refusal and asymmetry below is deliberate, not an unfinished sync.

**Custom Data merges *under* the standard payload, never over it.** GHL nests a
workflow's Custom Data inside a `customData` object. Flattening it over the top
instead of under would let an `email` field typed into a GHL workflow aim a
revoke at someone other than the contact the workflow actually fired for.

**A tag removal will not revoke an admin.** Losing the last admin means losing
the admin screen, and a re-add wouldn't restore it — inserts carry no
`is_admin`. The webhook returns `refused_admin` instead of deleting.

**Every Supabase write result is checked.** A failed delete used to return
`{ok: true, action: "removed"}` and log success while access silently survived
a revoke. Don't "simplify" those checks away.

Invite failures still return 200 to GHL — access was already granted, and a
non-2xx makes GHL retry the whole delivery.

---

## Emails and mail limits

Supabase templates are branded and pasted in by hand; not in this repo.

**The admin's second button sends a password link, not a signup resend.**
`resend({type: "signup"})` returns 200 and sends nothing here, because nobody
self-signs up, so there is never a pending signup to confirm — confirmed in
production: `confirmation_sent_at` stayed null while the admin was told it had
been sent.

**CSV import never sends email; a single add always does (unless opted out).**
This is a rate-limit guard, not an inconsistency — Supabase allows roughly 30
emails/hour, and a 40-person cohort invited at once would silently fail past the
cap. Import first, invite individually or in small batches after.

---

## Things that look wrong and are not

**`MANUAL_STILLS` in `lib/loom.ts`** — seven hardcoded thumbnails, keyed by Loom
id. Four of those recordings start on a black frame; three make Loom's own
oEmbed return a *different* recording's still. Neither is fixable by asking Loom
again. A stale entry can never attach to the wrong video because it's keyed by
id, so it's safe to leave even after a re-record.

**The thumbnail self-consistency check** — a Loom thumbnail is trusted only when
the session id embedded in its URL matches the video's own id. Delete it and
three videos go back to showing each other's pictures.

**`public/vendor/pdf.worker.min.mjs` is a hand-copied build artifact**, byte-
identical to the one in `node_modules/pdfjs-dist`, with nothing automating the
copy — no postinstall, no build step, no check. Bump `pdfjs-dist` without
re-copying this and `getDocument()` throws a version mismatch that's swallowed
by `PdfThumbnail`'s bare `catch { return null }` (deliberate: "a preview is
decoration"). The build passes, typecheck passes, nothing logs — every PDF
thumbnail just quietly reverts to its fallback. **Re-copy the worker in the same
commit as any `pdfjs-dist` bump, then visually check `/books` and `/guide`.**

**Page-one PDF previews are a known, unsolved production bug — not a tuning
target.** As of commit `5e57767`: they render locally and never resolve in
production. pdf.js neither rejects nor throws; it just never settles. Worker
delivery, MIME type, worker/library version match, and the file fetch were all
checked and are correct — cause still unknown. `RENDER_TIMEOUT_MS` (15s) and
the file-size cap exist only so a card resolves to something deliberate instead
of shimmering forever. Removing or raising either restores the infinite
shimmer. The 16.6MB Facilitator's Guide showing its real title slide
(`/brand/dfg-cover.jpg`) via that cap is the intended, finished-looking result —
not a failure to explain away. If a preview breaks, check a `pdfjs-dist`/worker
mismatch and the Content-Length/Range rule above before concluding it's "the
known bug."

**`bg-runfree-grad` and `bg-runfree-grad-deep` are both correct.** White text on
the bright gradient measures 3.4:1, under the 4.5:1 normal text needs. Deep is
for anything carrying words; bright is for rules, bars, and icon chips, which
are graphics judged at 3:1.

**The 16px input floor in `globals.css` uses `input[class]`** — that specificity
beats Tailwind's `text-sm` without `!important`. Below 16px, iOS Safari zooms
the page on focus and doesn't zoom back.

**The missing-service-key warning is wrapped in `typeof window === "undefined"`**
in `lib/supabase.ts` — that module is imported by client components too, where
the key is correctly absent. Unguarded, it fired a false, alarming warning in
every user's browser console on every page load.

**Module-level `let cache` globals** in `library/route.ts`, `books/route.ts`,
`videos/route.ts` are unkeyed by user — safe *only* because every certified
framer is entitled to byte-identical content. **This pattern must not be copied
into the multi-tenant client portal** (`runfree-client-portal`), where a response
varying by user cached globally would serve one client's data to another, and no
local test would catch it (a single dev session never exercises two users).
Same warning applies to the ~25-line token-plus-allowlist check duplicated
verbatim across all 11 API routes with no shared helper — a new route that
forgets to paste it in is silently public.

**`books.ts` is a hand-curated map onto today's exact Drive folder and file
names.** Renaming a folder or file in Drive changes portal behaviour with no
error anywhere — it just stops matching.

---

## House style

Comments explain **why**, not what — especially where the code encodes a lesson
that's invisible without it. If a line exists because of a production incident,
say so in a sentence.

Commit messages are multi-paragraph prose explaining what was wrong and why this
is the fix, not Conventional Commits prefixes or a bullet list of files touched.

Match the surrounding code's density and naming. Prefer editing an existing file
over adding one.

---

## Never

- Point a dev server at production and run a destructive test. The database is
  production; there is no staging copy.
- Add, remove, or email a real Certified Vision Framer while testing. Use a
  throwaway address and delete it afterward, from both `certified_framers` and
  `auth.users`.
- Tag or untag a real contact in GoHighLevel to test the integration. It is
  Andrew's live CRM.
- Insert directly into `certified_framers` to "add" someone — see Access
  control above.
- Add `Content-Length` or Range support to the Drive file routes.
- Cache or scope the Drive listing call inside a `/file/` route.
- Copy the unkeyed `let cache` / copy-pasted-auth-check pattern into anything
  where a response varies by user or tenant.
- Commit anything from `.env.local`, or reproduce a secret in any output.
