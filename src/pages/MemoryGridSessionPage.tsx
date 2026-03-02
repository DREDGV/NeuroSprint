import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useActiveUserDisplayName } from "../app/useActiveUserDisplayName";
import { sessionRepository } from "../entities/session/sessionRepository";
import { trainingRepository } from "../entities/training/trainingRepository";
import {
  evaluateMemoryGridSession,
  generateMemoryGridSequence,
  getCellColor,
  getGridCells,
  MEMORY_GRID_PAUSE_MS,
  MEMORY_GRID_SHOW_MS,
  MEMORY_GRID_STEP_INTERVAL_MS,
  modeIdFromMemoryGridMode,
  normalizeMemoryGridSetup,
  type MemoryGridSessionMetrics,
  type MemoryGridSetup
} from "../features/memory-grid/engine";
import { getMemoryGridSetup } from "../features/memory-grid/setupStorage";
import { DEFAULT_AUDIO_SETTINGS } from "../shared/lib/audio/audioSettings";
import { toLocalDateKey } from "../shared/lib/date/date";
import { createId } from "../shared/lib/id";
import { SessionResultSummary } from "../shared/ui/SessionResultSummary";
import { StatCard } from "../shared/ui/StatCard";
import type { Session, TimeLimitSec, Mode } from "../shared/types/domain";
import type { MemoryGridLevel } from "../features/memory-grid/engine";

interface MemoryGridSessionNavState {
  setup?: MemoryGridSetup;
}

function formatMs(ms: number): string {
  return `${Math.max(0, Math.round(ms / 1000))} сек`;
}

