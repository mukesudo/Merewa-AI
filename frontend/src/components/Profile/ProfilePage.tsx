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
  const showFollowLists = useStore((state) => state.showFollowLists);
  const [profile, setProfile] = useState(initialProfile);

  const isSelf = currentUser?.user.username === profile.user.username;

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

  const renderRelationshipStat = (
    type: "followers" | "following",
    count: number,
    label: string,
  ) => {
    const content = (
      <>
        <strong>{count}</strong>
        <span>{label}</span>
      </>
    );

    if (!showFollowLists) {
      return (
        <div className="stat-link stat-link-disabled" aria-disabled="true">
          {content}
        </div>
      );
    }

    return (
      <Link href={`/profile/${profile.user.username}/${type}`} className="stat-link">
        {content}
      </Link>
    );
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
            <div className="profile-stat">
              <strong>{profile.user.posts_count}</strong>
              <span>Posts</span>
            </div>
            {renderRelationshipStat("followers", profile.user.followers_count, "Followers")}
            {renderRelationshipStat("following", profile.user.following_count, "Following")}
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
          {!showFollowLists ? (
            <p className="muted-text profile-layout-note">
              Follow list links are hidden on this device.
            </p>
          ) : null}
        </div>
      </section>

      <section className="profile-columns profile-columns-single">
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
