import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { useActiveUserDisplayName } from "../app/useActiveUserDisplayName";
import {
  sessionRepository,
  type SessionSaveResult
} from "../entities/session/sessionRepository";
import { DEFAULT_AUDIO_SETTINGS } from "../shared/lib/audio/audioSettings";
import { toLocalDateKey } from "../shared/lib/date/date";
import { createId } from "../shared/lib/id";
import { buildSessionProgressNotes } from "../shared/lib/progress/sessionProgressFeedback";
import type { GridSize, Session, TrainingPresetId } from "../shared/types/domain";
import { SessionRewardQueue } from "../widgets/SessionRewardQueue";
import {
  buildSpatialMemoryProgression,
  buildSpatialPattern,
  buildSpatialResultSummary,
  buildSpatialRoundInsight,
  getSpatialLevelConfig,
  getSpatialMemorySessions,
  resolveSpatialLevelForDifficulty,
  type SpatialDifficulty,
  type SpatialPattern,
  type SpatialResultSummary
} from "../features/spatial-memory/spatialMemoryEngine";

type SpatialPhase = "setup" | "memorize" | "recall" | "result";

interface RoundReference {
  lastSession: Session | null;
  bestSession: Session | null;
}

const MODE_ID = "spatial_memory_classic";
const MODULE_ID = "spatial_memory";

function formatSeconds(value: number): string {
  return `${Math.max(0, value)} сек`;
}

function formatCompactSeconds(value: number): string {
  return `${Math.max(0, value)}с`;
}

function pickBestSession(sessions: Session[]): Session | null {
  if (sessions.length === 0) {
    return null;
  }
  return sessions.reduce((best, current) => (current.score > best.score ? current : best));
}

function presetIdByDifficulty(difficulty: SpatialDifficulty): TrainingPresetId {
  if (difficulty === "easy") {
    return "easy";
  }
  if (difficulty === "medium") {
    return "standard";
  }
  return "intense";
}

function buildSession(
  userId: string,
  difficulty: SpatialDifficulty,
  trainerLevel: number,
  gridSize: GridSize,
  result: SpatialResultSummary,
  adaptiveSource: Session["adaptiveSource"]
): Session {
  const now = new Date();

  return {
    id: createId(),
    userId,
    taskId: MODULE_ID,
    moduleId: MODULE_ID,
    modeId: MODE_ID,
    mode: "spatial_memory",
    level: trainerLevel,
    presetId: presetIdByDifficulty(difficulty),
    adaptiveSource,
    timestamp: now.toISOString(),
    localDate: toLocalDateKey(now),
    durationMs: result.durationMs,
    score: result.score,
    accuracy: result.accuracy,
    speed: result.speed,
    errors: result.errors,
    correctCount: result.hits,
    trialsTotal: result.hits + result.misses + result.falseHits,
    points: result.score,
    visualThemeId: "classic_bw",
    audioEnabledSnapshot: DEFAULT_AUDIO_SETTINGS,
    difficulty: {
      gridSize,
      numbersCount: gridSize * gridSize,
      mode: "spatial_memory"
    }
  };
}

function buildProjectedSession(
  userId: string,
  difficulty: SpatialDifficulty,
  trainerLevel: number,
  gridSize: GridSize,
  result: SpatialResultSummary,
  adaptiveSource: Session["adaptiveSource"]
): Session {
  return {
    id: "spatial-preview",
    userId,
    taskId: MODULE_ID,
    moduleId: MODULE_ID,
    modeId: MODE_ID,
    mode: "spatial_memory",
    level: trainerLevel,
    presetId: presetIdByDifficulty(difficulty),
    adaptiveSource,
    timestamp: new Date().toISOString(),
    localDate: toLocalDateKey(new Date()),
    durationMs: result.durationMs,
    score: result.score,
    accuracy: result.accuracy,
    speed: result.speed,
    errors: result.errors,
    correctCount: result.hits,
    trialsTotal: result.hits + result.misses + result.falseHits,
    points: result.score,
    difficulty: {
      gridSize,
      numbersCount: gridSize * gridSize,
      mode: "spatial_memory"
    }
  };
}

