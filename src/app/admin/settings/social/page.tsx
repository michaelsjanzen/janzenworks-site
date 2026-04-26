import { redirect } from "next/navigation";

// Social Links moved to Design > Social Links
export default function SocialLinksRedirect() {
  redirect("/admin/design/social");
}
