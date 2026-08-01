import { google } from "googleapis";

/**
 * Books library — a live mirror of "Books : Content" in Drive, the same
 * philosophy as the handouts library: the portal holds no copy, so whatever
 * Will finalizes in Drive just appears. No import step, nothing to re-run.
 *
 * The folder is messier than the handouts folder (mixed naming, a file
 * explicitly marked "not for distribution", a stray "Workbook" alongside the
 * real book), so this does more classification work than lib/drive.ts. Every
 * heuristic below is a one-line fix if it ever guesses wrong — none of it is
 * hardcoded to today's specific filenames.
 */

const FOLDER_MIME = "application/vnd.google-apps.folder";

const BOOK_DEFS = [
  { name: "Future Church", key: "futurechurch" },
  { name: "Church Unique", key: "churchunique" },
  { name: "God Dreams", key: "goddreams" },
  { name: "Younique", key: "younique" },
] as const;

export type BookFile = {
  id: string;
  name: string;
  title: string;
  /** Chapter number, when one could be parsed ("1", "7-10"). */
  num: string | null;
  label: string;
  mimeType: string;
  sizeBytes: number | null;
};

export type BookShelf = {
  id: string;
  name: string;
  fullBook: BookFile | null;
  visualSummary: BookFile | null;
  chapters: BookFile[];
  /** Workbooks, bullet-books, anything real but not chapter/full-book. */
  other: BookFile[];
};

export type BooksLibrary = {
  books: BookShelf[];
  /** Root-level files that didn't match any known book — shown, not dropped. */
  extras: BookFile[];
};

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isDriveConfigured(): boolean {
  return Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
}

function getDriveClient() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!raw) throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY is not set");

  let credentials: { client_email: string; private_key: string };
  try {
    credentials = JSON.parse(raw);
  } catch {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY is not valid JSON");
  }
  if (credentials.private_key?.includes("\\n")) {
    credentials.private_key = credentials.private_key.replace(/\\n/g, "\n");
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });
  return google.drive({ version: "v3", auth });
}

/** Anything explicitly flagged as not for distribution is skipped outright. */
function isExcluded(name: string): boolean {
  return /not\s*for\s*distribution/i.test(name);
}

function isChapterFile(name: string, parentFolderName: string | null): boolean {
  if (parentFolderName && /chapters?$/i.test(parentFolderName.trim())) {
    return true;
  }
  return /\bchapter\b/i.test(name) || /^ch0*\d+[_\s-]/i.test(name.trim());
}

/**
 * Full-book candidate: normalized name, with "book" removed, EQUALS the
 * book's key exactly — i.e. "Church Unique Book.pdf" for Church Unique,
 * "God Dreams Book.pdf" for God Dreams. Deliberately strict rather than a
 * "contains" match: a looser rule let "Forging Future Church Book.pdf" (a
 * different, unwanted title) get matched as if it were the Future Church
 * book. Exact match means an unnamed/differently-titled file just doesn't
 * show as the full book — which is the correct outcome — rather than
 * silently picking the wrong candidate.
 */
function isFullBookCandidate(name: string, bookKey: string): boolean {
  const withoutExt = name.replace(/\.[a-z0-9]{1,5}$/i, "");
  const withoutBook = normalize(withoutExt).replace(/book/g, "");
  return withoutBook === bookKey;
}

function parseChapterNumLabel(filename: string): { num: string | null; label: string } {
  const stripped = filename
    .replace(/\.[a-z0-9]{1,5}$/i, "") // extension
    .replace(/\s*\(\d+\)\s*$/, ""); // Drive dedup suffix like " (1)"

  // "God Dreams Book - Chapter 7-10 (1) - Title" / "Younique Book - Chapter 27 - Death"
  const withWord = stripped.match(/chapter\s*(\d+(?:-\d+)?)\s*-?\s*(.*)$/i);
  if (withWord) {
    const num = withWord[1];
    const label = withWord[2].trim() || `Chapter ${num}`;
    return { num, label };
  }

  // "Ch13_Values" / "Ch01_Unoriginal_Sin"
  const chPrefix = stripped.match(/^ch0*(\d+)[_\s-]+(.+)$/i);
  if (chPrefix) {
    return { num: chPrefix[1], label: chPrefix[2].replace(/_/g, " ").trim() };
  }

  return { num: null, label: stripped.trim() };
}

function toBookFile(f: {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
}): BookFile {
  const { num, label } = parseChapterNumLabel(f.name);
  return {
    id: f.id,
    name: f.name,
    title: f.name.replace(/\.[a-z0-9]{1,5}$/i, "").trim(),
    num,
    label,
    mimeType: f.mimeType,
    sizeBytes: f.size ? Number(f.size) : null,
  };
}

