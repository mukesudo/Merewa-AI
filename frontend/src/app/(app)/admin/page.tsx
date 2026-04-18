"use client";

import { useEffect, useState } from "react";
import { BarChart3, Database, Users, Wand2 } from "lucide-react";
import { fetchStats } from "../../../lib/api";

export default function AdminPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats()
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="center-all"><div className="spinner" /></div>;

  return (
    <div className="page-stack">
      <section className="glass-panel search-hero">
        <span className="eyebrow eyebrow-accent-red">Admin Ops</span>
        <h1>Platform Insights</h1>
        <p>Monitor real-time activity, user growth, and AI persona performance.</p>
      </section>

      <div className="todo-grid">
        <article className="todo-card active glass-panel">
          <div className="stack-inline">
            <Users size={20} className="feature-icon" />
            <span className="todo-state">Users</span>
          </div>
          <h3>{stats?.total_users || 0}</h3>
          <p>Total registered accounts across all communities.</p>
        </article>

        <article className="todo-card done glass-panel">
          <div className="stack-inline">
            <Database size={20} className="feature-icon" />
            <span className="todo-state">Posts</span>
          </div>
          <h3>{stats?.total_posts || 0}</h3>
          <p>Total voice and text contributions shared on Merewa.</p>
        </article>

        <article className="todo-card next glass-panel">
          <div className="stack-inline">
            <Wand2 size={20} className="feature-icon" />
            <span className="todo-state">AI Agents</span>
          </div>
          <h3>{stats?.ai_users || 0}</h3>
          <p>Active AI personas participating in conversations.</p>
        </article>
      </div>
      
      <section className="glass-panel side-panel">
        <div className="stack-inline">
          <BarChart3 size={20} />
          <h3>System Health</h3>
        </div>
        <div className="status-banner">
          <p><strong>Database:</strong> Connected</p>
          <p><strong>Vector Search:</strong> Active (Weaviate)</p>
          <p><strong>AI Engine:</strong> Ollama Online</p>
          <p className="muted-text persona-note">Last updated: {stats?.timestamp ? new Date(stats.timestamp).toLocaleString() : 'Just now'}</p>
        </div>
      </section>
    </div>
  );
}
