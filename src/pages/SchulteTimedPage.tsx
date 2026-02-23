import { useEffect, useMemo, useState } from "react";
import { useActiveUser } from "../app/ActiveUserContext";
import { sessionRepository } from "../entities/session/sessionRepository";
import { formatSecondsFromMs, toLocalDateKey } from "../shared/lib/date/date";
import { createId } from "../shared/lib/id";
import { generateSchulteGrid } from "../shared/lib/random/grid";
import {
  calcTimedMetrics,
  type TimedMetrics
} from "../shared/lib/scoring/scoring";
import {
  DEFAULT_SETTINGS,
  getSettings
} from "../shared/lib/settings/settings";
import { SchulteGrid } from "../shared/ui/SchulteGrid";
import { StatCard } from "../shared/ui/StatCard";
import type { Session } from "../shared/types/domain";

type TimeLimit = 30 | 60 | 90;

function normalizeLimit(value: number): TimeLimit {
  if (value === 30 || value === 60 || value === 90) {
    return value;
  }
  return DEFAULT_SETTINGS.timedDefaultLimitSec;
}

function createTimedSession(
  userId: string,
  timestamp: Date,
  timeLimitSec: TimeLimit,
  errors: number,
  correctCount: number,
  errorPenalty: number,
  metrics: TimedMetrics
): Session {
  return {
    id: createId(),
    userId,
    taskId: "schulte",
    mode: "timed",
    timestamp: timestamp.toISOString(),
    localDate: toLocalDateKey(timestamp),
    durationMs: timeLimitSec * 1000,
    score: metrics.score,
    accuracy: metrics.accuracy,
    speed: metrics.speed,
    errors,
    correctCount,
    effectiveCorrect: metrics.effectiveCorrect,
    difficulty: {
      gridSize: 5,
      numbersCount: 25,
      mode: "timed",
      timeLimitSec,
      errorPenalty
    }
  };
}

export function SchulteTimedPage() {
  const { activeUserId } = useActiveUser();
  const savedSettings = getSettings();
  const [timeLimitSec, setTimeLimitSec] = useState<TimeLimit>(() =>
    normalizeLimit(savedSettings.timedDefaultLimitSec)
  );
  const [errorPenalty] = useState<number>(() => savedSettings.timedErrorPenalty);

  const [grid, setGrid] = useState<number[]>(() => generateSchulteGrid(5));
  const [expected, setExpected] = useState(1);
  const [nextSpawn, setNextSpawn] = useState(26);
  const [correctCount, setCorrectCount] = useState(0);
  const [errors, setErrors] = useState(0);
  const [startedAtMs, setStartedAtMs] = useState<number>(() => Date.now());
  const [remainingMs, setRemainingMs] = useState(timeLimitSec * 1000);
  const [finished, setFinished] = useState(false);
  const [finalMetrics, setFinalMetrics] = useState<TimedMetrics | null>(null);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (finished) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      const elapsed = Date.now() - startedAtMs;
      const left = timeLimitSec * 1000 - elapsed;

      if (left <= 0) {
        setRemainingMs(0);
        setFinished(true);
      } else {
        setRemainingMs(left);
      }
    }, 100);

    return () => window.clearInterval(timer);
  }, [finished, startedAtMs, timeLimitSec]);

  useEffect(() => {
    if (!finished || finalMetrics) {
      return;
    }
    const metrics = calcTimedMetrics({
      correctCount,
      errors,
      timeLimitSec,
      errorPenalty
    });
    setFinalMetrics(metrics);
  }, [correctCount, errorPenalty, errors, finalMetrics, finished, timeLimitSec]);

  useEffect(() => {
    if (!activeUserId || !finalMetrics || !finished || saved) {
      return;
    }

    const session = createTimedSession(
      activeUserId,
      new Date(),
      timeLimitSec,
      errors,
      correctCount,
      errorPenalty,
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
  }, [
    activeUserId,
    correctCount,
    errorPenalty,
    errors,
    finalMetrics,
    finished,
    saved,
    timeLimitSec
  ]);

  const effectiveCorrect = useMemo(
    () => correctCount - errors * errorPenalty,
    [correctCount, errorPenalty, errors]
  );

  function resetGame(nextLimit: TimeLimit = timeLimitSec) {
    setGrid(generateSchulteGrid(5));
    setExpected(1);
    setNextSpawn(26);
    setCorrectCount(0);
    setErrors(0);
    setStartedAtMs(Date.now());
    setRemainingMs(nextLimit * 1000);
    setFinished(false);
    setFinalMetrics(null);
    setSaved(false);
    setSaveError(null);
  }

  function onCellClick(value: number, index: number) {
    if (finished) {
      return;
    }

    if (value === expected) {
      setCorrectCount((current) => current + 1);
      setGrid((current) => {
        const next = [...current];
        next[index] = nextSpawn;
        return next;
      });
      setExpected((current) => current + 1);
      setNextSpawn((current) => current + 1);
      return;
    }

    setErrors((current) => current + 1);
  }

  function chooseLimit(limit: TimeLimit) {
    setTimeLimitSec(limit);
    resetGame(limit);
  }

  return (
    <section className="panel" data-testid="timed-page">
      <h2>Таблица Шульте: Timed</h2>
      <p>
        Нажимайте числа по порядку. После правильного клика в клетке появляется
        новое число, и серия продолжается дальше 25.
      </p>

      <div className="segmented-row">
        {[30, 60, 90].map((limit) => (
          <button
            key={limit}
            type="button"
            className={
              timeLimitSec === limit ? "btn-secondary is-active" : "btn-secondary"
            }
            onClick={() => chooseLimit(limit as TimeLimit)}
          >
            {limit} с
          </button>
        ))}
      </div>

      <div className="stats-grid">
        <StatCard title="Осталось" value={formatSecondsFromMs(remainingMs)} />
        <StatCard title="Следующее число" value={finished ? "Стоп" : String(expected)} />
        <StatCard title="Верно" value={String(correctCount)} />
        <StatCard title="Ошибки" value={String(errors)} />
      </div>

      <SchulteGrid values={grid} onCellClick={onCellClick} disabled={finished} />

      <div className="action-row">
        <button type="button" className="btn-primary" onClick={() => resetGame()}>
          Новая попытка
        </button>
      </div>

      {finalMetrics ? (
        <section className="result-box" data-testid="timed-result">
          <h3>Результат</h3>
          <p>effectiveCorrect: {effectiveCorrect.toFixed(2)}</p>
          <p>Точность: {(finalMetrics.accuracy * 100).toFixed(1)}%</p>
          <p>Скорость: {finalMetrics.speed.toFixed(2)} / мин</p>
          <p>Score: {finalMetrics.score.toFixed(2)}</p>
          <p>{saved ? "Сессия сохранена." : "Сохраняем сессию..."}</p>
        </section>
      ) : null}

      {saveError ? <p className="error-text">{saveError}</p> : null}
    </section>
  );
}

