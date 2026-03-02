import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useActiveUserDisplayName } from "../app/useActiveUserDisplayName";
import { sessionRepository } from "../entities/session/sessionRepository";
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
import { SessionResultSummary } from "../shared/ui/SessionResultSummary";
import { StatCard } from "../shared/ui/StatCard";
import type { Session, TimeLimitSec } from "../shared/types/domain";

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
    return "Слишком много ложных нажатий «Совпало». Полезно сделать паузу перед ответом.";
  }
  if (metrics.miss > metrics.falseAlarm) {
    return "Пропусков больше, чем ложных срабатываний. Сфокусируйтесь на отслеживании последовательности.";
  }
  if (level === 1 && metrics.accuracy > 0.88) {
    return "Отличная точность в 1-back. Можно перейти на 2-back или 4×4.";
  }
  if (metrics.maxCombo >= 10) {
    return `Восхитительно! Серия из ${metrics.maxCombo} правильных ответов — отличный темп.`;
  }
  return "Хороший темп. Поддерживайте стабильную точность на каждой серии.";
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
  const [lastAnswerLabel, setLastAnswerLabel] = useState<string | null>(null);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);
  const [previousSession, setPreviousSession] = useState<Session | null>(null);
  const [bestSession, setBestSession] = useState<Session | null>(null);
  const [currentCombo, setCurrentCombo] = useState(0);

  const elapsedMs =
    startedAtMs == null ? 0 : Math.max(0, Math.min(durationMs, tickMs - startedAtMs));
  const currentStep = Math.max(0, Math.min(totalSteps - 1, Math.floor(elapsedMs / 1500)));
  const stepElapsedMs = elapsedMs - currentStep * 1500;
  const stimulusVisible = isRunning && !finished && stepElapsedMs < 650;
  const activeCell = sequence[currentStep] ?? null;
  const remainingMs = Math.max(0, durationMs - elapsedMs);
  const progressPct = Math.min(100, Math.round((elapsedMs / durationMs) * 100));
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

  // Обновление combo в реальном времени
  useEffect(() => {
    if (!result) {
      // Вычисляем текущее combo во время игры
      let combo = 0;
      let maxCombo = 0;
      for (let i = setup.level; i < responses.length; i++) {
        const isTarget = sequence[i] === sequence[i - setup.level];
        const answerMatch = responses[i] === true;
        const isCorrect = (isTarget && answerMatch) || (!isTarget && !answerMatch);
        
        if (responses[i] !== undefined) {
          if (isCorrect) {
            combo += 1;
            maxCombo = Math.max(maxCombo, combo);
          } else {
            combo = 0;
          }
        }
      }
      setCurrentCombo(combo);
    }
  }, [responses, sequence, setup.level, result]);

  useEffect(() => {
    if (!activeUserId || !result || saved) {
      return;
    }

    let cancelled = false;
    const session = buildSession(activeUserId, setup, result);
    const modeId = modeIdFromNBackLevel(setup.level, setup.gridSize);

    void sessionRepository
      .save(session)
      .then(async () => {
        if (cancelled) {
          return;
        }

        setSaved(true);
        setSaveError(null);

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
          setSaveError("Не удалось сохранить результаты N-Back Lite.");
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
    setLastAnswerLabel(null);
    setLastAnswerCorrect(null);
    setPreviousSession(null);
    setBestSession(null);
    setCurrentCombo(0);
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
    setLastAnswerLabel(null);
    setLastAnswerCorrect(null);
    setPreviousSession(null);
    setBestSession(null);
    setCurrentCombo(0);
  }

  function answer(isMatch: boolean): void {
    if (!isRunning || finished || startedAtMs == null) {
      return;
    }

    const stepIndex = Math.floor((Date.now() - startedAtMs) / 1500);
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

    // Проверка правильности ответа
    const isTarget = stepIndex >= setup.level && sequence[stepIndex] === sequence[stepIndex - setup.level];
    const isCorrect = (isTarget && isMatch) || (!isTarget && !isMatch);
    setLastAnswerCorrect(isCorrect);
    setLastAnswerLabel(isMatch ? "Ответ: Совпало" : "Ответ: Не совпало");

    // Сброс индикации через 1 секунду
    setTimeout(() => {
      setLastAnswerCorrect(null);
      setLastAnswerLabel(null);
    }, 1000);
  }

  return (
    <section className="panel" data-testid="nback-session-page">
      <h2>N-Back Lite</h2>
      <p>
        Тренировка рабочей памяти: запоминайте позицию и цвет подсвеченной клетки.
        Отвечайте «Совпало», если позиция совпала с <strong>{setup.level}</strong> шаг{setup.level === 1 ? '' : 'а' + (setup.level === 2 ? '' : 'ов')} назад.
      </p>
      <p className="active-user-inline" data-testid="session-active-user">
        Активный пользователь: <strong>{activeUserName}</strong>
      </p>

      <div className="stats-grid">
        <StatCard title="Уровень" value={`${setup.level}-back`} />
        <StatCard title="Сетка" value={`${setup.gridSize}×${setup.gridSize}`} />
        <StatCard title="Шаг" value={`${Math.min(currentStep + 1, totalSteps)} / ${totalSteps}`} />
        <StatCard title="Прогресс" value={`${progressPct}%`} />
        <StatCard title="Combo" value={currentCombo >= 5 ? `🔥 ${currentCombo}` : String(currentCombo)} />
      </div>

      {!isRunning && !finished ? (
        <section className="session-brief" data-testid="nback-session-intro">
          <h3>Перед стартом</h3>
          <p>Режим: <strong>{setup.level}-back</strong> на сетке <strong>{setup.gridSize}×{setup.gridSize}</strong></p>
          <p>Длительность: <strong>{setup.durationSec} сек</strong> ({totalSteps} шагов)</p>
          <p>Запоминайте позицию <strong>и цвет</strong> клетки.</p>
          <p className="status-line" style={{ color: '#1e7f71' }}>
            💡 Совет: цвета помогают запоминать позиции лучше!
          </p>
        </section>
      ) : null}

      <section className="setup-block">
        <h3>Игровое поле</h3>
        
        {/* Индикатор последнего ответа */}
        {lastAnswerCorrect !== null && (
          <div className={`nback-answer-indicator ${lastAnswerCorrect ? 'correct' : 'incorrect'}`}>
            {lastAnswerCorrect ? '✓ Правильно!' : '✗ Ошибка'}
          </div>
        )}
        
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
                className={`nback-cell${isActive ? ' is-active' : ''}`}
                data-testid={isActive ? "nback-active-cell" : undefined}
                style={{
                  backgroundColor: isActive ? cellColor : 'transparent',
                  borderColor: isActive ? cellColor : '#c8dfd6',
                  color: isActive ? '#fff' : 'transparent'
                }}
              >
                {isActive && (
                  <span className="nback-cell-content">●</span>
                )}
              </div>
            );
          })}
        </div>
        
        <p className="status-line" data-testid="nback-live-status">
          {isRunning
            ? stimulusVisible
              ? "Запомните позицию и цвет!"
              : `Пауза... (Combo: ${currentCombo})`
            : finished
              ? "Сессия завершена."
              : "Нажмите «Старт», чтобы начать серию."}
        </p>
        
        {lastAnswerLabel && !lastAnswerCorrect !== null && (
          <p className={`status-line ${lastAnswerCorrect ? 'success-text' : 'error-text'}`}>
            {lastAnswerLabel} {lastAnswerCorrect ? '✓' : '✗'}
          </p>
        )}
      </section>

      {!finished ? (
        <div className="action-row">
          <button
            type="button"
            className={currentStepResponse === true ? "btn-secondary is-active" : "btn-secondary"}
            onClick={() => answer(true)}
            disabled={!isRunning || currentStepResponse !== undefined}
            data-testid="nback-answer-match"
          >
            Совпало
          </button>
          <button
            type="button"
            className={currentStepResponse === false ? "btn-secondary is-active" : "btn-secondary"}
            onClick={() => answer(false)}
            disabled={!isRunning || currentStepResponse !== undefined}
            data-testid="nback-answer-non-match"
          >
            Не совпало
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={startSession}
            disabled={isRunning}
            data-testid="nback-start-session-btn"
          >
            {startedAtMs == null ? "Старт" : "Новая серия"}
          </button>
        </div>
      ) : null}

      {result ? (
        <SessionResultSummary
          testId="nback-result"
          title="Результаты N-Back Lite"
          metrics={[
            { label: "Hit", value: String(result.hit) },
            { label: "Miss", value: String(result.miss) },
            { label: "False alarm", value: String(result.falseAlarm) },
            { label: "Correct reject", value: String(result.correctReject) },
            { label: "Точность", value: `${(result.accuracy * 100).toFixed(1)}%` },
            { label: "Лучшее combo", value: `🔥 ${result.maxCombo}` },
            { label: "Score", value: result.score.toFixed(2) }
          ]}
          previousSummary={
            previousSession
              ? `С прошлой попыткой: ${formatSigned(result.score - previousSession.score)} по score (было ${previousSession.score.toFixed(2)}).`
              : "Это первая сохраненная попытка в выбранном режиме."
          }
          bestSummary={
            bestSession
              ? `Лучший результат в режиме: score ${bestSession.score.toFixed(2)} (${bestSession.localDate}).`
              : null
          }
          tip={buildNBackTip(result, setup.level)}
          saveState={{
            testId: "nback-save-status",
            text: saved ? "saved" : "saving"
          }}
          saveSummary={saved ? "Результаты сохранены в статистику." : "Сохраняем результаты..."}
          retryLabel="Начать заново"
          onRetry={restartSession}
        />
      ) : null}

      {saveError ? <p className="error-text">{saveError}</p> : null}
    </section>
  );
}
