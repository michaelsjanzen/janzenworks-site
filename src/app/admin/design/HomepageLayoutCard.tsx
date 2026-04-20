"use client";
import { useState, useTransition, useEffect, useRef } from "react";
import HeroCanvas from "./HeroCanvas";
import type { HeroConfig } from "../../../../themes/default/design";
import { useDesignSave } from "./DesignSaveContext";

interface MediaItem { id: number; url: string; fileName: string; }

interface Props {
  initialFeedStyle: "list" | "grid";
  initialListStyle: "compact" | "editorial" | "feature" | "text-only";
  initialColumns: "1" | "2" | "3";
  initialGap: "sm" | "md" | "lg";
  initialContentDisplay: "excerpt" | "none";
  heroConfig: HeroConfig;
  allMedia: MediaItem[];
  hasDraft: boolean;
  saveAction: (partial: Record<string, string>) => Promise<void>;
}

const LIST_STYLES: { value: "compact" | "editorial" | "feature" | "text-only"; label: string }[] = [
  { value: "compact",   label: "Compact" },
  { value: "editorial", label: "Editorial" },
  { value: "feature",   label: "Feature" },
  { value: "text-only", label: "Text only" },
];

export default function HomepageLayoutCard({
  initialFeedStyle,
  initialListStyle,
  initialColumns,
  initialGap,
  initialContentDisplay,
  heroConfig,
  allMedia,
  hasDraft,
  saveAction,
}: Props) {
  const [feedStyle, setFeedStyle] = useState(initialFeedStyle);
  const [listStyle, setListStyle] = useState(initialListStyle);
  const [columns, setColumns] = useState(initialColumns);
  const [gap, setGap] = useState(initialGap);
  const [contentDisplay, setContentDisplay] = useState(initialContentDisplay);
  const [, startTransition] = useTransition();
  const { setIsSaving } = useDesignSave();

  // Sync local state from server props when hasDraft transitions true → false
  // (i.e. after publish or discard), so the form reflects the new published config.
  const prevHasDraftRef = useRef(hasDraft);
  useEffect(() => {
    const wasDraft = prevHasDraftRef.current;
    prevHasDraftRef.current = hasDraft;
    if (wasDraft && !hasDraft) {
      setFeedStyle(initialFeedStyle);
      setListStyle(initialListStyle);
      setColumns(initialColumns);
      setGap(initialGap);
      setContentDisplay(initialContentDisplay);
    }
  }, [hasDraft, initialFeedStyle, initialListStyle, initialColumns, initialGap, initialContentDisplay]);

  function saveFeed(partial: Record<string, string>) {
    // Always persist all 4 layout values so a partial save never leaves the
    // draft in an inconsistent state if Publish fires mid-save.
    const full = {
      homeFeedStyle: feedStyle,
      homeListStyle: listStyle,
      homeColumns: columns,
      homeGap: gap,
      homeContentDisplay: contentDisplay,
      ...partial, // overwrite with the value that just changed
    };
    setIsSaving(true);
    startTransition(async () => {
      await saveAction(full);
      setIsSaving(false);
    });
  }

  return (
    <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">

      {/* Card header */}
      <div className="px-5 py-4 border-b border-zinc-100">
        <h3 className="text-base font-semibold text-zinc-800">Layout — Homepage</h3>
        <p className="text-xs text-zinc-600 mt-0.5">Feed style and hero banner for the homepage.</p>
      </div>

      {/* Feed controls */}
      <div className="px-5 py-5 space-y-5">

        {/* Feed style */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <span className="text-sm font-medium text-zinc-700">Feed style</span>
            <p className="text-xs text-zinc-600 mt-0.5">Display posts as a list or a grid.</p>
          </div>
          <div className="flex gap-1 shrink-0">
            {(["list", "grid"] as const).map(s => (
              <button
                key={s} type="button"
                onClick={() => { setFeedStyle(s); saveFeed({ homeFeedStyle: s }); }}
                className={`px-4 py-1.5 text-xs rounded-lg capitalize font-medium transition-colors ${
                  feedStyle === s ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* List style (only visible in list mode) */}
        {feedStyle === "list" && (
          <div className="flex items-center justify-between gap-4">
            <div>
              <span className="text-sm font-medium text-zinc-700">List style</span>
              <p className="text-xs text-zinc-600 mt-0.5">Visual layout for each post row.</p>
            </div>
            <div className="flex gap-1 shrink-0">
              {LIST_STYLES.map(({ value, label }) => (
                <button
                  key={value} type="button"
                  onClick={() => { setListStyle(value); saveFeed({ homeListStyle: value }); }}
                  className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                    listStyle === value ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Grid columns (only visible in grid mode) */}
        {feedStyle === "grid" && (
          <div className="flex items-center justify-between gap-4">
            <div>
              <span className="text-sm font-medium text-zinc-700">Columns</span>
              <p className="text-xs text-zinc-600 mt-0.5">Number of columns in the grid.</p>
            </div>
            <div className="flex gap-1 shrink-0">
              {(["1", "2", "3"] as const).map(c => (
                <button
                  key={c} type="button"
                  onClick={() => { setColumns(c); saveFeed({ homeColumns: c }); }}
                  className={`px-4 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                    columns === c ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Gap */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <span className="text-sm font-medium text-zinc-700">Gap</span>
            <p className="text-xs text-zinc-600 mt-0.5">Spacing between items.</p>
          </div>
          <div className="flex gap-1 shrink-0">
            {([["sm", "S"], ["md", "M"], ["lg", "L"]] as const).map(([val, label]) => (
              <button
                key={val} type="button"
                onClick={() => { setGap(val); saveFeed({ homeGap: val }); }}
                className={`px-4 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                  gap === val ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <span className="text-sm font-medium text-zinc-700">Content</span>
            <p className="text-xs text-zinc-600 mt-0.5">Preview text shown in each card.</p>
          </div>
          <div className="flex gap-1 shrink-0">
            {(["excerpt", "none"] as const).map(v => (
              <button
                key={v} type="button"
                onClick={() => { setContentDisplay(v); saveFeed({ homeContentDisplay: v }); }}
                className={`px-4 py-1.5 text-xs rounded-lg capitalize font-medium transition-colors ${
                  contentDisplay === v ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                {v === "excerpt" ? "Excerpt" : "None"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Embedded hero canvas */}
      <HeroCanvas
        embedded
        initialConfig={heroConfig}
        allMedia={allMedia}
        saveAction={saveAction}
      />
    </div>
  );
}
