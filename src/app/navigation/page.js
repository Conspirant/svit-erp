import { redirect } from "next/navigation";

export default function PublicNavRedirect() {
  redirect("/admin/navigation");
}
