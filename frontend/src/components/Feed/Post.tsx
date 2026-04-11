"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, MessageCircleMore, UserRound } from "lucide-react";

import { createComment, toggleFollow, toggleLike } from "../../lib/api";
import useStore from "../../store/useStore";
import type { Comment, Post as PostModel } from "../../types/api";

import AudioPlayer from "../Player/AudioPlayer";

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
  const postRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = postRef.current;
    if (!node) {
      return;
    }

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
    if (!currentUser) {
      return;
    }
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
    if (!currentUser || post.author_id === currentUser.user.id) {
      return;
    }

    const previous = following;
    setFollowing(!previous);
    try {
      const result = await toggleFollow(post.author);
      setFollowing(result.following);
    } catch {
      setFollowing(previous);
    }
  };

  const handleCommentSubmit = async (customUrl?: string | null) => {
    if (commentMode === "text" && !commentText.trim()) {
      return;
    }

    const payload = {
      content: customUrl ? "Voice comment" : commentText,
      media_url: customUrl,
      type: customUrl ? "voice" : "text",
      language: "am",
      auto_reply: true,
    };

    try {
      const response = await createComment(post.id, payload);
      const nextComments = [...comments, response.comment];
      if (response.ai_reply) {
        nextComments.push(response.ai_reply);
      }
      setComments(nextComments);
      setCommentText("");
      return;
    } catch {
      const fallbackComment: Comment = {
        id: Date.now(),
        type: payload.type,
        content: payload.content,
        media_url: customUrl,
        author: currentUser?.user.username ?? "you",
        author_id: currentUser?.user.id ?? 0,
        language: "am",
      };
      setComments((value) => [...value, fallbackComment]);
      setCommentText("");
    }
  };

  const startVoiceComment = async () => {
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
        stream.getTracks().forEach((track) => track.stop());
        setIsRecordingComment(false);
        await handleCommentSubmit(audioUrl);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecordingComment(true);
    } catch {
      window.alert("Microphone access is required for voice comments.");
    }
  };

  const stopVoiceComment = () => {
    if (!mediaRecorder) {
      return;
    }
    mediaRecorder.stop();
  };

  const createdLabel = post.created_at
    ? new Date(post.created_at).toLocaleString()
    : "Just now";
  const avatar = post.author_avatar_url?.trim() || post.author.slice(0, 1).toUpperCase();
  const isSelf = currentUser?.user.id === post.author_id;

  return (
    <article ref={postRef} className="post-frame">
      <div className="post-card glass-panel">
        <div className="post-layout">
          <aside className="post-rail">
            <Link href={`/profile/${post.author}`} className="avatar-badge profile-link">
              {avatar}
            </Link>
            <div className="post-rail-nav">
              <Link href={`/profile/${post.author}`} className="rail-action">
                <UserRound size={16} />
              </Link>
              <button
                className="rail-action"
                type="button"
                onClick={() => setShowComments((value) => !value)}
              >
                <MessageCircleMore size={16} />
              </button>
              <Link href={`/profile/${post.author}`} className="rail-action">
                <ArrowUpRight size={16} />
              </Link>
            </div>
          </aside>

          <div className="post-main">
            <div className="post-topbar">
              <div>
                <div className="author-line">
                  <strong>@{post.author}</strong>
                  {post.author_is_ai ? <span className="chip">AI</span> : <span className="chip">Human</span>}
                  <span className="chip muted">{post.language.toUpperCase()}</span>
                </div>
                <p className="muted-text">
                  {post.author_display_name ?? post.author} · {createdLabel}
                </p>
              </div>
              {!isSelf ? (
                <button className={`btn ${following ? "btn-primary" : ""}`} onClick={handleFollow} type="button">
                  {following ? "Following" : "Follow"}
                </button>
              ) : null}
            </div>

            <div className="post-body">
              <h3>{post.content}</h3>
              {post.persona_key ? (
                <p className="persona-note">Persona: {post.persona_key.replaceAll("_", " ")}</p>
              ) : null}
            </div>

            {post.type === "audio" && post.media_url ? (
              <AudioPlayer url={post.media_url} autoPlay={isInView} />
            ) : null}

            <div className="post-actions">
              <button className={`btn ${liked ? "btn-primary" : ""}`} onClick={handleLike} type="button">
                Like {likesCount}
              </button>
              <button className={`btn ${showComments ? "btn-primary" : ""}`} onClick={() => setShowComments((value) => !value)} type="button">
                Comment {comments.length}
              </button>
              <Link className="btn" href={`/profile/${post.author}`}>
                Visit profile
              </Link>
              <span className="score-pill">Rank {post.engagement_score.toFixed(2)}</span>
            </div>

            {showComments ? (
              <section className="comments-panel">
                <div className="comments-list">
                  {comments.length ? (
                    comments.map((comment) => (
                      <div key={comment.id} className="comment-card">
                        <span className="comment-author">@{comment.author}</span>
                        {comment.media_url ? (
                          <AudioPlayer url={comment.media_url} />
                        ) : (
                          <p>{comment.content}</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="muted-text">No comments yet.</p>
                  )}
                </div>

                <div className="comment-tabs">
                  <button
                    className={`btn ${commentMode === "text" ? "btn-primary" : ""}`}
                    onClick={() => setCommentMode("text")}
                    type="button"
                  >
                    Text
                  </button>
                  <button
                    className={`btn ${commentMode === "voice" ? "btn-primary" : ""}`}
                    onClick={() => setCommentMode("voice")}
                    type="button"
                  >
                    Voice
                  </button>
                </div>

                {commentMode === "text" ? (
                  <form
                    className="comment-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void handleCommentSubmit();
                    }}
                  >
                    <input
                      type="text"
                      value={commentText}
                      onChange={(event) => setCommentText(event.target.value)}
                      placeholder="Add a comment..."
                    />
                    <button className="btn btn-primary" type="submit">
                      Post
                    </button>
                  </form>
                ) : (
                  <button
                    className={`btn ${isRecordingComment ? "btn-primary" : ""}`}
                    onClick={isRecordingComment ? stopVoiceComment : startVoiceComment}
                    type="button"
                  >
                    {isRecordingComment ? "Stop and post" : "Record voice comment"}
                  </button>
                )}
              </section>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
