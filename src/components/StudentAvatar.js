"use client";

import React, { useState } from "react";

/**
 * Clean, minimalist Instagram-style default avatar silhouette.
 * 100% gender-neutral, universally recognizable, zero boy/girl features.
 */
function InstagramSilhouette({ className = "" }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", height: "100%", display: "block" }}
      className={className}
      aria-hidden="true"
    >
      {/* Outer base */}
      <circle cx="50" cy="50" r="50" fill="#140d12" />
      {/* Minimalist Head */}
      <circle cx="50" cy="38" r="17.5" fill="#8e8e93" />
      {/* Minimalist Torso / Shoulders */}
      <path
        d="M17.5 88 C18 69, 32.5 60, 50 60 C67.5 60, 82 69, 82.5 88 C73.5 95.5, 62.5 99, 50 99 C37.5 99, 26.5 95.5, 17.5 88 Z"
        fill="#8e8e93"
      />
    </svg>
  );
}

/**
 * Gender-neutral student avatar.
 * Displays the user's uploaded photo if available;
 * otherwise displays the Instagram-style minimalist silhouette.
 */
export default function StudentAvatar({ name = "Student", photo = "", size = 72, className = "" }) {
  const [imgError, setImgError] = useState(false);

  // Filter out empty or college logo fallback
  const isLogo = typeof photo === "string" && (photo.toLowerCase().includes("logo") || photo.toLowerCase().includes("svit-logo"));
  const hasValidPhoto = photo && !isLogo && !imgError;

  const displaySrc = hasValidPhoto
    ? (photo.startsWith("data:") ? photo : `data:image/jpeg;base64,${photo}`)
    : null;

  return (
    <div
      className={`student-avatar-container ${className}`}
      style={{
        width: "100%",
        height: "100%",
        borderRadius: "50%",
        overflow: "hidden",
        position: "relative",
        background: "#140d12",
        display: "grid",
        placeItems: "center",
      }}
    >
      {hasValidPhoto ? (
        <img
          src={displaySrc}
          alt={name}
          className="student-avatar-img"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
          onError={() => setImgError(true)}
        />
      ) : (
        <InstagramSilhouette />
      )}
    </div>
  );
}
