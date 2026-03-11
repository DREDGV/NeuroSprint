import type { SkillSummary, SkillRank } from "../../../shared/types/domain";
import { getRankColor, getRankDescription } from "../../../shared/lib/progress/skillPercentileService";

interface SkillPercentileBarProps {
  skill: SkillSummary;
}

const SKILL_LABELS: Record<string, string> = {
  attention: "Внимание",
  memory: "Память",
  reaction: "Реакция",
  math: "Счёт",
  logic: "Логика"
};

export function SkillPercentileBar({ skill }: SkillPercentileBarProps) {
  const { skillId, score, percentile, rank } = skill;
  const color = getRankColor(rank);
  const description = getRankDescription(rank);
  const label = SKILL_LABELS[skillId] || skillId;

  return (
    <div className="skill-percentile-bar" data-testid={`skill-percentile-${skillId}`}>
      <div className="skill-percentile-header">
        <span className="skill-name">{label}</span>
        <span className="skill-score">{score} оч.</span>
      </div>

      <div className="skill-percentile-track">
        <div
          className="skill-percentile-fill"
          style={{ width: `${percentile}%`, backgroundColor: color }}
          data-testid={`skill-percentile-fill-${skillId}`}
        />
      </div>

      <div className="skill-percentile-footer">
        <span className="skill-percentile-label">Выше {percentile}% пользователей</span>
        <span className="skill-rank-badge" style={{ backgroundColor: color }} title={description}>
          {getRankLabel(rank)}
        </span>
      </div>
    </div>
  );
}

function getRankLabel(rank: SkillRank): string {
  const labels: Record<SkillRank, string> = {
    "top_1%": "Топ 1%",
    "top_5%": "Топ 5%",
    "top_10%": "Топ 10%",
    "top_25%": "Топ 25%",
    "top_50%": "Топ 50%",
    "bottom_50%": "Ниже медианы"
  };

  return labels[rank] || rank;
}
