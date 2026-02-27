import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useLocation, useParams } from "react-router-dom";
import { useActiveUserDisplayName } from "../app/useActiveUserDisplayName";
import { preferenceRepository } from "../entities/preferences/preferenceRepository";
import { sessionRepository } from "../entities/session/sessionRepository";
import { trainingRepository } from "../entities/training/trainingRepository";
import { playAudioCue } from "../shared/lib/audio/audioCues";
import {
  DEFAULT_AUDIO_SETTINGS,
  getAudioSettings,
  mergeAudioSettings
} from "../shared/lib/audio/audioSettings";
import { toLocalDateKey } from "../shared/lib/date/date";
import { createId } from "../shared/lib/id";
import { generateSchulteGrid } from "../shared/lib/random/grid";
import {
  calcClassicMetrics,
  calcTimedMetrics
} from "../shared/lib/scoring/scoring";
import {
  SCHULTE_MODES,
  getPresetSetup,
  gridSizeToNumbersCount,
  withLevelDefaults
} from "../shared/lib/training/presets";
import { getTrainingSetup } from "../shared/lib/training/setupStorage";
import { resolveSchulteTheme } from "../shared/lib/training/themes";
import { SchulteGrid } from "../shared/ui/SchulteGrid";
import { SessionResultSummary } from "../shared/ui/SessionResultSummary";
import { StatCard } from "../shared/ui/StatCard";
import type {
  AdaptiveDecision,
  AdaptiveSource,
  AudioSettings,
  Session,
  TrainingModeId,
  TrainingSetup
} from "../shared/types/domain";

interface SessionResult {
  durationMs: number;
  score: number;
  accuracy: number;
  speed: number;
  effectiveCorrect?: number;
}

interface SessionNavState {
  setup?: TrainingSetup;
  level?: number;
  adaptiveSource?: AdaptiveSource;
}

function isTrainingModeId(value: string | undefined): value is TrainingModeId {
  return value === "classic_plus" || value === "timed_plus" || value === "reverse";
}

function modeToLegacy(modeId: TrainingModeId): Session["difficulty"]["mode"] {
  if (modeId === "timed_plus") {
    return "timed";
  }
  if (modeId === "reverse") {
    return "reverse";
  }
  return "classic";
}

function initialExpected(modeId: TrainingModeId, numbersCount: number): number {
  return modeId === "reverse" ? numbersCount : 1;
}

function formatDurationMs(durationMs: number): string {
  return `${(durationMs / 1000).toFixed(1)} с`;
}

function formatSigned(value: number): string {
  return value >= 0 ? `+${value.toFixed(2)}` : value.toFixed(2);
}

function pickBestHistoricalSession(
  modeId: TrainingModeId,
  sessions: Session[]
): Session | null {
  if (sessions.length === 0) {
    return null;
  }
  if (modeId === "timed_plus") {
    return sessions.reduce((best, current) =>
      current.score > best.score ? current : best
    );
  }
  return sessions.reduce((best, current) =>
    current.durationMs < best.durationMs ? current : best
  );
}

function buildSchulteTip(
  modeId: TrainingModeId,
  accuracy: number,
  errors: number
): string {
  if (accuracy < 0.85) {
    return "Старайтесь держать точность выше 85%: сначала аккуратность, потом темп.";
  }
  if (errors > 0) {
    return "Ошибки снижают итог. Попробуйте снизить количество промахов в следующей попытке.";
  }
  if (modeId === "timed_plus") {
    return "Отлично! Попробуйте удержать точность и увеличить темп.";
  }
  return "Отличный результат. Попробуйте пройти сетку быстрее без потери точности.";
}

