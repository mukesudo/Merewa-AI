"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, MessageCircleMore, UserRound, Trash2 } from "lucide-react";

import { createComment, toggleFollow, toggleLike, deletePost } from "../../lib/api";
import useStore from "../../store/useStore";
import type { Comment, Post as PostModel } from "../../types/api";

import AudioPlayer from "../Player/AudioPlayer";
import Avatar from "../UI/Avatar";

interface PostProps {
  post: PostModel;
}

export default function Post({ post }: PostProps) {
  const currentUser = useStore((state) => state.currentUser);

  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.like_count);
  const [showComments, setShowComments] = useState(false);
  const [commentMode, setCommentMode] = useState<"text" | "voice">("text");
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState<Comment[]>(post.comments || []);
  const [following, setFollowing] = useState(post.viewer_follows_author);
  const [isInView, setIsInView] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [isRecordingComment, setIsRecordingComment] = useState(false);
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

  const handleFollow = async () => {
    if (!currentUser || post.author_id === currentUser.user.id) return;
    const previous = following;
    setFollowing(!previous);
    try {
      const result = await toggleFollow(post.author);
      setFollowing(result.following);
    } catch {
      setFollowing(previous);
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

  const handleCommentSubmit = async (customUrl?: string | null) => {
    if (commentMode === "text" && !commentText.trim()) return;

    const payload = {
      content: customUrl ? "Voice comment" : commentText,
      media_url: customUrl,
      type: customUrl ? "voice" : "text",
      language: "am",
      auto_reply: true,
    };

    try {
      const response = await createComment(post.id, payload);
      setComments((v) => [...v, response.comment]);
      setCommentText("");
    } catch {
      const fallback: Comment = {
        id: Date.now(),
        type: payload.type as any,
        content: payload.content,
        media_url: customUrl ?? undefined,
        author: currentUser?.user.username ?? "you",
        author_id: currentUser?.user.id ?? 0,
        language: "am",
      };
      setComments((v) => [...v, fallback]);
      setCommentText("");
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
        const url = URL.createObjectURL(blob);
        stream.getTracks().forEach((t) => t.stop());
        setIsRecordingComment(false);
        await handleCommentSubmit(url);
      };
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecordingComment(true);
    } catch {
      alert("Microphone access is required.");
    }
  };

  const stopVoiceComment = () => { if (mediaRecorder) mediaRecorder.stop(); };

  if (isDeleted) return null;

  return (
    <article ref={postRef as any} className="post-card">
      <div className={`post-layout ${isPlaybackActive ? "is-playing" : ""}`}>
        <div className="visualizer-aura">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="aura-ripple" style={{ animationDelay: `${i * 0.6}s` }} />
          ))}
          <Link href={`/profile/${post.author}`} className="profile-link">
            <Avatar 
                src={post.author_avatar_url} 
                alt={post.author} 
                className="avatar-badge" 
                style={{ width: '160px', height: '160px', fontSize: '3rem' }}
            />
          </Link>
        </div>

        <div className="tiktok-meta" style={{ textAlign: 'center', position: 'relative' }}>
          {currentUser && currentUser.user.id === post.author_id && (
            <button 
              onClick={handleDelete}
              className="btn btn-ghost" 
              style={{ position: 'absolute', right: '0', top: '0', padding: '0.5rem', color: 'var(--accent-red)' }}
              title="Delete Post"
            >
              <Trash2 size={18} />
            </button>
          )}
          <Link href={`/profile/${post.author}`}>
            <strong style={{ fontSize: '1.05rem', letterSpacing: '-0.01em' }}>@{post.author}</strong>
          </Link>
          <p className="post-body-text" style={{ marginTop: '0.4rem', opacity: 0.8, fontSize: '0.9rem' }}>{post.content}</p>
        </div>

        {post.type === "audio" && post.media_url ? (
          <AudioPlayer 
            url={post.media_url} 
            autoPlay={isInView} 
            onPlayStateChange={setIsPlaybackActive}
          />
        ) : null}

        <div className="tiktok-actions-rail">
          <button className={`tiktok-action ${liked ? "active" : ""}`} onClick={handleLike}>
            <div className="action-icon-bg glass-panel" style={{ padding: '0.8rem', borderRadius: '50%' }}>
              <ArrowUpRight size={24} />
            </div>
            <span>{likesCount}</span>
          </button>
          
          <button className={`tiktok-action ${showComments ? "active" : ""}`} onClick={() => setShowComments(!showComments)}>
            <div className="action-icon-bg glass-panel" style={{ padding: '0.8rem', borderRadius: '50%' }}>
              <MessageCircleMore size={24} />
            </div>
            <span>{comments.length}</span>
          </button>
        </div>
      </div>

      {showComments && (
        <section className="comments-panel glass-panel" style={{ marginTop: '2rem', width: '100%', maxWidth: '440px', padding: '1.5rem', borderRadius: '1.5rem' }}>
          <div className="comments-list" style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '1rem' }}>
            {comments.length ? comments.map((c) => (
              <div key={c.id} style={{ marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--line)' }}>
                <strong>@{c.author}</strong>
                {c.media_url ? <AudioPlayer url={c.media_url} /> : <p>{c.content}</p>}
              </div>
            )) : <p className="muted-text">No comments yet.</p>}
          </div>

          <div className="comment-input-zone">
            {commentMode === "text" ? (
              <div className="stack-inline">
                <input 
                  className="creator-input" 
                  style={{ minHeight: '40px', margin: 0 }}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Amharic or English..."
                />
                <button className="btn btn-primary" onClick={() => void handleCommentSubmit()}>Send</button>
              </div>
            ) : (
                <button className={`btn ${isRecordingComment ? "btn-primary" : ""}`} onClick={isRecordingComment ? stopVoiceComment : startVoiceComment}>
                    {isRecordingComment ? "Stop & Post" : "Record voice comment"}
                </button>
            )}
            <div className="stack-inline" style={{ marginTop: '0.5rem' }}>
                 <button className="btn btn-ghost" onClick={() => setCommentMode(commentMode === "text" ? "voice" : "text")}>
                    Switch to {commentMode === "text" ? "Voice" : "Text"}
                 </button>
            </div>
          </div>
        </section>
      )}
    </article>
  );
}
