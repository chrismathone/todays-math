import { redirect } from "next/navigation";

/** Old password links lead to the security section of the account settings page. */
export default function AccountPasswordPage() {
  redirect("/account#security");
}
