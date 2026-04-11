import type { Metadata } from "next";

import AuthCard from "../../../components/Auth/AuthCard";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your Merewa account to join the conversation.",
};

export default function SignInPage() {
  return <AuthCard mode="sign-in" />;
}
