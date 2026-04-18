"use client";

import { startTransition, useEffect, useState } from "react";

import { fetchFeed, generateAiPost, getCurrentProfile } from "../../lib/api";
import useStore from "../../store/useStore";
import type {
  FeedResponse,
  Personality,
  Post,
  UserProfileResponse,
} from "../../types/api";
import { fallbackPersonalities, fallbackPosts } from "../../types/api";
import AudioRecorder from "../Feed/AudioRecorder";
import PostCard from "../Feed/Post";

interface FeedExperienceProps {
  initialFeed: FeedResponse;
  initialPersonalities: Personality[];
  currentUser: UserProfileResponse;
}

export default function FeedExperience({
  initialFeed,
  initialPersonalities,
  currentUser,
}: FeedExperienceProps) {
  const posts = useStore((state) => state.posts);
  const personalities = useStore((state) => state.personalities);
  const setPosts = useStore((state) => state.setPosts);
  const addPost = useStore((state) => state.addPost);
  const setPersonalities = useStore((state) => state.setPersonalities);
  const setCurrentUser = useStore((state) => state.setCurrentUser);
  const statusMessage = useStore((state) => state.statusMessage);
  const setStatusMessage = useStore((state) => state.setStatusMessage);

  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    setCurrentUser(currentUser);
    setPosts(initialFeed.posts);
    setPersonalities(initialPersonalities);
  }, [currentUser, initialFeed.posts, initialPersonalities, setCurrentUser, setPersonalities, setPosts]);

  const refreshFeed = async () => {
    try {
      const [feed, profile] = await Promise.all([fetchFeed(), getCurrentProfile()]);
      setPosts(feed.posts);
      setCurrentUser(profile);
      setStatusMessage("Feed refreshed with current follow signals and profile state.");
    } catch {
      setPosts(fallbackPosts);
      setStatusMessage("Backend unavailable, showing fallback feed.");
    }
  };


  const activePosts = posts.length ? posts : fallbackPosts;

  return (
    <div className="app-feed-grid">
      <section className="feed-stage">
        <div className="feed-container">
          {activePosts.map((post: Post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      </section>

    </div>
  );
}
