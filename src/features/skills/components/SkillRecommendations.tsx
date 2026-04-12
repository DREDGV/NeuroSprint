import { useMemo } from "react";
import { Link } from "react-router-dom";
import { getTop3Recommendations } from "../../../shared/lib/progress/skillRecommendationService";
import type { SkillProfileId, TrainingModuleId } from "../../../shared/types/domain";

interface SkillRecommendationsProps {
  skillScores: Record<SkillProfileId, number>;
}

const SKILL_LABELS: Record<SkillProfileId, string> = {
  attention: "Внимание",
  memory: "Память",
  reaction: "Реакция",
  math: "Счёт",
  logic: "Логика"
};

const MODULE_LABELS: Record<TrainingModuleId, string> = {
  schulte: "Таблица Шульте",
  sprint_math: "Математический спринт",
  reaction: "Реакция",
  n_back: "N-Назад",
  memory_grid: "Сетка памяти",
  spatial_memory: "Пространственная память",
  decision_rush: "Быстрые решения",
  memory_match: "Пары памяти",
  pattern_recognition: "Распознавание паттернов"
};

function moduleLaunchPath(moduleId: TrainingModuleId): string {
  return `/training/pre-session?module=${moduleId}`;
}

export function SkillRecommendations({ skillScores }: SkillRecommendationsProps) {
  const recommendations = useMemo(() => getTop3Recommendations(skillScores), [skillScores]);

  if (recommendations.length === 0) {
    return (
      <div className="skill-recommendations-empty">
        <p>Продолжайте тренироваться: после первых сессий здесь появятся персональные рекомендации по навыкам.</p>
      </div>
    );
  }

  return (
    <section className="skill-recommendations-section" data-testid="skill-recommendations">
      <div className="skill-recommendations-header">
        <h3>Рекомендации по навыкам</h3>
        <p className="skill-recommendations-subtitle">Три лучших направления для следующего фокуса</p>
      </div>

      <div className="skill-recommendations-list">
        {recommendations.map((rec, index) => (
          <div key={`${rec.skillId}-${rec.level}`} className={`skill-recommendation-card priority-${index + 1}`}>
            <div className="recommendation-priority">#{index + 1}</div>

            <div className="recommendation-content">
              <div className="recommendation-header">
                <span className="recommendation-skill">{SKILL_LABELS[rec.skillId]}</span>
                <span className={`recommendation-level level-${rec.level}`}>{getLevelLabel(rec.level)}</span>
              </div>

              <h4 className="recommendation-title">{rec.title}</h4>
              <p className="recommendation-description">{rec.description}</p>

              <div className="recommendation-modules">
                <span className="modules-label">Подходящие тренажёры:</span>
                <div className="modules-list">
                  {rec.trainingModules.map((moduleId) => (
                    <Link key={moduleId} to={moduleLaunchPath(moduleId)} className="module-chip">
                      {MODULE_LABELS[moduleId]}
                    </Link>
                  ))}
                </div>
              </div>

              <div className="recommendation-footer">
                <span className="frequency-label">
                  {rec.priority === 1 ? "Главный фокус на ближайшие сессии" : "Можно подключать уже сейчас"}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function getLevelLabel(level: "weak" | "medium" | "strong"): string {
  const labels = {
    weak: "Нуждается в тренировке",
    medium: "Неплохая база",
    strong: "Сильная сторона"
  };

  return labels[level] || level;
}
