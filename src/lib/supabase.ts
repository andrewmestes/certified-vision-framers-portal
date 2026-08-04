import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Client-side Supabase instance (for browser)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Server-side client for API routes.
 *
 * Falling back to the anon client when the service key is missing looks
 * forgiving and is the opposite. Every server route reads certified_framers to
 * decide who you are, RLS blocks that read for anon, so the fallback doesn't
 * degrade anything — it locks out every single user with a 403 and no clue
 * why, while the deploy reports healthy. A missing service key is a broken
 * deploy, so say so at import time where it is one obvious line in the Vercel
 * log, rather than a support ticket from a confused church leader.
 */
if (!supabaseServiceKey) {
  console.error(
    "SUPABASE_SERVICE_ROLE_KEY is not set. Every gated route will fail its access check and no one will be able to sign in."
  );
}

export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : supabase;

export type Database = {
  public: {
    Tables: {
      certified_framers: {
        Row: {
          id: string;
          email: string;
          name: string;
          ghl_contact_id: string | null;
          is_admin: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          name: string;
          ghl_contact_id?: string | null;
          is_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          ghl_contact_id?: string | null;
          is_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      resources: {
        Row: {
          id: string;
          title: string;
          description: string;
          category: "handout" | "guide" | "video" | "template" | "resource";
          file_url: string;
          file_type: string;
          google_drive_id: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
          is_published: boolean;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          category: "handout" | "guide" | "video" | "template" | "resource";
          file_url: string;
          file_type: string;
          google_drive_id?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
          is_published?: boolean;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          category?: "handout" | "guide" | "video" | "template" | "resource";
          file_url?: string;
          file_type?: string;
          google_drive_id?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
          is_published?: boolean;
        };
      };
      resource_access_logs: {
        Row: {
          id: string;
          framer_id: string;
          resource_id: string;
          action: "view" | "download";
          accessed_at: string;
        };
        Insert: {
          id?: string;
          framer_id: string;
          resource_id: string;
          action: "view" | "download";
          accessed_at?: string;
        };
      };
      ghl_sync_log: {
        Row: {
          id: string;
          ghl_contact_id: string;
          status: "success" | "failed";
          last_synced_at: string;
          error_message: string | null;
        };
        Insert: {
          id?: string;
          ghl_contact_id: string;
          status: "success" | "failed";
          last_synced_at?: string;
          error_message?: string | null;
        };
      };
    };
  };
};
