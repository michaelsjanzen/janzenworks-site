"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { useDebouncedCallback } from "use-debounce";

export default function PostSearchInput({ defaultValue }: { defaultValue: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const update = useCallback((value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("q", value);
    } else {
      params.delete("q");
    }
    startTransition(() => {
      router.replace(`/admin/posts?${params.toString()}`);
    });
  }, [router, searchParams]);

  const debouncedUpdate = useDebouncedCallback(update, 300);

  return (
    <div className="relative">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="search"
        placeholder="Search posts and pages…"
        defaultValue={defaultValue}
        onChange={e => debouncedUpdate(e.target.value)}
        className="w-full sm:w-72 pl-9 pr-3 py-1.5 border border-zinc-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 bg-white"
      />
    </div>
  );
}
