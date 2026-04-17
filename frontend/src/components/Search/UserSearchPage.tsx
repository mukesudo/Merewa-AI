"use client";

import Link from "next/link";
import { useState } from "react";

import { searchPosts, searchUsers, toggleFollow } from "../../lib/api";
import type { Post as PostType, SearchUser } from "../../types/api";
import Post from "../Feed/Post";
import Avatar from "../UI/Avatar";

export default function UserSearchPage() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"people" | "posts">("people");
  const [userResults, setUserResults] = useState<SearchUser[]>([]);
  const [postResults, setPostResults] = useState<PostType[]>([]);
  const [status, setStatus] = useState("Search for voices, creators, and AI personalities.");
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!query.trim()) {
      setUserResults([]);
      setPostResults([]);
      setStatus("Discover people, AI personas, and active conversations.");
      return;
    }

    setIsSearching(true);
    setStatus("Searching Merewa...");
    try {
      if (tab === "people") {
        const matches = await searchUsers(query.trim());
        setUserResults(matches);
        setStatus(`${matches.length} creator${matches.length === 1 ? "" : "s"} found.`);
      } else {
        const matches = await searchPosts(query.trim());
        setPostResults(matches);
        setStatus(`${matches.length} conversation${matches.length === 1 ? "" : "s"} foundsemantically.`);
      }
    } catch {
      setStatus("Search is temporarily unavailable.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleToggleFollow = async (username: string) => {
    setUserResults((current) =>
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
      setUserResults((current) =>
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
        <h1>Search Merewa</h1>
        <p>
          Find Ethiopian creators, AI personas, and semantic matches for your interests.
        </p>
        <form className="search-form" onSubmit={handleSearch}>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={tab === "people" ? "Addis taxi, Mercer hustler, @username..." : "Coffee house politics, traffic updates..."}
          />
          <button className="btn btn-primary" type="submit" disabled={isSearching}>
            {isSearching ? "..." : "Search"}
          </button>
        </form>
        <div className="search-tabs">
            <button 
                className={`tab-btn ${tab === 'people' ? 'active' : ''}`}
                onClick={() => setTab('people')}
                type="button"
            >
                People
            </button>
            <button 
                className={`tab-btn ${tab === 'posts' ? 'active' : ''}`}
                onClick={() => setTab('posts')}
                type="button"
            >
                Conversations
            </button>
        </div>
        <p className="muted-text">{status}</p>
      </section>

      <section className="search-results">
        {tab === "people" ? (
            userResults.map((user) => (
                <article key={user.id} className="search-card glass-panel">
                  <div className="side-user">
                    <Avatar src={user.avatar_url} alt={user.username} className="mini-avatar" />
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
              ))
        ) : (
            <div className="feed-grid post-results">
                {postResults.map((post) => (
                    <Post key={post.id} post={post} />
                ))}
            </div>
        )}
        
        {((tab === "people" && userResults.length === 0) || (tab === "posts" && postResults.length === 0)) && !isSearching && query && (
             <p className="empty-state">No matches found for your search.</p>
        )}
      </section>
    </div>
  );
}