function formatSigned(value: number, digits = 2): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}`;
}

function pickBestSession(sessions: Session[]): Session | null {
  if (sessions.length === 0) return null;
  return sessions.reduce((best, current) => (current.score > best.score ? current : best));
}

function buildSession(
  userId: string,
  setup: MemoryGridSetup,
  metrics: MemoryGridSessionMetrics
): Session {
  const now = new Date();
  const modeId = modeIdFromMemoryGridMode(setup.mode, setup.gridSize) as any;

  return {
    id: createId(),
    userId,
    taskId: "memory_grid",
    mode: "memory_grid" as any,
    moduleId: "memory_grid",
    modeId,
    level: setup.startLevel,
    presetId: "legacy",
    adaptiveSource: "manual",
    timestamp: now.toISOString(),
    localDate: toLocalDateKey(now),
    durationMs: setup.mode === "rush" ? (setup.durationSec ?? 60) * 1000 : metrics.avgRecallTimeMs * metrics.totalSequences,
    score: metrics.score,
    accuracy: metrics.accuracy,
    speed: metrics.levelsCompleted / (metrics.avgRecallTimeMs / 60000 || 1),
    errors: metrics.errors,
    correctCount: metrics.correct,
    effectiveCorrect: metrics.correct - metrics.errors * 0.5,
    audioEnabledSnapshot: DEFAULT_AUDIO_SETTINGS,
    difficulty: {
      gridSize: setup.gridSize,
      numbersCount: metrics.spanMax,
      mode: "memory_grid" as any,
      timeLimitSec: setup.mode === "rush" ? (setup.durationSec ?? 60) as any : undefined,
      errorPenalty: 0.5
    }
  };
}

type GamePhase = "intro" | "showing" | "recalling" | "finished";

export function MemoryGridSessionPage() {
  const location = useLocation();
  const { activeUserId, activeUserName } = useActiveUserDisplayName();
  const state = (location.state as MemoryGridSessionNavState | null) ?? null;
  const [setup] = useState<MemoryGridSetup>(() =>
    normalizeMemoryGridSetup(state?.setup ?? getMemoryGridSetup())
  );

  const [phase, setPhase] = useState<GamePhase>("intro");
  const [currentLevel, setCurrentLevel] = useState(setup.startLevel);
  const [currentSequence, setCurrentSequence] = useState<number[]>([]);
  const [userResponse, setUserResponse] = useState<number[]>([]);
  const [sequences, setSequences] = useState<number[][]>([]);
  const [userResponses, setUserResponses] = useState<number[][]>([]);
  const [recallTimes, setRecallTimes] = useState<number[]>([]);
  const [recallStartTime, setRecallStartTime] = useState<number | null>(null);
  const [tickMs, setTickMs] = useState<number>(Date.now());
  const [phaseElapsedMs, setPhaseElapsedMs] = useState<number>(0);
  const [result, setResult] = useState<MemoryGridSessionMetrics | null>(null);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [previousSession, setPreviousSession] = useState<Session | null>(null);
  const [bestSession, setBestSession] = useState<Session | null>(null);
  const [activeCell, setActiveCell] = useState<number | null>(null);
  const [selectedCell, setSelectedCell] = useState<number | null>(null);

  const totalCells = getGridCells(setup.gridSize);
  const isRush = setup.mode === "rush";
  const rushDurationMs = (setup.durationSec ?? 60) * 1000;
  const sessionElapsedMs = useMemo(() => {
    if (!isRush || phase === "intro" || phase === "finished") return 0;
    return sequences.length * (MEMORY_GRID_SHOW_MS + MEMORY_GRID_PAUSE_MS) + recallTimes.reduce((a, b) => a + b, 0);
  }, [sequences.length, recallTimes, isRush, phase]);

  // Timer for phases
  useEffect(() => {
    if (phase === "intro" || phase === "finished") return;

    const timer = window.setInterval(() => {
      setTickMs(Date.now());
      setPhaseElapsedMs((prev) => {
        const next = prev + 50;
        
        // Check rush mode timeout
        if (isRush && sessionElapsedMs + next >= rushDurationMs) {
          finishSession();
          return prev;
        }

        // Phase transitions
        if (phase === "showing" && next >= MEMORY_GRID_SHOW_MS) {
          startRecallPhase();
          return 0;
        }
        
        return next;
      });
    }, 50);

    return () => window.clearInterval(timer);
  }, [phase, isRush, sessionElapsedMs]);

  function startSession(): void {
    setPhase("intro");
    setCurrentLevel(setup.startLevel);
    setSequences([]);
    setUserResponses([]);
    setRecallTimes([]);
    setResult(null);
    setSaved(false);
    setSaveError(null);
    setPreviousSession(null);
    setBestSession(null);
    startLevel(setup.startLevel);
  }

  function startLevel(level: number): void {
    const sequence = generateMemoryGridSequence(level, setup.gridSize);
    setCurrentSequence(sequence);
    setCurrentLevel(level as MemoryGridLevel);
    setUserResponse([]);
    setSelectedCell(null);
    setPhaseElapsedMs(0);
    setPhase("showing");
    
    // Показ последовательности с комфортной скоростью
    let index = 0;
    const showInterval = window.setInterval(() => {
      if (index < sequence.length) {
        setActiveCell(sequence[index]);
        // Клетка горит 400мс, потом гаснет
        setTimeout(() => setActiveCell(null), 400);
        index += 1;
      } else {
        window.clearInterval(showInterval);
      }
    }, MEMORY_GRID_STEP_INTERVAL_MS); // 1500мс между клетками
  }

  function startRecallPhase(): void {
    setPhase("recalling");
    setRecallStartTime(Date.now());
  }

  function handleCellClick(cellIndex: number): void {
    if (phase !== "recalling") return;

    const newResponse = [...userResponse, cellIndex];
    setUserResponse(newResponse);
    setSelectedCell(cellIndex);

    // Check if sequence complete
    if (newResponse.length >= currentLevel) {
      const recallTime = Date.now() - (recallStartTime ?? Date.now());
      completeLevel(newResponse, recallTime);
    }

    // Clear selection highlight after delay
    setTimeout(() => setSelectedCell(null), 200);
  }

  function completeLevel(response: number[], recallTime: number): void {
    const isCorrect = arraysEqual(response, currentSequence);
    
    setSequences((prev) => [...prev, currentSequence]);
    setUserResponses((prev) => [...prev, response]);
    setRecallTimes((prev) => [...prev, recallTime]);

    if (isCorrect) {
      // Next level (максимум 7)
      setTimeout(() => {
        const nextLevel = Math.min(7, currentLevel + 1);
        startLevel(nextLevel);
      }, 500);
    } else {
      // Wrong answer
      if (!isRush) {
        // Classic mode: game over
        finishSession();
      } else {
        // Rush mode: decrease level and continue
        setTimeout(() => {
          const nextLevel = Math.max(1, currentLevel - 1);
          startLevel(nextLevel);
        }, 500);
      }
    }
  }

  function finishSession(): void {
    setPhase("finished");
    
    const metrics = evaluateMemoryGridSession({
      sequences,
      userResponses,
      recallTimesMs: recallTimes,
      mode: setup.mode,
      startLevel: setup.startLevel
    });
    
    setResult(metrics);
  }

  useEffect(() => {
    if (!activeUserId || !result || saved) return;

    let cancelled = false;
    const session = buildSession(activeUserId, setup, result);
    const modeId = modeIdFromMemoryGridMode(setup.mode, setup.gridSize);

    void sessionRepository
      .save(session)
      .then(async () => {
        if (cancelled) return;
        setSaved(true);
        setSaveError(null);

        const history = await trainingRepository.listRecentSessionsByMode(
          activeUserId,
          "memory_grid",
          modeId,
          50
        );

        if (cancelled) return;
        const historical = history.filter((entry) => entry.id !== session.id);
        setPreviousSession(historical[0] ?? null);
        setBestSession(pickBestSession(historical));
      })
      .catch(() => {
        if (!cancelled) setSaveError("Не удалось сохранить результаты.");
      });

    return () => { cancelled = true; };
  }, [activeUserId, result, saved, setup]);

  function arraysEqual(a: number[], b: number[]): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  const showingProgress = phase === "showing" ? (phaseElapsedMs / MEMORY_GRID_SHOW_MS) * 100 : 0;
  const rushProgress = isRush ? Math.min(100, (sessionElapsedMs / rushDurationMs) * 100) : 0;

  return (
    <section className="panel" data-testid="memory-grid-session-page">
      <h2>Memory Grid Rush</h2>
      <p>
        Запомните последовательность подсвеченных клеток и воспроизведите её кликами.
      </p>
      <p className="active-user-inline" data-testid="session-active-user">
        Активный пользователь: <strong>{activeUserName}</strong>
      </p>

      <div className="stats-grid">
        <StatCard title="Уровень" value={String(currentLevel)} />
        <StatCard title="Серия" value={String(sequences.length)} />
        <StatCard title="Лучший" value={String(result?.spanMax ?? Math.max(...sequences.map(s => s.length), setup.startLevel))} />
        {isRush && <StatCard title="Время" value={formatMs(rushDurationMs - sessionElapsedMs)} />}
      </div>

      {isRush && (
        <div className="today-progress" style={{ marginTop: 12 }}>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${rushProgress}%` }} />
          </div>
          <p className="status-line">Осталось: {formatMs(Math.max(0, rushDurationMs - sessionElapsedMs))}</p>
        </div>
      )}

      {/* Phase indicator */}
      <div className={`memory-grid-phase-indicator ${phase}`}>
        {phase === "intro" && "Нажмите Старт"}
        {phase === "showing" && "Запомните последовательность!"}
        {phase === "recalling" && "Воспроизведите последовательность"}
        {phase === "finished" && "Сессия завершена"}
      </div>

      {/* Game grid */}
      <section className="setup-block">
        <h3>Игровое поле</h3>
        <div 
          className="nback-grid memory-grid"
          style={{ gridTemplateColumns: `repeat(${setup.gridSize}, 1fr)` }}
          data-testid="memory-grid"
        >
          {Array.from({ length: totalCells }, (_, index) => {
            const isActive = activeCell === index;
            const isSelected = selectedCell === index;
            const cellColor = getCellColor(index);
            return (
              <div
                key={index}
                className={`nback-cell memory-grid-cell${isActive ? " is-active" : ""}${isSelected ? " is-selected" : ""}`}
                onClick={() => handleCellClick(index)}
                style={{
                  backgroundColor: isActive ? cellColor : isSelected ? cellColor + "40" : "transparent",
                  borderColor: isActive || isSelected ? cellColor : "#c8dfd6",
                  cursor: phase === "recalling" ? "pointer" : "default"
                }}
                data-testid={isActive ? "memory-grid-active-cell" : undefined}
              >
                {isActive && <span className="nback-cell-content">●</span>}
              </div>
            );
          })}
        </div>

        {phase === "showing" && (
          <div className="memory-grid-progress-bar">
            <div className="memory-grid-progress-fill" style={{ width: `${showingProgress}%` }} />
          </div>
        )}

        <p className="status-line" data-testid="memory-grid-status">
          {phase === "showing" && `Показ последовательности из ${currentLevel} клеток...`}
          {phase === "recalling" && `Воспроизведите ${currentLevel} клеток`}
          {phase === "finished" && "Результаты ниже"}
        </p>
      </section>

      {/* Controls */}
      {phase !== "finished" && (
        <div className="action-row">
          <button
            type="button"
            className="btn-primary"
            onClick={startSession}
            disabled={phase === "showing" || phase === "recalling"}
            data-testid="memory-grid-start-btn"
          >
            {phase === "intro" ? "Старт" : "Заново"}
          </button>
        </div>
      )}

      {/* Results */}
      {result && (
        <SessionResultSummary
          testId="memory-grid-result"
          title="Результаты Memory Grid"
          metrics={[
            { label: "Макс. длина", value: String(result.spanMax) },
            { label: "Уровней пройдено", value: String(result.levelsCompleted) },
            { label: "Точность", value: `${(result.accuracy * 100).toFixed(1)}%` },
            { label: "Ср. время", value: `${Math.round(result.avgRecallTimeMs)} мс` },
            { label: "Score", value: result.score.toFixed(1) }
          ]}
          previousSummary={
            previousSession
              ? `Прошлый раз: ${formatSigned(result.score - previousSession.score)} (было ${previousSession.score.toFixed(1)})`
              : "Первая попытка в этом режиме"
          }
          bestSummary={
            bestSession
              ? `Рекорд: ${bestSession.score.toFixed(1)} (${bestSession.localDate})`
              : null
          }
          tip={
            result.accuracy > 0.8
              ? "Отличная память! Попробуйте начать с более высокого уровня."
              : result.errors > result.correct
              ? "Сосредоточьтесь на запоминании. Не торопитесь при воспроизведении."
              : "Хороший результат! Продолжайте тренироваться."
          }
          saveState={{ testId: "memory-grid-save-status", text: saved ? "saved" : "saving" }}
          saveSummary={saved ? "Сохранено" : "Сохраняем..."}
          retryLabel="Ещё раз"
          onRetry={startSession}
        />
      )}

      {saveError && <p className="error-text">{saveError}</p>}
    </section>
  );
}
