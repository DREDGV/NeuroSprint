import { buildSkillProfile } from "../../shared/lib/training/skillProfile";
import type { GridSize, Session } from "../../shared/types/domain";

export type SpatialDifficulty = "easy" | "medium" | "hard";
export type SpatialPatternFamily =
  | "anchors"
  | "band"
  | "constellation"
  | "cluster"
  | "diagonal"
  | "l_shape"
  | "mirror"
  | "orbit"
  | "stair"
  | "weave"
  | "split";

export interface SpatialLevelConfig {
  difficulty: SpatialDifficulty;
  level: number;
  gridSize: GridSize;
  label: string;
  shortLabel: string;
  description: string;
  targets: number;
  memorizeSec: number;
  families: SpatialPatternFamily[];
}

export interface SpatialPattern {
  family: SpatialPatternFamily;
  gridSize: GridSize;
  familyLabel: string;
  structureLabel: string;
  coachingHint: string;
  recallHint: string;
  resultHint: string;
  cells: number[];
}

export interface SpatialProgression {
  recommendedDifficulty: SpatialDifficulty;
  recommendedLevel: number;
  memorySkillLevel: number;
  headline: string;
  summary: string;
  nextStep: string;
  tierLabel: string;
}

export interface SpatialResultSummary {
  hits: number;
  misses: number;
  falseHits: number;
  errors: number;
  accuracy: number;
  score: number;
  durationMs: number;
  speed: number;
}

export interface SpatialRoundInsight {
  title: string;
  summary: string;
  recommendation: string;
  diagnosticLabel: string;
}

interface CellCoord {
  row: number;
  col: number;
}

const MODE_ID = "spatial_memory_classic";
const MODULE_ID = "spatial_memory";

