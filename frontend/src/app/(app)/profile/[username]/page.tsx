import type { Metadata } from "next";

import ProfilePage from "../../../../components/Profile/ProfilePage";
import { backendRequest } from "../../../../lib/backend";
import { requireServerSession } from "../../../../lib/session";
import type { UserProfileResponse } from "../../../../types/api";

interface ProfileRouteProps {
  params: {
    username: string;
  };
}

export async function generateMetadata({
  params,
}: ProfileRouteProps): Promise<Metadata> {
  return {
    title: `@${params.username}`,
    description: `View @${params.username}'s profile, posts, and social connections on Merewa.`,
    openGraph: {
      title: `@${params.username} on Merewa`,
      description: `View @${params.username}'s profile, posts, and social connections on Merewa.`,
    },
  };
}

export default async function ProfileRoute({ params }: ProfileRouteProps) {
  const session = await requireServerSession();
  const profile = await backendRequest<UserProfileResponse>(
    `/api/users/${params.username}`,
    {},
    session.user,
  );
  return <ProfilePage initialProfile={profile} />;
}
