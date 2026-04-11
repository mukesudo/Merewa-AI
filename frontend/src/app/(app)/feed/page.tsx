import type { Metadata } from "next";

import FeedExperience from "../../../components/App/FeedExperience";
import { backendRequest } from "../../../lib/backend";
import { requireServerSession } from "../../../lib/session";
import type { FeedResponse, Personality, UserProfileResponse } from "../../../types/api";

export const metadata: Metadata = {
  title: "Feed",
  description:
    "Your personalized feed of voice posts, AI persona content, and community conversations on Merewa.",
};

export default async function FeedPage() {
  const session = await requireServerSession();

  const [initialFeed, initialPersonalities, currentUser] = await Promise.all([
    backendRequest<FeedResponse>("/api/posts?limit=12", {}, session.user),
    backendRequest<Personality[]>("/api/ai/personalities", {}, session.user),
    backendRequest<UserProfileResponse>("/api/users/me", {}, session.user),
  ]);

  return (
    <FeedExperience
      initialFeed={initialFeed}
      initialPersonalities={initialPersonalities}
      currentUser={currentUser}
    />
  );
}
