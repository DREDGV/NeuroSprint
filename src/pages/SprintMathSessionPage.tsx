import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useActiveUserDisplayName } from "../app/useActiveUserDisplayName";
import { sessionRepository } from "../entities/session/sessionRepository";
import { trainingRepository } from "../entities/training/trainingRepository";
import {
  buildSprintMathTask,
  calcSprintMathMetrics,
  normalizeSprintMathSetup
} from "../features/sprint-math/contract";
import { getSprintMathSetup } from "../features/sprint-math/setupStorage";
import { DEFAULT_AUDIO_SETTINGS } from "../shared/lib/audio/audioSettings";
import { toLocalDateKey } from "../shared/lib/date/date";
import { createId } from "../shared/lib/id";
import { SessionResultSummary } from "../shared/ui/SessionResultSummary";
import { StatCard } from "../shared/ui/StatCard";
import type {
  SprintMathMetrics,
  SprintMathSetup,
  SprintMathTask
} from "../features/sprint-math/contract";
import type { Session } from "../shared/types/domain";

interface SessionNavState {
  setup?: SprintMathSetup;
}

function parseAnswer(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) {
    return null;
  }
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return parsed;
}

function formatSeconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)} сек`;
}

function formatSigned(value: number, digits = 2, suffix = ""): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}${suffix}`;
}

function mapTierToLevel(tierId: SprintMathSetup["tierId"]): number {
  if (tierId === "kids") {
    return 2;
  }
  if (tierId === "standard") {
    return 5;
  }
  return 8;
}

function mapSprintModeToSessionModeId(modeId: SprintMathSetup["modeId"]): Session["modeId"] {
  if (modeId === "mixed") {
    return "sprint_mixed";
  }
  return "sprint_add_sub";
}

function createSprintMathSession(
  userId: string,
  setup: SprintMathSetup,
  metrics: SprintMathMetrics,
  correctCount: number,
  errors: number
): Session {
  const now = new Date();

  return {
    id: createId(),
    userId,
    taskId: "sprint_math",
    mode: "sprint_math",
    moduleId: "sprint_math",
    modeId: mapSprintModeToSessionModeId(setup.modeId),
    level: mapTierToLevel(setup.tierId),
    presetId: "legacy",
    adaptiveSource: "manual",
    timestamp: now.toISOString(),
    localDate: toLocalDateKey(now),
    durationMs: setup.sessionSec * 1000,
    score: metrics.score,
    accuracy: metrics.accuracy,
    speed: metrics.throughput,
    errors,
    correctCount,
    effectiveCorrect: correctCount,
    audioEnabledSnapshot: DEFAULT_AUDIO_SETTINGS,
    difficulty: {
      gridSize: 3,
      numbersCount: setup.maxOperand,
      mode: "sprint_math",
      timeLimitSec: setup.sessionSec,
      errorPenalty: 0,
      hintsEnabled: false,
      spawnStrategy: "same_cell",
      sprintTierId: setup.tierId,
      sprintMaxOperand: setup.maxOperand,
      sprintAllowNegative: setup.allowNegative,
      sprintAllowDivision: setup.allowDivision,
      sprintAutoEnter: setup.autoEnter
    }
  };
}

function getModeLabel(modeId: SprintMathSetup["modeId"]): string {
  if (modeId === "mixed") {
    return "Смешанный (+, -, *, /)";
  }
  return "Сложение и вычитание";
}

function getTierLabel(tierId: SprintMathSetup["tierId"]): string {
  if (tierId === "kids") {
    return "Дети (7-10)";
  }
  if (tierId === "standard") {
    return "Стандарт";
  }
  return "Продвинутый";
}

function pickBestSession(sessions: Session[]): Session | null {
  if (sessions.length === 0) {
    return null;
  }
  return sessions.reduce((best, current) =>
    current.score > best.score ? current : best
  );
}

function buildSprintMathTip(metrics: SprintMathMetrics, errors: number): string {
  if (metrics.accuracy < 0.85) {
    return "Старайтесь держать точность выше 85%: сначала аккуратные ответы, потом ускорение.";
  }
  if (errors > 0) {
    return "Ошибки заметно снижают score. Полезно немного снизить темп и убрать промахи.";
  }
  if (metrics.avgSolveMs > 1800) {
    return "Точность хорошая. Следующий шаг - чуть повысить темп решения.";
  }
  return "Отлично! Удерживайте этот темп и точность в серии сессий.";
}

