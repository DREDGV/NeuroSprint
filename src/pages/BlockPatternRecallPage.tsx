import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  getExperimentalModuleCurrentMilestone,
  getExperimentalModuleMeta,
  getExperimentalModuleProgress,
  getExperimentalModulePromotionReadiness
} from "../shared/lib/training/experimentalModules";

type PatternDifficulty = "easy" | "medium" | "hard";
type PatternMode = "classic" | "rotation" | "mirror";
type PatternPhase = "setup" | "memorize" | "recall" | "result";

interface DifficultyConfig {
  label: string;
  blocks: number;
  memorizeSec: number;
}

const GRID = 4;

const DIFFICULTIES: Record<PatternDifficulty, DifficultyConfig> = {
  easy: { label: "Легко", blocks: 3, memorizeSec: 3 },
  medium: { label: "Средне", blocks: 5, memorizeSec: 3 },
  hard: { label: "Сложно", blocks: 7, memorizeSec: 4 }
};

function randomSet(size: number, count: number): number[] {
  const values = Array.from({ length: size }, (_, index) => index);
  for (let i = values.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  return values.slice(0, count);
}

function rotate90(index: number, grid: number): number {
  const row = Math.floor(index / grid);
  const col = index % grid;
  return col * grid + (grid - 1 - row);
}

function rotate(index: number, grid: number, angle: 90 | 180 | 270): number {
  if (angle === 90) {
    return rotate90(index, grid);
  }
  if (angle === 180) {
    return rotate90(rotate90(index, grid), grid);
  }
  return rotate90(rotate90(rotate90(index, grid), grid), grid);
}

function mirrorHorizontal(index: number, grid: number): number {
  const row = Math.floor(index / grid);
  const col = index % grid;
  return row * grid + (grid - 1 - col);
}

export function BlockPatternRecallPage() {
  const experimentalMeta = getExperimentalModuleMeta("block_pattern");
  const [difficulty, setDifficulty] = useState<PatternDifficulty>("easy");
  const [mode, setMode] = useState<PatternMode>("classic");
  const [phase, setPhase] = useState<PatternPhase>("setup");
  const [basePattern, setBasePattern] = useState<number[]>([]);
  const [expectedPattern, setExpectedPattern] = useState<number[]>([]);
  const [rotationAngle, setRotationAngle] = useState<90 | 180 | 270>(90);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [countdown, setCountdown] = useState(0);

  const config = DIFFICULTIES[difficulty];

  useEffect(() => {
    if (phase !== "memorize") {
      return;
    }

    setCountdown(config.memorizeSec);
    const timerId = window.setInterval(() => {
      setCountdown((value) => {
        if (value <= 1) {
          window.clearInterval(timerId);
          setPhase("recall");
          return 0;
        }
        return value - 1;
      });
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [config.memorizeSec, phase]);

  const baseSet = useMemo(() => new Set(basePattern), [basePattern]);
  const expectedSet = useMemo(() => new Set(expectedPattern), [expectedPattern]);

  function startRound(): void {
    const pattern = randomSet(GRID * GRID, config.blocks);
    const angleOptions: Array<90 | 180 | 270> = [90, 180, 270];
    const randomAngle = angleOptions[Math.floor(Math.random() * angleOptions.length)];

    let expected = [...pattern];
    if (mode === "rotation") {
      expected = pattern.map((cell) => rotate(cell, GRID, randomAngle));
    } else if (mode === "mirror") {
      expected = pattern.map((cell) => mirrorHorizontal(cell, GRID));
    }

    setRotationAngle(randomAngle);
    setBasePattern(pattern);
    setExpectedPattern(expected);
    setSelected(new Set());
    setPhase("memorize");
  }

  function resetToSetup(): void {
    setPhase("setup");
    setBasePattern([]);
    setExpectedPattern([]);
    setSelected(new Set());
    setCountdown(0);
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
    setPhase("result");
  }

  const hits = [...selected].filter((cell) => expectedSet.has(cell)).length;
  const misses = expectedPattern.filter((cell) => !selected.has(cell)).length;
  const falseHits = [...selected].filter((cell) => !expectedSet.has(cell)).length;
  const accuracy = expectedPattern.length === 0 ? 0 : (hits / expectedPattern.length) * 100;
  const score = Math.max(0, Math.round(accuracy * 8 - (misses + falseHits) * 12));
  const progress = experimentalMeta ? getExperimentalModuleProgress(experimentalMeta) : 0;
  const currentMilestone = experimentalMeta ? getExperimentalModuleCurrentMilestone(experimentalMeta) : null;
  const readiness = experimentalMeta ? getExperimentalModulePromotionReadiness(experimentalMeta) : null;

  const instruction =
    mode === "classic"
      ? "Повторите фигуру как была."
      : mode === "rotation"
        ? `Повторите фигуру после поворота на ${rotationAngle}°.`
        : "Повторите зеркальную версию фигуры.";

  return (
    <section className="panel" data-testid="block-pattern-page">
      <h2>Block Pattern Recall (альфа)</h2>
      <p>Запомните фигуру из блоков и воспроизведите её по правилу.</p>
      {experimentalMeta ? (
        <div className="setup-block experimental-module-status" data-testid="experimental-status-block-pattern">
          <div className="experimental-module-status-head">
            <div>
              <p className="stats-section-kicker">Статус разработки</p>
              <h3>{experimentalMeta.stageLabel}</h3>
            </div>
            <strong>{progress}%</strong>
          </div>
          <div className="training-alpha-progress-track" aria-hidden="true">
            <span className="training-alpha-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <p className="comparison-note">
            {currentMilestone?.label ?? experimentalMeta.stageLabel}. {experimentalMeta.nextFocus}
          </p>
          {readiness ? (
            <div className={`experimental-module-readiness is-${readiness.tier}`}>
              <strong>Готовность к переводу: {readiness.score}/100</strong>
              <span>{readiness.label}</span>
              <p>{readiness.summary}</p>
            </div>
          ) : null}
        </div>
      ) : null}

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
                {DIFFICULTIES[level].label}
              </button>
            ))}
          </div>

          <div className="segmented-row">
            {(["classic", "rotation", "mirror"] as const).map((nextMode) => (
              <button
                key={nextMode}
                type="button"
                className={mode === nextMode ? "btn-secondary is-active" : "btn-secondary"}
                onClick={() => setMode(nextMode)}
              >
                {nextMode === "classic" ? "Classic" : nextMode === "rotation" ? "Rotation" : "Mirror"}
              </button>
            ))}
          </div>

          <div className="setup-block">
            <p>Сетка: 4x4</p>
            <p>Блоков в паттерне: {config.blocks}</p>
            <p>Режим: {mode}</p>
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
          <p className="status-line">Запомните фигуру ({countdown}) — {instruction}</p>
          <div className="pattern-grid" data-testid="block-pattern-grid-memorize">
            {Array.from({ length: GRID * GRID }, (_, index) => (
              <div
                key={index}
                className={baseSet.has(index) ? "pattern-cell is-active" : "pattern-cell"}
              />
            ))}
          </div>
        </>
      ) : null}

      {phase === "recall" ? (
        <>
          <p className="status-line">{instruction}</p>
          <div className="pattern-grid" data-testid="block-pattern-grid-recall">
            {Array.from({ length: GRID * GRID }, (_, index) => (
              <button
                key={index}
                type="button"
                className={selected.has(index) ? "pattern-cell-button is-selected" : "pattern-cell-button"}
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
          <div className="setup-block" data-testid="block-pattern-result">
            <h3>Результат</h3>
            <p>Верно: {hits} из {expectedPattern.length}</p>
            <p>Пропуски: {misses}</p>
            <p>Лишние: {falseHits}</p>
            <p>Точность: {accuracy.toFixed(1)}%</p>
            <p>Score: {score}</p>
          </div>

          <div className="action-row">
            <button type="button" className="btn-primary" onClick={startRound}>
              Ещё раунд
            </button>
            <button type="button" className="btn-secondary" onClick={resetToSetup}>
              Сменить режим
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
