import { useMemo } from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend
} from "recharts";
import type { User, Session, SkillProfileId } from "../shared/types/domain";

interface SkillData {
  skill: string;
  score: number;
  fullName: string;
  icon: string;
}

interface ClassSkillRadarProps {
  students: User[];
  sessions?: Session[];
  className?: string;
}

const SKILL_INFO: Record<SkillProfileId, { label: string; icon: string }> = {
  attention: { label: "Внимание", icon: "🎯" },
  memory: { label: "Память", icon: "🧠" },
  reaction: { label: "Реакция", icon: "⚡" },
  math: { label: "Математика", icon: "➗" },
  logic: { label: "Логика", icon: "🧩" }
};

// Сопоставление тренажёров навыкам
const MODE_TO_SKILL: Record<string, SkillProfileId> = {
  classic_plus: "attention",
  timed_plus: "attention",
  reverse: "attention",
  pattern_classic: "logic",
  pattern_timed: "logic",
  pattern_progressive: "logic",
  pattern_multi: "logic",
  memory_grid_classic: "memory",
  memory_grid_rush: "memory",
  nback_1: "memory",
  nback_2: "memory",
  nback_3: "memory",
  spatial_memory_classic: "memory",
  reaction_signal: "reaction",
  reaction_stroop: "reaction",
  reaction_number: "reaction",
  sprint_add_sub: "math",
  sprint_mixed: "math",
  decision_kids: "logic",
  decision_standard: "logic",
  decision_pro: "logic"
};

/**
 * Радарная диаграмма навыков класса
 * Показывает средние значения по всем ученикам
 */
export function ClassSkillRadar({ students, sessions, className = "" }: ClassSkillRadarProps) {
  const skillData = useMemo(() => {
    if (!sessions || sessions.length === 0) {
      // Данные-заглушки, если нет сессий
      return Object.entries(SKILL_INFO).map(([skillId, info]) => ({
        skill: skillId,
        score: 0,
        fullName: info.label,
        icon: info.icon
      }));
    }

    // Группируем сессии по навыкам
    const skillScores: Record<SkillProfileId, number[]> = {
      attention: [],
      memory: [],
      reaction: [],
      math: [],
      logic: []
    };

    for (const session of sessions) {
      const skillId = MODE_TO_SKILL[session.modeId];
      if (skillId && session.score !== undefined) {
        skillScores[skillId].push(session.score);
      }
    }

    // Вычисляем средние значения по каждому навыку
    const data: SkillData[] = Object.entries(SKILL_INFO).map(([skillId, info]) => {
      const scores = skillScores[skillId as SkillProfileId];
      const avgScore = scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0;

      return {
        skill: skillId,
        score: avgScore,
        fullName: info.label,
        icon: info.icon
      };
    });

    return data;
  }, [sessions]);

  const maxScore = Math.max(
    ...skillData.map((d) => d.score),
    100
  );

  const colors = {
    attention: "#3b82f6",
    memory: "#8b5cf6",
    reaction: "#f59e0b",
    math: "#10b981",
    logic: "#ef4444"
  };

  return (
    <div className={`class-skill-radar ${className}`} data-testid="class-skill-radar">
      <div className="skill-radar-header">
        <h4>🎯 Навыки класса</h4>
        <p className="skill-radar-subtitle">
          Средние показатели по всем ученикам
        </p>
      </div>

      <div className="skill-radar-chart">
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={skillData}>
            <PolarGrid stroke="#e5e7eb" />
            <PolarAngleAxis
              dataKey="fullName"
              tick={{ fill: "#4b5563", fontSize: 12, fontWeight: 600 }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, maxScore]}
              tick={{ fill: "#6b7280", fontSize: 10 }}
              tickCount={5}
            />
            <Radar
              name="Класс"
              dataKey="score"
              stroke="#1e7f71"
              fill="#1e7f71"
              fillOpacity={0.5}
            />
            <Legend />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div className="skill-radar-legend">
        {skillData.map((item) => (
          <div key={item.skill} className="skill-legend-item">
            <span
              className="skill-legend-color"
              style={{ background: colors[item.skill as keyof typeof colors] }}
            />
            <span className="skill-legend-label">
              {item.icon} {item.fullName}
            </span>
            <span className="skill-legend-value">{item.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
