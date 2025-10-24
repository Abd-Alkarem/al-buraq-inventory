import React from "react";
import { Link, NavLink } from "react-router-dom";

/** Soft frosted panel used across pages */
export function FrostCard({ className="", children }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur shadow-[0_10px_30px_-10px_rgba(2,6,23,.25)] ${className}`}>
      {children}
    </div>
  );
}

/** Primary CTA with glow */
export function GlowingButton({ as="button", to, className="", children, ...rest }) {
  const Cmp = as === "link" ? Link : as === "a" ? "a" : "button";
  return (
    <Cmp
      to={to}
      className={`relative overflow-hidden rounded-xl px-4 py-2 text-sm font-semibold text-white
                  bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500
                  shadow-[0_12px_40px_-12px_rgba(99,102,241,.55)]
                  hover:shadow-[0_18px_50px_-12px_rgba(168,85,247,.6)]
                  active:translate-y-[1px] transition-all ${className}`}
      {...rest}
    >
      <span className="relative z-10">{children}</span>
      <span className="pointer-events-none absolute inset-0 opacity-30 blur-2xl bg-white"></span>
    </Cmp>
  );
}

/** Subtle pill nav link */
export function NavPill({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({isActive}) =>
        `px-3 py-1.5 rounded-lg text-sm transition-all
         ${isActive
           ? "bg-indigo-600/10 text-indigo-600 ring-1 ring-indigo-600/30"
           : "text-blue-600 hover:bg-blue-600/10 hover:text-blue-700"}`
      }
    >
      {children}
    </NavLink>
  );
}

/** Tiny ghost icon button */
export function IconGhost({ title, children, onClick }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="rounded-lg px-2 py-1.5 text-sm text-gray-600 hover:text-indigo-600 hover:bg-indigo-600/10 transition-colors"
    >
      {children}
    </button>
  );
}
