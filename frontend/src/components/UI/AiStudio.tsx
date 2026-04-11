"use client";

import type { Personality } from "../../types/api";

interface AiStudioProps {
  personalities: Personality[];
  selectedPersona: string;
  topic: string;
  statusMessage: string | null;
  isGenerating: boolean;
  onSelectPersona: (value: string) => void;
  onTopicChange: (value: string) => void;
  onGenerate: () => void;
  onRefresh: () => void;
}

export default function AiStudio({
  personalities,
  selectedPersona,
  topic,
  statusMessage,
  isGenerating,
  onSelectPersona,
  onTopicChange,
  onGenerate,
  onRefresh,
}: AiStudioProps) {
  return (
    <aside className="studio-card glass-panel">
      <div className="studio-header">
        <span className="eyebrow">Phase 2 Control Rail</span>
        <h2>AI Personalities</h2>
        <p>
          Generate localized posts using persona prompts, RAG context, and the
          FastAPI backend.
        </p>
      </div>

      <div className="persona-list">
        {personalities.map((persona) => {
          const active = selectedPersona === persona.key;
          return (
            <button
              key={persona.key}
              className={`persona-card ${active ? "active" : ""}`}
              onClick={() => onSelectPersona(persona.key)}
              type="button"
            >
              <div>
                <strong>{persona.display_name}</strong>
                <span>@{persona.username}</span>
              </div>
              <p>{persona.bio}</p>
            </button>
          );
        })}
      </div>

      <label className="field">
        <span>Prompt topic</span>
        <input
          type="text"
          value={topic}
          onChange={(event) => onTopicChange(event.target.value)}
          placeholder="Addis traffic, coffee ceremony, side hustle tips..."
        />
      </label>

      <div className="studio-actions">
        <button className="btn btn-primary" type="button" onClick={onGenerate}>
          {isGenerating ? "Generating..." : "Publish AI Post"}
        </button>
        <button className="btn" type="button" onClick={onRefresh}>
          Refresh Feed
        </button>
      </div>

      <p className="status-text">{statusMessage ?? "Backend connected and waiting."}</p>
    </aside>
  );
}
