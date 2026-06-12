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
} | {
    id: string;
    x: number;
    y: number;
    type: "image";
    src: string;
    width: number;
    height: number;
};

export default function BoardPage() {
    const canvasRef = useRef<HTMLDivElement>(null);
    const transformRef = useRef<Transform>({ x: 0, y: 0, scale: 1 });
    const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: 1 });

    const isPanning = useRef(false);
    const panStart = useRef({ x: 0, y: 0 });

    const [cards, setCards] = useState<Card[]>([]);
    const mousePos = useRef({ x: 0, y: 0 });

    const draggingCard = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);

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

            if (draggingCard.current) {
                const { id, offsetX, offsetY } = draggingCard.current;
                const worldPos = screenToWorld(e.clientX, e.clientY);
                setCards((prev) =>
                    prev.map((c) =>
                        c.id === id
                            ? { ...c, x: worldPos.x - offsetX, y: worldPos.y - offsetY }
                            : c
                    )
                );
                return;
            }

            if (!isPanning.current) return;
            applyTransform({
                ...transformRef.current,
                x: e.clientX - panStart.current.x,
                y: e.clientY - panStart.current.y,
            });
        }

        function onMouseUp() {
            draggingCard.current = null;
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
        function onDrop(e: DragEvent) {
            e.preventDefault();
            const file = e.dataTransfer?.files[0];
            if (!file || !file.type.startsWith("image/")) return;

            const reader = new FileReader();
            reader.onload = () => {
                const src = reader.result as string;
                const img = new Image();
                img.onload = () => {
                    const pos = screenToWorld(e.clientX, e.clientY);
                    setCards((prev) => [
                        ...prev,
                        {
                            id: Date.now().toString(),
                            type: "image",
                            x: pos.x,
                            y: pos.y,
                            src,
                            width: img.naturalWidth,
                            height: img.naturalHeight,
                        },
                    ]);
                };
                img.src = src;
            };
            reader.readAsDataURL(file);
        }

        function onDragOver(e: DragEvent) {
            e.preventDefault();
        }

        window.addEventListener("drop", onDrop);
        window.addEventListener("dragover", onDragOver);

        return () => {
            window.removeEventListener("drop", onDrop);
            window.removeEventListener("dragover", onDragOver);
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

            // check for image in clipboard first
            const imageItem = Array.from(e.clipboardData?.items ?? []).find(
                (item) => item.type.startsWith("image/")
            );

            if (imageItem) {
                const file = imageItem.getAsFile();
                if (!file) return;

                const reader = new FileReader();
                reader.onload = () => {
                    const src = reader.result as string;
                    const img = new Image();
                    img.onload = () => {
                        const pos = screenToWorld(mousePos.current.x, mousePos.current.y);
                        setCards((prev) => [
                            ...prev,
                            {
                                id: Date.now().toString(),
                                type: "image",
                                x: pos.x,
                                y: pos.y,
                                src,
                                width: img.naturalWidth,
                                height: img.naturalHeight,
                            },
                        ]);
                    };
                    img.src = src;
                };
                reader.readAsDataURL(file);
                return;
            }

            // fall through to text
            const text = e.clipboardData?.getData("text/plain")?.trim();
            if (!text) return;

            const pos = screenToWorld(mousePos.current.x, mousePos.current.y);
            setCards((prev) => [
                ...prev,
                {
                    id: Date.now().toString(),
                    type: "note",
                    x: pos.x,
                    y: pos.y,
                    text,
                },
            ]);
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
                {cards.map((card) =>
                    card.type === "note" ? (
                        <NoteCard
                            key={card.id}
                            card={card}
                            onChange={(text) =>
                                setCards((prev) =>
                                    prev.map((c) => (c.id === card.id ? { ...c, text } : c))
                                )
                            }
                            onDelete={() =>
                                setCards((prev) => prev.filter((c) => c.id !== card.id))
                            }
                            onPointerDown={(e) => {
                                if ((e.target as HTMLElement).isContentEditable) return;
                                if ((e.target as HTMLElement).tagName === "BUTTON") return;
                                e.stopPropagation();
                                const worldPos = screenToWorld(e.clientX, e.clientY);
                                draggingCard.current = {
                                    id: card.id,
                                    offsetX: worldPos.x - card.x,
                                    offsetY: worldPos.y - card.y,
                                };
                            }}
                        />
                    ) : (
                        <ImageCard
                            key={card.id}
                            card={card}
                            onDelete={() =>
                                setCards((prev) => prev.filter((c) => c.id !== card.id))
                            }
                            onPointerDown={(e) => {
                                if ((e.target as HTMLElement).tagName === "BUTTON") return;
                                e.stopPropagation();
                                const worldPos = screenToWorld(e.clientX, e.clientY);
                                draggingCard.current = {
                                    id: card.id,
                                    offsetX: worldPos.x - card.x,
                                    offsetY: worldPos.y - card.y,
                                };
                            }}
                        />
                    )
                )}
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
    onPointerDown,
}: {
    card: Extract<Card, { type: "note" }>;
    onChange: (text: string) => void;
    onDelete: () => void;
    onPointerDown: (e: React.PointerEvent) => void;
}) {
    return (
        <div
            className="absolute bg-white border border-gray-200 rounded-xl p-3 shadow-sm group cursor-default"
            style={{ left: card.x, top: card.y, minWidth: 180, maxWidth: 300 }}
            onPointerDown={onPointerDown}
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

function ImageCard({
    card,
    onDelete,
    onPointerDown,
}: {
    card: Extract<Card, { type: "image" }>;
    onDelete: () => void;
    onPointerDown: (e: React.PointerEvent) => void;
}) {
    return (
        <div
            className="absolute group cursor-default"
            style={{ left: card.x, top: card.y, width: card.width, height: card.height }}
            onPointerDown={onPointerDown}
        >
            <img
                src={card.src}
                width={card.width}
                height={card.height}
                className="rounded-xl select-none pointer-events-none"
                draggable={false}
            />
            <button
                onClick={onDelete}
                className="absolute top-2 right-2 text-white bg-black/40 hover:bg-red-400 rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
            >
                ✕
            </button>
        </div>
    );
}