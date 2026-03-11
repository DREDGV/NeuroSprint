import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useActiveUserDisplayName } from "../app/useActiveUserDisplayName";
import {
  sessionRepository,
  type SessionSaveResult
} from "../entities/session/sessionRepository";
import { trainingRepository } from "../entities/training/trainingRepository";
import {
  DIFFICULTY_PRESETS,
  evaluateMemoryGridSession,
  generateMemoryGridSequence,
  getGridCells,
  getStepIntervalMs,
  MEMORY_GRID_PAUSE_MS,
  MEMORY_GRID_SHOW_MS,
  modeIdFromMemoryGridMode,
  normalizeMemoryGridSetup,
  type MemoryGridLevel,
  type MemoryGridSessionMetrics,
  type MemoryGridSetup
} from "../features/memory-grid/engine";
import { getMemoryGridSetup } from "../features/memory-grid/setupStorage";
import { DEFAULT_AUDIO_SETTINGS } from "../shared/lib/audio/audioSettings";
import { toLocalDateKey } from "../shared/lib/date/date";
import { createId } from "../shared/lib/id";
import { buildSessionProgressNotes } from "../shared/lib/progress/sessionProgressFeedback";
import { SessionResultSummary } from "../shared/ui/SessionResultSummary";
import { StatCard } from "../shared/ui/StatCard";
import type { Session, TimeLimitSec } from "../shared/types/domain";
import { SessionRewardQueue } from "../widgets/SessionRewardQueue";

interface MemoryGridSessionNavState {
  setup?: MemoryGridSetup;
}

type GamePhase = "intro" | "showing" | "recalling" | "finished";

function formatSeconds(ms: number): string {
  return `${Math.max(0, Math.round(ms / 1000))} сек`;
}

