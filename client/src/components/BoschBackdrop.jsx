import React from "react";

/**
 * Subtle 3D-ish backdrop inspired by Bosch parts:
 * - Radial gradient + soft grid
 * - A few floating, low-opacity gear silhouettes that rotate slowly
 * - Uses only CSS/SVG; no images, no libs
 *
 * Props:
 *  - opacity: overall intensity (0.03–0.15 looks nice)
 */
export default function BoschBackdrop({ opacity = 0.08 }) {
  return (
    <div aria-hidden className="bb-root">
      <style>{`
        .bb-root {
          position: fixed;
          inset: 0;
          z-index: -1;
          overflow: hidden;
          pointer-events: none;
          background:
            radial-gradient(1200px 600px at 70% 0%, rgba(76,0,255,0.10), transparent 60%),
            radial-gradient(900px 500px at 20% 100%, rgba(0,200,255,0.10), transparent 55%),
            radial-gradient(600px 400px at 0% 20%, rgba(255,60,100,0.10), transparent 60%),
            #0b1020;
        }
        .bb-grid::before {
          content: "";
          position: absolute;
          inset: -200%;
          background-image:
            linear-gradient(rgba(255,255,255,${opacity * 0.05}) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,${opacity * 0.05}) 1px, transparent 1px);
          background-size: 40px 40px;
          transform: perspective(900px) rotateX(60deg) translateY(-20%);
          filter: blur(0.3px);
        }
        @keyframes bb-float {
          0%   { transform: translateY(0px) rotate(0deg);   }
          50%  { transform: translateY(-12px) rotate(3deg); }
          100% { transform: translateY(0px) rotate(0deg);   }
        }
        @keyframes bb-spin {
          from { transform: rotate(0deg);   }
          to   { transform: rotate(360deg); }
        }
        .bb-gear {
          position: absolute;
          opacity: ${Math.min(opacity, 0.12)};
          filter: drop-shadow(0 2px 8px rgba(0,0,0,0.25));
        }
        .bb-gear svg { display:block }
        .bb-gear--slow { animation: bb-spin 40s linear infinite; }
        .bb-gear--float { animation: bb-float 8s ease-in-out infinite; }
      `}</style>

      {/* Soft grid plane */}
      <div className="bb-grid" />

      {/* Floating gears (very subtle) */}
      <Gear className="bb-gear bb-gear--slow"  size={160} x="10%"  y="12%" color="rgba(255,255,255,0.10)" />
      <Gear className="bb-gear bb-gear--float" size={220} x="82%" y="18%" color="rgba(0,255,220,0.10)" />
      <Gear className="bb-gear bb-gear--slow"  size={120} x="78%" y="72%" color="rgba(140,120,255,0.12)" />
      <Gear className="bb-gear bb-gear--float" size={140} x="18%" y="70%" color="rgba(255,120,160,0.10)" />
    </div>
  );
}

function Gear({ size = 180, x = "50%", y = "50%", color = "rgba(255,255,255,0.1)", className = "" }) {
  return (
    <div className={className} style={{ left: x, top: y, transformOrigin: "center" }}>
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        {/* simple gear-like shape */}
        <circle cx="50" cy="50" r="18" stroke={color} strokeWidth="2.5" fill="transparent" />
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i * 30) * Math.PI / 180;
          const x1 = 50 + Math.cos(angle) * 18;
          const y1 = 50 + Math.sin(angle) * 18;
          const x2 = 50 + Math.cos(angle) * 28;
          const y2 = 50 + Math.sin(angle) * 28;
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="2" strokeLinecap="round" />;
        })}
        <circle cx="50" cy="50" r="4" fill={color} />
      </svg>
    </div>
  );
}
