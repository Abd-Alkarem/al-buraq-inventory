import React from "react";

/**
 * Lightweight page transition wrapper.
 * - Fades & slides content in
 * - Adds a soft "lift" on mount
 * No external libs; pure CSS keyframes below.
 */
export default function AnimatedPage({ children, className = "" }) {
  return (
    <div className={`ap-container ${className}`}>
      <style>{`
        @keyframes ap-fade {
          from { opacity: 0; transform: translateY(10px) scale(0.99); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
        .ap-container {
          animation: ap-fade 480ms cubic-bezier(.22,.9,.27,1) both;
          will-change: transform, opacity;
        }
      `}</style>
      {children}
    </div>
  );
}
