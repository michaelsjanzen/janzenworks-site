/**
 * PUGMILL HOOK CATALOGUE
 * ============================================================
 * This file is the single source of truth for every hook that
 * Pugmill core fires. Plugins MUST use only the hooks defined
 * here. To propose a new hook, add it to this catalogue and
 * update the relevant core call site.
 *
 * NAMING CONVENTION
 *   namespace:event          — e.g. "post:after-save"
 *   namespace:sub:event      — e.g. "api:post:response"
 *
 * ACTIONS vs FILTERS
 *   Action   — fire-and-forget. Plugin callback receives a
 *              payload, return value is ignored.
 *   Filter   — data transformation. Plugin callback receives
 *              a payload (always has an `input` key), and MUST
 *              return a value of the same type as `input`.
 *              Multiple filters run in registration order,
 *              each receiving the previous filter's output.
 *
 * WRITING A PLUGIN HOOK LISTENER
 *
 *   // Action
 *   hooks.addAction("post:after-save", ({ post }) => {
 *     console.log("saved:", post.slug);
 *   });
 *
 *   // Filter
 *   hooks.addFilter("content:render", ({ input, post }) => {
 *     return input + `<p>Written by ${post.authorId}</p>`;
 *   });
 * ============================================================
 */

// ─── Shared payload types ─────────────────────────────────────────────────────
// These are intentionally minimal — they capture only what hook listeners need.
// They are NOT the full Drizzle row types; that decoupling is deliberate so that
// schema changes don't silently break the hook contract.

export interface PostPayload {
  id: number;
  slug: string;
  title: string;
  type: "post" | "page";
  published: boolean;
  authorId: string | null;
  parentId: number | null;
  createdAt: Date;
  updatedAt: Date;
  /** Raw aeoMetadata JSON from the DB — present when the post has AEO data. */
  aeoMetadata?: unknown;
}

export interface MediaPayload {
  id: number;
  url: string;
  fileName: string;
  fileType: string | null;
  fileSize: number | null;
  storageKey: string | null;
  uploaderId: string | null;
}

export interface UserPayload {
  id: string;   // admin_users.id is text (UUID)
  email: string;
  name: string | null;
  role: string;
}

export interface NavItem {
  label: string;
  path: string;
  /** Any additional properties themes may add (icon, external, etc.) */
  [key: string]: unknown;
}

export interface MetaTag {
  /** For <meta name="..."> */
  name?: string;
  /** For <meta property="..."> (Open Graph) */
  property?: string;
  content: string;
}

// CommentDraft / CommentPayload are defined here so the comment plugin
// can type its listeners without importing from the plugin itself.
export interface CommentDraft {
  postId: number;
  authorName: string;
  authorEmail: string;
  content: string;
  parentId?: number;
}

export interface CommentPayload extends CommentDraft {
  id: number;
  approved: boolean;
  parentId: number | null;
  createdAt: Date;
}

// ─── Action Catalogue ─────────────────────────────────────────────────────────
// Actions are for side effects: logging, notifications, cache invalidation,
// third-party API calls, etc. Two dispatch modes:
//
//   hooks.doAction(name, payload)       — non-fatal; errors are caught, logged,
//                                         and reported as admin notifications.
//
//   hooks.doActionStrict(name, payload) — for STRICT (rejection) hooks only.
//                                         Errors propagate to the caller.
//                                         Hooks marked STRICT in their JSDoc
//                                         MUST be called with doActionStrict.

export interface ActionCatalogue {
  /** Fired after a post or page is successfully saved to the database. */
  "post:after-save": { post: PostPayload };

  /** Fired before a post or page is permanently deleted. */
  "post:before-delete": { postId: number };

  /** Fired after a post is published (transition: unpublished → published). */
  "post:after-publish": { post: PostPayload };

  /** Fired after a file is uploaded and saved to the media table. */
  "media:after-upload": { file: MediaPayload };

  /** Fired after a media item is deleted from storage and the database. */
  "media:after-delete": { fileId: number };

  /** Fired after a user successfully authenticates. */
  "user:after-login": { user: UserPayload };

  /** Fired after a user session is destroyed. */
  "user:after-logout": { userId: string };

  /**
   * Fired before a comment is written to the database.
   * STRICT HOOK — use hooks.doActionStrict() at the call site.
   * Plugins MAY throw to reject the comment; the thrown message is shown to the user.
   * The first listener to throw aborts all remaining listeners.
   */
  "comment:before-create": { comment: CommentDraft };

  /** Fired after a comment is successfully saved. */
  "comment:after-create": { comment: CommentPayload };

  /** Fired after a comment's approval status changes. */
  "comment:after-approve": { commentId: number; approved: boolean };

  /**
   * Fired after a visitor accepts or declines cookie consent.
   * Note: this action originates client-side. Plugins listening server-side
   * should use the window.__pugmill_consent API for client-side checks instead.
   */
  "consent:after-accept": { categories: { essential: true; nonEssential: boolean } };

  /** Fired after a visitor updates their consent preferences. */
  "consent:after-update": { categories: { essential: true; nonEssential: boolean } };

  /**
   * Fired when a known bot visits any tracked URL.
   * Sources: content:render (HTML pages), llms.txt route handlers, llms-full.txt route handler.
   *
   * resourceType is one of:
   *   "HTML Page"     — regular post/page render
   *   "llms.txt"      — /llms.txt or /[slug]/llms.txt
   *   "llms-full.txt" — /llms-full.txt
   *   "Post Markdown" — path containing llm= query param
   *   "Sitemap"       — /sitemap.xml
   *   "Robots.txt"    — /robots.txt
   */
  "request:bot-visit": { botName: string; path: string; resourceType: string };
}

// ─── Filter Catalogue ─────────────────────────────────────────────────────────
// Data transformation hooks. Every entry MUST have an `input` key — that is
// the value being transformed. The plugin callback receives the full payload
// and returns a new value of the same type as `input`.
// applyFilters() returns the final transformed `input` value.

export interface FilterCatalogue {
  /**
   * Transform post or page content before it is passed to the theme view for rendering.
   * input: raw Markdown string (Markdown → HTML conversion happens in the theme view).
   * Plugins may append Markdown or raw HTML — the theme's ReactMarkdown pipeline
   * (rehypeRaw + rehypeSanitize) processes both. Note: rehypeSanitize strips unsafe
   * tags (script, iframe, etc.) by design; plugins cannot inject executable HTML.
   */
  "content:render": { input: string; post: PostPayload };

  /**
   * Transform the post excerpt before display.
   * input: plain-text excerpt string. Only fired when an explicit excerpt exists.
   */
  "content:excerpt": { input: string; post: PostPayload };

  /**
   * Modify the global navigation items array.
   * input: array of NavItems from config. Return the modified array.
   */
  "nav:items": { input: NavItem[] };

  /**
   * Inject additional <meta> tags into the document <head>.
   * input: array of MetaTag descriptors. Append and return.
   */
  "head:meta": { input: MetaTag[]; post?: PostPayload };

  /**
   * Modify the REST API response shape for a single post.
   * input: the serialised post object about to be returned by GET /api/posts/[slug].
   */
  "api:post:response": { input: Record<string, unknown>; post: PostPayload };
}
