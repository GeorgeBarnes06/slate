"use client";

import { useEffect, useRef, useState } from "react";

type Transform = {
    x: number;
    y: number;
    scale: number;
};

type Card = {
    id: string;
    x: number;
    y: number;
    text: string;
    type: "note";
};

export default function BoardPage() {
    const canvasRef = useRef<HTMLDivElement>(null);
    const transformRef = useRef<Transform>({ x: 0, y: 0, scale: 1 });
    const [transform, setTransform] = useState<Transform>({
        x: 0,
        y: 0,
        scale: 1,
    });

    const isPanning = useRef(false);
    const panStart = useRef({ x: 0, y: 0 });

    const [cards, setCards] = useState<Card[]>([]);
    const mousePos = useRef({ x: 0, y: 0 });

    function applyTransform(t: Transform) {
        transformRef.current = t;
        setTransform({ ...t });
    }

    function screenToWorld(sx: number, sy: number) {
        const t = transformRef.current;
        return {
            x: (sx - t.x) / t.scale,
            y: (sy - t.y) / t.scale,
        };
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
            mousePos.current = { x: e.clientX, y: e.clientY };
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

    useEffect(() => {
        function onPaste(e: ClipboardEvent) {
            e.preventDefault();
            const text = e.clipboardData?.getData("text/plain")?.trim();
            if (!text) return;

            const pos = screenToWorld(mousePos.current.x, mousePos.current.y);

            const card: Card = {
                id: Date.now().toString(),
                type: "note",
                x: pos.x,
                y: pos.y,
                text,
            };

            setCards((prev) => [...prev, card]);
        }

        window.addEventListener("paste", onPaste);
        return () => window.removeEventListener("paste", onPaste);
    }, []);

    return (
        <div
            ref={canvasRef}
            className="w-screen h-screen overflow-hidden relative cursor-grab active:cursor-grabbing bg-white"
        >
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
                {cards.map((card) => (
                    <NoteCard
                        key={card.id}
                        card={card}
                        onChange={(text) =>
                            setCards((prev) =>
                                prev.map((c) =>
                                    c.id === card.id ? { ...c, text } : c
                                )
                            )
                        }
                        onDelete={() =>
                            setCards((prev) =>
                                prev.filter((c) => c.id !== card.id)
                            )
                        }
                    />
                ))}
            </div>

            <div className="fixed bottom-4 left-4 text-xs text-gray-400 bg-white px-2 py-1 rounded-lg border border-gray-200 pointer-events-none">
                {Math.round(transform.scale * 100)}%
            </div>
        </div>
    );
}

function NoteCard({
    card,
    onChange,
    onDelete,
}: {
    card: Card;
    onChange: (text: string) => void;
    onDelete: () => void;
}) {
    return (
        <div
            className="absolute bg-white border border-gray-200 rounded-xl p-3 shadow-sm group"
            style={{ left: card.x, top: card.y, minWidth: 180, maxWidth: 300 }}
        >
            <div className="text-xs text-gray-300 uppercase tracking-wide font-medium mb-1.5">
                note
            </div>
            <div
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => onChange(e.currentTarget.textContent || "")}
                className="text-sm text-gray-800 outline-none leading-relaxed whitespace-pre-wrap break-words min-h-4"
            >
                {card.text}
            </div>
            <button
                onClick={onDelete}
                className="absolute top-2 right-2 text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
            >
                ✕
            </button>
        </div>
    );
}