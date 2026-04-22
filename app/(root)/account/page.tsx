import { Metadata } from "next";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { redirect } from "next/navigation";
import AccountClient from "./AccountClient";

export const metadata: Metadata = {
  title: "Account Settings",
  description:
    "Manage your IntervoxAI account, update your profile, or delete your account.",
};

export default async function AccountPage() {
  const user = await getCurrentUser();

  // Shouldn't happen since (root) layout redirects, but defensive
  if (!user) redirect("/sign-in");

  return <AccountClient userName={user.name} userEmail={user.email} />;
}
