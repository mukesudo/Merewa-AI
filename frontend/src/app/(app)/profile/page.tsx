import { redirect } from "next/navigation";

import { backendRequest } from "../../../lib/backend";
import { requireServerSession } from "../../../lib/session";
import type { UserProfileResponse } from "../../../types/api";

export default async function MyProfileRoute() {
  const session = await requireServerSession();
  const profile = await backendRequest<UserProfileResponse>(
    "/api/users/me",
    {},
    session.user,
  );
  redirect(`/profile/${profile.user.username}`);
}
