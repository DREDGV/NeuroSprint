import { useEffect, useState } from "react";
import { achievementRepository } from "../entities/achievement/achievementRepository";
import { ACHIEVEMENT_CATALOG } from "../shared/lib/progress/achievementList";
import type { UserAchievement, Achievement } from "../shared/types/domain";

type AchievementCategory = "all" | "streak" | "sessions" | "daily" | "skill" | "special";

interface AchievementListProps {
  userId: string;
}

export function AchievementList({ userId }: AchievementListProps) {
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [activeCategory, setActiveCategory] = useState<AchievementCategory>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    achievementRepository.getUserAchievements(userId)
      .then((achievements) => {
        if (!cancelled) {
          setUserAchievements(achievements);
        }
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const completedCount = userAchievements.filter(a => a.completed).length;
  const inProgressCount = userAchievements.filter(a => !a.completed && a.progress > 0).length;
  const lockedCount = ACHIEVEMENT_CATALOG.filter(a => !a.hidden).length - completedCount - inProgressCount;

  // Фильтрация по категории
  const filteredAchievements = ACHIEVEMENT_CATALOG.filter(achievement => {
    if (activeCategory !== "all" && achievement.category !== activeCategory) {
      return false;
    }
    // Показываем только видимые или уже полученные
    const userAchievement = userAchievements.find(a => a.achievementId === achievement.id);
    return !achievement.hidden || userAchievement?.completed;
  }).sort((a, b) => a.order - b.order);

  const categories: { id: AchievementCategory; label: string; icon: string }[] = [
    { id: "all", label: "Все", icon: "📋" },
    { id: "streak", label: "Серии", icon: "🔥" },
    { id: "sessions", label: "Сессии", icon: "🎮" },
    { id: "daily", label: "Дневные", icon: "📅" },
    { id: "skill", label: "Навыки", icon: "🎯" },
    { id: "special", label: "Спец.", icon: "🌟" }
  ];

  if (loading) {
    return (
      <div className="achievement-list-loading">
        <p>Загрузка достижений...</p>
      </div>
    );
  }

  return (
    <section className="achievement-list-section" data-testid="achievement-list">
      {/* Header Stats */}
      <div className="achievement-stats-header">
        <div className="achievement-stat">
          <span className="achievement-stat-value completed">{completedCount}</span>
          <span className="achievement-stat-label">Получено</span>
        </div>
        <div className="achievement-stat">
          <span className="achievement-stat-value in-progress">{inProgressCount}</span>
          <span className="achievement-stat-label">В процессе</span>
        </div>
        <div className="achievement-stat">
          <span className="achievement-stat-value locked">{lockedCount}</span>
          <span className="achievement-stat-label">Закрыто</span>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="achievement-category-tabs">
        {categories.map((category) => (
          <button
            key={category.id}
            className={`achievement-category-tab ${activeCategory === category.id ? 'active' : ''}`}
            onClick={() => setActiveCategory(category.id)}
          >
            <span className="tab-icon">{category.icon}</span>
            <span className="tab-label">{category.label}</span>
          </button>
        ))}
      </div>

      {/* Achievements Grid */}
      <div className="achievements-grid">
        {filteredAchievements.map((achievement) => {
          const userAchievement = userAchievements.find(a => a.achievementId === achievement.id);
          const progress = userAchievement?.progress ?? 0;
          const completed = userAchievement?.completed ?? false;

          return (
            <div
              key={achievement.id}
              className={`achievement-card ${completed ? 'completed' : ''} ${!userAchievement && achievement.hidden ? 'hidden' : ''}`}
            >
              <div className="achievement-card-header">
                <span className="achievement-icon">{achievement.icon}</span>
                <div className="achievement-card-title">
                  <h4 className="achievement-title">{achievement.title}</h4>
                  {completed && <span className="achievement-badge-complete">✓</span>}
                </div>
              </div>

              <p className="achievement-description">{achievement.description}</p>

              {/* Progress Bar */}
              {!completed && progress > 0 && (
                <div className="achievement-progress">
                  <div className="achievement-progress-bar">
                    <div
                      className="achievement-progress-fill"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="achievement-progress-label">{progress}%</span>
                </div>
              )}

              {/* Locked State */}
              {!userAchievement && (
                <div className="achievement-locked">
                  <span className="achievement-locked-icon">🔒</span>
                  <span className="achievement-locked-text">Скрыто</span>
                </div>
              )}

              {/* Category Tag */}
              <span className={`achievement-category-tag category-${achievement.category}`}>
                {getCategoryLabel(achievement.category)}
              </span>
            </div>
          );
        })}
      </div>

      {filteredAchievements.length === 0 && (
        <div className="achievements-empty">
          <p>В этой категории пока нет достижений.</p>
        </div>
      )}
    </section>
  );
}

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    streak: "Серия",
    sessions: "Сессии",
    daily: "Дневные",
    skill: "Навык",
    special: "Спец."
  };
  return labels[category] || category;
}
