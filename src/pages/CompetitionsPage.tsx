import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useRoleAccess } from "../app/useRoleAccess";
import { competitionRepository } from "../entities/competition/competitionRepository";
import { useCompetitions } from "../features/competitions/hooks/useCompetitions";
import { LiveCompetition } from "../features/competitions/components/LiveCompetition";
import { LiveLeaderboard } from "../features/competitions/components/LiveLeaderboard";
import { useNotifications } from "../features/notifications/hooks/useNotifications";
import type { Competition } from "../shared/types/classes";
import type { User } from "../shared/types/domain";

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

export function CompetitionsPage() {
  const access = useRoleAccess();
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Форма создания
  const [name, setName] = useState("");
  const [type, setType] = useState<Competition["type"]>("pvp");
  const [mode, setMode] = useState<Competition["mode"]>("async");
  const [durationMinutes, setDurationMinutes] = useState(5);

  const { competitions, active, upcoming, createCompetition, loading } = useCompetitions(activeUserId);
  const { createNotification } = useNotifications(activeUserId);

  // Получаем активного пользователя
  useEffect(() => {
    const activeProfile = localStorage.getItem("activeProfile");
    if (activeProfile) {
      try {
        const profile = JSON.parse(activeProfile);
        setActiveUserId(profile.id || null);
      } catch {
        setActiveUserId(null);
      }
    }
  }, []);

  const selectedCompetition = useMemo(() => {
    return competitions.find((c) => c.id === selectedCompetitionId) || null;
  }, [competitions, selectedCompetitionId]);

  async function handleCreateCompetition(e: React.FormEvent) {
    e.preventDefault();

    if (!activeUserId || !name.trim()) {
      return;
    }

    const now = new Date();
    const startTime = new Date(now.getTime() + 60000); // Через 1 минуту
    const endTime = new Date(startTime.getTime() + durationMinutes * 60000);

    try {
      await createCompetition(
        name.trim(),
        type,
        mode,
        "classic_plus", // modeId по умолчанию
        durationMinutes,
        startTime.toISOString(),
        endTime.toISOString()
      );

      await createNotification(
        "competition_starting",
        "Соревнование создано",
        `Соревнование "${name}" начнётся через 1 минуту`
      );

      setName("");
      setShowCreateModal(false);
    } catch (err) {
      console.error("Failed to create competition:", err);
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
            К тренировкам
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="panel competitions-page" data-testid="competitions-page">
      <header className="competitions-header">
        <h2>🏆 Соревнования</h2>
        <p className="competitions-subtitle">Создавайте и участвуйте в соревнованиях</p>
      </header>

      {/* Кнопка создания */}
      <section className="competitions-section">
        <div className="class-header">
          <h3>➕ Новое соревнование</h3>
          <button
            type="button"
            className="btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            Создать
          </button>
        </div>
      </section>

      {/* Активные соревнования */}
      {active.length > 0 && (
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
                  {COMPETITION_TYPES.find((t) => t.id === competition.type)?.icon || "🏆"}
                </div>
                <div className="competition-card-info">
                  <h4 className="competition-card-name">{competition.name}</h4>
                  <p className="competition-card-meta">
                    {COMPETITION_MODES.find((m) => m.id === competition.mode)?.label} • {competition.durationMinutes} мин
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
      )}

      {/* Предстоящие соревнования */}
      {upcoming.length > 0 && (
        <section className="competitions-section">
          <h3>📅 Предстоящие соревнования ({upcoming.length})</h3>
          <div className="competitions-grid">
            {upcoming.map((competition) => (
              <article
                key={competition.id}
                className="competition-card"
              >
                <div className="competition-card-icon">
                  {COMPETITION_TYPES.find((t) => t.id === competition.type)?.icon || "🏆"}
                </div>
                <div className="competition-card-info">
                  <h4 className="competition-card-name">{competition.name}</h4>
                  <p className="competition-card-meta">
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
      )}

      {/* Выбранное соревнование */}
      {selectedCompetition && activeUserId && (
        <section className="competitions-section">
          <h3>📊 {selectedCompetition.name}</h3>
          <LiveCompetition
            competitionId={selectedCompetition.id}
            userId={activeUserId}
          />
          <LiveLeaderboard
            competitionId={selectedCompetition.id}
            limit={10}
          />
        </section>
      )}

      {/* Все соревнования */}
      {competitions.length > 0 && (
        <section className="competitions-section">
          <h3>📋 Все соревнования ({competitions.length})</h3>
          <div className="competitions-list">
            {competitions.map((competition) => (
              <div key={competition.id} className="competition-list-item">
                <div className="competition-list-info">
                  <span className="competition-list-icon">
                    {COMPETITION_TYPES.find((t) => t.id === competition.type)?.icon || "🏆"}
                  </span>
                  <div>
                    <strong>{competition.name}</strong>
                    <p className="competition-list-meta">
                      {new Date(competition.startTime).toLocaleString("ru-RU", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit"
                      })} • {competition.durationMinutes} мин
                    </p>
                  </div>
                </div>
                <div className="competition-list-status">
                  <span className={`status-badge status-${competition.status}`}>
                    {competition.status === "completed" ? "✓" : competition.status === "active" ? "🔴" : "⏳"}
                    {competition.status === "completed" ? "Завершено" : competition.status === "active" ? "Идёт" : "Ожидание"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Модальное окно создания */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>➕ Новое соревнование</h3>
            <form onSubmit={handleCreateCompetition}>
              <div className="form-group">
                <label htmlFor="comp-name">Название</label>
                <input
                  id="comp-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Например, Математический бой"
                  required
                  className="classes-input"
                />
              </div>

              <div className="form-group">
                <label>Тип</label>
                <div className="mode-selector">
                  {COMPETITION_TYPES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={`mode-option${type === t.id ? " selected" : ""}`}
                      onClick={() => setType(t.id)}
                    >
                      <span className="mode-icon">{t.icon}</span>
                      <span className="mode-title">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="comp-mode">Режим</label>
                <select
                  id="comp-mode"
                  value={mode}
                  onChange={(e) => setMode(e.target.value as Competition["mode"])}
                  className="classes-select"
                >
                  {COMPETITION_MODES.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
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
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  min="1"
                  max="60"
                  className="classes-input"
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-ghost" onClick={() => setShowCreateModal(false)}>
                  Отмена
                </button>
                <button type="submit" className="btn-primary">
                  Создать
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner" />
          <p>Загрузка соревнований...</p>
        </div>
      )}
    </section>
  );
}
