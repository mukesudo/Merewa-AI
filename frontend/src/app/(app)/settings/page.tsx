import type { Metadata } from "next";

import SettingsPage from "../../../components/Settings/SettingsPage";
import { backendRequest } from "../../../lib/backend";
import { requireServerSession } from "../../../lib/session";
import type { UserProfileResponse } from "../../../types/api";

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your Merewa profile, language preferences, and account settings.",
};

export default async function SettingsRoute() {
  const session = await requireServerSession();
  const profile = await backendRequest<UserProfileResponse>(
    "/api/users/me",
    {},
    session.user,
  );
  return <SettingsPage initialProfile={profile} />;
}
