import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useActiveUser } from "../app/ActiveUserContext";
import { useActiveUserDisplayName } from "../app/useActiveUserDisplayName";
import { sessionRepository } from "../entities/session/sessionRepository";
import { trainingRepository } from "../entities/training/trainingRepository";
import { getSettings } from "../shared/lib/settings/settings";
import {
  buildDailyMiniGoals,
  resolveNextStreakBadge,
  resolveStreakBadge
} from "../shared/lib/motivation/motivation";
import { moduleIdByModeId } from "../shared/lib/training/modeMapping";
import { TRAINING_MODES } from "../shared/lib/training/presets";
import { InfoHint } from "../shared/ui/InfoHint";
import type {
  DailyProgressSummary,
  ModeRecommendation,
  TrainingModeId,
  TrainingModuleId
} from "../shared/types/domain";

function isTrainingModeId(value: string | null): value is TrainingModeId {
  return (
    value === "classic_plus" ||
    value === "timed_plus" ||
    value === "reverse" ||
    value === "sprint_add_sub" ||
    value === "sprint_mixed" ||
    value === "reaction_signal" ||
    value === "reaction_stroop" ||
    value === "reaction_pair"
  );
}

function isTrainingModuleId(value: string | null): value is TrainingModuleId {
  return value === "schulte" || value === "sprint_math" || value === "reaction";
}

function fallbackModeForModule(moduleId: TrainingModuleId): TrainingModeId {
  if (moduleId === "sprint_math") {
    return "sprint_add_sub";
  }
  if (moduleId === "reaction") {
    return "reaction_signal";
  }
  return "classic_plus";
}

function setupRouteByMode(modeId: TrainingModeId): string {
  const moduleId = moduleIdByModeId(modeId);
  if (moduleId === "sprint_math") {
    return `/training/sprint-math?mode=${modeId}`;
  }
  if (moduleId === "reaction") {
    return `/training/reaction?mode=${modeId}`;
  }
  return `/training/schulte?mode=${modeId}`;
}

function getReactionModeTip(modeId: TrainingModeId): string | null {
  if (modeId === "reaction_signal") {
    return "Фокус: стабильная реакция на сигнал без ранних нажатий.";
  }
  if (modeId === "reaction_stroop") {
    return "Фокус: сначала совпадение цвета и слова, затем ускорение.";
  }
  if (modeId === "reaction_pair") {
    return "Фокус: быстро находите целевую пару по подсказке в 2x2 сетке.";
  }
  return null;
}

