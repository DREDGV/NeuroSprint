import { useMemo, useState } from "react";
import type { TrainerFeedbackSentiment } from "../../entities/trainer-feedback/trainerFeedbackRepository";

interface FeedbackOption {
  value: TrainerFeedbackSentiment;
  label: string;
  helper: string;
}

interface TrainerFeedbackCardProps {
  title: string;
  subtitle: string;
  onDismiss: () => void;
  onSubmit: (payload: { sentiment: TrainerFeedbackSentiment; reasons: string[]; comment: string }) => void;
}

const FEEDBACK_OPTIONS: FeedbackOption[] = [
  { value: "liked", label: "Понравилось", helper: "Хочется повторить" },
  { value: "okay", label: "Нормально", helper: "Есть что улучшить" },
  { value: "not_for_me", label: "Пока не зашло", helper: "Нужно доработать" }
];

const FEEDBACK_REASONS: Record<TrainerFeedbackSentiment, string[]> = {
  liked: ["Понятные правила", "Хороший темп", "Интересно играть", "Хочется повторить"],
  okay: ["Нужно привыкнуть", "Хочется короче", "Не хватает подсказок", "Есть спорные места"],
  not_for_me: ["Непонятно", "Слишком сложно", "Неудобный экран", "Слабая визуальная часть"]
};

export function TrainerFeedbackCard({ title, subtitle, onDismiss, onSubmit }: TrainerFeedbackCardProps) {
  const [sentiment, setSentiment] = useState<TrainerFeedbackSentiment | null>(null);
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [saved, setSaved] = useState(false);

  const reasonOptions = useMemo(() => (sentiment ? FEEDBACK_REASONS[sentiment] : []), [sentiment]);

  function toggleReason(reason: string): void {
    setSelectedReasons((current) =>
      current.includes(reason) ? current.filter((item) => item !== reason) : [...current, reason]
    );
  }

  function handleSubmit(): void {
    if (!sentiment) {
      return;
    }

    onSubmit({
      sentiment,
      reasons: selectedReasons,
      comment: comment.trim()
    });
    setSaved(true);
  }

  if (saved) {
    return (
      <section className="trainer-feedback-card is-saved" data-testid="trainer-feedback-card">
        <p className="stats-section-kicker">Спасибо</p>
        <h4>Отзыв сохранён</h4>
        <p>Мы используем такие ответы, чтобы спокойнее и точнее доводить тренажёры.</p>
      </section>
    );
  }

  return (
    <section className="trainer-feedback-card" data-testid="trainer-feedback-card">
      <div className="trainer-feedback-head">
        <div>
          <p className="stats-section-kicker">Обратная связь</p>
          <h4>{title}</h4>
          <p>{subtitle}</p>
        </div>
        <button type="button" className="btn-ghost trainer-feedback-dismiss" onClick={onDismiss}>
          Не сейчас
        </button>
      </div>

      <div className="trainer-feedback-options" role="group" aria-label="Оценка тренажёра">
        {FEEDBACK_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={sentiment === option.value ? "trainer-feedback-option is-active" : "trainer-feedback-option"}
            onClick={() => setSentiment(option.value)}
            data-testid={`trainer-feedback-option-${option.value}`}
          >
            <strong>{option.label}</strong>
            <span>{option.helper}</span>
          </button>
        ))}
      </div>

      {sentiment ? (
        <div className="trainer-feedback-reasons" data-testid="trainer-feedback-reasons">
          <p className="trainer-feedback-reasons-label">Что повлияло на это ощущение?</p>
          <div className="trainer-feedback-reason-list">
            {reasonOptions.map((reason) => (
              <button
                key={reason}
                type="button"
                className={selectedReasons.includes(reason) ? "trainer-feedback-reason is-active" : "trainer-feedback-reason"}
                onClick={() => toggleReason(reason)}
              >
                {reason}
              </button>
            ))}
          </div>
          <label className="trainer-feedback-comment">
            <span>Если хотите, добавьте короткий комментарий</span>
            <textarea
              rows={3}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Что было особенно хорошо или что стоит улучшить?"
            />
          </label>
          <div className="action-row trainer-feedback-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={handleSubmit}
              data-testid="trainer-feedback-submit"
            >
              Сохранить отзыв
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