function formatSigned(value: number, digits = 2): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}`;
}

function arraysEqual(left: number[], right: number[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false;
    }
  }
  return true;
}

function pickBestSession(sessions: Session[]): Session | null {
  if (sessions.length === 0) {
    return null;
  }
  return sessions.reduce((best, current) => (current.score > best.score ? current : best));
}

function buildSession(
  userId: string,
  setup: MemoryGridSetup,
  metrics: MemoryGridSessionMetrics,
  durationMs: number
): Session {
  const now = new Date();
  const modeId = modeIdFromMemoryGridMode(setup.mode, setup.difficulty, setup.gridSize);
  const safeDurationMs = Math.max(1, Math.round(durationMs));
  const speed = metrics.levelsCompleted / (safeDurationMs / 60_000);

  return {
    id: createId(),
    userId,
    taskId: "memory_grid",
    mode: "memory_grid",
    moduleId: "memory_grid",
    modeId,
    level: setup.startLevel,
    presetId: "legacy",
    adaptiveSource: "manual",
    timestamp: now.toISOString(),
    localDate: toLocalDateKey(now),
    durationMs: safeDurationMs,
    score: metrics.score,
    accuracy: metrics.accuracy,
    speed,
    errors: metrics.errors,
    correctCount: metrics.correct,
    effectiveCorrect: metrics.correct - metrics.errors * 0.5,
    audioEnabledSnapshot: DEFAULT_AUDIO_SETTINGS,
    difficulty: {
      gridSize: setup.gridSize,
      numbersCount: metrics.spanMax,
      mode: "memory_grid",
      timeLimitSec:
        setup.mode === "rush" ? ((setup.durationSec ?? 60) as TimeLimitSec) : undefined,
      errorPenalty: 0.5
    }
  };
}

export function MemoryGridSessionPage() {
  const location = useLocation();
  const { activeUserId, activeUserName } = useActiveUserDisplayName();
  const state = (location.state as MemoryGridSessionNavState | null) ?? null;

  const [setup] = useState<MemoryGridSetup>(() =>
    normalizeMemoryGridSetup(state?.setup ?? getMemoryGridSetup())
  );

  const [phase, setPhase] = useState<GamePhase>("intro");
  const [tickMs, setTickMs] = useState(() => Date.now());
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null);
  const [sessionDurationMs, setSessionDurationMs] = useState(0);

  const [currentLevel, setCurrentLevel] = useState<MemoryGridLevel>(setup.startLevel);
  const [currentSequence, setCurrentSequence] = useState<number[]>([]);
  const [response, setResponse] = useState<number[]>([]);
  const [activeCell, setActiveCell] = useState<number | null>(null);
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [wrongCells, setWrongCells] = useState<Set<number>>(new Set());
  const [correctCells, setCorrectCells] = useState<Set<number>>(new Set());
  const [lastStepCorrect, setLastStepCorrect] = useState<boolean | null>(null);
  const [statusText, setStatusText] = useState("Нажмите «Старт», когда будете готовы.");
  const [isInputLocked, setIsInputLocked] = useState(false);
  const [showingProgress, setShowingProgress] = useState(0);

  const [levelsTotal, setLevelsTotal] = useState(0);
  const [correctTotal, setCorrectTotal] = useState(0);
  const [errorsTotal, setErrorsTotal] = useState(0);
  const [bestSpan, setBestSpan] = useState(setup.startLevel);

  const [result, setResult] = useState<MemoryGridSessionMetrics | null>(null);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [previousSession, setPreviousSession] = useState<Session | null>(null);
  const [bestSession, setBestSession] = useState<Session | null>(null);
  const [sessionProgress, setSessionProgress] = useState<SessionSaveResult | null>(null);

  const timersRef = useRef<number[]>([]);
  const recallStartedAtRef = useRef<number | null>(null);
  const sequencesRef = useRef<number[][]>([]);
  const responsesRef = useRef<number[][]>([]);
  const recallTimesRef = useRef<number[]>([]);

  const isRush = setup.mode === "rush";
  const rushDurationMs = (setup.durationSec ?? 60) * 1000;
  const totalCells = getGridCells(setup.gridSize);
  const stepIntervalMs = getStepIntervalMs(setup.difficulty);
  const difficultyTitle = DIFFICULTY_PRESETS[setup.difficulty].title;

  const elapsedMs =
    sessionStartedAt == null ? 0 : Math.max(0, Math.min(tickMs - sessionStartedAt, rushDurationMs));
  const rushRemainingMs = isRush ? Math.max(0, rushDurationMs - elapsedMs) : 0;
  const rushProgressPct = isRush ? Math.min(100, (elapsedMs / rushDurationMs) * 100) : 0;

  function clearTimers(): void {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }

  function addTimer(id: number): void {
    timersRef.current.push(id);
  }

  function resetRuntime(): void {
    clearTimers();
    recallStartedAtRef.current = null;
    sequencesRef.current = [];
    responsesRef.current = [];
    recallTimesRef.current = [];

    setTickMs(Date.now());
    setSessionStartedAt(null);
    setSessionDurationMs(0);
    setCurrentLevel(setup.startLevel);
    setCurrentSequence([]);
    setResponse([]);
    setActiveCell(null);
    setSelectedCell(null);
    setWrongCells(new Set());
    setCorrectCells(new Set());
    setLastStepCorrect(null);
    setStatusText("Нажмите «Старт», когда будете готовы.");
    setIsInputLocked(false);
    setShowingProgress(0);
    setLevelsTotal(0);
    setCorrectTotal(0);
    setErrorsTotal(0);
    setBestSpan(setup.startLevel);
    setResult(null);
    setSaved(false);
    setSaveError(null);
    setPreviousSession(null);
    setBestSession(null);
    setPhase("intro");
  }

  function updateCounters(
    nextSequences: number[][],
    nextResponses: number[][]
  ): void {
    const levels = nextSequences.length;
    let correct = 0;
    let best = setup.startLevel;
    for (let index = 0; index < levels; index += 1) {
      const seq = nextSequences[index] ?? [];
      const rsp = nextResponses[index] ?? [];
      if (arraysEqual(seq, rsp)) {
        correct += 1;
        best = Math.max(best, seq.length) as MemoryGridLevel;
      }
    }
    setLevelsTotal(levels);
    setCorrectTotal(correct);
    setErrorsTotal(Math.max(0, levels - correct));
    setBestSpan(best as MemoryGridLevel);
  }

  function finishSession(): void {
    if (phase === "finished") {
      return;
    }

    clearTimers();
    setPhase("finished");
    setActiveCell(null);
    setIsInputLocked(true);
    setStatusText("Сессия завершена.");

    const durationMs =
      sessionStartedAt == null ? 0 : Math.max(1, Date.now() - sessionStartedAt);
    setSessionDurationMs(durationMs);

    const metrics = evaluateMemoryGridSession({
      sequences: sequencesRef.current,
      userResponses: responsesRef.current,
      recallTimesMs: recallTimesRef.current,
      mode: setup.mode,
      startLevel: setup.startLevel
    });
    setResult(metrics);
  }

  function startLevel(level: MemoryGridLevel, fixedSequence?: number[]): void {
    clearTimers();

    const nextSequence =
      fixedSequence ?? generateMemoryGridSequence(level, setup.gridSize);

    setCurrentLevel(level);
    setCurrentSequence(nextSequence);
    setResponse([]);
    setActiveCell(null);
    setSelectedCell(null);
    setWrongCells(new Set());
    setCorrectCells(new Set());
    setLastStepCorrect(null);
    setStatusText(`Запомните последовательность из ${nextSequence.length} клеток.`);
    setIsInputLocked(true);
    setShowingProgress(0);
    setPhase("showing");

    const totalMs = nextSequence.length * stepIntervalMs;
    const progressTick = window.setInterval(() => {
      setShowingProgress((value) => {
        const next = value + (100 * 80) / Math.max(totalMs, 1);
        return Math.min(100, next);
      });
    }, 80);
    addTimer(progressTick as unknown as number);

    nextSequence.forEach((cell, index) => {
      const showAt = index * stepIntervalMs;
      addTimer(
        window.setTimeout(() => {
          setActiveCell(cell);
        }, showAt)
      );
      addTimer(
        window.setTimeout(() => {
          setActiveCell(null);
        }, showAt + MEMORY_GRID_SHOW_MS)
      );
    });

    addTimer(
      window.setTimeout(() => {
        window.clearInterval(progressTick);
        setShowingProgress(100);
        setPhase("recalling");
        setIsInputLocked(false);
        setStatusText(`Повторите порядок из ${nextSequence.length} клеток.`);
        recallStartedAtRef.current = Date.now();
      }, totalMs + MEMORY_GRID_PAUSE_MS)
    );
  }

  function completeLevel(isCorrect: boolean, finalResponse: number[]): void {
    const recallMs = Math.max(
      1,
      Date.now() - (recallStartedAtRef.current ?? Date.now())
    );

    const nextSequences = [...sequencesRef.current, currentSequence];
    const nextResponses = [...responsesRef.current, finalResponse];
    const nextRecallTimes = [...recallTimesRef.current, recallMs];
    sequencesRef.current = nextSequences;
    responsesRef.current = nextResponses;
    recallTimesRef.current = nextRecallTimes;
    updateCounters(nextSequences, nextResponses);

    if (!isCorrect && !isRush) {
      setStatusText("Ошибка в Classic: сессия завершится через мгновение.");
      addTimer(window.setTimeout(finishSession, 460));
      return;
    }

    const nextLevel = isCorrect
      ? (Math.min(9, currentLevel + 1) as MemoryGridLevel)
      : (Math.max(1, currentLevel - 1) as MemoryGridLevel);

    const nextStatus = isCorrect
      ? `Верно. Переходим на уровень ${nextLevel}.`
      : `Ошибка. Снижаем уровень до ${nextLevel}.`;
    setStatusText(nextStatus);

    addTimer(
      window.setTimeout(() => {
        if (isRush && sessionStartedAt != null && Date.now() - sessionStartedAt >= rushDurationMs) {
          finishSession();
          return;
        }
        startLevel(nextLevel);
      }, 560)
    );
  }

  function handleCellClick(cellIndex: number): void {
    if (phase !== "recalling" || isInputLocked) {
      return;
    }

    const nextIndex = response.length;
    const expectedCell = currentSequence[nextIndex];
    const isCorrect = cellIndex === expectedCell;
    const nextResponse = [...response, cellIndex];

    setResponse(nextResponse);
    setSelectedCell(cellIndex);
    setLastStepCorrect(isCorrect);
    setIsInputLocked(true);

    if (isCorrect) {
      setCorrectCells((prev) => {
        const next = new Set(prev);
        next.add(cellIndex);
        return next;
      });
    } else {
      setWrongCells((prev) => {
        const next = new Set(prev);
        next.add(cellIndex);
        return next;
      });
    }

    const isLevelCompleted = nextResponse.length >= currentSequence.length;
    if (isLevelCompleted || !isCorrect) {
      addTimer(
        window.setTimeout(() => {
          setSelectedCell(null);
          completeLevel(isCorrect && isLevelCompleted, nextResponse);
        }, 220)
      );
      return;
    }

    addTimer(
      window.setTimeout(() => {
        setSelectedCell(null);
        setIsInputLocked(false);
      }, 140)
    );
  }

  function startSession(): void {
    clearTimers();
    sequencesRef.current = [];
    responsesRef.current = [];
    recallTimesRef.current = [];
    setResult(null);
    setSaved(false);
    setSaveError(null);
    setPreviousSession(null);
    setBestSession(null);
    setLevelsTotal(0);
    setCorrectTotal(0);
    setErrorsTotal(0);
    setBestSpan(setup.startLevel);
    setSessionDurationMs(0);
    setSessionStartedAt(Date.now());
    setTickMs(Date.now());
    startLevel(setup.startLevel);
  }

  function replayCurrentLevel(): void {
    if (phase !== "recalling" || currentSequence.length === 0) {
      return;
    }
    startLevel(currentLevel, currentSequence);
  }

  function restartSession(): void {
    startSession();
  }

  useEffect(() => {
    if (phase === "intro" || phase === "finished") {
      return;
    }
    const timer = window.setInterval(() => {
      setTickMs(Date.now());
    }, 100);
    return () => window.clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (!isRush || phase === "intro" || phase === "finished") {
      return;
    }
    if (sessionStartedAt == null) {
      return;
    }
    if (Date.now() - sessionStartedAt >= rushDurationMs) {
      finishSession();
    }
  }, [isRush, phase, rushDurationMs, sessionStartedAt, tickMs]);

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, []);

  useEffect(() => {
    if (!activeUserId || !result || saved) {
      return;
    }

    let cancelled = false;
    const session = buildSession(
      activeUserId,
      setup,
      result,
      sessionDurationMs || (isRush ? rushDurationMs : Math.round(result.avgRecallTimeMs * Math.max(1, result.totalSequences)))
    );
    const modeId = modeIdFromMemoryGridMode(setup.mode, setup.difficulty, setup.gridSize);
    setSessionProgress(null);

    void sessionRepository
      .save(session)
      .then(async (saveResult) => {
        if (cancelled) {
          return;
        }
        setSaved(true);
        setSaveError(null);
        setSessionProgress(saveResult);

        const history = await trainingRepository.listRecentSessionsByMode(
          activeUserId,
          "memory_grid",
          modeId,
          50
        );
        if (cancelled) {
          return;
        }
        const historical = history.filter((entry) => entry.id !== session.id);
        setPreviousSession(historical[0] ?? null);
        setBestSession(pickBestSession(historical));
      })
      .catch(() => {
        if (!cancelled) {
          setSaveError("Не удалось сохранить результаты Memory Grid.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    activeUserId,
    isRush,
    result,
    rushDurationMs,
    saved,
    sessionDurationMs,
    setup
  ]);

  return (
    <section className="panel memory-grid-session-panel" data-testid="memory-grid-session-page">
      <header className="memory-grid-header">
        <div className="memory-grid-header-content">
          <h2 className="memory-grid-title">Memory Grid Rush</h2>
          <p className="memory-grid-subtitle">
            {setup.mode === "classic" ? "Classic" : "Rush"} • {difficultyTitle} •{" "}
            {setup.gridSize}x{setup.gridSize}
          </p>
          <p className="memory-grid-subtitle">
            Активный пользователь: <strong>{activeUserName}</strong>
          </p>
        </div>
        {isRush ? (
          <div className="memory-grid-rush-timer">
            <span className="timer-value">{formatSeconds(rushRemainingMs)}</span>
          </div>
        ) : null}
      </header>

      <div className="stats-grid compact">
        <StatCard title="Уровень" value={String(currentLevel)} />
        <StatCard title="Пройдено уровней" value={String(levelsTotal)} />
        <StatCard title="Верно" value={String(correctTotal)} />
        <StatCard title="Ошибки" value={String(errorsTotal)} />
        <StatCard title="Лучший span" value={String(bestSpan)} />
      </div>

      <div className={`memory-grid-phase-indicator ${phase}`}>
        {phase === "intro" && "Нажмите «Старт», чтобы начать сессию."}
        {phase === "showing" && "Смотрите на подсветку и запоминайте порядок."}
        {phase === "recalling" && "Повторите последовательность кликами по клеткам."}
        {phase === "finished" && "Сессия завершена. Проверьте результаты ниже."}
      </div>

      {isRush && phase !== "intro" && phase !== "finished" ? (
        <div className="today-progress" style={{ marginBottom: 12 }}>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${rushProgressPct}%` }} />
          </div>
          <p className="status-line">Осталось: {formatSeconds(rushRemainingMs)}</p>
        </div>
      ) : null}

      <section className="setup-block memory-grid-section">
        <h3>Игровое поле</h3>
        <div
          className="nback-grid memory-grid"
          style={{ gridTemplateColumns: `repeat(${setup.gridSize}, 1fr)` }}
          data-testid="memory-grid"
        >
          {Array.from({ length: totalCells }, (_, index) => {
            const classes = [
              "nback-cell",
              "memory-grid-cell",
              activeCell === index ? "is-active" : "",
              selectedCell === index ? "is-selected" : "",
              wrongCells.has(index) ? "is-wrong" : "",
              correctCells.has(index) ? "is-correct" : ""
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <button
                key={index}
                type="button"
                className={classes}
                onClick={() => handleCellClick(index)}
                disabled={phase !== "recalling" || isInputLocked}
                data-testid={activeCell === index ? "memory-grid-active-cell" : undefined}
              />
            );
          })}
        </div>

        {phase === "showing" ? (
          <div className="memory-grid-progress-bar">
            <div className="memory-grid-progress-fill" style={{ width: `${showingProgress}%` }} />
          </div>
        ) : null}

        <p className="status-line" data-testid="memory-grid-status">
          {statusText}
        </p>
        {lastStepCorrect != null && phase !== "showing" ? (
          <p className={lastStepCorrect ? "status-line success" : "status-line error"}>
            {lastStepCorrect ? "Последний ход: верно" : "Последний ход: ошибка"}
          </p>
        ) : null}
      </section>

      {phase !== "finished" ? (
        <div className="nback-controls">
          {phase === "recalling" ? (
            <button
              type="button"
              className="nback-btn nback-btn-no"
              onClick={replayCurrentLevel}
              data-testid="memory-grid-show-again-btn"
            >
              Повторить показ
            </button>
          ) : null}
          <button
            type="button"
            className="nback-btn nback-btn-start"
            onClick={phase === "intro" ? startSession : restartSession}
            data-testid="memory-grid-start-btn"
          >
            {phase === "intro" ? "Старт" : "Новая серия"}
          </button>
        </div>
      ) : null}

      {result ? (
        <SessionResultSummary
          testId="memory-grid-result"
          title="Результаты Memory Grid"
          metrics={[
            { label: "Макс. span", value: String(result.spanMax) },
            { label: "Пройдено уровней", value: String(result.levelsCompleted) },
            { label: "Точность", value: `${(result.accuracy * 100).toFixed(1)}%` },
            { label: "Ср. время", value: `${Math.round(result.avgRecallTimeMs)} мс` },
            { label: "Score", value: result.score.toFixed(1) }
          ]}
          previousSummary={
            previousSession
              ? `Прошлый раз: ${formatSigned(result.score - previousSession.score)} по score (было ${previousSession.score.toFixed(1)}).`
              : "Это первая сохраненная попытка в режиме."
          }
          bestSummary={
            bestSession
              ? `Лучший score: ${bestSession.score.toFixed(1)} (${bestSession.localDate}).`
              : null
          }
          tip={
            result.accuracy >= 0.85
              ? "Точность высокая. Можно начинать с более высокого уровня."
              : result.errors > result.correct
                ? "Сделайте акцент на внимательном воспроизведении без спешки."
                : "Хороший баланс. Повторите серию, чтобы закрепить результат."
          }
          saveState={{
            testId: "memory-grid-save-status",
            text: saved ? "saved" : "saving"
          }}
          saveSummary={saved ? "Результаты сохранены." : "Сохраняем результаты..."}
          extraNotes={buildSessionProgressNotes(sessionProgress)}
          retryLabel="Начать заново"
          onRetry={startSession}
        />
      ) : null}

      <SessionRewardQueue
        levelUp={sessionProgress?.levelUp}
        nextGoalSummary={sessionProgress?.nextGoal?.primaryGoal.summary}
        achievements={sessionProgress?.unlockedAchievements}
        userId={activeUserId}
        localDate={toLocalDateKey(new Date())}
      />
      {saveError ? <p className="error-text">{saveError}</p> : null}
    </section>
  );
}