export async function listBooksLibrary(): Promise<BooksLibrary> {
  const rootId = process.env.GOOGLE_BOOKS_FOLDER_ID;
  if (!rootId) throw new Error("GOOGLE_BOOKS_FOLDER_ID is not set");

  const drive = getDriveClient();

  const all: {
    id: string;
    name: string;
    mimeType: string;
    parents?: string[];
    size?: string;
  }[] = [];

  let pageToken: string | undefined;
  do {
    const res = await drive.files.list({
      pageSize: 1000,
      pageToken,
      q: "trashed = false",
      fields: "nextPageToken, files(id,name,mimeType,parents,size)",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    all.push(...((res.data.files || []) as typeof all));
    pageToken = res.data.nextPageToken || undefined;
  } while (pageToken);

  const byId = new Map(all.map((f) => [f.id, f]));
  const folders = all.filter((f) => f.mimeType === FOLDER_MIME);
  const files = all.filter((f) => f.mimeType !== FOLDER_MIME && !isExcluded(f.name));

  const childrenOf = (folderId: string) =>
    files.filter((f) => (f.parents || []).includes(folderId));

  // Only the four named book folders become shelves. Other top-level folders
  // (lead magnets, old-branding summaries, unlisted titles) are left alone —
  // adding a fifth shelf later is a one-line addition to BOOK_DEFS.
  const topFolders = folders.filter((f) => (f.parents || []).includes(rootId));

  // Visual Summaries: only its direct files, not the "Old branding" subfolder.
  const summariesFolder = topFolders.find(
    (f) => normalize(f.name) === "visualsummaries"
  );
  const summaryFiles = summariesFolder ? childrenOf(summariesFolder.id) : [];

  const books: BookShelf[] = BOOK_DEFS.map((def) => {
    const folder = topFolders.find((f) => normalize(f.name) === def.key);

    // Gather this book's own files, plus one level into any "*Chapters"
    // subfolder, plus root-level loose files that match this book by name
    // (covers "Forging Future Church Book.pdf" sitting outside its folder).
    const ownFiles = folder ? childrenOf(folder.id) : [];
    const subfolders = folder
      ? folders.filter((f) => (f.parents || []).includes(folder.id))
      : [];
    const chapterSubfolders = subfolders.filter((f) =>
      /chapters?$/i.test(f.name.trim())
    );
    const nestedFiles = chapterSubfolders.flatMap((sf) => childrenOf(sf.id));
    const rootMatches = childrenOf(rootId).filter(
      (f) => isFullBookCandidate(f.name, def.key)
    );

    const candidates = [...ownFiles, ...nestedFiles, ...rootMatches];

    const chapters: BookFile[] = [];
    const fullBookCandidates: (typeof candidates[number])[] = [];
    const other: BookFile[] = [];

    for (const f of candidates) {
      const parentFolder = (f.parents || [])
        .map((pid) => byId.get(pid))
        .find((p) => p?.mimeType === FOLDER_MIME);

      if (isChapterFile(f.name, parentFolder?.name ?? null)) {
        chapters.push(toBookFile(f));
      } else if (isFullBookCandidate(f.name, def.key)) {
        fullBookCandidates.push(f);
      } else {
        other.push(toBookFile(f));
      }
    }

    // If more than one file looks like "the" full book, showing every
    // candidate under "other" is safer than silently picking the wrong one —
    // except we do still want exactly one headline download, so take the
    // largest (a proxy for "the real book" vs a teaser/sample) and demote
    // the rest to other.
    fullBookCandidates.sort((a, b) => Number(b.size || 0) - Number(a.size || 0));
    const fullBook = fullBookCandidates[0]
      ? toBookFile(fullBookCandidates[0])
      : null;
    fullBookCandidates.slice(1).forEach((f) => other.push(toBookFile(f)));

    const summaryMatch = summaryFiles
      .filter((f) => normalize(f.name).includes(def.key))
      .sort((a, b) => a.name.localeCompare(b.name))[0];

    chapters.sort((a, b) => {
      const an = a.num ? parseFloat(a.num) : Number.MAX_SAFE_INTEGER;
      const bn = b.num ? parseFloat(b.num) : Number.MAX_SAFE_INTEGER;
      return an - bn || a.title.localeCompare(b.title);
    });

    return {
      id: folder?.id || def.key,
      name: def.name,
      fullBook,
      visualSummary: summaryMatch ? toBookFile(summaryMatch) : null,
      chapters,
      other: other.sort((a, b) => a.title.localeCompare(b.title)),
    };
  });

  // Root-level files that matched no book at all (not folders, not already
  // claimed as a full-book candidate above).
  const claimedIds = new Set(
    books.flatMap((b) =>
      [b.fullBook, ...b.other].filter(Boolean).map((f) => f!.id)
    )
  );
  const extras = childrenOf(rootId)
    .filter(
      (f) =>
        !claimedIds.has(f.id) &&
        !BOOK_DEFS.some((def) => isFullBookCandidate(f.name, def.key))
    )
    .map(toBookFile);

  return { books, extras };
}

export { isDriveConfigured };