export function SpatialMemoryPage() {
  const { activeUserId, activeUserName } = useActiveUserDisplayName();
  const [difficulty, setDifficulty] = useState<SpatialDifficulty>("easy");
  const [hasManualDifficultyPick, setHasManualDifficultyPick] = useState(false);
  const [phase, setPhase] = useState<SpatialPhase>("setup");
  const [pattern, setPattern] = useState<SpatialPattern | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [countdown, setCountdown] = useState(0);
  const [recallStartedAt, setRecallStartedAt] = useState<number | null>(null);
  const [resultDurationSec, setResultDurationSec] = useState(0);
  const [allSessions, setAllSessions] = useState<Session[]>([]);
  const [sessionProgress, setSessionProgress] = useState<SessionSaveResult | null>(null);
  const [isSavingResult, setIsSavingResult] = useState(false);
  const [roundReference, setRoundReference] = useState<RoundReference>({
    lastSession: null,
    bestSession: null
  });
  const resultSavedRef = useRef(false);
  const autoFinishTimeoutRef = useRef<number | null>(null);
  const activeBoardAnchorRef = useRef<HTMLDivElement | null>(null);
  const previousBoardTopRef = useRef<number | null>(null);
  const previousPhaseRef = useRef<SpatialPhase>(phase);

  const spatialSessions = useMemo(() => getSpatialMemorySessions(allSessions), [allSessions]);
  const progression = useMemo(() => buildSpatialMemoryProgression(allSessions), [allSessions]);
  const effectiveLevel = useMemo(
    () => resolveSpatialLevelForDifficulty(difficulty, progression.recommendedLevel),
    [difficulty, progression.recommendedLevel]
  );
  const config = useMemo(() => getSpatialLevelConfig(effectiveLevel), [effectiveLevel]);
  const selectedCount = selected.size;
  const targetSet = useMemo(() => new Set(pattern?.cells ?? []), [pattern]);
  const liveHitCount = useMemo(
    () => [...selected].filter((cell) => targetSet.has(cell)).length,
    [selected, targetSet]
  );
  const liveMissCount = useMemo(
    () => [...selected].filter((cell) => !targetSet.has(cell)).length,
    [selected, targetSet]
  );
  const result = useMemo(
    () => buildSpatialResultSummary(selected, pattern?.cells ?? [], resultDurationSec),
    [pattern?.cells, resultDurationSec, selected]
  );
  const insight = useMemo(
    () =>
      pattern
        ? buildSpatialRoundInsight(result, pattern)
        : {
            title: "Соберите спокойный старт",
            summary: config.description,
            recommendation: progression.nextStep,
            diagnosticLabel: "Старт"
          },
    [config.description, pattern, progression.nextStep, result]
  );
  const previousBest = useMemo(() => pickBestSession(spatialSessions), [spatialSessions]);
  const lastSession = spatialSessions.length > 0 ? spatialSessions[spatialSessions.length - 1] : null;
  const projectedProgression = useMemo(() => {
    if (phase !== "result" || !activeUserId) {
      return progression;
    }

    return buildSpatialMemoryProgression([
      ...allSessions,
      buildProjectedSession(
        activeUserId,
        config.difficulty,
        config.level,
        config.gridSize,
        result,
        hasManualDifficultyPick ? "manual" : "auto"
      )
    ]);
  }, [
    activeUserId,
    allSessions,
    config.difficulty,
    config.level,
    hasManualDifficultyPick,
    phase,
    progression,
    result
  ]);
  const projectedLevelDelta = projectedProgression.recommendedLevel - config.level;
  const gridCellCount = config.gridSize * config.gridSize;
  const gridDescriptor = `${config.gridSize}x${config.gridSize}`;
  const targetDescriptor = `${config.targets} точек`;
  const boardScale = config.gridSize >= 6 ? "680px" : config.gridSize === 5 ? "620px" : "560px";
  const boardGridStyle = useMemo(
    () =>
      ({
        "--spatial-grid-size": String(config.gridSize),
        "--spatial-grid-max": boardScale
      }) as CSSProperties,
    [boardScale, config.gridSize]
  );
  const recallBoardState = liveMissCount > 0
    ? `${liveHitCount}/${config.targets} найдено • ошибок ${liveMissCount}`
    : `${liveHitCount}/${config.targets} найдено`;
  const recallSupportText = liveMissCount > 0
    ? `Найдено ${liveHitCount} из ${config.targets}. Ошибки: ${liveMissCount}. Неверные клетки остаются на поле до конца раунда, но прогресс считаем только по верным. Когда все цели найдены, раунд завершится сам.`
    : `Найдено ${liveHitCount} из ${config.targets}. Неверные клетки не уменьшают прогресс, пока вы продолжаете искать форму. Когда все цели найдены, раунд завершится сам.`;
  const recallStageText = liveMissCount > 0
    ? `${pattern?.recallHint ?? "Отмечайте только уверенные клетки."} Ошибки остаются на поле до конца раунда.`
    : `${pattern?.recallHint ?? "Отмечайте только уверенные клетки."} Как только вся форма найдена, раунд завершится сам.`;
  const roundProgressPct = phase === "memorize"
    ? Math.round(((config.memorizeSec - countdown) / Math.max(1, config.memorizeSec)) * 100)
    : Math.round((liveHitCount / Math.max(1, config.targets)) * 100);
  const insightTone = result.accuracy >= 0.9 && result.errors <= 1
    ? "strong"
    : result.falseHits > result.misses
      ? "warning"
      : "steady";

  useEffect(() => {
    if (!activeUserId) {
      setAllSessions([]);
      return;
    }

    let cancelled = false;
    void sessionRepository
      .listByUser(activeUserId)
      .then((sessions) => {
        if (!cancelled) {
          setAllSessions(sessions);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAllSessions([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeUserId]);

  useEffect(() => {
    if (phase !== "setup" || hasManualDifficultyPick) {
      return;
    }
    setDifficulty(progression.recommendedDifficulty);
  }, [hasManualDifficultyPick, phase, progression.recommendedDifficulty]);

  useEffect(() => {
    if (phase !== "memorize") {
      return;
    }

    setCountdown(config.memorizeSec);
    const intervalId = window.setInterval(() => {
      setCountdown((value) => {
        if (value <= 1) {
          window.clearInterval(intervalId);
          setPhase("recall");
          setRecallStartedAt(Date.now());
          return 0;
        }
        return value - 1;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [config.memorizeSec, phase]);

  useLayoutEffect(() => {
    const boardAnchor = activeBoardAnchorRef.current;
    const previousPhase = previousPhaseRef.current;
    const wasBoardPhase =
      previousPhase === "memorize" || previousPhase === "recall" || previousPhase === "result";
    const isBoardPhase = phase === "memorize" || phase === "recall" || phase === "result";

    if (!boardAnchor) {
      previousPhaseRef.current = phase;
      return;
    }

    const currentTop = boardAnchor.getBoundingClientRect().top;

    if (previousBoardTopRef.current != null && previousPhase !== phase && wasBoardPhase && isBoardPhase) {
      const delta = currentTop - previousBoardTopRef.current;
      if (Math.abs(delta) > 2) {
        window.scrollBy(0, delta);
      }
    }

    previousBoardTopRef.current = boardAnchor.getBoundingClientRect().top;
    previousPhaseRef.current = phase;
  });

  useEffect(() => {
    if (phase !== "result" || !activeUserId || resultSavedRef.current) {
      return;
    }

    resultSavedRef.current = true;
    const session = buildSession(
      activeUserId,
      config.difficulty,
      config.level,
      config.gridSize,
      result,
      hasManualDifficultyPick ? "manual" : "auto"
    );
    setIsSavingResult(true);

    void sessionRepository
      .save(session)
      .then((saveResult) => {
        setSessionProgress(saveResult);
        setAllSessions((prev) => [...prev, session]);
      })
      .catch(() => {
        setSessionProgress(null);
      })
      .finally(() => {
        setIsSavingResult(false);
      });
  }, [activeUserId, config.difficulty, config.level, hasManualDifficultyPick, phase, result]);

  function startRound(): void {
    resultSavedRef.current = false;
    setRoundReference({
      lastSession,
      bestSession: previousBest
    });
    setPattern(buildSpatialPattern(config));
    setSelected(new Set());
    setResultDurationSec(0);
    setRecallStartedAt(null);
    setSessionProgress(null);
    setPhase("memorize");
  }

  function toggleCell(index: number): void {
    if (phase !== "recall") {
      return;
    }

    setSelected((prev) => {
      if (prev.has(index)) {
        return prev;
      }
      const next = new Set(prev);
      next.add(index);
      return next;
    });
  }

  function finishRecall(): void {
    if (phase !== "recall") {
      return;
    }

    const now = Date.now();
    if (recallStartedAt != null) {
      setResultDurationSec(Math.max(1, Math.floor((now - recallStartedAt) / 1000)));
    } else {
      setResultDurationSec(1);
    }
    setPhase("result");
  }

  useEffect(() => {
    if (phase !== "recall" || liveHitCount < config.targets) {
      if (autoFinishTimeoutRef.current != null) {
        window.clearTimeout(autoFinishTimeoutRef.current);
        autoFinishTimeoutRef.current = null;
      }
      return;
    }

    autoFinishTimeoutRef.current = window.setTimeout(() => {
      autoFinishTimeoutRef.current = null;
      finishRecall();
    }, 320);

    return () => {
      if (autoFinishTimeoutRef.current != null) {
        window.clearTimeout(autoFinishTimeoutRef.current);
        autoFinishTimeoutRef.current = null;
      }
    };
  }, [config.targets, liveHitCount, phase]);

  function resetToSetup(): void {
    resultSavedRef.current = false;
    if (autoFinishTimeoutRef.current != null) {
      window.clearTimeout(autoFinishTimeoutRef.current);
      autoFinishTimeoutRef.current = null;
    }
    setPhase("setup");
    setPattern(null);
    setSelected(new Set());
    setCountdown(0);
    setRecallStartedAt(null);
    setResultDurationSec(0);
    setSessionProgress(null);
  }

  return (
    <section className="panel spatial-memory-page" data-testid="spatial-memory-page">
      <header className="spatial-memory-hero">
        <div className="spatial-memory-hero-copy">
          <p className="stats-section-kicker">Пространственная память</p>
          <h2>Spatial Memory</h2>
          <p>
            Запоминайте не порядок, а карту поля: зоны, опоры, диагонали и форму
            расположения. Тренажёр развивает удержание позиций, пространственную
            память и аккуратность ответа без лишних догадок.
          </p>
          <div className="spatial-memory-hero-meta">
            <span className="spatial-memory-chip">{config.label}</span>
            <span className="spatial-memory-chip">{targetDescriptor}</span>
            <span className="spatial-memory-chip">{gridDescriptor}</span>
            <span className="spatial-memory-chip">Уровень {config.level}/10</span>
            <span className="spatial-memory-chip">{formatSeconds(config.memorizeSec)} на обзор</span>
          </div>
        </div>

        <div className="spatial-memory-hero-status">
          <div className="spatial-memory-status-card">
            <span className="spatial-memory-status-label">Активный пользователь</span>
            <strong>{activeUserName ?? "Гость"}</strong>
          </div>
          <div className="spatial-memory-status-card spatial-memory-growth-card">
            <span className="spatial-memory-status-label">Система роста</span>
            <strong>{progression.headline}</strong>
            <p>{progression.summary}</p>
            <div className="spatial-memory-growth-pills">
              <span className="spatial-memory-chip">Память: ур. {progression.memorySkillLevel}</span>
              <span className="spatial-memory-chip">{progression.tierLabel}</span>
              <span className="spatial-memory-chip">
                {hasManualDifficultyPick ? "Выбран ручной режим" : "Авто-рекомендация активна"}
              </span>
            </div>
          </div>
        </div>
      </header>

      <section className="spatial-memory-stage" data-phase={phase}>
        <div className="spatial-memory-stage-head">
          <div className="spatial-memory-stage-copy">
            <span className="spatial-memory-stage-label">
              {phase === "setup"
                ? "Подготовка"
                : phase === "memorize"
                  ? "Запоминание"
                  : phase === "recall"
                    ? "Воспроизведение"
                    : "Итоги раунда"}
            </span>
            <h3>
              {phase === "setup"
                ? "Соберите спокойный старт"
                : phase === "memorize"
                  ? "Запомните spatial-форму"
                  : phase === "recall"
                    ? "Восстановите карту поля"
                    : insight.title}
            </h3>
            <p>
              {phase === "setup"
                ? progression.nextStep
                : phase === "memorize"
                  ? `${pattern?.coachingHint ?? "Сначала найдите 2-3 опоры."} До старта: ${formatCompactSeconds(countdown)}.`
                  : phase === "recall"
                    ? recallStageText
                    : insight.summary}
            </p>
            <div className="spatial-memory-stage-pills">
              <span className="spatial-memory-stage-pill">Уровень {config.level}/10</span>
              <span className="spatial-memory-stage-pill">{targetDescriptor}</span>
              <span className="spatial-memory-stage-pill">{gridDescriptor}</span>
              {pattern ? (
                <span className="spatial-memory-stage-pill">
                  {pattern.familyLabel} • {pattern.structureLabel}
                </span>
              ) : null}
            </div>
          </div>

          <div className="spatial-memory-stage-actions">
            {phase !== "setup" ? (
              <button type="button" className="btn-secondary" onClick={startRound}>
                Начать заново
              </button>
            ) : null}
            <button type="button" className="btn-secondary" onClick={resetToSetup}>
              Сменить уровень
            </button>
          </div>
        </div>

        <div className="spatial-memory-stage-metrics">
          <article className="spatial-memory-metric-card">
            <span className="spatial-memory-metric-label">Уровень тренажёра</span>
            <strong>{config.level}/10</strong>
            <span>{hasManualDifficultyPick ? "ручной выбор" : "авто-рекомендация"}</span>
          </article>
          <article className="spatial-memory-metric-card">
            <span className="spatial-memory-metric-label">Цель раунда</span>
            <strong>{config.targets} клетки</strong>
            <span>{gridDescriptor}</span>
          </article>
          <article className="spatial-memory-metric-card">
            <span className="spatial-memory-metric-label">Запоминание</span>
            <strong>{formatSeconds(config.memorizeSec)}</strong>
            <span>без кликов и подсказок</span>
          </article>
          <article className="spatial-memory-metric-card">
            <span className="spatial-memory-metric-label">Личный ориентир</span>
            <strong>{previousBest ? previousBest.score : "—"}</strong>
            <span>{previousBest ? "лучший score" : "пока без сохранённых попыток"}</span>
          </article>
        </div>

        {phase === "setup" ? (
          <div className="spatial-memory-setup">
            <div className="segmented-row">
              {(["easy", "medium", "hard"] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  className={difficulty === level ? "btn-secondary is-active" : "btn-secondary"}
                  onClick={() => {
                    setHasManualDifficultyPick(true);
                    setDifficulty(level);
                  }}
                >
                  {level === "easy" ? "Легко" : level === "medium" ? "Средне" : "Сложно"}
                  {!hasManualDifficultyPick && progression.recommendedDifficulty === level ? " • авто" : ""}
                </button>
              ))}
              {hasManualDifficultyPick ? (
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => {
                    setHasManualDifficultyPick(false);
                    setDifficulty(progression.recommendedDifficulty);
                  }}
                >
                  Вернуть авто-уровень
                </button>
              ) : null}
            </div>

            <div className="spatial-memory-progression-note">
              <span className="spatial-memory-info-label">Как растёт сложность</span>
              <strong>{progression.headline}</strong>
              <p>{progression.summary}</p>
              <p className="comparison-note">{progression.nextStep}</p>
            </div>

            <div className="spatial-memory-setup-grid">
              <article className="spatial-memory-info-card">
                <span className="spatial-memory-info-label">Как играть</span>
                <strong>Сначала обзор, потом восстановление формы</strong>
                <p>
                  На этапе обзора поле открыто полностью. Затем нужно собрать те же
                  клетки заново, удерживая форму и опорные зоны.
                </p>
              </article>
              <article className="spatial-memory-info-card">
                <span className="spatial-memory-info-label">Что именно растёт</span>
                <strong>Не только число клеток, но и spatial-структура</strong>
                <p>
                  Сложность повышается через диагонали, разнесённые зоны, кластеры и
                  более запутанные spatial-паттерны, а не только через объём поля.
                </p>
              </article>
              <article className="spatial-memory-info-card">
                <span className="spatial-memory-info-label">Как читать результат</span>
                <strong>Точность формы важнее догадки</strong>
                <p>
                  Лишние клики штрафуются сильнее, чем спокойный отказ от сомнительной
                  клетки. Здесь важна чистая карта поля, а не рискованный добор.
                </p>
              </article>
            </div>

            <div className="action-row">
              <button type="button" className="btn-primary" onClick={startRound}>
                Начать раунд
              </button>
              <Link className="btn-ghost" to="/training">
                К тренировкам
              </Link>
            </div>
          </div>
        ) : null}

        {phase === "memorize" ? (
          <div className="spatial-memory-board-wrap" ref={activeBoardAnchorRef}>
            <div className="spatial-memory-board-panel" data-tone="preview">
              <div className="spatial-memory-board-head">
                <div>
                  <span className="spatial-memory-info-label">Поле раунда</span>
                  <strong>Удержите форму целиком</strong>
                </div>
                <span className="spatial-memory-board-state">{formatCompactSeconds(countdown)} до старта</span>
              </div>
              <div className="spatial-grid" data-testid="spatial-grid-memorize" style={boardGridStyle}>
                {Array.from({ length: gridCellCount }, (_, index) => (
                  <div
                    key={index}
                    className={targetSet.has(index) ? "spatial-cell is-target" : "spatial-cell"}
                  >
                    {targetSet.has(index) ? <span className="spatial-cell-signal" aria-hidden="true" /> : null}
                  </div>
                ))}
              </div>
              <div className="spatial-memory-board-progress">
                <div className="spatial-memory-board-progress-copy">
                  <span>Окно обзора</span>
                  <strong>{Math.max(0, 100 - roundProgressPct)}%</strong>
                </div>
                <div className="spatial-memory-board-progress-track" aria-hidden="true">
                  <span
                    className="spatial-memory-board-progress-fill is-preview"
                    style={{ width: `${Math.max(8, 100 - roundProgressPct)}%` }}
                  />
                </div>
              </div>
            </div>

            <aside className="spatial-memory-side-note">
              <span className="spatial-memory-info-label">Форма раунда</span>
              <strong>
                {pattern?.familyLabel}: {pattern?.structureLabel}
              </strong>
              <p>{pattern?.coachingHint}</p>
            </aside>
          </div>
        ) : null}

        {phase === "recall" ? (
          <div className="spatial-memory-board-wrap" ref={activeBoardAnchorRef}>
            <div className="spatial-memory-board-panel" data-tone="recall">
              <div className="spatial-memory-board-head">
                <div>
                  <span className="spatial-memory-info-label">Поле ответа</span>
                  <strong>Соберите карту без лишних кликов</strong>
                </div>
                <span className="spatial-memory-board-state">{recallBoardState}</span>
              </div>
              <div className="spatial-grid" data-testid="spatial-grid-recall" style={boardGridStyle}>
                {Array.from({ length: gridCellCount }, (_, index) => (
                  <button
                    key={index}
                    type="button"
                    className={
                      selected.has(index)
                        ? targetSet.has(index)
                          ? "spatial-cell-button is-selected is-live-hit"
                          : "spatial-cell-button is-selected is-live-miss"
                        : "spatial-cell-button"
                    }
                    onClick={() => toggleCell(index)}
                    aria-pressed={selected.has(index)}
                  />
                ))}
              </div>
              <div className="spatial-memory-board-progress">
                <div className="spatial-memory-board-progress-copy">
                  <span>Ответ собран</span>
                  <strong>{roundProgressPct}%</strong>
                </div>
                <div className="spatial-memory-board-progress-track" aria-hidden="true">
                  <span
                    className="spatial-memory-board-progress-fill is-recall"
                    style={{ width: `${Math.max(6, roundProgressPct)}%` }}
                  />
                </div>
              </div>
            </div>

            <aside className="spatial-memory-side-note">
              <span className="spatial-memory-info-label">Подсказка</span>
              <strong>{pattern?.familyLabel}: держите форму, а не точки</strong>
              <p>{pattern?.recallHint}</p>
              <p className="comparison-note">
                Верно: {liveHitCount}. Ошибок: {liveMissCount}. Неверные клетки остаются на поле до конца
                раунда и штрафуют точность, но не забирают правильные ходы.
              </p>
            </aside>
          </div>
        ) : null}

        {phase === "recall" ? (
          <div className="action-row">
            <button type="button" className="btn-primary" onClick={finishRecall} disabled={selectedCount === 0}>
              Проверить ответ
            </button>
          </div>
        ) : null}

        {phase === "result" ? (
          <div className="spatial-memory-result-shell" data-testid="spatial-memory-result">
            <div className="spatial-memory-result-main">
              <div className="spatial-memory-result-primary" ref={activeBoardAnchorRef}>
                <div className="spatial-memory-board-panel spatial-memory-board-panel--result" data-tone="result">
                  <div className="spatial-memory-board-head">
                    <div>
                      <span className="spatial-memory-info-label">Разбор поля</span>
                      <strong>Где форма сохранилась, а где распалась</strong>
                    </div>
                    <span className="spatial-memory-board-state">{pattern?.familyLabel}</span>
                  </div>
                  <div className="spatial-memory-result-grid spatial-grid" style={boardGridStyle}>
                    {Array.from({ length: gridCellCount }, (_, index) => {
                      const isTarget = targetSet.has(index);
                      const isSelected = selected.has(index);
                      const className = isTarget && isSelected
                        ? "spatial-cell-button is-hit"
                        : isTarget
                          ? "spatial-cell-button is-missed"
                          : isSelected
                            ? "spatial-cell-button is-false-hit"
                            : "spatial-cell-button";

                      return <div key={index} className={className} />;
                    })}
                  </div>
                </div>

                <div className="action-row spatial-memory-result-actions">
                  <button type="button" className="btn-primary" onClick={startRound}>
                    Сыграть ещё
                  </button>
                  <button type="button" className="btn-secondary" onClick={resetToSetup}>
                    Сменить сложность
                  </button>
                  <Link className="btn-ghost" to="/training">
                    К тренировкам
                  </Link>
                </div>
              </div>

              <div className="spatial-memory-result-summary">
                <div className="spatial-memory-result-cards">
                  <article className="spatial-memory-result-card">
                    <span>Точность</span>
                    <strong>{Math.round(result.accuracy * 100)}%</strong>
                  </article>
                  <article className="spatial-memory-result-card">
                    <span>Ошибки</span>
                    <strong>{result.errors}</strong>
                  </article>
                  <article className="spatial-memory-result-card">
                    <span>Время</span>
                    <strong>{formatSeconds(resultDurationSec)}</strong>
                  </article>
                  <article className="spatial-memory-result-card">
                    <span>Score</span>
                    <strong>{result.score}</strong>
                  </article>
                </div>

                <div className="spatial-memory-result-feedback" data-tone={insightTone}>
                  <span className="spatial-memory-info-label">Диагноз раунда</span>
                  <strong>{insight.diagnosticLabel}</strong>
                  <p>{insight.recommendation}</p>
                  <p>
                    Паттерн: {pattern?.familyLabel} • {pattern?.structureLabel}. Верно {result.hits} из{" "}
                    {pattern?.cells.length ?? 0}, пропуски {result.misses}, лишние {result.falseHits}.
                  </p>
                  {roundReference.lastSession ? (
                    <p className="comparison-note">
                      Прошлый результат: {roundReference.lastSession.score} очков, точность{" "}
                      {Math.round(roundReference.lastSession.accuracy * 100)}%.
                    </p>
                  ) : null}
                  {roundReference.bestSession ? (
                    <p className="comparison-note">
                      Лучший ориентир до этого раунда: {roundReference.bestSession.score} очков.
                    </p>
                  ) : null}
                </div>

                <div className="spatial-memory-session-notes">
                  <p>
                    <strong>Авто-рекомендация после раунда:</strong> {projectedProgression.headline}
                  </p>
                  <p>
                    Система видит следующий уровень как {projectedProgression.recommendedLevel}/10
                    {projectedLevelDelta > 0
                      ? " и готова поднять нагрузку."
                      : projectedLevelDelta < 0
                        ? " и предлагает немного упростить поле."
                        : " и оставляет текущую нагрузку без изменений."}
                  </p>
                  <p>{projectedProgression.nextStep}</p>
                </div>

                {buildSessionProgressNotes(sessionProgress).length > 0 ? (
                  <div className="spatial-memory-session-notes">
                    {buildSessionProgressNotes(sessionProgress).map((note) => (
                      <p key={note}>{note}</p>
                    ))}
                  </div>
                ) : null}

                <div className="comparison-note">
                  {isSavingResult
                    ? "Сохраняем результат и обновляем прогресс..."
                    : "Результат раунда уже учтён в системе роста, XP и достижениях."}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <SessionRewardQueue
        levelUp={sessionProgress?.levelUp}
        nextGoalSummary={sessionProgress?.nextGoal?.primaryGoal.summary}
        achievements={sessionProgress?.unlockedAchievements}
        userId={activeUserId}
        localDate={activeUserId ? toLocalDateKey(new Date()) : undefined}
      />
    </section>
  );
}
