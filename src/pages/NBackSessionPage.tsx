import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useActiveUserDisplayName } from "../app/useActiveUserDisplayName";
import {
  sessionRepository,
  type SessionSaveResult
} from "../entities/session/sessionRepository";
import { trainingRepository } from "../entities/training/trainingRepository";
import {
  calculateNBackSteps,
  CELL_COLORS,
  evaluateNBackSession,
  generateNBackSequence,
  getCellColor,
  modeIdFromNBackLevel,
  normalizeNBackSetup,
  type NBackSessionMetrics,
  type NBackSetup
} from "../features/nback/engine";
import { getNBackSetup } from "../features/nback/setupStorage";
import { DEFAULT_AUDIO_SETTINGS } from "../shared/lib/audio/audioSettings";
import { toLocalDateKey } from "../shared/lib/date/date";
import { createId } from "../shared/lib/id";
import { buildSessionProgressNotes } from "../shared/lib/progress/sessionProgressFeedback";
import { SessionResultSummary } from "../shared/ui/SessionResultSummary";
import { StatCard } from "../shared/ui/StatCard";
import type { Session, TimeLimitSec } from "../shared/types/domain";
import { SessionRewardQueue } from "../widgets/SessionRewardQueue";

interface NBackSessionNavState {
  setup?: NBackSetup;
}

function formatMs(ms: number): string {
  return `${Math.max(0, Math.round(ms / 1000))} сек`;
}

