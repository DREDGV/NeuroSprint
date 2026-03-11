import { useMemo } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer
} from "recharts";
import type { SkillProfileId } from "../../../shared/types/domain";

interface SkillRadarDataPoint {
  skill: string;
  value: number;
  fullMark: number;
}

interface SkillRadarChartProps {
  skillScores: Record<SkillProfileId, number>;
  size?: number;
}

const SKILL_LABELS: Record<SkillProfileId, string> = {
  attention: "Внимание",
  memory: "Память",
  reaction: "Реакция",
  math: "Счёт",
  logic: "Логика"
};

export function SkillRadarChart({ skillScores, size = 300 }: SkillRadarChartProps) {
  const data: SkillRadarDataPoint[] = useMemo(() => {
    const skills = Object.keys(skillScores) as SkillProfileId[];
    return skills.map((skillId) => ({
      skill: SKILL_LABELS[skillId],
      value: skillScores[skillId] ?? 0,
      fullMark: 100
    }));
  }, [skillScores]);

  return (
    <div className="skill-radar-chart" style={{ width: "100%", height: size, maxWidth: size }} data-testid="skill-radar-chart">
      <ResponsiveContainer>
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
          <PolarGrid stroke="#e0e0e0" />
          <PolarAngleAxis dataKey="skill" tick={{ fill: "#4a5568", fontSize: 12 }} tickLine={false} />
          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "#718096", fontSize: 10 }} tickCount={5} />
          <Radar name="Навыки" dataKey="value" stroke="#4299e1" fill="#4299e1" fillOpacity={0.5} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
