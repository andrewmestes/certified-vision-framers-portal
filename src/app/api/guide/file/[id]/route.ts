import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { fetchDriveFile } from "@/lib/drive";
import { getFacilitatorGuide, isDriveConfigured } from "@/lib/guide";

/**
 * GET /api/guide/file/{id}
 *
 * The id is re-validated against a fresh getFacilitatorGuide() lookup rather
 * than trusted from the request — the same "recompute, don't trust" pattern
 * as every other gated file route.
 */
/**
 * Cached for the same reason as the books file route: a page-one preview
 * issues several ranged reads, and re-querying Drive to re-validate the id on
 * each one cost far more than the bytes being saved.
 */
let guideCache: {
  at: number;
  value: Awaited<ReturnType<typeof getFacilitatorGuide>>;
} | null = null;
const GUIDE_TTL_MS = 60_000;

async function currentGuide() {
  if (guideCache && Date.now() - guideCache.at < GUIDE_TTL_MS) {
    return guideCache.value;
  }
  const value = await getFacilitatorGuide();
  guideCache = { at: Date.now(), value };
  return value;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user?.email) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const { data: framer } = await supabaseAdmin
      .from("certified_framers")
      .select("id")
      .eq("email", user.email)
      .single();

    if (!framer) {
      return NextResponse.json(
        { error: "Not a certified Vision Framer" },
        { status: 403 }
      );
    }

    if (!isDriveConfigured()) {
      return NextResponse.json(
        { error: "Drive is not configured on the server" },
        { status: 503 }
      );
    }

    const current = await currentGuide();
    if (!current || current.id !== id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Forward any Range so pdf.js can pull just the bytes it needs for a
    // page-one preview instead of the whole document.
    const range = req.headers.get("range");
    const file = await fetchDriveFile(id, range);

    return new NextResponse(file.body, {
      status: file.status,
      headers: {
        "Content-Type": file.mimeType,
        "Content-Disposition": `inline; filename="${file.filename.replace(/"/g, "")}"`,
        "Cache-Control": "private, no-cache, must-revalidate",
        "Accept-Ranges": "bytes",
        ...(file.contentRange ? { "Content-Range": file.contentRange } : {}),
        ...(file.contentLength ? { "Content-Length": file.contentLength } : {}),
      },
    });
  } catch (error) {
    console.error("Guide file fetch failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not fetch the file" },
      { status: 500 }
    );
  }
}
