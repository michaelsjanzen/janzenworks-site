// Mono PostView delegates to the default implementation.
// All visual differences — monospace body, near-black background, amber links,
// zero border-radius on pre blocks — are handled by mono/design.ts buildCssString.
//
// The key CSS rules output by mono's buildCssString:
//   body { font-family: var(--font-sans); }   (JetBrains Mono)
//   pre, code { border-radius: 0; }
//   .prose pre { background: var(--color-surface); border: 1px solid var(--color-border); }
//
// TODO Phase 4: Add a mono-specific PostView with a terminal-style article header
// (date/category inline on one line, no hero image section), and a command-prompt
// footer: "$ cd .." for the back link.
export { default } from "../../default/views/PostView";
export type { PostViewProps } from "../../default/views/PostView";
