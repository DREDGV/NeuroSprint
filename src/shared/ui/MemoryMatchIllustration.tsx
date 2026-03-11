import type { CSSProperties } from "react";

interface MemoryMatchIllustrationProps {
  id: string;
  tint?: string;
  surface?: string;
  className?: string;
}

const SPRITE_COLS = 4;
const SPRITE_ROWS = 5;
const TILE_BY_ID: Record<string, number> = {
  apple: 0,
  bus: 1,
  books: 2,
  backpack: 3,
  pencil: 4,
  trophy: 5,
  clock: 6,
  flask: 7,
  board: 8,
  crayons: 9,
  glue: 10,
  bell: 12,
  math: 13,
  paint: 14,
  notebook: 16,
  hourglass: 17,
  magnifier: 18,
  folder: 19
};

export function MemoryMatchIllustration({ id, className }: MemoryMatchIllustrationProps) {
  const tileIndex = TILE_BY_ID[id] ?? 0;
  const x = tileIndex % SPRITE_COLS;
  const y = Math.floor(tileIndex / SPRITE_COLS);

  const style: CSSProperties = {
    backgroundImage: `url('/Memory Match_3.png')`,
    backgroundSize: `${SPRITE_COLS * 100}% ${SPRITE_ROWS * 100}%`,
    backgroundPosition: `${(x / (SPRITE_COLS - 1)) * 100}% ${(y / (SPRITE_ROWS - 1)) * 100}%`
  };

  return <span className={["memory-match-sprite", className].filter(Boolean).join(" ")} style={style} aria-hidden="true" />;
}
