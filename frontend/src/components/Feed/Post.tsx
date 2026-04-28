"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Heart, MessageCircleMore, Share2, Trash2, X } from "lucide-react";
import { useI18n } from "../../lib/i18n";

import { createComment, deletePost, sharePost, toggleLike, uploadMedia } from "../../lib/api";
import useStore from "../../store/useStore";
import type { Comment, Post as PostModel } from "../../types/api";

import AudioPlayer from "../Player/AudioPlayer";
import Avatar from "../UI/Avatar";

interface PostProps {
  post: PostModel;
}

export default function Post({ post }: PostProps) {
  const { t } = useI18n();
  const currentUser = useStore((state) => state.currentUser);

  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.like_count);
  const [sharesCount, setSharesCount] = useState(post.share_count ?? 0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>(post.comments || []);
  const [isInView, setIsInView] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [isRecordingComment, setIsRecordingComment] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentStatus, setCommentStatus] = useState<string | null>(null);
  const [isPlaybackActive, setIsPlaybackActive] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const postRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = postRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => setIsInView(entry.isIntersecting));
      },
      { threshold: 0.7 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const handleLike = async () => {
    if (!currentUser) return;
    setLiked((value) => !value);
    setLikesCount((value) => (liked ? Math.max(0, value - 1) : value + 1));

    try {
      const result = await toggleLike(post.id);
      setLiked(result.liked);
      setLikesCount(result.like_count);
    } catch {
      setLiked((value) => !value);
      setLikesCount((value) => (liked ? value + 1 : Math.max(0, value - 1)));
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this post?")) return;
    try {
      await deletePost(post.id);
      setIsDeleted(true);
    } catch {
      alert("Failed to delete post");
    }
  };

  const handleCommentSubmit = async (audioBlob: Blob) => {
    const payload = {
      content: "Voice comment",
      media_url: "",
      type: "voice",
      language: "am",
      auto_reply: true,
    };

    setIsSubmittingComment(true);
    setCommentStatus("Uploading your voice comment...");

    try {
      const { url } = await uploadMedia(audioBlob);
      payload.media_url = url;
      const response = await createComment(post.id, payload);
      setComments((v) => [...v, response.comment]);
      setCommentStatus("Voice comment posted.");
    } catch {
      setCommentStatus("Could not post the voice comment. Please try again.");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const startVoiceComment = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        setIsRecordingComment(false);
        await handleCommentSubmit(blob);
      };
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecordingComment(true);
    } catch {
      alert("Microphone access is required.");
    }
  };

  const stopVoiceComment = () => { if (mediaRecorder) mediaRecorder.stop(); };
  
  const handleShare = async () => {
    const url = `${window.location.origin}/profile/${post.author}`;
    const text = `Check out this voice post by @${post.author} on Merewa!`;

    setSharesCount((v) => v + 1);
    sharePost(post.id)
      .then((res) => setSharesCount(res.share_count))
      .catch(() => setSharesCount((v) => Math.max(0, v - 1)));

    if (navigator.share) {
      try {
        await navigator.share({ title: "Merewa Post", text, url });
        return;
      } catch {
        // user cancelled or unsupported → fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      alert("Link copied to clipboard!");
    } catch {
      // ignore
    }
  };

  if (isDeleted) return null;

  return (
    <article ref={postRef} className="post-card">
      <div className={`post-layout ${isPlaybackActive && isInView ? "is-playing" : ""}`}>
        <div className="visualizer-aura">
          {isPlaybackActive && isInView && [...Array(3)].map((_, i) => (
            <div key={i} className="aura-ripple" style={{ animationDelay: `${i * 0.6}s` }} />
          ))}
          <Link href={`/profile/${post.author}`} className="profile-link">
            <Avatar 
                src={post.author_avatar_url}
                alt={post.author}
                className="avatar-badge post-author-avatar"
            />
          </Link>
        </div>

        <div className="tiktok-meta">
          {currentUser && currentUser.user.id === post.author_id && (
            <button 
              onClick={handleDelete}
              className="btn btn-ghost post-delete-button"
              type="button"
              title={t("delete_post")}
            >
              <Trash2 size={18} />
            </button>
          )}
          <Link href={`/profile/${post.author}`}>
            <strong className="post-author-name">@{post.author}</strong>
          </Link>
          {post.type !== "audio" && <p className="post-body-text">{post.content}</p>}
        </div>

        {post.type === "audio" && post.media_url ? (
          <AudioPlayer 
            url={post.media_url} 
            autoPlay={isInView} 
            onPlayStateChange={setIsPlaybackActive}
          />
        ) : null}

        <div className="tiktok-actions-rail">
          <button className={`tiktok-action ${liked ? "active" : ""}`} onClick={handleLike} type="button">
            <div className="action-icon-bg glass-panel">
              <Heart size={24} fill={liked ? "currentColor" : "none"} />
            </div>
            <span>{likesCount}</span>
          </button>

          <button
            className={`tiktok-action ${showComments ? "active" : ""}`}
            onClick={() => setShowComments(!showComments)}
            type="button"
          >
            <div className="action-icon-bg glass-panel">
              <MessageCircleMore size={24} />
            </div>
            <span>{comments.length}</span>
          </button>

          <button className="tiktok-action" onClick={handleShare} type="button">
            <div className="action-icon-bg glass-panel">
              <Share2 size={24} />
            </div>
            <span>{sharesCount > 0 ? sharesCount : t("share")}</span>
          </button>
        </div>
      </div>

      {showComments && (
        <section className="comments-panel glass-panel">
          <div className="comments-panel-header">
            <h3>{t("conversations")}</h3>
            <button 
                className="btn btn-ghost btn-circle" 
                onClick={() => setShowComments(false)}
                type="button"
            >
                <X size={20} />
            </button>
          </div>
          <div className="comments-list">
            {comments.length ? comments.map((c) => (
              <div key={c.id} className="comment-list-item">
                <strong className="comment-author">@{c.author}</strong>
                {c.media_url ? <AudioPlayer url={c.media_url} /> : <p>{c.content}</p>}
              </div>
            )) : <p className="muted-text">{t("no_comments")}</p>}
          </div>

          {commentStatus ? <p className="muted-text comment-status">{commentStatus}</p> : null}

          <div className="comment-input-zone">
            <button 
              className={`btn ${isRecordingComment ? "btn-primary" : ""}`}
              onClick={isRecordingComment ? stopVoiceComment : startVoiceComment}
              type="button"
              disabled={isSubmittingComment}
            >
              {isSubmittingComment
                ? t("generating")
                : isRecordingComment
                  ? t("stop")
                  : t("record_voice_comment")}
            </button>
          </div>
        </section>
      )}
    </article>
  );
}
