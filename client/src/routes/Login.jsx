// client/src/routes/Login.jsx
import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../state/auth.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  // --- 3D tilt card ---
  const cardRef = useRef(null);
  function handleMouseMove(e) {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;              // x position within the element.
    const y = e.clientY - rect.top;               // y position within the element.
    const midX = rect.width / 2;
    const midY = rect.height / 2;
    const rotateY = ((x - midX) / midX) * 8;      // -8deg to 8deg
    const rotateX = -((y - midY) / midY) * 8;
    card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(0)`;
  }
  function handleMouseLeave() {
    const card = cardRef.current;
    if (!card) return;
    card.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg) translateZ(0)";
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await login(username.trim(), password);
      navigate("/dashboard", { replace: true });
    } catch (e) {
      setErr(String(e?.message || "Login failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-950 text-white">
      {/* Animated gradient background */}
      <div className="absolute inset-0">
        <div className="absolute -top-1/2 -left-1/3 w-[120vw] h-[120vw] bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.35),transparent_60%)] animate-slow-pulse" />
        <div className="absolute -bottom-1/2 -right-1/3 w-[120vw] h-[120vw] bg-[radial-gradient(circle_at_center,rgba(236,72,153,0.28),transparent_60%)] animate-slow-pulse2" />
      </div>

      {/* Floating particles */}
      <div className="pointer-events-none absolute inset-0">
        {Array.from({ length: 18 }).map((_, i) => (
          <span
            key={i}
            className="absolute block h-1 w-1 rounded-full bg-white/40"
            style={{
              left: `${(i * 53) % 100}%`,
              animation: `rise ${18 + (i % 6)}s linear ${i * 0.7}s infinite`,
              top: `${(i * 31) % 100}%`,
              filter: "blur(0.5px)",
            }}
          />
        ))}
      </div>

      {/* Center content */}
      <div className="relative z-10 grid min-h-screen place-items-center px-4">
        <div
          ref={cardRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl transition-transform duration-300 will-change-transform"
        >
          {/* Logo + tiny rotating cube */}
          <div className="mb-6 flex items-center gap-3">
            <div className="h-10 w-10 grid place-items-center rounded-xl bg-rose-600 shadow-lg shadow-rose-500/30 font-bold">
              AB
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Al Buraq — Admin</h1>
              <p className="text-xs text-white/60">Manage stock</p>
            </div>
            <div className="ml-auto">
              <div className="cube">
                <div className="face front" />
                <div className="face back" />
                <div className="face right" />
                <div className="face left" />
                <div className="face top" />
                <div className="face bottom" />
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={onSubmit} className="space-y-4">
            {!!err && (
              <div className="rounded-xl border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {err}
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm text-white/70">Username</label>
              <input
                className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 outline-none ring-0 transition focus:border-indigo-400/60 focus:bg-white/15"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-white/70">Password</label>
              <input
                type="password"
                className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 outline-none ring-0 transition focus:border-indigo-400/60 focus:bg-white/15"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group relative w-full overflow-hidden rounded-xl bg-indigo-600 px-4 py-2.5 font-medium shadow-lg shadow-indigo-600/30 transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="relative z-10">{loading ? "Signing in…" : "Sign in"}</span>
              {/* sheen */}
              <span className="absolute inset-0 -translate-x-full bg-[linear-gradient(120deg,transparent,rgba(255,255,255,.35),transparent)] transition group-hover:translate-x-full" />
            </button>
          </form>

          {/* Footer */}
          <div className="mt-5 flex items-center justify-between text-xs text-white/50">
            <span className="select-none">© {new Date().getFullYear()} Al Buraq</span>
            <a className="underline decoration-dotted hover:text-white/80" href="/">Public view</a>
          </div>
        </div>
      </div>

      {/* Local component styles (keyframes & cube) */}
      <style>{`
        @keyframes slowPulse {
          0%, 100% { transform: scale(1); opacity: .8 }
          50% { transform: scale(1.06); opacity: 1 }
        }
        .animate-slow-pulse { animation: slowPulse 14s ease-in-out infinite; }
        .animate-slow-pulse2 { animation: slowPulse 18s ease-in-out infinite; }

        @keyframes rise {
          0% { transform: translateY(0); opacity: .15 }
          92% { opacity: .45 }
          100% { transform: translateY(-120vh); opacity: 0 }
        }

        /* Tiny rotating cube (3D) */
        .cube {
          position: relative;
          width: 28px; height: 28px;
          transform-style: preserve-3d;
          animation: spin 8s linear infinite;
          filter: drop-shadow(0 4px 10px rgba(0,0,0,.35));
        }
        .cube .face {
          position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(99,102,241,.85), rgba(236,72,153,.85));
          border: 1px solid rgba(255,255,255,.25);
          border-radius: 6px;
        }
        .cube .front  { transform: translateZ(14px); }
        .cube .back   { transform: rotateY(180deg) translateZ(14px); }
        .cube .right  { transform: rotateY(90deg) translateZ(14px); }
        .cube .left   { transform: rotateY(-90deg) translateZ(14px); }
        .cube .top    { transform: rotateX(90deg) translateZ(14px); }
        .cube .bottom { transform: rotateX(-90deg) translateZ(14px); }
        @keyframes spin {
          from { transform: rotateX(0deg) rotateY(0deg) rotateZ(0deg); }
          to   { transform: rotateX(360deg) rotateY(360deg) rotateZ(360deg); }
        }
      `}</style>
    </div>
  );
}
