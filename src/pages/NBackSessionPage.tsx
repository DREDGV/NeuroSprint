import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useActiveUserDisplayName } from "../app/useActiveUserDisplayName";
import {
  sessionRepository,
  type SessionSaveResult
} from "../entities/session/sessionRepository";
import { trainingRepository } from "../entities/training/trainingRepository";
import {
  calculateNBackSteps,
  generateNBackStepTasks,
  modeIdFromNBackLevel,
  normalizeNBackSetup,
  type NBackSessionMetrics,
  type NBackSetup,
  type NBackStepTask
} from "../features/nback/engine";
import {
  applyGameResult,
  loadProgress,
  resetProgress,
  type NBackProgress,
  type ProgressResult
} from "../features/nback/nbackProgress";
import { getNBackSetup } from "../features/nback/setupStorage";
import { DEFAULT_AUDIO_SETTINGS } from "../shared/lib/audio/audioSettings";
import { toLocalDateKey } from "../shared/lib/date/date";
import { createId } from "../shared/lib/id";
import { buildSessionProgressNotes } from "../shared/lib/progress/sessionProgressFeedback";
import { SessionResultSummary } from "../shared/ui/SessionResultSummary";
import type { Session, TimeLimitSec } from "../shared/types/domain";
import { SessionRewardQueue } from "../widgets/SessionRewardQueue";

// ─── Звуки ────────────────────────────────────────────────────────────────────

let audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
}

function playStimulusSound(): void {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  } catch {
    /* Audio not available */
  }
}

function playCorrectSound(): void {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  } catch {
    /* Audio not available */
  }
}

function playWrongSound(): void {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "square";
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.25);
  } catch {
    /* Audio not available */
  }
}

// ─── Типы ─────────────────────────────────────────────────────────────────────

interface NBackSessionNavState {
  setup?: NBackSetup;
}

// Фазы пошагового режима
type GamePhase = 'idle' | 'show' | 'answer' | 'feedback' | 'finished';

// ─── Хелперы ──────────────────────────────────────────────────────────────────

