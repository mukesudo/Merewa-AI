"use client";

import { useEffect, useRef, useState } from "react";

interface AudioPlayerProps {
  url: string;
  autoPlay?: boolean;
  onPlayStateChange?: (isPlaying: boolean) => void;
}

export default function AudioPlayer({
  url,
  autoPlay = false,
  onPlayStateChange,
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const updatePlayState = (playing: boolean) => {
    setIsPlaying(playing);
    onPlayStateChange?.(playing);
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    if (autoPlay) {
      void audio
        .play()
        .then(() => updatePlayState(true))
        .catch(() => updatePlayState(false));
      return;
    }

    audio.pause();
    updatePlayState(false);
  }, [autoPlay]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    if (isPlaying) {
      audio.pause();
      updatePlayState(false);
      return;
    }

    void audio.play();
    updatePlayState(true);
  };

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio || Number.isNaN(audio.duration)) {
      return;
    }

    setCurrentTime(audio.currentTime);
    setProgress((audio.currentTime / audio.duration) * 100);
  };

  const formatTime = (time: number) => {
    if (!time || Number.isNaN(time)) {
      return "0:00";
    }
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className="audio-shell">
      <button className="audio-button" onClick={togglePlay} type="button">
        {isPlaying ? "Pause" : "Play"}
      </button>
      <div className="audio-track" aria-hidden="true">
        <div className="audio-track-fill" style={{ width: `${progress}%` }} />
      </div>
      <span className="audio-time">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>

      <audio
        ref={audioRef}
        src={url}
        onEnded={() => {
          updatePlayState(false);
          setProgress(0);
          setCurrentTime(0);
        }}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
      />
    </div>
  );
}