function formatSigned(value: number, digits = 2): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}`;
}

function pickBestSession(sessions: Session[]): Session | null {
  if (sessions.length === 0) {
    return null;
  }
  return sessions.reduce((best, current) => (current.score > best.score ? current : best));
}

function buildNBackTip(metrics: NBackSessionMetrics, level: NBackSetup["level"]): string {
  if (metrics.accuracy < 0.7) {
    return "Сначала стабилизируйте точность: отмечайте «Совпало» только при уверенном совпадении.";
  }
  if (metrics.falseAlarm > metrics.miss) {
    return "Слишком много ложных нажатий. Делайте паузу перед ответом.";
  }
  if (metrics.miss > metrics.falseAlarm) {
    return "Пропусков больше, чем ошибок. Сфокусируйтесь на последовательности.";
  }
  if (level === 1 && metrics.accuracy > 0.88) {
    return "Отличная точность! Попробуйте 2-back или сетку 4×4.";
  }
  if (metrics.maxCombo >= 10) {
    return `Восхитительно! Серия из ${metrics.maxCombo} — отличный результат!`;
  }
  return "Хорошая работа! Продолжайте в том же духе.";
}

function buildSession(
  userId: string,
  setup: NBackSetup,
  metrics: NBackSessionMetrics
): Session {
  const now = new Date();
  const modeId = modeIdFromNBackLevel(setup.level, setup.gridSize);

  return {
    id: createId(),
    userId,
    taskId: "n_back",
    mode: "n_back",
    moduleId: "n_back",
    modeId,
    level: setup.level,
    presetId: "legacy",
    adaptiveSource: "manual",
    timestamp: now.toISOString(),
    localDate: toLocalDateKey(now),
    durationMs: setup.durationSec * 1000,
    score: metrics.score,
    accuracy: metrics.accuracy,
    speed: metrics.speed,
    errors: metrics.errors,
    correctCount: metrics.correctCount,
    effectiveCorrect: metrics.effectiveCorrect,
    audioEnabledSnapshot: DEFAULT_AUDIO_SETTINGS,
    difficulty: {
      gridSize: setup.gridSize,
      numbersCount: metrics.totalSteps,
      mode: "n_back",
      timeLimitSec: setup.durationSec as TimeLimitSec,
      errorPenalty: 0.5,
      nBackLevel: setup.level as 1 | 2
    }
  };
}

const STEP_MS = 1500;
const STIMULUS_MS = 700;

export function NBackSessionPage() {
  const location = useLocation();
  const { activeUserId, activeUserName } = useActiveUserDisplayName();
  const state = (location.state as NBackSessionNavState | null) ?? null;
  const [setup] = useState<NBackSetup>(() =>
    normalizeNBackSetup(state?.setup ?? getNBackSetup())
  );

  const totalSteps = useMemo(() => calculateNBackSteps(setup.durationSec), [setup.durationSec]);
  const durationMs = setup.durationSec * 1000;
  const totalCells = setup.gridSize * setup.gridSize;

  const [sequence, setSequence] = useState<number[]>([]);
  const [responses, setResponses] = useState<Array<boolean | undefined>>([]);
  const [startedAtMs, setStartedAtMs] = useState<number | null>(null);
  const [tickMs, setTickMs] = useState<number>(Date.now());
  const [isRunning, setIsRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [result, setResult] = useState<NBackSessionMetrics | null>(null);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [previousSession, setPreviousSession] = useState<Session | null>(null);
  const [bestSession, setBestSession] = useState<Session | null>(null);
  const [sessionProgress, setSessionProgress] = useState<SessionSaveResult | null>(null);
  
  // Статистика в реальном времени
  const [correctCount, setCorrectCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [currentCombo, setCurrentCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);

  const elapsedMs =
    startedAtMs == null ? 0 : Math.max(0, Math.min(durationMs, tickMs - startedAtMs));
  const currentStep = Math.max(0, Math.min(totalSteps - 1, Math.floor(elapsedMs / STEP_MS)));
  const stepElapsedMs = elapsedMs - currentStep * STEP_MS;
  const stimulusVisible = isRunning && !finished && stepElapsedMs < STIMULUS_MS;
  const stepProgress = Math.min(100, (stepElapsedMs / STEP_MS) * 100);
  const activeCell = sequence[currentStep] ?? null;
  const remainingMs = Math.max(0, durationMs - elapsedMs);
  const totalProgressPct = Math.min(100, Math.round((elapsedMs / durationMs) * 100));
  const currentStepResponse = responses[currentStep];
  const answeredSteps = responses.filter((entry) => entry !== undefined).length;

  useEffect(() => {
    if (!isRunning || finished || startedAtMs == null) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setTickMs(Date.now());
    }, 50);

    return () => window.clearInterval(timer);
  }, [finished, isRunning, startedAtMs]);

  useEffect(() => {
    if (!isRunning || finished || startedAtMs == null) {
      return;
    }
    if (elapsedMs < durationMs) {
      return;
    }

    setIsRunning(false);
    setFinished(true);
    setResult(
      evaluateNBackSession({
        sequence,
        level: setup.level,
        responses,
        durationMs,
        gridSize: setup.gridSize
      })
    );
  }, [durationMs, elapsedMs, finished, isRunning, responses, sequence, setup.level, setup.gridSize, startedAtMs]);

  // Подсчёт статистики в реальном времени
  useEffect(() => {
    let correct = 0;
    let errors = 0;
    let combo = 0;
    let maxC = 0;
    
    for (let i = setup.level; i < responses.length; i++) {
      if (responses[i] !== undefined) {
        const isTarget = sequence[i] === sequence[i - setup.level];
        const answerMatch = responses[i] === true;
        const isCorrect = (isTarget && answerMatch) || (!isTarget && !answerMatch);
        
        if (isCorrect) {
          correct += 1;
          combo += 1;
          maxC = Math.max(maxC, combo);
        } else {
          errors += 1;
          combo = 0;
        }
      }
    }
    
    setCorrectCount(correct);
    setErrorCount(errors);
    setCurrentCombo(combo);
    setMaxCombo(maxC);
  }, [responses, sequence, setup.level]);

  useEffect(() => {
    if (!activeUserId || !result || saved) {
      return;
    }

    let cancelled = false;
    const session = buildSession(activeUserId, setup, result);
    const modeId = modeIdFromNBackLevel(setup.level, setup.gridSize);
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
          "n_back",
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
          setSaveError("Не удалось сохранить результаты.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeUserId, result, saved, setup]);

  function startSession(): void {
    const nextSequence = generateNBackSequence(totalSteps, setup.level, setup.gridSize);
    const emptyResponses = Array.from({ length: totalSteps }, () => undefined as boolean | undefined);
    const now = Date.now();

    setSequence(nextSequence);
    setResponses(emptyResponses);
    setStartedAtMs(now);
    setTickMs(now);
    setIsRunning(true);
    setFinished(false);
    setResult(null);
    setSaved(false);
    setSaveError(null);
    setPreviousSession(null);
    setBestSession(null);
    setCorrectCount(0);
    setErrorCount(0);
    setCurrentCombo(0);
    setMaxCombo(0);
  }

  function restartSession(): void {
    setSequence([]);
    setResponses([]);
    setStartedAtMs(null);
    setTickMs(Date.now());
    setIsRunning(false);
    setFinished(false);
    setResult(null);
    setSaved(false);
    setSaveError(null);
    setPreviousSession(null);
    setBestSession(null);
    setCorrectCount(0);
    setErrorCount(0);
    setCurrentCombo(0);
    setMaxCombo(0);
  }

  function answer(isMatch: boolean): void {
    if (!isRunning || finished || startedAtMs == null) {
      return;
    }

    const stepIndex = Math.floor((Date.now() - startedAtMs) / STEP_MS);
    if (stepIndex < 0 || stepIndex >= totalSteps) {
      return;
    }

    setResponses((current) => {
      if (current[stepIndex] !== undefined) {
        return current;
      }
      const next = [...current];
      next[stepIndex] = isMatch;
      return next;
    });
  }

  // Инструкция для игрока
  const instructionText = useMemo(() => {
    if (!isRunning) return "Нажмите «Старт» для начала";
    if (finished) return "Сессия завершена";
    
    if (currentStep < setup.level) {
      return `Запомните позицию (${currentStep + 1}/${setup.level})`;
    }
    
    const isTarget = sequence[currentStep] === sequence[currentStep - setup.level];
    if (stimulusVisible) {
      return isRunning ? "Запомните!" : "Ответьте!";
    } else {
      return currentStepResponse !== undefined 
        ? (currentStepResponse === (sequence[currentStep] === sequence[currentStep - setup.level]) ? "✓" : "✗")
        : `Сравните с шагом ${currentStep - setup.level + 1}`;
    }
  }, [isRunning, finished, currentStep, setup.level, stimulusVisible, sequence, currentStepResponse]);

  return (
    <section className="panel nback-session-panel" data-testid="nback-session-page">
      {/* Header с основной информацией */}
      <header className="nback-header">
        <div className="nback-header-top">
          <h2>N-Back</h2>
          <p className="nback-subtitle">
            {setup.level}-back • {setup.gridSize}×{setup.gridSize} • {setup.durationSec} сек
          </p>
        </div>
        
        {/* Прогресс сессии */}
        <div className="nback-session-progress">
          <div className="nback-progress-bar">
            <div className="nback-progress-fill" style={{ width: `${totalProgressPct}%` }} />
          </div>
          <span className="nback-progress-text">{totalProgressPct}%</span>
        </div>
      </header>

      {/* Статистика в реальном времени */}
      <div className="nback-stats-row">
        <div className="nback-stat-card">
          <span className="nback-stat-label">Шаг</span>
          <span className="nback-stat-value">{Math.min(currentStep + 1, totalSteps)}/{totalSteps}</span>
        </div>
        <div className="nback-stat-card">
          <span className="nback-stat-label">✓ Верно</span>
          <span className="nback-stat-value success">{correctCount}</span>
        </div>
        <div className="nback-stat-card">
          <span className="nback-stat-label">✗ Ошибки</span>
          <span className="nback-stat-value error">{errorCount}</span>
        </div>
        <div className="nback-stat-card">
          <span className="nback-stat-label">🔥 Серия</span>
          <span className="nback-stat-value combo">{currentCombo >= 5 ? `🔥${currentCombo}` : currentCombo}</span>
        </div>
        <div className="nback-stat-card nback-stat-card-action">
          <button
            type="button"
            className="nback-btn nback-btn-start-small"
            onClick={isRunning ? restartSession : startSession}
            data-testid="nback-start-session-btn"
          >
            <span className="nback-btn-icon">{isRunning ? '↻' : '▶'}</span>
            <span className="nback-btn-text">{isRunning ? 'Заново' : 'Старт'}</span>
          </button>
        </div>
      </div>

      {/* Инструкция */}
      <div className={`nback-instruction ${stimulusVisible ? 'showing' : 'answering'}`}>
        {instructionText}
      </div>

      {/* Игровое поле */}
      <section className="nback-game-section">
        <div 
          className="nback-grid" 
          data-testid="nback-grid"
          style={{ 
            gridTemplateColumns: `repeat(${setup.gridSize}, 1fr)`,
            '--grid-size': setup.gridSize 
          } as React.CSSProperties}
        >
          {Array.from({ length: totalCells }, (_, index) => {
            const isActive = stimulusVisible && activeCell === index;
            const cellColor = getCellColor(index, totalCells);
            return (
              <div
                key={index}
                className={`nback-cell${isActive ? ' is-active' : ''}${!stimulusVisible && currentStepResponse !== undefined ? ' answered' : ''}`}
                data-testid={isActive ? "nback-active-cell" : undefined}
                style={{
                  backgroundColor: isActive ? cellColor : 'transparent',
                  borderColor: isActive ? cellColor : '#c8dfd6',
                  boxShadow: isActive ? `0 0 20px ${cellColor}80, 0 0 40px ${cellColor}40` : 'none',
                  transform: isActive ? 'scale(1.1)' : 'scale(1)',
                }}
              >
                {isActive && (
                  <span className="nback-cell-content">●</span>
                )}
                {/* Индикатор ответа для этой позиции */}
                {!stimulusVisible && responses[currentStep] !== undefined && sequence[currentStep] === index && (
                  <span className={`nback-answer-mark ${responses[currentStep] === (sequence[currentStep] === sequence[currentStep - setup.level]) ? 'correct' : 'wrong'}`}>
                    {responses[currentStep] === (sequence[currentStep] === sequence[currentStep - setup.level]) ? '✓' : '✗'}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Прогресс текущего шага */}
        <div className="nback-step-progress">
          <div className="nback-step-progress-bar">
            <div 
              className={`nback-step-progress-fill ${stimulusVisible ? 'stimulus' : 'pause'}`} 
              style={{ width: `${stepProgress}%` }} 
            />
          </div>
          <span className="nback-step-progress-text">
            {stimulusVisible ? 'ПОКАЗ' : 'ПАУЗА'}
          </span>
        </div>
      </section>

      {/* Кнопки управления - только ответы */}
      {!finished ? (
        <div className="nback-controls">
          <button
            type="button"
            className={`nback-btn nback-btn-no${currentStepResponse === false ? ' active' : ''}`}
            onClick={() => answer(false)}
            disabled={!isRunning || currentStepResponse !== undefined}
            data-testid="nback-answer-non-match"
          >
            <span className="nback-btn-icon">✕</span>
            <span className="nback-btn-text">Не совпало</span>
          </button>
          
          <button
            type="button"
            className={`nback-btn nback-btn-yes${currentStepResponse === true ? ' active' : ''}`}
            onClick={() => answer(true)}
            disabled={!isRunning || currentStepResponse !== undefined}
            data-testid="nback-answer-match"
          >
            <span className="nback-btn-icon">✓</span>
            <span className="nback-btn-text">Совпало</span>
          </button>
        </div>
      ) : null}

      {/* Результаты */}
      {result ? (
        <SessionResultSummary
          testId="nback-result"
          title="Результаты N-Back"
          metrics={[
            { label: "Hit (верно совпало)", value: String(result.hit) },
            { label: "Miss (пропустил)", value: String(result.miss) },
            { label: "False alarm (ложно)", value: String(result.falseAlarm) },
            { label: "Correct reject", value: String(result.correctReject) },
            { label: "Точность", value: `${(result.accuracy * 100).toFixed(1)}%` },
            { label: "Лучшая серия", value: `🔥 ${result.maxCombo}` },
            { label: "Score", value: result.score.toFixed(2) }
          ]}
          previousSummary={
            previousSession
              ? `Прошлый раз: ${formatSigned(result.score - previousSession.score)} (было ${previousSession.score.toFixed(2)})`
              : "Первая попытка в этом режиме"
          }
          bestSummary={
            bestSession
              ? `Рекорд: ${bestSession.score.toFixed(2)} (${bestSession.localDate})`
              : null
          }
          tip={buildNBackTip(result, setup.level)}
          saveState={{
            testId: "nback-save-status",
            text: saved ? "saved" : "saving"
          }}
          saveSummary={saved ? "Сохранено" : "Сохраняем..."}
          extraNotes={buildSessionProgressNotes(sessionProgress)}
          retryLabel="Ещё раз"
          onRetry={restartSession}
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
