# Certified Vision Framers Portal - Architecture & Plan

## Overview
A gated web application for RunFree's Certified Vision Framers to access training materials, facilitator guides, handouts, and resources. Integrates with GoHighLevel (GHL) for auto-sync of certified people.

**Tech Stack:**
- Frontend: Next.js 15 + React + TypeScript
- Backend: Next.js API routes + Supabase (PostgreSQL)
- Auth: Supabase Auth (email/password with allowlist)
- Storage: Google Drive (proxied via app) + optional Vercel Blob
- Hosting: Vercel
- Domain: `certified.runfree.co` (TBD)

---

## Phase 1: MVP (Current)

### Features
- ✅ Email-gated login (allowlist from Supabase)
- ✅ Resource hub (Handouts | Facilitator's Guide | Training Videos | Templates | Resources)
- ✅ Resource upload/management (admin only)
- ✅ Google Drive integration (fetch handouts)
- ✅ Admin interface (manage resources, add certified people)
- ✅ Access logging (track who accessed what)
- ⏳ GHL sync (skeleton ready, needs API details)

### Database Schema

```
Tables:

1. certified_framers
   - id (uuid, primary key)
   - email (text, unique)
   - name (text)
   - ghl_contact_id (text, optional) - GHL sync reference
   - created_at (timestamp)
   - updated_at (timestamp)
   - is_admin (boolean, default: false)

2. resources
   - id (uuid, primary key)
   - title (text)
   - description (text)
   - category (enum: handout, guide, video, template, resource)
   - file_url (text) - Google Drive or Blob storage URL
   - file_type (text) - pdf, video, doc, etc.
   - google_drive_id (text, optional) - for Drive proxy
   - created_by (uuid, foreign key -> certified_framers)
   - created_at (timestamp)
   - updated_at (timestamp)
   - is_published (boolean, default: true)

3. resource_access_logs
   - id (uuid, primary key)
   - framer_id (uuid, foreign key -> certified_framers)
   - resource_id (uuid, foreign key -> resources)
   - accessed_at (timestamp)
   - action (enum: view, download)

4. ghl_sync_log
   - id (uuid, primary key)
   - ghl_contact_id (text)
   - status (enum: success, failed)
   - last_synced_at (timestamp)
   - error_message (text, nullable)
```

---

## Phase 2: Future Enhancements

- Member directory (peer connection)
- Discussion forum / comments on resources
- Peer resource sharing
- Certification renewal tracking
- Certificate generation/download
- Email notifications for new resources
- Assessment/training completion tracking

---

## GHL Integration (Ready for Your API Details)

### Current Setup
- Skeleton functions in `/lib/ghl.ts`
- Webhook receiver ready at `/api/webhooks/ghl`
- Needs: GHL API key, account ID, and custom field ID for "Certified Vision Framer"

### What We'll Do (Once You Provide Details)
1. **Option A:** When you tag someone in GHL as "Certified Vision Framer", a webhook fires → we create a login automatically
2. **Option B:** Admin manually adds emails to app, sync status to GHL
3. **Option C:** Bi-directional sync (both ways)

---

## Admin Management & Transferability

### Admin Roles
- **Super Admin**: Can manage admins, resources, certified framers, all settings
- **Editor**: Can upload/edit resources, approve resource additions
- **Viewer**: Can only access resources (regular certified framer)

### Multi-Admin Setup
- `is_admin` flag in `certified_framers` table
- Admin dashboard at `/admin` (protected route)
- Audit log for all admin actions
- Export/import capability for handoff scenarios

---

## File Structure

```
certified-vision-framers-portal/
├── .env.local (git ignored)
├── .env.example
├── next.config.ts
├── tsconfig.json
├── package.json
├── public/
│   └── logo.svg
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── signup/page.tsx
│   │   ├── (app)/
│   │   │   ├── resources/page.tsx
│   │   │   ├── resources/[id]/page.tsx
│   │   │   └── profile/page.tsx
│   │   ├── admin/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── resources/page.tsx
│   │   │   ├── resources/new/page.tsx
│   │   │   ├── resources/[id]/edit/page.tsx
│   │   │   └── framers/page.tsx
│   │   └── api/
│   │       ├── auth/ (handled by Supabase)
│   │       ├── resources/
│   │       │   ├── route.ts (GET, POST)
│   │       │   └── [id]/route.ts (GET, PATCH, DELETE)
│   │       ├── framers/route.ts (GET, POST, PATCH, DELETE)
│   │       ├── access-log/route.ts (POST)
│   │       └── webhooks/
│   │           └── ghl.ts (GHL sync)
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── auth.ts
│   │   ├── ghl.ts
│   │   ├── drive.ts
│   │   └── utils.ts
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   ├── ResourceCard.tsx
│   │   ├── UploadForm.tsx
│   │   └── admin/
│   │       ├── ResourceManager.tsx
│   │       └── FramerManager.tsx
│   └── types/
│       └── index.ts
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
└── docs/
    ├── GHL_SETUP.md
    ├── DEPLOYMENT.md
    └── ADMIN_GUIDE.md
```

---

## Environment Variables Needed

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

GHL_API_KEY=
GHL_ACCOUNT_ID=
GHL_WEBHOOK_SECRET=
GHL_CUSTOM_FIELD_ID= (for "Certified Vision Framer" tag)

GOOGLE_DRIVE_FOLDER_ID=
GOOGLE_SERVICE_ACCOUNT_KEY= (JSON)

VERCEL_BLOB_TOKEN= (optional, for file storage)
```

---

## Deployment Checklist

- [ ] Create Supabase project
- [ ] Run migrations to create tables
- [ ] Set up email auth in Supabase
- [ ] Create Vercel project
- [ ] Connect GitHub repo
- [ ] Set environment variables in Vercel
- [ ] Set up custom domain `certified.runfree.co`
- [ ] Get GHL API details, add to env vars
- [ ] Set up GHL webhook in their dashboard
- [ ] Test email login with allowlist
- [ ] Test resource upload/access
- [ ] Test GHL sync (once API details provided)

---

## Next Steps

1. **You provide:**
   - GHL API key, account ID, custom field ID
   - Google Drive folder ID for handouts
   - List of initial certified framer emails

2. **We'll do:**
   - Initialize Next.js + Supabase
   - Build auth system
   - Build resource management UI
   - Create admin dashboard
   - Set up GHL webhook receiver
   - Deploy to Vercel

---

## Notes on Multi-Admin Handoff

- All admin actions logged with timestamp + admin email
- CSV export of all data at any time
- Role-based permissions prevent accidents
- Super admin can promote/demote other admins
- No single point of failure once deployed
