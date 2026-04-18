/**
 * Shared constants for the outbound-webhooks plugin.
 * Kept separate from actions.ts so client components can import without
 * crossing the "use server" boundary.
 */
export const AVAILABLE_EVENTS: { value: string; label: string }[] = [
  { value: "*",                     label: "All events" },
  { value: "post:after-publish",    label: "Post published" },
  { value: "post:after-save",       label: "Post saved (every save)" },
  { value: "post:before-delete",    label: "Post deleted" },
  { value: "media:after-upload",    label: "Media uploaded" },
  { value: "media:after-delete",    label: "Media deleted" },
  { value: "comment:after-create",  label: "Comment submitted" },
  { value: "comment:after-approve", label: "Comment approved / rejected" },
];
