import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Client-side Supabase instance (for browser)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side Supabase instance (for API routes) - only created if service key exists
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
          source: "library" | "books" | "guide";
          resource_id: string;
          resource_name: string;
          module: string | null;
          accessed_at: string;
        };
        Insert: {
          id?: string;
          framer_id: string;
          source: "library" | "books" | "guide";
          resource_id: string;
          resource_name: string;
          module?: string | null;
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
