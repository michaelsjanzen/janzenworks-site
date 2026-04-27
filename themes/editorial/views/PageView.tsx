// Editorial PageView delegates to the default implementation.
// See editorial/views/PostView.tsx for the delegation rationale.
//
// TODO Phase 3: Add editorial-specific page layout with wider content columns,
// large serif chapter headings, and no back-link in favor of breadcrumb only.
export { default } from "../../default/views/PageView";
export type { PageViewProps } from "../../default/views/PageView";
