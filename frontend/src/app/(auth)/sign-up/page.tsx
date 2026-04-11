import type { Metadata } from "next";

import AuthCard from "../../../components/Auth/AuthCard";

export const metadata: Metadata = {
  title: "Sign Up",
  description:
    "Create your Merewa account and join Ethiopia's AI-powered voice social platform.",
};

export default function SignUpPage() {
  return <AuthCard mode="sign-up" />;
}
