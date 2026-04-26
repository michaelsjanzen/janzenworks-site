import type { CtaSection } from "../../../../src/types/homepage-sections";

export function CtaRenderer({ section }: { section: CtaSection }) {
  const alignClass = section.align === "center" ? "text-center items-center" : "text-left items-start";

  const wrapperClass =
    section.style === "filled"
      ? "bg-[var(--color-accent)] text-white"
      : section.style === "subtle"
      ? "bg-[var(--color-surface)] border border-[var(--color-border)]"
      : "border-2 border-[var(--color-accent)]";

  const btnClass =
    section.style === "filled"
      ? "inline-flex items-center px-6 py-3 rounded-lg font-semibold text-sm bg-white text-zinc-900 hover:bg-white/90 transition-colors"
      : "inline-flex items-center px-6 py-3 rounded-lg font-semibold text-sm bg-[var(--color-accent)] text-white hover:opacity-90 transition-opacity";

  return (
    <div
      className={`rounded-xl px-8 py-12 flex flex-col gap-4 ${alignClass} ${wrapperClass}`}
      style={{
        // bleed full width
        marginLeft: "calc(50% - 50vw)",
        marginRight: "calc(50% - 50vw)",
        width: "100vw",
        borderRadius: 0,
      }}
    >
      <div
        className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-4"
        style={{ alignItems: section.align === "center" ? "center" : "flex-start" }}
      >
        {section.heading && (
          <h2 className="text-2xl sm:text-3xl font-bold leading-snug">{section.heading}</h2>
        )}
        {section.subtext && (
          <p className="text-base leading-relaxed max-w-2xl opacity-80">{section.subtext}</p>
        )}
        {section.buttonText && section.buttonUrl && (
          <a href={section.buttonUrl} className={btnClass}>
            {section.buttonText}
          </a>
        )}
      </div>
    </div>
  );
}
