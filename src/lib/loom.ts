/**
 * Loom thumbnail resolution.
 *
 * The obvious approach — guessing the CDN path from the share id — is what
 * this replaced, and it failed two different ways in production:
 *
 *   1. Workspace-restricted recordings 403 every guessed format, so a quarter
 *      of the library rendered as an empty gradient.
 *   2. The formats that did load were often the black pre-roll frame or a
 *      generic ~1.5MB placeholder shared by several unrelated videos.
 *
 * Loom's public oEmbed endpoint returns a real, working thumbnail for every
 * one of those cases. It has its own quirk though: for some recordings it
 * hands back a thumbnail belonging to a DIFFERENT session — three videos in
 * the current library resolve to one unrelated recording's still. Showing a
 * framer the wrong video's picture is worse than showing none, so a
 * thumbnail is only trusted when the session id embedded in the returned URL
 * matches the video's own id. Anything else falls back to the branded card,
 * which is honest.
 *
 * Resolution happens server-side because oEmbed is rate-limited and slow
 * (~300ms each); the results are cached so a page load costs nothing.
 */

const OEMBED = "https://www.loom.com/v1/oembed";

/** Long enough that a page load is free, short enough to pick up re-records. */
const TTL_MS = 6 * 60 * 60 * 1000;

/**
 * Hand-picked stills for recordings where Loom's own thumbnail can't be
 * trusted — either a black pre-roll frame (camera not rolling yet when the
 * recording started) or a still that belongs to a different session
 * entirely (the cross-session mismatch this file already guards against).
 * Neither is something oEmbed can fix; there's no frame to ask it for.
 *
 * Each file is a real frame pulled from that recording — seeked forward past
 * the black or wrong-content opening — not stock art, so it stays honest
 * about what the video actually shows.
 *
 * Re-recording the affected video obsoletes its entry here; nothing else
 * needs to change; the branded fallback below just won't be needed for that
 * id anymore. Safe to leave a stale entry in the meantime — a keyed id only
 * ever matches its own recording.
 */
const MANUAL_STILLS: Record<string, string> = {
  // Satan's Loophole Reinforcement Training — black pre-roll.
  "774ff6bdc7d14734bbabf0041bef5b37": "/brand/videos/774ff6bdc7d14734bbabf0041bef5b37.jpg",
  // Future Church "Ted Talk" — black pre-roll.
  "f056b015647b47a1b6d7fc1c4a60b670": "/brand/videos/f056b015647b47a1b6d7fc1c4a60b670.jpg",
  // Why I Wrote the Book — black pre-roll.
  "9e062843240e4aeb92da30e6477a9ad8": "/brand/videos/9e062843240e4aeb92da30e6477a9ad8.jpg",
  // Leading Church Testimony — Long Hollow — black pre-roll.
  "e6b4e80dfd6a4efdbb0c04436be819e0": "/brand/videos/e6b4e80dfd6a4efdbb0c04436be819e0.jpg",
  // Funnel Fusion Overview Teaching — oEmbed returns a different session's still.
  "b42d9b019edd4306897f5ee8fe060615": "/brand/videos/b42d9b019edd4306897f5ee8fe060615.jpg",
  // Crowd Cloud Overview Teaching — oEmbed returns a different session's still.
  "87e14978ff174c9baaedb5aebfd2dcd8": "/brand/videos/87e14978ff174c9baaedb5aebfd2dcd8.jpg",
  // 7 Laws Overview Teaching — oEmbed returns a different session's still.
  "937fe2b1ae6d4993bd6a73345e108f91": "/brand/videos/937fe2b1ae6d4993bd6a73345e108f91.jpg",
};

type Entry = { at: number; url: string | null };

const cache = new Map<string, Entry>();

export function extractLoomId(url: string): string | null {
  const m = url.match(/loom\.com\/(?:share|embed)\/([a-zA-Z0-9]+)/);
  return m ? m[1] : null;
}

/** The session id Loom embedded in a thumbnail URL, if we can read one. */
function thumbnailSessionId(thumbnailUrl: string): string | null {
  const m = thumbnailUrl.match(/thumbnails\/([a-zA-Z0-9]+)[-.]/);
  return m ? m[1] : null;
}

/**
 * oEmbed hands back an animated GIF, and the same path with a .jpg
 * extension serves a still of the same frame — dramatically smaller (one is
 * 5.3MB as a GIF and 83KB as a JPEG) and, unlike the GIF, it survives image
 * optimisation. Optimising an animated GIF yields its first frame, which for
 * Loom is usually a transparent pre-roll, so the card renders blank.
 *
 * Only swapped in when the JPEG actually exists; not every path has one.
 */
async function preferStill(gifUrl: string): Promise<string> {
  if (!gifUrl.endsWith(".gif")) return gifUrl;
  const jpg = `${gifUrl.slice(0, -4)}.jpg`;

  try {
    const res = await fetch(jpg, {
      method: "HEAD",
      signal: AbortSignal.timeout(6000),
    });
    if (res.ok && (res.headers.get("content-type") || "").includes("image")) {
      return jpg;
    }
  } catch {
    // Fall through to the GIF.
  }
  return gifUrl;
}

async function resolveOne(loomId: string): Promise<string | null> {
  if (MANUAL_STILLS[loomId]) return MANUAL_STILLS[loomId];

  const hit = cache.get(loomId);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.url;

  let url: string | null = null;

  try {
    const res = await fetch(
      `${OEMBED}?url=${encodeURIComponent(
        `https://www.loom.com/share/${loomId}`
      )}`,
      { signal: AbortSignal.timeout(8000) }
    );

    if (res.ok) {
      const body = (await res.json()) as { thumbnail_url?: string };
      const candidate = body.thumbnail_url || null;

      // Only trust a thumbnail that actually belongs to this recording.
      if (candidate && thumbnailSessionId(candidate) === loomId) {
        url = await preferStill(candidate);
      }
    }
  } catch {
    // Network hiccup or timeout — fall back to the branded card. Cached as
    // null so one slow provider can't stall every subsequent page load.
  }

  cache.set(loomId, { at: Date.now(), url });
  return url;
}

/**
 * Resolve many share URLs at once, returning a map keyed by the original URL.
 * Only Loom links are looked up; everything else resolves to null and uses
 * whatever lib/video.ts can work out on its own.
 */
export async function resolveLoomThumbnails(
  urls: string[]
): Promise<Record<string, string>> {
  const ids = new Map<string, string>();
  for (const url of urls) {
    const id = extractLoomId(url);
    if (id) ids.set(url, id);
  }

  const resolved = await Promise.all(
    [...ids.values()].map(async (id) => [id, await resolveOne(id)] as const)
  );
  const byId = new Map(resolved);

  const out: Record<string, string> = {};
  for (const [url, id] of ids) {
    const thumb = byId.get(id);
    if (thumb) out[url] = thumb;
  }
  return out;
}
