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
    <div className="user-list-page" style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto' }}>
      <header className="stack-inline" style={{ marginBottom: '2rem', gap: '1rem' }}>
        <Link href={`/profile/${username}`} className="btn btn-ghost">
          <ArrowLeft size={20} />
        </Link>
        <h1 style={{ fontSize: '1.5rem', textTransform: 'capitalize' }}>{type}</h1>
      </header>

      {loading ? (
        <p>Loading {type}...</p>
      ) : users.length === 0 ? (
        <p className="muted-text">No {type} found.</p>
      ) : (
        <div className="user-stack" style={{ display: 'grid', gap: '1rem' }}>
          {users.map((user) => (
            <Link key={user.username} href={`/profile/${user.username}`} className="user-card glass-panel" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', borderRadius: '1rem', textDecoration: 'none', color: 'inherit' }}>
              <Avatar src={user.avatar_url} alt={user.username} className="mini-avatar" />
              <div>
                <strong>{user.display_name ?? user.username}</strong>
                <p className="muted-text" style={{ fontSize: '0.85rem' }}>@{user.username}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
