import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Admin view of resource_access_logs — who opened what, and when.
 *
 * Supports the same filters as the /admin/logs UI (framer, source, date
 * range, free-text search over the file/module name) plus a CSV export via
 * ?format=csv, so the query-building logic lives in exactly one place.
 */

async function requireAdmin(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user?.email) return null;

  const { data: framer } = await supabaseAdmin
    .from("certified_framers")
    .select("id,is_admin")
    .eq("email", user.email)
    .single();

  return framer?.is_admin ? true : null;
}

const denied = () =>
  NextResponse.json({ error: "Admin access required" }, { status: 403 });

type LogRow = {
  id: string;
  source: string;
  resource_name: string;
  module: string | null;
  accessed_at: string;
  certified_framers: { name: string; email: string } | null;
};

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export async function GET(req: NextRequest) {
  const ok = await requireAdmin(req);
  if (!ok) return denied();

  const params = req.nextUrl.searchParams;
  const framerId = params.get("framerId");
  const source = params.get("source");
  const from = params.get("from");
  const to = params.get("to");
  const q = params.get("q")?.trim();
  const format = params.get("format");
  const limit = Math.min(Number(params.get("limit")) || 500, 2000);

  let query = supabaseAdmin
    .from("resource_access_logs")
    .select("id,source,resource_name,module,accessed_at,certified_framers(name,email)")
    .order("accessed_at", { ascending: false })
    .limit(limit);

  if (framerId) query = query.eq("framer_id", framerId);
  if (source) query = query.eq("source", source);
  if (from) query = query.gte("accessed_at", from);
  if (to) query = query.lte("accessed_at", to);
  if (q) query = query.or(`resource_name.ilike.%${q}%,module.ilike.%${q}%`);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data || []) as unknown as LogRow[];

  if (format === "csv") {
    const header = "Framer,Email,Source,File,Module,Accessed At\n";
    const body = rows
      .map((r) =>
        [
          r.certified_framers?.name || "",
          r.certified_framers?.email || "",
          r.source,
          r.resource_name,
          r.module || "",
          r.accessed_at,
        ]
          .map(csvEscape)
          .join(",")
      )
      .join("\n");

    return new NextResponse(header + body, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="access-logs.csv"`,
      },
    });
  }

  return NextResponse.json({
    logs: rows.map((r) => ({
      id: r.id,
      source: r.source,
      resourceName: r.resource_name,
      module: r.module,
      accessedAt: r.accessed_at,
      framerName: r.certified_framers?.name || "Unknown",
      framerEmail: r.certified_framers?.email || "",
    })),
  });
}
