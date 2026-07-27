import { google } from "googleapis";

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
  body: Buffer;
  mimeType: string;
  filename: string;
};

/**
 * Fetch the current contents of a Drive file.
 * Google Docs/Slides/Sheets are exported (Docs and Slides to PDF); everything
 * else is streamed as-is.
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
      { responseType: "arraybuffer" }
    );

    return {
      body: Buffer.from(res.data as ArrayBuffer),
      mimeType: exportTarget.mime,
      filename: `${name}.${exportTarget.ext}`,
    };
  }

  const res = await drive.files.get(
    { fileId, alt: "media", supportsAllDrives: true },
    { responseType: "arraybuffer" }
  );

  return {
    body: Buffer.from(res.data as ArrayBuffer),
    mimeType: sourceMime,
    filename: name,
  };
}

export { extractDriveId } from "./drive-id";
