import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useLocation } from "react-router-dom";
import { useActiveUserDisplayName } from "../app/useActiveUserDisplayName";
import { sessionRepository } from "../entities/session/sessionRepository";
import { trainingRepository } from "../entities/training/trainingRepository";
import {
  adaptDecisionIntervalMs,
  colorLabel,
  createDecisionRushTrial,
  evaluateDecisionRushSession,
  initialDecisionIntervalMs,
  modeIdFromDecisionLevel,
  normalizeDecisionRushSetup,
  resolveDecisionPhase,
  type DecisionRushAnswer,
  type DecisionRushColor,
  type DecisionRushSessionMetrics,
  type DecisionRushSetup,
  type DecisionRushTrial,
  type DecisionRushTrialResult
} from "../features/decision-rush/engine";
import { getDecisionRushSetup } from "../features/decision-rush/setupStorage";
import { DEFAULT_AUDIO_SETTINGS } from "../shared/lib/audio/audioSettings";
import { toLocalDateKey } from "../shared/lib/date/date";
import { createId } from "../shared/lib/id";
import { SessionResultSummary } from "../shared/ui/SessionResultSummary";
import { StatCard } from "../shared/ui/StatCard";
import type { Session } from "../shared/types/domain";

interface DecisionRushSessionNavState {
  setup?: DecisionRushSetup;
}

type LiveAnswerState = "pending" | "correct" | "error" | null;

const COLOR_HEX: Record<DecisionRushColor, string> = {
  red: "#cf3f3f",
  green: "#1f9a5a",
  yellow: "#db9e18",
  blue: "#2f73cc"
};

function formatSeconds(ms: number): string {
  return `${Math.max(0, Math.round(ms / 1000))} сек`;
}

