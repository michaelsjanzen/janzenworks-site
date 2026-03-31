# Pugmill Hook Reference

The single source of truth for all hooks is `src/lib/hook-catalogue.ts`. This document is a human-readable index of that file. When a discrepancy exists, the catalog wins.

Plugins may only use the hooks listed here. To propose a new hook, adding it to the catalog and updating the relevant core call site comes first -- then updating this document.

---

## Naming Convention

```
namespace:event           -- e.g. "post:after-save"
namespace:sub:event       -- e.g. "api:post:response"
```

All hook names use lowercase with colons as separators and hyphens within segments.

---

## Hook Types

### Actions -- side effects

Actions are fire-and-forget. The return value of a listener is ignored. Two dispatch modes:

**Standard action** -- listener errors are caught, logged, and surfaced as admin notifications. The calling operation is never blocked or aborted by a listener error.

```typescript
hooks.addAction("post:after-save", async ({ post }) => {
  await fetch("https://example.com/webhook", {
    method: "POST",
    body: JSON.stringify({ slug: post.slug }),
  });
});
```

**Strict action** -- the listener may throw to abort the operation. The thrown message is shown to the user. The first listener to throw stops all remaining listeners. This pattern is used only on hooks explicitly marked STRICT in the catalog.

```typescript
hooks.addAction("comment:before-create", ({ comment }) => {
  if (isSpam(comment.content)) {
    throw new Error("Your comment was flagged as spam.");
  }
});
```

### Filters -- data transformation

Filters transform a value. The listener receives a payload (always containing an `input` key) and must return a value of the same type as `input`. Multiple filters on the same hook run in registration order, each receiving the previous filter's output.

```typescript
hooks.addFilter("content:render", ({ input, post }) => {
  return input + `\n\n---\n*Filed under: ${post.type}*`;
});
```

---

## Action Hooks

| Hook | STRICT | Payload | Description |
|---|---|---|---|
| `post:after-save` | | `{ post: PostPayload }` | Fired after a post or page is saved. Covers both create and update. |
| `post:before-delete` | | `{ postId: number }` | Fired before a post or page is permanently deleted. |
| `post:after-publish` | | `{ post: PostPayload }` | Fired on the unpublished to published transition only. |
| `media:after-upload` | | `{ file: MediaPayload }` | Fired after a file is uploaded and saved to the media table. |
| `media:after-delete` | | `{ fileId: number }` | Fired after a media item is deleted from storage and the database. |
| `user:after-login` | | `{ user: UserPayload }` | Fired after a user successfully authenticates. |
| `user:after-logout` | | `{ userId: string }` | Fired after a user session is destroyed. |
| `comment:before-create` | **YES** | `{ comment: CommentDraft }` | Fired before a comment is written to the database. Throw to reject. |
| `comment:after-create` | | `{ comment: CommentPayload }` | Fired after a comment is successfully saved. |
| `comment:after-approve` | | `{ commentId: number; approved: boolean }` | Fired after a comment's approval status changes. |
| `consent:after-accept` | | `{ categories: ConsentCategories }` | Fired after a visitor accepts cookie consent. |
| `consent:after-update` | | `{ categories: ConsentCategories }` | Fired after a visitor updates consent preferences. |

`ConsentCategories` shape: `{ essential: true; nonEssential: boolean }`

---

## Filter Hooks

| Hook | Input type | Payload | Description |
|---|---|---|---|
| `content:render` | `string` | `{ input: string; post: PostPayload }` | Raw Markdown before passing to the theme view for rendering. Appending Markdown or raw HTML is allowed -- rehypeSanitize strips unsafe tags. |
| `content:excerpt` | `string` | `{ input: string; post: PostPayload }` | Plain-text excerpt before display. Fired only when an explicit excerpt exists. |
| `nav:items` | `NavItem[]` | `{ input: NavItem[] }` | Global navigation items from config. Appending items and returning the array is the expected pattern. |
| `head:meta` | `MetaTag[]` | `{ input: MetaTag[]; post?: PostPayload }` | `<meta>` tags injected into the document `<head>`. Appending and returning the array is the expected pattern. |
| `api:post:response` | `Record<string, unknown>` | `{ input: Record<string, unknown>; post: PostPayload }` | REST API response shape for `GET /api/posts/[slug]`. |

---

## Payload Type Reference

These types are defined in `src/lib/hook-catalogue.ts` and are intentionally minimal -- they expose only what hook listeners need, decoupled from the full Drizzle row types.

```typescript
interface PostPayload {
  id: number;
  slug: string;
  title: string;
  type: "post" | "page";
  published: boolean;
  authorId: string | null;
  parentId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

interface MediaPayload {
  id: number;
  url: string;
  fileName: string;
  fileType: string | null;
  fileSize: number | null;
  storageKey: string | null;
  uploaderId: string | null;
}

interface UserPayload {
  id: string;   // UUID -- matches admin_users.id
  email: string;
  name: string | null;
  role: string;
}

interface NavItem {
  label: string;
  path: string;
  [key: string]: unknown;  // themes may extend with icon, external, etc.
}

interface MetaTag {
  name?: string;       // for <meta name="...">
  property?: string;   // for <meta property="..."> (Open Graph)
  content: string;
}

interface CommentDraft {
  postId: number;
  authorName: string;
  authorEmail: string;
  content: string;
  parentId?: number;
}

interface CommentPayload extends CommentDraft {
  id: number;
  approved: boolean;
  parentId: number | null;
  createdAt: Date;
}
```

---

## Dispatching Hooks from Core

When adding a new core feature, actions are used for side effects and filters for data transformation. Core dispatches; plugins register listeners.

```typescript
import { hooks } from "@/lib/hooks";

// Standard action
await hooks.doAction("post:after-save", { post });

// Strict action (rejection hook)
await hooks.doActionStrict("comment:before-create", { comment });
// doActionStrict re-throws -- the caller must handle the error.

// Filter
const content = await hooks.applyFilters("content:render", { input: rawContent, post });
```

Registering new hooks in `src/lib/hook-catalogue.ts` before using them is required. Updating this document at the same time keeps the reference current.
