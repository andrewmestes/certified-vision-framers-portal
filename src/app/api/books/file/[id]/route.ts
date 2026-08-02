import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { fetchDriveFile } from "@/lib/drive";
import { listBooksLibrary, isDriveConfigured } from "@/lib/books";

/**
 * GET /api/books/file/{driveId}
 *
 * Gated the same way as /api/library/file — session, allowlist, and a check
 * that the requested id is actually part of the books library before it's
 * ever handed to Drive.
 */
/**
 * The set of file ids this route will serve, recomputed from Drive rather
 * than trusted from the request — but cached, because a single PDF preview
 * now issues a series of ranged reads and re-listing the whole Drive folder
 * on every one of them made the previews slower than the full download they
 * were meant to replace.
 */
let idCache: { at: number; ids: Set<string> } | null = null;
const ID_TTL_MS = 60_000;

async function knownFileIds(): Promise<Set<string>> {
  if (idCache && Date.now() - idCache.at < ID_TTL_MS) return idCache.ids;

  const library = await listBooksLibrary();
  const ids = new Set(
    library.books.flatMap((b) =>
      [b.fullBook, b.visualSummary, ...b.chapters, ...b.other]
        .filter(Boolean)
        .map((f) => f!.id)
    )
  );
  library.extras.forEach((f) => ids.add(f.id));

  idCache = { at: Date.now(), ids };
  return ids;
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

    const known = await knownFileIds();

    if (!known.has(id)) {
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
    console.error("Book file fetch failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not fetch the file",
      },
      { status: 500 }
    );
  }
}
