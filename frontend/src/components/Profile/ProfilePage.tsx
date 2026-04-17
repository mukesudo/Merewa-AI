"use client";

import Link from "next/link";
import { useState } from "react";
import { MapPin, Link2 } from "lucide-react";

import { toggleFollow } from "../../lib/api";
import useStore from "../../store/useStore";
import type { UserProfileResponse } from "../../types/api";
import PostCard from "../Feed/Post";
import Avatar from "../UI/Avatar";

interface ProfilePageProps {
  initialProfile: UserProfileResponse;
}

export default function ProfilePage({ initialProfile }: ProfilePageProps) {
  const currentUser = useStore((state) => state.currentUser);
  const [profile, setProfile] = useState(initialProfile);

  const isSelf = currentUser?.user.username === profile.user.username;

  const showFollowLists = useStore((state) => state.showFollowLists);

  const onToggleFollow = async () => {
    const previous = profile.user.viewer_follows;
    const delta = previous ? -1 : 1;
    setProfile((current) => ({
      ...current,
      user: {
        ...current.user,
        viewer_follows: !current.user.viewer_follows,
        followers_count: current.user.followers_count + delta,
      },
    }));

    try {
      const response = await toggleFollow(profile.user.username);
      setProfile((current) => ({
        ...current,
        user: {
          ...current.user,
          viewer_follows: response.following,
        },
      }));
    } catch {
      setProfile((current) => ({
        ...current,
        user: {
          ...current.user,
          viewer_follows: previous,
          followers_count: current.user.followers_count - delta,
        },
      }));
    }
  };

  return (
    <div className="profile-grid">
      <section className="profile-hero glass-panel">
        <Avatar src={profile.user.avatar_url} alt={profile.user.username} className="profile-avatar" />
        <div className="profile-copy">
          <span className="eyebrow">Profile</span>
          <h1>{profile.user.display_name ?? profile.user.username}</h1>
          <p>@{profile.user.username}</p>
          {profile.user.bio ? <p className="profile-bio">{profile.user.bio}</p> : null}
          <div className="profile-meta">
            {profile.user.location ? (
              <span>
                <MapPin size={14} />
                {profile.user.location}
              </span>
            ) : null}
            {profile.user.website ? (
              <Link href={profile.user.website} target="_blank">
                <Link2 size={14} />
                {profile.user.website}
              </Link>
            ) : null}
          </div>
        </div>
        <div className="profile-actions">
          <div className="profile-stats">
            <div>
              <strong>{profile.user.posts_count}</strong>
              <span>Posts</span>
            </div>
            <Link href={`/profile/${profile.user.username}/followers`} className="stat-link" style={{ textDecoration: 'none', color: 'inherit' }}>
              <strong>{profile.user.followers_count}</strong>
              <span>Followers</span>
            </Link>
            <Link href={`/profile/${profile.user.username}/following`} className="stat-link" style={{ textDecoration: 'none', color: 'inherit' }}>
              <strong>{profile.user.following_count}</strong>
              <span>Following</span>
            </Link>
          </div>
          {!isSelf ? (
            <button className={`btn ${profile.user.viewer_follows ? "btn-primary" : ""}`} onClick={() => void onToggleFollow()} type="button">
              {profile.user.viewer_follows ? "Following" : "Follow"}
            </button>
          ) : (
            <Link href="/settings" className="btn">
              Edit profile
            </Link>
          )}
        </div>
      </section>

      <section className="profile-columns" style={{ display: 'block' }}>
        <div className="profile-feed">
          <div className="section-header">
            <h2>Recent posts</h2>
          </div>
          {profile.recent_posts.length ? (
            profile.recent_posts.map((post) => <PostCard key={post.id} post={post} />)
          ) : (
            <div className="empty-card glass-panel">
              <p>No posts yet.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
