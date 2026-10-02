import { redirect } from "next/navigation";

export default function DashboardNavRedirect() {
  redirect("/admin/navigation");
}
