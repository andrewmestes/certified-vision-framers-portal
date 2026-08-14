# Certified Vision Framers Portal

> **⚠️ Stale — from the initial scaffold (27 Jul), predates the shipped product.**
> Documents `/api/resources` and `/api/framers`, which do not exist, and env
> vars the code no longer reads. Not maintained. See `CLAUDE.md` and `docs/`
> for what is actually true.

A gated web application for RunFree's Certified Vision Framers to access training materials, guides, and resources.

## Features (MVP)

- ✅ Email-gated login (only approved certified framers)
- ✅ Resource library (Handouts, Guides, Videos, Templates, Resources)
- ✅ Admin dashboard for resource management
- ✅ Access tracking and logging
- ✅ GHL integration (ready for webhook setup)
- ✅ Role-based access control (admin/viewer)

## Tech Stack

- **Frontend:** Next.js 15, React, TypeScript
- **Backend:** Next.js API routes
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **Storage:** Google Drive (proxied via app)
- **Hosting:** Vercel

## Getting Started

### 1. Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- Vercel account (for deployment)
- Google Drive with folder for resources (optional)
- GHL account with API access (for integration)

### 2. Setup

```bash
# Install dependencies
npm install

# Create .env.local from .env.example
cp .env.example .env.local

# Fill in your environment variables
# See ENV SETUP section below
```

### 3. Environment Setup

Create a `.env.local` file with the following:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google Drive
GOOGLE_DRIVE_FOLDER_ID=your-folder-id
GOOGLE_SERVICE_ACCOUNT_KEY=your-json-key

# GHL (optional, for integration)
GHL_API_KEY=your-api-key
GHL_ACCOUNT_ID=your-account-id
GHL_WEBHOOK_SECRET=your-secret
GHL_CUSTOM_FIELD_ID=your-field-id
```

### 4. Database Setup

1. Create a new Supabase project
2. Run the migration in `supabase/migrations/001_initial_schema.sql`:
   - Go to Supabase dashboard
   - Navigate to SQL Editor
   - Create new query
   - Paste the migration SQL
   - Run it

3. Alternatively, use Supabase CLI:
   ```bash
   npx supabase db push
   ```

### 5. Add Initial Certified Vision Framers

In Supabase dashboard:
1. Go to Tables → `certified_framers`
2. Click "Insert" → "New row"
3. Add their email, name, and set `is_admin` if needed

### 6. Local Development

```bash
npm run dev
```

Visit `http://localhost:3000`

### 7. Deployment

1. Push code to GitHub
2. Connect repo to Vercel
3. Add environment variables in Vercel settings
4. Deploy

```bash
# Or deploy via CLI
vercel deploy --prod
```

## Project Structure

```
src/
├── app/
│   ├── auth/          # Login/signup pages
│   ├── resources/     # Public resource hub
│   ├── admin/         # Admin dashboard
│   └── api/           # API routes
├── lib/
│   ├── supabase.ts    # Supabase client
│   ├── auth.ts        # Auth functions
│   ├── ghl.ts         # GHL integration
│   └── types/         # TypeScript types
├── components/        # Reusable React components
└── types/             # Type definitions
```

## Admin Features

### Dashboard
- View stats (framers, resources, access logs)
- Quick actions to manage resources

### Resource Management
- Add/edit/delete resources
- Upload to Google Drive or Vercel Blob
- Publish/unpublish resources
- Filter by category

### Framer Management
- View all certified framers
- Add new certified framers
- Update framer roles (admin/viewer)
- Remove framers

### Access Logs
- View when framers accessed resources
- Track downloads
- Export logs (TBD)

## GHL Integration Setup

Once you have GHL API details:

1. **Get your custom field ID:**
   - In GHL, go to Settings → Custom Fields
   - Find or create a field for "Certified Vision Framer"
   - Note the field ID

2. **Set webhook in GHL:**
   - Go to Settings → Webhooks
   - Add new webhook
   - URL: `https://your-domain.com/api/webhooks/ghl`
   - Events: "Contact Updated"
   - Secret: Generate and save to `.env.local`

3. **Update `.env.local`:**
   ```env
   GHL_API_KEY=xxx
   GHL_ACCOUNT_ID=xxx
   GHL_WEBHOOK_SECRET=xxx
   GHL_CUSTOM_FIELD_ID=xxx
   ```

4. **How it works:**
   - When you tag a contact in GHL with "Certified Vision Framer"
   - GHL sends webhook → Our app creates portal login
   - Contact gets access to resources automatically

## API Endpoints

### Resources
- `GET /api/resources` - List all published resources
- `POST /api/resources` - Create new resource (admin only)
- `PATCH /api/resources/[id]` - Update resource (admin only)
- `DELETE /api/resources/[id]` - Delete resource (admin only)

### Framers
- `GET /api/framers` - List all certified framers (admin only)
- `POST /api/framers` - Add new framer (admin only)
- `DELETE /api/framers/[email]` - Remove framer (admin only)

### Webhooks
- `POST /api/webhooks/ghl` - GHL webhook receiver

## Database Schema

### `certified_framers`
- `id` (uuid, primary key)
- `email` (text, unique)
- `name` (text)
- `ghl_contact_id` (text, optional)
- `is_admin` (boolean)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### `resources`
- `id` (uuid, primary key)
- `title`, `description` (text)
- `category` (enum: handout, guide, video, template, resource)
- `file_url`, `file_type` (text)
- `google_drive_id` (text, optional)
- `created_by` (uuid, fk to certified_framers)
- `is_published` (boolean)
- `created_at`, `updated_at` (timestamp)

### `resource_access_logs`
- `id` (uuid, primary key)
- `framer_id` (uuid, fk)
- `resource_id` (uuid, fk)
- `action` (view/download)
- `accessed_at` (timestamp)

### `ghl_sync_log`
- `id` (uuid, primary key)
- `ghl_contact_id` (text)
- `status` (success/failed)
- `last_synced_at` (timestamp)
- `error_message` (text, nullable)

## Multi-Admin Handoff

When transferring to another admin:

1. Create their account and make them admin
2. Export current data via Supabase dashboard
3. Document current resource library
4. Brief them on GHL integration
5. They can log in and take over

All actions are logged with timestamp for audit trail.

## Next Steps / Phase 2

- [ ] Member directory (peer connection)
- [ ] Discussion forum for resource comments
- [ ] Email notifications for new resources
- [ ] Certification renewal tracking
- [ ] Certificate generation/download
- [ ] Peer resource sharing
- [ ] Usage analytics dashboard

## Troubleshooting

### "Email not authorized to access this portal"
- Email must be added to `certified_framers` table first
- Check email spelling exactly

### Login not working
- Verify Supabase auth is enabled
- Check environment variables are correct
- Ensure email is in `certified_framers` table

### Resources not showing
- Verify `is_published = true` for resources
- Check that user is logged in
- Review RLS policies in Supabase

## Support

For issues or questions:
1. Check Supabase logs
2. Review Next.js dev server output
3. Check browser console for errors

---

Built with ❤️ for RunFree's Vision Framers community
