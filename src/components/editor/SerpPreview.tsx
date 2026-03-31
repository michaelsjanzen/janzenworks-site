"use client";

// ── SERP Preview ──────────────────────────────────────────────────────────────
// Renders a simulated Google search-result snippet so editors can see how
// the post title and meta description will appear in search results.

const SEO_TITLE_MAX = 60;
const SEO_DESC_MAX  = 155;

function truncate(str: string, max: number): string {
  if (!str || str.length <= max) return str;
  return str.slice(0, max - 1) + "…";
}

interface SerpPreviewProps {
  seoTitle: string;
  seoMetaDescription: string;
  postTitle: string;
  slug: string;
}

export default function SerpPreview({
  seoTitle,
  seoMetaDescription,
  postTitle,
  slug,
}: SerpPreviewProps) {
  const displayTitle = truncate(
    seoTitle?.trim() ? seoTitle : postTitle,
    SEO_TITLE_MAX,
  ) || "";

  const displayDesc = truncate(
    seoMetaDescription?.trim() ? seoMetaDescription : "",
    SEO_DESC_MAX,
  ) || "";

  const hostname =
    typeof window !== "undefined" ? window.location.hostname : "example.com";

  const breadcrumbUrl = slug
    ? `${hostname} › post › ${slug}`
    : hostname;

  return (
    <div className="border border-zinc-200 rounded-lg p-3.5 bg-white mb-4">
      {/* Site icon + domain row */}
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-6 h-6 rounded-full bg-zinc-100 border border-zinc-200 shrink-0" />
        <div>
          <div className="text-[13px] font-medium text-zinc-800 leading-tight">{hostname}</div>
          <div className="text-[11px] text-zinc-500 leading-tight truncate max-w-[220px]">
            {breadcrumbUrl}
          </div>
        </div>
      </div>

      {/* Title */}
      <div
        className={`text-[19px] leading-snug mb-1 ${
          displayTitle
            ? "text-[#1a0dab]"
            : "text-zinc-300 italic"
        }`}
      >
        {displayTitle || "Post title will appear here"}
      </div>

      {/* Description */}
      <div
        className={`text-[13px] leading-[1.55] ${
          displayDesc
            ? "text-zinc-500"
            : "text-zinc-300 italic"
        }`}
      >
        {displayDesc || "Meta description will appear here…"}
      </div>
    </div>
  );
}
