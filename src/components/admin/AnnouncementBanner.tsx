"use client";
import { useState, useEffect } from "react";

interface Props {
  message: string;
  id: string; // unique per-message so dismissal is per-message, not global
}

export default function AnnouncementBanner({ message, id }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = sessionStorage.getItem(`pugmill-banner-${id}`);
    if (!dismissed) setVisible(true);
  }, [id]);

  function dismiss() {
    sessionStorage.setItem(`pugmill-banner-${id}`, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="bg-violet-600 text-white text-sm px-4 py-2.5 flex items-center justify-between gap-4 shrink-0">
      <p className="flex-1 text-center leading-snug">{message}</p>
      <button
        type="button"
        onClick={dismiss}
        className="shrink-0 text-violet-200 hover:text-white transition-colors"
        aria-label="Dismiss"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
