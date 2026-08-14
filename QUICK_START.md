# Quick Start Guide - What's Built So Far

> **⚠️ Stale — from the initial scaffold (27 Jul), predates the shipped product.**
> Documents `/api/resources` and `/api/framers`, which do not exist, and env
> vars the code no longer reads. Not maintained. See `CLAUDE.md` and `docs/`
> for what is actually true.

## Summary

I've built the **foundation** for the Certified Vision Framers portal while you were away. Here's what's ready to go:

### ✅ Completed

**Core Infrastructure:**
- Next.js 15 project scaffold
- TypeScript setup
- Supabase integration (auth + database)
- Environment configuration template

**Database:**
- Complete schema with migrations (ready to run)
- Row-level security (RLS) policies for data protection
- Tables: `certified_framers`, `resources`, `resource_access_logs`, `ghl_sync_log`

**Authentication & Access Control:**
- Email-based login/signup (allowlist protected)
- Admin role system
- Session management via Supabase Auth

**Pages & UI:**
- Login page (`/auth/login`)
- Signup page (`/auth/signup`)
- Resources page (`/resources`) - browse & download materials
- Admin dashboard (`/admin`) - stats and quick actions

**API Routes:**
- `GET/POST /api/resources` - resource management
- `POST /api/webhooks/ghl` - GHL webhook receiver (ready for your API details)

**GHL Integration:**
- Webhook receiver skeleton
- Contact sync functions
- Ready to connect once you provide API credentials

---

## What I Need From You

### 1. **Supabase Setup** (5 min)
Create a Supabase project:
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (from Settings → API)
3. Go to SQL Editor → New query
4. Copy the entire content from `supabase/migrations/001_initial_schema.sql`
5. Run the migration
6. Go to `certified_framers` table and add your email (with `is_admin = true`)

### 2. **GHL Details** (for webhook integration)
When ready to connect GHL:
- GHL API Key
- GHL Account ID
- Custom field ID for "Certified Vision Framer"

### 3. **Google Drive Folder** (optional)
- Folder ID where you'll store handouts (or we can use Vercel Blob storage instead)

---

## Next Steps to Get Running

### Step 1: Fill in `.env.local`
```bash
cp .env.example .env.local
```

Then edit with:
- Supabase URL and keys (from Step 1 above)
- Google Drive folder ID (if using Drive)
- GHL details (if ready)

### Step 2: Install & Run
```bash
cd /Users/Revive_Worship/Desktop/ChatGPT:Claude Data/certified-vision-framers-portal

npm install

npm run dev
```

Visit: `http://localhost:3000/auth/login`

### Step 3: Test Login
1. Try to login with your email
2. It should say "Email not authorized" (expected)
3. Go to Supabase → `certified_framers` table
4. Add your email, name, set `is_admin = true`
5. Try signup again

### Step 4: Add Some Resources
1. Login as admin
2. Go to `/admin`
3. Click "Add New Resource"
4. Create a few test resources

### Step 5: Deploy to Vercel (when ready)
```bash
vercel deploy --prod
```

Set environment variables in Vercel dashboard.

---

## File Structure Overview

```
certified-vision-framers-portal/
├── ARCHITECTURE.md          # Full tech architecture doc
├── README.md                # Complete docs
├── QUICK_START.md          # This file
├── .env.example            # Environment template
├── package.json            # Dependencies
├── next.config.ts          # Next.js config
├── tsconfig.json           # TypeScript config
│
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout
│   │   ├── auth/login/page.tsx     # Login page
│   │   ├── auth/signup/page.tsx    # Signup page
│   │   ├── resources/page.tsx      # Resource library (public)
│   │   ├── admin/page.tsx          # Admin dashboard
│   │   └── api/
│   │       ├── resources/route.ts  # Resource API
│   │       └── webhooks/ghl/route.ts  # GHL webhook
│   │
│   ├── lib/
│   │   ├── supabase.ts    # Supabase client
│   │   ├── auth.ts        # Auth functions
│   │   ├── ghl.ts         # GHL integration
│   │   └── types/index.ts # TypeScript types
│   │
│   └── types/
│       └── index.ts       # Shared type definitions
│
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql  # Database setup
│
└── docs/
    ├── GHL_SETUP.md       # (TBD) GHL integration guide
    ├── DEPLOYMENT.md      # (TBD) Deployment guide
    └── ADMIN_GUIDE.md     # (TBD) Admin manual
```

---

## What's NOT Built Yet (Phase 2+)

- Admin pages for resource management (CRUD UI)
- Admin pages for framer management
- Member directory
- Discussion forum
- Email notifications
- Analytics dashboard
- Peer resource sharing
- Certificate generation

These can be added as needed.

---

## Key Design Decisions

1. **Email-based allowlist:** Only approved emails can access. More secure than open signup.
2. **Admin role system:** Allows delegation to other team members
3. **RLS (Row-Level Security):** Database-level protection, not just app-level
4. **Google Drive integration:** Store files in Drive, proxy through app (keeps handoffs simple)
5. **GHL webhook:** Auto-sync when you tag someone in GHL (no manual entry needed)
6. **Vercel hosting:** Same stack as your other projects, easy hand-off

---

## Troubleshooting

**"Cannot find module" errors:**
```bash
npm install
```

**Supabase connection errors:**
- Check `.env.local` has correct URLs and keys
- Verify Supabase project is created
- Check you ran the migration SQL

**Login not working:**
- Verify email is in `certified_framers` table
- Check `is_admin = true` for admin access
- Look at Supabase auth logs

**GHL webhook not connecting:**
- You need GHL API credentials first
- Update `.env.local`
- Test with GHL webhook tester

---

## Next Time You Work On This

1. Read **ARCHITECTURE.md** for full tech design
2. Read **README.md** for complete documentation
3. Follow **QUICK_START.md** (this file) to get running
4. Start building missing admin pages, or hand off to another admin to finish

---

Questions? Check the README.md or ARCHITECTURE.md for more details!
