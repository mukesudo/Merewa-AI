"use client";

import { useEffect, useRef, useState } from "react";

import { createPost, uploadMedia } from "../../lib/api";
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
        
        try {
          // Upload the actual blob to the server
          const { url: serverMediaUrl } = await uploadMedia(audioBlob);

          const savedPost = await createPost({
            type: "audio",
            content: "New voice note", // Defaults for now
            media_url: serverMediaUrl,
            language: "am",
            origin: "human",
          });
          
          addPost(savedPost);
        } catch (error) {
          console.error("Failed to upload or create post:", error);
          // Fallback UI experience or local-only preview if desired
          // For now, we just fail gracefully with a log
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
