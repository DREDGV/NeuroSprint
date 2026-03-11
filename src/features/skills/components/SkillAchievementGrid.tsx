import { useEffect, useMemo, useState } from "react";
import { skillAchievementRepository } from "../../../entities/achievement/skillAchievementRepository";
import { getSkillAchievementsBySkillId, getVisibleSkillAchievements } from "../../../shared/lib/progress/skillAchievementList";
import type { UserSkillAchievement, SkillAchievement, SkillProfileId } from "../../../shared/types/domain";

interface SkillAchievementGridProps {
  userId: string;
  skillId?: SkillProfileId;
}

const SKILL_LABELS: Record<SkillProfileId, string> = {
  attention: "Внимание",
  memory: "Память",
  reaction: "Реакция",
  math: "Счёт",
  logic: "Логика"
};

export function SkillAchievementGrid({ userId, skillId }: SkillAchievementGridProps) {
  const [userAchievements, setUserAchievements] = useState<UserSkillAchievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    skillAchievementRepository
      .getUserSkillAchievements(userId)
      .then((achievements) => {
        if (!cancelled) {
          setUserAchievements(achievements);
        }
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const catalogAchievements = useMemo<SkillAchievement[]>(() => {
    return skillId ? getSkillAchievementsBySkillId(skillId) : getVisibleSkillAchievements();
  }, [skillId]);

  const achievementMap = useMemo(() => {
    return new Map(userAchievements.map((achievement) => [achievement.skillAchievementId, achievement]));
  }, [userAchievements]);

  const completedCount = useMemo(() => {
    return catalogAchievements.filter((achievement) => achievementMap.get(achievement.id)?.completed).length;
  }, [achievementMap, catalogAchievements]);

  if (loading) {
    return (
      <div className="skill-achievement-loading">
        <p>Загружаем достижения...</p>
      </div>
    );
  }

  return (
    <section className="skill-achievement-section" data-testid="skill-achievement-grid">
      <div className="skill-achievement-header">
        <div>
          <h3>{skillId ? `Достижения: ${SKILL_LABELS[skillId]}` : "Достижения по навыкам"}</h3>
          <p className="skill-achievement-subtitle">
            {skillId
              ? "Здесь видно, какие пороги по этому навыку уже открыты и что осталось добрать."
              : "Открывайте вехи прогресса по каждому навыку и собирайте ключевые пороги."}
          </p>
        </div>
        <span className="skill-achievement-count">{completedCount} / {catalogAchievements.length}</span>
      </div>

      <div className="skill-achievements-grid">
        {catalogAchievements.map((achievement) => {
          const userAchievement = achievementMap.get(achievement.id);
          const completed = userAchievement?.completed ?? false;
          const progress = Math.min(userAchievement?.skillScore ?? 0, achievement.threshold);
          const progressPct = Math.min(100, Math.round((progress / achievement.threshold) * 100));
          const statusText = completed
            ? "Получено"
            : progress > 0
              ? "Уже есть прогресс"
              : "Ещё не начато";

          return (
            <div key={achievement.id} className={`skill-achievement-card ${completed ? "completed" : "locked"}`}>
              <div className="skill-achievement-icon">{completed ? achievement.icon : "🔒"}</div>

              <div className="skill-achievement-content">
                {!skillId && <span className="skill-achievement-skill">{SKILL_LABELS[achievement.skillId]}</span>}
                <h4 className="skill-achievement-title">{achievement.title}</h4>
                <p className="skill-achievement-description">{achievement.description}</p>

                {completed ? (
                  <div className="skill-achievement-completed">
                    <span className="checkmark">✓</span>
                    <span>{statusText}</span>
                  </div>
                ) : (
                  <div className="skill-achievement-progress">
                    <div className="progress-bar" aria-label={`Прогресс достижения ${achievement.title}`}>
                      <div className="progress-fill" style={{ width: `${progressPct}%` }} />
                    </div>
                    <div className="progress-meta">
                      <span className="progress-label">{progress} / {achievement.threshold}</span>
                      <span className="progress-status">{statusText}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {catalogAchievements.length === 0 ? (
        <div className="skill-achievements-empty">
          <p>Для этого раздела пока нет доступных достижений.</p>
        </div>
      ) : null}
    </section>
  );
}
