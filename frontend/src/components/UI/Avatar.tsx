"use client";

import React, { useState } from "react";

interface AvatarProps {
  src?: string | null;
  alt: string;
  className?: string; // e.g., "sidebar-avatar", "mini-avatar", "profile-avatar"
  style?: React.CSSProperties;
}

export default function Avatar({ src, alt, className = "mini-avatar", style }: AvatarProps) {
  const [error, setError] = useState(false);

  const trimmedSrc = src?.trim();
  const isUrl = trimmedSrc && (trimmedSrc.startsWith("http") || trimmedSrc.startsWith("/"));
  const initial = (alt || "?").charAt(0).toUpperCase();

  const containerStyle: React.CSSProperties = {
    overflow: "hidden",
    padding: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    ...style
  };

  if (isUrl && !error) {
    return (
      <div className={className} style={containerStyle}>
        <img
          src={trimmedSrc}
          alt={alt}
          onError={() => setError(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
    );
  }

  return <div className={className} style={containerStyle}>{initial}</div>;
}
