import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../app/useAuth";
import { setAuthReturnPath } from "../shared/lib/auth/authReturnPath";
import { canModerateIdeas } from "../shared/lib/auth/siteAccess";
import {
  createIdea,
  fetchIdeas,
  unvoteIdea,
  voteForIdea
} from "../shared/lib/ideas/ideasService";
import type {
  IdeaCategory,
  IdeaModerationStatus,
  IdeaRoadmapStatus,
  IdeaSummary
} from "../shared/lib/ideas/types";
import {
  trackIdeasViewed,
  trackIdeaSubmitted,
  trackIdeaVoteAdded,
  trackIdeaVoteRemoved
} from "../shared/lib/analytics/siteAnalytics";

const CATEGORY_LABELS: Record<IdeaCategory, string> = {
  training: "Тренировки",
  ux: "Интерфейс",
  progress: "Прогресс",
  social: "Социальное",
  account: "Аккаунт",
  stats: "Статистика",
  other: "Другое"
};

const STATUS_LABELS: Record<IdeaModerationStatus, string> = {
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

const LOCALHOST_NAMES = new Set(["localhost", "127.0.0.1"]);
const MIN_TITLE_LENGTH = 4;
const MIN_BODY_LENGTH = 10;

function formatIdeaDate(value: string) {
  return new Date(value).toLocaleDateString("ru-RU");
}

function getRoadmapBadgeClass(status: IdeaRoadmapStatus) {
  switch (status) {
    case "planned":
      return "is-planned";
    case "in_progress":
      return "is-in-progress";
    case "done":
      return "is-done";
    case "declined":
      return "is-declined";
    default:
      return "is-new";
  }
}

export function IdeasPage() {
  const auth = useAuth();
  const [ideas, setIdeas] = useState<IdeaSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitStatus, setSubmitStatus] = useState<string | null>(null);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showMyIdeas, setShowMyIdeas] = useState(false);
  const [creating, setCreating] = useState(false);
  const [votePendingId, setVotePendingId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newCategory, setNewCategory] = useState<IdeaCategory>("other");

  const isLocalWriteUnavailable =
    typeof window !== "undefined" && LOCALHOST_NAMES.has(window.location.hostname);
  const titleLength = newTitle.trim().length;
  const bodyLength = newBody.trim().length;
  const isCreateInvalid = titleLength < MIN_TITLE_LENGTH || bodyLength < MIN_BODY_LENGTH;

  const myIdeas = useMemo(
    () => (auth.isAuthenticated ? ideas.filter((idea) => idea.is_author) : []),
    [auth.isAuthenticated, ideas]
  );
  const publicIdeas = useMemo(
    () => ideas.filter((idea) => idea.moderation_status === "approved"),
    [ideas]
  );

  useEffect(() => {
    trackIdeasViewed();
  }, []);

  const loadIdeas = useCallback(async () => {
    setLoading(true);
    try {
      const token = auth.isAuthenticated ? auth.session?.access_token : undefined;
      const response = await fetchIdeas(token, 1, 50);
      setIdeas(response.ideas);
      setListError(null);
    } catch (error) {
      console.warn("Ideas loading failed", error);
      setIdeas([]);
      setListError(
        isLocalWriteUnavailable
          ? "На localhost доска идей работает как интерфейсный preview. Создание идей, модерацию и голосование проверяйте на сайте или в Vercel Preview."
          : error instanceof Error
            ? error.message
            : "Не удалось загрузить идеи."
      );
    } finally {
      setLoading(false);
    }
  }, [auth.isAuthenticated, auth.session?.access_token, isLocalWriteUnavailable]);

  useEffect(() => {
    void loadIdeas();
  }, [loadIdeas]);

  async function handleCreateIdea(event: FormEvent) {
    event.preventDefault();
    if (!auth.isAuthenticated || !auth.session?.access_token || isCreateInvalid) {
      return;
    }

    setCreating(true);
    setSubmitError(null);
    setSubmitStatus(null);

    try {
      await createIdea(
        {
          title: newTitle.trim(),
          body: newBody.trim(),
          category: newCategory
        },
        auth.session.access_token
      );

      trackIdeaSubmitted(newCategory);
      setNewTitle("");
      setNewBody("");
      setNewCategory("other");
      setShowCreateForm(false);
      setShowMyIdeas(true);
      setSubmitStatus(
        "Идея отправлена. Сейчас она видна в разделе «Мои идеи» со статусом «На проверке»."
      );
      await loadIdeas();
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Не удалось отправить идею. Попробуйте ещё раз."
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleVote(target: IdeaSummary) {
    if (!auth.isAuthenticated || !auth.session?.access_token) {
      return;
    }
    if (target.is_author || target.moderation_status !== "approved") {
      return;
    }

    setVotePendingId(target.id);
    setVoteError(null);

    const wasVoted = target.has_voted;
    setIdeas((current) =>
      current.map((idea) =>
        idea.id === target.id
          ? {
              ...idea,
              has_voted: !wasVoted,
              vote_count: Math.max(0, idea.vote_count + (wasVoted ? -1 : 1))
            }
          : idea
      )
    );

    try {
      const nextState = wasVoted
        ? await unvoteIdea(target.id, auth.session.access_token)
        : await voteForIdea(target.id, auth.session.access_token);

      setIdeas((current) =>
        current.map((idea) =>
          idea.id === target.id
            ? {
                ...idea,
                has_voted: nextState.has_voted,
                vote_count: nextState.vote_count
              }
            : idea
        )
      );

      if (wasVoted) {
        trackIdeaVoteRemoved();
      } else {
        trackIdeaVoteAdded();
      }
    } catch (error) {
      setIdeas((current) =>
        current.map((idea) =>
          idea.id === target.id
            ? {
                ...idea,
                has_voted: wasVoted,
                vote_count: Math.max(0, idea.vote_count + (wasVoted ? 1 : -1))
              }
            : idea
        )
      );
      setVoteError(
        error instanceof Error ? error.message : "Не удалось обновить поддержку идеи."
      );
    } finally {
      setVotePendingId(null);
    }
  }

  return (
    <section className="panel ideas-page" data-testid="ideas-page">
      <div className="ideas-page-head">
        <div>
          <p className="stats-section-kicker">Доска идей</p>
          <h2>Что улучшить в NeuroSprint</h2>
          <p>
            Здесь собираются предложения по развитию проекта. Публично видны только одобренные идеи.
            Новые предложения сначала попадают в раздел «Мои идеи» со статусом «На проверке».
          </p>
        </div>
      </div>

      {submitStatus ? <p className="status-line success">{submitStatus}</p> : null}
      {submitError ? <p className="status-line error">{submitError}</p> : null}
      {voteError ? <p className="status-line error">{voteError}</p> : null}
      {listError ? <p className="status-line">{listError}</p> : null}

      <div className="ideas-actions-bar">
        {auth.isAuthenticated ? (
          <>
            {!showCreateForm ? (
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  setShowCreateForm(true);
                  setSubmitError(null);
                  setSubmitStatus(null);
                }}
              >
                Предложить идею
              </button>
            ) : null}
            <button
              type="button"
              className={showMyIdeas ? "btn-primary" : "btn-ghost"}
              onClick={() => setShowMyIdeas((current) => !current)}
            >
              {showMyIdeas ? "Скрыть мои идеи" : "Мои идеи"}
            </button>
            {canModerateIdeas(auth.siteRole) ? (
              <Link className="btn-ghost" to="/admin/ideas">
                Модерация
              </Link>
            ) : null}
          </>
        ) : (
          <div className="ideas-guest-cta">
            <p>Чтобы предлагать идеи и голосовать, нужен аккаунт.</p>
            <Link
              className="btn-primary"
              to="/auth/login"
              onClick={() => setAuthReturnPath("/ideas", { preserveIfPresent: true })}
            >
              Войти
            </Link>
            <Link
              className="btn-ghost"
              to="/auth/register"
              onClick={() => setAuthReturnPath("/ideas", { preserveIfPresent: true })}
            >
              Создать аккаунт
            </Link>
          </div>
        )}
      </div>

      {showCreateForm && auth.isAuthenticated ? (
        <form className="ideas-create-form" onSubmit={handleCreateIdea}>
          <div className="ideas-create-form-head">
            <div>
              <h3>Новая идея</h3>
              <p className="status-line">
                После отправки идея останется у вас в разделе «Мои идеи» до проверки модератором.
              </p>
            </div>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setShowCreateForm(false)}
            >
              Отмена
            </button>
          </div>

          <label className="ideas-form-field">
            <span>Заголовок *</span>
            <input
              type="text"
              value={newTitle}
              onChange={(event) => setNewTitle(event.target.value)}
              placeholder="Коротко опишите идею"
              maxLength={200}
              required
            />
            <small className="ideas-form-hint">Минимум 4 символа.</small>
          </label>

          <label className="ideas-form-field">
            <span>Описание *</span>
            <textarea
              rows={5}
              value={newBody}
              onChange={(event) => setNewBody(event.target.value)}
              placeholder="Подробно расскажите, что именно предлагаете и зачем"
              maxLength={5000}
              required
            />
            <small className="ideas-form-hint">
              Минимум 10 символов, чтобы идея не выглядела как черновик или односложный спам.
            </small>
          </label>

          <div className="ideas-form-field">
            <span>Категория</span>
            <div className="ideas-category-list">
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={`ideas-category-chip${newCategory === key ? " is-selected" : ""}`}
                  onClick={() => setNewCategory(key as IdeaCategory)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {isLocalWriteUnavailable ? (
            <p className="status-line">
              На localhost отправка идей недоступна. Этот сценарий проверяйте на сайте или в Vercel
              Preview.
            </p>
          ) : null}

          <button
            type="submit"
            className="btn-primary"
            disabled={creating || isCreateInvalid || isLocalWriteUnavailable}
          >
            {creating ? "Отправляем..." : "Отправить идею"}
          </button>
        </form>
      ) : null}

      {showMyIdeas && auth.isAuthenticated ? (
        <section className="my-ideas-section">
          <h3>Мои идеи</h3>
          {myIdeas.length === 0 ? (
            <div className="ideas-empty-state">
              <strong>У вас пока нет идей</strong>
              <p>Начните с первого предложения. После отправки идея появится здесь со статусом проверки.</p>
            </div>
          ) : (
            <div className="ideas-grid">
              {myIdeas.map((idea) => (
                <article key={idea.id} className="idea-card">
                  <div className="idea-card-head">
                    <div className="idea-card-title">
                      <h4>{idea.title}</h4>
                      <div className="idea-card-badges">
                        <span className={`idea-status-badge is-${idea.moderation_status}`}>
                          {STATUS_LABELS[idea.moderation_status]}
                        </span>
                        <span
                          className={`idea-status-badge idea-roadmap-badge ${getRoadmapBadgeClass(idea.roadmap_status)}`}
                        >
                          {ROADMAP_LABELS[idea.roadmap_status]}
                        </span>
                      </div>
                    </div>
                    <span className="idea-category-badge">{CATEGORY_LABELS[idea.category]}</span>
                  </div>

                  <p className="idea-card-body">{idea.body}</p>

                  {idea.moderation_status === "rejected" && idea.rejection_note ? (
                    <div className="idea-card-note is-rejected">
                      <strong>Причина отклонения</strong>
                      <p>{idea.rejection_note}</p>
                    </div>
                  ) : null}

                  <div className="idea-card-meta">
                    <span>
                      <strong>Поддержали:</strong> {idea.vote_count}
                    </span>
                    <span>{ROADMAP_LABELS[idea.roadmap_status]}</span>
                    <span>{formatIdeaDate(idea.created_at)}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}

      <section className="ideas-list">
        {loading ? (
          <p className="status-line">Загружаем идеи...</p>
        ) : publicIdeas.length === 0 ? (
          <div className="ideas-empty-state">
            <strong>Пока нет одобренных идей</strong>
            <p>Сообщество ещё не сформировало публичную очередь. Вы можете предложить первую идею.</p>
          </div>
        ) : (
          <>
            <h3>Предложения сообщества</h3>
            <div className="ideas-grid">
              {publicIdeas.map((idea) => {
                const canVote = auth.isAuthenticated && !idea.is_author;
                const votePending = votePendingId === idea.id;

                return (
                  <article key={idea.id} className="idea-card">
                    <div className="idea-card-head">
                      <div className="idea-card-title">
                        <h4>{idea.title}</h4>
                        <div className="idea-card-badges">
                          {idea.is_author ? (
                            <span className="idea-status-badge is-approved">Ваша идея</span>
                          ) : null}
                          <span
                            className={`idea-status-badge idea-roadmap-badge ${getRoadmapBadgeClass(idea.roadmap_status)}`}
                          >
                            {ROADMAP_LABELS[idea.roadmap_status]}
                          </span>
                        </div>
                      </div>
                      <span className="idea-category-badge">{CATEGORY_LABELS[idea.category]}</span>
                    </div>

                    <p className="idea-card-body">{idea.body}</p>

                    <div className="idea-card-footer">
                      <div className="idea-card-meta">
                        <span className="idea-author">{idea.author_name}</span>
                        <span className="idea-date">{formatIdeaDate(idea.created_at)}</span>
                        <span>{ROADMAP_LABELS[idea.roadmap_status]}</span>
                      </div>

                      <div className="idea-support-block">
                        {canVote ? (
                          <button
                            type="button"
                            className={`idea-support-btn${idea.has_voted ? " is-voted" : ""}`}
                            onClick={() => void handleVote(idea)}
                            disabled={votePending}
                          >
                            {votePending
                              ? "Сохраняем..."
                              : idea.has_voted
                                ? "Вы поддержали"
                                : "Поддержать"}
                          </button>
                        ) : (
                          <span className="idea-support-note">
                            {idea.is_author
                              ? "Автор не голосует за свою идею"
                              : "Голосование доступно только из аккаунта"}
                          </span>
                        )}
                        <span className="idea-support-count">Поддержали: {idea.vote_count}</span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>
    </section>
  );
}
