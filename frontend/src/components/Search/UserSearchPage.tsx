"use client";

import Link from "next/link";
import { useState } from "react";

import { searchUsers, toggleFollow } from "../../lib/api";
import type { SearchUser } from "../../types/api";

export default function UserSearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchUser[]>([]);
  const [status, setStatus] = useState("Search for voices, creators, and AI personalities.");

  const handleSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!query.trim()) {
      setResults([]);
      setStatus("Type a username, display name, or phrase from a bio.");
      return;
    }

    try {
      const matches = await searchUsers(query.trim());
      setResults(matches);
      setStatus(`${matches.length} result${matches.length === 1 ? "" : "s"} found.`);
    } catch {
      setStatus("Search is unavailable while the backend is offline.");
    }
  };

  const handleToggleFollow = async (username: string) => {
    setResults((current) =>
      current.map((user) =>
        user.username === username
          ? {
              ...user,
              viewer_follows: !user.viewer_follows,
              followers_count: user.followers_count + (user.viewer_follows ? -1 : 1),
            }
          : user,
      ),
    );

    try {
      const response = await toggleFollow(username);
      setResults((current) =>
        current.map((user) =>
          user.username === username
            ? {
                ...user,
                viewer_follows: response.following,
              }
            : user,
        ),
      );
    } catch {
      setStatus("Could not update follow state.");
    }
  };

  return (
    <div className="page-stack">
      <section className="glass-panel search-hero">
        <span className="eyebrow">Discovery</span>
        <h1>Search people and personalities</h1>
        <p>
          Find Ethiopian creators, AI personas, and active voices across the
          platform.
        </p>
        <form className="search-form" onSubmit={handleSearch}>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by username, display name, or bio"
          />
          <button className="btn btn-primary" type="submit">
            Search
          </button>
        </form>
        <p className="muted-text">{status}</p>
      </section>

      <section className="search-results">
        {results.map((user) => (
          <article key={user.id} className="search-card glass-panel">
            <div className="side-user">
              <div className="mini-avatar">{user.avatar_url?.trim() || user.username[0]}</div>
              <div>
                <strong>{user.display_name ?? user.username}</strong>
                <span>@{user.username}</span>
              </div>
            </div>
            <p>{user.bio || "No bio yet."}</p>
            <div className="profile-stats compact">
              <div>
                <strong>{user.posts_count}</strong>
                <span>Posts</span>
              </div>
              <div>
                <strong>{user.followers_count}</strong>
                <span>Followers</span>
              </div>
              <div>
                <strong>{user.following_count}</strong>
                <span>Following</span>
              </div>
            </div>
            <div className="stack-inline">
              <Link href={`/profile/${user.username}`} className="btn">
                View profile
              </Link>
              <button
                className={`btn ${user.viewer_follows ? "btn-primary" : ""}`}
                onClick={() => void handleToggleFollow(user.username)}
                type="button"
              >
                {user.viewer_follows ? "Following" : "Follow"}
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
