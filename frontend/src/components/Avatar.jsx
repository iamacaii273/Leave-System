/**
 * Avatar — Universal avatar component.
 * Shows profile photo if available, otherwise renders initials fallback.
 *
 * Props:
 *  src      — image URL (e.g. profile_photo from DB)
 *  name     — full name used to generate initials fallback
 *  size     — pixel size (default 40)
 *  radius   — border-radius in px (default size/2 for circle, or pass a string like "12px")
 *  className — additional CSS classes
 *  style    — inline styles merged with defaults
 */
import { useState } from "react"

export default function Avatar({ src, name = "", size = 40, radius, className = "", style = {} }) {
  const [hasError, setHasError] = useState(false)
  const r = radius !== undefined ? radius : `${Math.round(size / 2)}px`

  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("")

  const fontSize = Math.max(10, Math.round(size * 0.38))

  const fallback = (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        minWidth: size,
        borderRadius: r,
        backgroundColor: "#d9ecf7",
        color: "#2a617f",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize,
        fontFamily: "Fredoka, sans-serif",
        flexShrink: 0,
        ...style,
      }}
    >
      {initials || "?"}
    </div>
  )

  if (src && !hasError) {
    return (
      <img
        src={src}
        alt={name || "Avatar"}
        className={className}
        style={{
          width: size,
          height: size,
          minWidth: size,
          borderRadius: r,
          objectFit: "cover",
          display: "block",
          flexShrink: 0,
          ...style,
        }}
        onError={() => setHasError(true)}
      />
    )
  }

  return fallback
}
