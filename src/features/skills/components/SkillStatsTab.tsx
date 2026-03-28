import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { buildSkillProfile } from "../../../shared/lib/training/skillProfile";
import { getSkillMapSummary } from "../../../shared/lib/progress/skillPercentileService";
import type { Session, SkillProfileId, SkillMapSummary } from "../../../shared/types/domain";
import { SkillRadarChart } from "./SkillRadarChart";
import { SkillPercentileBar } from "./SkillPercentileBar";
import { SkillAchievementGrid } from "./SkillAchievementGrid";
import { SkillRecommendations } from "./SkillRecommendations";

interface SkillStatsTabProps {
  userId: string;
  sessions: Session[];
}

const STARTER_MODULES = [
  {
    id: "memory_match",
    title: "Memory Match",
    description: "Спокойный вход в зрительную память и удержание пар.",
    path: "/training/memory-match"
  },
  {
    id: "schulte",
    title: "Таблица Шульте",
    description: "Фокус, внимание и скорость поиска без лишних правил.",
    path: "/training/schulte"
  },
  {
    id: "reaction",
    title: "Reaction",
    description: "Быстрый старт для реакции и темпа на короткой сессии.",
    path: "/training/reaction"
  }
] as const;

export function SkillStatsTab({ userId, sessions }: SkillStatsTabProps) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<SkillMapSummary | null>(null);

  const skillProfile = useMemo(() => buildSkillProfile(sessions), [sessions]);

  const skillScores = useMemo(() => {
    const scores: Record<SkillProfileId, number> = {
      attention: 0,
      memory: 0,
      reaction: 0,
      math: 0,
      logic: 0
    };

    skillProfile.axes.forEach((axis) => {
      scores[axis.id] = axis.score;
    });

    return scores;
  }, [skillProfile.axes]);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    getSkillMapSummary(userId, skillScores)
      .then((result) => {
        if (!cancelled) {
          setSummary(result);
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
  }, [userId, skillScores]);

  if (loading) {
    return (
      <div className="skill-stats-loading">
        <p>Загружаем карту навыков...</p>
      </div>
    );
  }

  const hasData = skillProfile.hasData && summary;

  if (!hasData) {
    return (
      <section className="skill-stats-empty" data-testid="skill-stats-empty">
        <div className="skill-stats-empty-head">
          <h3>Карта навыков</h3>
          <p>
            Профиль навыков появляется после нескольких завершённых сессий. Как только вы
            соберёте первые тренировки, здесь станут видны сильные стороны, зона роста,
            достижения и персональные рекомендации.
          </p>
        </div>

        <div className="skill-stats-empty-points">
          <article className="skill-stats-empty-point">
            <strong>Что появится здесь</strong>
            <span>Карта по пяти навыкам, понятный фокус роста и следующие шаги.</span>
          </article>
          <article className="skill-stats-empty-point">
            <strong>Сколько нужно для старта</strong>
            <span>Обычно достаточно 3-5 коротких сессий в основных тренажёрах.</span>
          </article>
          <article className="skill-stats-empty-point">
            <strong>Лучший первый набор</strong>
            <span>Память, внимание и реакция быстрее всего собирают честный профиль.</span>
          </article>
        </div>

        <div className="skill-stats-empty-actions">
          {STARTER_MODULES.map((module) => (
            <Link
              key={module.id}
              to={module.path}
              className="skill-stats-empty-action"
              data-testid={`skill-stats-empty-start-${module.id}`}
            >
              <strong>{module.title}</strong>
              <span>{module.description}</span>
            </Link>
          ))}
        </div>
      </section>
    );
  }

  return (
    <div className="skill-stats-tab" data-testid="skill-stats-tab">
      <div className="skill-stats-summary">
        <div className="skill-stats-header">
          <h3>Карта навыков</h3>
          {summary ? (
            <div className="skill-stats-avg">
              Средний уровень относительно других: <strong>{summary.avgPercentile}%</strong>
            </div>
          ) : null}
        </div>

        {summary?.bestSkill ? (
          <p className="skill-stats-lead">
            Сейчас сильнее всего выглядит навык <strong>{getSkillLabel(summary.bestSkill.skillId)}</strong>.
            Он уже выше, чем у {summary.bestSkill.percentile}% пользователей.
          </p>
        ) : null}
      </div>

      <div className="skill-stats-grid">
        <div className="skill-stats-left">
          <div className="skill-radar-section">
            <h4>Профиль навыков</h4>
            <SkillRadarChart skillScores={skillScores} size={280} />
          </div>

          <div className="skill-percentiles-section">
            <h4>Как вы выглядите по сравнению с другими</h4>
            {summary?.skills.map((skill) => (
              <SkillPercentileBar key={skill.skillId} skill={skill} />
            ))}
          </div>
        </div>

        <div className="skill-stats-right">
          <SkillRecommendations skillScores={skillScores} />
          <SkillAchievementGrid userId={userId} />
        </div>
      </div>
    </div>
  );
}

function getSkillLabel(skillId: SkillProfileId): string {
  const labels: Record<SkillProfileId, string> = {
    attention: "Внимание",
    memory: "Память",
    reaction: "Реакция",
    math: "Счёт",
    logic: "Логика"
  };

  return labels[skillId] || skillId;
}
