"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import Avatar from "@/components/UI/Avatar";
import { fetchFollowers, fetchFollowing } from "../../lib/api";
import { SearchUser } from "../../types/api";

interface UserListPageProps {
  username: string;
  type: "followers" | "following";
}

export default function UserListPage({ username, type }: UserListPageProps) {
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetcher = type === "followers" ? fetchFollowers : fetchFollowing;
    fetcher(username)
      .then(setUsers)
      .finally(() => setLoading(false));
  }, [username, type]);

  return (
    <div className="user-list-page">
      <header className="stack-inline user-list-header">
        <Link href={`/profile/${username}`} className="btn btn-ghost">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="user-list-title">{type}</h1>
      </header>

      {loading ? (
        <p>Loading {type}...</p>
      ) : users.length === 0 ? (
        <p className="muted-text">No {type} found.</p>
      ) : (
        <div className="user-stack">
          {users.map((user) => (
            <Link key={user.username} href={`/profile/${user.username}`} className="user-card glass-panel">
              <Avatar src={user.avatar_url} alt={user.username} className="mini-avatar" />
              <div>
                <strong>{user.display_name ?? user.username}</strong>
                <p className="muted-text user-handle">@{user.username}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
