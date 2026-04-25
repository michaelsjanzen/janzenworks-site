"use client";
import { useRef, useState } from "react";
import { uploadMedia } from "@/lib/actions/media";

export interface UploadedMediaItem {
  id: number;
  url: string;
  fileName: string;
}

interface Props {
  onUploaded: (items: UploadedMediaItem[]) => void;
  multiple?: boolean;
  compact?: boolean;
}

export default function MediaDropZone({ onUploaded, multiple = false, compact = false }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const dragCounter = useRef(0);

  function onDragEnter(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current++;
    setDragging(true);
  }

  function onDragLeave(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) setDragging(false);
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  async function uploadFiles(files: FileList | File[]) {
    const fileArray = Array.from(files);
    if (!fileArray.length) return;
    setUploading(true);
    setErrors([]);
    const errs: string[] = [];
    const uploaded: UploadedMediaItem[] = [];

    for (const file of fileArray) {
      const fd = new FormData();
      fd.append("file", file);
      const result = await uploadMedia(fd);
      if ("error" in result && result.error) {
        errs.push(`${file.name}: ${result.error}`);
      } else if (result.id && result.url) {
        uploaded.push({ id: result.id, url: result.url, fileName: file.name });
      }
    }

    setUploading(false);
    if (errs.length) setErrors(errs);
    if (uploaded.length) onUploaded(uploaded);
    if (inputRef.current) inputRef.current.value = "";
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current = 0;
    setDragging(false);
    const files = e.dataTransfer.files;
    if (files.length) uploadFiles(files);
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.length) uploadFiles(e.target.files);
  }

  if (compact) {
    return (
      <div>
        <div
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onClick={() => !uploading && inputRef.current?.click()}
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed cursor-pointer transition-colors text-sm ${
            dragging
              ? "border-zinc-700 bg-zinc-100 text-zinc-700"
              : "border-zinc-200 bg-zinc-50 text-zinc-400 hover:border-zinc-400 hover:text-zinc-600"
          } ${uploading ? "pointer-events-none opacity-60" : ""}`}
        >
          {uploading ? (
            <>
              <svg className="w-4 h-4 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Uploading…
            </>
          ) : (
            <>
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              {dragging ? "Drop to upload" : "Drop a file or click to upload"}
            </>
          )}
        </div>
        {errors.map((e) => <p key={e} className="text-xs text-red-500 mt-1">{e}</p>)}
        <input ref={inputRef} type="file" accept="image/*,video/*" multiple={multiple} className="hidden" onChange={onChange} />
      </div>
    );
  }

  return (
    <div>
      <div
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-2 w-full py-10 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
          dragging
            ? "border-zinc-700 bg-zinc-100 text-zinc-700"
            : "border-zinc-200 bg-zinc-50 text-zinc-400 hover:border-zinc-400 hover:text-zinc-600"
        } ${uploading ? "pointer-events-none opacity-60" : ""}`}
      >
        {uploading ? (
          <>
            <svg className="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            <span className="text-sm">Uploading…</span>
          </>
        ) : (
          <>
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <div className="text-center">
              <p className="text-sm font-medium">{dragging ? "Drop to upload" : "Drop files here"}</p>
              <p className="text-xs mt-0.5">or click to browse — images &amp; video, max 4 MB</p>
            </div>
          </>
        )}
      </div>
      {errors.map((e) => <p key={e} className="text-xs text-red-500 mt-1.5">{e}</p>)}
      <input ref={inputRef} type="file" accept="image/*,video/*" multiple={multiple} className="hidden" onChange={onChange} />
    </div>
  );
}
