import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

type SpatialDifficulty = "easy" | "medium" | "hard";
type SpatialPhase = "setup" | "memorize" | "recall" | "result";

interface SpatialConfig {
  label: string;
  targets: number;
  memorizeSec: number;
}

const BOARD_SIZE = 4;

const CONFIGS: Record<SpatialDifficulty, SpatialConfig> = {
  easy: { label: "Легко", targets: 3, memorizeSec: 3 },
  medium: { label: "Средне", targets: 5, memorizeSec: 3 },
  hard: { label: "Сложно", targets: 8, memorizeSec: 4 }
};

function randomUniqueIndices(limit: number, count: number): number[] {
  const values = Array.from({ length: limit }, (_, index) => index);
  for (let i = values.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  return values.slice(0, count);
}

export function SpatialMemoryPage() {
  const [difficulty, setDifficulty] = useState<SpatialDifficulty>("easy");
  const [phase, setPhase] = useState<SpatialPhase>("setup");
  const [targets, setTargets] = useState<number[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [countdown, setCountdown] = useState(0);
  const [recallStartedAt, setRecallStartedAt] = useState<number | null>(null);
  const [resultDurationSec, setResultDurationSec] = useState(0);

  const config = CONFIGS[difficulty];

  useEffect(() => {
    if (phase !== "memorize") {
      return;
    }

    setCountdown(config.memorizeSec);
    const intervalId = window.setInterval(() => {
      setCountdown((value) => {
        if (value <= 1) {
          window.clearInterval(intervalId);
          setPhase("recall");
          setRecallStartedAt(Date.now());
          return 0;
        }
        return value - 1;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [config.memorizeSec, phase]);

  const selectedCount = selected.size;

  const targetSet = useMemo(() => new Set(targets), [targets]);

  function startRound(): void {
    const nextTargets = randomUniqueIndices(BOARD_SIZE * BOARD_SIZE, config.targets);
    setTargets(nextTargets);
    setSelected(new Set());
    setResultDurationSec(0);
    setRecallStartedAt(null);
    setPhase("memorize");
  }

  function toggleCell(index: number): void {
    if (phase !== "recall") {
      return;
    }
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  function finishRecall(): void {
    if (phase !== "recall") {
      return;
    }

    const now = Date.now();
    if (recallStartedAt != null) {
      setResultDurationSec(Math.max(0, Math.floor((now - recallStartedAt) / 1000)));
    }
    setPhase("result");
  }

  function resetToSetup(): void {
    setPhase("setup");
    setTargets([]);
    setSelected(new Set());
    setCountdown(0);
    setRecallStartedAt(null);
    setResultDurationSec(0);
  }

  const hits = [...selected].filter((cell) => targetSet.has(cell)).length;
  const misses = targets.filter((cell) => !selected.has(cell)).length;
  const falseHits = [...selected].filter((cell) => !targetSet.has(cell)).length;
  const errors = misses + falseHits;
  const accuracy = targets.length === 0 ? 0 : (hits / targets.length) * 100;
  const score = Math.max(0, Math.round(accuracy * 5 - errors * 10 - resultDurationSec * 2));

  return (
    <section className="panel" data-testid="spatial-memory-page">
      <h2>Spatial Memory (альфа)</h2>
      <p>Запомните позиции подсвеченных клеток и восстановите их.</p>

      {phase === "setup" ? (
        <>
          <div className="segmented-row">
            {(["easy", "medium", "hard"] as const).map((level) => (
              <button
                key={level}
                type="button"
                className={difficulty === level ? "btn-secondary is-active" : "btn-secondary"}
                onClick={() => setDifficulty(level)}
              >
                {CONFIGS[level].label}
              </button>
            ))}
          </div>

          <div className="setup-block">
            <p>Поле: {BOARD_SIZE}x{BOARD_SIZE}</p>
            <p>Объектов: {config.targets}</p>
            <p>Фаза запоминания: {config.memorizeSec} сек</p>
          </div>

          <div className="action-row">
            <button type="button" className="btn-primary" onClick={startRound}>
              Начать
            </button>
            <Link className="btn-ghost" to="/training">
              К тренировкам
            </Link>
          </div>
        </>
      ) : null}

      {phase === "memorize" ? (
        <>
          <p className="status-line">Запоминайте позиции… {countdown}</p>
          <div className="spatial-grid" data-testid="spatial-grid-memorize">
            {Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, index) => (
              <div
                key={index}
                className={targetSet.has(index) ? "spatial-cell is-target" : "spatial-cell"}
              />
            ))}
          </div>
        </>
      ) : null}

      {phase === "recall" ? (
        <>
          <p className="status-line">Выберите клетки, которые были подсвечены: {selectedCount}/{targets.length}</p>
          <div className="spatial-grid" data-testid="spatial-grid-recall">
            {Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, index) => (
              <button
                key={index}
                type="button"
                className={selected.has(index) ? "spatial-cell-button is-selected" : "spatial-cell-button"}
                onClick={() => toggleCell(index)}
              />
            ))}
          </div>
          <div className="action-row">
            <button type="button" className="btn-primary" onClick={finishRecall}>
              Готово
            </button>
          </div>
        </>
      ) : null}

      {phase === "result" ? (
        <>
          <div className="setup-block" data-testid="spatial-memory-result">
            <h3>Результат</h3>
            <p>Верно: {hits} из {targets.length}</p>
            <p>Пропуски: {misses}</p>
            <p>Лишние: {falseHits}</p>
            <p>Точность: {accuracy.toFixed(1)}%</p>
            <p>Время ответа: {resultDurationSec} c</p>
            <p>Score: {score}</p>
          </div>
          <div className="action-row">
            <button type="button" className="btn-primary" onClick={startRound}>
              Сыграть ещё
            </button>
            <button type="button" className="btn-secondary" onClick={resetToSetup}>
              Сменить сложность
            </button>
            <Link className="btn-ghost" to="/training">
              К тренировкам
            </Link>
          </div>
        </>
      ) : null}
    </section>
  );
}
