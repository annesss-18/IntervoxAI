import { Metadata } from "next";
import { AuthForm } from "@/components/organisms/AuthForm";

export const metadata: Metadata = {
  title: "Sign In",
  description:
    "Sign in to your IntervoxAI account to continue practicing interviews.",
};

export default function SignInPage() {
  return <AuthForm type="sign-in" />;
}
