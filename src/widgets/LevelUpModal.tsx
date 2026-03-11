import { useEffect, useState } from "react";
import { ConfettiCelebration } from "../shared/ui/ConfettiCelebration";

interface LevelUpModalProps {
  fromLevel: number;
  toLevel: number;
  nextGoalSummary?: string;
  testId?: string;
  onClose: () => void;
}

interface AchievementUnlockedToastProps {
  achievementTitle: string;
  achievementIcon: string;
  progressText?: string;
  testId?: string;
  onClose: () => void;
}

export function LevelUpModal({
  fromLevel,
  toLevel,
  nextGoalSummary,
  testId,
  onClose
}: LevelUpModalProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleClose();
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  return (
    <div
      aria-labelledby="level-up-title"
      aria-modal="true"
      className={`level-up-overlay ${isVisible ? "visible" : "hidden"}`}
      data-testid={testId}
      role="dialog"
    >
      <ConfettiCelebration duration={4200} particleCount={90} />

      <div className="level-up-modal">
        <div className="level-up-animation">
          <div className="level-up-icon">✦</div>
          <div className="level-up-levels">
            <span className="level-up-from">{fromLevel}</span>
            <span className="level-up-arrow">→</span>
            <span className="level-up-to">{toLevel}</span>
          </div>
        </div>

        <h2 className="level-up-title" id="level-up-title">
          Новый уровень!
        </h2>
        <p className="level-up-subtitle">Вы достигли уровня {toLevel}. Это стоит отметить.</p>

        {nextGoalSummary ? (
          <div className="level-up-next-goal">
            <span className="level-up-next-goal-label">Следующий рубеж</span>
            <strong>{nextGoalSummary}</strong>
          </div>
        ) : null}

        <div className="level-up-rewards">
          <div className="level-up-reward">
            <span className="reward-icon">🏆</span>
            <span className="reward-text">Открыт следующий рубеж</span>
          </div>
          <div className="level-up-reward">
            <span className="reward-icon">⚡</span>
            <span className="reward-text">XP-ритм продолжает расти</span>
          </div>
        </div>

        <button className="level-up-continue-btn" onClick={handleClose} autoFocus>
          Продолжить
        </button>
      </div>
    </div>
  );
}

export function AchievementUnlockedToast({
  achievementTitle,
  achievementIcon,
  progressText,
  testId,
  onClose
}: AchievementUnlockedToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  return (
    <div
      className={`achievement-toast ${isVisible ? "visible" : "hidden"}`}
      data-progress={progressText}
      data-testid={testId}
    >
      <div className="achievement-toast-icon">{achievementIcon}</div>
      <div className="achievement-toast-content">
        <span className="achievement-toast-label">Достижение разблокировано!</span>
        <span className="achievement-toast-title">{achievementTitle}</span>
      </div>
      <button className="achievement-toast-close" onClick={handleClose} aria-label="Закрыть">
        ×
      </button>
    </div>
  );
}
