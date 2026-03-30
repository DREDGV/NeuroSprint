import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useRoleAccess } from "../app/useRoleAccess";
import { LiveCompetition } from "../features/competitions/components/LiveCompetition";
import { LiveLeaderboard } from "../features/competitions/components/LiveLeaderboard";
import { useCompetitions } from "../features/competitions/hooks/useCompetitions";
import { useNotifications } from "../features/notifications/hooks/useNotifications";
import type { Competition } from "../shared/types/classes";

const COMPETITION_TYPES: Array<{ id: Competition["type"]; label: string; icon: string }> = [
  { id: "pvp", label: "PvP", icon: "⚔️" },
  { id: "team", label: "Командное", icon: "👥" },
  { id: "tournament", label: "Турнир", icon: "🏆" },
  { id: "challenge", label: "Вызов", icon: "🎯" }
];

const COMPETITION_MODES: Array<{ id: Competition["mode"]; label: string }> = [
  { id: "async", label: "Асинхронное" },
  { id: "sync", label: "Синхронное" },
  { id: "hybrid", label: "Гибридное" }
];

function getCompetitionStatusLabel(status: Competition["status"]): string {
  if (status === "completed") {
    return "Завершено";
  }
  if (status === "active") {
    return "Идёт сейчас";
  }
  if (status === "cancelled") {
    return "Отменено";
  }
  return "Ожидание";
}

function getCompetitionStatusIcon(status: Competition["status"]): string {
  if (status === "completed") {
    return "✓";
  }
  if (status === "active") {
    return "🔴";
  }
  if (status === "cancelled") {
    return "—";
  }
  return "⏳";
}