function formatSigned(value: number, digits = 2): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}`;
}

function pickBestSession(sessions: Session[]): Session | null {
  if (sessions.length === 0) return null;
  return sessions.reduce((best, cur) => (cur.score > best.score ? cur : best));
}

function buildNBackTip(metrics: NBackSessionMetrics, level: NBackSetup["level"]): string {
  if (metrics.accuracy < 0.6) {
    return "Попробуйте режим обучения или уменьшите уровень. Сначала стабилизируйте точность на 1-back.";
  }
  if (metrics.accuracy < 0.75) {
    return "Неплохо! Сосредоточьтесь: нажимайте «Совпало» только когда уверены. Лучше пропустить, чем ошибиться.";
  }
  if (metrics.falseAlarm > metrics.miss) {
    return "Слишком много ложных нажатий. Делайте паузу перед ответом — не спешите.";
  }
  if (metrics.miss > metrics.falseAlarm * 2) {
    return "Вы часто пропускаете совпадения. Будьте внимательнее — старайтесь реагировать на каждое совпадение.";
  }
  if (level === 1 && metrics.accuracy > 0.85) {
    return "Отлично! Попробуйте 2-back или увеличьте сетку до 4×4.";
  }
  if (level === 2 && metrics.accuracy > 0.85) {
    return "Впечатляюще! 2-back на высокой точности — попробуйте 3-back.";
  }
  if (metrics.maxCombo >= 10) {
    return `🔥 Серия из ${metrics.maxCombo} подряд! Вы отлично держите позиции в памяти!`;
  }
  return "Хорошая работа! Продолжайте тренировать рабочую память.";
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

// ─── Компонент ────────────────────────────────────────────────────────────────

export function NBackSessionPage() {
  const location = useLocation();
  const { activeUserId } = useActiveUserDisplayName();
  const state = (location.state as NBackSessionNavState | null) ?? null;
  const [setup] = useState<NBackSetup>(() => {
    const saved = normalizeNBackSetup(state?.setup ?? getNBackSetup());
    const progress = loadProgress();
    // Используем адаптивный уровень из системы прогрессии
    return { ...saved, level: progress.currentLevel };
  });

  // Система прогрессии — объявляем до totalTasks
  const [progress, setProgress] = useState<NBackProgress>(() => loadProgress());
  const [progressResult, setProgressResult] = useState<ProgressResult | null>(null);
  const [showProgressModal, setShowProgressModal] = useState(false);

  const totalTasks = useMemo(() => calculateNBackSteps(setup.durationSec, progress.currentLevel), [setup.durationSec, progress.currentLevel]);
  const totalCells = setup.gridSize * setup.gridSize;

  // Пошаговые задачи
  const [tasks, setTasks] = useState<NBackStepTask[]>([]);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);

  // Состояние игры — пошаговый режим
  const [phase, setPhase] = useState<GamePhase>('idle'); // idle → memorize → show → answer → feedback → finished
  const [stimulusVisible, setStimulusVisible] = useState(false);
  
  // Ответы
  const [responses, setResponses] = useState<boolean[]>([]);
  
  // Результаты
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

  // Мгновенная обратная связь
  const [lastFeedbackCorrect, setLastFeedbackCorrect] = useState<boolean | null>(null);
  const [feedbackVisible, setFeedbackVisible] = useState(false);

  const lastStimulusCell = useRef<number | null>(null);
  const stimulusShowMs = 800;

  // Текущая задача
  const currentTask = currentTaskIndex < tasks.length ? tasks[currentTaskIndex] : null;
  const isMemorizePhase = currentTaskIndex < setup.level;
  const totalProgressPct = tasks.length > 0 ? Math.round((currentTaskIndex / tasks.length) * 100) : 0;

  // ─── Следующая задача ──────────────────────────────────────────────

  function goToNextTask(): void {
    setCurrentTaskIndex((prevIdx) => {
      const nextIdx = prevIdx + 1;

      if (nextIdx >= tasks.length) {
        // Все задачи пройдены
        setFinished(true);
        setPhase('finished');
        return prevIdx;
      }

      // Показываем стимул следующей задачи
      setPhase('show');
      setStimulusVisible(true);
      return nextIdx;
    });
  }

  // ─── Таймер показа стимула ─────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'show' || !currentTask) return;

    const timer = setTimeout(() => {
      setStimulusVisible(false);
      // Если это задача запоминания (первые N задач) — сразу переходим к следующей
      if (currentTaskIndex < progress.currentLevel) {
        goToNextTask();
      } else {
        // Иначе переходим к фазе ответа
        setPhase('answer');
      }
    }, stimulusShowMs);

    return () => clearTimeout(timer);
  }, [phase, currentTaskIndex]);

  // ─── Звук при показе клетки ────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'show' || !currentTask) return;
    if (currentTask.stimulusCell === lastStimulusCell.current) return;

    lastStimulusCell.current = currentTask.stimulusCell;
    playStimulusSound();
  }, [phase, currentTask?.stimulusCell]);

  // ─── Обратная связь → следующая задача ─────────────────────────────

  useEffect(() => {
    if (phase !== 'feedback') return;

    const timer = setTimeout(() => {
      setFeedbackVisible(false);
      goToNextTask();
    }, 1000);

    return () => clearTimeout(timer);
  }, [phase]);

  // ─── Расчёт результатов при завершении ─────────────────────────────

  useEffect(() => {
    if (!finished || tasks.length === 0) return;

    let correct = 0;
    let errors = 0;
    let combo = 0;
    let maxC = 0;
    let hit = 0;
    let miss = 0;
    let falseAlarm = 0;
    let correctReject = 0;

    const level = progress.currentLevel;
    // responses[i] соответствует tasks[i + level]
    for (let i = 0; i < responses.length; i++) {
      const taskIndex = i + level;
      const isTarget = tasks[taskIndex]?.isMatch ?? false;
      const answeredMatch = responses[i];
      const isCorrect = answeredMatch === isTarget;

      if (isTarget && answeredMatch) hit++;
      else if (isTarget && !answeredMatch) miss++;
      else if (!isTarget && answeredMatch) falseAlarm++;
      else correctReject++;

      if (isCorrect) {
        correct += 1;
        combo += 1;
        maxC = Math.max(maxC, combo);
      } else {
        errors += 1;
        combo = 0;
      }
    }

    const answerableTasks = responses.length;
    const accuracy = answerableTasks > 0 ? correct / answerableTasks : 0;
    
    console.log('[N-Back Calc] Tasks:', tasks.length, 'Level:', level, 'Responses:', responses.length);
    console.log('[N-Back Calc] Hit:', hit, 'Miss:', miss, 'FA:', falseAlarm, 'CR:', correctReject);
    console.log('[N-Back Calc] Correct:', correct, 'Errors:', errors, 'Accuracy:', accuracy.toFixed(2));
    
    const speed = correct;
    const comboBonus = 1 + (maxC * 0.05);
    const score = speed * (0.7 + 0.3 * accuracy) * comboBonus;

    const metrics: NBackSessionMetrics = {
      hit,
      miss,
      falseAlarm,
      correctReject,
      totalSteps: tasks.length,
      correctCount: correct,
      errors,
      effectiveCorrect: correct - errors * 0.5,
      accuracy: Math.max(0, Math.min(1, accuracy)),
      speed,
      score,
      combo,
      maxCombo: maxC
    };

    setResult(metrics);

    // Применяем систему прогрессии
    console.log('[N-Back Progress] Before:', JSON.stringify(progress));
    console.log('[N-Back Progress] Accuracy:', accuracy);
    const { progress: newProgress, result: progResult } = applyGameResult(progress, accuracy);
    console.log('[N-Back Progress] After:', JSON.stringify(newProgress));
    console.log('[N-Back Progress] Action:', progResult.action.type, progResult.message);
    setProgress(newProgress);
    setProgressResult(progResult);
    setShowProgressModal(true);
  }, [finished, tasks, responses, progress.currentLevel]);

  // ─── Статистика в реальном времени ─────────────────────────────────

  useEffect(() => {
    let correct = 0;
    let errors = 0;
    let combo = 0;
    let maxC = 0;

    for (let i = progress.currentLevel; i < responses.length; i++) {
      const isTarget = tasks[i]?.isMatch ?? false;
      const isCorrect = responses[i] === isTarget;
      if (isCorrect) {
        correct += 1;
        combo += 1;
        maxC = Math.max(maxC, combo);
      } else {
        errors += 1;
        combo = 0;
      }
    }

    setCorrectCount(correct);
    setErrorCount(errors);
    setCurrentCombo(combo);
    setMaxCombo(maxC);
  }, [responses, tasks, progress.currentLevel]);

  // ─── Сохранение результата ─────────────────────────────────────────

  useEffect(() => {
    if (!activeUserId || !result || saved) return;

    let cancelled = false;
    const session = buildSession(activeUserId, setup, result);
    const modeId = modeIdFromNBackLevel(setup.level, setup.gridSize);
    setSessionProgress(null);

    void sessionRepository
      .save(session)
      .then(async (saveResult) => {
        if (cancelled) return;
        setSaved(true);
        setSaveError(null);
        setSessionProgress(saveResult);

        const history = await trainingRepository.listRecentSessionsByMode(
          activeUserId,
          "n_back",
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

    return () => {
      cancelled = true;
    };
  }, [activeUserId, result, saved, setup]);

  // ─── Старт сессии ──────────────────────────────────────────────────

  function startSession(): void {
    const activeLevel = progress.currentLevel; // Берём актуальный уровень из прогресса
    console.log('[N-Back Start] Level:', activeLevel, 'Games at level:', progress.gamesAtLevel);
    
    const generatedTasks = generateNBackStepTasks(totalTasks, activeLevel, setup.gridSize);
    setTasks(generatedTasks);
    setCurrentTaskIndex(0);
    setResponses([]);
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
    setLastFeedbackCorrect(null);
    setFeedbackVisible(false);
    setProgressResult(null);
    setShowProgressModal(false);
    lastStimulusCell.current = null;

    // Сразу начинаем с показа первой задачи
    setPhase('show');
    setStimulusVisible(true);
  }

  function restartSession(): void {
    setTasks([]);
    setCurrentTaskIndex(0);
    setResponses([]);
    setPhase('idle');
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
    setLastFeedbackCorrect(null);
    setFeedbackVisible(false);
    setProgressResult(null);
    setShowProgressModal(false);
    lastStimulusCell.current = null;
  }

  function handleResetProgress(): void {
    if (confirm('Сбросить весь прогресс N-Назад? Вы начнёте с 1-back.')) {
      const newProgress = resetProgress();
      setProgress(newProgress);
    }
  }

  // ─── Ответ ─────────────────────────────────────────────────────────

  function answer(isMatch: boolean): void {
    if (phase !== 'answer' || !currentTask) return;

    setResponses(prev => [...prev, isMatch]);

    // Мгновенная обратная связь
    const isCorrect = isMatch === currentTask.isMatch;
    setLastFeedbackCorrect(isCorrect);
    setFeedbackVisible(true);

    if (isCorrect) {
      playCorrectSound();
    } else {
      playWrongSound();
    }

    setPhase('feedback');
  }

  // ─── Инструкция ────────────────────────────────────────────────────

  const instructionText = useMemo(() => {
    if (phase === 'idle') return "Нажмите «Старт» для начала";
    if (phase === 'finished') return "Сессия завершена";
    if (phase === 'show') return "👀 Запомните эту позицию!";
    if (phase === 'answer' && currentTask) {
      return `Такая же клетка была на шаге ${currentTaskIndex - progress.currentLevel + 1}?`;
    }
    if (phase === 'feedback') {
      return lastFeedbackCorrect ? "✓ Верно!" : "✗ Ошибка";
    }
    return "";
  }, [phase, currentTaskIndex, progress.currentLevel, currentTask, lastFeedbackCorrect]);

  // ─── Рендер ──────────────────────────────────────────────────────────

  return (
    <section className="panel nback-session-panel" data-testid="nback-session-page">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="nback-header">
        <div className="nback-header-top">
          <h2>🧠 N-Назад</h2>
          <p className="nback-subtitle">
            Уровень: <strong>{progress.currentLevel}-back</strong> • {setup.gridSize}×{setup.gridSize} • {setup.durationSec} сек
            {setup.tutorialMode && " • 🎓 обучение"}
          </p>
        </div>

        {/* Прогресс текущей сессии */}
        <div className="nback-session-progress">
          <div className="nback-progress-bar">
            <div className="nback-progress-fill" style={{ width: `${totalProgressPct}%` }} />
          </div>
          <span className="nback-progress-text">{totalProgressPct}%</span>
        </div>
      </header>

      {/* ── Статистика ─────────────────────────────────────────────── */}
      <div className="nback-stats-row">
        <div className="nback-stat-card">
          <span className="nback-stat-label">Задача</span>
          <span className="nback-stat-value">{Math.min(currentTaskIndex + 1, tasks.length)}/{tasks.length || totalTasks}</span>
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
        <button
          type="button"
          className="nback-btn nback-btn-start-small"
          onClick={phase === 'idle' || phase === 'finished' ? startSession : restartSession}
          data-testid="nback-start-session-btn"
        >
          <span className="nback-btn-icon">{phase === 'idle' || phase === 'finished' ? "▶" : "↻"}</span>
          <span className="nback-btn-text">{phase === 'idle' || phase === 'finished' ? "Старт" : "Заново"}</span>
        </button>
      </div>

      {/* ── Инструкция ────────────────────────────────────────────── */}
      <div className={`nback-instruction ${phase === 'show' ? "showing" : "answering"} ${feedbackVisible ? (lastFeedbackCorrect ? "feedback-correct" : "feedback-wrong") : ""}`}>
        {instructionText}
      </div>

      {/* ── Визуальная подсказка: позиция для сравнения ────────────── */}
      {/* Убрано — пользователь сам должен вспомнить */}

      {/* ── Игровое поле ───────────────────────────────────────────── */}
      <section className="nback-game-section">
        <div
          className="nback-grid"
          data-testid="nback-grid"
          style={
            {
              gridTemplateColumns: `repeat(${setup.gridSize}, 1fr)`,
              "--grid-size": setup.gridSize
            } as React.CSSProperties
          }
        >
          {Array.from({ length: totalCells }, (_, index) => {
            const isActive = (phase === 'show' || phase === 'answer') && currentTask?.stimulusCell === index && stimulusVisible;
            const isComparisonTarget = phase === 'answer' && currentTask?.comparisonCell === index;

            return (
              <div
                key={index}
                className={`nback-cell${isActive ? " is-active" : ""}${isComparisonTarget ? " comparison-target" : ""}`}
                data-testid={isActive ? "nback-active-cell" : undefined}
                style={isActive ? { color: "var(--nback-active-color, #22c55e)" } : undefined}
              >
                {isActive && <span className="nback-cell-content">●</span>}
              </div>
            );
          })}
        </div>

        {/* Фаза */}
        <div className="nback-step-progress">
          <div className="nback-step-progress-bar">
            <div
              className={`nback-step-progress-fill ${phase === 'show' ? "stimulus" : "pause"}`}
              style={{ width: phase === 'show' ? "100%" : "0%" }}
            />
          </div>
          <span className="nback-step-progress-text">
            {phase === 'show' ? "ПОКАЗ" : phase === 'answer' ? "ОТВЕТ" : phase === 'feedback' ? "РЕЗУЛЬТАТ" : ""}
          </span>
        </div>
      </section>

      {/* ── Кнопки управления ──────────────────────────────────────── */}
      {/* Фиксированный контейнер — всегда занимает место чтобы не было сдвигов */}
      <div className="nback-controls nback-controls-fixed-height">
        {phase === 'answer' ? (
          <>
            <button
              type="button"
              className="nback-btn nback-btn-no"
              onClick={() => answer(false)}
              data-testid="nback-answer-non-match"
            >
              <span className="nback-btn-icon">✕</span>
              <span className="nback-btn-text">Не совпало</span>
            </button>

            <button
              type="button"
              className="nback-btn nback-btn-yes"
              onClick={() => answer(true)}
              data-testid="nback-answer-match"
            >
              <span className="nback-btn-icon">✓</span>
              <span className="nback-btn-text">Совпало</span>
            </button>
          </>
        ) : (
          /* Пустой плейсхолдер — резервирует место */
          <div className="nback-controls-placeholder" />
        )}
      </div>

      {/* ── Мгновенная обратная связь (оверлей) ────────────────────── */}
      {feedbackVisible && (
        <div className={`nback-feedback-overlay ${lastFeedbackCorrect ? "correct" : "wrong"}`}>
          <span className="nback-feedback-icon">{lastFeedbackCorrect ? "✓" : "✗"}</span>
        </div>
      )}

      {/* ── Результаты ─────────────────────────────────────────────── */}
      {result ? (
        <SessionResultSummary
          testId="nback-result"
          title="Результаты N-Назад"
          metrics={[
            { label: "✅ Верно совпало", value: String(result.hit) },
            { label: "❌ Пропустил совпадение", value: String(result.miss) },
            { label: "⚠️ Ложная тревога", value: String(result.falseAlarm) },
            { label: "✅ Верно отклонил", value: String(result.correctReject) },
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

      {/* ── Модал прогрессии ──────────────────────────────────────── */}
      {showProgressModal && progressResult && (
        <div className="nback-progress-modal-overlay" onClick={() => setShowProgressModal(false)}>
          <div className="nback-progress-modal" onClick={e => e.stopPropagation()}>
            <div className="nback-progress-modal-emoji">{progressResult.emoji}</div>
            <h3 className="nback-progress-modal-title">
              {progressResult.action.type === 'level_up' && 'Уровень повышен!'}
              {progressResult.action.type === 'level_down' && 'Уровень понижен'}
              {progressResult.action.type === 'stay' && 'Продолжаем!'}
              {progressResult.action.type === 'max_games_reached' && 'Переход на следующий уровень!'}
            </h3>
            <p className="nback-progress-modal-message">{progressResult.message}</p>
            
            <div className="nback-progress-modal-levels">
              <div className={`nback-level-badge ${progressResult.action.type === 'level_up' || progressResult.action.type === 'max_games_reached' ? 'old' : ''}`}>
                <span className="nback-level-badge-label">Был</span>
                <span className="nback-level-badge-value">{progress.currentLevel === 1 ? progressResult.action.type === 'level_down' ? 1 : 1 : progressResult.action.type === 'level_down' ? progress.currentLevel + 1 : progress.currentLevel}-back</span>
              </div>
              <span className="nback-level-badge-arrow">→</span>
              <div className={`nback-level-badge ${progressResult.action.type === 'level_up' || progressResult.action.type === 'max_games_reached' ? 'new' : ''}`}>
                <span className="nback-level-badge-label">Стал</span>
                <span className="nback-level-badge-value">
                  {progressResult.action.type === 'level_up' || progressResult.action.type === 'max_games_reached' 
                    ? progress.currentLevel + 1
                    : progressResult.action.type === 'level_down'
                    ? progress.currentLevel - 1
                    : progress.currentLevel}-back
                </span>
              </div>
            </div>

            <button 
              className="nback-btn nback-btn-start" 
              onClick={() => setShowProgressModal(false)}
            >
              Продолжить
            </button>
            
            <button 
              className="nback-btn nback-btn-reset" 
              onClick={handleResetProgress}
            >
              Сбросить прогресс
            </button>
          </div>
        </div>
      )}

      <SessionRewardQueue
        levelUp={sessionProgress?.levelUp}
        nextGoalSummary={sessionProgress?.nextGoal?.primaryGoal.summary}
        achievements={sessionProgress?.unlockedAchievements}
        userId={activeUserId}
        localDate={toLocalDateKey(new Date())}
      />
      {saveError && <p className="error-text">{saveError}</p>}
    </section>
  );
}