export function SprintMathSessionPage() {
  const location = useLocation();
  const { activeUserId, activeUserName } = useActiveUserDisplayName();
  const state = (location.state as SessionNavState | null) ?? null;

  const [setup] = useState<SprintMathSetup>(() =>
    normalizeSprintMathSetup(state?.setup ?? getSprintMathSetup())
  );

  const [task, setTask] = useState<SprintMathTask>(() => buildSprintMathTask(setup));
  const [answerInput, setAnswerInput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [startedAtMs, setStartedAtMs] = useState<number | null>(null);
  const [taskStartedAtMs, setTaskStartedAtMs] = useState<number | null>(null);
  const [remainingMs, setRemainingMs] = useState(setup.sessionSec * 1000);
  const [tick, setTick] = useState(0);

  const [correctCount, setCorrectCount] = useState(0);
  const [errors, setErrors] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [solveTimesMs, setSolveTimesMs] = useState<number[]>([]);

  const [result, setResult] = useState<SprintMathMetrics | null>(null);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<"correct" | "error" | null>(null);
  const [lastExpectedAnswer, setLastExpectedAnswer] = useState<number | null>(null);
  const [previousSession, setPreviousSession] = useState<Session | null>(null);
  const [bestSession, setBestSession] = useState<Session | null>(null);

  useEffect(() => {
    if (!isRunning || finished || startedAtMs == null) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      const elapsed = Date.now() - startedAtMs;
      const left = setup.sessionSec * 1000 - elapsed;
      if (left <= 0) {
        setRemainingMs(0);
        setIsRunning(false);
        setFinished(true);
      } else {
        setRemainingMs(left);
        setTick((current) => current + 1);
      }
    }, 100);

    return () => window.clearInterval(timer);
  }, [finished, isRunning, setup.sessionSec, startedAtMs]);

  useEffect(() => {
    if (!finished || result) {
      return;
    }

    setResult(
      calcSprintMathMetrics({
        correctCount,
        errors,
        sessionSec: setup.sessionSec,
        solveTimesMs,
        streakBest: bestStreak
      })
    );
  }, [bestStreak, correctCount, errors, finished, result, setup.sessionSec, solveTimesMs]);

  useEffect(() => {
    if (!activeUserId || !result || saved) {
      return;
    }

    let cancelled = false;
    const session = createSprintMathSession(activeUserId, setup, result, correctCount, errors);

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
          "sprint_math",
          mapSprintModeToSessionModeId(setup.modeId),
          50
        );

        if (!cancelled) {
          const historical = history.filter((entry) => entry.id !== session.id);
          setPreviousSession(historical[0] ?? null);
          setBestSession(pickBestSession(historical));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSaveError("Не удалось сохранить результаты Sprint Math.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeUserId, correctCount, errors, result, saved, setup]);

  const elapsedMs = useMemo(() => {
    if (!startedAtMs) {
      return 0;
    }
    if (finished) {
      return setup.sessionSec * 1000;
    }
    return Math.max(0, Date.now() - startedAtMs);
  }, [finished, setup.sessionSec, startedAtMs, tick]);

  function resetSession() {
    setTask(buildSprintMathTask(setup));
    setAnswerInput("");
    setIsRunning(false);
    setFinished(false);
    setStartedAtMs(null);
    setTaskStartedAtMs(null);
    setRemainingMs(setup.sessionSec * 1000);
    setTick(0);
    setCorrectCount(0);
    setErrors(0);
    setCurrentStreak(0);
    setBestStreak(0);
    setSolveTimesMs([]);
    setResult(null);
    setSaved(false);
    setSaveError(null);
    setFeedback(null);
    setLastExpectedAnswer(null);
    setPreviousSession(null);
    setBestSession(null);
  }

  function finishSessionEarly() {
    if (finished || !isRunning) {
      return;
    }
    setIsRunning(false);
    setFinished(true);
    setRemainingMs(0);
  }

  function submitAnswer(answerOverride?: string) {
    if (finished) {
      return;
    }

    const now = Date.now();
    if (!isRunning) {
      setIsRunning(true);
      setStartedAtMs(now);
      setTaskStartedAtMs(now);
      return;
    }

    const expectedAnswer = task.answer;
    const parsed = parseAnswer(answerOverride ?? answerInput);
    const isCorrect = parsed != null && parsed === expectedAnswer;
    const currentTaskStart = taskStartedAtMs ?? now;
    const taskDuration = Math.max(1, now - currentTaskStart);

    setLastExpectedAnswer(expectedAnswer);

    if (isCorrect) {
      setCorrectCount((current) => current + 1);
      setSolveTimesMs((current) => [...current, taskDuration]);
      setCurrentStreak((current) => {
        const next = current + 1;
        setBestStreak((best) => Math.max(best, next));
        return next;
      });
      setFeedback("correct");
    } else {
      setErrors((current) => current + 1);
      setCurrentStreak(0);
      setFeedback("error");
    }

    setTask(buildSprintMathTask(setup));
    setAnswerInput("");
    setTaskStartedAtMs(now);
  }

  return (
    <section className="panel" data-testid="sprint-math-session-page">
      <h2>Sprint Math</h2>
      <p>
        Решайте примеры как можно быстрее. Первый клик по кнопке «Проверить»
        запускает сессию.
      </p>
      <p className="active-user-inline" data-testid="session-active-user">
        Активный пользователь: <strong>{activeUserName}</strong>
      </p>

      <div className="stats-grid">
        <StatCard title="Осталось времени" value={formatSeconds(remainingMs)} />
        <StatCard title="Прошло времени" value={formatSeconds(elapsedMs)} />
        <StatCard title="Верных ответов" value={String(correctCount)} />
        <StatCard title="Ошибок" value={String(errors)} />
        <StatCard
          title="Серия (текущая / лучшая)"
          value={`${currentStreak} / ${bestStreak}`}
        />
      </div>

      {!isRunning && !finished ? (
        <section className="session-brief">
          <h3>Параметры тренировки</h3>
          <p>Режим: {getModeLabel(setup.modeId)}</p>
          <p>Уровень: {getTierLabel(setup.tierId)}</p>
          <p>Длительность: {setup.sessionSec} сек</p>
          <p>
            Если включена авто-проверка, правильный ответ засчитывается сразу после ввода.
          </p>
        </section>
      ) : null}

      <section className="setup-block">
        <h3>Текущий пример</h3>
        <p style={{ fontSize: "2rem", fontWeight: 800, margin: "8px 0 14px" }}>
          {task.expression} = ?
        </p>

        <form
          className="inline-form"
          onSubmit={(event) => {
            event.preventDefault();
            submitAnswer();
          }}
        >
          <label htmlFor="sprint-math-answer">Введите ответ</label>
          <input
            id="sprint-math-answer"
            type="text"
            inputMode="numeric"
            value={answerInput}
            onChange={(event) => {
              const nextValue = event.target.value;
              setAnswerInput(nextValue);
              if (!setup.autoEnter || !isRunning || finished) {
                return;
              }
              const parsed = parseAnswer(nextValue);
              if (parsed == null || parsed !== task.answer) {
                return;
              }
              submitAnswer(nextValue);
            }}
            placeholder="Введите ответ"
            autoComplete="off"
            disabled={finished}
          />
          <button
            type="submit"
            className="btn-primary"
            data-testid="sprint-math-submit-btn"
            disabled={finished}
          >
            {isRunning ? "Проверить" : "Старт"}
          </button>
        </form>

        {feedback === "correct" ? <p className="status-line">Верно</p> : null}
        {feedback === "error" ? (
          <p className="error-text">Ошибка. Правильный ответ: {lastExpectedAnswer ?? "-"}</p>
        ) : null}
      </section>

      {!result ? (
        <div className="action-row">
          <button
            type="button"
            className="btn-ghost"
            onClick={finishSessionEarly}
            disabled={!isRunning || finished}
            data-testid="sprint-math-finish-btn"
          >
            Завершить досрочно
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={resetSession}
            data-testid="sprint-math-reset-btn"
          >
            Начать заново
          </button>
        </div>
      ) : null}

      {result ? (
        <SessionResultSummary
          testId="sprint-math-result"
          title="Результаты сессии"
          metrics={[
            {
              label: "Темп",
              value: `${result.throughput.toFixed(2)} задач/мин`
            },
            {
              label: "Точность",
              value: `${(result.accuracy * 100).toFixed(1)}%`
            },
            {
              label: "Среднее время решения",
              value: `${result.avgSolveMs.toFixed(0)} мс`
            },
            {
              label: "Лучшая серия",
              value: String(result.streakBest)
            },
            {
              label: "Score",
              value: result.score.toFixed(2)
            }
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
          tip={buildSprintMathTip(result, errors)}
          saveState={{
            testId: "sprint-math-save-status",
            text: saved ? "saved" : "saving"
          }}
          saveSummary={saved ? "Результаты сохранены в статистику." : "Сохраняем результаты..."}
          extraNotes={
            previousSession
              ? [
                  `Изменение темпа: ${formatSigned(result.throughput - previousSession.speed)} задач/мин, точности: ${formatSigned((result.accuracy - previousSession.accuracy) * 100, 1, "%")}.`
                ]
              : undefined
          }
          retryLabel="Начать заново"
          onRetry={resetSession}
        />
      ) : null}

      {saveError ? <p className="error-text">{saveError}</p> : null}
    </section>
  );
}
