import { useEffect, useMemo, useState } from "react";
import { useActiveUser } from "../app/ActiveUserContext";
import { sessionRepository } from "../entities/session/sessionRepository";
import { toLocalDateKey, formatSecondsFromMs } from "../shared/lib/date/date";
import { createId } from "../shared/lib/id";
import { generateSchulteGrid } from "../shared/lib/random/grid";
import {
  calcClassicMetrics,
  type ClassicMetrics
} from "../shared/lib/scoring/scoring";
import { SchulteGrid } from "../shared/ui/SchulteGrid";
import { StatCard } from "../shared/ui/StatCard";
import type { Session } from "../shared/types/domain";

function createClassicSession(
  userId: string,
  timestamp: Date,
  durationMs: number,
  errors: number,
  metrics: ClassicMetrics
): Session {
  return {
    id: createId(),
    userId,
    taskId: "schulte",
    moduleId: "schulte",
    modeId: "classic_plus",
    level: 1,
    presetId: "legacy",
    adaptiveSource: "legacy",
    mode: "classic",
    timestamp: timestamp.toISOString(),
    localDate: toLocalDateKey(timestamp),
    durationMs,
    score: metrics.score,
    accuracy: metrics.accuracy,
    speed: metrics.speed,
    errors,
    difficulty: {
      gridSize: 5,
      numbersCount: 25,
      mode: "classic"
    }
  };
}

export function SchulteClassicPage() {
  const { activeUserId } = useActiveUser();
  const [grid, setGrid] = useState<number[]>(() => generateSchulteGrid(5));
  const [expected, setExpected] = useState(1);
  const [errors, setErrors] = useState(0);
  const [startedAtMs, setStartedAtMs] = useState<number | null>(null);
  const [finishedAtMs, setFinishedAtMs] = useState<number | null>(null);
  const [finalMetrics, setFinalMetrics] = useState<ClassicMetrics | null>(null);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const isFinished = finishedAtMs !== null;

  useEffect(() => {
    if (!startedAtMs || isFinished) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setTick((current) => current + 1);
    }, 100);
    return () => window.clearInterval(timer);
  }, [startedAtMs, isFinished]);

  useEffect(() => {
    if (!activeUserId || !finalMetrics || !isFinished || saved) {
      return;
    }

    const started = startedAtMs ?? finishedAtMs;
    if (!started || !finishedAtMs) {
      return;
    }
    const durationMs = Math.max(0, finishedAtMs - started);

    const session = createClassicSession(
      activeUserId,
      new Date(finishedAtMs),
      durationMs,
      errors,
      finalMetrics
    );

    let cancelled = false;
    void sessionRepository
      .save(session)
      .then(() => {
        if (!cancelled) {
          setSaved(true);
          setSaveError(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSaveError("Не удалось сохранить результат.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeUserId, errors, finalMetrics, finishedAtMs, isFinished, saved, startedAtMs]);

  const liveDurationMs = useMemo(() => {
    if (!startedAtMs) {
      return 0;
    }
    if (finishedAtMs) {
      return Math.max(0, finishedAtMs - startedAtMs);
    }
    return Math.max(0, Date.now() - startedAtMs);
  }, [finishedAtMs, startedAtMs, tick]);

  function resetGame() {
    setGrid(generateSchulteGrid(5));
    setExpected(1);
    setErrors(0);
    setStartedAtMs(null);
    setFinishedAtMs(null);
    setFinalMetrics(null);
    setSaved(false);
    setSaveError(null);
    setTick(0);
  }

  function onCellClick(value: number) {
    if (isFinished) {
      return;
    }

    const now = Date.now();
    const start = startedAtMs ?? now;
    if (!startedAtMs) {
      setStartedAtMs(now);
    }

    if (value === expected) {
      if (expected === 25) {
        const durationMs = Math.max(0, now - start);
        const metrics = calcClassicMetrics({ durationMs, errors });
        setFinalMetrics(metrics);
        setFinishedAtMs(now);
      } else {
        setExpected((current) => current + 1);
      }
      return;
    }

    setErrors((current) => current + 1);
  }

  return (
    <section className="panel" data-testid="classic-page">
      <h2>Таблица Шульте: Classic</h2>
      <p>
        Найдите числа по порядку от 1 до 25. Ошибки снижают точность и итоговый
        score.
      </p>

      <div className="stats-grid">
        <StatCard title="Следующее число" value={isFinished ? "Готово" : String(expected)} />
        <StatCard title="Ошибки" value={String(errors)} />
        <StatCard title="Время" value={formatSecondsFromMs(liveDurationMs)} />
      </div>

      <SchulteGrid values={grid} onCellClick={onCellClick} disabled={isFinished} />

      <div className="action-row">
        <button type="button" className="btn-primary" onClick={resetGame} data-testid="classic-reset">
          Новая попытка
        </button>
      </div>

      {finalMetrics ? (
        <section className="result-box" data-testid="classic-result">
          <h3>Результат</h3>
          <p>Точность: {(finalMetrics.accuracy * 100).toFixed(1)}%</p>
          <p>Скорость: {finalMetrics.speed.toFixed(2)} чисел/мин</p>
          <p>Score: {finalMetrics.score.toFixed(2)}</p>
          <p>{saved ? "Сессия сохранена." : "Сохраняем сессию..."}</p>
        </section>
      ) : null}

      {saveError ? <p className="error-text">{saveError}</p> : null}
    </section>
  );
}
