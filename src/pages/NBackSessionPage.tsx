import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useActiveUserDisplayName } from "../app/useActiveUserDisplayName";
import { sessionRepository } from "../entities/session/sessionRepository";
import { trainingRepository } from "../entities/training/trainingRepository";
import {
  calculateNBackSteps,
  evaluateNBackSession,
  generateNBackSequence,
  modeIdFromNBackLevel,
  NBACK_GRID_SIZE,
  NBACK_STEP_MS,
  NBACK_STIMULUS_MS,
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
import type { Session } from "../shared/types/domain";

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
    return "Отличная точность в 1-back. Можно перейти на 2-back.";
  }
  return "Хороший темп. Поддерживайте стабильную точность на каждой серии.";
}

function buildSession(
  userId: string,
  setup: NBackSetup,
  metrics: NBackSessionMetrics
): Session {
  const now = new Date();
  const modeId = modeIdFromNBackLevel(setup.level);

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
      gridSize: 3,
      numbersCount: metrics.totalSteps,
      mode: "n_back",
      timeLimitSec: setup.durationSec,
      errorPenalty: 0.5,
      nBackLevel: setup.level
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
  const [previousSession, setPreviousSession] = useState<Session | null>(null);
  const [bestSession, setBestSession] = useState<Session | null>(null);

  const elapsedMs =
    startedAtMs == null ? 0 : Math.max(0, Math.min(durationMs, tickMs - startedAtMs));
  const currentStep = Math.max(0, Math.min(totalSteps - 1, Math.floor(elapsedMs / NBACK_STEP_MS)));
  const stepElapsedMs = elapsedMs - currentStep * NBACK_STEP_MS;
  const stimulusVisible = isRunning && !finished && stepElapsedMs < NBACK_STIMULUS_MS;
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
        durationMs
      })
    );
  }, [durationMs, elapsedMs, finished, isRunning, responses, sequence, setup.level, startedAtMs]);

  useEffect(() => {
    if (!activeUserId || !result || saved) {
      return;
    }

    let cancelled = false;
    const session = buildSession(activeUserId, setup, result);
    const modeId = modeIdFromNBackLevel(setup.level);

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
    const nextSequence = generateNBackSequence(totalSteps, setup.level);
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
    setPreviousSession(null);
    setBestSession(null);
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
    setPreviousSession(null);
    setBestSession(null);
  }

  function answer(isMatch: boolean): void {
    if (!isRunning || finished || startedAtMs == null) {
      return;
    }

    const stepIndex = Math.floor((Date.now() - startedAtMs) / NBACK_STEP_MS);
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

    setLastAnswerLabel(isMatch ? "Ответ: Совпало" : "Ответ: Не совпало");
  }

  return (
    <section className="panel" data-testid="nback-session-page">
      <h2>N-Back Lite</h2>
      <p>
        Короткая серия на память с шагом 1.5 секунды. Отвечайте «Совпало/Не совпало»
        для каждой позиции.
      </p>
      <p className="active-user-inline" data-testid="session-active-user">
        Активный пользователь: <strong>{activeUserName}</strong>
      </p>

      <div className="stats-grid">
        <StatCard title="Уровень" value={`${setup.level}-back`} />
        <StatCard title="Шаг" value={`${Math.min(currentStep + 1, totalSteps)} / ${totalSteps}`} />
        <StatCard title="Прогресс" value={`${progressPct}%`} />
        <StatCard title="Осталось" value={formatMs(remainingMs)} />
        <StatCard title="Ответов" value={String(answeredSteps)} />
      </div>

      {!isRunning && !finished ? (
        <section className="session-brief" data-testid="nback-session-intro">
          <h3>Перед стартом</h3>
          <p>Режим: {setup.level}-back</p>
          <p>Длительность: {setup.durationSec} сек</p>
          <p>Нажмите «Старт», когда будете готовы.</p>
        </section>
      ) : null}

      <section className="setup-block">
        <h3>Игровое поле</h3>
        <div className="nback-grid" data-testid="nback-grid">
          {Array.from({ length: NBACK_GRID_SIZE * NBACK_GRID_SIZE }, (_, index) => {
            const isActive = stimulusVisible && activeCell === index;
            return (
              <div
                key={index}
                className={isActive ? "nback-cell is-active" : "nback-cell"}
                data-testid={isActive ? "nback-active-cell" : undefined}
              >
                {isActive ? "●" : ""}
              </div>
            );
          })}
        </div>
        <p className="status-line" data-testid="nback-live-status">
          {isRunning
            ? stimulusVisible
              ? "Запомните позицию подсветки и дайте ответ."
              : "Пауза шага: подготовьтесь к следующей подсветке."
            : finished
              ? "Сессия завершена."
              : "Нажмите «Старт», чтобы начать серию."}
        </p>
        {lastAnswerLabel ? <p className="status-line">{lastAnswerLabel}</p> : null}
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
