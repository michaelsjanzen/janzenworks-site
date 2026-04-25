import type { Metadata } from "next";

export const metadata: Metadata = { title: "Comments" };

import { notFound } from "next/navigation";
import { getConfig } from "@/lib/config";
import CommentsAdminPage from "../../../../plugins/comments/components/AdminPage";

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function CommentsQueuePage({ searchParams }: Props) {
  const config = await getConfig();

  if (!config.modules.activePlugins.includes("comments")) {
    notFound();
  }

  const sp = await searchParams;
  return <CommentsAdminPage searchParams={sp} />;
}