export function PreSessionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { activeUserId } = useActiveUser();
  const { activeUserName } = useActiveUserDisplayName();
  const settings = getSettings();
  const [dailySummary, setDailySummary] = useState<DailyProgressSummary | null>(null);
  const [streakDays, setStreakDays] = useState(0);
  const [recommendation, setRecommendation] = useState<ModeRecommendation | null>(null);
  const [selectedModeId, setSelectedModeId] = useState<TrainingModeId>("classic_plus");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestedModuleId = useMemo(() => {
    const requested = searchParams.get("module");
    return isTrainingModuleId(requested) ? requested : null;
  }, [searchParams]);

  const requestedModeId = useMemo(() => {
    const requested = searchParams.get("mode");
    if (!isTrainingModeId(requested)) {
      return null;
    }
    if (requestedModuleId && moduleIdByModeId(requested) !== requestedModuleId) {
      return null;
    }
    return requested;
  }, [requestedModuleId, searchParams]);

  const visibleModes = useMemo(
    () =>
      requestedModuleId
        ? TRAINING_MODES.filter((mode) => mode.moduleId === requestedModuleId)
        : TRAINING_MODES,
    [requestedModuleId]
  );

  const selectedMode = useMemo(
    () =>
      visibleModes.find((mode) => mode.id === selectedModeId) ??
      visibleModes[0] ??
      TRAINING_MODES[0],
    [selectedModeId, visibleModes]
  );

  const recommendationTitle = useMemo(
    () =>
      TRAINING_MODES.find((entry) => entry.id === recommendation?.modeId)?.title ??
      recommendation?.modeId ??
      "—",
    [recommendation]
  );
  const selectedReactionTip = useMemo(
    () => getReactionModeTip(selectedMode.id),
    [selectedMode.id]
  );
  const recommendationReactionTip = useMemo(
    () => getReactionModeTip(recommendation?.modeId ?? "classic_plus"),
    [recommendation?.modeId]
  );

  useEffect(() => {
    if (!activeUserId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      const [summaryResult, recommendationResult, insightsResult] = await Promise.allSettled([
        sessionRepository.getDailyProgressSummary(activeUserId),
        trainingRepository.recommendModeForToday(activeUserId),
        sessionRepository.getIndividualInsights(activeUserId)
      ]);

      if (cancelled) {
        return;
      }

      if (summaryResult.status === "fulfilled") {
        setDailySummary(summaryResult.value);
      } else {
        setDailySummary(null);
      }

      if (insightsResult.status === "fulfilled") {
        setStreakDays(insightsResult.value.streakDays);
      } else {
        setStreakDays(0);
      }

      if (recommendationResult.status === "fulfilled") {
        setRecommendation(recommendationResult.value);
      } else {
        setRecommendation({
          modeId: "classic_plus",
          reason: "Начните с базового режима Classic+.",
          confidence: 0.6
        });
        setError("Часть данных не загрузилась. Доступен безопасный режим старта.");
      }

      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [activeUserId]);

  useEffect(() => {
    if (requestedModeId) {
      setSelectedModeId(requestedModeId);
      return;
    }

    if (
      recommendation &&
      (!requestedModuleId || moduleIdByModeId(recommendation.modeId) === requestedModuleId)
    ) {
      setSelectedModeId(recommendation.modeId);
      return;
    }

    if (requestedModuleId) {
      setSelectedModeId(fallbackModeForModule(requestedModuleId));
      return;
    }

    setSelectedModeId("classic_plus");
  }, [recommendation, requestedModeId, requestedModuleId]);

  const dailyGoalSessions = settings.dailyGoalSessions;
  const sessionsToday = dailySummary?.sessionsTotal ?? 0;
  const goalPercent = Math.min(100, Math.round((sessionsToday / dailyGoalSessions) * 100));
  const sessionsLeft = Math.max(0, dailyGoalSessions - sessionsToday);
  const streakBadge = resolveStreakBadge(streakDays);
  const nextBadge = resolveNextStreakBadge(streakDays);
  const miniGoals = useMemo(
    () => buildDailyMiniGoals({ streakDays, dailySummary, dailyGoalSessions }),
    [streakDays, dailySummary, dailyGoalSessions]
  );

  function handleQuickStart() {
    navigate(setupRouteByMode(selectedMode.id));
  }

  return (
    <section className="panel" data-testid="pre-session-page">
      <h2>Перед тренировкой</h2>
      <p>
        Проверьте цель дня, выберите режим и запустите тренировку для пользователя{" "}
        <strong>{activeUserName}</strong>.
      </p>
      <InfoHint title="Как проще ориентироваться" testId="pre-session-hint">
        <p>Сначала выберите рекомендованный режим, затем нажмите «К настройке тренировки».</p>
        <p>
          Если времени мало, ориентируйтесь на блок «Цель на сегодня» и выполните минимум сессий.
        </p>
      </InfoHint>

      <section className="setup-block" data-testid="pre-session-goal">
        <h3>Цель на сегодня</h3>
        <div
          className="progress-track"
          role="progressbar"
          aria-label="Прогресс цели на день"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={goalPercent}
        >
          <div className="progress-fill" style={{ width: `${goalPercent}%` }} />
        </div>
        <p className="status-line">
          Сессии: {sessionsToday} / {dailyGoalSessions}
        </p>
        <p className="status-line">
          {sessionsLeft > 0
            ? `До цели осталось ${sessionsLeft}.`
            : "Дневная цель уже выполнена. Можно закрепить результат."}
        </p>
      </section>

      <section className="setup-block" data-testid="pre-session-motivation">
        <h3>Мягкая мотивация</h3>
        <div className="streak-headline">
          <span className="streak-badge">{streakBadge.icon}</span>
          <div>
            <p className="status-line">
              Текущий бейдж: <strong>{streakBadge.title}</strong>
            </p>
            <p className="status-line">Серия дней: {streakDays}</p>
          </div>
        </div>
        {nextBadge ? (
          <p className="status-line">
            До бейджа «{nextBadge.title}» осталось {Math.max(0, nextBadge.minDays - streakDays)} дн.
          </p>
        ) : (
          <p className="status-line">Вы уже на максимальном бейдже серии.</p>
        )}
        <div className="mini-goals-list">
          {miniGoals.map((goal) => (
            <article
              key={goal.id}
              className={goal.completed ? "mini-goal-item is-complete" : "mini-goal-item"}
            >
              <h4>{goal.title}</h4>
              <p>{goal.description}</p>
              <p className="mini-goal-progress">{goal.progressLabel}</p>
            </article>
          ))}
        </div>
      </section>

      {recommendation ? (
        <section className="setup-block" data-testid="pre-session-recommendation">
          <h3>Рекомендация на сегодня</h3>
          <p>
            <strong>{recommendationTitle}</strong>
          </p>
          <p>{recommendation.reason}</p>
          {recommendationReactionTip ? (
            <p className="status-line" data-testid="pre-session-reaction-recommendation-tip">
              {recommendationReactionTip}
            </p>
          ) : null}
          <p className="status-line">
            Уверенность рекомендации: {Math.round(recommendation.confidence * 100)}%
          </p>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setSelectedModeId(recommendation.modeId)}
            data-testid="pre-session-use-recommendation-btn"
          >
            Выбрать рекомендацию
          </button>
        </section>
      ) : null}

      <section className="setup-block">
        <h3>Режим старта</h3>
        <div className="segmented-row">
          {visibleModes.map((mode) => (
            <button
              key={mode.id}
              type="button"
              className={mode.id === selectedMode.id ? "btn-secondary is-active" : "btn-secondary"}
              onClick={() => setSelectedModeId(mode.id)}
              data-testid={`pre-session-mode-${mode.id}`}
            >
              {mode.title}
            </button>
          ))}
        </div>
        <p className="status-line">{selectedMode.description}</p>
        {selectedReactionTip ? (
          <p className="status-line" data-testid="pre-session-reaction-mode-tip">
            {selectedReactionTip}
          </p>
        ) : null}
      </section>

      <section className="session-brief">
        <h3>План на 3 шага</h3>
        <p>1. Выберите режим.</p>
        <p>2. Проверьте параметры на экране настройки.</p>
        <p>3. Нажмите «Начать тренировку».</p>
      </section>

      <div className="action-row">
        <button
          type="button"
          className="btn-primary"
          onClick={handleQuickStart}
          data-testid="pre-session-start-btn"
        >
          К настройке тренировки
        </button>
        <Link className="btn-ghost" to="/training">
          Вернуться к модулям
        </Link>
      </div>

      {loading ? <p className="status-line">Готовим данные перед стартом...</p> : null}
      {error ? <p className="error-text">{error}</p> : null}
    </section>
  );
}
