"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { fetchFeedPage } from "../../lib/api";
import useStore from "../../store/useStore";
import type {
  FeedResponse,
  Personality,
  Post,
  UserProfileResponse,
} from "../../types/api";
import { fallbackPosts } from "../../types/api";
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
  const setPosts = useStore((state) => state.setPosts);
  const setPersonalities = useStore((state) => state.setPersonalities);
  const setCurrentUser = useStore((state) => state.setCurrentUser);

  const [nextOffset, setNextOffset] = useState<number>(initialFeed.next_offset);
  const [hasMore, setHasMore] = useState<boolean>(initialFeed.posts.length > 0);
  const [isLoading, setIsLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setCurrentUser(currentUser);
    setPosts(initialFeed.posts);
    setPersonalities(initialPersonalities);
  }, [currentUser, initialFeed.posts, initialPersonalities, setCurrentUser, setPersonalities, setPosts]);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;
    setIsLoading(true);
    try {
      const page = await fetchFeedPage({ offset: nextOffset, limit: 12 });
      if (page.posts.length === 0) {
        setHasMore(false);
      } else {
        setPosts([...useStore.getState().posts, ...page.posts]);
        setNextOffset(page.next_offset);
        if (page.next_offset === nextOffset) setHasMore(false);
      }
    } catch {
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }, [hasMore, isLoading, nextOffset, setPosts]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          void loadMore();
        }
      },
      { rootMargin: "400px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore]);

  const activePosts = posts.length ? posts : fallbackPosts;

  return (
    <div className="app-feed-grid">
      <section className="feed-stage">
        <div className="feed-container">
          {activePosts.map((post: Post) => (
            <PostCard key={post.id} post={post} />
          ))}
          <div ref={sentinelRef} className="feed-sentinel" aria-hidden="true" />
          {isLoading ? (
            <p className="muted-text feed-loading">Loading more...</p>
          ) : !hasMore && posts.length > 0 ? (
            <p className="muted-text feed-loading">You&apos;re all caught up.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
