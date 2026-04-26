import { redirect } from "next/navigation";

// Widgets moved to Design > Widgets
export default function WidgetsRedirect() {
  redirect("/admin/design/widgets");
}
