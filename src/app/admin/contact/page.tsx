import type { Metadata } from "next";

export const metadata: Metadata = { title: "Contact" };

import { notFound, redirect } from "next/navigation";
import { getConfig } from "@/lib/config";
import { getCurrentUser } from "@/lib/get-current-user";
import ContactFormAdminPage from "../../../../plugins/contact-form/components/AdminPage";

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ContactQueuePage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/admin");

  const config = await getConfig();

  if (!config.modules.activePlugins.includes("contact-form")) {
    notFound();
  }

  const sp = await searchParams;
  return <ContactFormAdminPage searchParams={sp} />;
}
