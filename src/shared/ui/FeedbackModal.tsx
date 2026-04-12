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

const CATEGORIES: { value: FeedbackCategory; label: string; emoji: string; color: string; bgColor: string }[] = [
  { value: "bug", label: "Баг", emoji: "🐛", color: "#dc2626", bgColor: "#fef2f2" },
  { value: "ux", label: "Неудобно", emoji: "😕", color: "#ea580c", bgColor: "#fff7ed" },
  { value: "idea", label: "Идея", emoji: "💡", color: "#ca8a04", bgColor: "#fefce8" },
  { value: "question", label: "Вопрос", emoji: "❓", color: "#2563eb", bgColor: "#eff6ff" },
  { value: "praise", label: "Похвала", emoji: "❤️", color: "#16a34a", bgColor: "#f0fdf4" },
  { value: "other", label: "Другое", emoji: "", color: "#7c3aed", bgColor: "#f5f3ff" }
];

const MAX_COMMENT_LENGTH = 2000;
const LOCALHOST_NAMES = new Set(["localhost", "127.0.0.1"]);

export function FeedbackModal({ onClose, surface = "global_form", moduleId, modeId }: FeedbackModalProps) {
  const auth = useAuth();
  const [category, setCategory] = useState<FeedbackCategory | null>(null);
  const [comment, setComment] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [starRating, setStarRating] = useState<number | null>(null);
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const isLocalWriteUnavailable =
    import.meta.env.DEV &&
    typeof window !== "undefined" &&
    LOCALHOST_NAMES.has(window.location.hostname);

  useEffect(() => {
    if (auth.isAuthenticated && auth.account?.email) {
      setContactEmail(auth.account.email);
    }
    trackFeedbackOpened(surface);
    // Trigger entrance animation
    requestAnimationFrame(() => setIsVisible(true));
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

  const selectedCategory = CATEGORIES.find(c => c.value === category);

  // --- Render ---
  const overlayStyle: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    zIndex: 9999,
    background: "rgba(0,0,0,0.5)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "16px 20px",
    opacity: isVisible ? 1 : 0,
    transition: "opacity 0.3s ease"
  };

  const cardStyle: React.CSSProperties = {
    background: "linear-gradient(135deg, #ffffff 0%, #fafafa 100%)",
    borderRadius: "20px",
    padding: "0",
    maxWidth: "520px",
    width: "100%",
    maxHeight: "90vh",
    overflowY: "auto",
    boxShadow: "0 25px 60px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.1)",
    transform: isVisible ? "scale(1) translateY(0)" : "scale(0.95) translateY(20px)",
    transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
    display: "flex",
    flexDirection: "column"
  };

  const headerStyle: React.CSSProperties = {
    padding: "28px 28px 20px",
    borderBottom: "1px solid #e5e7eb",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "16px"
  };

  const bodyStyle: React.CSSProperties = {
    padding: "24px 28px 28px",
    display: "flex",
    flexDirection: "column",
    gap: "20px"
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    marginBottom: "8px",
    fontWeight: 600,
    fontSize: "14px",
    color: "#374151"
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    borderRadius: "10px",
    border: "2px solid #e5e7eb",
    fontSize: "14px",
    boxSizing: "border-box",
    transition: "border-color 0.2s, box-shadow 0.2s",
    outline: "none"
  };

  const commentProgressPct = Math.min((comment.length / MAX_COMMENT_LENGTH) * 100, 100);
  const commentProgressColor = commentProgressPct > 90 ? "#ef4444" : commentProgressPct > 70 ? "#f59e0b" : "#10b981";

  // --- Success State ---
  if (submitted) {
    return (
      <div className="feedback-modal-overlay" style={overlayStyle} data-testid="feedback-modal" onClick={handleDismiss}>
        <div className="feedback-modal-content" style={{
          ...cardStyle,
          padding: "48px 28px",
          textAlign: "center",
          alignItems: "center",
          gap: "16px"
        }}>
          <div style={{
            width: "72px",
            height: "72px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "36px",
            boxShadow: "0 8px 24px rgba(16, 185, 129, 0.3)"
          }}>
            ✓
          </div>
          <p className="stats-section-kicker" style={{ margin: "0 0 4px", color: "#10b981" }}>Спасибо за отзыв!</p>
          <h3 style={{ margin: 0, fontSize: "20px", color: "#111827" }}>Отзыв отправлен</h3>
          <p style={{ margin: 0, fontSize: "14px", color: "#6b7280", lineHeight: 1.5 }}>
            Мы используем такие отзывы, чтобы точнее доводить тренажёры и интерфейс.
          </p>
          <button
            type="button"
            className="btn-primary"
            onClick={onClose}
            style={{
              alignSelf: "center",
              marginTop: "8px",
              padding: "12px 32px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              border: "none",
              color: "#fff",
              fontWeight: 600,
              fontSize: "14px",
              cursor: "pointer",
              transition: "transform 0.2s, box-shadow 0.2s",
              boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 6px 16px rgba(16, 185, 129, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(16, 185, 129, 0.3)";
            }}
          >
            Закрыть
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="feedback-modal-overlay" style={overlayStyle} data-testid="feedback-modal" onClick={handleDismiss}>
      <div className="feedback-modal-content" style={cardStyle} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={headerStyle}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "32px", marginBottom: "8px" }}>💬</div>
            <p className="stats-section-kicker" style={{ margin: "0 0 4px", fontSize: "12px", letterSpacing: "0.05em" }}>
              Обратная связь
            </p>
            <h3 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "#111827" }}>
              Что вы думаете о NeuroSprint?
            </h3>
            <p style={{ margin: "6px 0 0", fontSize: "14px", color: "#6b7280", lineHeight: 1.5 }}>
              Расскажите, что получилось хорошо, а что стоит улучшить.
            </p>
          </div>
          <button
            type="button"
            className="feedback-modal-dismiss"
            onClick={handleDismiss}
            style={{
              background: "#f3f4f6",
              border: "none",
              borderRadius: "10px",
              width: "36px",
              height: "36px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: "18px",
              color: "#6b7280",
              transition: "background 0.2s, color 0.2s",
              flexShrink: 0
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#e5e7eb";
              e.currentTarget.style.color = "#374151";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#f3f4f6";
              e.currentTarget.style.color = "#6b7280";
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={bodyStyle}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Star Rating */}
            {surface === "post_session" && (
              <div>
                <label style={labelStyle}>Оценка</label>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ display: "flex", gap: "4px" }}>
                    {Array.from({ length: 5 }, (_, i) => i + 1).map((n) => {
                      const isActive = (hoveredStar ?? starRating ?? 0) >= n;
                      return (
                        <button
                          key={n}
                          type="button"
                          style={{
                            background: "none",
                            border: "none",
                            fontSize: "28px",
                            cursor: "pointer",
                            color: isActive ? "#fbbf24" : "#d1d5db",
                            transition: "color 0.15s, transform 0.15s",
                            transform: isActive ? "scale(1.1)" : "scale(1)",
                            filter: isActive ? "drop-shadow(0 2px 4px rgba(251, 191, 36, 0.4))" : "none"
                          }}
                          onMouseEnter={() => setHoveredStar(n)}
                          onMouseLeave={() => setHoveredStar(null)}
                          onClick={() => setStarRating(n)}
                        >
                          ★
                        </button>
                      );
                    })}
                  </div>
                  {starRating && (
                    <span style={{ fontSize: "13px", color: "#6b7280" }}>
                      {starRating <= 2 ? "Можно лучше" : starRating <= 3 ? "Нормально" : starRating <= 4 ? "Хорошо" : "Отлично!"}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Categories */}
            <div>
              <label style={labelStyle}>Категория *</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {CATEGORIES.map((cat) => {
                  const isSelected = category === cat.value;
                  return (
                    <button
                      key={cat.value}
                      type="button"
                      style={{
                        padding: "8px 14px",
                        borderRadius: "12px",
                        border: `2px solid ${isSelected ? cat.color : "#e5e7eb"}`,
                        background: isSelected ? cat.bgColor : "#fff",
                        cursor: "pointer",
                        fontSize: "13px",
                        fontWeight: isSelected ? 600 : 400,
                        color: isSelected ? cat.color : "#6b7280",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        boxSizing: "border-box",
                        minHeight: "40px",
                        transition: "all 0.2s ease",
                        boxShadow: isSelected ? `0 2px 8px ${cat.color}22` : "none"
                      }}
                      onClick={() => setCategory(cat.value)}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = cat.color;
                          e.currentTarget.style.background = cat.bgColor;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = "#e5e7eb";
                          e.currentTarget.style.background = "#fff";
                        }
                      }}
                    >
                      <span style={{ fontSize: "16px" }}>{cat.emoji}</span>
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Comment */}
            <div>
              <label style={labelStyle}>Комментарий *</label>
              <div style={{ position: "relative" }}>
                <textarea
                  rows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Например: Мне понравилось, как работает тренажёр, но хотелось бы..."
                  maxLength={MAX_COMMENT_LENGTH}
                  required
                  style={{
                    ...inputStyle,
                    resize: "vertical",
                    fontFamily: "inherit",
                    minHeight: "100px",
                    paddingRight: "14px",
                    lineHeight: 1.5
                  }}
                />
                <div style={{
                  position: "absolute",
                  bottom: "8px",
                  right: "12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}>
                  <span style={{ fontSize: "11px", color: "#9ca3af", whiteSpace: "nowrap" }}>
                    {comment.length}/{MAX_COMMENT_LENGTH}
                  </span>
                </div>
              </div>
              {/* Progress bar */}
              <div style={{
                height: "3px",
                background: "#e5e7eb",
                borderRadius: "2px",
                marginTop: "8px",
                overflow: "hidden"
              }}>
                <div style={{
                  height: "100%",
                  width: `${commentProgressPct}%`,
                  background: commentProgressColor,
                  borderRadius: "2px",
                  transition: "width 0.3s, background 0.3s"
                }} />
              </div>
            </div>

            {/* Email */}
            <div>
              <label style={labelStyle}>Email для связи <span style={{ fontWeight: 400, color: "#9ca3af" }}>(необязательно)</span></label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="you@example.com"
                style={inputStyle}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = selectedCategory?.color ?? "#3b82f6";
                  e.currentTarget.style.boxShadow = `0 0 0 3px ${selectedCategory?.color ?? "#3b82f6"}15`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#e5e7eb";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>

            {/* Localhost warning */}
            {isLocalWriteUnavailable && (
              <div style={{
                padding: "12px 16px",
                borderRadius: "10px",
                background: "#fef3c7",
                border: "1px solid #fbbf24",
                display: "flex",
                alignItems: "flex-start",
                gap: "10px"
              }}>
                <span style={{ fontSize: "18px", flexShrink: 0 }}>⚠️</span>
                <p style={{ margin: 0, fontSize: "13px", color: "#92400e", lineHeight: 1.5 }}>
                  На localhost отправка отзывов недоступна. Проверьте форму на сайте или в{" "}
                  <a
                    href="https://neurosprint.vercel.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#92400e", fontWeight: 600, textDecoration: "underline" }}
                  >
                    Vercel Preview
                  </a>
                  .
                </p>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div style={{
                padding: "12px 16px",
                borderRadius: "10px",
                background: "#fee2e2",
                border: "1px solid #f87171",
                display: "flex",
                alignItems: "flex-start",
                gap: "10px"
              }}>
                <span style={{ fontSize: "18px", flexShrink: 0 }}>❌</span>
                <p className="status-line error" style={{ margin: 0, fontSize: "13px", color: "#991b1b" }}>
                  {error}
                </p>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              className="btn-primary"
              disabled={!canSubmit}
              style={{
                alignSelf: "flex-start",
                padding: "12px 28px",
                borderRadius: "10px",
                background: canSubmit
                  ? selectedCategory
                    ? `linear-gradient(135deg, ${selectedCategory.color} 0%, ${selectedCategory.color}dd 100%)`
                    : "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                  : "#d1d5db",
                border: "none",
                color: canSubmit ? "#fff" : "#9ca3af",
                fontWeight: 600,
                fontSize: "14px",
                cursor: canSubmit ? "pointer" : "not-allowed",
                transition: "all 0.2s ease",
                boxShadow: canSubmit ? `0 4px 12px ${selectedCategory?.color ?? "#10b981"}33` : "none",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
              onMouseEnter={(e) => {
                if (canSubmit) {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = `0 6px 16px ${selectedCategory?.color ?? "#10b981"}44`;
                }
              }}
              onMouseLeave={(e) => {
                if (canSubmit) {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = `0 4px 12px ${selectedCategory?.color ?? "#10b981"}33`;
                }
              }}
            >
              {submitting ? (
                <>
                  <span style={{
                    display: "inline-block",
                    width: "16px",
                    height: "16px",
                    border: "2px solid rgba(255,255,255,0.3)",
                    borderTopColor: "#fff",
                    borderRadius: "50%",
                    animation: "spin 0.6s linear infinite"
                  }} />
                  Отправляем...
                </>
              ) : (
                <>
                  Отправить отзыв
                  {selectedCategory && <span>{selectedCategory.emoji}</span>}
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Keyframe animation for spinner */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
