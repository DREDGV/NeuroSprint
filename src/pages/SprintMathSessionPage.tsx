import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useActiveUserDisplayName } from "../app/useActiveUserDisplayName";
import { sessionRepository } from "../entities/session/sessionRepository";
import {
  buildSprintMathTask,
  calcSprintMathMetrics,
  normalizeSprintMathSetup
} from "../features/sprint-math/contract";
import { getSprintMathSetup } from "../features/sprint-math/setupStorage";
import { DEFAULT_AUDIO_SETTINGS } from "../shared/lib/audio/audioSettings";
import { toLocalDateKey } from "../shared/lib/date/date";
import { createId } from "../shared/lib/id";
import { StatCard } from "../shared/ui/StatCard";
import type { Session } from "../shared/types/domain";
import type { SprintMathMetrics, SprintMathSetup, SprintMathTask } from "../features/sprint-math/contract";

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
    const session = createSprintMathSession(
      activeUserId,
      setup,
      result,
      correctCount,
      errors
    );

    void sessionRepository
      .save(session)
      .then(() => {
        if (!cancelled) {
          setSaved(true);
          setSaveError(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSaveError("Р В Р’В Р РЋРЎС™Р В Р’В Р вЂ™Р’Вµ Р В Р Р‹Р РЋРІР‚СљР В Р’В Р СћРІР‚ВР В Р’В Р вЂ™Р’В°Р В Р’В Р вЂ™Р’В»Р В Р’В Р РЋРІР‚СћР В Р Р‹Р В РЎвЂњР В Р Р‹Р В Р вЂ° Р В Р Р‹Р В РЎвЂњР В Р’В Р РЋРІР‚СћР В Р Р‹Р Р†Р вЂљР’В¦Р В Р Р‹Р В РІР‚С™Р В Р’В Р вЂ™Р’В°Р В Р’В Р В РІР‚В¦Р В Р’В Р РЋРІР‚ВР В Р Р‹Р Р†Р вЂљРЎв„ўР В Р Р‹Р В Р вЂ° Sprint Math Р В Р Р‹Р В РЎвЂњР В Р’В Р вЂ™Р’ВµР В Р Р‹Р В РЎвЂњР В Р Р‹Р В РЎвЂњР В Р’В Р РЋРІР‚ВР В Р Р‹Р В РІР‚в„–.");
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

    const parsed = parseAnswer(answerOverride ?? answerInput);
    const isCorrect = parsed != null && parsed === task.answer;
    const currentTaskStart = taskStartedAtMs ?? now;
    const taskDuration = Math.max(1, now - currentTaskStart);

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
      <p>Р В Р ВµРЎв‚¬Р В°Р в„–РЎвЂљР Вµ Р С—РЎР‚Р С‘Р СР ВµРЎР‚РЎвЂ№ Р Р…Р В° РЎРѓР С”Р С•РЎР‚Р С•РЎРѓРЎвЂљРЎРЉ. Р СџР ВµРЎР‚Р Р†РЎвЂ№Р в„– Р С”Р В»Р С‘Р С” Р С—Р С• Р С”Р Р…Р С•Р С—Р С”Р Вµ Р В·Р В°Р С—РЎС“РЎРѓР С”Р В°Р ВµРЎвЂљ РЎРѓР ВµРЎРѓРЎРѓР С‘РЎР‹.</p>
      <p className="active-user-inline" data-testid="session-active-user">
        Р С’Р С”РЎвЂљР С‘Р Р†Р Р…РЎвЂ№Р в„– Р С—Р С•Р В»РЎРЉР В·Р С•Р Р†Р В°РЎвЂљР ВµР В»РЎРЉ: <strong>{activeUserName}</strong>
      </p>

      <div className="stats-grid">
        <StatCard title="Р В Р’В Р РЋРІР‚С”Р В Р Р‹Р В РЎвЂњР В Р Р‹Р Р†Р вЂљРЎв„ўР В Р’В Р вЂ™Р’В°Р В Р’В Р вЂ™Р’В»Р В Р’В Р РЋРІР‚СћР В Р Р‹Р В РЎвЂњР В Р Р‹Р В Р вЂ°" value={`${(remainingMs / 1000).toFixed(1)} Р В Р Р‹Р В РЎвЂњ`} />
        <StatCard title="Р В Р’В Р РЋРЎСџР В Р Р‹Р В РІР‚С™Р В Р’В Р РЋРІР‚СћР В Р Р‹Р Р†РІР‚С™Р’В¬Р В Р’В Р вЂ™Р’В»Р В Р’В Р РЋРІР‚Сћ" value={`${(elapsedMs / 1000).toFixed(1)} Р В Р Р‹Р В РЎвЂњ`} />
        <StatCard title="Р В Р’В Р Р†Р вЂљРІвЂћСћР В Р’В Р вЂ™Р’ВµР В Р Р‹Р В РІР‚С™Р В Р’В Р В РІР‚В¦Р В Р’В Р РЋРІР‚Сћ" value={String(correctCount)} />
        <StatCard title="Р В Р’В Р РЋРІР‚С”Р В Р Р‹Р Р†РІР‚С™Р’В¬Р В Р’В Р РЋРІР‚ВР В Р’В Р вЂ™Р’В±Р В Р’В Р РЋРІР‚СњР В Р’В Р РЋРІР‚В" value={String(errors)} />
        <StatCard title="Р В Р’В Р В Р вЂ№Р В Р’В Р вЂ™Р’ВµР В Р Р‹Р В РІР‚С™Р В Р’В Р РЋРІР‚ВР В Р Р‹Р В Р РЏ" value={`${currentStreak} / ${bestStreak}`} />
      </div>

      {!isRunning && !finished ? (
        <section className="session-brief">
          <h3>Р В Р’В Р РЋРЎСџР В Р’В Р вЂ™Р’ВµР В Р Р‹Р В РІР‚С™Р В Р’В Р вЂ™Р’ВµР В Р’В Р СћРІР‚В Р В Р Р‹Р В РЎвЂњР В Р Р‹Р Р†Р вЂљРЎв„ўР В Р’В Р вЂ™Р’В°Р В Р Р‹Р В РІР‚С™Р В Р Р‹Р Р†Р вЂљРЎв„ўР В Р’В Р РЋРІР‚СћР В Р’В Р РЋР’В</h3>
          <p>Р В Р’В Р вЂ™Р’В Р В Р’В Р вЂ™Р’ВµР В Р’В Р вЂ™Р’В¶Р В Р’В Р РЋРІР‚ВР В Р’В Р РЋР’В: {setup.modeId === "mixed" ? "Р В Р’В Р В Р вЂ№Р В Р’В Р РЋР’ВР В Р’В Р вЂ™Р’ВµР В Р Р‹Р Р†РІР‚С™Р’В¬Р В Р’В Р вЂ™Р’В°Р В Р’В Р В РІР‚В¦Р В Р’В Р В РІР‚В¦Р В Р Р‹Р Р†Р вЂљРІвЂћвЂ“Р В Р’В Р Р†РІР‚С›РІР‚вЂњ" : "Р В Р’В Р В Р вЂ№Р В Р’В Р вЂ™Р’В»Р В Р’В Р РЋРІР‚СћР В Р’В Р вЂ™Р’В¶Р В Р’В Р вЂ™Р’ВµР В Р’В Р В РІР‚В¦Р В Р’В Р РЋРІР‚ВР В Р’В Р вЂ™Р’Вµ/Р В Р’В Р В РІР‚В Р В Р Р‹Р Р†Р вЂљРІвЂћвЂ“Р В Р Р‹Р Р†Р вЂљР Р‹Р В Р’В Р РЋРІР‚ВР В Р Р‹Р Р†Р вЂљРЎв„ўР В Р’В Р вЂ™Р’В°Р В Р’В Р В РІР‚В¦Р В Р’В Р РЋРІР‚ВР В Р’В Р вЂ™Р’Вµ"}</p>
          <p>Р В Р’В Р В РІвЂљВ¬Р В Р Р‹Р В РІР‚С™Р В Р’В Р РЋРІР‚СћР В Р’В Р В РІР‚В Р В Р’В Р вЂ™Р’ВµР В Р’В Р В РІР‚В¦Р В Р Р‹Р В Р вЂ°: {setup.tierId}</p>
          <p>Р В Р’В Р Р†Р вЂљРЎСљР В Р’В Р вЂ™Р’В»Р В Р’В Р РЋРІР‚ВР В Р Р‹Р Р†Р вЂљРЎв„ўР В Р’В Р вЂ™Р’ВµР В Р’В Р вЂ™Р’В»Р В Р Р‹Р В Р вЂ°Р В Р’В Р В РІР‚В¦Р В Р’В Р РЋРІР‚СћР В Р Р‹Р В РЎвЂњР В Р Р‹Р Р†Р вЂљРЎв„ўР В Р Р‹Р В Р вЂ°: {setup.sessionSec} Р В Р Р‹Р В РЎвЂњР В Р’В Р вЂ™Р’ВµР В Р’В Р РЋРІР‚Сњ</p>
          <p>Р В Р’В Р В Р вЂ№Р В Р’В Р вЂ™Р’ВµР В Р Р‹Р В РЎвЂњР В Р Р‹Р В РЎвЂњР В Р’В Р РЋРІР‚ВР В Р Р‹Р В Р РЏ Р В Р Р‹Р В РЎвЂњР В Р Р‹Р Р†Р вЂљРЎв„ўР В Р’В Р вЂ™Р’В°Р В Р Р‹Р В РІР‚С™Р В Р Р‹Р Р†Р вЂљРЎв„ўР В Р Р‹Р РЋРІР‚СљР В Р’В Р вЂ™Р’ВµР В Р Р‹Р Р†Р вЂљРЎв„ў Р В Р’В Р РЋРІР‚вЂќР В Р’В Р РЋРІР‚Сћ Р В Р’В Р РЋРІР‚вЂќР В Р’В Р вЂ™Р’ВµР В Р Р‹Р В РІР‚С™Р В Р’В Р В РІР‚В Р В Р’В Р РЋРІР‚СћР В Р’В Р Р†РІР‚С›РІР‚вЂњ Р В Р’В Р РЋРІР‚СћР В Р Р‹Р Р†Р вЂљРЎв„ўР В Р’В Р РЋРІР‚вЂќР В Р Р‹Р В РІР‚С™Р В Р’В Р вЂ™Р’В°Р В Р’В Р В РІР‚В Р В Р’В Р РЋРІР‚СњР В Р’В Р вЂ™Р’Вµ Р В Р’В Р РЋРІР‚СћР В Р Р‹Р Р†Р вЂљРЎв„ўР В Р’В Р В РІР‚В Р В Р’В Р вЂ™Р’ВµР В Р Р‹Р Р†Р вЂљРЎв„ўР В Р’В Р вЂ™Р’В°.</p>
        </section>
      ) : null}

      <section className="setup-block">
        <h3>Р В Р’В Р Р†Р вЂљРІР‚СњР В Р’В Р вЂ™Р’В°Р В Р’В Р СћРІР‚ВР В Р’В Р вЂ™Р’В°Р В Р’В Р В РІР‚В¦Р В Р’В Р РЋРІР‚ВР В Р’В Р вЂ™Р’Вµ</h3>
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
          <label htmlFor="sprint-math-answer">Р В Р’В Р Р†Р вЂљРІвЂћСћР В Р’В Р вЂ™Р’В°Р В Р Р‹Р Р†РІР‚С™Р’В¬ Р В Р’В Р РЋРІР‚СћР В Р Р‹Р Р†Р вЂљРЎв„ўР В Р’В Р В РІР‚В Р В Р’В Р вЂ™Р’ВµР В Р Р‹Р Р†Р вЂљРЎв„ў</label>
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
            placeholder="Р В Р’В Р Р†Р вЂљРІвЂћСћР В Р’В Р В РІР‚В Р В Р’В Р вЂ™Р’ВµР В Р’В Р СћРІР‚ВР В Р’В Р РЋРІР‚ВР В Р Р‹Р Р†Р вЂљРЎв„ўР В Р’В Р вЂ™Р’Вµ Р В Р’В Р РЋРІР‚СћР В Р Р‹Р Р†Р вЂљРЎв„ўР В Р’В Р В РІР‚В Р В Р’В Р вЂ™Р’ВµР В Р Р‹Р Р†Р вЂљРЎв„ў"
            autoComplete="off"
            disabled={finished}
          />
          <button
            type="submit"
            className="btn-primary"
            data-testid="sprint-math-submit-btn"
            disabled={finished}
          >
            {isRunning ? "Р В Р’В Р РЋРІР‚С”Р В Р Р‹Р Р†Р вЂљРЎв„ўР В Р’В Р В РІР‚В Р В Р’В Р вЂ™Р’ВµР В Р Р‹Р Р†Р вЂљРЎв„ўР В Р’В Р РЋРІР‚ВР В Р Р‹Р Р†Р вЂљРЎв„ўР В Р Р‹Р В Р вЂ°" : "Р В Р’В Р В Р вЂ№Р В Р Р‹Р Р†Р вЂљРЎв„ўР В Р’В Р вЂ™Р’В°Р В Р Р‹Р В РІР‚С™Р В Р Р‹Р Р†Р вЂљРЎв„ў"}
          </button>
        </form>

        {feedback === "correct" ? <p className="status-line">Р В Р’В Р Р†Р вЂљРІвЂћСћР В Р’В Р вЂ™Р’ВµР В Р Р‹Р В РІР‚С™Р В Р’В Р В РІР‚В¦Р В Р’В Р РЋРІР‚Сћ</p> : null}
        {feedback === "error" ? (
          <p className="error-text">Р В Р’В Р РЋРЎС™Р В Р’В Р вЂ™Р’ВµР В Р’В Р В РІР‚В Р В Р’В Р вЂ™Р’ВµР В Р Р‹Р В РІР‚С™Р В Р’В Р В РІР‚В¦Р В Р’В Р РЋРІР‚Сћ. Р В Р’В Р РЋРЎСџР В Р Р‹Р В РІР‚С™Р В Р’В Р вЂ™Р’В°Р В Р’В Р В РІР‚В Р В Р’В Р РЋРІР‚ВР В Р’В Р вЂ™Р’В»Р В Р Р‹Р В Р вЂ°Р В Р’В Р В РІР‚В¦Р В Р Р‹Р Р†Р вЂљРІвЂћвЂ“Р В Р’В Р Р†РІР‚С›РІР‚вЂњ Р В Р’В Р РЋРІР‚СћР В Р Р‹Р Р†Р вЂљРЎв„ўР В Р’В Р В РІР‚В Р В Р’В Р вЂ™Р’ВµР В Р Р‹Р Р†Р вЂљРЎв„ў: {task.answer}</p>
        ) : null}
      </section>

      <div className="action-row">
        <button
          type="button"
          className="btn-ghost"
          onClick={finishSessionEarly}
          disabled={!isRunning || finished}
          data-testid="sprint-math-finish-btn"
        >
          Р В Р’В Р Р†Р вЂљРІР‚СњР В Р’В Р вЂ™Р’В°Р В Р’В Р В РІР‚В Р В Р’В Р вЂ™Р’ВµР В Р Р‹Р В РІР‚С™Р В Р Р‹Р Р†РІР‚С™Р’В¬Р В Р’В Р РЋРІР‚ВР В Р Р‹Р Р†Р вЂљРЎв„ўР В Р Р‹Р В Р вЂ° Р В Р Р‹Р В РЎвЂњР В Р’В Р вЂ™Р’ВµР В Р Р‹Р В РЎвЂњР В Р Р‹Р В РЎвЂњР В Р’В Р РЋРІР‚ВР В Р Р‹Р В РІР‚в„–
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={resetSession}
          data-testid="sprint-math-reset-btn"
        >
          Р В Р’В Р РЋРЎС™Р В Р’В Р РЋРІР‚СћР В Р’В Р В РІР‚В Р В Р’В Р вЂ™Р’В°Р В Р Р‹Р В Р РЏ Р В Р’В Р РЋРІР‚вЂќР В Р’В Р РЋРІР‚СћР В Р’В Р РЋРІР‚вЂќР В Р Р‹Р Р†Р вЂљРІвЂћвЂ“Р В Р Р‹Р Р†Р вЂљРЎв„ўР В Р’В Р РЋРІР‚СњР В Р’В Р вЂ™Р’В°
        </button>
      </div>

      {result ? (
        <section className="result-box" data-testid="sprint-math-result">
          <h3>Р В Р’В Р вЂ™Р’В Р В Р’В Р вЂ™Р’ВµР В Р’В Р вЂ™Р’В·Р В Р Р‹Р РЋРІР‚СљР В Р’В Р вЂ™Р’В»Р В Р Р‹Р В Р вЂ°Р В Р Р‹Р Р†Р вЂљРЎв„ўР В Р’В Р вЂ™Р’В°Р В Р Р‹Р Р†Р вЂљРЎв„ў</h3>
          <p>Throughput: {result.throughput.toFixed(2)} Р В Р’В Р вЂ™Р’В·Р В Р’В Р вЂ™Р’В°Р В Р’В Р СћРІР‚ВР В Р’В Р вЂ™Р’В°Р В Р Р‹Р Р†Р вЂљР Р‹/Р В Р’В Р РЋР’ВР В Р’В Р РЋРІР‚ВР В Р’В Р В РІР‚В¦</p>
          <p>Accuracy: {(result.accuracy * 100).toFixed(1)}%</p>
          <p>Avg solve: {result.avgSolveMs.toFixed(0)} Р В Р’В Р РЋР’ВР В Р Р‹Р В РЎвЂњ</p>
          <p>Best streak: {result.streakBest}</p>
          <p>Score: {result.score.toFixed(2)}</p>
          <p data-testid="sprint-math-save-status">{saved ? "saved" : "saving"}</p>
          <p>{saved ? "Р В Р’В Р В Р вЂ№Р В Р’В Р вЂ™Р’ВµР В Р Р‹Р В РЎвЂњР В Р Р‹Р В РЎвЂњР В Р’В Р РЋРІР‚ВР В Р Р‹Р В Р РЏ Р В Р Р‹Р В РЎвЂњР В Р’В Р РЋРІР‚СћР В Р Р‹Р Р†Р вЂљР’В¦Р В Р Р‹Р В РІР‚С™Р В Р’В Р вЂ™Р’В°Р В Р’В Р В РІР‚В¦Р В Р’В Р вЂ™Р’ВµР В Р’В Р В РІР‚В¦Р В Р’В Р вЂ™Р’В°." : "Р В Р’В Р В Р вЂ№Р В Р’В Р РЋРІР‚СћР В Р Р‹Р Р†Р вЂљР’В¦Р В Р Р‹Р В РІР‚С™Р В Р’В Р вЂ™Р’В°Р В Р’В Р В РІР‚В¦Р В Р Р‹Р В Р РЏР В Р’В Р вЂ™Р’ВµР В Р’В Р РЋР’В Р В Р Р‹Р В РЎвЂњР В Р’В Р вЂ™Р’ВµР В Р Р‹Р В РЎвЂњР В Р Р‹Р В РЎвЂњР В Р’В Р РЋРІР‚ВР В Р Р‹Р В РІР‚в„–..."}</p>
        </section>
      ) : null}

      {saveError ? <p className="error-text">{saveError}</p> : null}
    </section>
  );
}
