import { notFound } from "next/navigation";

import AppShell from "../../components/App/AppShell";
import { backendRequest } from "../../lib/backend";
import { requireServerSession } from "../../lib/session";
import type { UserProfileResponse } from "../../types/api";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireServerSession();

  let currentUser: UserProfileResponse;
  try {
    currentUser = await backendRequest<UserProfileResponse>(
      "/api/users/me",
      {},
      session.user,
    );
  } catch {
    notFound();
  }

  return <AppShell currentUser={currentUser}>{children}</AppShell>;
}