export function CompetitionsPage() {
  const access = useRoleAccess();
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [name, setName] = useState("");
  const [type, setType] = useState<Competition["type"]>("pvp");
  const [mode, setMode] = useState<Competition["mode"]>("async");
  const [durationMinutes, setDurationMinutes] = useState(5);

  const { competitions, active, upcoming, createCompetition, loading, error } =
    useCompetitions(activeUserId);
  const { createNotification } = useNotifications(activeUserId);

  useEffect(() => {
    const activeProfile = localStorage.getItem("activeProfile");
    if (!activeProfile) {
      setActiveUserId(null);
      return;
    }

    try {
      const profile = JSON.parse(activeProfile);
      setActiveUserId(profile.id || null);
    } catch {
      setActiveUserId(null);
    }
  }, []);

  const selectedCompetition = useMemo(
    () => competitions.find((competition) => competition.id === selectedCompetitionId) ?? null,
    [competitions, selectedCompetitionId]
  );

  const totalParticipants = useMemo(
    () => competitions.reduce((sum, competition) => sum + competition.participants.length, 0),
    [competitions]
  );

  async function handleCreateCompetition(event: FormEvent) {
    event.preventDefault();

    if (!activeUserId || !name.trim()) {
      return;
    }

    const now = new Date();
    const startTime = new Date(now.getTime() + 60_000);
    const endTime = new Date(startTime.getTime() + durationMinutes * 60_000);

    try {
      await createCompetition(
        name.trim(),
        type,
        mode,
        "classic_plus",
        durationMinutes,
        startTime.toISOString(),
        endTime.toISOString()
      );

      await createNotification(
        "competition_starting",
        "Соревнование создано",
        `Соревнование «${name.trim()}» стартует примерно через минуту.`
      );

      setName("");
      setType("pvp");
      setMode("async");
      setDurationMinutes(5);
      setShowCreateModal(false);
    } catch (createError) {
      console.error("Failed to create competition:", createError);
    }
  }

  if (!access.classes.manage) {
    return (
      <section className="panel" data-testid="competitions-page">
        <h2>🏆 Соревнования</h2>
        <p className="status-line">Раздел доступен только для роли «Учитель».</p>
        <div className="action-row">
          <Link className="btn-secondary" to="/settings">
            Выбрать роль
          </Link>
          <Link className="btn-ghost" to="/training">
            К тренажёрам
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="panel competitions-page" data-testid="competitions-page">
      <header className="competitions-header">
        <p className="stats-section-kicker">Alpha workspace</p>
        <h2>🏆 Соревнования</h2>
        <p className="competitions-subtitle">
          Внутренний контур для онлайн-сценариев, дуэлей и будущих групповых режимов.
        </p>
      </header>

      <section className="alpha-page-hero alpha-page-hero-competitions">
        <div className="alpha-page-hero-copy">
          <p className="alpha-page-kicker">Скрыто в production для обычных пользователей</p>
          <h3>Онлайн-соревнования ещё в alpha-стадии</h3>
          <p>
            Здесь уже можно создавать и запускать соревновательные сценарии, но раздел пока не
            включён публично. Сначала доводим путь учителя, live-экран и логику выбора соревнования
            до рабочего состояния.
          </p>
        </div>
        <div className="alpha-summary-grid" aria-hidden="true">
          <article className="alpha-summary-card">
            <span className="alpha-summary-label">Активные</span>
            <strong className="alpha-summary-value">{active.length}</strong>
            <span className="alpha-summary-hint">Сейчас идут в live-режиме</span>
          </article>
          <article className="alpha-summary-card">
            <span className="alpha-summary-label">Скоро стартуют</span>
            <strong className="alpha-summary-value">{upcoming.length}</strong>
            <span className="alpha-summary-hint">Уже созданы, но ещё не начались</span>
          </article>
          <article className="alpha-summary-card">
            <span className="alpha-summary-label">Всего сценариев</span>
            <strong className="alpha-summary-value">{competitions.length}</strong>
            <span className="alpha-summary-hint">Общий объём тестовых соревнований</span>
          </article>
          <article className="alpha-summary-card">
            <span className="alpha-summary-label">Участий</span>
            <strong className="alpha-summary-value">{totalParticipants}</strong>
            <span className="alpha-summary-hint">Суммарно по всем созданным событиям</span>
          </article>
        </div>
      </section>

      <section className="alpha-guide-grid">
        <article className="alpha-guide-card">
          <span className="alpha-guide-step">Что уже тестируется</span>
          <strong>Создание live-события и просмотр лидерборда</strong>
          <p>
            Уже можно поднять соревнование, выбрать тип и режим, а затем открыть live-блок и
            текущую таблицу участников.
          </p>
        </article>
        <article className="alpha-guide-card">
          <span className="alpha-guide-step">Что важно проверить</span>
          <strong>Понятен ли путь учителя</strong>
          <p>
            Нас интересует, легко ли создать соревнование, увидеть его статус, выбрать активное
            событие и следить за его ходом без путаницы.
          </p>
        </article>
        <article className="alpha-guide-card">
          <span className="alpha-guide-step">Почему раздел скрыт</span>
          <strong>Ещё нет готового public-опыта</strong>
          <p>
            Пока не доведены онлайн-сценарии и групповая логика, обычный пользователь не должен
            видеть этот раздел в навигации.
          </p>
        </article>
      </section>

      <section className="alpha-workflow-strip" data-testid="competitions-alpha-workflow">
        <article className="alpha-workflow-card is-primary">
          <span className="alpha-workflow-label">Перед запуском</span>
          <strong>Сначала проверьте класс и состав участников</strong>
          <p>
            Соревнование воспринимается заметно понятнее, когда у учителя уже готова группа и
            виден учебный контекст. Поэтому путь лучше читать так: классы, затем online-событие.
          </p>
          <div className="alpha-workflow-actions">
            <Link className="btn-primary" to="/classes">
              К классам
            </Link>
            <span className="alpha-workflow-hint">Подготовьте состав, затем вернитесь сюда</span>
          </div>
        </article>

        <article className="alpha-workflow-card">
          <span className="alpha-workflow-label">После создания</span>
          <strong>
            {active.length > 0
              ? "Выберите активное событие и откройте live-экран"
              : upcoming.length > 0
                ? "Проверьте ближайшие события и готовность к старту"
                : "Создайте первое тестовое соревнование"}
          </strong>
          <p>
            {active.length > 0
              ? "Ниже уже есть активные соревнования: выберите одно и сразу проверьте live-блок и лидерборд."
              : upcoming.length > 0
                ? "События уже созданы. Следующий шаг — убедиться, что статус, время старта и тип считываются без путаницы."
                : "Для первого alpha-прохода достаточно одного короткого события, чтобы оценить путь учителя от создания до live-режима."}
          </p>
        </article>
      </section>

      <section className="competitions-section">
        <div className="class-header">
          <div>
            <h3>➕ Новое соревнование</h3>
            <p className="classes-section-subtitle">
              Создаёт тестовое соревнование и ставит старт примерно через минуту. Это удобно для
              быстрых alpha-проверок без длинной настройки.
            </p>
          </div>
          <button
            type="button"
            className="btn-primary"
            onClick={() => setShowCreateModal(true)}
            disabled={!activeUserId}
          >
            Создать
          </button>
        </div>
        {error ? <p className="status-line error">{error}</p> : null}
      </section>

      {active.length === 0 && upcoming.length === 0 && competitions.length === 0 ? (
        <section className="competitions-section competitions-empty-state">
          <h3>Пока нет соревнований</h3>
          <p className="status-line">
            Это нормально для чистого alpha-контура. Создайте первое событие сверху, чтобы затем
            проверить live-экран и лидерборд.
          </p>
        </section>
      ) : null}

      {active.length > 0 ? (
        <section className="competitions-section">
          <h3>🔴 Активные соревнования ({active.length})</h3>
          <div className="competitions-grid">
            {active.map((competition) => (
              <article
                key={competition.id}
                className={`competition-card${selectedCompetitionId === competition.id ? " is-selected" : ""}`}
                onClick={() => setSelectedCompetitionId(competition.id)}
              >
                <div className="competition-card-icon">
                  {COMPETITION_TYPES.find((item) => item.id === competition.type)?.icon || "🏆"}
                </div>
                <div className="competition-card-info">
                  <h4 className="competition-card-name">{competition.name}</h4>
                  <p className="competition-card-meta">
                    {COMPETITION_MODES.find((item) => item.id === competition.mode)?.label} •{" "}
                    {competition.durationMinutes} мин
                  </p>
                  <p className="competition-card-participants">
                    👥 {competition.participants.length} участников
                  </p>
                </div>
                <div className="competition-card-status is-active">
                  <span className="status-indicator">🔴</span>
                  <span>Идёт</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {upcoming.length > 0 ? (
        <section className="competitions-section">
          <h3>🗓️ Скоро стартуют ({upcoming.length})</h3>
          <div className="competitions-grid">
            {upcoming.map((competition) => (
              <article key={competition.id} className="competition-card">
                <div className="competition-card-icon">
                  {COMPETITION_TYPES.find((item) => item.id === competition.type)?.icon || "🏆"}
                </div>
                <div className="competition-card-info">
                  <h4 className="competition-card-name">{competition.name}</h4>
                  <p className="competition-card-meta">
                    {COMPETITION_MODES.find((item) => item.id === competition.mode)?.label} • старт{" "}
                    {new Date(competition.startTime).toLocaleString("ru-RU", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </p>
                  <p className="competition-card-participants">
                    👥 {competition.participants.length} участников
                  </p>
                </div>
                <div className="competition-card-status">
                  <span>Скоро</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {selectedCompetition && activeUserId ? (
        <section className="competitions-section">
          <h3>📊 Live: {selectedCompetition.name}</h3>
          <p className="classes-section-subtitle">
            Ниже живой экран соревнования и актуальный лидерборд по выбранному событию.
          </p>
          <LiveCompetition competitionId={selectedCompetition.id} userId={activeUserId} />
          <LiveLeaderboard competitionId={selectedCompetition.id} limit={10} />
        </section>
      ) : null}

      {competitions.length > 0 ? (
        <section className="competitions-section">
          <h3>📋 Все соревнования ({competitions.length})</h3>
          <div className="competitions-list">
            {competitions.map((competition) => (
              <div key={competition.id} className="competition-list-item">
                <div className="competition-list-info">
                  <span className="competition-list-icon">
                    {COMPETITION_TYPES.find((item) => item.id === competition.type)?.icon || "🏆"}
                  </span>
                  <div>
                    <strong>{competition.name}</strong>
                    <p>
                      {getCompetitionStatusLabel(competition.status)} •{" "}
                      {new Date(competition.startTime).toLocaleString("ru-RU", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}{" "}
                      • {competition.durationMinutes} мин
                    </p>
                  </div>
                </div>
                <div className="competition-list-status">
                  <span className={`status-badge status-${competition.status}`}>
                    {getCompetitionStatusIcon(competition.status)}
                    {getCompetitionStatusLabel(competition.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {showCreateModal ? (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <h3>➕ Новое соревнование</h3>
            <form onSubmit={handleCreateCompetition}>
              <div className="form-group">
                <label htmlFor="comp-name">Название</label>
                <input
                  id="comp-name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Например, Математический бой"
                  required
                  className="classes-input"
                />
              </div>

              <div className="form-group">
                <label>Тип</label>
                <div className="mode-selector">
                  {COMPETITION_TYPES.map((competitionType) => (
                    <button
                      key={competitionType.id}
                      type="button"
                      className={`mode-option${type === competitionType.id ? " selected" : ""}`}
                      onClick={() => setType(competitionType.id)}
                    >
                      <span className="mode-icon">{competitionType.icon}</span>
                      <span className="mode-title">{competitionType.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="comp-mode">Режим</label>
                <select
                  id="comp-mode"
                  value={mode}
                  onChange={(event) => setMode(event.target.value as Competition["mode"])}
                  className="classes-select"
                >
                  {COMPETITION_MODES.map((competitionMode) => (
                    <option key={competitionMode.id} value={competitionMode.id}>
                      {competitionMode.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="comp-duration">Длительность (мин)</label>
                <input
                  id="comp-duration"
                  type="number"
                  value={durationMinutes}
                  onChange={(event) => setDurationMinutes(Number(event.target.value))}
                  min="1"
                  max="60"
                  className="classes-input"
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Отмена
                </button>
                <button type="submit" className="btn-primary" disabled={!activeUserId || !name.trim()}>
                  Создать
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="loading-overlay">
          <div className="loading-spinner" />
          <p>Загрузка соревнований...</p>
        </div>
      ) : null}
    </section>
  );
}
