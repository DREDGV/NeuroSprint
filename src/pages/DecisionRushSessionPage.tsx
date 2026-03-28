import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useLocation } from "react-router-dom";
import { useActiveUserDisplayName } from "../app/useActiveUserDisplayName";
import {
  sessionRepository,
  type SessionSaveResult
} from "../entities/session/sessionRepository";
import { trainingRepository } from "../entities/training/trainingRepository";
import {
  adaptDecisionIntervalMs,
  DECISION_RUSH_INTERVAL_MAX_MS,
  DECISION_RUSH_INTERVAL_MIN_MS,
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
import { buildSessionProgressNotes } from "../shared/lib/progress/sessionProgressFeedback";
import { SessionResultSummary } from "../shared/ui/SessionResultSummary";
import { StatCard } from "../shared/ui/StatCard";
import type { Session } from "../shared/types/domain";
import { SessionRewardQueue } from "../widgets/SessionRewardQueue";

interface DecisionRushSessionNavState {
  setup?: DecisionRushSetup;
}

type LiveAnswerState = "pending" | "correct" | "error" | null;
type DecisionTempoId = "slow" | "normal" | "fast";

const COLOR_HEX: Record<DecisionRushColor, string> = {
  red: "#cf3f3f",
  green: "#1f9a5a",
  yellow: "#db9e18",
  blue: "#2f73cc"
};

const DECISION_TEMPO_STORAGE_KEY = "ns.decisionRushTempo";
const DECISION_TRANSITION_MS = 150;
const TEMPO_MULTIPLIER: Record<DecisionTempoId, number> = {
  slow: 1.25,
  normal: 1,
  fast: 0.85
};

function clampDecisionInterval(value: number): number {
  return Math.max(DECISION_RUSH_INTERVAL_MIN_MS, Math.min(DECISION_RUSH_INTERVAL_MAX_MS, value));
}

function readTempoPreference(): DecisionTempoId {
  const raw = localStorage.getItem(DECISION_TEMPO_STORAGE_KEY);
  if (raw === "slow" || raw === "normal" || raw === "fast") {
    return raw;
  }
  return "normal";
}

function saveTempoPreference(value: DecisionTempoId): void {
  localStorage.setItem(DECISION_TEMPO_STORAGE_KEY, value);
}

function tempoLabel(value: DecisionTempoId): string {
  if (value === "slow") {
    return "Медленно";
  }
  if (value === "fast") {
    return "Быстро";
  }
  return "Нормально";
}

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
    return "Легко";
  }
  if (level === "pro") {
    return "Эксперт";
  }
  return "Стандарт";
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
  metrics: DecisionRushSessionMetrics,
  baseStimulusIntervalMs: number
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
      decisionStimulusIntervalMs: baseStimulusIntervalMs
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
  const [isPaused, setIsPaused] = useState(false);
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
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [lastAnswerLabel, setLastAnswerLabel] = useState<string | null>(null);
  const [result, setResult] = useState<DecisionRushSessionMetrics | null>(null);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [previousSession, setPreviousSession] = useState<Session | null>(null);
  const [bestSession, setBestSession] = useState<Session | null>(null);
  const [sessionProgress, setSessionProgress] = useState<SessionSaveResult | null>(null);
  const [tempoId, setTempoId] = useState<DecisionTempoId>(() => readTempoPreference());

  const loopTimerRef = useRef<number | null>(null);
  const transitionTimerRef = useRef<number | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const pausedAtRef = useRef<number | null>(null);
  const trialStartedAtRef = useRef<number | null>(null);
  const tempoMultiplierRef = useRef<number>(TEMPO_MULTIPLIER[tempoId]);
  const intervalRef = useRef(
    clampDecisionInterval(
      Math.round(initialDecisionIntervalMs(setup.level) * tempoMultiplierRef.current)
    )
  );
  const pendingAnswerRef = useRef<DecisionRushAnswer | null>(null);
  const pendingAnswerAtRef = useRef<number | null>(null);
  const feedbackTimerRef = useRef<number | null>(null);
  const currentTrialRef = useRef<DecisionRushTrial | null>(null);
  const resultsRef = useRef<DecisionRushTrialResult[]>([]);
  const trialIndexRef = useRef(0);
  const comboRef = useRef(0);
  const finishedRef = useRef(false);
  const runningRef = useRef(false);
  const pausedRef = useRef(false);
  const transitioningRef = useRef(false);

  const durationMs = useMemo(() => setup.durationSec * 1000, [setup.durationSec]);
  const startedAtMs = startedAtRef.current;
  const effectiveTickMs = isPaused && pausedAtRef.current != null ? pausedAtRef.current : tickMs;
  const elapsedMs =
    startedAtMs == null ? 0 : Math.max(0, Math.min(durationMs, effectiveTickMs - startedAtMs));
  const remainingMs = Math.max(0, durationMs - elapsedMs);
  const progressPct =
    durationMs > 0 ? Math.min(100, Math.round((elapsedMs / durationMs) * 100)) : 0;
  const currentPhase = currentTrial?.phase ?? resolveDecisionPhase(elapsedMs, setup.durationSec);
  const currentAnswerLocked = pendingAnswerRef.current != null;
  const liveAccuracyPercent =
    liveScoredCount > 0 ? Math.round((liveCorrectCount / liveScoredCount) * 100) : 0;
  const trialElapsedMs =
    trialStartedAtRef.current == null
      ? 0
      : Math.max(0, effectiveTickMs - trialStartedAtRef.current);
  const trialRemainingMs = Math.max(0, intervalMs - trialElapsedMs);
  const trialRemainingPct =
    intervalMs > 0 ? Math.min(100, Math.round((trialRemainingMs / intervalMs) * 100)) : 0;
  const lastAnswerClass =
    liveAnswerState === "correct"
      ? "decision-last-answer is-correct"
      : liveAnswerState === "error"
        ? "decision-last-answer is-error"
        : liveAnswerState === "pending"
          ? "decision-last-answer is-pending"
          : "decision-last-answer";
  const stimulusCardClass =
    liveAnswerState === "correct"
      ? "decision-stimulus-card is-correct"
      : liveAnswerState === "error"
        ? "decision-stimulus-card is-error"
        : liveAnswerState === "pending"
          ? "decision-stimulus-card is-pending"
          : "decision-stimulus-card";
  const liveStateText = !isRunning
    ? finished
      ? "Сессия завершена. Посмотрите результат ниже."
      : "Нажмите «Старт», чтобы начать серию."
    : isPaused
      ? "Пауза: нажмите «Продолжить»."
      : isTransitioning
        ? "Ответ принят, показываем следующий стимул..."
      : currentAnswerLocked
        ? "Ответ принят, готовим следующий стимул..."
        : "Можно отвечать: выберите «ДА» или «НЕТ».";

  function clearLoop(): void {
    if (loopTimerRef.current != null) {
      window.clearInterval(loopTimerRef.current);
      loopTimerRef.current = null;
    }
  }

  function clearTransitionTimer(): void {
    if (transitionTimerRef.current != null) {
      window.clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
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
    clearTransitionTimer();
    clearFeedbackTimer();
    startedAtRef.current = null;
    pausedAtRef.current = null;
    trialStartedAtRef.current = null;
    currentTrialRef.current = null;
    pendingAnswerRef.current = null;
    pendingAnswerAtRef.current = null;
    resultsRef.current = [];
    trialIndexRef.current = 0;
    comboRef.current = 0;
    runningRef.current = false;
    pausedRef.current = false;
    finishedRef.current = false;
    transitioningRef.current = false;
    intervalRef.current = clampDecisionInterval(
      Math.round(initialDecisionIntervalMs(setup.level) * tempoMultiplierRef.current)
    );
    setIsPaused(false);
    setIsTransitioning(false);
    setIntervalMs(intervalRef.current);
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
      setLastAnswerLabel("Разминка: ответ принят (без влияния на score)");
    }
    pendingAnswerRef.current = null;
    pendingAnswerAtRef.current = null;

    const scored = resultsRef.current.filter((entry) => entry.phase !== "warmup");
    if (scored.length > 0 && scored.length % 10 === 0) {
      const currentBase = Math.round(intervalRef.current / tempoMultiplierRef.current);
      const nextBase = adaptDecisionIntervalMs(currentBase, scored.slice(-10));
      const next = clampDecisionInterval(Math.round(nextBase * tempoMultiplierRef.current));
      intervalRef.current = next;
      setIntervalMs(next);
    }
  }

  function startNextTrial(nowMs: number): void {
    transitioningRef.current = false;
    setIsTransitioning(false);
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

  function scheduleNextTrial(): void {
    clearTransitionTimer();
    transitioningRef.current = true;
    setIsTransitioning(true);
    transitionTimerRef.current = window.setTimeout(() => {
      transitionTimerRef.current = null;
      if (!runningRef.current || finishedRef.current || pausedRef.current) {
        transitioningRef.current = false;
        setIsTransitioning(false);
        return;
      }
      startNextTrial(Date.now());
    }, DECISION_TRANSITION_MS);
  }

  function advanceAfterAnswer(nowMs: number): void {
    if (!runningRef.current || finishedRef.current || pausedRef.current) {
      return;
    }

    const startedAt = startedAtRef.current;
    if (startedAt == null) {
      return;
    }

    const elapsed = nowMs - startedAt;
    if (elapsed >= durationMs) {
      finishSession(nowMs);
      return;
    }

    commitCurrentTrial(nowMs);
    scheduleNextTrial();
  }

  function startLoop(): void {
    clearLoop();
    loopTimerRef.current = window.setInterval(() => {
      const now = Date.now();
      setTickMs(now);

      if (!runningRef.current || finishedRef.current || pausedRef.current) {
        return;
      }
      if (transitioningRef.current) {
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

  function finishSession(nowMs: number): void {
    if (finishedRef.current) {
      return;
    }

    clearTransitionTimer();
    transitioningRef.current = false;
    setIsTransitioning(false);
    commitCurrentTrial(nowMs);
    currentTrialRef.current = null;
    setCurrentTrial(null);
    finishedRef.current = true;
    runningRef.current = false;
    pausedRef.current = false;
    pausedAtRef.current = null;
    setIsRunning(false);
    setIsPaused(false);
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
    pausedAtRef.current = null;
    runningRef.current = true;
    pausedRef.current = false;
    finishedRef.current = false;
    intervalRef.current = clampDecisionInterval(
      Math.round(initialDecisionIntervalMs(setup.level) * tempoMultiplierRef.current)
    );

    setIsRunning(true);
    setIsPaused(false);
    setFinished(false);
    setIntervalMs(intervalRef.current);
    startNextTrial(nowMs);
    startLoop();
  }

  function pauseSession(): void {
    if (!runningRef.current || finishedRef.current || pausedRef.current) {
      return;
    }
    const now = Date.now();
    pausedRef.current = true;
    pausedAtRef.current = now;
    clearTransitionTimer();
    transitioningRef.current = false;
    setIsTransitioning(false);
    setIsPaused(true);
    setTickMs(now);
    setLastAnswerLabel("Пауза");
    clearLoop();
  }

  function resumeSession(): void {
    if (!runningRef.current || finishedRef.current || !pausedRef.current) {
      return;
    }
    const now = Date.now();
    const pausedAt = pausedAtRef.current ?? now;
    const shiftMs = Math.max(0, now - pausedAt);
    if (startedAtRef.current != null) {
      startedAtRef.current += shiftMs;
    }
    if (trialStartedAtRef.current != null) {
      trialStartedAtRef.current += shiftMs;
    }
    pausedRef.current = false;
    pausedAtRef.current = null;
    setIsPaused(false);
    setTickMs(now);
    setLastAnswerLabel("Продолжаем");
    startLoop();
  }

  function applyTempo(nextTempo: DecisionTempoId): void {
    if (nextTempo === tempoId) {
      return;
    }

    const previousMultiplier = tempoMultiplierRef.current;
    const nextMultiplier = TEMPO_MULTIPLIER[nextTempo];
    tempoMultiplierRef.current = nextMultiplier;
    setTempoId(nextTempo);
    saveTempoPreference(nextTempo);

    const previousInterval = intervalRef.current;
    const baseInterval = Math.round(previousInterval / previousMultiplier);
    const nextInterval = clampDecisionInterval(Math.round(baseInterval * nextMultiplier));

    const anchorNow = pausedRef.current && pausedAtRef.current != null ? pausedAtRef.current : Date.now();
    if (trialStartedAtRef.current != null && currentTrialRef.current != null && previousInterval > 0) {
      const elapsed = Math.max(0, anchorNow - trialStartedAtRef.current);
      const progress = Math.max(0, Math.min(1, elapsed / previousInterval));
      trialStartedAtRef.current = anchorNow - Math.round(progress * nextInterval);
    }

    intervalRef.current = nextInterval;
    setIntervalMs(nextInterval);
    setTickMs(anchorNow);
  }

  function restartSession(): void {
    resetRuntimeState();
    setIsRunning(false);
    setIsPaused(false);
    setFinished(false);
    setTickMs(Date.now());
    setTrialIndex(0);
    setCurrentTrial(null);
    setIntervalMs(
      clampDecisionInterval(
        Math.round(initialDecisionIntervalMs(setup.level) * tempoMultiplierRef.current)
      )
    );
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
    if (!runningRef.current || finishedRef.current || pausedRef.current || !currentTrialRef.current) {
      return;
    }
    if (pendingAnswerRef.current != null) {
      return;
    }
    pendingAnswerRef.current = value;
    const now = Date.now();
    pendingAnswerAtRef.current = now;
    setLiveAnswerState("pending");
    setLastAnswerLabel(value === "yes" ? "Ответ принят: ДА" : "Ответ принят: НЕТ");
    advanceAfterAnswer(now);
  }

  useEffect(
    () => () => {
      clearLoop();
      clearTransitionTimer();
      clearFeedbackTimer();
    },
    []
  );

  // Управление клавиатурой: стрелки ←/→ или A/D
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Блокируем обработку если сессия не активна или есть заблокированный ответ
      if (!isRunning || finished || isPaused || currentAnswerLocked || isTransitioning) {
        return;
      }

      // Стрелка влево или A = ДА (yes) — левая кнопка
      if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A" || event.key === "ф" || event.key === "Ф") {
        event.preventDefault();
        answer("yes");
      }
      // Стрелка вправо или D = НЕТ (no) — правая кнопка
      else if (event.key === "ArrowRight" || event.key === "d" || event.key === "D" || event.key === "в" || event.key === "В") {
        event.preventDefault();
        answer("no");
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isRunning, finished, isPaused, currentAnswerLocked, isTransitioning]);

  useEffect(() => {
    if (!activeUserId || !result || saved) {
      return;
    }

    let cancelled = false;
    const session = buildSession(
      activeUserId,
      setup,
      result,
      clampDecisionInterval(
        Math.round(initialDecisionIntervalMs(setup.level) * tempoMultiplierRef.current)
      )
    );
    const modeId = modeIdFromDecisionLevel(setup.level);
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
        <StatCard title="Темп" value={`${tempoLabel(tempoId)} · ${intervalMs} мс`} />
        <StatCard title="Комбо" value={`x${combo}`} />
        <StatCard title="Верно" value={String(liveCorrectCount)} />
        <StatCard title="Ошибки" value={String(liveErrorCount)} />
        <StatCard title="Точность" value={`${liveAccuracyPercent}%`} />
        <StatCard title="Осталось" value={formatSeconds(remainingMs)} />
      </div>

      {/* Прогресс-бар сессии с индикатором фазы */}
      {isRunning && (
        <div className="decision-session-progress" data-testid="decision-session-progress">
          <div className="decision-session-progress-bar">
            <div 
              className="decision-session-progress-fill" 
              style={{ width: `${progressPct}%` }}
              role="progressbar"
              aria-valuenow={progressPct}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
          <div className="decision-phase-indicators">
            <span className={`decision-phase-dot ${currentPhase === "warmup" ? "is-active" : ""}`} title="Разминка" />
            <span className={`decision-phase-dot ${currentPhase === "core" ? "is-active" : ""}`} title="Основной блок" />
            <span className={`decision-phase-dot ${currentPhase === "boss" ? "is-active" : ""}`} title="Boss" />
          </div>
        </div>
      )}

      {!isRunning && !finished ? (
        <section className="session-brief" data-testid="decision-session-intro">
          <h3>Перед стартом</h3>
          <p>Уровень: {levelLabel(setup.level)}</p>
          <p>Длительность: {setup.durationSec} сек</p>
          <p>Нажмите «Старт», когда будете готовы.</p>
        </section>
      ) : null}

      <section className="decision-arena" data-testid="decision-arena">
        <div className="decision-control-row">
          <div className="decision-tempo-group" role="group" aria-label="Темп">
            <button
              type="button"
              className={tempoId === "slow" ? "btn-secondary is-active" : "btn-secondary"}
              onClick={() => applyTempo("slow")}
              data-testid="decision-tempo-slow"
            >
              Медленно
            </button>
            <button
              type="button"
              className={tempoId === "normal" ? "btn-secondary is-active" : "btn-secondary"}
              onClick={() => applyTempo("normal")}
              data-testid="decision-tempo-normal"
            >
              Нормально
            </button>
            <button
              type="button"
              className={tempoId === "fast" ? "btn-secondary is-active" : "btn-secondary"}
              onClick={() => applyTempo("fast")}
              data-testid="decision-tempo-fast"
            >
              Быстро
            </button>
          </div>
          {isRunning ? (
            <button
              type="button"
              className="btn-ghost"
              onClick={isPaused ? resumeSession : pauseSession}
              data-testid="decision-pause-toggle"
            >
              {isPaused ? "Продолжить" : "Пауза"}
            </button>
          ) : null}
        </div>

        {isPaused ? <p className="decision-paused-banner">Пауза. Нажмите «Продолжить».</p> : null}

        <div className="decision-rule-box">
          <p className="decision-rule-caption">{currentTrial?.prompt.title ?? "Текущее правило"}</p>
          <p className="decision-rule-main">
            {currentTrial ? compactPromptText(currentTrial.prompt.description) : "Нажмите «Старт»"}
          </p>
          <p className="decision-rule-help">ДА = условие верно, НЕТ = условие неверно.</p>
        </div>

        <div className={stimulusCardClass} data-testid="decision-stimulus-card">
          {currentTrial ? (
            <>
              {currentTrial.stimulus.stroopWord ? (
                <div className="decision-stroop-display">
                  <p
                    className="decision-stimulus-main decision-stroop-word"
                    style={{
                      color: COLOR_HEX[currentTrial.stimulus.stroopInk ?? currentTrial.stimulus.color]
                    }}
                  >
                    {colorLabel(currentTrial.stimulus.stroopWord).toUpperCase()}
                  </p>
                  <p className="decision-stroop-hint">
                    Сравните <strong>цвет слова</strong> с <strong>значением слова</strong>
                  </p>
                </div>
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
          <div className="decision-step-timer" aria-hidden={!isRunning}>
            <div className="decision-step-track">
              <div
                className="decision-step-fill"
                style={{ width: `${trialRemainingPct}%` }}
              />
            </div>
            <span className="decision-step-value">{trialRemainingMs} мс на шаг</span>
          </div>
          <p className="status-line" data-testid="decision-live-state">{liveStateText}</p>
          {lastAnswerLabel ? <p className={lastAnswerClass}>{lastAnswerLabel}</p> : null}
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
              disabled={!isRunning || isPaused || currentAnswerLocked || isTransitioning}
              data-testid="decision-answer-yes"
              aria-keyshortcuts="ArrowLeft, a, A, ф, Ф"
            >
              <span className="decision-answer-label">ДА</span>
              <span className="decision-answer-keyboard-hint">
                <kbd>←</kbd> <kbd>A</kbd>
              </span>
            </button>
            <button
              type="button"
              className={
                currentAnswerLocked && pendingAnswerRef.current === "no"
                  ? "decision-answer-btn decision-answer-btn-no is-active"
                  : "decision-answer-btn decision-answer-btn-no"
              }
              onClick={() => answer("no")}
              disabled={!isRunning || isPaused || currentAnswerLocked || isTransitioning}
              data-testid="decision-answer-no"
              aria-keyshortcuts="ArrowRight, d, D, в, В"
            >
              <span className="decision-answer-label">НЕТ</span>
              <span className="decision-answer-keyboard-hint">
                <kbd>→</kbd> <kbd>D</kbd>
              </span>
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
          extraNotes={buildSessionProgressNotes(sessionProgress)}
          retryLabel="Начать заново"
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

