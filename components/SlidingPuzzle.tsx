"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  /** Optional initial image URL. You can also upload at runtime. */
  imageSrc?: string;
  /** Grid size (e.g., 3, 4, 5). Default 3 */
  size?: number;
};

type GameState = {
  tiles: number[]; // flattened board, 0 = empty
  size: number;
  moves: number;
  startedAt?: number;
  finishedAt?: number;
};

function createSolved(size: number) {
  const total = size * size;
  return [...Array(total - 1).keys()].map((n) => n + 1).concat(0);
}

function indexToRC(index: number, size: number) {
  return { r: Math.floor(index / size), c: index % size };
}

function rcToIndex(r: number, c: number, size: number) {
  return r * size + c;
}

function neighborsOf(emptyIndex: number, size: number) {
  const { r, c } = indexToRC(emptyIndex, size);
  const list: number[] = [];
  if (r > 0) list.push(rcToIndex(r - 1, c, size));
  if (r < size - 1) list.push(rcToIndex(r + 1, c, size));
  if (c > 0) list.push(rcToIndex(r, c - 1, size));
  if (c < size - 1) list.push(rcToIndex(r, c + 1, size));
  return list;
}

/** Shuffle by making a long random walk from the solved state (guaranteed solvable). */
function shuffleSolvable(size: number, steps = 300) {
  const tiles = createSolved(size);
  let empty = tiles.indexOf(0);

  for (let i = 0; i < steps; i++) {
    const adj = neighborsOf(empty, size);
    const choice = adj[Math.floor(Math.random() * adj.length)];
    // swap chosen with empty
    [tiles[choice], tiles[empty]] = [tiles[empty], tiles[choice]];
    empty = choice;
  }
  // avoid accidentally landing on solved
  if (isSolved(tiles)) {
    // do one more legal move
    const adj = neighborsOf(empty, size);
    const choice = adj[0];
    [tiles[choice], tiles[empty]] = [tiles[empty], tiles[choice]];
  }
  return tiles;
}

function isSolved(tiles: number[]) {
  for (let i = 0; i < tiles.length - 1; i++) {
    if (tiles[i] !== i + 1) return false;
  }
  return tiles[tiles.length - 1] === 0;
}

