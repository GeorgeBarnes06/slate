"use client";

import { useEffect, useRef, useState } from "react";

type Transform = {
  x: number;
  y: number;
  scale: number;
};

export default function BoardPage() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const transformRef = useRef<Transform>({ x: 0, y: 0, scale: 1 });
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: 1 });

  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });

  function applyTransform(t: Transform) {
    transformRef.current = t;
    setTransform({ ...t });
  }

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (target !== canvasRef.current && target.id !== "world") return;
      isPanning.current = true;
      panStart.current = {
        x: e.clientX - transformRef.current.x,
        y: e.clientY - transformRef.current.y,
      };
    }

    function onMouseMove(e: MouseEvent) {
      if (!isPanning.current) return;
      applyTransform({
        ...transformRef.current,
        x: e.clientX - panStart.current.x,
        y: e.clientY - panStart.current.y,
      });
    }

    function onMouseUp() {
      isPanning.current = false;
    }

    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const rect = el!.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const t = transformRef.current;
      const newScale = Math.min(Math.max(t.scale * delta, 0.1), 5);
      applyTransform({
        x: mx - (mx - t.x) * (newScale / t.scale),
        y: my - (my - t.y) * (newScale / t.scale),
        scale: newScale,
      });
    }

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);
  
return (
  <div
    ref={canvasRef}
    className="w-screen h-screen overflow-hidden relative cursor-grab active:cursor-grabbing bg-white"
  >
    {/* dot grid that moves with the canvas */}
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage: "radial-gradient(circle, #d1d5db 1px, transparent 1px)",
        backgroundSize: `${24 * transform.scale}px ${24 * transform.scale}px`,
        backgroundPosition: `${transform.x % (24 * transform.scale)}px ${transform.y % (24 * transform.scale)}px`,
      }}
    />

    <div
      id="world"
      style={{
        transformOrigin: "0 0",
        transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
      }}
      className="absolute top-0 left-0"
    >
      <div className="absolute top-[-1px] left-[-40px] w-20 h-[2px] bg-gray-200" />
      <div className="absolute top-[-40px] left-[-1px] w-[2px] h-20 bg-gray-200" />
    </div>

    <div className="fixed bottom-4 left-4 text-xs text-gray-400 bg-white px-2 py-1 rounded-lg border border-gray-200 pointer-events-none">
      {Math.round(transform.scale * 100)}%
    </div>
  </div>
);
}