export function SchulteSessionPage() {
  const { activeUserId, activeUserName } = useActiveUserDisplayName();
  const { mode } = useParams<{ mode: string }>();
  const location = useLocation();
  const state = (location.state as SessionNavState | null) ?? null;

  if (!isTrainingModeId(mode)) {
    return <Navigate to="/training/schulte" replace />;
  }

  const modeId = mode;
  const selectedMode = SCHULTE_MODES.find((entry) => entry.id === modeId) ?? SCHULTE_MODES[0];

  const [setup, setSetup] = useState<TrainingSetup>(() => state?.setup ?? getTrainingSetup(modeId));
  const [level, setLevel] = useState<number>(() => state?.level ?? 1);
  const [adaptiveSource, setAdaptiveSource] = useState<AdaptiveSource>(
    () => state?.adaptiveSource ?? "auto"
  );
  const [audioSettings, setAudioSettings] = useState<AudioSettings>(() =>
    getAudioSettings()
  );
  const [loading, setLoading] = useState<boolean>(!state);

  const numbersCount = useMemo(
    () => gridSizeToNumbersCount(setup.gridSize),
    [setup.gridSize]
  );

  const [grid, setGrid] = useState<number[]>(() => generateSchulteGrid(setup.gridSize));
  const [expected, setExpected] = useState<number>(() =>
    initialExpected(modeId, numbersCount)
  );
  const [nextSpawn, setNextSpawn] = useState<number>(() => numbersCount + 1);
  const [errors, setErrors] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [startedAtMs, setStartedAtMs] = useState<number | null>(null);
  const [remainingMs, setRemainingMs] = useState(setup.timeLimitSec * 1000);
  const [tick, setTick] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [result, setResult] = useState<SessionResult | null>(null);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [adaptiveDecision, setAdaptiveDecision] = useState<AdaptiveDecision | null>(null);
  const [previousSession, setPreviousSession] = useState<Session | null>(null);
  const [bestSession, setBestSession] = useState<Session | null>(null);
  const [flash, setFlash] = useState<{ index: number; type: "correct" | "error" } | null>(null);

  const flashTimerRef = useRef<number | null>(null);
  const finishSoundPlayedRef = useRef(false);

  useEffect(() => {
    return () => {
      if (flashTimerRef.current != null) {
        window.clearTimeout(flashTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (finished && !finishSoundPlayedRef.current) {
      playAudioCue("finish", audioSettings);
      finishSoundPlayedRef.current = true;
    }
    if (!finished) {
      finishSoundPlayedRef.current = false;
    }
  }, [audioSettings, finished]);

  useEffect(() => {
    if (isRunning || finished) {
      return;
    }
    setGrid(generateSchulteGrid(setup.gridSize));
    setExpected(initialExpected(modeId, numbersCount));
    setNextSpawn(numbersCount + 1);
    setRemainingMs(setup.timeLimitSec * 1000);
  }, [finished, isRunning, modeId, numbersCount, setup.gridSize, setup.timeLimitSec]);

  useEffect(() => {
    if (!activeUserId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      const [profile, preference] = await Promise.all([
        trainingRepository.getUserModeProfile(activeUserId, "schulte", modeId),
        preferenceRepository.getOrCreate(activeUserId)
      ]);

      if (cancelled) {
        return;
      }

      if (!state) {
        const storedSetup = getTrainingSetup(modeId) ?? getPresetSetup("standard");
        const effectiveLevel = profile.autoAdjust
          ? profile.level
          : profile.manualLevel ?? profile.level;
        const hydratedSetup = profile.autoAdjust
          ? withLevelDefaults(storedSetup, effectiveLevel, modeId)
          : storedSetup;
        setSetup(hydratedSetup);
        setLevel(effectiveLevel);
        setAdaptiveSource(profile.autoAdjust ? "auto" : "manual");
      }

      setAudioSettings(mergeAudioSettings(getAudioSettings(), preference.audioSettings));
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [activeUserId, modeId, state]);

  useEffect(() => {
    if (modeId !== "timed_plus" || !isRunning || startedAtMs == null || finished) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      const elapsed = Date.now() - startedAtMs;
      const left = setup.timeLimitSec * 1000 - elapsed;
      if (left <= 0) {
        setRemainingMs(0);
        setIsRunning(false);
        setFinished(true);
        const metrics = calcTimedMetrics({
          correctCount,
          errors,
          timeLimitSec: setup.timeLimitSec,
          errorPenalty: setup.errorPenalty
        });
        setResult({
          durationMs: setup.timeLimitSec * 1000,
          score: metrics.score,
          accuracy: metrics.accuracy,
          speed: metrics.speed,
          effectiveCorrect: metrics.effectiveCorrect
        });
      } else {
        setRemainingMs(left);
      }
    }, 100);

    return () => window.clearInterval(timer);
  }, [
    correctCount,
    errors,
    finished,
    isRunning,
    modeId,
    setup.errorPenalty,
    setup.timeLimitSec,
    startedAtMs
  ]);

  useEffect(() => {
    if (!isRunning || finished || modeId === "timed_plus") {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setTick((current) => current + 1);
    }, 100);
    return () => window.clearInterval(timer);
  }, [finished, isRunning, modeId]);

  useEffect(() => {
    if (!activeUserId || !finished || !result || saved) {
      return;
    }

    const timestamp = new Date();
    const snapshotAudio = mergeAudioSettings(DEFAULT_AUDIO_SETTINGS, audioSettings);

    const session: Session = {
      id: createId(),
      userId: activeUserId,
      taskId: "schulte",
      mode: modeToLegacy(modeId),
      moduleId: "schulte",
      modeId,
      level,
      presetId: setup.presetId,
      adaptiveSource,
      timestamp: timestamp.toISOString(),
      localDate: toLocalDateKey(timestamp),
      durationMs: result.durationMs,
      score: result.score,
      accuracy: result.accuracy,
      speed: result.speed,
      errors,
      correctCount: modeId === "timed_plus" ? correctCount : undefined,
      effectiveCorrect: modeId === "timed_plus" ? result.effectiveCorrect : undefined,
      visualThemeId: setup.visualThemeId,
      audioEnabledSnapshot: snapshotAudio,
      difficulty: {
        gridSize: setup.gridSize,
        numbersCount,
        mode: modeToLegacy(modeId),
        timeLimitSec: modeId === "timed_plus" ? setup.timeLimitSec : undefined,
        errorPenalty: setup.errorPenalty,
        hintsEnabled: setup.hintsEnabled,
        spawnStrategy: setup.spawnStrategy
      }
    };

    let cancelled = false;
    void sessionRepository
      .save(session)
      .then(async () => {
        if (cancelled) {
          return;
        }
        setSaved(true);
        setSaveError(null);

        const [decision, history] = await Promise.all([
          trainingRepository.evaluateAdaptiveLevel(activeUserId, "schulte", modeId),
          trainingRepository.listRecentSessionsByMode(activeUserId, "schulte", modeId, 50)
        ]);
        if (!cancelled) {
          const historicalSessions = history.filter((entry) => entry.id !== session.id);
          setPreviousSession(historicalSessions[0] ?? null);
          setBestSession(pickBestHistoricalSession(modeId, historicalSessions));
          setAdaptiveDecision(decision);
          setLevel(decision.nextLevel);
          if (decision.source === "auto") {
            setSetup((current) => withLevelDefaults(current, decision.nextLevel, modeId));
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSaveError("Не удалось сохранить результат.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    activeUserId,
    adaptiveSource,
    audioSettings,
    correctCount,
    errors,
    finished,
    level,
    modeId,
    numbersCount,
    result,
    saved,
    setup.errorPenalty,
    setup.gridSize,
    setup.hintsEnabled,
    setup.presetId,
    setup.spawnStrategy,
    setup.timeLimitSec,
    setup.visualThemeId
  ]);

  const elapsedMs = useMemo(() => {
    if (!startedAtMs) {
      return 0;
    }
    if (finished && result) {
      return result.durationMs;
    }
    return Math.max(0, Date.now() - startedAtMs);
  }, [finished, result, startedAtMs, tick]);

  const theme = useMemo(
    () => resolveSchulteTheme(setup.visualThemeId, setup.customTheme),
    [setup.customTheme, setup.visualThemeId]
  );

  function setFlashState(index: number, type: "correct" | "error") {
    setFlash({ index, type });
    if (flashTimerRef.current != null) {
      window.clearTimeout(flashTimerRef.current);
    }
    flashTimerRef.current = window.setTimeout(() => setFlash(null), 130);
  }

  function resetGame() {
    const freshGrid = generateSchulteGrid(setup.gridSize);
    setGrid(freshGrid);
    setExpected(initialExpected(modeId, numbersCount));
    setNextSpawn(numbersCount + 1);
    setErrors(0);
    setCorrectCount(0);
    setStartedAtMs(null);
    setRemainingMs(setup.timeLimitSec * 1000);
    setTick(0);
    setIsRunning(false);
    setFinished(false);
    setResult(null);
    setSaved(false);
    setSaveError(null);
    setAdaptiveDecision(null);
    setPreviousSession(null);
    setBestSession(null);
    setFlash(null);
  }

  function finishClassic(now: number, startedAtValue: number | null = startedAtMs) {
    if (!startedAtValue) {
      return;
    }
    const durationMs = Math.max(0, now - startedAtValue);
    const metrics = calcClassicMetrics({
      durationMs,
      errors,
      numbersCount
    });

    setResult({
      durationMs,
      score: metrics.score,
      accuracy: metrics.accuracy,
      speed: metrics.speed
    });
    setIsRunning(false);
    setFinished(true);
  }

  function onCellClick(value: number, index: number) {
    if (finished) {
      return;
    }

    let effectiveStartedAt = startedAtMs;
    if (!isRunning) {
      const startTimestamp = Date.now();
      effectiveStartedAt = startTimestamp;
      setStartedAtMs(startTimestamp);
      setIsRunning(true);
      playAudioCue("start", audioSettings);
    }

    playAudioCue("click", audioSettings);

    if (value !== expected) {
      setErrors((current) => current + 1);
      setFlashState(index, "error");
      playAudioCue("error", audioSettings);
      return;
    }

    setFlashState(index, "correct");
    playAudioCue("correct", audioSettings);

    if (modeId === "timed_plus") {
      setCorrectCount((current) => current + 1);
      setGrid((current) => {
        const next = [...current];
        next[index] = nextSpawn;

        if (setup.spawnStrategy === "random_cell" && next.length > 1) {
          let swapIndex = index;
          while (swapIndex === index) {
            swapIndex = Math.floor(Math.random() * next.length);
          }
          [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
        }

        return next;
      });
      setExpected((current) => current + 1);
      setNextSpawn((current) => current + 1);
      return;
    }

    const now = Date.now();
    if (modeId === "reverse") {
      if (expected === 1) {
        finishClassic(now, effectiveStartedAt);
      } else {
        setExpected((current) => current - 1);
      }
      return;
    }

    if (expected === numbersCount) {
      finishClassic(now, effectiveStartedAt);
    } else {
      setExpected((current) => current + 1);
    }
  }

  if (loading) {
    return (
      <section className="panel">
        <p>Загрузка режима...</p>
      </section>
    );
  }

  return (
    <section className="panel" data-testid="schulte-session-page">
      <h2>Шульте: {selectedMode.title}</h2>
      <p>{selectedMode.description}</p>
      <p className="active-user-inline" data-testid="session-active-user">
        Активный пользователь: <strong>{activeUserName}</strong>
      </p>

      <div className="stats-grid">
        {modeId === "timed_plus" ? (
          <StatCard title="Осталось" value={`${(remainingMs / 1000).toFixed(1)} с`} />
        ) : (
          <StatCard title="Время" value={`${(elapsedMs / 1000).toFixed(1)} с`} />
        )}
        <StatCard
          title="Следующее число"
          value={finished ? "Готово" : String(expected)}
        />
        <StatCard title="Ошибки" value={String(errors)} />
        <StatCard title="Уровень" value={String(level)} />
      </div>

      {setup.hintsEnabled && !finished ? (
        <p className="status-line">Подсказка: найдите число {expected}</p>
      ) : null}

      {!isRunning && !finished ? (
        <section className="session-brief">
          <h3>Перед стартом</h3>
          <p>Сетка: {setup.gridSize}x{setup.gridSize}</p>
          <p>Штраф: {setup.errorPenalty}</p>
          {modeId === "timed_plus" ? <p>Время: {setup.timeLimitSec} сек</p> : null}
          <p>Старт автоматически при первом клике по клетке.</p>
        </section>
      ) : null}

      <SchulteGrid
        values={grid}
        gridSize={setup.gridSize}
        theme={theme}
        themeId={setup.visualThemeId}
        flash={flash}
        onCellClick={onCellClick}
        disabled={finished}
        highlightValue={setup.hintsEnabled ? expected : null}
      />

      {!result ? (
        <div className="action-row">
          <button type="button" className="btn-secondary" onClick={resetGame}>
            Новая попытка
          </button>
        </div>
      ) : null}

      {result ? (
        <SessionResultSummary
          testId="schulte-result"
          title="Результат"
          metrics={[
            {
              label: "Точность",
              value: `${(result.accuracy * 100).toFixed(1)}%`
            },
            {
              label: "Скорость",
              value: result.speed.toFixed(2)
            },
            {
              label: "Score",
              value: result.score.toFixed(2)
            },
            ...(modeId === "timed_plus"
              ? [
                  {
                    label: "effectiveCorrect",
                    value: (result.effectiveCorrect ?? 0).toFixed(2)
                  }
                ]
              : [])
          ]}
          previousSummary={
            previousSession
              ? modeId === "timed_plus"
                ? `С прошлой попыткой: ${formatSigned(result.score - previousSession.score)} по score (было ${previousSession.score.toFixed(2)}).`
                : `С прошлой попыткой: ${result.durationMs <= previousSession.durationMs ? `быстрее на ${((previousSession.durationMs - result.durationMs) / 1000).toFixed(1)} с` : `медленнее на ${((result.durationMs - previousSession.durationMs) / 1000).toFixed(1)} с`} (было ${formatDurationMs(previousSession.durationMs)}).`
              : "Это первая сохраненная попытка в этом режиме."
          }
          bestSummary={
            bestSession
              ? modeId === "timed_plus"
                ? `Лучший результат в режиме: score ${bestSession.score.toFixed(2)}.`
                : `Лучший результат в режиме: ${formatDurationMs(bestSession.durationMs)}.`
              : null
          }
          tip={buildSchulteTip(modeId, result.accuracy, errors)}
          saveSummary={saved ? "Сессия сохранена." : "Сохраняем сессию..."}
          extraNotes={
            adaptiveDecision
              ? [
                  `Адаптация: ${adaptiveDecision.reason} (уровень ${adaptiveDecision.previousLevel} → ${adaptiveDecision.nextLevel})`
                ]
              : undefined
          }
          retryLabel="Новая попытка"
          onRetry={resetGame}
        />
      ) : null}

      {saveError ? <p className="error-text">{saveError}</p> : null}
    </section>
  );
}
