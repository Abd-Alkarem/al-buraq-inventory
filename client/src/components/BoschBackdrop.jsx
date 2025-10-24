import React, { useEffect, useRef } from "react";

/** CSS + canvas stars; safe if multiple pages include it */
export default function BoschBackdrop({ opacity = 0.08 }) {
  const ref = useRef(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const ctx = c.getContext("2d");
    let raf = 0;

    function resize() {
      c.width = c.clientWidth * dpr;
      c.height = c.clientHeight * dpr;
    }
    const stars = Array.from({ length: 120 }).map(() => ({
      x: Math.random(), y: Math.random(), r: Math.random() * 1.2 + 0.2, s: Math.random() * 0.4 + 0.1
    }));

    function loop(t) {
      ctx.clearRect(0,0,c.width,c.height);
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.fillStyle = ctx.createLinearGradient(0,0,c.width,c.height);
      ctx.fillStyle.addColorStop(0, "#0b1020");
      ctx.fillStyle.addColorStop(1, "#0f0620");
      ctx.fillRect(0,0,c.width,c.height);

      // faint “gear arcs”
      ctx.strokeStyle = "rgba(99,102,241,.15)";
      ctx.lineWidth = 2*dpr;
      for (let i=0;i<6;i++){
        const R = (i+2) * Math.min(c.width,c.height) * 0.07;
        ctx.beginPath();
        ctx.arc(c.width*0.75, c.height*0.2, R, 0, Math.PI*1.2);
        ctx.stroke();
      }

      // stars
      stars.forEach(s => {
        const x = s.x * c.width;
        const y = (s.y + (t*0.00002)*s.s) % 1 * c.height;
        ctx.beginPath();
        ctx.fillStyle = "white";
        ctx.globalAlpha = opacity + 0.2*Math.sin(t*0.001 + x);
        ctx.arc(x, y, s.r*dpr, 0, Math.PI*2);
        ctx.fill();
      });
      ctx.restore();
      raf = requestAnimationFrame(loop);
    }

    resize();
    const obs = new ResizeObserver(resize);
    obs.observe(c);
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); obs.disconnect(); };
  }, [opacity]);

  return <canvas ref={ref} className="fixed inset-0 -z-10 w-full h-full pointer-events-none"/>;
}
