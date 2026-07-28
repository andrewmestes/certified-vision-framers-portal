# Branded auth emails

Supabase's default auth emails are plain, unbranded, and read like system
notifications — a poor first impression for a paid certification portal. These
replace them.

## Where they go

Supabase Dashboard → **Authentication → Emails** (older projects: Email
Templates). Paste the file body into the message field and set the subject.

| Template in Supabase | File | Subject line to use |
| --- | --- | --- |
| Confirm signup | `confirm-signup.html` | Confirm your email — RunFree Vision Framers Portal |
| Reset password | `reset-password.html` | Reset your password — RunFree Vision Framers Portal |

Leave the others (Magic Link, Invite, Change Email) alone unless you start
using those flows — the portal doesn't.

## Why they're built this way

Email clients are not browsers. Outlook renders with Word's engine, Gmail
strips `<style>` blocks, and support for modern CSS is inconsistent. So:

- **Tables for layout**, not flexbox or grid.
- **Inline styles only.** Anything in a `<style>` block gets dropped by Gmail.
- **`bgcolor` alongside every gradient.** Clients that can't render
  `linear-gradient` fall back to solid magenta rather than showing nothing.
- **The raw URL is printed under every button**, because some corporate mail
  gateways rewrite or strip link markup — and a church staffer on a locked-down
  Outlook install is exactly the audience here.
- **Poppins is named first with a system fallback.** Almost no client will load
  a webfont; the fallback is what most people actually see, which is fine.

## Template variables

`{{ .ConfirmationURL }}` is the only one these use. Supabase also exposes
`{{ .Email }}`, `{{ .SiteURL }}`, and `{{ .Token }}` if you want to extend them.

## Before these matter

Set up **custom SMTP** first (Project Settings → Authentication → SMTP).
Supabase's built-in sender is capped at a few messages an hour and is
explicitly not for production — with email confirmation required, a framer who
never receives the mail simply cannot get in. Resend's free tier is enough and
takes about ten minutes.

Sending from your own domain also keeps these out of spam folders, which
matters more than the design does.
