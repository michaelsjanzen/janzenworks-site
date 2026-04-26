import { redirect } from "next/navigation";

// Navigation moved to Design > Navigation
export default function NavigationRedirect() {
  redirect("/admin/design/navigation");
}
