import type { TextBlockSection } from "../../../../src/types/homepage-sections";

const maxWidthClass: Record<string, string> = {
  narrow: "max-w-2xl",
  medium: "max-w-4xl",
  wide:   "max-w-6xl",
  full:   "max-w-none",
};

export function TextBlockRenderer({ section }: { section: TextBlockSection }) {
  if (!section.content) return null;
  const mw = maxWidthClass[section.maxWidth] ?? "max-w-4xl";
  const align = section.align === "center" ? "mx-auto text-center" : "";
  return (
    <div
      className={`${mw} ${align} prose prose-zinc dark:prose-invert max-w-none`}
      dangerouslySetInnerHTML={{ __html: section.content }}
    />
  );
}
