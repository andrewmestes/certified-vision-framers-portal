import { supabaseAdmin } from "@/lib/supabase";

/**
 * Records that a framer opened a gated file. Best-effort: a logging failure
 * should never turn into a 500 for someone just trying to read a handout, so
 * callers fire this without awaiting the result on the request's success path.
 */
export async function logAccess(entry: {
  framerId: string;
  source: "library" | "books" | "guide";
  resourceId: string;
  resourceName: string;
  module?: string | null;
}) {
  const { error } = await supabaseAdmin.from("resource_access_logs").insert({
    framer_id: entry.framerId,
    source: entry.source,
    resource_id: entry.resourceId,
    resource_name: entry.resourceName,
    module: entry.module ?? null,
  });

  if (error) {
    console.error("Access log insert failed:", error);
  }
}