function formatSigned(value: number, digits = 2): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}`;
}

function compactPromptText(description: string): string {
  const normalized = description
    .trim()
    .replace(/^жми\s+да,\s*если\s*/i, "")
    .replace(/^сейчас\s+/i, "");

  if (normalized.length === 0) {
    return description;
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function phaseLabel(value: DecisionRushTrialResult["phase"] | DecisionRushTrial["phase"]): string {
  if (value === "warmup") {
    return "Разминка";
  }
  if (value === "core") {
    return "Основной блок";
  }
  return "Boss";
}

function levelLabel(level: DecisionRushSetup["level"]): string {
  if (level === "kids") {
    return "Kids";
  }
  if (level === "pro") {
    return "Pro";
  }
  return "Standard";
}

function levelNumber(level: DecisionRushSetup["level"]): number {
  if (level === "kids") {
    return 2;
  }
  if (level === "pro") {
    return 8;
  }
  return 5;
}

function decisionShapeStyle(
  shape: DecisionRushTrial["stimulus"]["shape"],
  color: DecisionRushColor
): CSSProperties {
  const style: CSSProperties = {
    background: COLOR_HEX[color]
  };

  if (shape === "circle") {
    style.borderRadius = "50%";
    return style;
  }
  if (shape === "square") {
    style.borderRadius = "12px";
    return style;
  }

  style.borderRadius = "8px";
  style.clipPath = "polygon(50% 6%, 94% 94%, 6% 94%)";
  return style;
}

function decisionShapeClass(shape: DecisionRushTrial["stimulus"]["shape"]): string {
  if (shape === "triangle") {
    return "decision-shape decision-shape-triangle";
  }
  return "decision-shape";
}

function pickBestSession(sessions: Session[]): Session | null {
  if (sessions.length === 0) {
    return null;
  }
  return sessions.reduce((best, current) => (current.score > best.score ? current : best));
}

function buildTip(metrics: DecisionRushSessionMetrics): string {
  if (metrics.accuracy < 0.75) {
    return "Сначала стабилизируйте точность: отвечайте чуть спокойнее и без лишних кликов.";
  }
  if (metrics.reactionP90Ms > 1200) {
    return "Скорость пока нестабильна. Полезно пройти еще одну серию в том же уровне.";
  }
  if (metrics.bestCombo >= 10) {
    return "Отличный контроль серии. Можно пробовать более сложный уровень.";
  }
  return "Хороший баланс скорости и точности. Закрепите результат еще одной сессией.";
}

function buildSession(
  userId: string,
  setup: DecisionRushSetup,
  metrics: DecisionRushSessionMetrics
): Session {
  const now = new Date();
  const modeId = modeIdFromDecisionLevel(setup.level);

  return {
    id: createId(),
    userId,
    taskId: "decision_rush",
    mode: "decision_rush",
    moduleId: "decision_rush",
    modeId,
    level: levelNumber(setup.level),
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
    effectiveCorrect: metrics.correctCount - metrics.errors * 0.5,
    reactionAvgMs: metrics.reactionAvgMs,
    reactionP90Ms: metrics.reactionP90Ms,
    trialsTotal: metrics.trialsTotal,
    bestCombo: metrics.bestCombo,
    points: metrics.points,
    audioEnabledSnapshot: DEFAULT_AUDIO_SETTINGS,
    difficulty: {
      gridSize: 3,
      numbersCount: metrics.trialsTotal,
      mode: "decision_rush",
      timeLimitSec: setup.durationSec,
      errorPenalty: 0.5,
      decisionLevel: setup.level,
      decisionStimulusIntervalMs: initialDecisionIntervalMs(setup.level)
    }
  };
}

export function DecisionRushSessionPage() {
  const location = useLocation();
  const { activeUserId, activeUserName } = useActiveUserDisplayName();
  const state = (location.state as DecisionRushSessionNavState | null) ?? null;
  const [setup] = useState<DecisionRushSetup>(() =>
    normalizeDecisionRushSetup(state?.setup ?? getDecisionRushSetup())
  );

  const [isRunning, setIsRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [tickMs, setTickMs] = useState<number>(Date.now());
  const [trialIndex, setTrialIndex] = useState(0);
  const [currentTrial, setCurrentTrial] = useState<DecisionRushTrial | null>(null);
  const [intervalMs, setIntervalMs] = useState(initialDecisionIntervalMs(setup.level));
  const [combo, setCombo] = useState(0);
  const [liveCorrectCount, setLiveCorrectCount] = useState(0);
  const [liveErrorCount, setLiveErrorCount] = useState(0);
  const [liveScoredCount, setLiveScoredCount] = useState(0);
  const [liveAnswerState, setLiveAnswerState] = useState<LiveAnswerState>(null);
  const [lastAnswerLabel, setLastAnswerLabel] = useState<string | null>(null);
  const [result, setResult] = useState<DecisionRushSessionMetrics | null>(null);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [previousSession, setPreviousSession] = useState<Session | null>(null);
  const [bestSession, setBestSession] = useState<Session | null>(null);

  const loopTimerRef = useRef<number | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const trialStartedAtRef = useRef<number | null>(null);
  const intervalRef = useRef(initialDecisionIntervalMs(setup.level));
  const pendingAnswerRef = useRef<DecisionRushAnswer | null>(null);
  const pendingAnswerAtRef = useRef<number | null>(null);
  const feedbackTimerRef = useRef<number | null>(null);
  const currentTrialRef = useRef<DecisionRushTrial | null>(null);
  const resultsRef = useRef<DecisionRushTrialResult[]>([]);
  const trialIndexRef = useRef(0);
  const comboRef = useRef(0);
  const finishedRef = useRef(false);
  const runningRef = useRef(false);

  const durationMs = useMemo(() => setup.durationSec * 1000, [setup.durationSec]);
  const startedAtMs = startedAtRef.current;
  const elapsedMs =
    startedAtMs == null ? 0 : Math.max(0, Math.min(durationMs, tickMs - startedAtMs));
  const remainingMs = Math.max(0, durationMs - elapsedMs);
  const progressPct =
    durationMs > 0 ? Math.min(100, Math.round((elapsedMs / durationMs) * 100)) : 0;
  const currentPhase = currentTrial?.phase ?? resolveDecisionPhase(elapsedMs, setup.durationSec);
  const currentAnswerLocked = pendingAnswerRef.current != null;
  const liveAccuracyPercent =
    liveScoredCount > 0 ? Math.round((liveCorrectCount / liveScoredCount) * 100) : 0;
  const trialElapsedMs =
    trialStartedAtRef.current == null ? 0 : Math.max(0, tickMs - trialStartedAtRef.current);
  const trialRemainingMs = Math.max(0, intervalMs - trialElapsedMs);
  const trialRemainingPct = intervalMs > 0 ? Math.min(100, Math.round((trialRemainingMs / intervalMs) * 100)) : 0;

  function clearLoop(): void {
    if (loopTimerRef.current != null) {
      window.clearInterval(loopTimerRef.current);
      loopTimerRef.current = null;
    }
  }

  function clearFeedbackTimer(): void {
    if (feedbackTimerRef.current != null) {
      window.clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }
  }

  function setTransientAnswerState(state: Exclude<LiveAnswerState, "pending" | null>): void {
    clearFeedbackTimer();
    setLiveAnswerState(state);
    feedbackTimerRef.current = window.setTimeout(() => {
      setLiveAnswerState(null);
      feedbackTimerRef.current = null;
    }, 360);
  }

  function resetRuntimeState(): void {
    clearLoop();
    clearFeedbackTimer();
    startedAtRef.current = null;
    trialStartedAtRef.current = null;
    currentTrialRef.current = null;
    pendingAnswerRef.current = null;
    pendingAnswerAtRef.current = null;
    resultsRef.current = [];
    trialIndexRef.current = 0;
    comboRef.current = 0;
    runningRef.current = false;
    finishedRef.current = false;
    intervalRef.current = initialDecisionIntervalMs(setup.level);
    setLiveAnswerState(null);
  }

  function commitCurrentTrial(nowMs: number): void {
    const trial = currentTrialRef.current;
    const trialStartedAt = trialStartedAtRef.current;
    if (!trial || trialStartedAt == null) {
      return;
    }

    const answer = pendingAnswerRef.current ?? "none";
    const reactionMs =
      pendingAnswerAtRef.current != null
        ? Math.max(1, pendingAnswerAtRef.current - trialStartedAt)
        : intervalRef.current;
    const correct = answer === trial.correctAnswer;

    const nextEntry: DecisionRushTrialResult = {
      phase: trial.phase,
      correct,
      answer,
      reactionMs,
      intervalMs: intervalRef.current
    };
    resultsRef.current = [...resultsRef.current, nextEntry];

    if (trial.phase !== "warmup") {
      comboRef.current = correct ? comboRef.current + 1 : 0;
      setCombo(comboRef.current);
      setLiveScoredCount((value) => value + 1);
      if (correct) {
        setLiveCorrectCount((value) => value + 1);
        setTransientAnswerState("correct");
      } else {
        setLiveErrorCount((value) => value + 1);
        setTransientAnswerState("error");
      }
    } else {
      setTransientAnswerState("correct");
    }

    if (trial.phase !== "warmup") {
      setLastAnswerLabel(correct ? "Последний ответ: верно" : "Последний ответ: ошибка");
    } else {
      setLastAnswerLabel("Разминка: ответ принят");
    }
    pendingAnswerRef.current = null;
    pendingAnswerAtRef.current = null;

    const scored = resultsRef.current.filter((entry) => entry.phase !== "warmup");
    if (scored.length > 0 && scored.length % 10 === 0) {
      const next = adaptDecisionIntervalMs(intervalRef.current, scored.slice(-10));
      intervalRef.current = next;
      setIntervalMs(next);
    }
  }

  function startNextTrial(nowMs: number): void {
    const startedAt = startedAtRef.current ?? nowMs;
    const elapsed = Math.max(0, nowMs - startedAt);
    const phase = resolveDecisionPhase(elapsed, setup.durationSec);
    const trial = createDecisionRushTrial(setup.level, phase);

    currentTrialRef.current = trial;
    trialStartedAtRef.current = nowMs;
    pendingAnswerRef.current = null;
    pendingAnswerAtRef.current = null;
    trialIndexRef.current += 1;

    setCurrentTrial(trial);
    setTrialIndex(trialIndexRef.current);
    setTickMs(nowMs);
  }

  function finishSession(nowMs: number): void {
    if (finishedRef.current) {
      return;
    }

    commitCurrentTrial(nowMs);
    currentTrialRef.current = null;
    setCurrentTrial(null);
    finishedRef.current = true;
    runningRef.current = false;
    setIsRunning(false);
    setFinished(true);
    clearLoop();

    const metrics = evaluateDecisionRushSession(resultsRef.current, durationMs);
    setResult(metrics);
  }

  function startSession(): void {
    resetRuntimeState();
    setResult(null);
    setSaved(false);
    setSaveError(null);
    setPreviousSession(null);
    setBestSession(null);
    setLastAnswerLabel(null);
    setCombo(0);
    setLiveCorrectCount(0);
    setLiveErrorCount(0);
    setLiveScoredCount(0);

    const nowMs = Date.now();
    startedAtRef.current = nowMs;
    runningRef.current = true;
    finishedRef.current = false;
    intervalRef.current = initialDecisionIntervalMs(setup.level);

    setIsRunning(true);
    setFinished(false);
    setIntervalMs(intervalRef.current);
    startNextTrial(nowMs);

    loopTimerRef.current = window.setInterval(() => {
      const now = Date.now();
      setTickMs(now);

      if (!runningRef.current || finishedRef.current) {
        return;
      }
      const startedAt = startedAtRef.current;
      const trialStartedAt = trialStartedAtRef.current;
      if (startedAt == null || trialStartedAt == null) {
        return;
      }

      const elapsed = now - startedAt;
      const trialElapsed = now - trialStartedAt;
      if (elapsed >= durationMs) {
        finishSession(now);
        return;
      }

      if (trialElapsed >= intervalRef.current) {
        commitCurrentTrial(now);
        startNextTrial(now);
      }
    }, 40);
  }

  function restartSession(): void {
    resetRuntimeState();
    setIsRunning(false);
    setFinished(false);
    setTickMs(Date.now());
    setTrialIndex(0);
    setCurrentTrial(null);
    setIntervalMs(initialDecisionIntervalMs(setup.level));
    setCombo(0);
    setLastAnswerLabel(null);
    setLiveCorrectCount(0);
    setLiveErrorCount(0);
    setLiveScoredCount(0);
    setResult(null);
    setSaved(false);
    setSaveError(null);
    setPreviousSession(null);
    setBestSession(null);
  }

  function answer(value: DecisionRushAnswer): void {
    if (!runningRef.current || finishedRef.current || !currentTrialRef.current) {
      return;
    }
    if (pendingAnswerRef.current != null) {
      return;
    }
    pendingAnswerRef.current = value;
    pendingAnswerAtRef.current = Date.now();
    setLiveAnswerState("pending");
    setLastAnswerLabel(value === "yes" ? "Ответ: ДА" : "Ответ: НЕТ");
  }

  useEffect(() => () => clearLoop(), []);

  useEffect(() => {
    if (!activeUserId || !result || saved) {
      return;
    }

    let cancelled = false;
    const session = buildSession(activeUserId, setup, result);
    const modeId = modeIdFromDecisionLevel(setup.level);

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
          "decision_rush",
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
          setSaveError("Не удалось сохранить результаты Decision Rush.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeUserId, result, saved, setup]);

  return (
    <section className="panel" data-testid="decision-session-page">
      <h2>Decision Rush</h2>
      <p>
        Быстрый тренажер принятия решений по правилам «ДА/НЕТ». Правила меняются по ходу
        серии.
      </p>
      <p className="active-user-inline" data-testid="session-active-user">
        Активный пользователь: <strong>{activeUserName}</strong>
      </p>

      <div className="stats-grid">
        <StatCard title="Уровень" value={levelLabel(setup.level)} />
        <StatCard title="Фаза" value={phaseLabel(currentPhase)} />
        <StatCard title="Шаг" value={String(trialIndex)} />
        <StatCard title="Темп" value={`${intervalMs} мс`} />
        <StatCard title="Комбо" value={`x${combo}`} />
        <StatCard title="Верно" value={String(liveCorrectCount)} />
        <StatCard title="Ошибки" value={String(liveErrorCount)} />
        <StatCard title="Точность" value={`${liveAccuracyPercent}%`} />
        <StatCard title="Осталось" value={formatSeconds(remainingMs)} />
      </div>

      {!isRunning && !finished ? (
        <section className="session-brief" data-testid="decision-session-intro">
          <h3>Перед стартом</h3>
          <p>Уровень: {levelLabel(setup.level)}</p>
          <p>Длительность: {setup.durationSec} сек</p>
          <p>Нажмите «Старт», когда будете готовы.</p>
        </section>
      ) : null}

      <section className="decision-arena" data-testid="decision-arena">
        <div className="decision-rule-box">
          <p className="decision-rule-caption">{currentTrial?.prompt.title ?? "Текущее правило"}</p>
          <p className="decision-rule-main">
            {currentTrial ? compactPromptText(currentTrial.prompt.description) : "Нажмите «Старт»"}
          </p>
          <p className="decision-rule-help">ДА = условие верно, НЕТ = условие неверно.</p>
        </div>

        <div className="decision-stimulus-card" data-testid="decision-stimulus-card">
          {currentTrial ? (
            <>
              {currentTrial.stimulus.stroopWord ? (
                <p
                  className="decision-stimulus-main"
                  style={{
                    color: COLOR_HEX[currentTrial.stimulus.stroopInk ?? currentTrial.stimulus.color]
                  }}
                >
                  {colorLabel(currentTrial.stimulus.stroopWord).toUpperCase()}
                </p>
              ) : (
                <div className="decision-visual-main">
                  <div
                    className={decisionShapeClass(currentTrial.stimulus.shape)}
                    style={decisionShapeStyle(
                      currentTrial.stimulus.shape,
                      currentTrial.stimulus.color
                    )}
                  >
                    <span className="decision-shape-number">
                      {currentTrial.stimulus.number}
                    </span>
                  </div>
                  <p className="decision-stimulus-note">
                    Сравните карточку с правилом и выберите «ДА» или «НЕТ».
                  </p>
                </div>
              )}
            </>
          ) : (
            <p className="status-line">Стимул появится после старта.</p>
          )}
        </div>

        <div className="decision-live-meta">
          <p className="reaction-live-timer">Прогресс: {progressPct}%</p>
          {lastAnswerLabel ? <p className="status-line">{lastAnswerLabel}</p> : null}
        </div>

        {isRunning && !finished ? (
          <div className="decision-answer-grid">
            <button
              type="button"
              className={
                currentAnswerLocked && pendingAnswerRef.current === "yes"
                  ? "decision-answer-btn decision-answer-btn-yes is-active"
                  : "decision-answer-btn decision-answer-btn-yes"
              }
              onClick={() => answer("yes")}
              disabled={!isRunning || currentAnswerLocked}
              data-testid="decision-answer-yes"
            >
              ДА
            </button>
            <button
              type="button"
              className={
                currentAnswerLocked && pendingAnswerRef.current === "no"
                  ? "decision-answer-btn decision-answer-btn-no is-active"
                  : "decision-answer-btn decision-answer-btn-no"
              }
              onClick={() => answer("no")}
              disabled={!isRunning || currentAnswerLocked}
              data-testid="decision-answer-no"
            >
              НЕТ
            </button>
          </div>
        ) : null}
      </section>

      {!finished && !isRunning ? (
        <div className="action-row">
          <button
            type="button"
            className="btn-primary decision-start-btn"
            onClick={startSession}
            data-testid="decision-start-session-btn"
          >
            {startedAtMs == null ? "Старт" : "Новая серия"}
          </button>
        </div>
      ) : null}

      {result ? (
        <SessionResultSummary
          testId="decision-result"
          title="Результаты Decision Rush"
          metrics={[
            { label: "Score", value: result.score.toFixed(2) },
            { label: "Точность", value: `${(result.accuracy * 100).toFixed(1)}%` },
            { label: "P90", value: `${Math.round(result.reactionP90Ms)} мс` },
            { label: "Ошибки", value: String(result.errors) },
            { label: "Лучшее комбо", value: `x${result.bestCombo}` },
            { label: "Очки", value: String(result.points) }
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
          tip={buildTip(result)}
          saveState={{
            testId: "decision-save-status",
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

