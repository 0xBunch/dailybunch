/**
 * Top Video Module
 *
 * Displays the top trending video in the right rail.
 * Shows thumbnail, title, velocity, and sources.
 */

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return `${Math.floor(diffDays / 7)}w`;
}

interface TopVideoModuleProps {
  video: {
    id: string;
    title: string | null;
    fallbackTitle: string | null;
    canonicalUrl: string;
    domain: string;
    imageUrl?: string | null;
    velocity: number;
    sourceNames: string[];
    firstSeenAt: Date;
  } | null;
}

function getYouTubeThumbnail(url: string): string | null {
  try {
    const parsed = new URL(url);
    let videoId: string | null = null;

    if (parsed.hostname.includes("youtube.com")) {
      videoId = parsed.searchParams.get("v");
    } else if (parsed.hostname === "youtu.be") {
      videoId = parsed.pathname.slice(1);
    }

    if (videoId) {
      return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
    }
  } catch {
    // Invalid URL
  }
  return null;
}

export function TopVideoModule({ video }: TopVideoModuleProps) {
  if (!video) {
    return (
      <section>
        <div
          className="mb-3 flex items-center gap-2 text-xs uppercase tracking-wider"
          style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}
        >
          <span>▶</span>
          <span>Top Video</span>
        </div>
        <div
          className="py-8 text-center text-sm"
          style={{ color: "var(--text-faint)" }}
        >
          No trending videos right now
        </div>
      </section>
    );
  }

  const title = video.title || video.fallbackTitle || "Untitled";
  const thumbnailUrl = getYouTubeThumbnail(video.canonicalUrl) || video.imageUrl;
  const timeAgo = formatTimeAgo(new Date(video.firstSeenAt));

  return (
    <section>
      <div
        className="mb-3 flex items-center gap-2 text-xs uppercase tracking-wider"
        style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}
      >
        <span>▶</span>
        <span>Top Video</span>
      </div>

      <a
        href={video.canonicalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group block"
        style={{ textDecoration: "none" }}
      >
        {/* Thumbnail */}
        <div
          className="relative mb-3 aspect-video overflow-hidden"
          style={{ background: "var(--surface)" }}
        >
          {thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbnailUrl}
              alt=""
              className="size-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div
              className="flex size-full items-center justify-center text-3xl"
              style={{ color: "var(--text-faint)" }}
            >
              ▶
            </div>
          )}
          {/* Play button overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
            <div
              className="flex size-12 items-center justify-center rounded-full"
              style={{ background: "var(--accent)" }}
            >
              <span className="ml-0.5 text-lg" style={{ color: "white" }}>
                ▶
              </span>
            </div>
          </div>
        </div>

        {/* Title */}
        <h3
          className="mb-2 line-clamp-2 text-sm leading-snug transition-opacity group-hover:opacity-70"
          style={{ color: "var(--text-primary)" }}
        >
          {title}
        </h3>

        {/* Meta */}
        <div
          className="flex items-center gap-1.5 text-xs"
          style={{ color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}
        >
          <span>{video.domain}</span>
          <span>·</span>
          <span style={{ color: "var(--accent)" }}>v{video.velocity}</span>
          <span>·</span>
          <span>{timeAgo}</span>
        </div>

        {/* Sources */}
        {video.sourceNames.length > 0 && (
          <div
            className="mt-2 line-clamp-1 text-xs"
            style={{ color: "var(--text-muted)" }}
          >
            {video.sourceNames.slice(0, 3).join(", ")}
            {video.sourceNames.length > 3 && ` +${video.sourceNames.length - 3}`}
          </div>
        )}
      </a>
    </section>
  );
}