export default function SlidingPuzzle({
  imageSrc,
  size: defaultSize = 3,
}: Props) {
  const [img, setImg] = useState<string | undefined>(imageSrc);
  const [gridSize, setGridSize] = useState<number>(defaultSize);
  const [game, setGame] = useState<GameState>(() => ({
    tiles: shuffleSolvable(defaultSize),
    size: defaultSize,
    moves: 0,
  }));
  const [showNumbers, setShowNumbers] = useState(false);
  const timerRef = useRef<number | undefined>(undefined);
  const [, redraw] = useState(0);

  // Timer repaint
  useEffect(() => {
    timerRef.current = window.setInterval(() => redraw((x) => x + 1), 250);
    return () => clearInterval(timerRef.current);
  }, []);

  // New game whenever size changes
  useEffect(() => {
    setGame({
      tiles: shuffleSolvable(gridSize),
      size: gridSize,
      moves: 0,
      startedAt: undefined,
      finishedAt: undefined,
    });
  }, [gridSize]);

  const seconds = useMemo(() => {
    if (!game.startedAt) return 0;
    const end = game.finishedAt ?? Date.now();
    return Math.floor((end - game.startedAt) / 1000);
  }, []);

  function onTileClick(index: number) {
    if (game.finishedAt) return;
    const empty = game.tiles.indexOf(0);
    const adj = neighborsOf(empty, game.size);
    if (!adj.includes(index)) return;

    const next = [...game.tiles];
    [next[index], next[empty]] = [next[empty], next[index]];

    const startedAt = game.startedAt ?? Date.now();
    const moves = game.moves + 1;
    const finishedAt = isSolved(next) ? Date.now() : undefined;

    setGame((g) => ({
      ...g,
      tiles: next,
      moves,
      startedAt,
      finishedAt,
    }));
  }

  function onShuffle() {
    setGame({
      tiles: shuffleSolvable(game.size),
      size: game.size,
      moves: 0,
      startedAt: undefined,
      finishedAt: undefined,
    });
  }

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImg(String(reader.result));
    reader.readAsDataURL(file);
  }

  const sidePx = 360; // puzzle board pixel size (responsive wrapper handles scaling)
  // removed unused variable tileCount

  return (
    <div className="w-full max-w-xl mx-auto p-4">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <label className="text-sm font-medium">Grid:</label>
        <select
          className="rounded-md border px-2 py-1"
          value={gridSize}
          onChange={(e) => setGridSize(parseInt(e.target.value, 10))}
        >
          {[3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n} × {n}
            </option>
          ))}
        </select>

        <button
          onClick={onShuffle}
          className="ml-2 rounded-xl border px-3 py-1 text-sm shadow-sm hover:bg-gray-50"
        >
          New Game / Shuffle
        </button>

        <label className="ml-2 text-sm inline-flex items-center gap-1">
          <input
            type="checkbox"
            checked={showNumbers}
            onChange={(e) => setShowNumbers(e.target.checked)}
          />
          Show tile numbers
        </label>

        <label className="ml-auto text-sm">
          <span className="mr-2 inline-block">Upload photo</span>
          <input
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
            id="upload-input"
          />
          <button
            onClick={() => document.getElementById("upload-input")?.click()}
            className="rounded-xl border px-3 py-1 text-sm shadow-sm hover:bg-gray-50"
          >
            Choose…
          </button>
        </label>
      </div>

      <div className="mb-3 flex items-center gap-4">
        <div className="text-sm">
          <div className="font-semibold">Moves</div>
          <div>{game.moves}</div>
        </div>
        <div className="text-sm">
          <div className="font-semibold">Time</div>
          <div>
            {Math.floor(seconds / 60)
              .toString()
              .padStart(2, "0")}
            :
            {(seconds % 60).toString().padStart(2, "0")}
          </div>
        </div>
        {game.finishedAt && (
          <div className="text-sm rounded-lg bg-green-50 px-3 py-1 text-green-700">
            ✨ Puzzle solved!
          </div>
        )}
      </div>

      {/* Puzzle board */}
      <div
        className="relative aspect-square w-full rounded-2xl border shadow-sm overflow-hidden bg-gray-100"
        style={{ maxWidth: sidePx }}
      >
        <div
          className="absolute inset-0 grid"
          style={{
            gridTemplateColumns: `repeat(${game.size}, 1fr)`,
            gridTemplateRows: `repeat(${game.size}, 1fr)`,
          }}
        >
          {game.tiles.map((val, i) => {
            const total = game.size * game.size;
            const isEmpty = val === 0;
            const correct = val !== 0 ? val - 1 : total - 1;
            const row = Math.floor(correct / game.size);
            const col = correct % game.size;

            const backgroundImage = isEmpty
              ? undefined
              : `url("${img || "/placeholder-image.jpg"}")`;
            const backgroundSize = `${game.size * 100}% ${game.size * 100}%`;
            const backgroundPosition = `${(col / (game.size - 1)) * 100}% ${
              (row / (game.size - 1)) * 100
            }%`;

            return (
              <button
                key={i}
                aria-label={isEmpty ? "empty" : `tile ${val}`}
                onClick={() => onTileClick(i)}
                className={`m-[2px] select-none rounded-lg ${
                  isEmpty
                    ? "bg-transparent"
                    : "bg-gray-200 active:scale-[0.98] transition-transform"
                }`}
                style={{
                  backgroundImage,
                  backgroundSize,
                  backgroundPosition,
                  backgroundRepeat: "no-repeat",
                  // Keep square tiles responsive
                  minWidth: 0,
                }}
              >
                {/* Optional numbers overlay */}
                {showNumbers && !isEmpty && (
                  <div className="h-full w-full flex items-center justify-center">
                    <span className="rounded-md bg-black/55 px-2 py-1 text-xs text-white">
                      {val}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {!img && (
        <p className="mt-3 text-sm text-gray-600">
          Tip: Click <b>Choose…</b> to pick your photo. (A temporary placeholder
          will be used until you upload.)
        </p>
      )}
    </div>
  );
}
