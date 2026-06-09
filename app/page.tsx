"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Board = {
  id: string;
  name: string;
  createdAt: number;
};

export default function Home() {
  const router = useRouter();
  const [boards, setBoards] = useState<Board[]>([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("slate_boards");
    if (saved) setBoards(JSON.parse(saved));
  }, []);

  function saveBoards(updated: Board[]) {
    setBoards(updated);
    localStorage.setItem("slate_boards", JSON.stringify(updated));
  }

  function createBoard() {
    if (!newName.trim()) return;
    const board: Board = {
      id: Date.now().toString(),
      name: newName.trim(),
      createdAt: Date.now(),
    };
    saveBoards([...boards, board]);
    setNewName("");
    setCreating(false);
    router.push(`/board/${board.id}`);
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <div className="mb-12">
        <h1 className="text-3xl font-medium text-gray-900 mb-2">Slate</h1>
        <p className="text-gray-500">Your personal knowledge canvas</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {boards.map((board) => (
          <button
            key={board.id}
            onClick={() => router.push(`/board/${board.id}`)}
            className="text-left p-5 rounded-xl border border-gray-200 hover:border-gray-400 transition-colors bg-white"
          >
            <div className="text-2xl mb-3">🗂</div>
            <div className="font-medium text-gray-900 text-sm">{board.name}</div>
            <div className="text-xs text-gray-400 mt-1">
              {new Date(board.createdAt).toLocaleDateString()}
            </div>
          </button>
        ))}

        {creating ? (
          <div className="p-5 rounded-xl border border-gray-400 bg-white">
            <input
              autoFocus
              type="text"
              placeholder="Board name..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") createBoard();
                if (e.key === "Escape") setCreating(false);
              }}
              className="w-full text-sm outline-none text-gray-900 placeholder-gray-400"
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={createBoard}
                className="text-xs px-3 py-1 bg-gray-900 text-white rounded-lg"
              >
                create
              </button>
              <button
                onClick={() => setCreating(false)}
                className="text-xs px-3 py-1 text-gray-500"
              >
                cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="text-left p-5 rounded-xl border border-dashed border-gray-300 hover:border-gray-400 transition-colors text-gray-400 hover:text-gray-600"
          >
            <div className="text-2xl mb-3">+</div>
            <div className="text-sm">new board</div>
          </button>
        )}
      </div>
    </main>
  );
}