const LEVEL_CONFIGS: SpatialLevelConfig[] = [
  {
    difficulty: "easy",
    level: 1,
    gridSize: 4,
    label: "Легко",
    shortLabel: "3 позиции",
    description: "Чистый вход: одна понятная форма и достаточно времени, чтобы собрать карту поля без спешки.",
    targets: 3,
    memorizeSec: 5,
    families: ["anchors", "cluster", "band"]
  },
  {
    difficulty: "easy",
    level: 2,
    gridSize: 4,
    label: "Легко",
    shortLabel: "4 позиции",
    description: "База на удержание опор: углы, край или компактный кластер, который нужно воспроизвести точно.",
    targets: 4,
    memorizeSec: 5,
    families: ["anchors", "cluster", "band", "diagonal"]
  },
  {
    difficulty: "easy",
    level: 3,
    gridSize: 5,
    label: "Легко+",
    shortLabel: "5 позиций",
    description: "Подготовка к следующему уровню: форма уже может растягиваться между зонами, но поле ещё остаётся читаемым.",
    targets: 5,
    memorizeSec: 5,
    families: ["anchors", "cluster", "band", "diagonal", "split"]
  },
  {
    difficulty: "medium",
    level: 4,
    gridSize: 5,
    label: "Средне",
    shortLabel: "6 позиций",
    description: "Две зоны или вытянутая форма. Важно держать структуру, а не отдельные клетки.",
    targets: 6,
    memorizeSec: 4,
    families: ["band", "cluster", "diagonal", "l_shape", "split"]
  },
  {
    difficulty: "medium",
    level: 5,
    gridSize: 5,
    label: "Средне+",
    shortLabel: "7 позиций",
    description: "Форма становится плотнее: поле нужно удерживать как карту, а не как набор независимых меток.",
    targets: 7,
    memorizeSec: 4,
    families: ["cluster", "diagonal", "l_shape", "split", "mirror", "orbit"]
  },
  {
    difficulty: "medium",
    level: 6,
    gridSize: 5,
    label: "Средне+",
    shortLabel: "7 позиций",
    description: "Нагрузка на структуру и края. Ошибки чаще возникают не в количестве, а в смещении формы.",
    targets: 7,
    memorizeSec: 3,
    families: ["band", "diagonal", "mirror", "split", "stair", "orbit", "constellation", "weave"]
  },
  {
    difficulty: "hard",
    level: 7,
    gridSize: 6,
    label: "Сложно",
    shortLabel: "8 позиций",
    description: "Поле начинает распадаться на несколько опор. Здесь уже важно уметь собирать карту зон.",
    targets: 8,
    memorizeSec: 4,
    families: ["cluster", "diagonal", "split", "stair", "orbit", "constellation", "weave"]
  },
  {
    difficulty: "hard",
    level: 8,
    gridSize: 6,
    label: "Сложно+",
    shortLabel: "9 позиций",
    description: "Асимметрия и плотная spatial-нагрузка. Надо удерживать форму и не добирать ответ догадкой.",
    targets: 9,
    memorizeSec: 4,
    families: ["diagonal", "mirror", "split", "band", "stair", "orbit", "constellation", "weave"]
  },
  {
    difficulty: "hard",
    level: 9,
    gridSize: 6,
    label: "Сложно+",
    shortLabel: "10 позиций",
    description: "Форма становится запутаннее, а поле требует хорошего чувства краёв и центральной оси.",
    targets: 10,
    memorizeSec: 3,
    families: ["diagonal", "mirror", "split", "stair", "orbit", "constellation", "weave"]
  },
  {
    difficulty: "hard",
    level: 10,
    gridSize: 6,
    label: "Мастер",
    shortLabel: "11 позиций",
    description: "Максимальный уровень: короткий обзор, сложная spatial-структура и высокая цена лишнего клика.",
    targets: 11,
    memorizeSec: 3,
    families: ["diagonal", "mirror", "split", "stair", "orbit", "constellation", "weave"]
  }
];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function shuffle<T>(items: T[]): T[] {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

function sortSessionsByTime(sessions: Session[]): Session[] {
  return [...sessions].sort((left, right) => left.timestamp.localeCompare(right.timestamp));
}

function indexToCoord(index: number, gridSize: number): CellCoord {
  return {
    row: Math.floor(index / gridSize),
    col: index % gridSize
  };
}

function coordToIndex(row: number, col: number, gridSize: number): number {
  return row * gridSize + col;
}

function uniqueCells(cells: number[], gridSize: number): number[] {
  return [...new Set(cells)].filter((cell) => cell >= 0 && cell < gridSize * gridSize);
}

function rowCells(row: number, gridSize: number): number[] {
  return Array.from({ length: gridSize }, (_, col) => coordToIndex(row, col, gridSize));
}

function columnCells(col: number, gridSize: number): number[] {
  return Array.from({ length: gridSize }, (_, row) => coordToIndex(row, col, gridSize));
}

function isEdge(index: number, gridSize: number): boolean {
  const { row, col } = indexToCoord(index, gridSize);
  return row === 0 || row === gridSize - 1 || col === 0 || col === gridSize - 1;
}

function isCenter(index: number, gridSize: number): boolean {
  return !isEdge(index, gridSize);
}

function pickAnchors(count: number, gridSize: number): number[] {
  const corners = shuffle([
    coordToIndex(0, 0, gridSize),
    coordToIndex(0, gridSize - 1, gridSize),
    coordToIndex(gridSize - 1, 0, gridSize),
    coordToIndex(gridSize - 1, gridSize - 1, gridSize)
  ]);
  const edges = shuffle(
    Array.from({ length: gridSize * gridSize }, (_, index) => index).filter(
      (index) => isEdge(index, gridSize) && !corners.includes(index)
    )
  );
  const inner = shuffle(
    Array.from({ length: gridSize * gridSize }, (_, index) => index).filter((index) => isCenter(index, gridSize))
  );
  return uniqueCells([...corners, ...edges, ...inner], gridSize).slice(0, count);
}

function pickBand(count: number, gridSize: number): number[] {
  const horizontal = Math.random() > 0.5;
  const start = Math.floor(Math.random() * gridSize);
  const firstLine = horizontal ? rowCells(start, gridSize) : columnCells(start, gridSize);

  if (count <= gridSize) {
    const segmentStart = Math.floor(Math.random() * (gridSize - count + 1));
    return firstLine.slice(segmentStart, segmentStart + count);
  }

  const secondLineIndex = start < gridSize - 1 ? start + 1 : start - 1;
  const secondLine = horizontal ? rowCells(secondLineIndex, gridSize) : columnCells(secondLineIndex, gridSize);
  const extraCount = count - gridSize;
  const segmentStart = Math.floor(Math.random() * (gridSize - extraCount + 1));
  return uniqueCells([...firstLine, ...secondLine.slice(segmentStart, segmentStart + extraCount)], gridSize).slice(0, count);
}

function pickConstellation(count: number, gridSize: number): number[] {
  const zones = shuffle([
    { rowStart: 0, rowEnd: Math.max(1, Math.floor(gridSize / 2) - 1), colStart: 0, colEnd: Math.max(1, Math.floor(gridSize / 2) - 1) },
    { rowStart: 0, rowEnd: Math.max(1, Math.floor(gridSize / 2) - 1), colStart: Math.max(1, Math.ceil(gridSize / 2)), colEnd: gridSize - 1 },
    { rowStart: Math.max(1, Math.ceil(gridSize / 2)), rowEnd: gridSize - 1, colStart: 0, colEnd: Math.max(1, Math.floor(gridSize / 2) - 1) },
    { rowStart: Math.max(1, Math.ceil(gridSize / 2)), rowEnd: gridSize - 1, colStart: Math.max(1, Math.ceil(gridSize / 2)), colEnd: gridSize - 1 }
  ]);

  const anchors = zones.slice(0, Math.min(3, count)).map((zone) => {
    const row = clamp(
      zone.rowStart + Math.floor(Math.random() * Math.max(1, zone.rowEnd - zone.rowStart + 1)),
      0,
      gridSize - 1
    );
    const col = clamp(
      zone.colStart + Math.floor(Math.random() * Math.max(1, zone.colEnd - zone.colStart + 1)),
      0,
      gridSize - 1
    );
    return coordToIndex(row, col, gridSize);
  });

  const satellites = shuffle(
    anchors.flatMap((anchor) => {
      const { row, col } = indexToCoord(anchor, gridSize);
      return uniqueCells([
        coordToIndex(row, clamp(col + 1, 0, gridSize - 1), gridSize),
        coordToIndex(row, clamp(col - 1, 0, gridSize - 1), gridSize),
        coordToIndex(clamp(row + 1, 0, gridSize - 1), col, gridSize),
        coordToIndex(clamp(row - 1, 0, gridSize - 1), col, gridSize)
      ], gridSize).filter((cell) => cell !== anchor);
    })
  );

  const fillers = shuffle(
    Array.from({ length: gridSize * gridSize }, (_, index) => index).filter(
      (index) => !anchors.includes(index) && !satellites.includes(index)
    )
  );

  return uniqueCells([...anchors, ...satellites, ...fillers], gridSize).slice(0, count);
}

function pickCluster(count: number, gridSize: number): number[] {
  const originRow = Math.floor(Math.random() * Math.max(1, gridSize - 1));
  const originCol = Math.floor(Math.random() * Math.max(1, gridSize - 1));
  const base = uniqueCells([
    coordToIndex(originRow, originCol, gridSize),
    coordToIndex(originRow + 1, originCol, gridSize),
    coordToIndex(originRow, originCol + 1, gridSize),
    coordToIndex(originRow + 1, originCol + 1, gridSize)
  ], gridSize);

  const shell = uniqueCells([
    coordToIndex(originRow - 1, originCol, gridSize),
    coordToIndex(originRow, originCol - 1, gridSize),
    coordToIndex(originRow + 2, originCol + 1, gridSize),
    coordToIndex(originRow + 1, originCol + 2, gridSize),
    coordToIndex(originRow + 2, originCol, gridSize),
    coordToIndex(originRow, originCol + 2, gridSize),
    coordToIndex(originRow - 1, originCol + 1, gridSize),
    coordToIndex(originRow + 1, originCol - 1, gridSize)
  ], gridSize);

  return uniqueCells([...shuffle(base), ...shuffle(shell)], gridSize).slice(0, count);
}

function pickDiagonal(count: number, gridSize: number): number[] {
  const primary = Math.random() > 0.5;
  const diagonal = Array.from({ length: gridSize }, (_, step) =>
    primary ? coordToIndex(step, step, gridSize) : coordToIndex(step, gridSize - 1 - step, gridSize)
  );
  const satellites = shuffle(
    Array.from({ length: gridSize * gridSize }, (_, index) => index).filter((index) => !diagonal.includes(index))
  );
  return uniqueCells([...diagonal, ...satellites], gridSize).slice(0, count);
}

function pickLShape(count: number, gridSize: number): number[] {
  const corner = shuffle([
    { row: 0, col: 0, rowDirection: 1, colDirection: 1 },
    { row: 0, col: gridSize - 1, rowDirection: 1, colDirection: -1 },
    { row: gridSize - 1, col: 0, rowDirection: -1, colDirection: 1 },
    { row: gridSize - 1, col: gridSize - 1, rowDirection: -1, colDirection: -1 }
  ])[0];

  const horizontalLength = clamp(Math.ceil((count + 1) / 2), 2, gridSize);
  const verticalLength = clamp(count + 1 - horizontalLength, 2, gridSize);
  const cells: number[] = [];

  for (let step = 0; step < horizontalLength; step += 1) {
    cells.push(coordToIndex(corner.row, corner.col + step * corner.colDirection, gridSize));
  }

  for (let step = 1; step < verticalLength; step += 1) {
    cells.push(coordToIndex(corner.row + step * corner.rowDirection, corner.col, gridSize));
  }

  const unique = uniqueCells(cells, gridSize);
  if (unique.length >= count) {
    return unique.slice(0, count);
  }

  const extension = shuffle(
    uniqueCells([
      coordToIndex(corner.row + corner.rowDirection, corner.col + corner.colDirection, gridSize),
      coordToIndex(corner.row + corner.rowDirection * 2, corner.col + corner.colDirection, gridSize),
      coordToIndex(corner.row + corner.rowDirection, corner.col + corner.colDirection * 2, gridSize),
      coordToIndex(corner.row + corner.rowDirection * 2, corner.col + corner.colDirection * 2, gridSize)
    ], gridSize).filter((cell) => !unique.includes(cell))
  );

  return uniqueCells([...unique, ...extension], gridSize).slice(0, count);
}

function pickMirror(count: number, gridSize: number): number[] {
  const horizontal = Math.random() > 0.5;
  const pairs: number[][] = [];

  for (let row = 0; row < gridSize; row += 1) {
    for (let col = 0; col < gridSize; col += 1) {
      const mirrorRow = horizontal ? gridSize - 1 - row : row;
      const mirrorCol = horizontal ? col : gridSize - 1 - col;
      const left = coordToIndex(row, col, gridSize);
      const right = coordToIndex(mirrorRow, mirrorCol, gridSize);
      if (left !== right && left < right) {
        pairs.push([left, right]);
      }
    }
  }

  const shuffledPairs = shuffle(pairs);
  const pairCount = Math.max(1, Math.floor(count / 2));
  const cells = shuffledPairs.slice(0, pairCount).flat();
  return uniqueCells(cells, gridSize).slice(0, count);
}

function pickOrbit(count: number, gridSize: number): number[] {
  const perimeter = uniqueCells([
    ...rowCells(0, gridSize),
    ...Array.from({ length: Math.max(0, gridSize - 2) }, (_, step) => coordToIndex(step + 1, gridSize - 1, gridSize)),
    ...rowCells(gridSize - 1, gridSize).reverse(),
    ...Array.from({ length: Math.max(0, gridSize - 2) }, (_, step) => coordToIndex(gridSize - 2 - step, 0, gridSize))
  ], gridSize);
  const start = Math.floor(Math.random() * perimeter.length);
  const arc = Array.from({ length: Math.min(count, perimeter.length) }, (_, step) => perimeter[(start + step) % perimeter.length]);
  const support = shuffle([
    coordToIndex(Math.floor(gridSize / 2), Math.floor(gridSize / 2), gridSize),
    coordToIndex(Math.floor(gridSize / 2), clamp(Math.floor(gridSize / 2) - 1, 0, gridSize - 1), gridSize),
    coordToIndex(clamp(Math.floor(gridSize / 2) - 1, 0, gridSize - 1), Math.floor(gridSize / 2), gridSize)
  ]);

  return uniqueCells([...arc, ...support], gridSize).slice(0, count);
}

function pickStair(count: number, gridSize: number): number[] {
  const ascending = Math.random() > 0.5;
  const maxStart = Math.max(1, gridSize - 3);
  let row = ascending
    ? Math.floor(Math.random() * maxStart)
    : Math.floor(Math.random() * maxStart) + 2;
  let col = Math.random() > 0.5 ? 0 : 1;
  const cells: number[] = [];

  while (cells.length < count && col < gridSize) {
    cells.push(coordToIndex(row, col, gridSize));

    if (cells.length < count && col + 1 < gridSize) {
      cells.push(coordToIndex(row, col + 1, gridSize));
    }

    col += 2;
    row = clamp(row + (ascending ? 1 : -1), 0, gridSize - 1);
  }

  const satellites = shuffle(
    uniqueCells([
      coordToIndex(clamp(row, 0, gridSize - 1), clamp(col - 1, 0, gridSize - 1), gridSize),
      coordToIndex(clamp(row - 1, 0, gridSize - 1), clamp(col - 2, 0, gridSize - 1), gridSize),
      coordToIndex(clamp(row + 1, 0, gridSize - 1), clamp(col - 2, 0, gridSize - 1), gridSize)
    ], gridSize)
  );

  return uniqueCells([...cells, ...satellites], gridSize).slice(0, count);
}

function pickWeave(count: number, gridSize: number): number[] {
  const horizontal = Math.random() > 0.5;
  const start = Math.floor(Math.random() * Math.max(1, gridSize - 2));
  const lanes = [start, clamp(start + 1, 0, gridSize - 1), clamp(start + 2, 0, gridSize - 1)];
  const offsetPattern = Math.random() > 0.5 ? [0, 1, 0] : [1, 0, 1];
  const cells: number[] = [];

  lanes.forEach((lane, laneIndex) => {
    for (let step = offsetPattern[laneIndex]; step < gridSize; step += 2) {
      cells.push(horizontal ? coordToIndex(lane, step, gridSize) : coordToIndex(step, lane, gridSize));
    }
  });

  const support = shuffle(
    uniqueCells(
      cells.flatMap((cell) => {
        const { row, col } = indexToCoord(cell, gridSize);
        return [
          coordToIndex(row, clamp(col + 1, 0, gridSize - 1), gridSize),
          coordToIndex(row, clamp(col - 1, 0, gridSize - 1), gridSize),
          coordToIndex(clamp(row + 1, 0, gridSize - 1), col, gridSize),
          coordToIndex(clamp(row - 1, 0, gridSize - 1), col, gridSize)
        ];
      }),
      gridSize
    ).filter((cell) => !cells.includes(cell))
  );

  return uniqueCells([...cells, ...support], gridSize).slice(0, count);
}

function pickSplit(count: number, gridSize: number): number[] {
  const clusterCount = Math.max(2, count - 1);
  const cluster = pickCluster(clusterCount, gridSize);
  const clusterCoords = cluster.map((cell) => indexToCoord(cell, gridSize));
  const centerRow = clusterCoords.reduce((sum, cell) => sum + cell.row, 0) / clusterCoords.length;
  const centerCol = clusterCoords.reduce((sum, cell) => sum + cell.col, 0) / clusterCoords.length;
  const satellite = shuffle(
    Array.from({ length: gridSize * gridSize }, (_, index) => index)
      .filter((index) => !cluster.includes(index))
      .sort((left, right) => {
        const leftCoord = indexToCoord(left, gridSize);
        const rightCoord = indexToCoord(right, gridSize);
        const leftDistance = Math.abs(leftCoord.row - centerRow) + Math.abs(leftCoord.col - centerCol);
        const rightDistance = Math.abs(rightCoord.row - centerRow) + Math.abs(rightCoord.col - centerCol);
        return rightDistance - leftDistance;
      })
  )[0];

  return uniqueCells([...cluster, satellite], gridSize).slice(0, count);
}

function familyMeta(family: SpatialPatternFamily): Pick<
  SpatialPattern,
  "familyLabel" | "structureLabel" | "coachingHint" | "recallHint" | "resultHint"
> {
  switch (family) {
    case "anchors":
      return {
        familyLabel: "Опоры",
        structureLabel: "углы и края",
        coachingHint: "Сначала удержите самые заметные опоры по краям, а уже потом связывайте их между собой.",
        recallHint: "Вспомните углы и крайние точки, прежде чем добирать середину.",
        resultHint: "Ключ к этому типу поля — не терять якоря по краям."
      };
    case "band":
      return {
        familyLabel: "Полоса",
        structureLabel: "ряд или колонка",
        coachingHint: "Смотрите на форму как на одну полосу, а не на набор отдельных клеток.",
        recallHint: "Сначала восстановите направление полосы, потом точное количество клеток.",
        resultHint: "Для полос лучше работает удержание линии и её края."
      };
    case "constellation":
      return {
        familyLabel: "Созвездие",
        structureLabel: "разнесённые опоры",
        coachingHint: "Соберите поле через 2-3 отдельные опоры и расстояния между ними, а не через сплошную фигуру.",
        recallHint: "Вспоминайте сначала сами узлы, затем ближайшие спутники у каждой точки.",
        resultHint: "Созвездия держатся на расстояниях и зонах. Если теряется одна опора, разваливается вся карта."
      };
    case "cluster":
      return {
        familyLabel: "Кластер",
        structureLabel: "компактная зона",
        coachingHint: "Запомните ядро кластера как один блок, а не как четыре независимые клетки.",
        recallHint: "Сначала найдите основную зону, потом проверьте, не распалась ли она по краям.",
        resultHint: "На кластерах важнее собрать центр формы, чем угадывать периферию."
      };
    case "diagonal":
      return {
        familyLabel: "Диагональ",
        structureLabel: "диагональная связка",
        coachingHint: "Держите в голове направление диагонали и две крайние точки, а не каждую клетку отдельно.",
        recallHint: "Вспомните ось диагонали, затем проверьте боковые клетки рядом с ней.",
        resultHint: "Диагонали чаще теряются из-за смещения оси, а не из-за полной потери формы."
      };
    case "l_shape":
      return {
        familyLabel: "L-форма",
        structureLabel: "угол и два плеча",
        coachingHint: "Найдите точку изгиба и удерживайте форму через два плеча.",
        recallHint: "Сначала восстановите угол, потом длину плеч по горизонтали и вертикали.",
        resultHint: "L-формы требуют удерживать именно изгиб, а не количество клеток."
      };
    case "mirror":
      return {
        familyLabel: "Симметрия",
        structureLabel: "зеркальная пара",
        coachingHint: "Смотрите на поле попарно: каждая клетка должна иметь отражение.",
        recallHint: "Проверяйте пары по обе стороны оси, а не отдельные точки.",
        resultHint: "На симметрии важнее сохранить пары, чем пытаться вспомнить все клетки подряд."
      };
    case "orbit":
      return {
        familyLabel: "Орбита",
        structureLabel: "дуга по краю",
        coachingHint: "Удерживайте не отдельные клетки, а дугу по периметру и её опорный центр.",
        recallHint: "Сначала вспомните, где проходит крайняя дуга, и только потом добирайте внутреннюю опору.",
        resultHint: "Для орбиты лучше работает память на контур и ось, а не на точечный перебор."
      };
    case "stair":
      return {
        familyLabel: "Лестница",
        structureLabel: "ступенчатая связка",
        coachingHint: "Смотрите на форму как на ступени: горизонталь, сдвиг, ещё горизонталь.",
        recallHint: "Восстанавливайте не клетки по одной, а ритм ступеней и направление смещения.",
        resultHint: "Лестницы теряются, когда рвётся ритм формы. Держите шаг, а не отдельные точки."
      };
    case "weave":
      return {
        familyLabel: "Плетение",
        structureLabel: "чередующиеся линии",
        coachingHint: "Держите не точки по отдельности, а ритм чередования: одна линия, сдвиг, опять линия.",
        recallHint: "Восстанавливайте узор рядами или колонками, не пытаясь вспоминать каждую клетку изолированно.",
        resultHint: "Плетение держится на повторяющемся ритме. Если сбивается чередование, рассыпается весь узор."
      };
    case "split":
      return {
        familyLabel: "Разнос",
        structureLabel: "кластер и спутник",
        coachingHint: "Держите отдельно ядро формы и одну удалённую опору, чтобы поле не слиплось в одно пятно.",
        recallHint: "Сначала отметьте основной блок, потом вспомните одиночную удалённую клетку.",
        resultHint: "Для разнесённых паттернов лучше работают две опоры: блок и спутник."
      };
    default:
      return {
        familyLabel: "Поле",
        structureLabel: "раскладка",
        coachingHint: "Соберите карту поля через 2-3 опоры.",
        recallHint: "Отмечайте только уверенные клетки.",
        resultHint: "Собирайте карту поля через зоны и опорные точки."
      };
  }
}

function generateCells(family: SpatialPatternFamily, count: number, gridSize: number): number[] {
  if (family === "anchors") {
    return pickAnchors(count, gridSize);
  }
  if (family === "band") {
    return pickBand(count, gridSize);
  }
  if (family === "constellation") {
    return pickConstellation(count, gridSize);
  }
  if (family === "cluster") {
    return pickCluster(count, gridSize);
  }
  if (family === "diagonal") {
    return pickDiagonal(count, gridSize);
  }
  if (family === "l_shape") {
    return pickLShape(count, gridSize);
  }
  if (family === "mirror") {
    return pickMirror(count, gridSize);
  }
  if (family === "orbit") {
    return pickOrbit(count, gridSize);
  }
  if (family === "stair") {
    return pickStair(count, gridSize);
  }
  if (family === "weave") {
    return pickWeave(count, gridSize);
  }
  return pickSplit(count, gridSize);
}

export function getSpatialMemorySessions(sessions: Session[]): Session[] {
  return sortSessionsByTime(
    sessions.filter((session) => session.moduleId === MODULE_ID && session.modeId === MODE_ID)
  );
}

export function getSpatialLevelConfig(level: number): SpatialLevelConfig {
  return LEVEL_CONFIGS.find((item) => item.level === clamp(level, 1, 10)) ?? LEVEL_CONFIGS[0];
}

export function resolveSpatialLevelForDifficulty(
  difficulty: SpatialDifficulty,
  recommendedLevel: number
): number {
  const sameTierLevel = getSpatialLevelConfig(recommendedLevel);
  if (sameTierLevel.difficulty === difficulty) {
    return sameTierLevel.level;
  }

  if (difficulty === "easy") {
    return 2;
  }
  if (difficulty === "medium") {
    return 5;
  }
  return 8;
}

export function buildSpatialPattern(config: SpatialLevelConfig): SpatialPattern {
  const availableFamilies = config.families.filter(
    (family) => family !== "mirror" || config.targets % 2 === 0
  );
  const weightedFamilies = config.level >= 9
    ? [
        ...availableFamilies.filter((family) => family !== "l_shape" && family !== "band"),
        ...availableFamilies.filter(
          (family) =>
            family === "orbit" ||
            family === "mirror" ||
            family === "constellation" ||
            family === "weave"
        ),
        ...availableFamilies.filter(
          (family) => family === "orbit" || family === "constellation" || family === "weave"
        )
      ]
    : config.level >= 8
      ? [
          ...availableFamilies.filter((family) => family !== "l_shape"),
          ...availableFamilies.filter(
            (family) =>
              family === "orbit" ||
              family === "stair" ||
              family === "split" ||
              family === "constellation" ||
              family === "weave"
          )
        ]
      : availableFamilies;
  const family = shuffle(weightedFamilies)[0] ?? "cluster";
  const meta = familyMeta(family);

  return {
    family,
    gridSize: config.gridSize,
    ...meta,
    cells: generateCells(family, config.targets, config.gridSize)
  };
}

export function buildSpatialMemoryProgression(allSessions: Session[]): SpatialProgression {
  const spatialSessions = getSpatialMemorySessions(allSessions);
  const skillProfile = buildSkillProfile(allSessions);
  const memorySkillLevel = skillProfile.axes.find((axis) => axis.id === "memory")?.level ?? 1;

  if (spatialSessions.length === 0) {
    const recommendedLevel = memorySkillLevel >= 5 ? 2 : 1;
    const config = getSpatialLevelConfig(recommendedLevel);
    return {
      recommendedDifficulty: config.difficulty,
      recommendedLevel,
      memorySkillLevel,
      headline: `Стартуем с ${config.label.toLowerCase()} уровня`,
      summary:
        memorySkillLevel >= 5
          ? "Общий профиль памяти уже неплохой, но сам тренажёр всё равно лучше начать с понятной spatial-базы."
          : "Для первого входа лучше собрать чистую базу: одна форма, спокойный обзор и минимум лишних догадок.",
      nextStep: "Сделайте 2-3 точных раунда. После устойчивой точности тренажёр сам предложит следующий уровень.",
      tierLabel: `Уровень тренажёра ${recommendedLevel}/10`
    };
  }

  const recent = spatialSessions.slice(-4);
  const lastSession = recent[recent.length - 1] ?? spatialSessions[spatialSessions.length - 1];
  const previousLevel = clamp(lastSession?.level ?? 1, 1, 10);

  if (recent.length < 3) {
    const config = getSpatialLevelConfig(previousLevel);
    return {
      recommendedDifficulty: config.difficulty,
      recommendedLevel: previousLevel,
      memorySkillLevel,
      headline: "Собираем честный baseline",
      summary: "Сессий в этом тренажёре пока мало, поэтому уровень сохраняем и собираем ещё несколько качественных попыток.",
      nextStep: "Нужно ещё минимум 1-2 раунда, чтобы автоматический рост сложности опирался на реальные данные.",
      tierLabel: `Уровень тренажёра ${previousLevel}/10`
    };
  }

  const avgAccuracy = recent.reduce((sum, session) => sum + session.accuracy, 0) / recent.length;
  const avgErrors = recent.reduce((sum, session) => sum + session.errors, 0) / recent.length;
  const lastAccuracy = lastSession?.accuracy ?? avgAccuracy;

  let nextLevel = previousLevel;
  let headline = "Уровень удержан";
  let summary = "Последние раунды ещё не дают повода менять нагрузку. Сейчас важнее закрепить стабильность на текущем уровне.";
  let nextStep = "Сделайте ещё 1-2 аккуратные попытки без лишних кликов. После устойчивой точности тренажёр поднимет уровень.";

  if (avgAccuracy >= 0.88 && avgErrors <= 1.1 && lastAccuracy >= 0.85) {
    nextLevel = clamp(previousLevel + 1, 1, 10);
    headline = "Можно повышать нагрузку";
    summary = "Точность и контроль уже держатся достаточно стабильно. Тренажёр может добавить более сложную spatial-структуру.";
    nextStep = "Следующий рост будет идти не только по числу клеток, но и по сложности spatial-формы.";
  } else if (avgAccuracy <= 0.64 || avgErrors >= 2.8) {
    nextLevel = clamp(previousLevel - 1, 1, 10);
    headline = "Нужно стабилизировать базу";
    summary = "Последние попытки дают слишком много потерь по форме или лишних кликов, поэтому нагрузку лучше немного упростить.";
    nextStep = "Сначала верните точность и уверенную карту поля, потом снова поднимем сложность.";
  }

  const config = getSpatialLevelConfig(nextLevel);
  return {
    recommendedDifficulty: config.difficulty,
    recommendedLevel: nextLevel,
    memorySkillLevel,
    headline,
    summary,
    nextStep,
    tierLabel: `Уровень тренажёра ${nextLevel}/10`
  };
}

export function buildSpatialResultSummary(
  selected: Set<number>,
  targets: number[],
  resultDurationSec: number
): SpatialResultSummary {
  const targetSet = new Set(targets);
  const hits = [...selected].filter((cell) => targetSet.has(cell)).length;
  const misses = targets.filter((cell) => !selected.has(cell)).length;
  const falseHits = [...selected].filter((cell) => !targetSet.has(cell)).length;
  const errors = misses + falseHits;
  const accuracy = targets.length === 0 ? 0 : hits / (targets.length + falseHits);
  const durationMs = Math.max(1000, resultDurationSec * 1000);
  const speed = hits / Math.max(1, durationMs / 60_000);
  const score = Math.max(
    0,
    Math.round(accuracy * 130 + hits * 16 - errors * 14 - resultDurationSec * 2.5)
  );

  return {
    hits,
    misses,
    falseHits,
    errors,
    accuracy,
    score,
    durationMs,
    speed
  };
}

function countByPredicate(cells: number[], predicate: (index: number) => boolean): number {
  return cells.filter(predicate).length;
}

export function buildSpatialRoundInsight(
  result: SpatialResultSummary,
  pattern: SpatialPattern
): SpatialRoundInsight {
  const targetEdges = countByPredicate(pattern.cells, (cell) => isEdge(cell, pattern.gridSize));
  const targetCenters = countByPredicate(pattern.cells, (cell) => isCenter(cell, pattern.gridSize));

  if (result.accuracy >= 0.9 && result.errors <= 1) {
    return {
      title: "Карта поля удержана уверенно",
      summary: `Вы сохранили форму «${pattern.structureLabel}» без заметного шума и не развалили опорные зоны.`,
      recommendation: "Следующий шаг: поднимать spatial-нагрузку через более плотную форму, но сохранять ту же чистоту ответа.",
      diagnosticLabel: "Стабильная карта"
    };
  }

  if (result.falseHits > result.misses) {
    return {
      title: "Лишние клики смазали карту",
      summary: "Опорная форма вспоминалась частично, но итог испортили догадки сверх уверенных клеток.",
      recommendation: "Следующий шаг: отмечайте только те клетки, которые держатся как часть формы. Остальное лучше не добирать.",
      diagnosticLabel: "Лишние догадки"
    };
  }

  if (pattern.family === "weave" && result.errors > 0 && result.hits >= Math.max(3, Math.floor(pattern.cells.length / 2))) {
    return {
      title: "Сбился ритм паттерна",
      summary: "Основной силуэт читался верно, но в одном из чередующихся звеньев сбился шаг.",
      recommendation: "Следующий шаг: восстанавливайте плетение не точками, а ритмом чередования по рядам или колонкам.",
      diagnosticLabel: "Сбитый ритм"
    };
  }

  if ((pattern.family === "constellation" || pattern.family === "split") && result.misses > 0 && result.hits >= 2) {
    return {
      title: "Потерялась дальняя опора",
      summary: "Центр или кластер удержался, но одна из разнесённых точек выпала из карты.",
      recommendation: "Следующий шаг: держите отдельно ядро и удалённый якорь. Если спутник теряется, рассыпается весь паттерн.",
      diagnosticLabel: "Потеря дальней опоры"
    };
  }

  if ((pattern.family === "orbit" || pattern.family === "mirror") && result.misses > 0 && result.falseHits <= 1) {
    return {
      title: pattern.family === "orbit" ? "Разорвался контур" : "Сломалась симметрия",
      summary: pattern.family === "orbit"
        ? "Основная ось паттерна была понятна, но на краю появился разрыв, и форма перестала читаться как единый контур."
        : "Парная логика поля частично сохранилась, но одна из пар выпала и зеркало разрушилось.",
      recommendation: pattern.family === "orbit"
        ? "Следующий шаг: держите не точки по краю, а непрерывную дугу и её опорный центр."
        : "Следующий шаг: проверяйте пары по обе стороны оси, а не отдельные клетки.",
      diagnosticLabel: pattern.family === "orbit" ? "Разрыв контура" : "Сломанная симметрия"
    };
  }

  if (targetEdges >= Math.max(2, Math.ceil(pattern.cells.length / 2)) && result.misses > 0) {
    return {
      title: "Потерялись края и опоры",
      summary: `Для паттерна типа «${pattern.familyLabel.toLowerCase()}» основная ошибка была в потере крайних якорей.`,
      recommendation: "Следующий шаг: сначала фиксируйте крайние точки и только потом добирайте центр формы.",
      diagnosticLabel: "Потеря опор"
    };
  }

  if (targetEdges > targetCenters && result.misses >= result.falseHits && result.errors > 0) {
    return {
      title: "Поле сместилось к центру",
      summary: "Форма в памяти удержалась частично, но поле стянулось внутрь и потеряло свою исходную геометрию.",
      recommendation: "Следующий шаг: делите поле на край и середину, чтобы spatial-форма не схлопывалась в центр.",
      diagnosticLabel: "Смещение к центру"
    };
  }

  if (result.hits >= Math.max(2, Math.floor(pattern.cells.length / 2))) {
    return {
      title: "Форма уже читается, но распадается",
      summary: `Вы увидели структуру «${pattern.structureLabel}», но не удержали её целиком до конца ответа.`,
      recommendation: pattern.resultHint,
      diagnosticLabel: "Форма распадается"
    };
  }

  return {
    title: "Нужна более явная карта поля",
    summary: "Сейчас поле запоминается слишком локально. Опорные зоны ещё не собираются в одну пространственную картину.",
    recommendation: "Следующий шаг: держите 2-3 якоря и восстанавливайте форму через них, а не через отдельные клетки.",
    diagnosticLabel: "Карта не собрана"
  };
}
