import { google } from "googleapis";
import { Readable } from "node:stream";

/**
 * Google Drive access via a service account.
 *
 * The portal never stores a copy of a file — it stores the Drive file ID and
 * fetches the live bytes on each request. Editing the file in Drive is
 * therefore reflected immediately, with no sync step.
 *
 * Files stay fully private in Drive: they are shared only with the service
 * account, so there is no public URL. Access is gated by the portal's own
 * allowlist check before this module is ever called.
 */

// Google-native files can't be downloaded directly; they must be exported.
const EXPORT_AS: Record<string, { mime: string; ext: string }> = {
  "application/vnd.google-apps.document": {
    mime: "application/pdf",
    ext: "pdf",
  },
  "application/vnd.google-apps.presentation": {
    mime: "application/pdf",
    ext: "pdf",
  },
  "application/vnd.google-apps.drawing": {
    mime: "application/pdf",
    ext: "pdf",
  },
  "application/vnd.google-apps.spreadsheet": {
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ext: "xlsx",
  },
};

export function isDriveConfigured(): boolean {
  return Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
}

function getDriveClient() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

  if (!raw) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY is not set");
  }

  let credentials: { client_email: string; private_key: string };
  try {
    credentials = JSON.parse(raw);
  } catch {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_KEY is not valid JSON — paste the whole service account key file as one line"
    );
  }

  // Env vars often arrive with the private key's newlines escaped.
  if (credentials.private_key?.includes("\\n")) {
    credentials.private_key = credentials.private_key.replace(/\\n/g, "\n");
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });

  return google.drive({ version: "v3", auth });
}

export type DriveFile = {
  /** Web stream, so large files aren't buffered in the function's memory. */
  body: ReadableStream;
  mimeType: string;
  filename: string;
};

/**
 * Fetch the current contents of a Drive file as a stream.
 *
 * Streaming matters here: buffering the whole file would blow past the
 * serverless response-body limit on anything large (the certification
 * notebook alone is ~36MB). Streamed responses aren't subject to that cap.
 *
 * Google Docs/Slides/Sheets are exported (Docs and Slides to PDF); everything
 * else is passed through untouched.
 */
export async function fetchDriveFile(fileId: string): Promise<DriveFile> {
  const drive = getDriveClient();

  const meta = await drive.files.get({
    fileId,
    fields: "name,mimeType",
    supportsAllDrives: true,
  });

  const sourceMime = meta.data.mimeType || "application/octet-stream";
  const name = meta.data.name || "download";
  const exportTarget = EXPORT_AS[sourceMime];

  if (exportTarget) {
    const res = await drive.files.export(
      { fileId, mimeType: exportTarget.mime },
      { responseType: "stream" }
    );

    return {
      body: Readable.toWeb(res.data as Readable) as ReadableStream,
      mimeType: exportTarget.mime,
      filename: `${name}.${exportTarget.ext}`,
    };
  }

  const res = await drive.files.get(
    { fileId, alt: "media", supportsAllDrives: true },
    { responseType: "stream" }
  );

  return {
    body: Readable.toWeb(res.data as Readable) as ReadableStream,
    mimeType: sourceMime,
    filename: name,
  };
}

export { extractDriveId } from "./drive-id";

export type PortalFile = {
  id: string;
  name: string;
  /** Filename with the leading "01 " ordering prefix and extension removed. */
  title: string;
  mimeType: string;
  sizeBytes: number | null;
  modifiedTime: string | null;
  /** Sort key taken from a leading number in the filename, if present. */
  order: number;
};

export type PortalModule = {
  id: string;
  name: string;
  /** Leading number of the folder ("2 - Crowd Cloud" -> 2), else large. */
  order: number;
  files: PortalFile[];
};

const FOLDER_MIME = "application/vnd.google-apps.folder";

function leadingNumber(name: string): number {
  const m = name.match(/^\s*(\d+)/);
  return m ? parseInt(m[1], 10) : Number.MAX_SAFE_INTEGER;
}

function toTitle(filename: string): string {
  return filename
    .replace(/\.[a-z0-9]{1,5}$/i, "") // extension
    .replace(/^\s*\d+(\.\d+)?\s+/, "") // leading "01 " / "03.1 "
    .replace(/\s*-\s*CERT$/i, "") // certification marker
    .trim();
}

/**
 * True for the timestamped export twins Drive accumulates
 * ("Wet Cement Philosophy 10.34.07 AM.pdf").
 */
function isTimestampedExport(name: string): boolean {
  return /\d{1,2}\.\d{2}\.\d{2}\s*(AM|PM)\.[a-z0-9]+$/i.test(name);
}

/**
 * Read the shared Drive folder and return it grouped by module subfolder.
 *
 * This IS the resource list — the portal keeps no copy, so whatever is in
 * Drive is what framers see. Adding, renaming, or removing a file in Drive
 * needs no action here.
 */
export async function listPortalLibrary(): Promise<PortalModule[]> {
  const rootId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!rootId) {
    throw new Error("GOOGLE_DRIVE_FOLDER_ID is not set");
  }

  const drive = getDriveClient();

  // One flat query, then rebuild the tree locally — far fewer round trips
  // than walking folder by folder.
  const all: {
    id: string;
    name: string;
    mimeType: string;
    parents?: string[];
    size?: string;
    modifiedTime?: string;
  }[] = [];

  let pageToken: string | undefined;
  do {
    const res = await drive.files.list({
      pageSize: 1000,
      pageToken,
      q: "trashed = false",
      fields:
        "nextPageToken, files(id,name,mimeType,parents,size,modifiedTime)",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    all.push(...((res.data.files || []) as typeof all));
    pageToken = res.data.nextPageToken || undefined;
  } while (pageToken);

  const folders = all.filter((f) => f.mimeType === FOLDER_MIME);
  const files = all.filter((f) => f.mimeType !== FOLDER_MIME);

  // Hide a timestamped export when a cleaner twin of the same doc exists.
  const canonical = new Set(
    files
      .filter((f) => !isTimestampedExport(f.name))
      .map((f) => toTitle(f.name).toLowerCase())
  );

  const childrenOf = (folderId: string) =>
    files
      .filter((f) => (f.parents || []).includes(folderId))
      .filter(
        (f) =>
          !isTimestampedExport(f.name) ||
          !canonical.has(toTitle(f.name).toLowerCase())
      )
      .map<PortalFile>((f) => ({
        id: f.id,
        name: f.name,
        title: toTitle(f.name),
        mimeType: f.mimeType,
        sizeBytes: f.size ? Number(f.size) : null,
        modifiedTime: f.modifiedTime || null,
        order: leadingNumber(f.name),
      }))
      .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));

  const moduleFolders = folders.filter((f) =>
    (f.parents || []).includes(rootId)
  );

  const modules: PortalModule[] = moduleFolders.map((folder) => {
    // Roll nested subfolders (e.g. "Additional Tools") into their parent
    // module rather than surfacing a second level of nesting.
    const nested = folders.filter((f) => (f.parents || []).includes(folder.id));
    const own = childrenOf(folder.id);
    const inherited = nested.flatMap((n) => childrenOf(n.id));

    return {
      id: folder.id,
      name: folder.name,
      order: leadingNumber(folder.name),
      files: [...own, ...inherited],
    };
  });

  // Files sitting loose in the root become their own group.
  const loose = childrenOf(rootId);
  if (loose.length) {
    modules.push({
      id: rootId,
      name: "General",
      order: Number.MAX_SAFE_INTEGER,
      files: loose,
    });
  }

  return modules
    .filter((m) => m.files.length > 0)
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
}
