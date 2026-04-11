"use client";

import { useEffect, useRef, useState } from "react";

import { createPost } from "../../lib/api";
import useStore from "../../store/useStore";
import type { Post } from "../../types/api";

export default function AudioRecorder() {
  const isRecording = useStore((state) => state.isRecording);
  const setIsRecording = useStore((state) => state.setIsRecording);
  const addPost = useStore((state) => state.addPost);
  const currentUser = useStore((state) => state.currentUser);

  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (recordingTime >= 60) {
      stopRecording();
    }
  }, [recordingTime]);

  const cleanupTimer = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: "audio/webm" });
        const audioUrl = URL.createObjectURL(audioBlob);
        const draftPost: Post = {
          id: Date.now(),
          type: "audio",
          content: "New voice note",
          media_url: audioUrl,
          language: "am",
          origin: "human",
          author: currentUser?.user.username ?? "you",
          author_id: currentUser?.user.id ?? 0,
          author_display_name:
            currentUser?.user.display_name ?? currentUser?.user.username ?? "You",
          author_avatar_url: currentUser?.user.avatar_url ?? null,
          author_is_ai: false,
          like_count: 0,
          comment_count: 0,
          share_count: 0,
          engagement_score: 1,
          viewer_follows_author: false,
          comments: [],
        };

        try {
          const savedPost = await createPost({
            type: "audio",
            content: draftPost.content,
            media_url: audioUrl,
            language: draftPost.language,
            origin: "human",
          });
          addPost(savedPost);
        } catch {
          addPost(draftPost);
        }

        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = window.setInterval(() => {
        setRecordingTime((value) => value + 1);
      }, 1000);
    } catch {
      window.alert("Microphone access is required to record a post.");
    }
  };

  const stopRecording = () => {
    if (!mediaRecorder || mediaRecorder.state === "inactive") {
      return;
    }

    mediaRecorder.stop();
    setIsRecording(false);
    cleanupTimer();
  };

  if (!currentUser) {
    return null;
  }

  return (
    <div className="recorder-shell">
      {isRecording ? (
        <div className="recording-indicator">Recording {recordingTime}s / 60s</div>
      ) : null}
      <button
        type="button"
        className={`record-button ${isRecording ? "active" : ""}`}
        onClick={isRecording ? stopRecording : startRecording}
      >
        <span className="record-dot" />
        <span>{isRecording ? "Stop" : "Record"}</span>
      </button>
    </div>
  );
}
