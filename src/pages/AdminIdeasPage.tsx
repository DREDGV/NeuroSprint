import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../app/useAuth";
import { canModerateIdeas } from "../shared/lib/auth/siteAccess";
import { fetchAdminIdeas, updateIdeaModeration } from "../shared/lib/ideas/adminIdeasService";
import type {
  IdeaCategory,
  IdeaModerationStatus,
  IdeaRoadmapStatus,
  ModerationIdeaSummary
} from "../shared/lib/ideas/types";

const CATEGORY_LABELS: Record<IdeaCategory, string> = {
  training: "Тренировки",
  ux: "Интерфейс",
  progress: "Прогресс",
  social: "Социальное",
  account: "Аккаунт",
  stats: "Статистика",
  other: "Другое"
};

const MODERATION_LABELS: Record<IdeaModerationStatus, string> = {
  pending: "На проверке",
  approved: "Одобрено",
  rejected: "Отклонено"
};

const ROADMAP_LABELS: Record<IdeaRoadmapStatus, string> = {
  new: "Новая",
  planned: "Запланировано",
  in_progress: "В работе",
  done: "Готово",
  declined: "Отклонено"
};

type ModerationDraft = {
  moderation_status: IdeaModerationStatus;
  roadmap_status: IdeaRoadmapStatus;
  rejection_note: string;
};

function formatIdeaDate(value: string) {
  return new Date(value).toLocaleDateString("ru-RU");
}

