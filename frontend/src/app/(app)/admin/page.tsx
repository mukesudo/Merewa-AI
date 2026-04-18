"use client";

import { useEffect, useState, startTransition } from "react";
import { BarChart3, Database, Users, Wand2 } from "lucide-react";
import { fetchStats, fetchPersonalities, generateAiPost } from "../../../lib/api";
import AiStudio from "../../../components/UI/AiStudio";
import useStore from "../../../store/useStore";
import { fallbackPersonalities } from "../../../types/api";

export default function AdminPage() {
  const currentUser = useStore((state) => state.currentUser);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [personalities, setPersonalities] = useState<any[]>([]);
  const [selectedPersona, setSelectedPersona] = useState("");
  const [topic, setTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchStats(), fetchPersonalities()])
      .then(([statsData, personalitiesData]) => {
        setStats(statsData);
        setPersonalities(personalitiesData);
        if (personalitiesData.length > 0) {
            setSelectedPersona(personalitiesData[0].key);
            setTopic(personalitiesData[0].default_topics[0]);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleGenerate = () => {
    if (!currentUser) return;
    setIsGenerating(true);
    setStatusMessage("Generating AI post...");
    
    startTransition(() => {
      void generateAiPost({
        persona_key: selectedPersona,
        topic,
        language: currentUser.user.preferred_language,
        publish: true,
      })
        .then((response) => {
          setStatusMessage(`Success: Generated ${response.persona.display_name} post.`);
          // Optionally refresh stats
          fetchStats().then(setStats);
        })
        .catch(() => {
          setStatusMessage("AI generation failed. Check Groq and backend configuration.");
        })
        .finally(() => setIsGenerating(false));
    });
  };

  if (loading) return <div className="center-all"><div className="spinner" /></div>;

  return (
    <div className="page-stack admin-layout">
      <section className="glass-panel search-hero">
        <span className="eyebrow eyebrow-accent-red">Admin Ops</span>
        <h1>Platform Insights</h1>
        <p>Monitor real-time activity, user growth, and AI persona performance.</p>
      </section>

      <div className="admin-grid">
          <div className="admin-main">
            <div className="todo-grid">
                <article className="todo-card active glass-panel">
                <div className="stack-inline">
                    <Users size={20} className="feature-icon" />
                    <span className="todo-state">Users</span>
                </div>
                <h3>{stats?.total_users || 0}</h3>
                <p>Total registered accounts.</p>
                </article>

                <article className="todo-card done glass-panel">
                <div className="stack-inline">
                    <Database size={20} className="feature-icon" />
                    <span className="todo-state">Posts</span>
                </div>
                <h3>{stats?.total_posts || 0}</h3>
                <p>Total contributions shared.</p>
                </article>

                <article className="todo-card next glass-panel">
                <div className="stack-inline">
                    <Wand2 size={20} className="feature-icon" />
                    <span className="todo-state">AI Agents</span>
                </div>
                <h3>{stats?.ai_users || 0}</h3>
                <p>Active AI personas.</p>
                </article>
            </div>

            <section className="glass-panel side-panel">
                <div className="stack-inline">
                <BarChart3 size={20} />
                <h3>System Health</h3>
                </div>
                <div className="status-banner">
                <p><strong>Database:</strong> Connected</p>
                <p><strong>Vector Search:</strong> {stats?.vector_search === "weaviate" ? "Weaviate" : "Local semantic fallback"}</p>
                <p><strong>AI Engine:</strong> {stats?.llm_provider === "groq" ? "Groq" : "Ollama"}</p>
                <p className="muted-text persona-note">Last updated: {stats?.timestamp ? new Date(stats.timestamp).toLocaleString() : 'Just now'}</p>
                </div>
            </section>
          </div>

          <aside className="admin-ai-studio">
            <AiStudio
                personalities={personalities.length ? personalities : fallbackPersonalities}
                selectedPersona={selectedPersona}
                topic={topic}
                statusMessage={statusMessage}
                isGenerating={isGenerating}
                onSelectPersona={setSelectedPersona}
                onTopicChange={setTopic}
                onGenerate={handleGenerate}
                onRefresh={() => {}}
            />
          </aside>
      </div>
    </div>
  );
}
