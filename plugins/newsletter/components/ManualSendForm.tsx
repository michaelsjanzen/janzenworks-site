"use client";
import { useRef, useState } from "react";
import { sendNewsletterManually } from "../actions";

interface Post {
  id: number;
  title: string;
  type: string;
}

interface Props {
  posts: Post[];
  defaultReplyTo: string;
  subscriberCount: number;
}

export default function ManualSendForm({ posts, defaultReplyTo, subscriberCount }: Props) {
  const [subject, setSubject]   = useState("");
  const [replyTo, setReplyTo]   = useState(defaultReplyTo);
  const [status, setStatus]     = useState<"idle" | "pending" | "ok" | "error">("idle");
  const [message, setMessage]   = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function handlePostChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const selected = posts.find((p) => p.id === Number(e.target.value));
    if (selected && !subject) setSubject(selected.title);
    else if (selected) setSubject(selected.title);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("pending");
    setMessage(null);
    const fd = new FormData(e.currentTarget);
    const result = await sendNewsletterManually(fd);
    if (result.ok) {
      setStatus("ok");
      setMessage(`Sent to ${result.count} subscriber${result.count === 1 ? "" : "s"}.`);
      formRef.current?.reset();
      setSubject("");
      setReplyTo(defaultReplyTo);
    } else {
      setStatus("error");
      setMessage(result.error ?? "Something went wrong.");
    }
  }

  if (posts.length === 0) {
    return (
      <p className="px-6 py-8 text-sm text-zinc-400 text-center">
        No published posts to send.
      </p>
    );
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
      {/* Post picker */}
      <div>
        <label className="block text-xs font-medium text-zinc-600 mb-1">Post</label>
        <select
          name="postId"
          required
          onChange={handlePostChange}
          defaultValue=""
          className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-400"
        >
          <option value="" disabled>Select a post…</option>
          {posts.map((p) => (
            <option key={p.id} value={p.id}>{p.title}</option>
          ))}
        </select>
      </div>

      {/* Subject */}
      <div>
        <label className="block text-xs font-medium text-zinc-600 mb-1">Subject line</label>
        <input
          name="subject"
          type="text"
          required
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Email subject…"
          className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-400"
        />
      </div>

      {/* Reply-to */}
      <div>
        <label className="block text-xs font-medium text-zinc-600 mb-1">
          Reply-to <span className="text-zinc-400 font-normal">(optional override)</span>
        </label>
        <input
          name="replyTo"
          type="email"
          value={replyTo}
          onChange={(e) => setReplyTo(e.target.value)}
          placeholder={defaultReplyTo || "reply@example.com"}
          className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-400"
        />
      </div>

      {/* Feedback */}
      {status === "ok" && (
        <p className="text-sm text-emerald-600">{message}</p>
      )}
      {status === "error" && (
        <p className="text-sm text-red-500">{message}</p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={status === "pending"}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-zinc-900 text-white disabled:opacity-50 hover:bg-zinc-700 transition-colors"
        >
          {status === "pending"
            ? "Sending…"
            : `Send to ${subscriberCount} subscriber${subscriberCount === 1 ? "" : "s"}`}
        </button>
      </div>
    </form>
  );
}