export function AdminIdeasPage() {
  const auth = useAuth();
  const [ideas, setIdeas] = useState<ModerationIdeaSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<IdeaModerationStatus | "all">("pending");
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [savingIdeaId, setSavingIdeaId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, ModerationDraft>>({});

  const canModerate = auth.isAuthenticated && canModerateIdeas(auth.siteRole);

  const syncDrafts = useCallback((incomingIdeas: ModerationIdeaSummary[]) => {
    setDrafts((current) => {
      const next: Record<string, ModerationDraft> = {};
      for (const idea of incomingIdeas) {
        next[idea.id] = current[idea.id] ?? {
          moderation_status: idea.moderation_status,
          roadmap_status: idea.roadmap_status,
          rejection_note: idea.rejection_note ?? ""
        };
      }
      return next;
    });
  }, []);

  const loadIdeas = useCallback(async () => {
    if (!auth.session?.access_token || !canModerate) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetchAdminIdeas(auth.session.access_token, filter);
      setIdeas(response.ideas);
      syncDrafts(response.ideas);
      setError(null);
    } catch (loadError) {
      setIdeas([]);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Не удалось загрузить очередь модерации."
      );
    } finally {
      setLoading(false);
    }
  }, [auth.session?.access_token, canModerate, filter, syncDrafts]);

  useEffect(() => {
    void loadIdeas();
  }, [loadIdeas]);

  const stats = useMemo(
    () =>
      ideas.reduce(
        (accumulator, idea) => {
          accumulator[idea.moderation_status] += 1;
          return accumulator;
        },
        { pending: 0, approved: 0, rejected: 0 }
      ),
    [ideas]
  );

  if (!auth.isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  if (!canModerate) {
    return <Navigate to="/ideas" replace />;
  }

  async function handleSaveIdea(idea: ModerationIdeaSummary) {
    if (!auth.session?.access_token) {
      return;
    }

    const draft = drafts[idea.id];
    if (!draft) {
      return;
    }

    setSavingIdeaId(idea.id);
    setError(null);
    setStatusMessage(null);

    try {
      const updatedIdea = await updateIdeaModeration(
        idea.id,
        {
          moderation_status: draft.moderation_status,
          roadmap_status: draft.moderation_status === "rejected" ? "declined" : draft.roadmap_status,
          rejection_note:
            draft.moderation_status === "rejected" ? draft.rejection_note.trim() || null : null
        },
        auth.session.access_token
      );

      setIdeas((current) =>
        current.map((item) => (item.id === updatedIdea.id ? updatedIdea : item))
      );
      setDrafts((current) => ({
        ...current,
        [updatedIdea.id]: {
          moderation_status: updatedIdea.moderation_status,
          roadmap_status: updatedIdea.roadmap_status,
          rejection_note: updatedIdea.rejection_note ?? ""
        }
      }));
      setStatusMessage("Статус идеи обновлён.");
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Не удалось обновить статус идеи."
      );
    } finally {
      setSavingIdeaId(null);
    }
  }

  return (
    <section className="panel admin-ideas-page" data-testid="admin-ideas-page">
      <div className="admin-ideas-head">
        <div>
          <p className="stats-section-kicker">Модерация</p>
          <h2>Очередь идей</h2>
          <p>
            Здесь вы принимаете идеи в публичную доску, отклоняете дубли и двигаете
            одобренные предложения по roadmap-статусам.
          </p>
        </div>
        <div className="admin-ideas-head-actions">
          <Link className="btn-ghost" to="/ideas">
            К публичной доске
          </Link>
        </div>
      </div>

      {statusMessage ? <p className="status-line success">{statusMessage}</p> : null}
      {error ? <p className="status-line error">{error}</p> : null}

      <div className="admin-ideas-toolbar">
        <div className="admin-ideas-filters">
          {([
            ["pending", `На проверке: ${stats.pending}`],
            ["approved", `Одобрено: ${stats.approved}`],
            ["rejected", `Отклонено: ${stats.rejected}`],
            ["all", `Все: ${ideas.length}`]
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`ideas-category-chip${filter === value ? " is-selected" : ""}`}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="status-line">Загружаем очередь модерации...</p>
      ) : ideas.length === 0 ? (
        <div className="ideas-empty-state">
          <strong>Под выбранный фильтр идей пока нет</strong>
          <p>Когда пользователи отправят новые идеи, они появятся здесь.</p>
        </div>
      ) : (
        <div className="ideas-grid">
          {ideas.map((idea) => {
            const draft = drafts[idea.id] ?? {
              moderation_status: idea.moderation_status,
              roadmap_status: idea.roadmap_status,
              rejection_note: idea.rejection_note ?? ""
            };
            const isRejected = draft.moderation_status === "rejected";
            const isSaving = savingIdeaId === idea.id;

            return (
              <article key={idea.id} className="idea-card admin-idea-card">
                <div className="idea-card-head">
                  <div className="idea-card-title">
                    <h4>{idea.title}</h4>
                    <div className="admin-idea-badges">
                      <span className={`idea-status-badge is-${idea.moderation_status}`}>
                        {MODERATION_LABELS[idea.moderation_status]}
                      </span>
                      <span className="idea-status-badge">
                        {ROADMAP_LABELS[idea.roadmap_status]}
                      </span>
                    </div>
                  </div>
                  <span className="idea-category-badge">{CATEGORY_LABELS[idea.category]}</span>
                </div>

                <p className="idea-card-body">{idea.body}</p>

                <div className="idea-card-meta">
                  <span>Автор: {idea.author_name}</span>
                  <span>Поддержка: {idea.vote_count}</span>
                  <span>{formatIdeaDate(idea.created_at)}</span>
                </div>

                <div className="admin-idea-form">
                  <label className="ideas-form-field">
                    <span>Статус модерации</span>
                    <select
                      value={draft.moderation_status}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [idea.id]: {
                            ...draft,
                            moderation_status: event.target.value as IdeaModerationStatus,
                            roadmap_status:
                              event.target.value === "rejected"
                                ? "declined"
                                : draft.roadmap_status
                          }
                        }))
                      }
                    >
                      <option value="pending">На проверке</option>
                      <option value="approved">Одобрено</option>
                      <option value="rejected">Отклонено</option>
                    </select>
                  </label>

                  <label className="ideas-form-field">
                    <span>Roadmap-статус</span>
                    <select
                      value={isRejected ? "declined" : draft.roadmap_status}
                      disabled={isRejected}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [idea.id]: {
                            ...draft,
                            roadmap_status: event.target.value as IdeaRoadmapStatus
                          }
                        }))
                      }
                    >
                      <option value="new">Новая</option>
                      <option value="planned">Запланировано</option>
                      <option value="in_progress">В работе</option>
                      <option value="done">Готово</option>
                      <option value="declined">Отклонено</option>
                    </select>
                  </label>

                  {isRejected ? (
                    <label className="ideas-form-field admin-idea-note-field">
                      <span>Причина отклонения</span>
                      <textarea
                        rows={3}
                        value={draft.rejection_note}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [idea.id]: {
                              ...draft,
                              rejection_note: event.target.value
                            }
                          }))
                        }
                        placeholder="Коротко объясните, почему идея не идёт дальше."
                        maxLength={500}
                      />
                    </label>
                  ) : null}
                </div>

                <div className="admin-idea-actions">
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={isSaving}
                    onClick={() => void handleSaveIdea(idea)}
                  >
                    {isSaving ? "Сохраняем..." : "Сохранить решение"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
