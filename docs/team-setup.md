# Adding someone to the team

Applies to both RunFree portals — this one and the client portal.

The goal is that a new person runs three commands and has a working local copy,
with their own Claude Code session already knowing the project's rules. Nobody
should ever be pasted a secret in Slack.

---

## What a new person needs access to

Four systems, in this order. Each one is a couple of minutes.

### 1. GitHub — the code

Add them as a collaborator on the repo, or better, see *Move the repos to an
organisation* below.

### 2. Vercel — hosting, and how they get secrets

Vercel dashboard → Team Settings → Members → invite. **Member** is the right
role; Owner is not.

This one matters more than it looks. Vercel membership is how they get
environment variables — see below — so without it they cannot run the project
at all.

### 3. Supabase — database and auth

Supabase dashboard → Organization Settings → Team → invite. **Developer** is
usually right. Reserve Owner.

**Check what else is in that organisation before inviting.** Supabase access is
granted at organisation level, not per project, so adding someone here may give
them more than intended. Move unrelated projects to a different organisation
first if so.

### 4. Google Drive — the content

The service account already has folder access; a person does not need it to run
the code. They only need Drive access if they are editing the actual handouts,
which is a content job rather than a development one.

---

## Getting a working local copy

```bash
git clone <repo-url>
cd certified-vision-framers-portal
npm install
vercel link          # pick the RunFree team and this project
vercel env pull .env.local
npm run dev
```

`vercel env pull` writes the real environment variables straight from Vercel
into a gitignored file. **Never send secrets over Slack, email, or a document.**
If someone leaves the team, removing them from Vercel removes their route to
the keys, which is not true of anything that was pasted to them once.

### `npm run dev` says `next: command not found`

Expected on Andrew's machine, and not a broken install.

The repo sits under `.../Desktop/ChatGPT:Claude Data/`. `PATH` entries are
separated by colons, so when npm prepends `node_modules/.bin` to `PATH` that
colon splits the entry into two directories that do not exist. Every binary in
`node_modules/.bin` becomes unreachable through an npm script.

Run the binary directly instead:

```bash
./node_modules/.bin/next dev
./node_modules/.bin/next build
./node_modules/.bin/tsc --noEmit
```

Renaming the parent folder would fix it permanently, but it is also the key for
Claude Code's stored project memory, so the rename costs more than the
workaround. On a checkout in a colon-free path, `npm run dev` behaves normally.

---

## Working with Claude Code here

`CLAUDE.md` at the repo root loads automatically into every Claude Code session
in this project. It carries the rules and the traps, so a teammate's session
starts knowing what took real production incidents to learn.

Two consequences worth stating:

- **Read it before overriding it.** Several things in this codebase look wrong
  and are deliberate; the file says which.
- **Add to it when you learn something the hard way.** If a session lost an
  hour to something non-obvious, that belongs in CLAUDE.md so nobody spends the
  hour twice. It is the cheapest documentation in the project because it is the
  only kind that gets read every time.

---

## Move the repos to an organisation

Both repos currently live under Andrew's personal GitHub account. That works
until it doesn't:

- Access is granted per person per repo, rather than by team
- Ownership is tied to one individual's account
- There is no shared place for future RunFree repos

Creating a GitHub organisation (`runfree-co` or similar) and transferring both
repos fixes all three. GitHub keeps the full history, issues, and sets up a
redirect from the old URL, so existing clones keep working.

One follow-up after a transfer: **re-link the Vercel project to the new repo
location**, or deploys stop firing on push. Vercel does not follow the redirect.

Not urgent. Worth doing before the third person joins.

---

## Protecting the live portal

This portal serves real church leaders. The client portal will serve real
churches. A bad push to `main` is a bad deploy within about two minutes.

For a team this size, formal branch protection is probably more friction than
it is worth. What matters more:

- **Run the build before pushing.** `./node_modules/.bin/next build` catches
  most of what would break a deploy.
- **Use a pull request for anything touching auth, access control, or the
  webhook.** Those are the changes where a mistake is not visible on the page —
  it is visible in someone seeing content they should not.
- **Never point a local dev server at production and then run a destructive
  test.** The database is shared with production; there is no separate staging
  environment.
