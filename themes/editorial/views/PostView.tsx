// Editorial PostView delegates to the default implementation.
// All visual differences — serif headings, line-height 1.8, font sizes — are
// handled by editorial/design.ts buildCssString, which outputs:
//   .prose h1, h2, h3, h4 { font-family: var(--font-heading); }
//   article h1, article h2, article h3, article h4 { font-family: var(--font-heading); }
//   .prose { line-height: 1.8; font-size: var(--font-size-base); }
//
// TODO Phase 3: Add a dedicated editorial PostView with drop-caps, pull quotes,
// and a full-width featured image above the article header.
export { default } from "../../default/views/PostView";
export type { PostViewProps } from "../../default/views/PostView";
