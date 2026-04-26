import { getConfig } from "../../../src/lib/config";
import { getThreadedComments, getCommentCount } from "../db";
import CommentForm from "./CommentForm";
import ReplyToggle from "./ReplyToggle";
import type { PostFooterSlotProps } from "../../../src/lib/plugin-registry";

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CommentItem({ comment }: { comment: { id: number; authorName: string; content: string; createdAt: Date } }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline gap-2">
        <span className="text-sm font-medium" style={{ color: "var(--color-foreground)" }}>
          {comment.authorName}
        </span>
        <time className="text-xs" style={{ color: "var(--color-muted)" }}>
          {formatDate(comment.createdAt)}
        </time>
      </div>
      <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "var(--color-foreground)" }}>
        {comment.content}
      </p>
    </div>
  );
}

// ─── Main section ─────────────────────────────────────────────────────────────

export default async function CommentsSection({ postId, postType }: PostFooterSlotProps) {
  const config = await getConfig();

  if (!config.modules.activePlugins.includes("comments")) return null;
  if (postType === "page") return null;

  const settings = config.modules.pluginSettings?.["comments"] ?? {};
  const requireEmail = settings.requireEmail !== false;

  const [comments, count] = await Promise.all([
    getThreadedComments(postId),
    getCommentCount(postId),
  ]);

  return (
    <section
      className="mt-12 space-y-8 border-t pt-10"
      style={{ borderColor: "var(--color-border)" }}
    >
      <h2
        className="text-xl font-semibold"
        style={{ color: "var(--color-foreground)" }}
      >
        {count === 0 ? "Comments" : count === 1 ? "1 Comment" : `${count} Comments`}
      </h2>

      {/* Comment thread */}
      {comments.length > 0 && (
        <div className="space-y-6">
          {comments.map(comment => (
            <div key={comment.id} className="space-y-4">
              <CommentItem comment={comment} />

              {comment.replies.length > 0 && (
                <div
                  className="ml-8 pl-6 space-y-4 border-l"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  {comment.replies.map(reply => (
                    <CommentItem key={reply.id} comment={reply} />
                  ))}
                </div>
              )}

              <div className="ml-8">
                <ReplyToggle postId={postId} parentId={comment.id} requireEmail={requireEmail} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New comment form */}
      <div className="space-y-3">
        <h3
          className="text-sm font-semibold uppercase tracking-wide"
          style={{ color: "var(--color-muted)" }}
        >
          Leave a comment
        </h3>
        <CommentForm postId={postId} requireEmail={requireEmail} />
      </div>
    </section>
  );
}
