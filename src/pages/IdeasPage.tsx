import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../app/useAuth";
import { setAuthReturnPath } from "../shared/lib/auth/authReturnPath";
import {
  fetchIdeas,
  createIdea,
  voteForIdea,
  unvoteIdea
} from "../shared/lib/ideas/ideasService";
import type { IdeaCategory, IdeaModerationStatus, IdeaSummary } from "../shared/lib/ideas/types";
import { trackIdeasViewed, trackIdeaSubmitted, trackIdeaVoteAdded, trackIdeaVoteRemoved } from "../shared/lib/analytics/siteAnalytics";

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

const LOCALHOST_NAMES = new Set(["localhost", "127.0.0.1"]);

export function IdeasPage() {
  const auth = useAuth();
  const [ideas, setIdeas] = useState<IdeaSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [myIdeas, setMyIdeas] = useState<IdeaSummary[]>([]);
  const [showMyIdeas, setShowMyIdeas] = useState(false);

  // Создание идеи
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newCategory, setNewCategory] = useState<IdeaCategory>("other");
  const isLocalWriteUnavailable =
    import.meta.env.DEV &&
    typeof window !== "undefined" &&
    LOCALHOST_NAMES.has(window.location.hostname);

  useEffect(() => {
    trackIdeasViewed();
    void loadIdeas();
  }, [auth.isAuthenticated]);

  useEffect(() => {
    if (auth.isAuthenticated && auth.session?.access_token) {
      void loadMyIdeas();
    }
  }, [auth.isAuthenticated, auth.session?.access_token]);

  async function loadIdeas() {
    setLoading(true);
    try {
      const token = auth.isAuthenticated ? auth.session?.access_token : undefined;
      const response = await fetchIdeas(token, 1, 50);
      setIdeas(response.ideas);
      setError(null);
    } catch (err) {
      // В локальной разработке API не работает — показываем пустое состояние без ошибки
      console.warn("Ideas API unavailable (dev mode):", err);
      setIdeas([]);
      setError(null);
    } finally {
      setLoading(false);
    }
  }

  async function loadMyIdeas() {
    if (!auth.isAuthenticated || !auth.session?.access_token) return;
    try {
      const response = await fetchIdeas(auth.session.access_token, 1, 50);
      const mine = response.ideas.filter((idea) => idea.is_author);
      setMyIdeas(mine);
    } catch {
      // Ignore errors for my ideas
    }
  }

  async function handleCreateIdea(event: FormEvent) {
    event.preventDefault();
    if (!auth.isAuthenticated || !auth.session?.access_token) return;
    if (!newTitle.trim() || !newBody.trim()) return;

    setCreating(true);
    setError(null);

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
      await loadIdeas();
      await loadMyIdeas();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось создать идею");
    } finally {
      setCreating(false);
    }
  }

  async function handleVote(ideaId: string, currentlyVoted: boolean) {
    if (!auth.isAuthenticated || !auth.session?.access_token) return;

    try {
      if (currentlyVoted) {
        await unvoteIdea(ideaId, auth.session.access_token);
        trackIdeaVoteRemoved();
      } else {
        await voteForIdea(ideaId, auth.session.access_token);
        trackIdeaVoteAdded();
      }

      setIdeas((current) =>
        current.map((idea) =>
          idea.id === ideaId
            ? {
                ...idea,
                vote_count: currentlyVoted ? idea.vote_count - 1 : idea.vote_count + 1,
                has_voted: !currentlyVoted
              }
            : idea
        )
      );
    } catch (err) {
      console.error("Vote failed:", err);
    }
  }

  return (
    <section className="panel ideas-page" data-testid="ideas-page">
      <div className="ideas-page-head">
        <div>
          <p className="stats-section-kicker">Доска идей</p>
          <h2>Что улучшить в NeuroSprint</h2>
          <p>
            Здесь собираются идеи от сообщества. Голосуйте за те, что вам близки,
            и предлагайте свои.
          </p>
        </div>
      </div>

      {error ? <p className="status-line error">{error}</p> : null}

      {/* Actions bar */}
      <div className="ideas-actions-bar">
        {auth.isAuthenticated ? (
          <>
            <button
              type="button"
              className="btn-primary"
              onClick={() => setShowCreateForm(!showCreateForm)}
            >
              {showCreateForm ? "Отмена" : "Предложить идею"}
            </button>
            {myIdeas.length > 0 && (
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setShowMyIdeas(!showMyIdeas)}
              >
                {showMyIdeas ? "Все идеи" : "Мои идеи"}
              </button>
            )}
          </>
        ) : (
          <div className="ideas-guest-cta">
            <p>Хотите предложить идею или проголосовать?</p>
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

      {/* Create form */}
      {showCreateForm && auth.isAuthenticated && (
        <form
          className="ideas-create-form"
          onSubmit={handleCreateIdea}
          style={{
            background: "linear-gradient(180deg, #f8faf9 0%, #fff 100%)",
            border: "1px solid #d4e8e0",
            borderRadius: 16,
            padding: "24px 28px",
            display: "flex",
            flexDirection: "column",
            gap: 18,
            marginBottom: 24
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0, fontSize: 18 }}>Новая идея</h3>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setShowCreateForm(false)}
              style={{ padding: "6px 14px", fontSize: 13 }}
            >
              Отмена
            </button>
          </div>

          {/* Title */}
          <div>
            <label style={{ display: "block", marginBottom: 6, fontWeight: 600, fontSize: 14 }}>
              Заголовок *
            </label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Коротко опишите идею"
              maxLength={200}
              required
              style={{
                width: "100%", padding: "10px 14px", borderRadius: 10,
                border: "1px solid #d1d5db", fontSize: 14, boxSizing: "border-box",
                fontFamily: "inherit", outline: "none", transition: "border-color 0.2s"
              }}
            />
          </div>

          {/* Description */}
          <div>
            <label style={{ display: "block", marginBottom: 6, fontWeight: 600, fontSize: 14 }}>
              Описание *
            </label>
            <textarea
              rows={5}
              value={newBody}
              onChange={(e) => setNewBody(e.target.value)}
              placeholder="Подробно расскажите, что вы предлагаете и зачем"
              maxLength={5000}
              required
              style={{
                width: "100%", padding: "10px 14px", borderRadius: 10,
                border: "1px solid #d1d5db", fontSize: 14, boxSizing: "border-box",
                fontFamily: "inherit", resize: "vertical", outline: "none"
              }}
            />
          </div>

          {/* Category chips */}
          <div>
            <label style={{ display: "block", marginBottom: 8, fontWeight: 600, fontSize: 14 }}>
              Категория
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  style={{
                    padding: "6px 16px", borderRadius: 20,
                    border: `2px solid ${newCategory === key ? "#0f4f46" : "#d1d5db"}`,
                    background: newCategory === key ? "#ecfdf5" : "#fff",
                    color: newCategory === key ? "#0f4f46" : "#374151",
                    cursor: "pointer", fontSize: 13, fontWeight: 500,
                    transition: "background-color 0.15s, border-color 0.15s, color 0.15s",
                    boxSizing: "border-box",
                    minHeight: 38
                  }}
                  onClick={() => setNewCategory(key as IdeaCategory)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
            После отправки идея появится в разделе «Мои идеи» со статусом «На проверке».
            Публично она станет видна после проверки.
          </p>

          {isLocalWriteUnavailable ? (
            <p className="status-line" style={{ margin: 0 }}>
              На localhost отправка идей недоступна. Проверьте создание идеи на сайте или в Vercel Preview.
            </p>
          ) : null}

          <button
            type="submit"
            className="btn-primary"
            disabled={creating || !newTitle.trim() || !newBody.trim() || isLocalWriteUnavailable}
            style={{ alignSelf: "flex-start", padding: "10px 24px" }}
          >
            {creating ? "Отправляем..." : "Отправить идею"}
          </button>
        </form>
      )}

      {/* My ideas */}
      {showMyIdeas && auth.isAuthenticated && (
        <section className="my-ideas-section">
          <h3>Мои идеи</h3>
          {myIdeas.length === 0 ? (
            <p>У вас пока нет идей. Предложите первую!</p>
          ) : (
            <div className="ideas-list">
              {myIdeas.map((idea) => (
                <article key={idea.id} className="idea-card">
                  <div className="idea-card-head">
                    <div className="idea-card-title">
                      <h4>{idea.title}</h4>
                      <span className={`idea-status-badge is-${idea.moderation_status}`}>
                        {STATUS_LABELS[idea.moderation_status]}
                      </span>
                    </div>
                    <span className="idea-category-badge">
                      {CATEGORY_LABELS[idea.category]}
                    </span>
                  </div>
                  <p>{idea.body}</p>
                  <div className="idea-card-meta">
                    <span>👍 {idea.vote_count}</span>
                    <span>{new Date(idea.created_at).toLocaleDateString("ru-RU")}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Public ideas list */}
      <section className="ideas-list">
        {loading ? (
          <p className="status-line">Загружаем идеи...</p>
        ) : ideas.length === 0 ? (
          <div className="ideas-empty-state">
            <h3>Пока нет идей</h3>
            <p>Станьте первым — предложите идею для улучшения NeuroSprint.</p>
            {!auth.isAuthenticated ? (
              <Link
                className="btn-primary"
                to="/auth/login"
                onClick={() => setAuthReturnPath("/ideas", { preserveIfPresent: true })}
              >
                Войти, чтобы предложить
              </Link>
            ) : null}
          </div>
        ) : (
          <>
            <h3>
              {showMyIdeas ? "Все идеи" : "Предложения сообщества"}
            </h3>
            <div className="ideas-grid">
              {ideas.map((idea) => (
                <article key={idea.id} className="idea-card">
                  <div className="idea-card-vote">
                    {auth.isAuthenticated ? (
                      <button
                        type="button"
                        className={`idea-vote-btn${idea.has_voted ? " is-voted" : ""}`}
                        onClick={() => handleVote(idea.id, idea.has_voted)}
                        title={idea.has_voted ? "Снять голос" : "Проголосовать"}
                      >
                        👍 {idea.vote_count}
                      </button>
                    ) : (
                      <span className="idea-vote-count">
                        👍 {idea.vote_count}
                      </span>
                    )}
                  </div>

                  <div className="idea-card-content">
                    <div className="idea-card-head">
                      <div className="idea-card-title">
                        <h4>{idea.title}</h4>
                        {idea.is_author && idea.moderation_status !== "approved" && (
                          <span className={`idea-status-badge is-${idea.moderation_status}`}>
                            {STATUS_LABELS[idea.moderation_status]}
                          </span>
                        )}
                      </div>
                      <span className="idea-category-badge">
                        {CATEGORY_LABELS[idea.category]}
                      </span>
                    </div>

                    <p className="idea-card-body">{idea.body}</p>

                    <div className="idea-card-meta">
                      <span className="idea-author">{idea.author_name}</span>
                      <span className="idea-date">
                        {new Date(idea.created_at).toLocaleDateString("ru-RU")}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </section>
  );
}
