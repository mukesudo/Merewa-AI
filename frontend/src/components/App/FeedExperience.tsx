"use client";

import { startTransition, useEffect, useState } from "react";

import { fetchFeed, fetchPersonalities, generateAiPost, getCurrentProfile } from "../../lib/api";
import useStore from "../../store/useStore";
import type {
  FeedResponse,
  Personality,
  Post,
  UserProfileResponse,
} from "../../types/api";
import { fallbackPersonalities, fallbackPosts } from "../../types/api";
import AudioRecorder from "../Feed/AudioRecorder";
import PostCard from "../Feed/Post";
import AiStudio from "../UI/AiStudio";

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
  const personalities = useStore((state) => state.personalities);
  const setPosts = useStore((state) => state.setPosts);
  const addPost = useStore((state) => state.addPost);
  const setPersonalities = useStore((state) => state.setPersonalities);
  const setCurrentUser = useStore((state) => state.setCurrentUser);
  const statusMessage = useStore((state) => state.statusMessage);
  const setStatusMessage = useStore((state) => state.setStatusMessage);

  const [selectedPersona, setSelectedPersona] = useState(
    initialPersonalities[0]?.key ?? "addis_taxi_driver",
  );
  const [topic, setTopic] = useState(
    initialPersonalities[0]?.default_topics[0] ?? "Addis traffic",
  );
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    setCurrentUser(currentUser);
    setPosts(initialFeed.posts);
    setPersonalities(initialPersonalities);
  }, [currentUser, initialFeed.posts, initialPersonalities, setCurrentUser, setPersonalities, setPosts]);

  const refreshFeed = async () => {
    try {
      const [feed, profile] = await Promise.all([fetchFeed(), getCurrentProfile()]);
      setPosts(feed.posts);
      setCurrentUser(profile);
      setStatusMessage("Feed refreshed with current follow signals and profile state.");
    } catch {
      setPosts(fallbackPosts);
      setStatusMessage("Backend unavailable, showing fallback feed.");
    }
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    startTransition(() => {
      void generateAiPost({
        persona_key: selectedPersona,
        topic,
        language: currentUser.user.preferred_language,
        publish: true,
      })
        .then((response) => {
          if (response.post) {
            addPost(response.post);
          }
          setStatusMessage(
            `Generated a new ${response.persona.display_name} post with RAG context.`,
          );
        })
        .catch(() => {
          setStatusMessage("AI generation is offline. Ollama and the FastAPI route need to be running.");
        })
        .finally(() => setIsGenerating(false));
    });
  };

  const activePersonalities = personalities.length
    ? personalities
    : fallbackPersonalities;
  const activePosts = posts.length ? posts : fallbackPosts;

  return (
    <div className="workspace-grid app-feed-grid">
      <AiStudio
        personalities={activePersonalities}
        selectedPersona={selectedPersona}
        topic={topic}
        statusMessage={statusMessage}
        isGenerating={isGenerating}
        onSelectPersona={(value) => {
          setSelectedPersona(value);
          const selected = activePersonalities.find((persona) => persona.key === value);
          if (selected) {
            setTopic(selected.default_topics[0] ?? topic);
          }
        }}
        onTopicChange={setTopic}
        onGenerate={handleGenerate}
        onRefresh={() => void refreshFeed()}
      />

      <section className="feed-stage">
        <div className="feed-container">
          {activePosts.map((post: Post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      </section>

      <AudioRecorder />
    </div>
  );
}
