import { getAllSubmissions, getUnreadSubmissions } from "../db";
import SubmissionActions from "./SubmissionActions";

interface Props {
  searchParams: Record<string, string | string[] | undefined>;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function ContactFormAdminPage({ searchParams }: Props) {
  const filter = (searchParams.filter as string) ?? "unread";
  const submissions = filter === "all" ? await getAllSubmissions() : await getUnreadSubmissions();

  const unreadCount =
    filter === "all"
      ? submissions.filter(s => !s.read).length
      : submissions.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Contact Form</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {unreadCount > 0 ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                {unreadCount} unread
              </span>
            ) : (
              "All caught up."
            )}
          </p>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 border border-zinc-200 rounded-lg p-0.5 self-start bg-zinc-50">
          <a
            href="?filter=unread"
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              filter !== "all"
                ? "bg-white text-zinc-900 shadow-sm font-medium"
                : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            Unread
          </a>
          <a
            href="?filter=all"
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              filter === "all"
                ? "bg-white text-zinc-900 shadow-sm font-medium"
                : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            All
          </a>
        </div>
      </div>

      {/* Submission list */}
      {submissions.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-lg p-8 text-center">
          <p className="text-zinc-500 text-sm">
            {filter === "all" ? "No submissions yet." : "No unread submissions."}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-lg divide-y divide-zinc-100">
          {submissions.map(sub => (
            <div key={sub.id} className="p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-zinc-900">{sub.name}</span>
                    <a
                      href={`mailto:${sub.email}`}
                      className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
                    >
                      {sub.email}
                    </a>
                    {sub.phone && (
                      <span className="text-xs text-zinc-400">{sub.phone}</span>
                    )}
                    {sub.socialUrl && (
                      <a
                        href={sub.socialUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors truncate max-w-xs"
                      >
                        {sub.socialUrl.replace(/^https?:\/\/(www\.)?/, "")}
                      </a>
                    )}
                    {!sub.read && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                        Unread
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400">{formatDate(sub.createdAt)}</p>
                </div>

                <SubmissionActions submissionId={sub.id} isRead={sub.read} />
              </div>

              <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-line">
                {sub.message}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
