import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useActiveUserDisplayName } from "../app/useActiveUserDisplayName";
import { sessionRepository } from "../entities/session/sessionRepository";
import {
  REACTION_VARIANTS,
  buildReactionChallenge,
  type ReactionChallenge,
  type ReactionVariantId
} from "../features/reaction/challenges";
import { toLocalDateKey } from "../shared/lib/date/date";
import { createId } from "../shared/lib/id";
import { InfoHint } from "../shared/ui/InfoHint";
import { StatCard } from "../shared/ui/StatCard";
import type { TrainingModeId } from "../shared/types/domain";

type ReactionPhase = "idle" | "waiting" | "ready" | "finished";

function formatMs(value: number): string {
  return `${Math.round(value)} мс`;
}

function formatClock(valueMs: number): string {
  const totalSeconds = Math.floor(valueMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatSeconds(valueMs: number): string {
  return `${(valueMs / 1000).toFixed(1)} с`;
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function randomDelayMs(): number {
  return 1200 + Math.floor(Math.random() * 2200);
}

function toReactionModeId(variantId: ReactionVariantId): TrainingModeId {
  if (variantId === "stroop_match") {
    return "reaction_stroop";
  }
  if (variantId === "pair_match") {
    return "reaction_pair";
  }
  if (variantId === "number_match") {
    return "reaction_number";
  }
  return "reaction_signal";
}

function toReactionVariantId(modeId: string | null): ReactionVariantId | null {
  if (modeId === "reaction_stroop") {
    return "stroop_match";
  }
  if (modeId === "reaction_pair") {
    return "pair_match";
  }
  if (modeId === "reaction_number") {
    return "number_match";
  }
  if (modeId === "reaction_signal") {
    return "signal";
  }
  return null;
}

interface Particle {
  id: string;
  tx: string;
  ty: string;
  color: string;
}

export function ReactionPage() {
  const [searchParams] = useSearchParams();
  const { activeUserId, activeUserName } = useActiveUserDisplayName();
  const delayTimerRef = useRef<number | null>(null);
  const clockTimerRef = useRef<number | null>(null);
  const readyAtRef = useRef<number | null>(null);
  const signalDueAtRef = useRef<number | null>(null);
  const sessionStartedAtRef = useRef<number | null>(null);
  const finalSessionDurationRef = useRef<number | null>(null);
  const savedSeriesKeyRef = useRef<string | null>(null);
  const padRef = useRef<HTMLButtonElement | null>(null);

  const [targetAttempts, setTargetAttempts] = useState<number>(5);
  const [variantId, setVariantId] = useState<ReactionVariantId>(
    () => toReactionVariantId(searchParams.get("mode")) ?? "signal"
  );
  const [challenge, setChallenge] = useState<ReactionChallenge | null>(null);
  const [attempts, setAttempts] = useState<number[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [falseStarts, setFalseStarts] = useState(0);
  const [phase, setPhase] = useState<ReactionPhase>("idle");
  const [sessionElapsedMs, setSessionElapsedMs] = useState(0);
  const [roundElapsedMs, setRoundElapsedMs] = useState(0);
  const [countdownMs, setCountdownMs] = useState(0);
  const [status, setStatus] = useState("Нажмите «Начать раунд», затем ждите сигнал.");
  const [particles, setParticles] = useState<Particle[]>([]);
  const [particlesPosition, setParticlesPosition] = useState<{ x: number; y: number } | null>(null);
  const [padPressed, setPadPressed] = useState(false);
  const [padError, setPadError] = useState(false);
  const [padSuccess, setPadSuccess] = useState(false);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const requestedVariantId = useMemo(
    () => toReactionVariantId(searchParams.get("mode")),
    [searchParams]
  );
  const activeVariantId = requestedVariantId ?? variantId;

  useEffect(() => {
    return () => {
      if (delayTimerRef.current != null) {
        window.clearTimeout(delayTimerRef.current);
      }
      if (clockTimerRef.current != null) {
        window.clearInterval(clockTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!requestedVariantId || requestedVariantId === variantId) {
      return;
    }
    setVariantId(requestedVariantId);
    resetSeries(requestedVariantId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedVariantId, variantId]);

  const selectedVariant = useMemo(
    () => REACTION_VARIANTS.find((entry) => entry.id === activeVariantId) ?? REACTION_VARIANTS[0],
    [activeVariantId]
  );
  const roundsDone = attempts.length + mistakes;
  const accuracy = targetAttempts > 0 ? Math.round((attempts.length / targetAttempts) * 100) : 0;

  const best = useMemo(
    () => (attempts.length > 0 ? Math.min(...attempts) : null),
    [attempts]
  );
  const worst = useMemo(
    () => (attempts.length > 0 ? Math.max(...attempts) : null),
    [attempts]
  );
  const avg = useMemo(() => (attempts.length > 0 ? average(attempts) : null), [attempts]);

  function createParticles(x: number, y: number, count: number = 12) {
    const colors = ["#1e7f71", "#2ba884", "#71c77d", "#f2a93b", "#4ecdc4"];
    const newParticles: Particle[] = [];

    for (let i = 0; i < count; i++) {
      const angle = (360 / count) * i + Math.random() * 30;
      const distance = 80 + Math.random() * 60;
      const radians = (angle * Math.PI) / 180;
      const tx = `${Math.cos(radians) * distance}px`;
      const ty = `${Math.sin(radians) * distance}px`;

      newParticles.push({
        id: `${Date.now()}-${i}`,
        tx,
        ty,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }

    setParticlesPosition({ x, y });
    setParticles(newParticles);
    setTimeout(() => {
      setParticles([]);
      setParticlesPosition(null);
    }, 800);
  }

  function triggerPadAnimation(type: "press" | "success" | "error") {
    if (type === "press") {
      setPadPressed(true);
      setTimeout(() => setPadPressed(false), 150);
    } else if (type === "success") {
      setPadSuccess(true);
      setTimeout(() => setPadSuccess(false), 500);
    } else if (type === "error") {
      setPadError(true);
      setTimeout(() => setPadError(false), 400);
    }
  }

  useEffect(() => {
    return () => {
      if (delayTimerRef.current != null) {
        window.clearTimeout(delayTimerRef.current);
      }
      if (clockTimerRef.current != null) {
        window.clearInterval(clockTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (phase !== "finished" || !activeUserId) {
      return;
    }

    const savedKey = [
      sessionStartedAtRef.current ?? "no-start",
      activeVariantId,
      targetAttempts,
      attempts.length,
      mistakes,
      falseStarts,
      avg ?? 0
    ].join("|");

    if (savedSeriesKeyRef.current === savedKey) {
      return;
    }
    savedSeriesKeyRef.current = savedKey;

    const finishedAt = new Date();
    const totalAttempts = Math.max(1, targetAttempts);
    const correctCount = attempts.length;
    const errors = mistakes + falseStarts;
    const accuracy = Math.max(0, Math.min(1, correctCount / totalAttempts));
    const avgReactionMs = Math.max(
      1,
      Math.round(
        avg ??
          (finalSessionDurationRef.current != null
            ? finalSessionDurationRef.current / totalAttempts
            : 1000)
      )
    );
    const speed = 60_000 / avgReactionMs;
    const score = Math.max(0, speed * (0.7 + 0.3 * accuracy) - errors * 0.25);

    void sessionRepository
      .save({
        id: createId(),
        userId: activeUserId,
        taskId: "reaction",
        mode: "reaction",
        moduleId: "reaction",
        modeId: toReactionModeId(activeVariantId),
        level: 1,
        presetId: "legacy",
        adaptiveSource: "legacy",
        timestamp: finishedAt.toISOString(),
        localDate: toLocalDateKey(finishedAt),
        durationMs: avgReactionMs,
        score,
        accuracy,
        speed,
        errors,
        correctCount,
        effectiveCorrect: correctCount - errors * 0.5,
        difficulty: {
          gridSize: 3,
          numbersCount: totalAttempts,
          mode: "reaction"
        }
      })
      .catch(() => {
        savedSeriesKeyRef.current = null;
      });
  }, [activeUserId, activeVariantId, attempts.length, avg, falseStarts, mistakes, phase, targetAttempts]);

  function stopClocks() {
    if (clockTimerRef.current != null) {
      window.clearInterval(clockTimerRef.current);
      clockTimerRef.current = null;
    }
  }

  function startClocks() {
    if (clockTimerRef.current != null) {
      return;
    }

    clockTimerRef.current = window.setInterval(() => {
      const now = Date.now();
      if (sessionStartedAtRef.current != null) {
        setSessionElapsedMs(now - sessionStartedAtRef.current);
      }
      if (phase === "waiting" && signalDueAtRef.current != null) {
        setCountdownMs(Math.max(0, signalDueAtRef.current - now));
      }
      if (phase === "ready" && readyAtRef.current != null) {
        setRoundElapsedMs(now - readyAtRef.current);
      }
    }, 80);
  }

  function resetSeries(nextVariantId?: ReactionVariantId) {
    if (delayTimerRef.current != null) {
      window.clearTimeout(delayTimerRef.current);
      delayTimerRef.current = null;
    }
    stopClocks();
    readyAtRef.current = null;
    signalDueAtRef.current = null;
    sessionStartedAtRef.current = null;
    finalSessionDurationRef.current = null;
    savedSeriesKeyRef.current = null;

    setChallenge(null);
    setAttempts([]);
    setMistakes(0);
    setFalseStarts(0);
    setPhase("idle");
    setSessionElapsedMs(0);
    setRoundElapsedMs(0);
    setCountdownMs(0);
    setStatus(
      nextVariantId
        ? "Режим обновлен. Нажмите «Начать раунд», затем ждите сигнал."
        : "Нажмите «Начать раунд», затем ждите сигнал."
    );
  }

  function scheduleReadySignal(nextVariantId: ReactionVariantId) {
    if (delayTimerRef.current != null) {
      window.clearTimeout(delayTimerRef.current);
    }

    setPhase("waiting");
    setChallenge(null);
    setRoundElapsedMs(0);
    setStatus("Ждите сигнал. Не нажимайте раньше времени.");

    const delayMs = randomDelayMs();
    signalDueAtRef.current = Date.now() + delayMs;
    setCountdownMs(delayMs);
    startClocks();

    delayTimerRef.current = window.setTimeout(() => {
      readyAtRef.current = Date.now();
      signalDueAtRef.current = null;
      setCountdownMs(0);
      setChallenge(buildReactionChallenge(nextVariantId));
      setPhase("ready");
      setStatus(
        nextVariantId === "signal"
          ? "СИГНАЛ! Нажмите как можно быстрее."
          : "СИГНАЛ! Быстро найдите и нажмите верный вариант."
      );
    }, delayMs);
  }

  function finalizeRound(isCorrect: boolean, reactionMs?: number) {
    const nextRoundsDone = roundsDone + 1;

    if (isCorrect && reactionMs != null) {
      setAttempts((current) => [...current, reactionMs]);
      triggerPadAnimation("success");
      if (padRef.current) {
        const rect = padRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        createParticles(centerX, centerY, 16);
      }
    } else {
      setMistakes((current) => current + 1);
      triggerPadAnimation("error");
    }

    readyAtRef.current = null;
    signalDueAtRef.current = null;
    setRoundElapsedMs(0);
    setChallenge(null);

    if (nextRoundsDone >= targetAttempts) {
      setPhase("finished");
      stopClocks();
      if (sessionStartedAtRef.current != null) {
        const finalMs = Math.max(1, Date.now() - sessionStartedAtRef.current);
        finalSessionDurationRef.current = finalMs;
        setSessionElapsedMs(finalMs);
      }
      setStatus("Серия завершена. Посмотрите итог и запустите новую серию.");
      return;
    }

    setPhase("idle");
    if (isCorrect && reactionMs != null) {
      setStatus(
        `Попытка ${nextRoundsDone}/${targetAttempts}: ${formatMs(
          reactionMs
        )}. Нажмите «Следующий раунд».`
      );
    } else {
      setStatus(`Попытка ${nextRoundsDone}/${targetAttempts}: ошибка. Нажмите «Следующий раунд».`);
    }
  }

  function startSeries() {
    if (phase === "waiting") {
      return;
    }

    if (phase === "finished") {
      resetSeries();
    }

    if (sessionStartedAtRef.current == null) {
      sessionStartedAtRef.current = Date.now();
      setSessionElapsedMs(0);
      startClocks();
    }

    scheduleReadySignal(activeVariantId);
  }

  function handlePadClick() {
    if (phase === "waiting") {
      setFalseStarts((current) => current + 1);
      setStatus("Слишком рано. Дождитесь сигнала.");
      return;
    }

    if (phase !== "ready" || activeVariantId !== "signal") {
      return;
    }

    const readyAt = readyAtRef.current;
    if (!readyAt) {
      return;
    }

    const reactionMs = Math.max(1, Date.now() - readyAt);
    finalizeRound(true, reactionMs);
  }

  function handleOptionClick(index: number) {
    if (phase !== "ready" || !challenge) {
      return;
    }

    const readyAt = readyAtRef.current;
    if (!readyAt) {
      return;
    }

    const selected = challenge.options[index];
    if (!selected) {
      return;
    }

    const reactionMs = Math.max(1, Date.now() - readyAt);
    
    // Создаём частицы для правильной кнопки
    if (selected.isCorrect) {
      const optionEl = optionRefs.current[index];
      if (optionEl) {
        const rect = optionEl.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        createParticles(centerX, centerY, 16);
      }
    }
    
    finalizeRound(selected.isCorrect, selected.isCorrect ? reactionMs : undefined);
  }

  const progressLabel = `${roundsDone} / ${targetAttempts}`;
  const primaryActionLabel =
    phase === "finished" ? "Новая серия" : roundsDone > 0 ? "Следующий раунд" : "Начать раунд";

  const liveTimerLabel =
    phase === "waiting"
      ? `До сигнала: ${formatSeconds(countdownMs)}`
      : phase === "ready"
        ? `Время реакции: ${formatMs(roundElapsedMs)}`
        : "Ожидание следующего раунда";

  return (
    <section className="panel" data-testid="reaction-page">
      <h2>Reaction</h2>
      <p>
        Полноценный тренажер реакции и выбора для пользователя <strong>{activeUserName}</strong>.
      </p>

      <InfoHint title="Как играть" testId="reaction-how-to">
        <p>1. Выберите вариацию тренировки.</p>
        <p>2. Нажмите «Начать раунд» и дождитесь сигнала.</p>
        <p>3. После сигнала быстро нажмите верный вариант.</p>
      </InfoHint>

      <section className="setup-block">
        <h3>Вариация и параметры</h3>
        <div className="segmented-row reaction-variant-row" data-testid="reaction-variant-selector">
          {REACTION_VARIANTS.map((variant) => (
            <button
              key={variant.id}
              type="button"
              className={variant.id === variantId ? "btn-secondary is-active" : "btn-secondary"}
              onClick={() => {
                setVariantId(variant.id);
                resetSeries(variant.id);
              }}
              disabled={phase === "waiting"}
              data-testid={`reaction-variant-${variant.id}`}
            >
              {variant.title}
            </button>
          ))}
        </div>
        <p className="status-line">{selectedVariant.description}</p>

        <div className="settings-form">
          <label htmlFor="reaction-target-attempts">Количество попыток</label>
          <select
            id="reaction-target-attempts"
            value={targetAttempts}
            onChange={(event) => setTargetAttempts(Number(event.target.value))}
            disabled={phase === "waiting"}
          >
            <option value={5}>5 попыток</option>
            <option value={8}>8 попыток</option>
            <option value={10}>10 попыток</option>
          </select>
        </div>
      </section>

      <div className="stats-grid">
        <StatCard title="Прогресс" value={progressLabel} />
        <StatCard title="Таймер серии" value={formatClock(sessionElapsedMs)} />
        <StatCard title="Точность" value={`${accuracy}%`} />
        <StatCard title="Ошибки выбора" value={String(mistakes)} />
        <StatCard title="Ранние нажатия" value={String(falseStarts)} />
        <StatCard title="Лучшее время" value={best != null ? formatMs(best) : "—"} />
      </div>

      <section className="reaction-arena" data-testid="reaction-arena">
        <h3 className="reaction-arena-title">Игровое окно</h3>
        <p className="reaction-live-timer" data-testid="reaction-live-timer">
          {liveTimerLabel}
        </p>
        <p className="status-line reaction-status" data-testid="reaction-status">
          {status}
        </p>

        {activeVariantId === "signal" || phase !== "ready" ? (
          <div className="reaction-pad-wrapper" style={{ position: "relative", display: "inline-block" }}>
            <button
              ref={padRef}
              type="button"
              className={[
                "reaction-pad",
                phase === "ready" ? "is-ready" : "",
                phase === "waiting" ? "is-waiting" : "",
                padPressed ? "pressed" : "",
                padSuccess ? "success" : "",
                padError ? "error" : ""
              ].filter(Boolean).join(" ")}
              onClick={handlePadClick}
              data-testid="reaction-pad"
            >
              {phase === "ready"
                ? "ЖМИ!"
                : phase === "waiting"
                  ? "Ждите сигнал..."
                  : phase === "finished"
                    ? "Серия завершена"
                    : "Поле готово к сигналу"}
            </button>
            {particlesPosition && particles.map((particle) => (
              <span
                key={particle.id}
                className="reaction-particle"
                style={
                  {
                    left: particlesPosition.x,
                    top: particlesPosition.y,
                    backgroundColor: particle.color,
                    "--tx": particle.tx,
                    "--ty": particle.ty
                  } as CSSProperties
                }
              />
            ))}
          </div>
        ) : (
          <section className="reaction-challenge" data-testid="reaction-challenge">
            <h4 className="reaction-challenge-title">{challenge?.prompt}</h4>
            <div className="reaction-options-grid">
              {challenge?.options.map((option, index) => (
                <button
                  key={option.id}
                  ref={(el) => { optionRefs.current[index] = el; }}
                  type="button"
                  className="reaction-option-btn"
                  onClick={() => handleOptionClick(index)}
                  style={option.textColor ? { color: option.textColor } : undefined}
                  data-testid={`reaction-option-${index}`}
                >
                  <span className="reaction-option-main">{option.label}</span>
                  {option.secondaryLabel ? (
                    <span className="reaction-option-secondary">{option.secondaryLabel}</span>
                  ) : null}
                </button>
              ))}
            </div>
          </section>
        )}
      </section>

      {phase === "finished" ? (
        <section className="result-box" data-testid="reaction-result">
          <h3>Результат серии</h3>
          <p>Точность: {accuracy}%</p>
          <p>Среднее время верных ответов: {avg != null ? formatMs(avg) : "—"}</p>
          <p>Лучшее время: {best != null ? formatMs(best) : "—"}</p>
          <p>Худшее время: {worst != null ? formatMs(worst) : "—"}</p>
          <p>Ошибки выбора: {mistakes}</p>
          <p>Ранние нажатия: {falseStarts}</p>
          <p className="status-line">
            Подсказка: сначала стабильная точность, затем ускорение.
          </p>
        </section>
      ) : null}

      <div className="action-row">
        <button
          type="button"
          className="btn-primary"
          onClick={startSeries}
          disabled={phase === "waiting"}
          data-testid="reaction-start-btn"
        >
          {primaryActionLabel}
        </button>
        <Link className="btn-ghost" to="/training">
          К модулям
        </Link>
      </div>
    </section>
  );
}
