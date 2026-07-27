export type ResourceCategory = "handout" | "guide" | "video" | "template" | "resource";
export type AccessAction = "view" | "download";
export type SyncStatus = "success" | "failed";

export interface CertifiedFramer {
  id: string;
  email: string;
  name: string;
  ghl_contact_id: string | null;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface Resource {
  id: string;
  title: string;
  description: string;
  category: ResourceCategory;
  file_url: string;
  file_type: string;
  google_drive_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_published: boolean;
  created_by_name?: string;
}

export interface ResourceAccessLog {
  id: string;
  framer_id: string;
  resource_id: string;
  action: AccessAction;
  accessed_at: string;
}

export interface GHLSyncLog {
  id: string;
  ghl_contact_id: string;
  status: SyncStatus;
  last_synced_at: string;
  error_message: string | null;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
