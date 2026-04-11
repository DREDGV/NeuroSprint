import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../app/useAuth";
import { submitFeedback } from "../lib/feedback/feedbackService";
import { getOrCreateGuestToken } from "../lib/feedback/guestToken";
import type { FeedbackCategory } from "../lib/feedback/types";
import {
  trackFeedbackDismissed,
  trackFeedbackOpened,
  trackFeedbackSubmitted
} from "../lib/analytics/siteAnalytics";

interface FeedbackModalProps {
  onClose: () => void;
  surface?: "global_form" | "post_session";
  moduleId?: string;
  modeId?: string;
}

const CATEGORIES: { value: FeedbackCategory; label: string; emoji: string }[] = [
  { value: "bug", label: "Баг", emoji: "🐛" },
  { value: "ux", label: "Неудобно", emoji: "😕" },
  { value: "idea", label: "Идея", emoji: "💡" },
  { value: "question", label: "Вопрос", emoji: "❓" },
  { value: "praise", label: "Похвала", emoji: "❤️" }
];

const MAX_COMMENT_LENGTH = 2000;
const LOCALHOST_NAMES = new Set(["localhost", "127.0.0.1"]);

export function FeedbackModal({ onClose, surface = "global_form", moduleId, modeId }: FeedbackModalProps) {
  const auth = useAuth();
  const [category, setCategory] = useState<FeedbackCategory | null>(null);
  const [comment, setComment] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [starRating, setStarRating] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isLocalWriteUnavailable =
    import.meta.env.DEV &&
    typeof window !== "undefined" &&
    LOCALHOST_NAMES.has(window.location.hostname);

  useEffect(() => {
    if (auth.isAuthenticated && auth.account?.email) {
      setContactEmail(auth.account.email);
    }
    trackFeedbackOpened(surface);
  }, [auth.isAuthenticated, auth.account?.email, surface]);

  const canSubmit = useMemo(() => {
    return category != null && comment.trim().length > 0 && !submitting && !isLocalWriteUnavailable;
  }, [category, comment, submitting, isLocalWriteUnavailable]);

  const handleSubmit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      if (!canSubmit) return;
      setSubmitting(true);
      setError(null);

      try {
        const authToken = auth.isAuthenticated ? auth.session?.access_token : undefined;
        const guestToken = !auth.isAuthenticated ? getOrCreateGuestToken() : undefined;

        await submitFeedback(
          {
            category: category!,
            source_surface: surface,
            comment: comment.trim().slice(0, MAX_COMMENT_LENGTH),
            star_rating: starRating,
            contact_email: contactEmail.trim() || null,
            module_id: moduleId || null,
            mode_id: modeId || null,
            route: window.location.pathname,
            guest_token: guestToken,
            client_context: { userAgent: navigator.userAgent, viewportWidth: window.innerWidth }
          },
          authToken
        );

        setSubmitted(true);
        trackFeedbackSubmitted(surface, category!, moduleId, auth.isAuthenticated ? "account" : "guest", starRating ?? undefined);
      } catch (err) {
        console.error("Feedback submit failed:", err);
        setError(err instanceof Error ? err.message : "Не удалось отправить отзыв");
      } finally {
        setSubmitting(false);
      }
    },
    [canSubmit, auth, category, comment, contactEmail, moduleId, modeId, starRating, surface]
  );

  const handleDismiss = useCallback(() => {
    trackFeedbackDismissed(surface);
    onClose();
  }, [onClose, surface]);

  // --- Render ---
  const overlayStyle: React.CSSProperties = {
    position: "fixed", inset: 0, zIndex: 9999,
    background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center",
    padding: 16
  };
  const cardStyle: React.CSSProperties = {
    background: "#fff", borderRadius: 16, padding: "24px 28px", maxWidth: 480, width: "100%",
    maxHeight: "90vh", overflowY: "auto", boxShadow: "0 12px 40px rgba(0,0,0,0.15)",
    display: "flex", flexDirection: "column", gap: 16
  };
  const labelStyle: React.CSSProperties = { display: "block", marginBottom: 6, fontWeight: 600, fontSize: 14 };
  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14, boxSizing: "border-box"
  };

  if (submitted) {
    return (
      <div className="feedback-modal-overlay" style={overlayStyle} data-testid="feedback-modal">
        <div className="feedback-modal-content" style={cardStyle}>
          <p className="stats-section-kicker">Спасибо</p>
          <h3 style={{ margin: 0 }}>Отзыв отправлен</h3>
          <p style={{ margin: 0 }}>Мы используем такие отзывы, чтобы точнее доводить тренажёры и интерфейс.</p>
          <button type="button" className="btn-primary" onClick={onClose} style={{ alignSelf: "flex-start" }}>
            Закрыть
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="feedback-modal-overlay" style={overlayStyle} data-testid="feedback-modal" onClick={handleDismiss}>
      <div className="feedback-modal-content" style={cardStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <p className="stats-section-kicker" style={{ margin: "0 0 4px" }}>Обратная связь</p>
            <h3 style={{ margin: 0 }}>Что вы думаете о NeuroSprint?</h3>
            <p style={{ margin: "4px 0 0", fontSize: 14, color: "#6b7280" }}>Расскажите, что получилось хорошо, а что стоит улучшить.</p>
          </div>
          <button type="button" className="btn-ghost feedback-modal-dismiss" onClick={handleDismiss}>Закрыть</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Star Rating */}
          {surface === "post_session" && (
            <div>
              <label style={labelStyle}>Оценка</label>
              <div style={{ display: "flex", gap: 4 }}>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <button key={n} type="button"
                    style={{
                      background: "none", border: "none", fontSize: 18, cursor: "pointer",
                      color: starRating === n ? "#f59e0b" : "#d1d5db",
                      transition: "color 0.15s"
                    }}
                    onClick={() => setStarRating(n)}
                  >
                    {n <= 5 ? "★" : "☆"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Categories */}
          <div>
            <label style={labelStyle}>Категория *</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {CATEGORIES.map((cat) => (
                <button key={cat.value} type="button"
                  style={{
                    padding: "6px 12px", borderRadius: 20, border: `2px solid ${category === cat.value ? "#0f4f46" : "#d1d5db"}`,
                    background: category === cat.value ? "#ecfdf5" : "#fff",
                    cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 4,
                    boxSizing: "border-box", minHeight: 38
                  }}
                  onClick={() => setCategory(cat.value)}
                >
                  <span>{cat.emoji}</span><span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Comment */}
          <div>
            <label style={labelStyle}>Комментарий *</label>
            <textarea
              rows={4} value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Опишите, что произошло, что было хорошо или что стоит улучшить"
              maxLength={MAX_COMMENT_LENGTH} required
              style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
            />
            <span style={{ fontSize: 12, color: "#9ca3af", display: "block", marginTop: 4 }}>
              {comment.length}/{MAX_COMMENT_LENGTH}
            </span>
          </div>

          {/* Email */}
          <div>
            <label style={labelStyle}>Email для связи (необязательно)</label>
            <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)}
              placeholder="you@example.com" style={inputStyle} />
          </div>

          {isLocalWriteUnavailable ? (
            <p className="status-line" style={{ margin: 0 }}>
              На localhost отправка отзывов недоступна. Проверьте форму на сайте или в Vercel Preview.
            </p>
          ) : null}

          {error && <p className="status-line error" style={{ margin: 0 }}>{error}</p>}

          <button type="submit" className="btn-primary" disabled={!canSubmit} style={{ alignSelf: "flex-start" }}>
            {submitting ? "Отправляем..." : "Отправить отзыв"}
          </button>
        </form>
      </div>
    </div>
  );
}
