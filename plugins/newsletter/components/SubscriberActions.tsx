"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteSubscriber } from "../actions";

export function DeleteSubscriberButton({ id, email }: { id: number; email: string }) {
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function handle() {
    if (!confirm(`Remove ${email} from the subscriber list?`)) return;
    setPending(true);
    await deleteSubscriber(id);
    setPending(false);
    router.refresh();
  }

  return (
    <button
      onClick={handle}
      disabled={pending}
      className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50 font-medium transition-colors"
    >
      {pending ? "Removing…" : "Remove"}
    </button>
  );
}
