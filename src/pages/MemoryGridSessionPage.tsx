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
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);
  const [wrongCells, setWrongCells] = useState<Set<number>>(new Set());
  const [correctCells, setCorrectCells] = useState<Set<number>>(new Set());
  const [shake, setShake] = useState(false);
  const [attemptCount, setAttemptCount] = useState(1);
  const [hintCell, setHintCell] = useState<number | null>(null);
  const [hintOpacity, setHintOpacity] = useState(0);
  const [lastClickTime, setLastClickTime] = useState<number>(0);

  const totalCells = getGridCells(setup.gridSize);
  const isRush = setup.mode === "rush";
  const rushDurationMs = (setup.durationSec ?? 60) * 1000;
  const showingTotalMs = currentLevel * MEMORY_GRID_STEP_INTERVAL_MS;
  const sessionElapsedMs = useMemo(() => {
    if (!isRush || phase === "intro" || phase === "finished") return 0;
    return sequences.length * MEMORY_GRID_STEP_INTERVAL_MS + recallTimes.reduce((a, b) => a + b, 0);
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
        if (phase === "showing" && next >= showingTotalMs) {
          startRecallPhase();
          return 0;
        }
        
        return next;
      });
    }, 50);

    return () => window.clearInterval(timer);
  }, [phase, isRush, sessionElapsedMs, showingTotalMs]);

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
    setLastAnswerCorrect(null);
    startLevel(setup.startLevel);
  }

  function restartSession(): void {
    setSequences([]);
    setUserResponses([]);
    setRecallTimes([]);
    setResult(null);
    setSaved(false);
    setSaveError(null);
    setPreviousSession(null);
    setBestSession(null);
    setLastAnswerCorrect(null);
    setCurrentLevel(setup.startLevel);
    startLevel(setup.startLevel);
  }

  function restartCurrentLevel(): void {
    // Перезапуск текущего уровня (если не запомнил с первого раза)
    setUserResponse([]);
    setSelectedCell(null);
    setLastAnswerCorrect(null);
    startLevel(currentLevel);
  }

  function startLevel(level: number): void {
    const sequence = generateMemoryGridSequence(level, setup.gridSize);
    setCurrentSequence(sequence);
    setCurrentLevel(level as MemoryGridLevel);
    setUserResponse([]);
    setSelectedCell(null);
    setPhaseElapsedMs(0);
    setPhase("showing");
    setLastAnswerCorrect(null);
    setWrongCells(new Set());
    setCorrectCells(new Set());
    setShake(false);
    setAttemptCount(1);
    setHintCell(null);
    setHintOpacity(0);
    setLastClickTime(0);
    
    // Показ последовательности с комфортной скоростью
    let index = 0;
    const showInterval = window.setInterval(() => {
      if (index < sequence.length) {
        setActiveCell(sequence[index]);
        setTimeout(() => setActiveCell(null), 400);
        index += 1;
      } else {
        window.clearInterval(showInterval);
      }
    }, MEMORY_GRID_STEP_INTERVAL_MS);
  }

  function startRecallPhase(): void {
    setPhase("recalling");
    setRecallStartTime(Date.now());
  }

  function handleCellClick(cellIndex: number): void {
    if (phase !== "recalling") return;

    const expectedIndex = currentSequence[userResponse.length];
    const isCorrect = cellIndex === expectedIndex;
    
    const newResponse = [...userResponse, cellIndex];
    setUserResponse(newResponse);
    setSelectedCell(cellIndex);
    setLastClickTime(Date.now());

    // Звуковой эффект
    playSound(isCorrect ? 'success' : 'error');
    
    // Виброотклик для мобильных
    if (navigator.vibrate) {
      navigator.vibrate(isCorrect ? 50 : 200);
    }

    // Визуальная обратная связь
    if (isCorrect) {
      setCorrectCells(prev => new Set(prev).add(cellIndex));
    } else {
      setWrongCells(prev => new Set(prev).add(cellIndex));
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setAttemptCount(prev => prev + 1);
    }

    // Check if sequence complete
    if (newResponse.length >= currentLevel) {
      const recallTime = Date.now() - (recallStartTime ?? Date.now());
      completeLevel(newResponse, recallTime);
    }

    setTimeout(() => setSelectedCell(null), 200);
  }

  function completeLevel(response: number[], recallTime: number): void {
    const isCorrect = arraysEqual(response, currentSequence);
    
    setSequences((prev) => [...prev, currentSequence]);
    setUserResponses((prev) => [...prev, response]);
    setRecallTimes((prev) => [...prev, recallTime]);
    setLastAnswerCorrect(isCorrect);

    if (isCorrect) {
      setTimeout(() => {
        const nextLevel = Math.min(7, currentLevel + 1);
        startLevel(nextLevel);
      }, 800);
    } else {
      if (!isRush) {
        setTimeout(finishSession, 800);
      } else {
        setTimeout(() => {
          const nextLevel = Math.max(1, currentLevel - 1);
          startLevel(nextLevel);
        }, 800);
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
    const modeId = modeIdFromMemoryGridMode(setup.mode, setup.gridSize) as any;

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

  // Простая функция для звуковых эффектов
  function playSound(type: 'success' | 'error' | 'click' | 'hint') {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      if (type === 'success') {
        oscillator.frequency.value = 800;
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
      } else if (type === 'error') {
        oscillator.frequency.value = 200;
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
      } else if (type === 'click') {
        oscillator.frequency.value = 600;
        gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.05);
      } else if (type === 'hint') {
        // Очень тихий звук для подсказки
        oscillator.frequency.value = 400;
        gainNode.gain.setValueAtTime(0.02, audioContext.currentTime);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
      }
    } catch (e) {
      // Игнорируем ошибки аудио (если браузер не поддерживает)
    }
  }

  // Подсветка подсказки если игрок застрял
  useEffect(() => {
    if (phase !== 'recalling' || userResponse.length >= currentLevel) return;
    
    // Через 3 секунды начинаем показывать намёк
    const startHintTimer = setTimeout(() => {
      const nextCell = currentSequence[userResponse.length];
      setHintCell(nextCell);
      
      // Медленное появление подсказки (от 0 до 0.3 за 2 секунды)
      const fadeDuration = 2000;
      const fadeSteps = 20;
      const stepDuration = fadeDuration / fadeSteps;
      let currentStep = 0;
      
      const fadeInterval = setInterval(() => {
        currentStep += 1;
        setHintOpacity(currentStep / fadeSteps * 0.3); // Максимум 0.3 прозрачности
        
        if (currentStep >= fadeSteps) {
          clearInterval(fadeInterval);
        }
      }, stepDuration);
      
      // Тихий звуковой сигнал (едва слышный)
      playSound('hint');
      
      return () => clearInterval(fadeInterval);
    }, 3000);
    
    return () => {
      clearTimeout(startHintTimer);
      setHintCell(null);
      setHintOpacity(0);
    };
  }, [phase, userResponse.length, currentLevel, currentSequence]);

  const showingProgress = phase === "showing" ? Math.min(100, (phaseElapsedMs / showingTotalMs) * 100) : 0;
  const rushProgress = isRush ? Math.min(100, (sessionElapsedMs / rushDurationMs) * 100) : 0;
  const correctCount = sequences.length;
  const currentCombo = sequences.length > 1 ? sequences.reduce((acc, _, i) => {
    if (i === 0) return 0;
    return arraysEqual(sequences[i], sequences[i-1]) ? acc + 1 : 0;
  }, 0) : 0;

  return (
    <section className="panel memory-grid-session-panel" data-testid="memory-grid-session-page">
      {/* Header */}
      <header className="memory-grid-header">
        <div className="memory-grid-header-content" style={{ textAlign: 'center', width: '100%' }}>
          <h2 className="memory-grid-title" style={{ justifyContent: 'center' }}>
            <span className="header-icon">🧠</span>
            Memory Grid Rush
          </h2>
          <p className="memory-grid-subtitle" style={{ textAlign: 'center' }}>
            {setup.mode === "classic" ? "Classic" : "Rush"} • {setup.gridSize}×{setup.gridSize} • Ур. {setup.startLevel}
          </p>
        </div>
        
        {isRush && (
          <div className="memory-grid-rush-timer">
            <span className="timer-icon">⏱️</span>
            <span className="timer-value">{formatMs(Math.max(0, rushDurationMs - sessionElapsedMs))}</span>
          </div>
        )}
      </header>

      {/* Stats Row */}
      <div className="nback-stats-row" style={{ justifyContent: 'center' }}>
        <div className="nback-stat-card">
          <span className="nback-stat-label">Уровень</span>
          <span className="nback-stat-value">{currentLevel}</span>
        </div>
        <div className="nback-stat-card">
          <span className="nback-stat-label">✓ Верно</span>
          <span className="nback-stat-value success">{correctCount}</span>
        </div>
        <div className="nback-stat-card">
          <span className="nback-stat-label">✗ Ошибки</span>
          <span className="nback-stat-value error">{sequences.length > 0 ? userResponses.filter((r, i) => !arraysEqual(r, sequences[i])).length : 0}</span>
        </div>
        <div className="nback-stat-card">
          <span className="nback-stat-label">🔥 Серия</span>
          <span className="nback-stat-value combo">{currentCombo >= 3 ? `🔥${currentCombo}` : currentCombo}</span>
        </div>
      </div>

      {/* Phase Indicator */}
      <div className={`memory-grid-phase-indicator ${phase}`}>
        {phase === "intro" && "👋 Нажмите Старт для начала"}
        {phase === "showing" && "👀 Запомните последовательность!"}
        {phase === "recalling" && "👆 Воспроизведите или ↻ Повторить"}
        {phase === "finished" && "✅ Сессия завершена"}
      </div>

      {/* Progress Bar для Rush */}
      {isRush && phase !== "intro" && phase !== "finished" && (
        <div className="today-progress" style={{ marginTop: 12, marginBottom: 12 }}>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${rushProgress}%` }} />
          </div>
          <p className="status-line">Осталось: {formatMs(Math.max(0, rushDurationMs - sessionElapsedMs))}</p>
        </div>
      )}

      {/* Game Grid */}
      <section className="setup-block memory-grid-section">
        <h3>Игровое поле</h3>
        
        {/* Индикатор последнего ответа */}
        {lastAnswerCorrect !== null && (
          <div className={`nback-answer-indicator ${lastAnswerCorrect ? 'correct' : 'incorrect'}`}>
            {lastAnswerCorrect ? '✓ Правильно!' : '✗ Ошибка'}
          </div>
        )}
        
        <div 
          className={`nback-grid memory-grid${shake ? ' shake' : ''}`}
          style={{ gridTemplateColumns: `repeat(${setup.gridSize}, 1fr)` }}
          data-testid="memory-grid"
        >
          {Array.from({ length: totalCells }, (_, index) => {
            const isActive = activeCell === index;
            const isSelected = selectedCell === index;
            const isWrong = wrongCells.has(index);
            const isCorrect = correctCells.has(index);
            const isHint = hintCell === index;
            const cellColor = getCellColor(index);
            return (
              <div
                key={index}
                className={`nback-cell memory-grid-cell${isActive ? " is-active" : ""}${isSelected ? " is-selected" : ""}${isWrong ? " is-wrong" : ""}${isCorrect ? " is-correct" : ""}${isHint ? " is-hint" : ""}`}
                onClick={() => {
                  handleCellClick(index);
                  playSound('click');
                }}
                style={{
                  backgroundColor: isActive ? cellColor : isSelected ? cellColor + "40" : isWrong ? "rgba(239, 68, 68, 0.3)" : isCorrect ? "rgba(16, 185, 129, 0.3)" : isHint ? `rgba(59, 130, 246, ${hintOpacity})` : "transparent",
                  borderColor: isActive || isSelected ? cellColor : isWrong ? "#ef4444" : isCorrect ? "#10b981" : isHint ? `rgba(59, 130, 246, ${Math.max(0.3, hintOpacity * 2)})` : "#c8dfd6",
                  cursor: phase === "recalling" ? "pointer" : "default",
                  opacity: isHint ? (0.5 + hintOpacity * 1.5) : 1
                }}
                data-testid={isActive ? "memory-grid-active-cell" : undefined}
              >
                {isActive && <span className="nback-cell-content">●</span>}
                {isWrong && <span className="nback-cell-content" style={{ color: "#ef4444" }}>✕</span>}
                {isCorrect && <span className="nback-cell-content" style={{ color: "#10b981" }}>✓</span>}
              </div>
            );
          })}
        </div>

        {/* Progress Bar для показа */}
        {phase === "showing" && (
          <div className="memory-grid-progress-bar">
            <div className="memory-grid-progress-fill" style={{ width: `${showingProgress}%` }} />
          </div>
        )}

        <p className="status-line" data-testid="memory-grid-status">
          {phase === "showing" && `Запомните ${currentLevel} клеток...`}
          {phase === "recalling" && `Воспроизведите ${currentLevel} клеток (попыток: ${attemptCount})`}
          {phase === "finished" && "Результаты ниже"}
          {phase === "intro" && "Нажмите Старт"}
        </p>
      </section>

      {/* Controls - крупные кнопки */}
      {phase !== "finished" ? (
        <div className="nback-controls" style={{ justifyContent: 'center' }}>
          {phase === "recalling" && (
            <button
              type="button"
              className="nback-btn nback-btn-no"
              onClick={restartCurrentLevel}
              data-testid="memory-grid-show-again-btn"
              title="Показать эту же последовательность снова"
            >
              <span className="nback-btn-icon">↻</span>
              <span className="nback-btn-text">Повторить</span>
            </button>
          )}
          
          <button
            type="button"
            className="nback-btn nback-btn-start"
            onClick={phase === "intro" ? startSession : restartSession}
            disabled={phase === "showing"}
            data-testid="memory-grid-start-btn"
            title={phase === "intro" ? "Начать тренировку" : "Начать с самого начала"}
          >
            <span className="nback-btn-icon">{phase === "intro" ? "▶" : "↻"}</span>
            <span className="nback-btn-text">{phase === "intro" ? "Старт" : "Сброс"}</span>
          </button>
        </div>
      ) : null}

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
