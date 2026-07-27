import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { fetchDriveFile, isDriveConfigured } from "@/lib/drive";

/**
 * GET /api/resources/{id}/file
 *
 * The only route to a resource's bytes. Verifies the caller is signed in AND
 * on the certified framers allowlist before fetching from Drive, so the files
 * themselves never need to be publicly shared.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Must present a valid Supabase session token
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

    // 2. Must be on the allowlist
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

    // 3. Resource must exist and be published (admins may fetch drafts)
    const { data: resource } = await supabaseAdmin
      .from("resources")
      .select("id,title,google_drive_id,file_url,is_published")
      .eq("id", id)
      .single();

    if (!resource) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (!resource.is_published) {
      const { data: admin } = await supabaseAdmin
        .from("certified_framers")
        .select("is_admin")
        .eq("email", user.email)
        .single();

      if (!admin?.is_admin) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
    }

    // 4. Resources not backed by Drive just redirect to their URL
    if (!resource.google_drive_id) {
      if (resource.file_url) {
        return NextResponse.redirect(resource.file_url);
      }
      return NextResponse.json(
        { error: "Resource has no file attached" },
        { status: 404 }
      );
    }

    if (!isDriveConfigured()) {
      return NextResponse.json(
        {
          error:
            "Google Drive is not configured on the server (GOOGLE_SERVICE_ACCOUNT_KEY missing)",
        },
        { status: 503 }
      );
    }

    // 5. Fetch the CURRENT bytes from Drive
    const file = await fetchDriveFile(resource.google_drive_id);

    // 6. Record the access (best effort — never block the download)
    await supabaseAdmin
      .from("resource_access_logs")
      .insert({
        framer_id: framer.id,
        resource_id: resource.id,
        action: "download",
      })
      .then(
        () => undefined,
        () => undefined
      );

    return new NextResponse(new Uint8Array(file.body), {
      status: 200,
      headers: {
        "Content-Type": file.mimeType,
        "Content-Disposition": `inline; filename="${file.filename.replace(
          /"/g,
          ""
        )}"`,
        // Always revalidate so a Drive edit shows up on the next open.
        "Cache-Control": "private, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Drive fetch failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not fetch the file",
      },
      { status: 500 }
    );
  }
}
